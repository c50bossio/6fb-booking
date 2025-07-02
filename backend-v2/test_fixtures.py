#!/usr/bin/env python3
"""
Comprehensive test fixtures and mock data for integration testing.
Provides reusable test data, mock responses, and helper functions.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from unittest.mock import Mock
from models import User
from models.integration import Integration, IntegrationType, IntegrationStatus
from models.review import Review, ReviewResponse, ReviewTemplate, ReviewPlatform, ReviewSentiment, ReviewResponseStatus


class TestDataFactory:
    """Factory for creating test data objects"""

    @staticmethod
    def create_user(
        email: str = "test@barbershop.com",
        username: str = "testuser",
        full_name: str = "Test User",
        role: str = "barber"
    ) -> User:
        """Create a test user"""
        return User(
            email=email,
            username=username,
            full_name=full_name,
            role=role,
            hashed_password="$2b$12$test_hash_value"
        )

    @staticmethod
    def create_admin_user() -> User:
        """Create a test admin user"""
        return TestDataFactory.create_user(
            email="admin@barbershop.com",
            username="admin",
            full_name="Admin User",
            role="admin"
        )

    @staticmethod
    def create_integration(
        user_id: int,
        integration_type: IntegrationType = IntegrationType.GOOGLE_CALENDAR,
        name: str = "Test Integration",
        status: IntegrationStatus = IntegrationStatus.ACTIVE,
        is_active: bool = True,
        **kwargs
    ) -> Integration:
        """Create a test integration"""
        defaults = {
            "user_id": user_id,
            "name": name,
            "integration_type": integration_type,
            "status": status,
            "is_active": is_active,
            "config": {},
            "scopes": [],
            "error_count": 0
        }
        defaults.update(kwargs)
        return Integration(**defaults)

    @staticmethod
    def create_oauth_integration(
        user_id: int,
        integration_type: IntegrationType = IntegrationType.GOOGLE_CALENDAR,
        access_token: str = "encrypted_access_token",
        refresh_token: str = "encrypted_refresh_token",
        expires_in_hours: int = 1
    ) -> Integration:
        """Create an OAuth-enabled integration"""
        return TestDataFactory.create_integration(
            user_id=user_id,
            integration_type=integration_type,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours),
            scopes=TestMockResponses.get_default_scopes(integration_type)
        )

    @staticmethod
    def create_expired_integration(user_id: int) -> Integration:
        """Create an integration with expired token"""
        return TestDataFactory.create_oauth_integration(
            user_id=user_id,
            expires_in_hours=-1,  # Expired 1 hour ago
            status=IntegrationStatus.EXPIRED
        )

    @staticmethod
    def create_error_integration(
        user_id: int,
        error_message: str = "Connection failed"
    ) -> Integration:
        """Create an integration in error state"""
        return TestDataFactory.create_integration(
            user_id=user_id,
            status=IntegrationStatus.ERROR,
            last_error=error_message,
            error_count=3
        )

    @staticmethod
    def create_review(
        user_id: int,
        platform: ReviewPlatform = ReviewPlatform.GOOGLE,
        external_review_id: str = "review_123",
        reviewer_name: str = "John Doe",
        rating: float = 5.0,
        review_text: str = "Excellent service!",
        sentiment: ReviewSentiment = ReviewSentiment.POSITIVE,
        **kwargs
    ) -> Review:
        """Create a test review"""
        defaults = {
            "user_id": user_id,
            "platform": platform,
            "external_review_id": external_review_id,
            "reviewer_name": reviewer_name,
            "rating": rating,
            "review_text": review_text,
            "review_date": datetime.utcnow(),
            "sentiment": sentiment,
            "sentiment_score": 0.8 if sentiment == ReviewSentiment.POSITIVE else -0.6,
            "is_verified": True
        }
        defaults.update(kwargs)
        return Review(**defaults)

    @staticmethod
    def create_review_template(
        user_id: int,
        name: str = "Positive Response Template",
        category: str = "positive",
        template_text: str = "Thank you for your wonderful review, {reviewer_name}!",
        min_rating: float = 4.0,
        max_rating: float = 5.0
    ) -> ReviewTemplate:
        """Create a test review template"""
        return ReviewTemplate(
            user_id=user_id,
            name=name,
            description=f"Template for {category} reviews",
            category=category,
            template_text=template_text,
            min_rating=min_rating,
            max_rating=max_rating,
            is_active=True,
            platforms=[ReviewPlatform.GOOGLE, ReviewPlatform.YELP]
        )

    @staticmethod
    def create_review_response(
        review_id: int,
        response_text: str = "Thank you for your feedback!",
        status: ReviewResponseStatus = ReviewResponseStatus.SENT
    ) -> ReviewResponse:
        """Create a test review response"""
        return ReviewResponse(
            review_id=review_id,
            response_text=response_text,
            status=status,
            sent_at=datetime.utcnow() if status == ReviewResponseStatus.SENT else None,
            platform_response_id="platform_resp_123" if status == ReviewResponseStatus.SENT else None
        )


class TestMockResponses:
    """Mock API responses for various services"""

    @staticmethod
    def get_default_scopes(integration_type: IntegrationType) -> List[str]:
        """Get default OAuth scopes for integration type"""
        scope_map = {
            IntegrationType.GOOGLE_CALENDAR: [
                "https://www.googleapis.com/auth/calendar"
            ],
            IntegrationType.GOOGLE_MY_BUSINESS: [
                "https://www.googleapis.com/auth/business.manage"
            ],
            IntegrationType.STRIPE: [
                "read_write"
            ]
        }
        return scope_map.get(integration_type, [])

    @staticmethod
    def oauth_authorization_url_response(
        integration_type: str = "google_calendar",
        state: str = "test_state_123"
    ) -> Dict[str, str]:
        """Mock OAuth authorization URL response"""
        base_urls = {
            "google_calendar": "https://accounts.google.com/o/oauth2/v2/auth",
            "google_my_business": "https://accounts.google.com/o/oauth2/v2/auth",
            "stripe": "https://connect.stripe.com/oauth/authorize"
        }
        
        base_url = base_urls.get(integration_type, base_urls["google_calendar"])
        
        return {
            "authorization_url": f"{base_url}?client_id=test_client&state={state}&scope=test_scope",
            "state": state
        }

    @staticmethod
    def oauth_token_response(
        access_token: str = "access_token_123",
        refresh_token: str = "refresh_token_456",
        expires_in: int = 3600
    ) -> Dict[str, Any]:
        """Mock OAuth token exchange response"""
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "token_type": "Bearer",
            "scope": "https://www.googleapis.com/auth/calendar"
        }

    @staticmethod
    def oauth_token_refresh_response(
        access_token: str = "new_access_token_789",
        expires_in: int = 3600
    ) -> Dict[str, Any]:
        """Mock OAuth token refresh response"""
        return {
            "access_token": access_token,
            "expires_in": expires_in,
            "token_type": "Bearer"
        }

    @staticmethod
    def gmb_business_accounts_response() -> Dict[str, List[Dict[str, Any]]]:
        """Mock GMB business accounts response"""
        return {
            "accounts": [
                {
                    "name": "accounts/123456789",
                    "accountName": "Downtown Barbershop",
                    "type": "BUSINESS",
                    "role": "OWNER",
                    "state": {
                        "status": "VERIFIED"
                    }
                },
                {
                    "name": "accounts/987654321",
                    "accountName": "Uptown Hair Salon",
                    "type": "BUSINESS",
                    "role": "MANAGER",
                    "state": {
                        "status": "UNVERIFIED"
                    }
                }
            ]
        }

    @staticmethod
    def gmb_business_locations_response() -> Dict[str, List[Dict[str, Any]]]:
        """Mock GMB business locations response"""
        return {
            "locations": [
                {
                    "name": "accounts/123456789/locations/loc_abc123",
                    "title": "Downtown Barbershop",
                    "address": {
                        "addressLines": ["123 Main Street"],
                        "locality": "Downtown",
                        "administrativeArea": "NY",
                        "postalCode": "10001",
                        "countryCode": "US"
                    },
                    "phoneNumbers": {
                        "primaryPhone": "+1-555-123-4567"
                    },
                    "websiteUri": "https://downtownbarbershop.com",
                    "primaryCategory": {
                        "displayName": "Barber Shop",
                        "categoryId": "gcid:barber_shop"
                    },
                    "metadata": {
                        "canHaveBusinessCalls": True,
                        "canReceiveCustomerPosts": True,
                        "canHaveFoodMenus": False
                    }
                }
            ]
        }

    @staticmethod
    def gmb_reviews_response() -> Dict[str, List[Dict[str, Any]]]:
        """Mock GMB reviews response"""
        return {
            "reviews": [
                {
                    "name": "accounts/123456789/locations/loc_abc123/reviews/rev_positive_123",
                    "reviewId": "rev_positive_123",
                    "reviewer": {
                        "displayName": "John Smith",
                        "profilePhotoUrl": "https://lh3.googleusercontent.com/photo123"
                    },
                    "starRating": "FIVE",
                    "comment": "Excellent haircut! Very professional and clean shop. The barber was skilled and friendly. Highly recommend!",
                    "createTime": "2024-01-15T10:30:00Z",
                    "updateTime": "2024-01-15T10:30:00Z"
                },
                {
                    "name": "accounts/123456789/locations/loc_abc123/reviews/rev_negative_456",
                    "reviewId": "rev_negative_456",
                    "reviewer": {
                        "displayName": "Jane Doe",
                        "profilePhotoUrl": "https://lh3.googleusercontent.com/photo456"
                    },
                    "starRating": "TWO",
                    "comment": "Long wait time and expensive prices. The haircut was okay but not worth the cost.",
                    "createTime": "2024-01-10T14:45:00Z",
                    "updateTime": "2024-01-10T14:45:00Z"
                },
                {
                    "name": "accounts/123456789/locations/loc_abc123/reviews/rev_neutral_789",
                    "reviewId": "rev_neutral_789",
                    "reviewer": {
                        "displayName": "Bob Johnson"
                    },
                    "starRating": "THREE",
                    "comment": "Average service. Clean place but nothing special.",
                    "createTime": "2024-01-05T16:20:00Z",
                    "updateTime": "2024-01-05T16:20:00Z"
                }
            ]
        }

    @staticmethod
    def gmb_review_response_success() -> Dict[str, Any]:
        """Mock successful GMB review response"""
        return {
            "reply": {
                "comment": "Thank you for your wonderful review, John! We're thrilled you enjoyed your experience.",
                "updateTime": "2024-01-16T09:15:00Z"
            }
        }

    @staticmethod
    def stripe_account_response() -> Dict[str, Any]:
        """Mock Stripe account response"""
        return {
            "id": "acct_test123",
            "object": "account",
            "business_profile": {
                "name": "Downtown Barbershop",
                "url": "https://downtownbarbershop.com"
            },
            "country": "US",
            "default_currency": "usd",
            "details_submitted": True,
            "email": "owner@downtownbarbershop.com",
            "payouts_enabled": True,
            "charges_enabled": True
        }

    @staticmethod
    def integration_health_check_response(
        integration_id: int,
        healthy: bool = True,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """Mock integration health check response"""
        return {
            "integration_id": integration_id,
            "integration_type": "google_calendar",
            "name": "Test Integration",
            "status": "active" if healthy else "error",
            "healthy": healthy,
            "last_check": datetime.utcnow().isoformat(),
            "details": {
                "response_time": 0.25,
                "checked_at": datetime.utcnow().isoformat()
            },
            "error": error
        }

    @staticmethod
    def integration_health_summary_response(
        total: int = 3,
        healthy: int = 2,
        error: int = 1,
        inactive: int = 0
    ) -> Dict[str, Any]:
        """Mock integration health summary response"""
        integrations = []
        
        # Add healthy integrations
        for i in range(healthy):
            integrations.append(
                TestMockResponses.integration_health_check_response(
                    integration_id=i + 1,
                    healthy=True
                )
            )
        
        # Add error integrations
        for i in range(error):
            integrations.append(
                TestMockResponses.integration_health_check_response(
                    integration_id=healthy + i + 1,
                    healthy=False,
                    error="Connection timeout"
                )
            )
        
        return {
            "total_integrations": total,
            "healthy_count": healthy,
            "error_count": error,
            "inactive_count": inactive,
            "integrations": integrations,
            "checked_at": datetime.utcnow().isoformat()
        }

    @staticmethod
    def error_response(
        status_code: int = 400,
        message: str = "Bad Request",
        detail: str = "Invalid request parameters"
    ) -> Dict[str, Any]:
        """Mock error response"""
        return {
            "error": {
                "code": status_code,
                "message": message,
                "detail": detail
            }
        }


class MockAPIClient:
    """Mock API client for testing external services"""

    def __init__(self):
        self.requests = []
        self.responses = {}
        self.default_response = {"success": True}

    def set_response(self, endpoint: str, response: Dict[str, Any]):
        """Set mock response for specific endpoint"""
        self.responses[endpoint] = response

    def get_response(self, endpoint: str) -> Dict[str, Any]:
        """Get mock response for endpoint"""
        return self.responses.get(endpoint, self.default_response)

    def record_request(self, method: str, endpoint: str, data: Dict[str, Any] = None):
        """Record API request for verification"""
        self.requests.append({
            "method": method,
            "endpoint": endpoint,
            "data": data,
            "timestamp": datetime.utcnow()
        })

    def get_requests(self, endpoint: str = None) -> List[Dict[str, Any]]:
        """Get recorded requests, optionally filtered by endpoint"""
        if endpoint:
            return [req for req in self.requests if req["endpoint"] == endpoint]
        return self.requests

    def clear_requests(self):
        """Clear recorded requests"""
        self.requests = []


class MockIntegrationService:
    """Mock integration service for testing"""

    def __init__(self, integration_type: IntegrationType):
        self.integration_type = integration_type
        self.api_client = MockAPIClient()
        self.should_fail = False
        self.failure_message = "Service temporarily unavailable"

    def set_failure_mode(self, should_fail: bool, message: str = None):
        """Set service to fail for testing error scenarios"""
        self.should_fail = should_fail
        if message:
            self.failure_message = message

    async def test_connection(self, integration: Integration) -> Dict[str, Any]:
        """Mock connection test"""
        if self.should_fail:
            return {
                "healthy": False,
                "message": self.failure_message,
                "error": self.failure_message
            }
        
        return {
            "healthy": True,
            "message": "Connection successful",
            "details": {
                "response_time": 0.15,
                "test_timestamp": datetime.utcnow().isoformat()
            }
        }

    def generate_oauth_url(self, redirect_uri: str, state: str) -> str:
        """Mock OAuth URL generation"""
        base_urls = {
            IntegrationType.GOOGLE_CALENDAR: "https://accounts.google.com/o/oauth2/v2/auth",
            IntegrationType.GOOGLE_MY_BUSINESS: "https://accounts.google.com/o/oauth2/v2/auth",
            IntegrationType.STRIPE: "https://connect.stripe.com/oauth/authorize"
        }
        
        base_url = base_urls.get(self.integration_type, base_urls[IntegrationType.GOOGLE_CALENDAR])
        return f"{base_url}?client_id=test&redirect_uri={redirect_uri}&state={state}"

    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Mock token exchange"""
        if self.should_fail:
            raise Exception(self.failure_message)
        
        return TestMockResponses.oauth_token_response()

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Mock token refresh"""
        if self.should_fail:
            raise Exception(self.failure_message)
        
        return TestMockResponses.oauth_token_refresh_response()


class TestAssertions:
    """Helper methods for test assertions"""

    @staticmethod
    def assert_integration_created(integration: Integration, expected_type: IntegrationType):
        """Assert integration was created correctly"""
        assert integration.id is not None
        assert integration.integration_type == expected_type
        assert integration.created_at is not None
        assert integration.updated_at is not None

    @staticmethod
    def assert_oauth_integration_valid(integration: Integration):
        """Assert OAuth integration has required fields"""
        assert integration.access_token is not None
        assert integration.refresh_token is not None
        assert integration.token_expires_at is not None
        assert len(integration.scopes) > 0

    @staticmethod
    def assert_review_created(review: Review, expected_platform: ReviewPlatform):
        """Assert review was created correctly"""
        assert review.id is not None
        assert review.platform == expected_platform
        assert review.external_review_id is not None
        assert review.reviewer_name is not None
        assert 1.0 <= review.rating <= 5.0
        assert review.review_date is not None

    @staticmethod
    def assert_health_check_valid(health_check: Dict[str, Any]):
        """Assert health check response is valid"""
        assert "integration_id" in health_check
        assert "healthy" in health_check
        assert "last_check" in health_check
        assert isinstance(health_check["healthy"], bool)

    @staticmethod
    def assert_api_request_recorded(
        api_client: MockAPIClient,
        method: str,
        endpoint: str,
        data: Dict[str, Any] = None
    ):
        """Assert API request was recorded correctly"""
        requests = api_client.get_requests(endpoint)
        assert len(requests) > 0
        
        matching_requests = [
            req for req in requests
            if req["method"] == method and (data is None or req["data"] == data)
        ]
        assert len(matching_requests) > 0, f"No matching {method} request found for {endpoint}"

    @staticmethod
    def assert_integration_status(integration: Integration, expected_status: IntegrationStatus):
        """Assert integration has expected status"""
        assert integration.status == expected_status
        
        if expected_status == IntegrationStatus.ACTIVE:
            assert integration.last_error is None
        elif expected_status == IntegrationStatus.ERROR:
            assert integration.last_error is not None


# Test data constants
TEST_USER_EMAIL = "test@barbershop.com"
TEST_ADMIN_EMAIL = "admin@barbershop.com"
TEST_INTEGRATION_NAME = "Test Integration"
TEST_REVIEW_ID = "review_123"
TEST_OAUTH_STATE = "test_state_abc123"
TEST_OAUTH_CODE = "test_auth_code_456"

# Common test configurations
GOOGLE_CALENDAR_CONFIG = {
    "calendar_id": "primary",
    "sync_frequency": "realtime",
    "event_prefix": "BookedBarber:"
}

SENDGRID_CONFIG = {
    "from_email": "noreply@barbershop.com",
    "template_id": "d-abc123",
    "api_version": "v3"
}

STRIPE_CONFIG = {
    "webhook_endpoint": "/webhooks/stripe",
    "currency": "usd",
    "auto_payout": True
}

GMB_CONFIG = {
    "location_id": "accounts/123/locations/456",
    "auto_respond": True,
    "response_delay_hours": 2
}


def create_test_database_data(db_session, user_count: int = 2, integrations_per_user: int = 3):
    """Create comprehensive test data in database"""
    users = []
    integrations = []
    reviews = []
    
    # Create users
    for i in range(user_count):
        user = TestDataFactory.create_user(
            email=f"user{i}@barbershop.com",
            username=f"user{i}",
            full_name=f"Test User {i}"
        )
        db_session.add(user)
        users.append(user)
    
    db_session.commit()
    
    # Create integrations for each user
    integration_types = [
        IntegrationType.GOOGLE_CALENDAR,
        IntegrationType.GOOGLE_MY_BUSINESS,
        IntegrationType.SENDGRID,
        IntegrationType.STRIPE
    ]
    
    for user in users:
        for i in range(integrations_per_user):
            integration_type = integration_types[i % len(integration_types)]
            integration = TestDataFactory.create_integration(
                user_id=user.id,
                integration_type=integration_type,
                name=f"{user.username} {integration_type.value} Integration"
            )
            db_session.add(integration)
            integrations.append(integration)
    
    db_session.commit()
    
    # Create reviews for users
    for user in users:
        for i in range(5):  # 5 reviews per user
            review = TestDataFactory.create_review(
                user_id=user.id,
                external_review_id=f"review_{user.id}_{i}",
                reviewer_name=f"Customer {i}",
                rating=float(4 + (i % 2)),  # Alternate between 4 and 5 stars
                review_text=f"Review {i} for {user.full_name}"
            )
            db_session.add(review)
            reviews.append(review)
    
    db_session.commit()
    
    return {
        "users": users,
        "integrations": integrations,
        "reviews": reviews
    }