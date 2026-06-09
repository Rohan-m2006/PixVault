# backend/app/schemas/event_schemas.py
from pydantic import BaseModel
from typing import Optional, Literal

class EventCreate(BaseModel):
    name: str
    description: str
    date: str
    category: str
    visibility: Literal["public", "private"] = "public"

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    category: Optional[str] = None
    visibility: Optional[str] = None