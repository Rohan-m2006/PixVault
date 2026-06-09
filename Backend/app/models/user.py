from pydantic import BaseModel, Field
import uuid

class User(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex, alias="_id")
    email: str
    password_hash: str
    role: str = "Viewer"