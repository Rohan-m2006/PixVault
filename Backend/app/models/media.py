from pydantic import BaseModel, Field
from typing import List
import uuid

class Comment(BaseModel):
    user_id: str
    text: str

class Media(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex, alias="_id")
    event_id: str
    media_type: str = "image"   # "image" or "video"
    uploaded_by: str = ""
    s3_url: str
    tags: List[str] = []
    # face_encodings: List[list] = []

    likes: List[str] = []
    comments: List[Comment] = []
    favorites: List[str] = []
    face_ids: List[str] = []