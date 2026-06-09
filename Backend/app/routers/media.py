# backend/app/routers/media.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
import logging
from app.database import db
from app.models.media import Media
from app.dependencies import require_admin
from app.utils.s3_utils import upload_file_to_s3, rekognition_client, s3_client
import os
from app.services.ai_service import generate_tags_from_image # <-- NEW IMPORT

router = APIRouter(prefix="/api/media", tags=["Media"])

@router.post("/upload/{event_id}", status_code=status.HTTP_201_CREATED)
async def upload_media_for_event(
    event_id: str, 
    file: UploadFile = File(...), 
    admin: dict = Depends(require_admin)
):
    # 1. Check if event exists
    event = await db["events"].find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # 2. Read the file
    file_bytes = await file.read()

    is_video = (file.content_type or "").startswith("video/")
    media_type = "video" if is_video else "image"

    s3_url = upload_file_to_s3(file_bytes, file.filename, file.content_type)

    if media_type == "image":
        ai_tags = generate_tags_from_image(file_bytes)

        extracted_face_ids = []
        try:
            rekognition_response = rekognition_client.index_faces(
                CollectionId=os.getenv("AWS_REKOGNITION_COLLECTION_ID", "pixvault-faces"),
                Image={"Bytes": file_bytes},
                MaxFaces=15,
                QualityFilter="AUTO",
                DetectionAttributes=["DEFAULT"]
            )

            for face_record in rekognition_response.get("FaceRecords", []):
                extracted_face_ids.append(face_record["Face"]["FaceId"])

        except Exception as e:
            print(f"AWS Rekognition Indexing Skipped/Failed: {e}")
    else:
        ai_tags = []
        extracted_face_ids = []

    new_media = Media(
        event_id=event_id,
        uploaded_by=admin["user_id"],
        media_type=media_type,
        s3_url=s3_url,
        tags=ai_tags,
        likes=[],
        comments=[],
        favorites=[],
        face_ids=extracted_face_ids
    )

    media_dict = new_media.model_dump(by_alias=True)
    await db["media"].insert_one(media_dict)
    
    return {
        "message": "Image uploaded and tagged successfully", 
        "media_id": new_media.id,
        "url": s3_url,
        "generated_tags": ai_tags  # Show the tags in the response!
    }

@router.post("/find-me/{event_id}")
async def find_my_photos(event_id: str, file: UploadFile = File(...)):
    """
    Takes a user's selfie, searches the AWS Rekognition collection for matching faces,
    and returns all media documents from the specific event containing those faces.
    """

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded selfie file is empty."
        )

    try:
        response = rekognition_client.search_faces_by_image(
            CollectionId=os.getenv("AWS_REKOGNITION_COLLECTION_ID", "pixvault-faces"),
            Image={"Bytes": file_bytes},
            FaceMatchThreshold=80.0,
            MaxFaces=1
        )
    except rekognition_client.exceptions.InvalidParameterException:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the selfie. Please upload a clear photo of your face."
        )
    except Exception as e:
        print(f"AWS Rekognition Search Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Facial recognition service is currently unavailable."
        )

    matched_face_ids = []
    for match in response.get("FaceMatches", []):
        matched_face_ids.append(match["Face"]["FaceId"])

    if not matched_face_ids:
        return []

    cursor = db["media"].find({
        "event_id": event_id,
        "face_ids": {"$in": matched_face_ids}
    })

    matched_media_docs = await cursor.to_list(length=1000)

    for media in matched_media_docs:
        if "_id" in media:
            media["_id"] = str(media["_id"])

    return matched_media_docs


# Add this route at the bottom of backend/app/routers/media.py

@router.get("/event/{event_id}")
async def get_media_for_event(event_id: str):
    """Fetches all media items that belong to a specific event ID."""
    try:
        # Scan the media collection for documents matching the event_id
        event_media = await db["media"].find({"event_id": event_id}).to_list(length=1000)
        return event_media
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch event media: {str(e)}")
    
    from fastapi.responses import Response
from urllib.request import urlopen, Request

@router.get("/proxy")
def proxy_media(url: str):
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=30) as res:
            content = res.read()
            content_type = res.headers.get_content_type() or "image/jpeg"

        return Response(
            content=content,
            media_type=content_type,
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to proxy image: {str(e)}")
    

    # Explicit logger setup for tracking non-fatal Rekognition errors
logger = logging.getLogger("uvicorn.error")

@router.delete("/{media_id}", status_code=status.HTTP_200_OK)
async def delete_media_asset(
    media_id: str,
    current_user: dict = Depends(require_admin)
):
    # 1. Load media document from MongoDB using string UUID
    try:
        media_doc = await db["media"].find_one({"_id": media_id})
    except Exception as db_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connectivity failure: {str(db_err)}"
        )

    if not media_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The targeted media asset does not exist in this event container."
        )

    # 2. Delete Rekognition face_ids if present (Log failures, continue)
    face_ids = media_doc.get("face_ids", [])
    if face_ids and len(face_ids) > 0:
        try:
            rekognition_client.delete_faces(
                CollectionId="pixvault-faces",
                FaceIds=list(face_ids)
            )
        except Exception as rek_err:
            logger.error(f"CRITICAL WARNING: Rekognition face vector purge failed for face_ids {face_ids}: {str(rek_err)}")

    # 3. Parse S3 Key from s3_url and delete the object
    try:
        s3_url = media_doc.get("s3_url", "")
        if ".amazonaws.com/" in s3_url:
            s3_key = s3_url.split(".amazonaws.com/")[-1]
        else:
            s3_key = s3_url.split("/")[-1]

        s3_client.delete_object(
            Bucket="eventvault-rohan-2026",
            Key=s3_key
        )
    except Exception as s3_err:
        logger.error(f"ABORTED TRANSIT: S3 asset eviction failed for key {s3_key}: {str(s3_err)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cloud file purge failed. Transaction aborted to prevent orphaned S3 file leaks: {str(s3_err)}"
        )

    # 4. Delete MongoDB document using the direct string identifier
    try:
        await db["media"].delete_one({"_id": media_id})
    except Exception as final_db_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S3 deleted successfully, but final database eviction failed: {str(final_db_err)}"
        )

    return {
        "status": "success",
        "message": "Media item, biometric vectors, and S3 file bucket paths completely purged from the system cluster."
    }