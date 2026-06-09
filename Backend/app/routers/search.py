# backend/app/routers/search.py
from fastapi import APIRouter, Depends
from app.database import db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("/")
async def search_media(query: str, user: dict = Depends(get_current_user)):
    """
    Search for images by tag. Any logged-in user can do this.
    """
    # $regex makes the search partial. $options: "i" makes it case-insensitive.
    media_results = await db["media"].find({
        "tags": {"$regex": query, "$options": "i"}
    }).to_list(length=100)
    
    return media_results