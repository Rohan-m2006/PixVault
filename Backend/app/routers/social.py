# backend/app/routers/social.py
from fastapi import APIRouter, Depends, HTTPException, status
import uuid
from datetime import datetime
from app.database import db
from app.dependencies import get_current_user
from app.schemas.social_schemas import CommentCreate

router = APIRouter(prefix="/api/social", tags=["Social Features"])

@router.get("/favorites/me")
async def get_my_favorites(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]

    favorites = await db["media"].find({
        "favorites": user_id
    }).to_list(length=100)

    return favorites


@router.post("/{media_id}/favorite")
async def toggle_favorite(
    media_id: str,
    user: dict = Depends(get_current_user)
):
    media = await db["media"].find_one({"_id": media_id})

    if not media:
        raise HTTPException(
            status_code=404,
            detail="Photo not found"
        )

    user_id = user["user_id"]
    favorites = media.get("favorites", [])

    if user_id in favorites:

        await db["media"].update_one(
            {"_id": media_id},
            {"$pull": {"favorites": user_id}}
        )

        return {
            "favorited": False,
            "message": "Removed from favorites"
        }

    else:

        await db["media"].update_one(
            {"_id": media_id},
            {"$addToSet": {"favorites": user_id}}
        )

        return {
            "favorited": True,
            "message": "Added to favorites"
        }

@router.post("/{media_id}/like")
async def toggle_like(media_id: str, user: dict = Depends(get_current_user)):
    """Like a photo. If already liked, this will unlike it."""
    
    # 1. Find the photo in the database
    media = await db["media"].find_one({"_id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Photo not found")

    user_id = user["user_id"]
    likes = media.get("likes", [])

    # 2. Check if the user already liked it
    if user_id in likes:
        # User already liked it, so we UNLIKE it ($pull removes it from the MongoDB list)
        await db["media"].update_one(
            {"_id": media_id}, 
            {"$pull": {"likes": user_id}}
        )
        return {"message": "Photo unliked"}
    else:
        # User hasn't liked it yet, so we LIKE it ($push adds it to the MongoDB list)
        await db["media"].update_one(
        {"_id": media_id},
        {"$push": {"likes": user_id}}
        )

        recipient_id = media.get("uploaded_by", "")

        if recipient_id and recipient_id != user_id:
            notification = {
                "_id": uuid.uuid4().hex,
                "recipient_id": recipient_id,
                "actor_name": user.get("email", "Someone"),
                "type": "like",
                "media_id": media_id,
                "message": f'{user.get("email")} liked your photo',
                "is_read": False,
                "created_at": datetime.utcnow()
            }

            await db["notifications"].insert_one(notification)

    return {"message": "Photo liked"}
    

@router.post("/{media_id}/comment")
async def add_comment(
    media_id: str, 
    comment_data: CommentCreate, 
    user: dict = Depends(get_current_user)
):
    """Add a text comment to a photo."""
    
    media = await db["media"].find_one({"_id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Create the comment dictionary
    new_comment = {
        "user_id": user["user_id"],
        "text": comment_data.text
    }

    # $push adds the new comment to the comments list in MongoDB
    await db["media"].update_one(
        {"_id": media_id}, 
        {"$push": {"comments": new_comment}}
    )
    recipient_id = media.get("uploaded_by", "")

    if recipient_id and recipient_id != user["user_id"]:
        notification = {
            "_id": uuid.uuid4().hex,
            "recipient_id": recipient_id,
            "actor_name": user.get("email", "Someone"),
            "type": "comment",
            "media_id": media_id,
            "message": f'{user.get("email")} commented on your photo',
            "is_read": False,
            "created_at": datetime.utcnow()
        }

        await db["notifications"].insert_one(notification)
    return {"message": "Comment added successfully", "comment": new_comment}