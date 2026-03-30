"""
Test RGPD (GDPR) API endpoints for TranscriptFlow
- GET /api/auth/export-data - Export user data
- DELETE /api/auth/account - Delete user account
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@transcriptflow.com"
ADMIN_PASSWORD = "Admin2026!"
TEST_USER_EMAIL = "stele@test.com"
TEST_USER_PASSWORD = "TestPass123!"


class TestRGPDExportData:
    """Test GET /api/auth/export-data endpoint"""
    
    def test_export_data_requires_auth(self):
        """Export data should require authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/export-data")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Export data requires authentication")
    
    def test_export_data_returns_user_info(self):
        """Export data should return user info and transcriptions"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        
        # Export data
        response = requests.get(
            f"{BASE_URL}/api/auth/export-data",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user' field"
        assert "transcriptions" in data, "Response should contain 'transcriptions' field"
        assert "exported_at" in data, "Response should contain 'exported_at' field"
        
        # Verify user info structure
        user_info = data["user"]
        assert "name" in user_info, "User info should contain 'name'"
        assert "email" in user_info, "User info should contain 'email'"
        assert "created_at" in user_info, "User info should contain 'created_at'"
        
        # Verify transcriptions is a list
        assert isinstance(data["transcriptions"], list), "Transcriptions should be a list"
        
        print(f"✓ Export data returns user info: {user_info['email']}")
        print(f"✓ Export data returns {len(data['transcriptions'])} transcriptions")
        print(f"✓ Export timestamp: {data['exported_at']}")


class TestRGPDDeleteAccount:
    """Test DELETE /api/auth/account endpoint"""
    
    def test_delete_account_requires_auth(self):
        """Delete account should require authentication"""
        response = requests.delete(f"{BASE_URL}/api/auth/account")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Delete account requires authentication")
    
    def test_delete_account_removes_user_and_data(self):
        """Delete account should remove user and all their data"""
        # Create a new test user for deletion
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"deletetest_{unique_id}@test.com"
        test_password = "TestPass123!"
        test_name = "Delete Test User"
        
        # Register new user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "name": test_name
        })
        assert register_response.status_code == 200, f"Registration failed: {register_response.text}"
        token = register_response.json()["access_token"]
        print(f"✓ Created test user: {test_email}")
        
        # Verify user exists
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200, "User should exist before deletion"
        print("✓ Verified user exists")
        
        # Delete account
        delete_response = requests.delete(
            f"{BASE_URL}/api/auth/account",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data, "Response should contain 'message'"
        print(f"✓ Delete response: {data['message']}")
        
        # Verify user no longer exists (token should be invalid)
        me_response_after = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response_after.status_code in [401, 404], "User should not exist after deletion"
        print("✓ Verified user no longer exists")
        
        # Verify cannot login with deleted credentials
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        assert login_response.status_code == 401, "Should not be able to login with deleted account"
        print("✓ Verified cannot login with deleted credentials")


class TestAuthEndpoints:
    """Test auth endpoints for RGPD compliance"""
    
    def test_login_returns_user_data(self):
        """Login should return user data for RGPD transparency"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        
        user = data["user"]
        assert "id" in user, "User should have 'id'"
        assert "email" in user, "User should have 'email'"
        assert "name" in user, "User should have 'name'"
        assert "created_at" in user, "User should have 'created_at'"
        
        print(f"✓ Login returns user data: {user['email']}")
    
    def test_register_returns_user_data(self):
        """Register should return user data for RGPD transparency"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"rgpdtest_{unique_id}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "RGPD Test User"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        
        user = data["user"]
        assert user["email"] == test_email, "User email should match"
        
        print(f"✓ Register returns user data: {user['email']}")
        
        # Cleanup: delete the test user
        token = data["access_token"]
        requests.delete(
            f"{BASE_URL}/api/auth/account",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("✓ Cleaned up test user")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
