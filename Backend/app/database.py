import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("MONGODB_DB_NAME", "event_media_db")

# ------------------------------------------------------------------
# 🔒 SURGICAL FIX: FORCE EXPLICIT TLS CERTIFICATE VERIFICATION
# ------------------------------------------------------------------
# We inject certifi.where() to guarantee Python has a modern, valid 
# root certificate bundle to present to MongoDB Atlas during the handshake.
client = AsyncIOMotorClient(
    MONGO_URL,
    tls=True,
    tlsCAFile=certifi.where()
)

db = client[DB_NAME]