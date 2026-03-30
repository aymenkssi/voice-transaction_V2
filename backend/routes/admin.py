from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

db = None

def init_admin_routes(database):
    global db
    db = database


def _get_admin_user():
    from routes import get_admin_user
    return get_admin_user


# ================= ADMIN STATS ROUTES =================

@router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(_get_admin_user())):
    total_users = await db.users.count_documents({})
    total_transcriptions = await db.transcriptions.count_documents({})
    completed = await db.transcriptions.count_documents({"status": "completed"})
    processing = await db.transcriptions.count_documents({"status": "processing"})
    failed = await db.transcriptions.count_documents({"status": "failed"})
    pipeline_duration = [
        {"$match": {"status": "completed", "duration_seconds": {"$ne": None}}},
        {"$group": {"_id": None, "total_duration": {"$sum": "$duration_seconds"}}}
    ]
    dur_result = await db.transcriptions.aggregate(pipeline_duration).to_list(1)
    total_duration = dur_result[0]["total_duration"] if dur_result else 0
    translations_count = await db.transcriptions.count_documents({"translated_text": {"$ne": None, "$exists": True}})
    pipeline_words = [
        {"$match": {"status": "completed"}},
        {"$project": {"_id": 0, "original_text": 1}}
    ]
    texts = await db.transcriptions.aggregate(pipeline_words).to_list(1000)
    total_words = sum(len((t.get("original_text") or "").split()) for t in texts)
    return {
        "total_users": total_users,
        "total_transcriptions": total_transcriptions,
        "completed": completed, "processing": processing, "failed": failed,
        "total_duration_seconds": total_duration,
        "total_words": total_words,
        "translations_count": translations_count,
        "success_rate": round((completed / total_transcriptions * 100), 1) if total_transcriptions > 0 else 0
    }

@router.get("/admin/stats/daily")
async def admin_stats_daily(admin: dict = Depends(_get_admin_user())):
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$project": {"_id": 0, "day": {"$substr": ["$created_at", 0, 10]}, "status": 1}},
        {"$group": {
            "_id": "$day", "total": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "failed": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    results = await db.transcriptions.aggregate(pipeline).to_list(31)
    return [{"date": r["_id"], "total": r["total"], "completed": r["completed"], "failed": r["failed"]} for r in results]

@router.get("/admin/stats/languages")
async def admin_stats_languages(admin: dict = Depends(_get_admin_user())):
    pipeline = [
        {"$match": {"detected_language": {"$ne": None}}},
        {"$group": {"_id": "$detected_language", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.transcriptions.aggregate(pipeline).to_list(50)
    return [{"language": r["_id"], "count": r["count"]} for r in results]

@router.get("/admin/stats/origins")
async def admin_stats_origins(admin: dict = Depends(_get_admin_user())):
    pipeline_domains = [
        {"$project": {"_id": 0, "domain": {"$arrayElemAt": [{"$split": ["$email", "@"]}, 1]}}},
        {"$group": {"_id": "$domain", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    domain_results = await db.users.aggregate(pipeline_domains).to_list(50)
    pipeline_registrations = [
        {"$project": {"_id": 0, "day": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    reg_results = await db.users.aggregate(pipeline_registrations).to_list(100)
    pipeline_tld = [
        {"$project": {"_id": 0, "domain": {"$arrayElemAt": [{"$split": ["$email", "@"]}, 1]}}},
        {"$project": {"tld": {"$arrayElemAt": [{"$split": ["$domain", "."]}, -1]}}},
        {"$group": {"_id": "$tld", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    tld_results = await db.users.aggregate(pipeline_tld).to_list(50)
    return {
        "email_domains": [{"domain": r["_id"], "count": r["count"]} for r in domain_results],
        "registrations_by_day": [{"date": r["_id"], "count": r["count"]} for r in reg_results],
        "tld_distribution": [{"tld": r["_id"], "count": r["count"]} for r in tld_results]
    }

@router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(_get_admin_user())):
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(500)
    enriched = []
    for u in users:
        t_count = await db.transcriptions.count_documents({"user_id": u["id"]})
        t_completed = await db.transcriptions.count_documents({"user_id": u["id"], "status": "completed"})
        domain = u["email"].split("@")[1] if "@" in u["email"] else "unknown"
        enriched.append({**u, "transcription_count": t_count, "completed_count": t_completed, "email_domain": domain})
    return enriched

@router.get("/admin/transcriptions")
async def admin_get_transcriptions(admin: dict = Depends(_get_admin_user())):
    transcriptions = await db.transcriptions.find({}, {"_id": 0, "file_path": 0}).sort("created_at", -1).to_list(500)
    for t in transcriptions:
        user = await db.users.find_one({"id": t.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        t["user_email"] = user["email"] if user else "unknown"
        t["user_name"] = user["name"] if user else "unknown"
    return transcriptions

@router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(_get_admin_user())):
    from fastapi import HTTPException
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db.transcriptions.delete_many({"user_id": user_id})
    return {"message": "User and their transcriptions deleted"}

@router.delete("/admin/transcriptions/{transcription_id}")
async def admin_delete_transcription(transcription_id: str, admin: dict = Depends(_get_admin_user())):
    from fastapi import HTTPException
    result = await db.transcriptions.delete_one({"id": transcription_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return {"message": "Transcription deleted"}
