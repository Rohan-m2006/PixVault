# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # <-- IMPORT CORS MIDDLEWARE
from app.database import client
from app.routers import auth
from app.routers import events
from app.routers import media  
from app.routers import search 
from app.routers import social 
from app.routers import notifications

app = FastAPI(title="Event Media API")
app.include_router(notifications.router)

# ------------------------------------------------------------------
# CORS CONFIGURATION
# ------------------------------------------------------------------
# Define who is allowed to talk to our API. 
# We explicitly allow our Next.js frontend running on port 3000.
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Allows requests from your Next.js app
    allow_credentials=True,           # Allows cookies and authorization headers
    allow_methods=["*"],              # Allows ALL HTTP methods (GET, POST, OPTIONS, PUT, DELETE)
    allow_headers=["*"],              # Allows ALL headers (Content-Type, Authorization, etc.)
)
# ------------------------------------------------------------------

# Connect our routers to the app
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(media.router)  
app.include_router(search.router) 
app.include_router(social.router) 

@app.get("/")
async def root():
    return {"message": "Backend is successfully running!"}

@app.get("/api/health")
async def health_check():
    try:
        await client.admin.command('ping')
        return {"status": "SUCCESS", "message": "MongoDB is connected perfectly!"}
    except Exception as e:
        return {"status": "FAILED", "message": f"Could not connect to MongoDB: {str(e)}"}