"""
Test suite for Coupon CRUD and Yearly Pricing features
Tests:
- POST /api/admin/coupons - Create coupon (admin only)
- GET /api/admin/coupons - List coupons (admin only)
- PATCH /api/admin/coupons/{id} - Toggle coupon active/inactive
- DELETE /api/admin/coupons/{id} - Delete coupon
- POST /api/coupons/validate - Validate coupon code (user auth)
- POST /api/coupons/apply - Apply coupon (user auth)
- PUT /api/admin/settings - Yearly price and yearly_enabled fields
- GET /api/settings/public - Returns yearly_price, yearly_enabled, paypal_yearly_plan_id
- GET /api/admin/settings - Returns yearly fields
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@transcriptflow.com"
ADMIN_PASSWORD = "Admin2026!"
USER_EMAIL = "stele@test.com"
USER_PASSWORD = "TestPass123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def user_token():
    """Get regular user authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"User login failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASS: Health check returns healthy status")
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["is_admin"] == True
        print("PASS: Admin login successful")
    
    def test_user_login(self):
        """Test regular user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("PASS: User login successful")


class TestYearlyPricingSettings:
    """Test yearly pricing configuration in admin settings"""
    
    def test_public_settings_returns_yearly_fields(self):
        """GET /api/settings/public should return yearly_price, yearly_enabled, paypal_yearly_plan_id"""
        response = requests.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200
        data = response.json()
        assert "yearly_price" in data, "yearly_price field missing from public settings"
        assert "yearly_enabled" in data, "yearly_enabled field missing from public settings"
        assert "paypal_yearly_plan_id" in data, "paypal_yearly_plan_id field missing from public settings"
        print(f"PASS: Public settings returns yearly fields - yearly_price={data['yearly_price']}, yearly_enabled={data['yearly_enabled']}")
    
    def test_admin_settings_returns_yearly_fields(self, admin_headers):
        """GET /api/admin/settings should return yearly_price, yearly_enabled"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "yearly_price" in data, "yearly_price field missing from admin settings"
        assert "yearly_enabled" in data, "yearly_enabled field missing from admin settings"
        print(f"PASS: Admin settings returns yearly fields - yearly_price={data['yearly_price']}, yearly_enabled={data['yearly_enabled']}")
    
    def test_admin_settings_requires_admin(self, user_headers):
        """GET /api/admin/settings should return 403 for non-admin"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=user_headers)
        assert response.status_code == 403
        print("PASS: Admin settings returns 403 for non-admin user")
    
    def test_update_yearly_price(self, admin_headers):
        """PUT /api/admin/settings can update yearly_price"""
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        original_yearly_price = get_response.json().get("yearly_price", 99.90)
        
        # Update yearly price
        new_price = 89.99
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            json={"yearly_price": new_price}, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["yearly_price"] == new_price
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert verify_response.json()["yearly_price"] == new_price
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/settings", 
            json={"yearly_price": original_yearly_price}, headers=admin_headers)
        print(f"PASS: Yearly price updated to {new_price} and verified")
    
    def test_update_yearly_enabled(self, admin_headers):
        """PUT /api/admin/settings can update yearly_enabled"""
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        original_yearly_enabled = get_response.json().get("yearly_enabled", True)
        
        # Toggle yearly_enabled
        new_value = not original_yearly_enabled
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            json={"yearly_enabled": new_value}, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["yearly_enabled"] == new_value
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/settings", 
            json={"yearly_enabled": original_yearly_enabled}, headers=admin_headers)
        print(f"PASS: yearly_enabled toggled to {new_value} and restored")


class TestCouponCRUD:
    """Test coupon CRUD operations (admin only)"""
    
    def test_create_coupon_requires_admin(self, user_headers):
        """POST /api/admin/coupons should return 403 for non-admin"""
        response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": "TEST", "discount_percent": 10, "max_uses": 10},
            headers=user_headers)
        assert response.status_code == 403
        print("PASS: Create coupon returns 403 for non-admin")
    
    def test_create_coupon_success(self, admin_headers):
        """POST /api/admin/coupons creates a coupon"""
        unique_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={
                "code": unique_code,
                "discount_percent": 20,
                "max_uses": 50,
                "plan_type": "monthly"
            },
            headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == unique_code
        assert data["discount_percent"] == 20
        assert data["max_uses"] == 50
        assert data["used_count"] == 0
        assert data["active"] == True
        assert "id" in data
        print(f"PASS: Coupon {unique_code} created successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{data['id']}", headers=admin_headers)
    
    def test_create_coupon_duplicate_code_fails(self, admin_headers):
        """POST /api/admin/coupons fails for duplicate code"""
        unique_code = f"DUP{uuid.uuid4().hex[:6].upper()}"
        
        # Create first coupon
        response1 = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 10, "max_uses": 10},
            headers=admin_headers)
        assert response1.status_code == 200
        coupon_id = response1.json()["id"]
        
        # Try to create duplicate
        response2 = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 15, "max_uses": 20},
            headers=admin_headers)
        assert response2.status_code == 400
        assert "already exists" in response2.json().get("detail", "").lower()
        print("PASS: Duplicate coupon code rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
    
    def test_list_coupons_requires_admin(self, user_headers):
        """GET /api/admin/coupons should return 403 for non-admin"""
        response = requests.get(f"{BASE_URL}/api/admin/coupons", headers=user_headers)
        assert response.status_code == 403
        print("PASS: List coupons returns 403 for non-admin")
    
    def test_list_coupons_success(self, admin_headers):
        """GET /api/admin/coupons returns list of coupons"""
        response = requests.get(f"{BASE_URL}/api/admin/coupons", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: List coupons returns {len(data)} coupons")
    
    def test_toggle_coupon_active(self, admin_headers):
        """PATCH /api/admin/coupons/{id} toggles active status"""
        # Create a coupon
        unique_code = f"TOG{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 10, "max_uses": 10},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Toggle to inactive
        toggle_response = requests.patch(f"{BASE_URL}/api/admin/coupons/{coupon_id}", 
            headers=admin_headers)
        assert toggle_response.status_code == 200
        assert toggle_response.json()["active"] == False
        
        # Toggle back to active
        toggle_response2 = requests.patch(f"{BASE_URL}/api/admin/coupons/{coupon_id}", 
            headers=admin_headers)
        assert toggle_response2.status_code == 200
        assert toggle_response2.json()["active"] == True
        print("PASS: Coupon toggle active/inactive works")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
    
    def test_toggle_coupon_requires_admin(self, user_headers, admin_headers):
        """PATCH /api/admin/coupons/{id} requires admin"""
        # Create a coupon as admin
        unique_code = f"TADM{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 10, "max_uses": 10},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Try to toggle as user
        toggle_response = requests.patch(f"{BASE_URL}/api/admin/coupons/{coupon_id}", 
            headers=user_headers)
        assert toggle_response.status_code == 403
        print("PASS: Toggle coupon returns 403 for non-admin")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
    
    def test_delete_coupon_success(self, admin_headers):
        """DELETE /api/admin/coupons/{id} deletes a coupon"""
        # Create a coupon
        unique_code = f"DEL{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 10, "max_uses": 10},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", 
            headers=admin_headers)
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json().get("message", "").lower()
        
        # Verify deleted
        list_response = requests.get(f"{BASE_URL}/api/admin/coupons", headers=admin_headers)
        coupon_ids = [c["id"] for c in list_response.json()]
        assert coupon_id not in coupon_ids
        print("PASS: Coupon deleted successfully")
    
    def test_delete_coupon_not_found(self, admin_headers):
        """DELETE /api/admin/coupons/{id} returns 404 for non-existent coupon"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/admin/coupons/{fake_id}", 
            headers=admin_headers)
        assert response.status_code == 404
        print("PASS: Delete non-existent coupon returns 404")
    
    def test_delete_coupon_requires_admin(self, user_headers, admin_headers):
        """DELETE /api/admin/coupons/{id} requires admin"""
        # Create a coupon as admin
        unique_code = f"DADM{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 10, "max_uses": 10},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Try to delete as user
        delete_response = requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", 
            headers=user_headers)
        assert delete_response.status_code == 403
        print("PASS: Delete coupon returns 403 for non-admin")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)


class TestCouponValidateAndApply:
    """Test coupon validation and application (user auth)"""
    
    def test_validate_coupon_requires_auth(self):
        """POST /api/coupons/validate requires authentication"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", 
            json={"code": "TEST"})
        assert response.status_code in [401, 403]
        print("PASS: Validate coupon requires authentication")
    
    def test_validate_coupon_invalid_code(self, user_headers):
        """POST /api/coupons/validate returns 404 for invalid code"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", 
            json={"code": "INVALIDCODE123"},
            headers=user_headers)
        assert response.status_code == 404
        print("PASS: Validate invalid coupon returns 404")
    
    def test_validate_coupon_success(self, admin_headers, user_headers):
        """POST /api/coupons/validate returns coupon info for valid code"""
        # Create a coupon as admin
        unique_code = f"VAL{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 25, "max_uses": 100},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Validate as user
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", 
            json={"code": unique_code},
            headers=user_headers)
        assert validate_response.status_code == 200
        data = validate_response.json()
        assert data["valid"] == True
        assert data["code"] == unique_code
        assert data["discount_percent"] == 25
        print(f"PASS: Coupon {unique_code} validated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
    
    def test_validate_inactive_coupon_fails(self, admin_headers, user_headers):
        """POST /api/coupons/validate returns 404 for inactive coupon"""
        # Create and deactivate a coupon
        unique_code = f"INA{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 10, "max_uses": 10},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Deactivate
        requests.patch(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
        
        # Try to validate
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", 
            json={"code": unique_code},
            headers=user_headers)
        assert validate_response.status_code == 404
        print("PASS: Inactive coupon validation returns 404")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
    
    def test_apply_coupon_requires_auth(self):
        """POST /api/coupons/apply requires authentication"""
        response = requests.post(f"{BASE_URL}/api/coupons/apply", 
            json={"code": "TEST", "plan_type": "monthly"})
        assert response.status_code in [401, 403]
        print("PASS: Apply coupon requires authentication")
    
    def test_apply_coupon_invalid_code(self, user_headers):
        """POST /api/coupons/apply returns 404 for invalid code"""
        response = requests.post(f"{BASE_URL}/api/coupons/apply", 
            json={"code": "INVALIDCODE123", "plan_type": "monthly"},
            headers=user_headers)
        assert response.status_code == 404
        print("PASS: Apply invalid coupon returns 404")
    
    def test_apply_coupon_returns_discounted_price(self, admin_headers, user_headers):
        """POST /api/coupons/apply returns discounted price for partial discount"""
        # Create a coupon as admin
        unique_code = f"APP{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 30, "max_uses": 100},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Apply as user
        apply_response = requests.post(f"{BASE_URL}/api/coupons/apply", 
            json={"code": unique_code, "plan_type": "monthly"},
            headers=user_headers)
        assert apply_response.status_code == 200
        data = apply_response.json()
        assert data["free_subscription"] == False
        assert "original_price" in data
        assert "final_price" in data
        assert data["discount_percent"] == 30
        assert data["final_price"] < data["original_price"]
        print(f"PASS: Coupon applied - original: {data['original_price']}, final: {data['final_price']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
    
    def test_apply_100_percent_coupon_activates_subscription(self, admin_headers):
        """POST /api/coupons/apply with 100% discount activates free subscription"""
        # Create a new test user for this test to avoid "already used" error
        test_email = f"test100pct{uuid.uuid4().hex[:6]}@test.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test 100% User"
        })
        if register_response.status_code != 200:
            pytest.skip("Could not create test user")
        
        test_token = register_response.json()["access_token"]
        test_headers = {"Authorization": f"Bearer {test_token}", "Content-Type": "application/json"}
        
        # Create a 100% coupon
        unique_code = f"FREE{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 100, "max_uses": 10},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Apply as test user
        apply_response = requests.post(f"{BASE_URL}/api/coupons/apply", 
            json={"code": unique_code, "plan_type": "monthly"},
            headers=test_headers)
        assert apply_response.status_code == 200
        data = apply_response.json()
        assert data["free_subscription"] == True
        assert "expires_at" in data
        print(f"PASS: 100% coupon activated free subscription, expires: {data['expires_at']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
        # Delete test user
        requests.delete(f"{BASE_URL}/api/auth/account", headers=test_headers)
    
    def test_apply_coupon_plan_type_restriction(self, admin_headers, user_headers):
        """POST /api/coupons/apply respects plan_type restriction"""
        # Create a monthly-only coupon
        unique_code = f"MON{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(f"{BASE_URL}/api/admin/coupons", 
            json={"code": unique_code, "discount_percent": 20, "max_uses": 100, "plan_type": "monthly"},
            headers=admin_headers)
        coupon_id = create_response.json()["id"]
        
        # Try to apply for yearly plan
        apply_response = requests.post(f"{BASE_URL}/api/coupons/apply", 
            json={"code": unique_code, "plan_type": "yearly"},
            headers=user_headers)
        assert apply_response.status_code == 400
        assert "monthly" in apply_response.json().get("detail", "").lower()
        print("PASS: Coupon plan_type restriction enforced")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)


class TestRefactoredRoutes:
    """Test that all routes still work after server.py refactoring"""
    
    def test_root_endpoint(self):
        """GET /api/ returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "TranscriptFlow" in data.get("message", "")
        print("PASS: Root endpoint works")
    
    def test_auth_routes_work(self):
        """Auth routes still work after refactoring"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        print("PASS: Auth routes work after refactoring")
    
    def test_transcription_routes_work(self, user_headers):
        """Transcription routes still work after refactoring"""
        response = requests.get(f"{BASE_URL}/api/transcriptions", headers=user_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("PASS: Transcription routes work after refactoring")
    
    def test_admin_stats_routes_work(self, admin_headers):
        """Admin stats routes still work after refactoring"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_transcriptions" in data
        print("PASS: Admin stats routes work after refactoring")
    
    def test_admin_users_route_works(self, admin_headers):
        """Admin users route still works after refactoring"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("PASS: Admin users route works after refactoring")
    
    def test_admin_transcriptions_route_works(self, admin_headers):
        """Admin transcriptions route still works after refactoring"""
        response = requests.get(f"{BASE_URL}/api/admin/transcriptions", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("PASS: Admin transcriptions route works after refactoring")
    
    def test_subscription_status_route_works(self, user_headers):
        """Subscription status route still works after refactoring"""
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=user_headers)
        assert response.status_code == 200
        data = response.json()
        assert "is_subscribed" in data
        assert "subscription_enabled" in data
        print("PASS: Subscription status route works after refactoring")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
