from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

db = None
PAYPAL_CLIENT_ID = None
PAYPAL_SECRET = None
PAYPAL_API_URL = None


def init_payment_routes(database, paypal_client_id, paypal_secret, paypal_api_url):
    global db, PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_API_URL
    db = database
    PAYPAL_CLIENT_ID = paypal_client_id
    PAYPAL_SECRET = paypal_secret
    PAYPAL_API_URL = paypal_api_url


def _get_current_user():
    from routes import get_current_user
    return get_current_user

def _get_admin_user():
    from routes import get_admin_user
    return get_admin_user


# ================= MODELS =================

class SettingsUpdate(BaseModel):
    subscription_enabled: Optional[bool] = None
    free_limit_seconds: Optional[int] = None
    monthly_price: Optional[float] = None
    yearly_price: Optional[float] = None
    yearly_enabled: Optional[bool] = None
    currency: Optional[str] = None

class CouponCreate(BaseModel):
    code: str
    discount_percent: int = Field(ge=1, le=100)
    max_uses: int = Field(ge=1)
    expires_at: Optional[str] = None
    plan_type: Optional[str] = None


# ================= HELPERS =================

async def get_paypal_access_token():
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYPAL_API_URL}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            headers={"Accept": "application/json"}
        )
        if resp.status_code != 200:
            logger.error(f"PayPal auth failed: {resp.text}")
            raise HTTPException(status_code=502, detail="PayPal authentication failed")
        return resp.json()["access_token"]

async def get_settings():
    settings = await db.settings.find_one({"key": "app_settings"}, {"_id": 0})
    if not settings:
        default = {
            "key": "app_settings",
            "subscription_enabled": False,
            "free_limit_seconds": 300,
            "monthly_price": 9.99,
            "yearly_price": 99.90,
            "yearly_enabled": True,
            "currency": "USD",
            "paypal_plan_id": None,
            "paypal_yearly_plan_id": None
        }
        await db.settings.insert_one(default)
        return default
    return settings

async def get_user_usage_this_month(user_id: str) -> float:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    pipeline = [
        {"$match": {"user_id": user_id, "status": "completed", "created_at": {"$gte": month_start}, "duration_seconds": {"$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$duration_seconds"}}}
    ]
    result = await db.transcriptions.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0

async def user_has_active_subscription(user_id: str) -> bool:
    sub = await db.subscriptions.find_one({"user_id": user_id, "status": "active"}, {"_id": 0})
    if not sub:
        return False
    if sub.get("expires_at") and sub["expires_at"] < datetime.now(timezone.utc).isoformat():
        await db.subscriptions.update_one({"user_id": user_id, "status": "active"}, {"$set": {"status": "expired"}})
        return False
    return True


# ================= SETTINGS ROUTES =================

@router.get("/settings/public")
async def get_public_settings():
    settings = await get_settings()
    return {
        "subscription_enabled": settings.get("subscription_enabled", False),
        "free_limit_seconds": settings.get("free_limit_seconds", 300),
        "monthly_price": settings.get("monthly_price", 9.99),
        "yearly_price": settings.get("yearly_price", 99.90),
        "yearly_enabled": settings.get("yearly_enabled", True),
        "currency": settings.get("currency", "USD"),
        "paypal_client_id": PAYPAL_CLIENT_ID,
        "paypal_plan_id": settings.get("paypal_plan_id"),
        "paypal_yearly_plan_id": settings.get("paypal_yearly_plan_id")
    }

@router.get("/subscription/status")
async def get_subscription_status(current_user: dict = Depends(_get_current_user())):
    settings = await get_settings()
    user_id = current_user["id"]
    is_subscribed = await user_has_active_subscription(user_id)
    usage = await get_user_usage_this_month(user_id)
    free_limit = settings.get("free_limit_seconds", 300)
    sub_enabled = settings.get("subscription_enabled", False)
    sub_doc = await db.subscriptions.find_one({"user_id": user_id, "status": "active"}, {"_id": 0})
    return {
        "is_subscribed": is_subscribed,
        "subscription_enabled": sub_enabled,
        "usage_seconds": usage,
        "free_limit_seconds": free_limit,
        "remaining_seconds": max(0, free_limit - usage) if not is_subscribed else None,
        "monthly_price": settings.get("monthly_price", 9.99),
        "currency": settings.get("currency", "USD"),
        "subscription": {
            "paypal_subscription_id": sub_doc.get("paypal_subscription_id") if sub_doc else None,
            "expires_at": sub_doc.get("expires_at") if sub_doc else None,
        } if sub_doc else None
    }

@router.post("/subscription/activate")
async def activate_subscription(body: dict, current_user: dict = Depends(_get_current_user())):
    subscription_id = body.get("subscription_id")
    if not subscription_id:
        raise HTTPException(status_code=400, detail="Missing subscription_id")
    try:
        token = await get_paypal_access_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{PAYPAL_API_URL}/v1/billing/subscriptions/{subscription_id}",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid subscription")
        sub_data = resp.json()
        if sub_data.get("status") not in ("ACTIVE", "APPROVED"):
            raise HTTPException(status_code=400, detail=f"Subscription not active: {sub_data.get('status')}")
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(days=31)).isoformat()
        await db.subscriptions.update_one(
            {"user_id": current_user["id"], "status": "active"},
            {"$set": {"status": "replaced"}},
        )
        await db.subscriptions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "paypal_subscription_id": subscription_id,
            "status": "active",
            "created_at": now.isoformat(),
            "expires_at": expires_at,
        })
        return {"message": "Subscription activated", "expires_at": expires_at}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription activation error: {e}")
        raise HTTPException(status_code=500, detail="Subscription activation failed")

@router.post("/subscription/cancel")
async def cancel_subscription(current_user: dict = Depends(_get_current_user())):
    sub = await db.subscriptions.find_one({"user_id": current_user["id"], "status": "active"})
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription")
    paypal_sub_id = sub.get("paypal_subscription_id")
    if paypal_sub_id:
        try:
            token = await get_paypal_access_token()
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{PAYPAL_API_URL}/v1/billing/subscriptions/{paypal_sub_id}/cancel",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"reason": "User requested cancellation"}
                )
        except Exception as e:
            logger.error(f"PayPal cancel error: {e}")
    await db.subscriptions.update_one({"_id": sub["_id"]}, {"$set": {"status": "cancelled"}})
    return {"message": "Subscription cancelled"}


# ================= ADMIN SETTINGS ROUTES =================

@router.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(_get_admin_user())):
    settings = await get_settings()
    return {
        "subscription_enabled": settings.get("subscription_enabled", False),
        "free_limit_seconds": settings.get("free_limit_seconds", 300),
        "monthly_price": settings.get("monthly_price", 9.99),
        "yearly_price": settings.get("yearly_price", 99.90),
        "yearly_enabled": settings.get("yearly_enabled", True),
        "currency": settings.get("currency", "USD"),
        "paypal_plan_id": settings.get("paypal_plan_id"),
        "paypal_yearly_plan_id": settings.get("paypal_yearly_plan_id"),
    }

@router.put("/admin/settings")
async def admin_update_settings(body: SettingsUpdate, admin: dict = Depends(_get_admin_user())):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.settings.update_one({"key": "app_settings"}, {"$set": update}, upsert=True)
    return await admin_get_settings(admin)

@router.post("/admin/create-paypal-plan")
async def admin_create_paypal_plan(admin: dict = Depends(_get_admin_user())):
    settings = await get_settings()
    monthly_price = settings.get("monthly_price", 9.99)
    yearly_price = settings.get("yearly_price", 99.90)
    currency = settings.get("currency", "USD")
    try:
        token = await get_paypal_access_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Accept": "application/json"}
        async with httpx.AsyncClient() as client:
            product_resp = await client.post(f"{PAYPAL_API_URL}/v1/catalogs/products", headers=headers, json={
                "name": "TranscriptFlow Pro",
                "description": "Unlimited audio transcription",
                "type": "SERVICE", "category": "SOFTWARE"
            })
            if product_resp.status_code not in (200, 201):
                raise Exception(f"Product creation failed: {product_resp.text}")
            product_id = product_resp.json()["id"]
            monthly_resp = await client.post(f"{PAYPAL_API_URL}/v1/billing/plans", headers=headers, json={
                "product_id": product_id,
                "name": "TranscriptFlow Pro Monthly",
                "description": f"Unlimited transcription - {monthly_price} {currency}/month",
                "billing_cycles": [{"frequency": {"interval_unit": "MONTH", "interval_count": 1},
                    "tenure_type": "REGULAR", "sequence": 1, "total_cycles": 0,
                    "pricing_scheme": {"fixed_price": {"value": str(monthly_price), "currency_code": currency}}}],
                "payment_preferences": {"auto_bill_outstanding": True, "payment_failure_threshold": 3}
            })
            if monthly_resp.status_code not in (200, 201):
                raise Exception(f"Monthly plan failed: {monthly_resp.text}")
            monthly_plan_id = monthly_resp.json()["id"]
            yearly_resp = await client.post(f"{PAYPAL_API_URL}/v1/billing/plans", headers=headers, json={
                "product_id": product_id,
                "name": "TranscriptFlow Pro Annual",
                "description": f"Unlimited transcription - {yearly_price} {currency}/year",
                "billing_cycles": [{"frequency": {"interval_unit": "YEAR", "interval_count": 1},
                    "tenure_type": "REGULAR", "sequence": 1, "total_cycles": 0,
                    "pricing_scheme": {"fixed_price": {"value": str(yearly_price), "currency_code": currency}}}],
                "payment_preferences": {"auto_bill_outstanding": True, "payment_failure_threshold": 3}
            })
            if yearly_resp.status_code not in (200, 201):
                raise Exception(f"Yearly plan failed: {yearly_resp.text}")
            yearly_plan_id = yearly_resp.json()["id"]
            await db.settings.update_one({"key": "app_settings"}, {"$set": {
                "paypal_plan_id": monthly_plan_id, "paypal_yearly_plan_id": yearly_plan_id
            }})
            return {"monthly_plan_id": monthly_plan_id, "yearly_plan_id": yearly_plan_id, "message": "PayPal plans created"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PayPal plan creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/subscriptions")
async def admin_get_subscriptions(admin: dict = Depends(_get_admin_user())):
    subs = await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for s in subs:
        user = await db.users.find_one({"id": s.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        s["user_email"] = user["email"] if user else "unknown"
        s["user_name"] = user["name"] if user else "unknown"
    return subs


# ================= COUPON ROUTES =================

@router.post("/admin/coupons")
async def admin_create_coupon(body: CouponCreate, admin: dict = Depends(_get_admin_user())):
    existing = await db.coupons.find_one({"code": body.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    coupon = {
        "id": str(uuid.uuid4()),
        "code": body.code.upper(),
        "discount_percent": body.discount_percent,
        "max_uses": body.max_uses,
        "used_count": 0,
        "plan_type": body.plan_type,
        "expires_at": body.expires_at,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.coupons.insert_one(coupon)
    return {k: v for k, v in coupon.items() if k != "_id"}

@router.get("/admin/coupons")
async def admin_get_coupons(admin: dict = Depends(_get_admin_user())):
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return coupons

@router.delete("/admin/coupons/{coupon_id}")
async def admin_delete_coupon(coupon_id: str, admin: dict = Depends(_get_admin_user())):
    result = await db.coupons.delete_one({"id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"message": "Coupon deleted"}

@router.patch("/admin/coupons/{coupon_id}")
async def admin_toggle_coupon(coupon_id: str, admin: dict = Depends(_get_admin_user())):
    coupon = await db.coupons.find_one({"id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    new_status = not coupon.get("active", True)
    await db.coupons.update_one({"id": coupon_id}, {"$set": {"active": new_status}})
    return {"active": new_status}

@router.post("/coupons/validate")
async def validate_coupon(body: dict, current_user: dict = Depends(_get_current_user())):
    code = (body.get("code") or "").upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="Code required")
    coupon = await db.coupons.find_one({"code": code, "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    if coupon.get("expires_at") and coupon["expires_at"] < datetime.now(timezone.utc).isoformat():
        raise HTTPException(status_code=400, detail="Coupon expired")
    if coupon["used_count"] >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="Coupon fully used")
    already_used = await db.coupon_usages.find_one({"coupon_id": coupon["id"], "user_id": current_user["id"]})
    if already_used:
        raise HTTPException(status_code=400, detail="Coupon already used by you")
    return {
        "valid": True, "code": coupon["code"],
        "discount_percent": coupon["discount_percent"],
        "plan_type": coupon.get("plan_type")
    }

@router.post("/coupons/apply")
async def apply_coupon(body: dict, current_user: dict = Depends(_get_current_user())):
    code = (body.get("code") or "").upper().strip()
    plan_type = body.get("plan_type", "monthly")
    coupon = await db.coupons.find_one({"code": code, "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon")
    if coupon.get("expires_at") and coupon["expires_at"] < datetime.now(timezone.utc).isoformat():
        raise HTTPException(status_code=400, detail="Coupon expired")
    if coupon["used_count"] >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="Coupon fully used")
    already = await db.coupon_usages.find_one({"coupon_id": coupon["id"], "user_id": current_user["id"]})
    if already:
        raise HTTPException(status_code=400, detail="Already used")
    if coupon.get("plan_type") and coupon["plan_type"] != plan_type:
        raise HTTPException(status_code=400, detail=f"Coupon only valid for {coupon['plan_type']} plan")
    settings = await get_settings()
    base_price = settings.get("yearly_price", 99.90) if plan_type == "yearly" else settings.get("monthly_price", 9.99)
    discount = coupon["discount_percent"]
    final_price = round(base_price * (1 - discount / 100), 2)
    if discount >= 100:
        now = datetime.now(timezone.utc)
        days = 365 if plan_type == "yearly" else 31
        expires_at = (now + timedelta(days=days)).isoformat()
        await db.subscriptions.update_one({"user_id": current_user["id"], "status": "active"}, {"$set": {"status": "replaced"}})
        await db.subscriptions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "paypal_subscription_id": f"COUPON-{code}",
            "status": "active", "plan_type": plan_type,
            "created_at": now.isoformat(), "expires_at": expires_at,
        })
        await db.coupons.update_one({"id": coupon["id"]}, {"$inc": {"used_count": 1}})
        await db.coupon_usages.insert_one({"coupon_id": coupon["id"], "user_id": current_user["id"], "used_at": now.isoformat()})
        return {"free_subscription": True, "plan_type": plan_type, "expires_at": expires_at, "message": "Free subscription activated"}
    await db.coupons.update_one({"id": coupon["id"]}, {"$inc": {"used_count": 1}})
    await db.coupon_usages.insert_one({"coupon_id": coupon["id"], "user_id": current_user["id"], "used_at": datetime.now(timezone.utc).isoformat()})
    return {
        "free_subscription": False, "original_price": base_price,
        "discount_percent": discount, "final_price": final_price, "plan_type": plan_type
    }
