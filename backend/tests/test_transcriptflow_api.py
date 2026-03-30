"""
TranscriptFlow API Tests
Tests for authentication, user management, and transcription endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@transcriptflow.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_NAME = "Test User"

# Store tokens for authenticated tests
auth_tokens = {}


class TestHealthEndpoints:
    """Health check endpoint tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "TranscriptFlow API"
        print(f"✓ API root returns: {data}")
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check: {data}")


class TestAuthRegistration:
    """User registration tests"""
    
    def test_register_new_user(self):
        """Test registering a new user"""
        payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        assert data["user"]["name"] == TEST_USER_NAME
        assert "id" in data["user"]
        
        # Store token for later tests
        auth_tokens["test_user"] = data["access_token"]
        print(f"✓ User registered: {data['user']['email']}")
    
    def test_register_duplicate_email(self):
        """Test registering with existing email fails"""
        payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Duplicate User"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Duplicate registration rejected: {data['detail']}")
    
    def test_register_invalid_email(self):
        """Test registering with invalid email format"""
        payload = {
            "email": "invalid-email",
            "password": TEST_USER_PASSWORD,
            "name": "Invalid Email User"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 422  # Validation error
        print("✓ Invalid email rejected")


class TestAuthLogin:
    """User login tests"""
    
    def test_login_valid_credentials(self):
        """Test login with valid credentials"""
        payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        
        # Update token
        auth_tokens["test_user"] = data["access_token"]
        print(f"✓ Login successful for: {data['user']['email']}")
    
    def test_login_invalid_password(self):
        """Test login with wrong password"""
        payload = {
            "email": TEST_USER_EMAIL,
            "password": "WrongPassword123!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid password rejected: {data['detail']}")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email"""
        payload = {
            "email": "nonexistent@transcriptflow.com",
            "password": TEST_USER_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401
        print("✓ Non-existent user login rejected")
    
    def test_login_with_seeded_account(self):
        """Test login with the seeded test account stele@test.com"""
        # First register this account if it doesn't exist
        register_payload = {
            "email": "stele@test.com",
            "password": "TestPass123!",
            "name": "Stele Test User"
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        # Now try to login
        login_payload = {
            "email": "stele@test.com",
            "password": "TestPass123!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        auth_tokens["stele_user"] = data["access_token"]
        print(f"✓ Stele test account login successful")


class TestAuthenticatedEndpoints:
    """Tests requiring authentication"""
    
    def test_get_current_user(self):
        """Test getting current user profile"""
        token = auth_tokens.get("test_user")
        if not token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        assert data["name"] == TEST_USER_NAME
        print(f"✓ Current user retrieved: {data['email']}")
    
    def test_get_current_user_no_token(self):
        """Test accessing protected endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 403  # FastAPI returns 403 for missing auth
        print("✓ Unauthorized access rejected")
    
    def test_get_current_user_invalid_token(self):
        """Test accessing protected endpoint with invalid token"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 401
        print("✓ Invalid token rejected")


class TestTranscriptionEndpoints:
    """Transcription CRUD tests"""
    
    def test_get_transcriptions_empty(self):
        """Test getting transcriptions list (may be empty for new user)"""
        token = auth_tokens.get("test_user")
        if not token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/transcriptions", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Transcriptions list retrieved: {len(data)} items")
    
    def test_get_transcriptions_unauthorized(self):
        """Test getting transcriptions without auth"""
        response = requests.get(f"{BASE_URL}/api/transcriptions")
        assert response.status_code == 403
        print("✓ Unauthorized transcription access rejected")
    
    def test_get_nonexistent_transcription(self):
        """Test getting a non-existent transcription"""
        token = auth_tokens.get("test_user")
        if not token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/transcriptions/{fake_id}", headers=headers)
        assert response.status_code == 404
        print("✓ Non-existent transcription returns 404")
    
    def test_delete_nonexistent_transcription(self):
        """Test deleting a non-existent transcription"""
        token = auth_tokens.get("test_user")
        if not token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/transcriptions/{fake_id}", headers=headers)
        assert response.status_code == 404
        print("✓ Delete non-existent transcription returns 404")


class TestFileUpload:
    """File upload tests (without actual transcription)"""
    
    def test_upload_invalid_file_type(self):
        """Test uploading unsupported file type"""
        token = auth_tokens.get("test_user")
        if not token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a fake text file
        files = {"file": ("test.txt", b"This is not an audio file", "text/plain")}
        response = requests.post(f"{BASE_URL}/api/transcriptions/upload", headers=headers, files=files)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid file type rejected: {data['detail']}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_info(self):
        """Print cleanup info"""
        print(f"\n--- Test Summary ---")
        print(f"Test user created: {TEST_USER_EMAIL}")
        print(f"Tokens stored: {list(auth_tokens.keys())}")
        print("Note: Test users remain in database for manual cleanup if needed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
