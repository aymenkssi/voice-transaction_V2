"""
Test suite for Subscription and PayPal features in TranscriptFlow
Tests: Settings routes, Subscription routes, Admin settings routes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@transcriptflow.com"
ADMIN_PASSWORD = "Admin2026!"
REGULAR_EMAIL = "stele@test.com"
REGULAR_PASSWORD = "TestPass123!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping admin tests")


@pytest.fixture(scope="module")
def regular_token(api_client):
    """Get regular user authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": REGULAR_EMAIL,
        "password": REGULAR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Regular user authentication failed - skipping user tests")


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture(scope="module")
def regular_client(api_client, regular_token):
    """Session with regular user auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {regular_token}"
    })
    return session


class TestPublicSettings:
    """Tests for GET /api/settings/public - Public settings endpoint"""
    
    def test_public_settings_returns_subscription_fields(self, api_client):
        """GET /api/settings/public returns all required subscription settings"""
        response = api_client.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all required fields are present
        assert "subscription_enabled" in data, "Missing subscription_enabled field"
        assert "free_limit_seconds" in data, "Missing free_limit_seconds field"
        assert "monthly_price" in data, "Missing monthly_price field"
        assert "currency" in data, "Missing currency field"
        assert "paypal_client_id" in data, "Missing paypal_client_id field"
        assert "paypal_plan_id" in data, "Missing paypal_plan_id field"
        
        # Verify data types
        assert isinstance(data["subscription_enabled"], bool)
        assert isinstance(data["free_limit_seconds"], (int, float))
        assert isinstance(data["monthly_price"], (int, float))
        assert isinstance(data["currency"], str)
        
        print(f"Public settings: subscription_enabled={data['subscription_enabled']}, "
              f"free_limit={data['free_limit_seconds']}s, price={data['monthly_price']} {data['currency']}")


class TestSubscriptionStatus:
    """Tests for GET /api/subscription/status - User subscription status"""
    
    def test_subscription_status_requires_auth(self, api_client):
        """GET /api/subscription/status requires authentication"""
        # Remove auth header for this test
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_subscription_status_returns_usage_info(self, regular_client):
        """GET /api/subscription/status returns usage_seconds, remaining_seconds, is_subscribed"""
        response = regular_client.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify required fields
        assert "is_subscribed" in data, "Missing is_subscribed field"
        assert "usage_seconds" in data, "Missing usage_seconds field"
        assert "remaining_seconds" in data or data.get("is_subscribed"), "Missing remaining_seconds for non-subscribed user"
        assert "subscription_enabled" in data, "Missing subscription_enabled field"
        assert "free_limit_seconds" in data, "Missing free_limit_seconds field"
        
        # Verify data types
        assert isinstance(data["is_subscribed"], bool)
        assert isinstance(data["usage_seconds"], (int, float))
        
        print(f"Subscription status: is_subscribed={data['is_subscribed']}, "
              f"usage={data['usage_seconds']}s, remaining={data.get('remaining_seconds')}s")


class TestAdminSettings:
    """Tests for admin settings routes"""
    
    def test_admin_settings_requires_admin(self, regular_client):
        """GET /api/admin/settings returns 403 for non-admin user"""
        response = regular_client.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Non-admin correctly denied access to admin settings")
    
    def test_admin_settings_returns_settings(self, admin_client):
        """GET /api/admin/settings returns admin settings for admin user"""
        response = admin_client.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify required fields
        assert "subscription_enabled" in data, "Missing subscription_enabled field"
        assert "free_limit_seconds" in data, "Missing free_limit_seconds field"
        assert "monthly_price" in data, "Missing monthly_price field"
        assert "currency" in data, "Missing currency field"
        assert "paypal_plan_id" in data, "Missing paypal_plan_id field"
        
        print(f"Admin settings: {data}")
    
    def test_admin_update_settings_requires_admin(self, regular_client):
        """PUT /api/admin/settings returns 403 for non-admin user"""
        response = regular_client.put(f"{BASE_URL}/api/admin/settings", json={
            "subscription_enabled": True
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Non-admin correctly denied access to update admin settings")
    
    def test_admin_update_settings_works(self, admin_client):
        """PUT /api/admin/settings updates settings for admin user"""
        # First get current settings
        get_response = admin_client.get(f"{BASE_URL}/api/admin/settings")
        original_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "subscription_enabled": True,
            "free_limit_seconds": 600,
            "monthly_price": 14.99,
            "currency": "EUR"
        }
        response = admin_client.put(f"{BASE_URL}/api/admin/settings", json=new_settings)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["subscription_enabled"] == True
        assert data["free_limit_seconds"] == 600
        assert data["monthly_price"] == 14.99
        assert data["currency"] == "EUR"
        
        # Verify persistence with GET
        verify_response = admin_client.get(f"{BASE_URL}/api/admin/settings")
        verify_data = verify_response.json()
        assert verify_data["subscription_enabled"] == True
        assert verify_data["free_limit_seconds"] == 600
        
        # Restore original settings
        restore_settings = {
            "subscription_enabled": original_settings.get("subscription_enabled", False),
            "free_limit_seconds": original_settings.get("free_limit_seconds", 300),
            "monthly_price": original_settings.get("monthly_price", 9.99),
            "currency": original_settings.get("currency", "USD")
        }
        admin_client.put(f"{BASE_URL}/api/admin/settings", json=restore_settings)
        
        print("Admin settings update and persistence verified")


class TestAdminSubscriptions:
    """Tests for GET /api/admin/subscriptions"""
    
    def test_admin_subscriptions_requires_admin(self, regular_client):
        """GET /api/admin/subscriptions returns 403 for non-admin user"""
        response = regular_client.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Non-admin correctly denied access to subscriptions list")
    
    def test_admin_subscriptions_returns_list(self, admin_client):
        """GET /api/admin/subscriptions returns subscriptions list for admin"""
        response = admin_client.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Admin subscriptions list returned {len(data)} subscriptions")


class TestSubscriptionActivate:
    """Tests for POST /api/subscription/activate"""
    
    def test_activate_requires_subscription_id(self, regular_client):
        """POST /api/subscription/activate validates subscription_id is required"""
        response = regular_client.post(f"{BASE_URL}/api/subscription/activate", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "subscription_id" in data["detail"].lower() or "missing" in data["detail"].lower()
        print("Subscription activation correctly validates missing subscription_id")
    
    def test_activate_with_invalid_subscription_id(self, regular_client):
        """POST /api/subscription/activate with invalid ID returns error"""
        response = regular_client.post(f"{BASE_URL}/api/subscription/activate", json={
            "subscription_id": "INVALID_SUBSCRIPTION_ID_12345"
        })
        # Should return 400 or 502 (PayPal error)
        assert response.status_code in [400, 502], f"Expected 400/502, got {response.status_code}"
        print("Subscription activation correctly rejects invalid subscription_id")


class TestSubscriptionCancel:
    """Tests for POST /api/subscription/cancel"""
    
    def test_cancel_returns_404_when_no_subscription(self, regular_client):
        """POST /api/subscription/cancel returns 404 when no active subscription"""
        response = regular_client.post(f"{BASE_URL}/api/subscription/cancel", json={})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print("Subscription cancel correctly returns 404 for no active subscription")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_health_endpoint(self, api_client):
        """GET /api/health returns healthy status"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("Health check passed")
    
    def test_admin_login(self, api_client):
        """Admin can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["is_admin"] == True
        print("Admin login successful")
    
    def test_regular_user_login(self, api_client):
        """Regular user can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_EMAIL,
            "password": REGULAR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["is_admin"] == False
        print("Regular user login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
