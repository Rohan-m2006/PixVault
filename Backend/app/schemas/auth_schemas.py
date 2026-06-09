from pydantic import BaseModel

class UserRegister(BaseModel):
    email: str
    password: str
    role: str = "Viewer"

class UserLogin(BaseModel):
    email: str
    password: str