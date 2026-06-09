from fastapi import APIRouter, Depends, HTTPException
from app.database import db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db["notifications"].find(
        {
            "recipient_id": user["user_id"],
            "is_read": False
        }
    ).to_list(length=100)

    return notifications


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    user: dict = Depends(get_current_user)
):
    await db["notifications"].update_one(
        {
            "_id": notification_id,
            "recipient_id": user["user_id"]
        },
        {
            "$set": {"is_read": True}
        }
    )

    return {"message": "Notification marked as read"}