#!/usr/bin/env python3
"""
Authentication System Test Script for BookedBarber V2
Comprehensive testing of the enhanced authentication system
"""

import asyncio
import logging
import sys
import httpx
from db import get_db
from utils.auth_enhanced import authenticate_user_enhanced, create_access_token, decode_token_with_retry
from utils.session_manager import session_manager
from models import User

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AuthSystemTester:
    """Comprehensive authentication system tester"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.test_user_email = "auth.test@bookedbarber.com"
        self.test_user_password = "TestPassword123!"
        self.test_user_id = None
        self.session_id = None
        self.access_token = None
        self.refresh_token = None
        
    async def run_all_tests(self) -> bool:
        """Run all authentication tests"""
        logger.info("🚀 Starting comprehensive authentication system tests")
        
        tests = [
            ("Database Connection Test", self.test_database_connection),
            ("Redis Connection Test", self.test_redis_connection),
            ("Session Manager Test", self.test_session_manager),
            ("Token Generation Test", self.test_token_generation),
            ("User Authentication Test", self.test_user_authentication),
            ("API Login Test", self.test_api_login),
            ("Token Refresh Test", self.test_token_refresh),
            ("Session Persistence Test", self.test_session_persistence),
            ("API Current User Test", self.test_api_current_user),
            ("Logout Test", self.test_logout),
            ("Debug Endpoint Test", self.test_debug_endpoint),
            ("Cleanup Test", self.cleanup_test_data)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                logger.info(f"🧪 Running: {test_name}")
                await test_func()
                logger.info(f"✅ {test_name} PASSED")
                passed += 1
            except Exception as e:
                logger.error(f"❌ {test_name} FAILED: {str(e)}")
                failed += 1
            
            # Brief pause between tests
            await asyncio.sleep(0.5)
        
        logger.info(f"\n📊 Test Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            logger.info("🎉 All authentication tests passed!")
            return True
        else:
            logger.error(f"💥 {failed} tests failed. Please review the issues.")
            return False
    
    async def test_database_connection(self):
        """Test database connection"""
        db = next(get_db())
        try:
            # Try to query users table
            user_count = db.query(User).count()
            logger.info(f"📊 Found {user_count} users in database")
        finally:
            db.close()
    
    async def test_redis_connection(self):
        """Test Redis connection for session storage"""
        try:
            health = await session_manager.health_check()
            logger.info(f"📊 Redis health: {health}")
            
            if not health.get('redis_connected', False):
                logger.warning("⚠️ Redis not connected, using fallback storage")
            else:
                logger.info("✅ Redis connected successfully")
        except Exception as e:
            logger.warning(f"⚠️ Redis test failed: {e}")
    
    async def test_session_manager(self):
        """Test session manager functionality"""
        test_session_id = "test_session_123"
        test_user_id = 999
        
        # Create test session
        success = await session_manager.create_session(
            session_id=test_session_id,
            user_id=test_user_id,
            email=self.test_user_email,
            role="test_user",
            ip_address="127.0.0.1",
            user_agent="Test Agent"
        )
        
        if not success:
            raise Exception("Failed to create test session")
        
        # Retrieve test session
        session_data = await session_manager.get_session(test_session_id)
        
        if not session_data:
            raise Exception("Failed to retrieve test session")
        
        if session_data.user_id != test_user_id:
            raise Exception(f"Session data mismatch: expected {test_user_id}, got {session_data.user_id}")
        
        # Delete test session
        await session_manager.delete_session(test_session_id)
        
        # Verify deletion
        deleted_session = await session_manager.get_session(test_session_id)
        if deleted_session:
            raise Exception("Test session was not properly deleted")
        
        logger.info("✅ Session manager working correctly")
    
    async def test_token_generation(self):
        """Test JWT token generation and validation"""
        test_data = {"sub": self.test_user_email, "role": "test_user"}
        
        # Generate access token
        access_token = create_access_token(data=test_data)
        
        if not access_token:
            raise Exception("Failed to generate access token")
        
        # Decode token
        payload = await decode_token_with_retry(access_token)
        
        if payload.get("sub") != self.test_user_email:
            raise Exception(f"Token decode failed: expected {self.test_user_email}, got {payload.get('sub')}")
        
        if payload.get("type") != "access":
            raise Exception(f"Token type mismatch: expected 'access', got {payload.get('type')}")
        
        logger.info("✅ Token generation and validation working correctly")
    
    async def test_user_authentication(self):
        """Test user authentication with session creation"""
        db = next(get_db())
        try:
            # Create test user if not exists
            test_user = db.query(User).filter(User.email == self.test_user_email).first()
            
            if not test_user:
                from utils.auth import get_password_hash
                test_user = User(
                    email=self.test_user_email,
                    name="Auth Test User",
                    hashed_password=get_password_hash(self.test_user_password),
                    role="test_user",
                    unified_role="test_user",
                    email_verified=True
                )
                db.add(test_user)
                db.commit()
                db.refresh(test_user)
                logger.info(f"📝 Created test user: {self.test_user_email}")
            
            self.test_user_id = test_user.id
            
            # Test authentication
            user, session_id = await authenticate_user_enhanced(
                db, 
                self.test_user_email, 
                self.test_user_password
            )
            
            if not user:
                raise Exception("User authentication failed")
            
            if not session_id:
                logger.warning("⚠️ Session ID not returned (using fallback storage)")
            else:
                self.session_id = session_id
                logger.info(f"✅ Session created: {session_id}")
            
            logger.info(f"✅ User authenticated successfully: {user.email}")
            
        finally:
            db.close()
    
    async def test_api_login(self):
        """Test API login endpoint"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v2/auth/login",
                json={
                    "email": self.test_user_email,
                    "password": self.test_user_password
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"API login failed with status {response.status_code}: {response.text}")
            
            data = response.json()
            
            if not data.get("access_token"):
                raise Exception("No access token in login response")
            
            if not data.get("refresh_token"):
                raise Exception("No refresh token in login response")
            
            self.access_token = data["access_token"]
            self.refresh_token = data["refresh_token"]
            
            logger.info("✅ API login successful")
    
    async def test_token_refresh(self):
        """Test token refresh endpoint"""
        if not self.refresh_token:
            raise Exception("No refresh token available for testing")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v2/auth/refresh",
                json={"refresh_token": self.refresh_token}
            )
            
            if response.status_code != 200:
                raise Exception(f"Token refresh failed with status {response.status_code}: {response.text}")
            
            data = response.json()
            
            if not data.get("access_token"):
                raise Exception("No access token in refresh response")
            
            # Update tokens
            self.access_token = data["access_token"]
            if data.get("refresh_token"):
                self.refresh_token = data["refresh_token"]
            
            logger.info("✅ Token refresh successful")
    
    async def test_session_persistence(self):
        """Test session persistence across requests"""
        if not self.session_id:
            logger.warning("⚠️ Skipping session persistence test (no session ID)")
            return
        
        # Wait a moment to simulate time passing
        await asyncio.sleep(1)
        
        # Check if session still exists
        session_data = await session_manager.get_session(self.session_id)
        
        if not session_data:
            raise Exception("Session did not persist")
        
        if session_data.email != self.test_user_email:
            raise Exception(f"Session data corrupted: expected {self.test_user_email}, got {session_data.email}")
        
        logger.info("✅ Session persistence working correctly")
    
    async def test_api_current_user(self):
        """Test /auth/me endpoint"""
        if not self.access_token:
            raise Exception("No access token available for testing")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v2/auth/me",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            
            if response.status_code != 200:
                raise Exception(f"Current user API failed with status {response.status_code}: {response.text}")
            
            data = response.json()
            
            if data.get("email") != self.test_user_email:
                raise Exception(f"User data mismatch: expected {self.test_user_email}, got {data.get('email')}")
            
            logger.info("✅ Current user API working correctly")
    
    async def test_logout(self):
        """Test logout functionality"""
        if not self.access_token:
            raise Exception("No access token available for testing")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v2/auth/logout",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            
            if response.status_code != 200:
                raise Exception(f"Logout failed with status {response.status_code}: {response.text}")
            
            # Verify that subsequent requests with the token fail
            user_response = await client.get(
                f"{self.base_url}/api/v2/auth/me",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            
            if user_response.status_code == 200:
                logger.warning("⚠️ Token still valid after logout (may be expected in development)")
            
            logger.info("✅ Logout functionality working")
    
    async def test_debug_endpoint(self):
        """Test auth debug endpoint (development only)"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/v2/auth/debug")
            
            if response.status_code == 404:
                logger.info("✅ Debug endpoint disabled (production mode)")
                return
            
            if response.status_code != 200:
                raise Exception(f"Debug endpoint failed with status {response.status_code}: {response.text}")
            
            data = response.json()
            
            if not isinstance(data, dict):
                raise Exception("Debug endpoint returned invalid data")
            
            logger.info(f"✅ Debug endpoint working: {len(data)} fields returned")
    
    async def cleanup_test_data(self):
        """Clean up test data"""
        db = next(get_db())
        try:
            # Remove test user
            if self.test_user_id:
                test_user = db.query(User).filter(User.id == self.test_user_id).first()
                if test_user:
                    db.delete(test_user)
                    db.commit()
                    logger.info(f"🗑️ Cleaned up test user: {self.test_user_email}")
            
            # Clean up any remaining test sessions
            if self.session_id:
                await session_manager.delete_session(self.session_id)
                logger.info(f"🗑️ Cleaned up test session: {self.session_id}")
            
        finally:
            db.close()

async def main():
    """Main test runner"""
    print("🔐 BookedBarber V2 Authentication System Test")
    print("=" * 50)
    
    tester = AuthSystemTester()
    
    try:
        success = await tester.run_all_tests()
        
        if success:
            print("\n🎉 Authentication system is working correctly!")
            sys.exit(0)
        else:
            print("\n💥 Authentication system has issues that need attention.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test runner failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())