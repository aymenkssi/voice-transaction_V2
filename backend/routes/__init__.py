from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import uuid
import os

router = APIRouter(prefix="/api")
security = HTTPBearer()

# These will be set by init_auth_routes
db = None
JWT_SECRET = None
JWT_ALGORITHM = None
JWT_EXPIRATION_HOURS = None


def init_auth_routes(database, secret, algorithm, expiration):
    global db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
    db = database
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm
    JWT_EXPIRATION_HOURS = expiration


# ================= MODELS =================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    class Config:
        extra = "ignore"
    id: str
    email: str
    name: str
    created_at: str
    is_admin: bool = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ================= AUTH HELPERS =================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(credentials)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ================= AUTH ROUTES =================

@router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email)
    user_response = UserResponse(
        id=user_id, email=user_data.email, name=user_data.name,
        created_at=user_doc["created_at"], is_admin=False
    )
    return TokenResponse(access_token=token, user=user_response)

@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["email"])
    user_response = UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        created_at=user["created_at"], is_admin=user.get("is_admin", False)
    )
    return TokenResponse(access_token=token, user=user_response)

@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@router.get("/auth/export-data")
async def export_user_data(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_info = {
        "name": current_user.get("name"),
        "email": current_user.get("email"),
        "created_at": current_user.get("created_at"),
    }
    transcriptions = await db.transcriptions.find(
        {"user_id": user_id}, {"_id": 0, "file_path": 0}
    ).to_list(1000)
    return {
        "user": user_info,
        "transcriptions": transcriptions,
        "exported_at": datetime.now(timezone.utc).isoformat()
    }

@router.delete("/auth/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    await db.transcriptions.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"message": "Account and all data deleted"}
