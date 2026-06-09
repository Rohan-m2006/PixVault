# backend/app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Depends
from app.dependencies import get_current_user, require_admin 
from app.database import db
from app.schemas.auth_schemas import UserRegister, UserLogin
from app.models.user import User
from app.utils.auth_utils import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    # 1. Look in MongoDB to check if a user with this email already exists
    existing_user = await db["users"].find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Prevent arbitrary text roles being injected
    if user_data.role not in ["Admin", "Viewer"]:
        raise HTTPException(status_code=400, detail="Role must be either 'Admin' or 'Viewer'")

    # 3. Securely scramble the user password before storage
    hashed = hash_password(user_data.password)

    # 4. Generate a brand new user model instance
    new_user = User(
        email=user_data.email,
        password_hash=hashed,
        role=user_data.role
    )

    # 5. Convert the Python object to a raw dictionary and save it in MongoDB Atlas
    user_dict = new_user.model_dump(by_alias=True)
    await db["users"].insert_one(user_dict)

    return {"message": "User registered successfully", "user_id": new_user.id}

@router.post("/login")
async def login(login_data: UserLogin):
    # 1. Pull user document from MongoDB based on email
    user = await db["users"].find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # 2. Check if the provided password matches the stored scrambled hash
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # 3. Assemble the payload data to pack inside the token
    token_data = {
        "user_id": user["_id"],
        "email": user["email"],
        "role": user["role"]
    }
    
    # 4. Create the high-tech digital entry pass string
    access_token = create_access_token(data=token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"]
    }

@router.get("/me")
async def check_viewer_access(user: dict = Depends(get_current_user)):
    return {
        "message": "Success! You have basic Viewer access.",
        "your_data": user
    }

@router.get("/admin-dashboard")
async def check_admin_access(admin_user: dict = Depends(require_admin)):
    return {
        "message": "Welcome to the Admin VIP club!",
        "admin_data": admin_user
    }