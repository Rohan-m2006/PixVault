from pydantic import BaseModel, Field
import uuid

class Event(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex, alias="_id")
    name: str
    description: str
    date: str
    category: str
    visibility: str = "public"