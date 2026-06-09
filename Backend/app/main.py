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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://pix-vault-indol.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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