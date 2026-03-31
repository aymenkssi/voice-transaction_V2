from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
import uuid
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

# PayPal Configuration
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')
PAYPAL_API_URL = "https://api-m.paypal.com" if PAYPAL_MODE == "live" else "https://api-m.sandbox.paypal.com"

# Create upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="VxScrib API")

# Initialize route modules
from routes import init_auth_routes, router as auth_router
from routes.transcription import init_transcription_routes, router as transcription_router
from routes.payment import init_payment_routes, router as payment_router
from routes.admin import init_admin_routes, router as admin_router

init_auth_routes(db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS)
init_transcription_routes(db, UPLOAD_DIR)
init_payment_routes(db, PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_API_URL)
init_admin_routes(db)

# Include all routers
app.include_router(auth_router)
app.include_router(transcription_router)
app.include_router(payment_router)
app.include_router(admin_router)

# General routes
@app.get("/api/")
async def root():
    return {"message": "VxScrib API", "version": "2.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

@app.on_event("startup")
async def seed_admin():
    admin_email = "admin@transcriptflow.com"
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "password": hash_password("Admin2026!"),
            "is_admin": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Admin account seeded")
    elif not existing.get("is_admin"):
        await db.users.update_one({"email": admin_email}, {"$set": {"is_admin": True}})
        logger.info("Admin flag updated")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
