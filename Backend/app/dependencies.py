# backend/app/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.auth_utils import verify_access_token

# This creates the security scheme that Swagger UI understands
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency 1: The standard bouncer.
    Checks if the user has a valid JWT token. 
    Use this for routes that both Viewers and Admins can access.
    """
    token = credentials.credentials
    payload = verify_access_token(token)
    
    if not payload:
        # 401 Unauthorized means "Who are you? Your token is fake/expired."
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload # Returns a dictionary: {"user_id": "...", "email": "...", "role": "..."}

async def require_admin(current_user: dict = Depends(get_current_user)):
    """
    Dependency 2: The VIP bouncer.
    First checks if logged in, THEN checks if the user is an Admin.
    Use this for Admin-only routes (like creating events or uploading media).
    """
    if current_user.get("role") != "Admin":
        # 403 Forbidden means "I know who you are, but you are not allowed in here."
        raise HTTPException(status_code=403, detail="Not authorized, Admin access required")
    
    return current_user