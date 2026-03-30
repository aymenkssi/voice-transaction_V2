"""
TranscriptFlow Admin API Tests
Tests for admin authentication, statistics, user management, and transcription management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials (seeded at startup)
ADMIN_EMAIL = "admin@transcriptflow.com"
ADMIN_PASSWORD = "Admin2026!"

# Regular user credentials
REGULAR_USER_EMAIL = "stele@test.com"
REGULAR_USER_PASSWORD = "TestPass123!"

# Store tokens for authenticated tests
auth_tokens = {}


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True, "Admin user should have is_admin=True"
        
        auth_tokens["admin"] = data["access_token"]
        print(f"✓ Admin login successful: {data['user']['email']}, is_admin={data['user']['is_admin']}")
    
    def test_regular_user_login(self):
        """Test regular user login and verify is_admin=False"""
        # First ensure user exists
        register_payload = {
            "email": REGULAR_USER_EMAIL,
            "password": REGULAR_USER_PASSWORD,
            "name": "Stele Test User"
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        # Login
        login_payload = {
            "email": REGULAR_USER_EMAIL,
            "password": REGULAR_USER_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        assert response.status_code == 200, f"Regular user login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        # is_admin should be False or not present (defaults to False)
        is_admin = data["user"].get("is_admin", False)
        assert is_admin == False, "Regular user should have is_admin=False"
        
        auth_tokens["regular_user"] = data["access_token"]
        print(f"✓ Regular user login successful: {data['user']['email']}, is_admin={is_admin}")


class TestAdminStatsEndpoint:
    """Tests for GET /api/admin/stats"""
    
    def test_admin_stats_success(self):
        """Test admin can access global statistics"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        
        data = response.json()
        # Verify all required fields are present
        required_fields = [
            "total_users", "total_transcriptions", "completed", "failed",
            "total_duration_seconds", "total_words", "translations_count", "success_rate"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_transcriptions"], int)
        assert isinstance(data["completed"], int)
        assert isinstance(data["failed"], int)
        assert isinstance(data["total_words"], int)
        assert isinstance(data["translations_count"], int)
        assert isinstance(data["success_rate"], (int, float))
        
        print(f"✓ Admin stats retrieved: users={data['total_users']}, transcriptions={data['total_transcriptions']}, success_rate={data['success_rate']}%")
    
    def test_admin_stats_forbidden_for_regular_user(self):
        """Test regular user gets 403 on admin stats"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Regular user correctly denied access to admin stats (403)")
    
    def test_admin_stats_unauthorized(self):
        """Test unauthenticated request gets 403"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 403
        print("✓ Unauthenticated request correctly denied (403)")


class TestAdminStatsDailyEndpoint:
    """Tests for GET /api/admin/stats/daily"""
    
    def test_admin_stats_daily_success(self):
        """Test admin can access daily transcription statistics"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats/daily", headers=headers)
        assert response.status_code == 200, f"Admin daily stats failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Daily stats should be a list"
        
        # If there's data, verify structure
        if len(data) > 0:
            item = data[0]
            assert "date" in item
            assert "total" in item
            assert "completed" in item
            assert "failed" in item
        
        print(f"✓ Admin daily stats retrieved: {len(data)} days of data")
    
    def test_admin_stats_daily_forbidden_for_regular_user(self):
        """Test regular user gets 403 on daily stats"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats/daily", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied access to daily stats (403)")


class TestAdminStatsLanguagesEndpoint:
    """Tests for GET /api/admin/stats/languages"""
    
    def test_admin_stats_languages_success(self):
        """Test admin can access language distribution"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats/languages", headers=headers)
        assert response.status_code == 200, f"Admin language stats failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Language stats should be a list"
        
        # If there's data, verify structure
        if len(data) > 0:
            item = data[0]
            assert "language" in item
            assert "count" in item
        
        print(f"✓ Admin language stats retrieved: {len(data)} languages")
    
    def test_admin_stats_languages_forbidden_for_regular_user(self):
        """Test regular user gets 403 on language stats"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats/languages", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied access to language stats (403)")


class TestAdminStatsOriginsEndpoint:
    """Tests for GET /api/admin/stats/origins - email domains, TLD, registrations timeline"""
    
    def test_admin_stats_origins_success(self):
        """Test admin can access account origin statistics"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats/origins", headers=headers)
        assert response.status_code == 200, f"Admin origins stats failed: {response.text}"
        
        data = response.json()
        
        # Verify all required fields are present
        assert "email_domains" in data, "Missing email_domains"
        assert "registrations_by_day" in data, "Missing registrations_by_day"
        assert "tld_distribution" in data, "Missing tld_distribution"
        
        # Verify email_domains structure
        assert isinstance(data["email_domains"], list)
        if len(data["email_domains"]) > 0:
            domain_item = data["email_domains"][0]
            assert "domain" in domain_item
            assert "count" in domain_item
        
        # Verify registrations_by_day structure
        assert isinstance(data["registrations_by_day"], list)
        if len(data["registrations_by_day"]) > 0:
            reg_item = data["registrations_by_day"][0]
            assert "date" in reg_item
            assert "count" in reg_item
        
        # Verify tld_distribution structure
        assert isinstance(data["tld_distribution"], list)
        if len(data["tld_distribution"]) > 0:
            tld_item = data["tld_distribution"][0]
            assert "tld" in tld_item
            assert "count" in tld_item
        
        print(f"✓ Admin origins stats retrieved: {len(data['email_domains'])} domains, {len(data['tld_distribution'])} TLDs, {len(data['registrations_by_day'])} registration days")
    
    def test_admin_stats_origins_forbidden_for_regular_user(self):
        """Test regular user gets 403 on origins stats"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats/origins", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied access to origins stats (403)")


class TestAdminUsersEndpoint:
    """Tests for GET /api/admin/users"""
    
    def test_admin_get_users_success(self):
        """Test admin can get all users with enriched data"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200, f"Admin get users failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Users should be a list"
        assert len(data) > 0, "Should have at least one user (admin)"
        
        # Verify user structure with enriched fields
        user = data[0]
        assert "id" in user
        assert "email" in user
        assert "name" in user
        assert "created_at" in user
        assert "transcription_count" in user, "Missing transcription_count"
        assert "completed_count" in user, "Missing completed_count"
        assert "email_domain" in user, "Missing email_domain"
        
        # Find admin user and verify is_admin flag
        admin_user = next((u for u in data if u["email"] == ADMIN_EMAIL), None)
        assert admin_user is not None, "Admin user should be in the list"
        assert admin_user.get("is_admin") == True, "Admin user should have is_admin=True"
        
        print(f"✓ Admin users retrieved: {len(data)} users, admin found with is_admin=True")
    
    def test_admin_get_users_forbidden_for_regular_user(self):
        """Test regular user gets 403 on users list"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied access to users list (403)")


class TestAdminTranscriptionsEndpoint:
    """Tests for GET /api/admin/transcriptions"""
    
    def test_admin_get_transcriptions_success(self):
        """Test admin can get all transcriptions with user info"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/transcriptions", headers=headers)
        assert response.status_code == 200, f"Admin get transcriptions failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Transcriptions should be a list"
        
        # If there are transcriptions, verify structure
        if len(data) > 0:
            trans = data[0]
            assert "id" in trans
            assert "user_id" in trans
            assert "filename" in trans
            assert "status" in trans
            assert "user_email" in trans, "Missing user_email"
            assert "user_name" in trans, "Missing user_name"
        
        print(f"✓ Admin transcriptions retrieved: {len(data)} transcriptions")
    
    def test_admin_get_transcriptions_forbidden_for_regular_user(self):
        """Test regular user gets 403 on transcriptions list"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/transcriptions", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied access to transcriptions list (403)")


class TestAdminDeleteUser:
    """Tests for DELETE /api/admin/users/:id"""
    
    def test_admin_delete_user_success(self):
        """Test admin can delete a user and their transcriptions"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        # First create a test user to delete
        test_email = f"test_delete_{uuid.uuid4().hex[:8]}@test.com"
        register_payload = {
            "email": test_email,
            "password": "TestPass123!",
            "name": "User To Delete"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        assert reg_response.status_code == 200, f"Failed to create test user: {reg_response.text}"
        
        user_id = reg_response.json()["user"]["id"]
        
        # Now delete the user
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=headers)
        assert response.status_code == 200, f"Admin delete user failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        
        # Verify user is deleted by trying to get users list
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        users = users_response.json()
        deleted_user = next((u for u in users if u["id"] == user_id), None)
        assert deleted_user is None, "User should be deleted"
        
        print(f"✓ Admin deleted user {test_email} successfully")
    
    def test_admin_cannot_delete_self(self):
        """Test admin cannot delete themselves"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        # Get admin user ID
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        admin_id = me_response.json()["id"]
        
        # Try to delete self
        response = requests.delete(f"{BASE_URL}/api/admin/users/{admin_id}", headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Admin correctly prevented from deleting self (400)")
    
    def test_admin_delete_nonexistent_user(self):
        """Test deleting non-existent user returns 404"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/admin/users/{fake_id}", headers=headers)
        assert response.status_code == 404
        print("✓ Delete non-existent user returns 404")
    
    def test_regular_user_cannot_delete_user(self):
        """Test regular user gets 403 when trying to delete user"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/admin/users/{fake_id}", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied delete user access (403)")


class TestAdminDeleteTranscription:
    """Tests for DELETE /api/admin/transcriptions/:id"""
    
    def test_admin_delete_nonexistent_transcription(self):
        """Test deleting non-existent transcription returns 404"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/admin/transcriptions/{fake_id}", headers=headers)
        assert response.status_code == 404
        print("✓ Delete non-existent transcription returns 404")
    
    def test_regular_user_cannot_delete_transcription_via_admin(self):
        """Test regular user gets 403 when trying to delete transcription via admin route"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/admin/transcriptions/{fake_id}", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied delete transcription via admin route (403)")


class TestUserResponseIsAdmin:
    """Tests for UserResponse is_admin field"""
    
    def test_admin_me_has_is_admin_true(self):
        """Test /auth/me returns is_admin=True for admin"""
        token = auth_tokens.get("admin")
        if not token:
            pytest.skip("No admin token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "is_admin" in data, "UserResponse should include is_admin field"
        assert data["is_admin"] == True
        print(f"✓ Admin /auth/me returns is_admin=True")
    
    def test_regular_user_me_has_is_admin_false(self):
        """Test /auth/me returns is_admin=False for regular user"""
        token = auth_tokens.get("regular_user")
        if not token:
            pytest.skip("No regular user token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # is_admin should be False or not present (defaults to False)
        is_admin = data.get("is_admin", False)
        assert is_admin == False
        print(f"✓ Regular user /auth/me returns is_admin=False")


class TestSummary:
    """Test summary"""
    
    def test_print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("ADMIN API TEST SUMMARY")
        print("="*50)
        print(f"Admin email: {ADMIN_EMAIL}")
        print(f"Regular user email: {REGULAR_USER_EMAIL}")
        print(f"Tokens obtained: {list(auth_tokens.keys())}")
        print("="*50)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
