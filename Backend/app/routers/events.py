# backend/app/routers/events.py
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from app.database import db
from app.models.event import Event
from app.schemas.event_schemas import EventCreate, EventUpdate
from app.dependencies import get_current_user, require_admin


router = APIRouter(prefix="/api/events", tags=["Events"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_event(event_data: EventCreate, admin: dict = Depends(require_admin)):
    
    new_event = Event(
        name=event_data.name,
        description=event_data.description,
        date=event_data.date,
        category=event_data.category,
        visibility=event_data.visibility
    )
    
    event_dict = new_event.model_dump(by_alias=True)
    await db["events"].insert_one(event_dict)
    
    return {"message": "Event created successfully", "event": event_dict}

@router.get("/")
async def get_all_events(user: dict = Depends(get_current_user)):

    if user.get("role") == "Admin":
        events = await db["events"].find().to_list(length=100)

    else:
        events = await db["events"].find({
            "$or": [
                {"visibility": "public"},
                {"visibility": {"$exists": False}}
            ]
        }).to_list(length=100)

    return events

@router.get("/{event_id}")
async def get_event(event_id: str, user: dict = Depends(get_current_user)):

    event = await db["events"].find_one({"_id": event_id})

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if (
        event.get("visibility", "public") == "private"
        and user.get("role") != "Admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="This album is private"
        )

    return event

# 4. UPDATE AN EVENT (Admin Only)
@router.put("/{event_id}")
async def update_event(event_id: str, update_data: EventUpdate, admin: dict = Depends(require_admin)):
    # Remove any fields the user left blank (None)
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if len(update_dict) == 0:
        raise HTTPException(status_code=400, detail="No valid data provided to update")
        
    # Ask MongoDB to find the event and update it with the new data
    result = await db["events"].update_one({"_id": event_id}, {"$set": update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
        
    return {"message": "Event updated successfully"}


@router.get("/{event_id}/analytics")
async def get_event_analytics(
    event_id: str,
    admin: dict = Depends(require_admin)
):
    media_cursor = db["media"].find({"event_id": event_id})
    media_list = await media_cursor.to_list(length=1000)

    total_media = len(media_list)
    total_likes = sum(len(m.get("likes", [])) for m in media_list)
    total_comments = sum(len(m.get("comments", [])) for m in media_list)

    most_liked_media = None

    if total_media > 0:
        best_media = max(
            media_list,
            key=lambda m: len(m.get("likes", []))
        )

        best_likes_count = len(best_media.get("likes", []))

        if best_likes_count > 0:
            most_liked_media = {
                "_id": best_media["_id"],
                "s3_url": best_media.get("s3_url", ""),
                "likes_count": best_likes_count
            }

    return {
        "event_id": event_id,
        "total_media": total_media,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "most_liked_media": most_liked_media
    }

@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    admin: dict = Depends(require_admin)
):
    event = await db["events"].find_one({"_id": event_id})

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    deleted_media = await db["media"].delete_many({
        "event_id": event_id
    })

    print("Deleted media:", deleted_media.deleted_count)

    await db["events"].delete_one({
        "_id": event_id
    })

    return {
        "message": "Event deleted successfully",
        "media_deleted": deleted_media.deleted_count
    }