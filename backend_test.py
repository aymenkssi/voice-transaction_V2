import requests
import sys
import json
from datetime import datetime

class VxScribAPITester:
    def __init__(self, base_url="https://voice-pay-demo-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, status_code=None, message="", expected_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {message}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "status_code": status_code,
            "expected_status": expected_status,
            "message": message
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            message = f"Status: {response.status_code}, Expected: {expected_status}"
            
            if not success:
                try:
                    error_detail = response.json()
                    message += f", Response: {error_detail}"
                except:
                    message += f", Response: {response.text[:200]}"

            self.log_test(name, success, response.status_code, message, expected_status)
            
            return success, response.json() if success and response.content else {}

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, None, f"Request failed: {str(e)}")
            return False, {}

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        # Test root endpoint
        self.run_test("Root API endpoint", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health check endpoint", "GET", "health", 200)

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION FLOW")
        print("="*50)
        
        # Test user registration
        timestamp = datetime.now().strftime("%H%M%S")
        test_email = f"test_{timestamp}@example.com"
        test_password = "Test123!"
        test_name = f"Test User {timestamp}"
        
        success, response = self.run_test(
            "User registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": test_password,
                "name": test_name
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   ✅ Token obtained: {self.token[:20]}...")
        
        # Test user login with the same credentials
        success, response = self.run_test(
            "User login",
            "POST", 
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": test_password
            }
        )
        
        # Test invalid login
        self.run_test(
            "Invalid login (wrong password)",
            "POST",
            "auth/login", 
            401,
            data={
                "email": test_email,
                "password": "wrongpassword"
            }
        )
        
        # Test get current user (protected endpoint)
        if self.token:
            self.run_test(
                "Get current user (protected)",
                "GET",
                "auth/me",
                200
            )

    def test_admin_login(self):
        """Test admin login with seeded credentials"""
        print("\n" + "="*50)
        print("TESTING ADMIN LOGIN")
        print("="*50)
        
        # Test admin login
        success, response = self.run_test(
            "Admin login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@transcriptflow.com",
                "password": "Admin2026!"
            }
        )
        
        if success and 'access_token' in response:
            admin_token = response['access_token']
            print(f"   ✅ Admin token obtained: {admin_token[:20]}...")
            
            # Verify admin user details
            if response.get('user', {}).get('is_admin'):
                print("   ✅ Admin flag verified")
            else:
                print("   ❌ Admin flag not set properly")

    def test_protected_endpoints(self):
        """Test protected endpoints without authentication"""
        print("\n" + "="*50)
        print("TESTING PROTECTED ENDPOINTS (NO AUTH)")
        print("="*50)
        
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        # Test accessing protected endpoint without token
        self.run_test(
            "Protected endpoint without auth",
            "GET",
            "auth/me",
            401
        )
        
        # Restore token
        self.token = temp_token

    def test_vxscrib_branding(self):
        """Test VxScrib branding in API responses"""
        print("\n" + "="*50)
        print("TESTING VXSCRIB BRANDING")
        print("="*50)
        
        # Test root endpoint returns VxScrib API
        success, response = self.run_test("Root API returns VxScrib branding", "GET", "", 200)
        
        if success:
            if response.get('message') == 'VxScrib API':
                print("   ✅ API message contains 'VxScrib API'")
                self.log_test("VxScrib API message verification", True, 200, "Correct branding found")
            else:
                print(f"   ❌ Expected 'VxScrib API', got: {response.get('message')}")
                self.log_test("VxScrib API message verification", False, 200, f"Wrong branding: {response.get('message')}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting VxScrib API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        
        # Run test suites
        self.test_health_endpoints()
        self.test_vxscrib_branding()
        self.test_auth_flow()
        self.test_admin_login()
        self.test_protected_endpoints()
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"📊 Tests run: {self.tests_run}")
        print(f"✅ Tests passed: {self.tests_passed}")
        print(f"❌ Tests failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Save detailed results
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'total_tests': self.tests_run,
                    'passed_tests': self.tests_passed,
                    'failed_tests': self.tests_run - self.tests_passed,
                    'success_rate': f"{(self.tests_passed/self.tests_run)*100:.1f}%"
                },
                'test_results': self.test_results,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
        
        return self.tests_passed == self.tests_run

def main():
    tester = VxScribAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())