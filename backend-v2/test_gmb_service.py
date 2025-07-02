#!/usr/bin/env python3
"""
Comprehensive test suite for Google My Business (GMB) service.
Tests OAuth flows, API interactions, review management, and error handling with mocked APIs.
"""

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User
from models.integration import Integration, IntegrationType, IntegrationStatus
from models.review import Review, ReviewPlatform, ReviewSentiment
from services.gmb_service import GMBService
from schemas.review import GMBLocation, ReviewCreate
from fastapi import HTTPException


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_gmb.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def setup_database():
    """Setup test database"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user = User(
        email="test@barbershop.com",
        username="testbarber",
        full_name="Test Barber",
        hashed_password="$2b$12$test_hash"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def gmb_integration(db_session, test_user):
    """Create a test GMB integration"""
    integration = Integration(
        user_id=test_user.id,
        name="Test Barbershop GMB",
        integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
        status=IntegrationStatus.ACTIVE,
        access_token="encrypted_access_token",
        refresh_token="encrypted_refresh_token",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        scopes=["https://www.googleapis.com/auth/business.manage"],
        config={"location_id": "accounts/123/locations/456"},
        is_active=True
    )
    db_session.add(integration)
    db_session.commit()
    db_session.refresh(integration)
    return integration


@pytest.fixture
def expired_integration(db_session, test_user):
    """Create an integration with expired token"""
    integration = Integration(
        user_id=test_user.id,
        name="Expired GMB Integration",
        integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
        status=IntegrationStatus.EXPIRED,
        access_token="encrypted_expired_token",
        refresh_token="encrypted_refresh_token",
        token_expires_at=datetime.utcnow() - timedelta(hours=1),
        scopes=["https://www.googleapis.com/auth/business.manage"],
        is_active=True
    )
    db_session.add(integration)
    db_session.commit()
    db_session.refresh(integration)
    return integration


@pytest.fixture
def gmb_service():
    """Create GMB service instance"""
    with patch.dict('os.environ', {
        'GOOGLE_CLIENT_ID': 'test_client_id',
        'GOOGLE_CLIENT_SECRET': 'test_client_secret'
    }):
        return GMBService()


# Mock response data
MOCK_BUSINESS_ACCOUNTS = {
    "accounts": [
        {
            "name": "accounts/123",
            "accountName": "Test Barbershop",
            "type": "BUSINESS",
            "role": "OWNER"
        }
    ]
}

MOCK_BUSINESS_LOCATIONS = {
    "locations": [
        {
            "name": "accounts/123/locations/456",
            "title": "Downtown Barbershop",
            "address": {
                "addressLines": ["123 Main St"],
                "locality": "Downtown",
                "administrativeArea": "NY",
                "postalCode": "10001"
            },
            "phoneNumbers": {
                "primaryPhone": "+1-555-123-4567"
            },
            "websiteUri": "https://downtownbarbershop.com",
            "primaryCategory": {
                "displayName": "Barber Shop"
            },
            "metadata": {
                "canHaveBusinessCalls": True,
                "canReceiveCustomerPosts": True
            }
        }
    ]
}

MOCK_REVIEWS = {
    "reviews": [
        {
            "name": "accounts/123/locations/456/reviews/review123",
            "reviewId": "review123",
            "reviewer": {
                "displayName": "John Smith",
                "profilePhotoUrl": "https://example.com/photo.jpg"
            },
            "starRating": "FIVE",
            "comment": "Great haircut! Very professional and clean shop.",
            "createTime": "2024-01-15T10:30:00Z",
            "updateTime": "2024-01-15T10:30:00Z"
        },
        {
            "name": "accounts/123/locations/456/reviews/review456",
            "reviewId": "review456",
            "reviewer": {
                "displayName": "Jane Doe"
            },
            "starRating": "TWO",
            "comment": "Long wait time and expensive prices.",
            "createTime": "2024-01-10T14:45:00Z",
            "updateTime": "2024-01-10T14:45:00Z"
        }
    ]
}

MOCK_TOKEN_RESPONSE = {
    "access_token": "new_access_token_123",
    "refresh_token": "new_refresh_token_456",
    "expires_in": 3600,
    "token_type": "Bearer",
    "scope": "https://www.googleapis.com/auth/business.manage"
}


class TestGMBOAuth:
    """Test GMB OAuth flow functionality"""

    def test_get_oauth_url_success(self, gmb_service):
        """Test OAuth URL generation"""
        redirect_uri = "http://localhost:3000/integrations/callback"
        state = "test_state_123"
        
        oauth_url = gmb_service.get_oauth_url(redirect_uri, state)
        
        assert "accounts.google.com/o/oauth2/v2/auth" in oauth_url
        assert "client_id=test_client_id" in oauth_url
        assert f"redirect_uri={redirect_uri}" in oauth_url
        assert f"state={state}" in oauth_url
        assert "business.manage" in oauth_url
        assert "access_type=offline" in oauth_url

    def test_get_oauth_url_no_credentials(self):
        """Test OAuth URL generation without credentials"""
        service = GMBService()  # No env vars set
        
        with pytest.raises(HTTPException) as exc_info:
            service.get_oauth_url("http://localhost:3000/callback")
        
        assert exc_info.value.status_code == 500
        assert "OAuth not configured" in str(exc_info.value.detail)

    @patch('httpx.AsyncClient.post')
    async def test_exchange_code_for_tokens_success(self, mock_post, gmb_service):
        """Test successful token exchange"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_TOKEN_RESPONSE
        mock_post.return_value = mock_response
        
        result = await gmb_service.exchange_code_for_tokens(
            "test_auth_code",
            "http://localhost:3000/callback"
        )
        
        assert result == MOCK_TOKEN_RESPONSE
        mock_post.assert_called_once()

    @patch('httpx.AsyncClient.post')
    async def test_exchange_code_for_tokens_failure(self, mock_post, gmb_service):
        """Test failed token exchange"""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Invalid authorization code"
        mock_post.return_value = mock_response
        
        with pytest.raises(HTTPException) as exc_info:
            await gmb_service.exchange_code_for_tokens(
                "invalid_code",
                "http://localhost:3000/callback"
            )
        
        assert exc_info.value.status_code == 400
        assert "Failed to exchange code" in str(exc_info.value.detail)

    @patch('httpx.AsyncClient.post')
    async def test_refresh_access_token_success(self, mock_post, gmb_service):
        """Test successful token refresh"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "refreshed_token",
            "expires_in": 3600
        }
        mock_post.return_value = mock_response
        
        result = await gmb_service.refresh_access_token("test_refresh_token")
        
        assert result["access_token"] == "refreshed_token"
        mock_post.assert_called_once()

    @patch('httpx.AsyncClient.post')
    async def test_refresh_access_token_failure(self, mock_post, gmb_service):
        """Test failed token refresh"""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Invalid refresh token"
        mock_post.return_value = mock_response
        
        with pytest.raises(HTTPException) as exc_info:
            await gmb_service.refresh_access_token("invalid_refresh_token")
        
        assert exc_info.value.status_code == 400
        assert "Failed to refresh token" in str(exc_info.value.detail)


class TestGMBTokenManagement:
    """Test token management and authentication"""

    @patch('utils.encryption.decrypt_text')
    async def test_get_access_token_valid(self, mock_decrypt, gmb_service, gmb_integration):
        """Test getting valid access token"""
        mock_decrypt.return_value = "decrypted_access_token"
        
        token = await gmb_service.get_access_token(gmb_integration)
        
        assert token == "decrypted_access_token"
        mock_decrypt.assert_called_once()

    @patch('utils.encryption.decrypt_text')
    @patch.object(GMBService, 'refresh_access_token')
    @patch('utils.encryption.encrypt_text')
    async def test_get_access_token_expired_refresh_success(
        self, mock_encrypt, mock_refresh, mock_decrypt, gmb_service, expired_integration
    ):
        """Test getting token when expired but refresh succeeds"""
        mock_decrypt.return_value = "old_refresh_token"
        mock_refresh.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600
        }
        mock_encrypt.side_effect = ["encrypted_new_access", "encrypted_new_refresh"]
        
        token = await gmb_service.get_access_token(expired_integration)
        
        assert token == "new_access_token"
        mock_refresh.assert_called_once_with("old_refresh_token")
        assert expired_integration.status == IntegrationStatus.ACTIVE

    async def test_get_access_token_no_token(self, gmb_service, db_session, test_user):
        """Test getting token when none exists"""
        integration = Integration(
            user_id=test_user.id,
            name="No Token Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.PENDING,
            is_active=True
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await gmb_service.get_access_token(integration)
        
        assert exc_info.value.status_code == 400
        assert "No access token available" in str(exc_info.value.detail)

    @patch('utils.encryption.decrypt_text')
    async def test_get_authenticated_client(self, mock_decrypt, gmb_service, gmb_integration):
        """Test creating authenticated HTTP client"""
        mock_decrypt.return_value = "test_access_token"
        
        async with await gmb_service.get_authenticated_client(gmb_integration) as client:
            assert isinstance(client, httpx.AsyncClient)
            assert client.headers["Authorization"] == "Bearer test_access_token"
            assert client.headers["Content-Type"] == "application/json"


class TestGMBBusinessData:
    """Test GMB business accounts and locations"""

    @patch.object(GMBService, 'get_authenticated_client')
    async def test_get_business_accounts_success(self, mock_client, gmb_service, gmb_integration):
        """Test successful business accounts retrieval"""
        mock_http_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_BUSINESS_ACCOUNTS
        mock_http_client.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        accounts = await gmb_service.get_business_accounts(gmb_integration)
        
        assert len(accounts) == 1
        assert accounts[0]["accountName"] == "Test Barbershop"
        assert accounts[0]["type"] == "BUSINESS"

    @patch.object(GMBService, 'get_authenticated_client')
    async def test_get_business_accounts_api_error(self, mock_client, gmb_service, gmb_integration):
        """Test business accounts retrieval with API error"""
        mock_http_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.text = "Insufficient permissions"
        mock_http_client.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        accounts = await gmb_service.get_business_accounts(gmb_integration)
        
        assert accounts == []

    @patch.object(GMBService, 'get_business_accounts')
    @patch.object(GMBService, 'get_authenticated_client')
    async def test_get_business_locations_success(self, mock_client, mock_accounts, gmb_service, gmb_integration):
        """Test successful business locations retrieval"""
        mock_accounts.return_value = [{"name": "accounts/123"}]
        
        mock_http_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_BUSINESS_LOCATIONS
        mock_http_client.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        locations = await gmb_service.get_business_locations(gmb_integration)
        
        assert len(locations) == 1
        assert isinstance(locations[0], GMBLocation)
        assert locations[0].name == "Downtown Barbershop"
        assert locations[0].address == "123 Main St, Downtown, NY, 10001"
        assert locations[0].phone == "+1-555-123-4567"
        assert locations[0].category == "Barber Shop"

    @patch.object(GMBService, 'get_business_accounts')
    async def test_get_business_locations_no_accounts(self, mock_accounts, gmb_service, gmb_integration):
        """Test locations retrieval when no accounts found"""
        mock_accounts.return_value = []
        
        with pytest.raises(HTTPException) as exc_info:
            await gmb_service.get_business_locations(gmb_integration)
        
        assert exc_info.value.status_code == 404
        assert "No business accounts found" in str(exc_info.value.detail)


class TestGMBReviews:
    """Test GMB review management functionality"""

    @patch.object(GMBService, 'get_authenticated_client')
    async def test_get_location_reviews_success(self, mock_client, gmb_service, gmb_integration):
        """Test successful review retrieval"""
        mock_http_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_REVIEWS
        mock_http_client.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        reviews = await gmb_service.get_location_reviews(gmb_integration, "456")
        
        assert len(reviews) == 2
        assert reviews[0]["reviewId"] == "review123"
        assert reviews[0]["starRating"] == "FIVE"
        assert reviews[1]["reviewId"] == "review456"
        assert reviews[1]["starRating"] == "TWO"

    @patch.object(GMBService, 'get_authenticated_client')
    async def test_get_location_reviews_insufficient_permissions(self, mock_client, gmb_service, gmb_integration):
        """Test review retrieval with insufficient permissions"""
        mock_http_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.text = "Insufficient permissions to access reviews"
        mock_http_client.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        reviews = await gmb_service.get_location_reviews(gmb_integration, "456")
        
        assert reviews == []

    @patch.object(GMBService, 'get_authenticated_client')
    async def test_respond_to_review_success(self, mock_client, gmb_service, gmb_integration):
        """Test successful review response"""
        mock_http_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"reply": {"comment": "Thank you for your feedback!"}}
        mock_http_client.put.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        result = await gmb_service.respond_to_review(
            gmb_integration,
            "456",
            "review123",
            "Thank you for your feedback!"
        )
        
        assert "reply" in result
        assert result["reply"]["comment"] == "Thank you for your feedback!"

    @patch.object(GMBService, 'get_authenticated_client')
    async def test_respond_to_review_failure(self, mock_client, gmb_service, gmb_integration):
        """Test failed review response"""
        mock_http_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Review already has a response"
        mock_http_client.put.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        with pytest.raises(HTTPException) as exc_info:
            await gmb_service.respond_to_review(
                gmb_integration,
                "456",
                "review123",
                "Thank you!"
            )
        
        assert exc_info.value.status_code == 400
        assert "Failed to respond to review" in str(exc_info.value.detail)


class TestGMBReviewSync:
    """Test review synchronization functionality"""

    @patch.object(GMBService, 'get_location_reviews')
    async def test_sync_reviews_for_location_success(self, mock_get_reviews, gmb_service, gmb_integration, db_session, setup_database):
        """Test successful review synchronization"""
        mock_get_reviews.return_value = MOCK_REVIEWS["reviews"]
        
        new_count, updated_count, errors = await gmb_service.sync_reviews_for_location(
            db_session,
            gmb_integration,
            "456"
        )
        
        assert new_count == 2
        assert updated_count == 0
        assert errors == []
        
        # Verify reviews were created in database
        reviews = db_session.query(Review).filter_by(user_id=gmb_integration.user_id).all()
        assert len(reviews) == 2
        
        # Check first review
        positive_review = next(r for r in reviews if r.external_review_id == "review123")
        assert positive_review.rating == 5.0
        assert positive_review.reviewer_name == "John Smith"
        assert positive_review.sentiment == ReviewSentiment.POSITIVE
        assert positive_review.platform == ReviewPlatform.GOOGLE
        
        # Check second review
        negative_review = next(r for r in reviews if r.external_review_id == "review456")
        assert negative_review.rating == 2.0
        assert negative_review.reviewer_name == "Jane Doe"
        assert negative_review.sentiment == ReviewSentiment.NEGATIVE

    @patch.object(GMBService, 'get_location_reviews')
    async def test_sync_reviews_update_existing(self, mock_get_reviews, gmb_service, gmb_integration, db_session, setup_database):
        """Test updating existing reviews during sync"""
        # Create existing review
        existing_review = Review(
            user_id=gmb_integration.user_id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="review123",
            reviewer_name="John Smith",
            rating=4.0,  # Different rating
            review_text="Old review text",
            review_date=datetime.utcnow(),
            sentiment=ReviewSentiment.NEUTRAL
        )
        db_session.add(existing_review)
        db_session.commit()
        
        mock_get_reviews.return_value = MOCK_REVIEWS["reviews"]
        
        new_count, updated_count, errors = await gmb_service.sync_reviews_for_location(
            db_session,
            gmb_integration,
            "456"
        )
        
        assert new_count == 1  # Only the second review is new
        assert updated_count == 1  # First review was updated
        assert errors == []
        
        # Verify existing review was updated
        db_session.refresh(existing_review)
        assert existing_review.rating == 5.0
        assert existing_review.sentiment == ReviewSentiment.POSITIVE
        assert "Great haircut" in existing_review.review_text

    @patch.object(GMBService, 'get_location_reviews')
    async def test_sync_reviews_with_errors(self, mock_get_reviews, gmb_service, gmb_integration, db_session, setup_database):
        """Test review sync with some errors"""
        # Mock reviews with one malformed entry
        malformed_reviews = [
            MOCK_REVIEWS["reviews"][0],  # Valid review
            {"invalid": "review_data"}   # Invalid review
        ]
        mock_get_reviews.return_value = malformed_reviews
        
        new_count, updated_count, errors = await gmb_service.sync_reviews_for_location(
            db_session,
            gmb_integration,
            "456"
        )
        
        assert new_count == 1  # Only valid review processed
        assert updated_count == 0
        assert len(errors) == 1
        assert "Failed to process review" in errors[0]

    @patch.object(GMBService, 'get_location_reviews')
    async def test_sync_reviews_api_failure(self, mock_get_reviews, gmb_service, gmb_integration, db_session, setup_database):
        """Test review sync when API call fails"""
        mock_get_reviews.side_effect = HTTPException(status_code=403, detail="API access denied")
        
        with pytest.raises(HTTPException) as exc_info:
            await gmb_service.sync_reviews_for_location(
                db_session,
                gmb_integration,
                "456"
            )
        
        assert exc_info.value.status_code == 500
        assert "Failed to sync reviews" in str(exc_info.value.detail)


class TestGMBSentimentAnalysis:
    """Test sentiment analysis functionality"""

    def test_parse_gmb_review_positive(self, gmb_service):
        """Test parsing positive GMB review"""
        gmb_review = MOCK_REVIEWS["reviews"][0]
        
        parsed = gmb_service._parse_gmb_review(gmb_review, "456", 1)
        
        assert parsed["platform"] == ReviewPlatform.GOOGLE
        assert parsed["external_review_id"] == "review123"
        assert parsed["reviewer_name"] == "John Smith"
        assert parsed["rating"] == 5
        assert "Great haircut" in parsed["review_text"]
        assert parsed["is_verified"] is True

    def test_parse_gmb_review_negative(self, gmb_service):
        """Test parsing negative GMB review"""
        gmb_review = MOCK_REVIEWS["reviews"][1]
        
        parsed = gmb_service._parse_gmb_review(gmb_review, "456", 1)
        
        assert parsed["rating"] == 2
        assert "Long wait time" in parsed["review_text"]

    def test_analyze_review_sentiment_positive(self, gmb_service):
        """Test sentiment analysis for positive review"""
        review = Review(
            platform=ReviewPlatform.GOOGLE,
            external_review_id="test",
            reviewer_name="Test User",
            rating=5,
            review_text="Excellent service! Very professional and friendly staff. Highly recommend!",
            review_date=datetime.utcnow()
        )
        
        gmb_service._analyze_review_sentiment(review)
        
        assert review.sentiment == ReviewSentiment.POSITIVE
        assert review.sentiment_score > 0
        assert review.sentiment_confidence > 0
        assert any("excellent" in keyword.lower() for keyword in review.sentiment_keywords)

    def test_analyze_review_sentiment_negative(self, gmb_service):
        """Test sentiment analysis for negative review"""
        review = Review(
            platform=ReviewPlatform.GOOGLE,
            external_review_id="test",
            reviewer_name="Test User",
            rating=2,
            review_text="Terrible service. Rude staff and overpriced. Very disappointed.",
            review_date=datetime.utcnow()
        )
        
        gmb_service._analyze_review_sentiment(review)
        
        assert review.sentiment == ReviewSentiment.NEGATIVE
        assert review.sentiment_score < 0
        assert review.sentiment_confidence > 0
        assert any("terrible" in keyword.lower() for keyword in review.sentiment_keywords)

    def test_analyze_review_sentiment_neutral(self, gmb_service):
        """Test sentiment analysis for neutral review"""
        review = Review(
            platform=ReviewPlatform.GOOGLE,
            external_review_id="test",
            reviewer_name="Test User",
            rating=3,
            review_text="Average service. Nothing special but acceptable.",
            review_date=datetime.utcnow()
        )
        
        gmb_service._analyze_review_sentiment(review)
        
        assert review.sentiment == ReviewSentiment.NEUTRAL
        assert abs(review.sentiment_score) <= 0.1


class TestGMBConnectionTesting:
    """Test connection health checking"""

    @patch.object(GMBService, 'get_business_accounts')
    @patch.object(GMBService, 'get_business_locations')
    async def test_connection_healthy(self, mock_locations, mock_accounts, gmb_service, gmb_integration):
        """Test healthy connection test"""
        mock_accounts.return_value = [{"name": "accounts/123", "accountName": "Test Shop"}]
        mock_locations.return_value = [
            GMBLocation(
                location_id="456",
                name="Test Location",
                address="123 Main St",
                is_verified=True,
                is_published=True
            )
        ]
        
        result = await gmb_service.test_connection(gmb_integration)
        
        assert result["healthy"] is True
        assert "Connected successfully" in result["message"]
        assert result["accounts_count"] == 1
        assert result["locations_count"] == 1

    @patch.object(GMBService, 'get_business_accounts')
    async def test_connection_no_accounts(self, mock_accounts, gmb_service, gmb_integration):
        """Test connection test with no accounts"""
        mock_accounts.return_value = []
        
        result = await gmb_service.test_connection(gmb_integration)
        
        assert result["healthy"] is False
        assert "No business accounts found" in result["message"]
        assert result["accounts_count"] == 0

    @patch.object(GMBService, 'get_business_accounts')
    async def test_connection_api_error(self, mock_accounts, gmb_service, gmb_integration):
        """Test connection test with API error"""
        mock_accounts.side_effect = Exception("API connection failed")
        
        result = await gmb_service.test_connection(gmb_integration)
        
        assert result["healthy"] is False
        assert "Connection test failed" in result["message"]
        assert "API connection failed" in result["error"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])