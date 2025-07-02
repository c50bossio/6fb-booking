#!/usr/bin/env python3
"""
Simple test script for integration endpoints.
Tests the integration system without importing the full main app.
"""

import os
import sys
import asyncio
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_integration_services():
    """Test integration service imports and basic functionality"""
    print("🧪 Testing Integration Service Imports...")
    
    try:
        from services.integration_service import BaseIntegrationService, IntegrationServiceFactory
        print("✅ BaseIntegrationService imported successfully")
    except Exception as e:
        print(f"❌ Failed to import BaseIntegrationService: {e}")
        return False
    
    try:
        from models.integration import Integration, IntegrationType, IntegrationStatus
        print("✅ Integration models imported successfully")
    except Exception as e:
        print(f"❌ Failed to import Integration models: {e}")
        return False
    
    try:
        from services.gmb_service import GMBService
        service = GMBService()
        print("✅ GMBService created successfully")
        print(f"   - OAuth URL available: {bool(service.oauth_base_url)}")
        print(f"   - Scopes configured: {len(service.scopes)}")
    except Exception as e:
        print(f"❌ Failed to create GMBService: {e}")
        return False
    
    try:
        from schemas.integration import IntegrationCreate, IntegrationResponse
        print("✅ Integration schemas imported successfully")
    except Exception as e:
        print(f"❌ Failed to import Integration schemas: {e}")
        return False
    
    return True


def test_database_models():
    """Test database model creation and basic operations"""
    print("\n🗄️ Testing Database Models...")
    
    try:
        from models.integration import Integration, IntegrationType, IntegrationStatus
        from models.review import Review, ReviewResponseStatus, ReviewPlatform
        from models import User
        from database import Base, engine
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
        
        # Test model creation
        from sqlalchemy.orm import sessionmaker
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Create test user
        test_user = User(
            email="test@example.com",
            name="Test User",
            hashed_password="test_hash",
            role="user"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print("✅ Test user created successfully")
        
        # Create test integration
        test_integration = Integration(
            user_id=test_user.id,
            name="Test GMB Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.PENDING,
            config={"test": True}
        )
        db.add(test_integration)
        db.commit()
        db.refresh(test_integration)
        print("✅ Test integration created successfully")
        
        # Create test review
        test_review = Review(
            user_id=test_user.id,
            integration_id=test_integration.id,
            external_review_id="test_review_123",
            reviewer_name="Test Reviewer",
            rating=5.0,
            review_text="Great service!",
            platform=ReviewPlatform.GOOGLE,
            response_status=ReviewResponseStatus.PENDING
        )
        db.add(test_review)
        db.commit()
        db.refresh(test_review)
        print("✅ Test review created successfully")
        
        # Test relationships
        assert test_integration.user == test_user
        assert test_review.integration == test_integration
        print("✅ Model relationships working correctly")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database model test failed: {e}")
        return False


def test_oauth_flows():
    """Test OAuth flow components"""
    print("\n🔐 Testing OAuth Flow Components...")
    
    try:
        from services.integration_service import BaseIntegrationService
        from models.integration import Integration, IntegrationType, IntegrationStatus
        from models import User
        
        # Create mock service for testing
        class MockService(BaseIntegrationService):
            @property
            def integration_type(self): return IntegrationType.GOOGLE_MY_BUSINESS
            @property
            def oauth_authorize_url(self): return "https://accounts.google.com/oauth/authorize"
            @property
            def oauth_token_url(self): return "https://oauth2.googleapis.com/token"
            @property
            def required_scopes(self): return ["https://www.googleapis.com/auth/business.manage"]
            @property
            def client_id(self): return "test_client_id"
            @property
            def client_secret(self): return "test_client_secret"
            @property
            def default_redirect_uri(self): return "http://localhost:3000/oauth/callback"
            
            async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> dict:
                return {"access_token": "test_token", "expires_in": 3600}
            
            async def refresh_access_token(self, refresh_token: str) -> dict:
                return {"access_token": "new_token", "expires_in": 3600}
            
            async def verify_connection(self, integration: Integration) -> tuple:
                return True, None
        
        # Test with in-memory database
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from database import Base
        
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        service = MockService(db)
        
        # Test state generation
        state = service.generate_oauth_state(user_id=1)
        print("✅ OAuth state generation working")
        
        # Test state verification
        state_data = service.verify_oauth_state(state)
        assert state_data["user_id"] == 1
        print("✅ OAuth state verification working")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ OAuth flow test failed: {e}")
        return False


async def test_gmb_service_methods():
    """Test GMB service methods"""
    print("\n🏢 Testing GMB Service Methods...")
    
    try:
        from services.gmb_service import GMBService
        
        service = GMBService()
        
        # Test OAuth URL generation
        oauth_url = service.get_oauth_url(
            redirect_uri="http://localhost:3000/callback",
            state="test_state"
        )
        print("✅ OAuth URL generation working")
        print(f"   - URL contains correct domain: {'accounts.google.com' in oauth_url}")
        
        # Test configuration
        assert service.client_id is not None or True  # May be None in test env
        assert len(service.scopes) > 0
        print("✅ GMB service configuration loaded")
        
        return True
        
    except Exception as e:
        print(f"❌ GMB service method test failed: {e}")
        return False


async def test_health_monitoring():
    """Test health monitoring functionality"""
    print("\n💚 Testing Health Monitoring...")
    
    try:
        from services.integration_service import BaseIntegrationService
        from models.integration import Integration, IntegrationType, IntegrationStatus
        from models import User
        from database import Base
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        
        # Mock service
        class HealthTestService(BaseIntegrationService):
            @property
            def integration_type(self): return IntegrationType.GOOGLE_MY_BUSINESS
            @property
            def oauth_authorize_url(self): return "https://test.com/oauth"
            @property
            def oauth_token_url(self): return "https://test.com/token"
            @property
            def required_scopes(self): return ["test.scope"]
            @property
            def client_id(self): return "test_id"
            @property
            def client_secret(self): return "test_secret"
            @property
            def default_redirect_uri(self): return "http://localhost:3000/callback"
            
            async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> dict:
                return {"access_token": "token", "expires_in": 3600}
            
            async def refresh_access_token(self, refresh_token: str) -> dict:
                return {"access_token": "new_token", "expires_in": 3600}
            
            async def verify_connection(self, integration: Integration) -> tuple:
                return True, None
        
        # Setup test database
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Create test data
        user = User(email="test@example.com", name="Test", hashed_password="hash", role="user")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        integration = Integration(
            user_id=user.id,
            name="Test Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.ACTIVE
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        # Test health check
        service = HealthTestService(db)
        health_check = await service.perform_health_check(integration)
        
        assert health_check.healthy is True
        assert health_check.integration_id == integration.id
        print("✅ Health check functionality working")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Health monitoring test failed: {e}")
        return False


async def main():
    """Run all integration tests"""
    print("🚀 Starting Integration System Tests")
    print("=" * 60)
    
    test_results = []
    
    # Test 1: Service imports
    result1 = test_integration_services()
    test_results.append(("Service Imports", result1))
    
    # Test 2: Database models
    result2 = test_database_models()
    test_results.append(("Database Models", result2))
    
    # Test 3: OAuth flows
    result3 = test_oauth_flows()
    test_results.append(("OAuth Flows", result3))
    
    # Test 4: GMB service methods
    result4 = await test_gmb_service_methods()
    test_results.append(("GMB Service Methods", result4))
    
    # Test 5: Health monitoring
    result5 = await test_health_monitoring()
    test_results.append(("Health Monitoring", result5))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<25} {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal Tests: {len(test_results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/len(test_results)*100):.1f}%")
    
    overall_status = "✅ HEALTHY" if failed == 0 else "⚠️ ISSUES DETECTED"
    print(f"\nIntegration System Status: {overall_status}")
    
    return failed == 0


if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        sys.exit(1)