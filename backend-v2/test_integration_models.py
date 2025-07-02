#!/usr/bin/env python3
"""
Comprehensive test suite for integration models.
Tests database schemas, relationships, validation, and model methods.
"""

import pytest
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from database import Base
from models import User
from models.integration import Integration, IntegrationType, IntegrationStatus
from models.review import Review, ReviewResponse, ReviewTemplate, ReviewPlatform, ReviewSentiment, ReviewResponseStatus


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_models.db"
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
        email="modeltest@example.com",
        username="modeluser",
        full_name="Model Test User",
        hashed_password="$2b$12$test_hash"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def another_user(db_session):
    """Create another test user"""
    user = User(
        email="another@example.com",
        username="anotheruser",
        full_name="Another User",
        hashed_password="$2b$12$another_hash"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestIntegrationModel:
    """Test Integration model functionality"""

    def test_create_integration_basic(self, db_session, test_user, setup_database):
        """Test basic integration creation"""
        integration = Integration(
            user_id=test_user.id,
            name="Test Calendar Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.PENDING,
            is_active=True
        )
        
        db_session.add(integration)
        db_session.commit()
        db_session.refresh(integration)
        
        assert integration.id is not None
        assert integration.user_id == test_user.id
        assert integration.name == "Test Calendar Integration"
        assert integration.integration_type == IntegrationType.GOOGLE_CALENDAR
        assert integration.status == IntegrationStatus.PENDING
        assert integration.is_active is True
        assert integration.created_at is not None
        assert integration.updated_at is not None

    def test_create_integration_with_tokens(self, db_session, test_user, setup_database):
        """Test integration creation with OAuth tokens"""
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        integration = Integration(
            user_id=test_user.id,
            name="OAuth Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.ACTIVE,
            access_token="encrypted_access_token",
            refresh_token="encrypted_refresh_token",
            token_expires_at=expires_at,
            scopes=["https://www.googleapis.com/auth/business.manage"],
            is_active=True
        )
        
        db_session.add(integration)
        db_session.commit()
        db_session.refresh(integration)
        
        assert integration.access_token == "encrypted_access_token"
        assert integration.refresh_token == "encrypted_refresh_token"
        assert integration.token_expires_at == expires_at
        assert integration.scopes == ["https://www.googleapis.com/auth/business.manage"]

    def test_create_integration_with_config(self, db_session, test_user, setup_database):
        """Test integration creation with configuration"""
        config = {
            "api_endpoint": "https://api.example.com",
            "webhook_secret": "secret123",
            "custom_fields": ["field1", "field2"]
        }
        
        integration = Integration(
            user_id=test_user.id,
            name="Configured Integration",
            integration_type=IntegrationType.STRIPE,
            status=IntegrationStatus.ACTIVE,
            config=config,
            webhook_url="https://webhook.example.com/stripe",
            is_active=True
        )
        
        db_session.add(integration)
        db_session.commit()
        db_session.refresh(integration)
        
        assert integration.config == config
        assert integration.webhook_url == "https://webhook.example.com/stripe"

    def test_integration_user_relationship(self, db_session, test_user, setup_database):
        """Test integration-user relationship"""
        integration = Integration(
            user_id=test_user.id,
            name="Relationship Test",
            integration_type=IntegrationType.SENDGRID,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        
        db_session.add(integration)
        db_session.commit()
        
        # Test relationship access
        assert integration.user == test_user
        assert integration in test_user.integrations

    def test_integration_constraints(self, db_session, test_user, setup_database):
        """Test integration database constraints"""
        # Test required fields
        with pytest.raises(IntegrityError):
            integration = Integration(
                # Missing user_id (required)
                name="Invalid Integration",
                integration_type=IntegrationType.GOOGLE_CALENDAR,
                status=IntegrationStatus.ACTIVE,
                is_active=True
            )
            db_session.add(integration)
            db_session.commit()

    def test_integration_unique_constraints(self, db_session, test_user, setup_database):
        """Test integration uniqueness constraints"""
        # Create first integration
        integration1 = Integration(
            user_id=test_user.id,
            name="First Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        db_session.add(integration1)
        db_session.commit()
        
        # Can create another integration of same type for same user
        integration2 = Integration(
            user_id=test_user.id,
            name="Second Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        db_session.add(integration2)
        db_session.commit()
        
        # Both should exist
        integrations = db_session.query(Integration).filter_by(user_id=test_user.id).all()
        assert len(integrations) == 2

    def test_integration_token_expiration_methods(self, db_session, test_user, setup_database):
        """Test token expiration checking methods"""
        # Create integration with expired token
        expired_integration = Integration(
            user_id=test_user.id,
            name="Expired Token",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            access_token="expired_token",
            token_expires_at=datetime.utcnow() - timedelta(minutes=5),
            is_active=True
        )
        
        # Create integration with valid token
        valid_integration = Integration(
            user_id=test_user.id,
            name="Valid Token",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            access_token="valid_token",
            token_expires_at=datetime.utcnow() + timedelta(hours=1),
            is_active=True
        )
        
        # Create integration without expiration time
        no_expiry_integration = Integration(
            user_id=test_user.id,
            name="No Expiry",
            integration_type=IntegrationType.SENDGRID,
            status=IntegrationStatus.ACTIVE,
            api_key="api_key_123",
            is_active=True
        )
        
        db_session.add_all([expired_integration, valid_integration, no_expiry_integration])
        db_session.commit()
        
        # Test expiration checking
        assert expired_integration.is_token_expired() is True
        assert valid_integration.is_token_expired() is False
        assert no_expiry_integration.is_token_expired() is False

    def test_integration_status_methods(self, db_session, test_user, setup_database):
        """Test integration status management methods"""
        integration = Integration(
            user_id=test_user.id,
            name="Status Test",
            integration_type=IntegrationType.STRIPE,
            status=IntegrationStatus.PENDING,
            is_active=True
        )
        
        db_session.add(integration)
        db_session.commit()
        
        # Test status change methods
        integration.mark_active()
        assert integration.status == IntegrationStatus.ACTIVE
        assert integration.last_error is None
        assert integration.error_count == 0
        
        integration.mark_error("Connection failed")
        assert integration.status == IntegrationStatus.ERROR
        assert integration.last_error == "Connection failed"
        assert integration.error_count == 1
        
        # Test multiple errors
        integration.mark_error("Another error")
        assert integration.error_count == 2
        
        # Test clearing errors
        integration.mark_active()
        assert integration.status == IntegrationStatus.ACTIVE
        assert integration.last_error is None
        assert integration.error_count == 0

    def test_integration_health_check_methods(self, db_session, test_user, setup_database):
        """Test health check status tracking"""
        integration = Integration(
            user_id=test_user.id,
            name="Health Check Test",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        
        db_session.add(integration)
        db_session.commit()
        
        # Test health check update
        health_data = {
            "healthy": True,
            "response_time": 0.25,
            "checked_at": datetime.utcnow().isoformat()
        }
        
        integration.update_health_check(health_data)
        assert integration.health_check_data == health_data
        assert integration.last_health_check is not None

    def test_integration_json_serialization(self, db_session, test_user, setup_database):
        """Test JSON serialization of integration data"""
        config = {"setting1": "value1", "setting2": 42}
        scopes = ["scope1", "scope2"]
        
        integration = Integration(
            user_id=test_user.id,
            name="JSON Test",
            integration_type=IntegrationType.CUSTOM,
            status=IntegrationStatus.ACTIVE,
            config=config,
            scopes=scopes,
            is_active=True
        )
        
        db_session.add(integration)
        db_session.commit()
        db_session.refresh(integration)
        
        # Test that JSON fields are properly stored and retrieved
        assert integration.config == config
        assert integration.scopes == scopes
        assert isinstance(integration.config, dict)
        assert isinstance(integration.scopes, list)


class TestReviewModel:
    """Test Review model functionality"""

    def test_create_review_basic(self, db_session, test_user, setup_database):
        """Test basic review creation"""
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="review_123",
            reviewer_name="John Doe",
            rating=5.0,
            review_text="Excellent service!",
            review_date=datetime.utcnow(),
            sentiment=ReviewSentiment.POSITIVE,
            sentiment_score=0.8
        )
        
        db_session.add(review)
        db_session.commit()
        db_session.refresh(review)
        
        assert review.id is not None
        assert review.user_id == test_user.id
        assert review.platform == ReviewPlatform.GOOGLE
        assert review.external_review_id == "review_123"
        assert review.reviewer_name == "John Doe"
        assert review.rating == 5.0
        assert review.sentiment == ReviewSentiment.POSITIVE
        assert review.sentiment_score == 0.8

    def test_create_review_with_metadata(self, db_session, test_user, setup_database):
        """Test review creation with additional metadata"""
        platform_data = {
            "review_id": "gmb_123",
            "location_id": "loc_456",
            "response_url": "https://example.com/respond"
        }
        
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="review_456",
            business_id="business_123",
            reviewer_name="Jane Smith",
            reviewer_photo_url="https://example.com/photo.jpg",
            rating=4.0,
            review_text="Good service overall.",
            review_date=datetime.utcnow(),
            review_url="https://google.com/review/456",
            platform_data=platform_data,
            is_verified=True
        )
        
        db_session.add(review)
        db_session.commit()
        db_session.refresh(review)
        
        assert review.business_id == "business_123"
        assert review.reviewer_photo_url == "https://example.com/photo.jpg"
        assert review.review_url == "https://google.com/review/456"
        assert review.platform_data == platform_data
        assert review.is_verified is True

    def test_review_user_relationship(self, db_session, test_user, setup_database):
        """Test review-user relationship"""
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.YELP,
            external_review_id="yelp_789",
            reviewer_name="Bob Johnson",
            rating=3.0,
            review_text="Average experience.",
            review_date=datetime.utcnow()
        )
        
        db_session.add(review)
        db_session.commit()
        
        assert review.user == test_user
        assert review in test_user.reviews

    def test_review_constraints(self, db_session, test_user, setup_database):
        """Test review database constraints"""
        # Test rating bounds (should be between 1 and 5)
        with pytest.raises(Exception):  # SQLite might not enforce check constraints
            review = Review(
                user_id=test_user.id,
                platform=ReviewPlatform.GOOGLE,
                external_review_id="invalid_rating",
                reviewer_name="Test",
                rating=6.0,  # Invalid rating
                review_text="Test",
                review_date=datetime.utcnow()
            )
            db_session.add(review)
            db_session.commit()

    def test_review_sentiment_analysis_fields(self, db_session, test_user, setup_database):
        """Test sentiment analysis related fields"""
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="sentiment_test",
            reviewer_name="Sentiment Tester",
            rating=2.0,
            review_text="Poor service and long wait times.",
            review_date=datetime.utcnow(),
            sentiment=ReviewSentiment.NEGATIVE,
            sentiment_score=-0.6,
            sentiment_confidence=0.85,
            sentiment_keywords=["poor", "long wait"]
        )
        
        db_session.add(review)
        db_session.commit()
        db_session.refresh(review)
        
        assert review.sentiment == ReviewSentiment.NEGATIVE
        assert review.sentiment_score == -0.6
        assert review.sentiment_confidence == 0.85
        assert review.sentiment_keywords == ["poor", "long wait"]

    def test_review_unique_external_id(self, db_session, test_user, setup_database):
        """Test unique constraint on external review ID per platform"""
        # Create first review
        review1 = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="unique_id_123",
            reviewer_name="First Reviewer",
            rating=5.0,
            review_text="First review",
            review_date=datetime.utcnow()
        )
        db_session.add(review1)
        db_session.commit()
        
        # Try to create duplicate with same external_review_id and platform
        review2 = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,  # Same platform
            external_review_id="unique_id_123",  # Same external ID
            reviewer_name="Second Reviewer",
            rating=4.0,
            review_text="Duplicate review",
            review_date=datetime.utcnow()
        )
        
        with pytest.raises(IntegrityError):
            db_session.add(review2)
            db_session.commit()

    def test_review_different_platforms_same_id(self, db_session, test_user, setup_database):
        """Test that same external ID can exist on different platforms"""
        # Create review on Google
        google_review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="same_id_123",
            reviewer_name="Google Reviewer",
            rating=5.0,
            review_text="Google review",
            review_date=datetime.utcnow()
        )
        
        # Create review on Yelp with same external ID
        yelp_review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.YELP,
            external_review_id="same_id_123",  # Same ID but different platform
            reviewer_name="Yelp Reviewer",
            rating=4.0,
            review_text="Yelp review",
            review_date=datetime.utcnow()
        )
        
        db_session.add_all([google_review, yelp_review])
        db_session.commit()
        
        # Both should exist
        reviews = db_session.query(Review).filter_by(external_review_id="same_id_123").all()
        assert len(reviews) == 2


class TestReviewTemplateModel:
    """Test ReviewTemplate model functionality"""

    def test_create_review_template(self, db_session, test_user, setup_database):
        """Test review template creation"""
        template = ReviewTemplate(
            user_id=test_user.id,
            name="Positive Response Template",
            description="Template for positive reviews",
            category="positive",
            template_text="Thank you for your wonderful review, {reviewer_name}! We're thrilled you enjoyed your experience at {business_name}.",
            min_rating=4.0,
            max_rating=5.0,
            is_active=True
        )
        
        db_session.add(template)
        db_session.commit()
        db_session.refresh(template)
        
        assert template.id is not None
        assert template.user_id == test_user.id
        assert template.name == "Positive Response Template"
        assert template.category == "positive"
        assert "{reviewer_name}" in template.template_text
        assert template.min_rating == 4.0
        assert template.max_rating == 5.0
        assert template.is_active is True

    def test_template_applicability_rating_range(self, db_session, test_user, setup_database):
        """Test template applicability based on rating range"""
        template = ReviewTemplate(
            user_id=test_user.id,
            name="Mid-range Template",
            category="neutral",
            template_text="Thank you for your feedback.",
            min_rating=3.0,
            max_rating=4.0,
            is_active=True
        )
        
        db_session.add(template)
        db_session.commit()
        
        # Create reviews with different ratings
        high_rating_review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="high_rating",
            reviewer_name="Happy Customer",
            rating=5.0,
            review_text="Excellent!",
            review_date=datetime.utcnow()
        )
        
        mid_rating_review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="mid_rating",
            reviewer_name="Average Customer",
            rating=3.5,
            review_text="It was okay.",
            review_date=datetime.utcnow()
        )
        
        low_rating_review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="low_rating",
            reviewer_name="Unhappy Customer",
            rating=2.0,
            review_text="Not good.",
            review_date=datetime.utcnow()
        )
        
        # Test applicability
        assert not template.is_applicable_for_review(high_rating_review)  # Rating too high
        assert template.is_applicable_for_review(mid_rating_review)      # Rating in range
        assert not template.is_applicable_for_review(low_rating_review)  # Rating too low

    def test_template_text_generation(self, db_session, test_user, setup_database):
        """Test template text generation with placeholders"""
        template = ReviewTemplate(
            user_id=test_user.id,
            name="Custom Template",
            category="positive",
            template_text="Hi {reviewer_name}, thank you for the {rating}-star review of {business_name}! We appreciate your feedback about our {service_type}.",
            min_rating=4.0,
            max_rating=5.0,
            is_active=True
        )
        
        db_session.add(template)
        db_session.commit()
        
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="template_test",
            reviewer_name="John Smith",
            rating=5.0,
            review_text="Great haircut!",
            review_date=datetime.utcnow()
        )
        
        # Generate response text
        response_text = template.generate_response(
            review,
            business_name="Downtown Barbershop",
            service_type="barbering services"
        )
        
        assert "Hi John Smith" in response_text
        assert "5-star review" in response_text
        assert "Downtown Barbershop" in response_text
        assert "barbering services" in response_text

    def test_template_platform_filtering(self, db_session, test_user, setup_database):
        """Test template platform-specific filtering"""
        google_template = ReviewTemplate(
            user_id=test_user.id,
            name="Google Template",
            category="positive",
            template_text="Thank you for your Google review!",
            platforms=[ReviewPlatform.GOOGLE],
            is_active=True
        )
        
        universal_template = ReviewTemplate(
            user_id=test_user.id,
            name="Universal Template",
            category="positive",
            template_text="Thank you for your review!",
            # No platforms specified = applies to all
            is_active=True
        )
        
        db_session.add_all([google_template, universal_template])
        db_session.commit()
        
        google_review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="google_test",
            reviewer_name="Google User",
            rating=5.0,
            review_text="Great!",
            review_date=datetime.utcnow()
        )
        
        yelp_review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.YELP,
            external_review_id="yelp_test",
            reviewer_name="Yelp User",
            rating=5.0,
            review_text="Great!",
            review_date=datetime.utcnow()
        )
        
        # Google template should only apply to Google reviews
        assert google_template.is_applicable_for_review(google_review)
        assert not google_template.is_applicable_for_review(yelp_review)
        
        # Universal template should apply to all
        assert universal_template.is_applicable_for_review(google_review)
        assert universal_template.is_applicable_for_review(yelp_review)


class TestReviewResponseModel:
    """Test ReviewResponse model functionality"""

    def test_create_review_response(self, db_session, test_user, setup_database):
        """Test review response creation"""
        # Create a review first
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="response_test",
            reviewer_name="Customer",
            rating=4.0,
            review_text="Good service.",
            review_date=datetime.utcnow()
        )
        db_session.add(review)
        db_session.commit()
        
        # Create response
        response = ReviewResponse(
            review_id=review.id,
            response_text="Thank you for your feedback! We're glad you enjoyed our service.",
            status=ReviewResponseStatus.SENT,
            sent_at=datetime.utcnow(),
            platform_response_id="gmb_response_123"
        )
        
        db_session.add(response)
        db_session.commit()
        db_session.refresh(response)
        
        assert response.id is not None
        assert response.review_id == review.id
        assert response.status == ReviewResponseStatus.SENT
        assert response.sent_at is not None
        assert response.platform_response_id == "gmb_response_123"

    def test_review_response_relationship(self, db_session, test_user, setup_database):
        """Test review-response relationship"""
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="relationship_test",
            reviewer_name="Test User",
            rating=5.0,
            review_text="Great!",
            review_date=datetime.utcnow()
        )
        
        response = ReviewResponse(
            review=review,  # Use relationship
            response_text="Thank you!",
            status=ReviewResponseStatus.DRAFT
        )
        
        db_session.add_all([review, response])
        db_session.commit()
        
        # Test relationship access
        assert response.review == review
        assert review.response == response

    def test_review_response_status_transitions(self, db_session, test_user, setup_database):
        """Test review response status transitions"""
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="status_test",
            reviewer_name="Status Tester",
            rating=3.0,
            review_text="Okay service.",
            review_date=datetime.utcnow()
        )
        
        response = ReviewResponse(
            review=review,
            response_text="Thank you for your feedback.",
            status=ReviewResponseStatus.DRAFT
        )
        
        db_session.add_all([review, response])
        db_session.commit()
        
        # Test status changes
        assert response.status == ReviewResponseStatus.DRAFT
        
        response.status = ReviewResponseStatus.PENDING
        response.scheduled_at = datetime.utcnow() + timedelta(hours=1)
        db_session.commit()
        
        response.status = ReviewResponseStatus.SENT
        response.sent_at = datetime.utcnow()
        response.platform_response_id = "sent_123"
        db_session.commit()
        
        assert response.sent_at is not None
        assert response.platform_response_id == "sent_123"


class TestIntegrationModelQueries:
    """Test integration model query patterns"""

    def test_query_integrations_by_user(self, db_session, test_user, another_user, setup_database):
        """Test querying integrations by user"""
        # Create integrations for both users
        user1_integration = Integration(
            user_id=test_user.id,
            name="User 1 Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        
        user2_integration = Integration(
            user_id=another_user.id,
            name="User 2 Integration",
            integration_type=IntegrationType.STRIPE,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        
        db_session.add_all([user1_integration, user2_integration])
        db_session.commit()
        
        # Query integrations by user
        user1_integrations = db_session.query(Integration).filter_by(user_id=test_user.id).all()
        user2_integrations = db_session.query(Integration).filter_by(user_id=another_user.id).all()
        
        assert len(user1_integrations) == 1
        assert len(user2_integrations) == 1
        assert user1_integrations[0].name == "User 1 Integration"
        assert user2_integrations[0].name == "User 2 Integration"

    def test_query_integrations_by_type(self, db_session, test_user, setup_database):
        """Test querying integrations by type"""
        # Create multiple integrations of different types
        calendar_integration = Integration(
            user_id=test_user.id,
            name="Calendar Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        
        payment_integration = Integration(
            user_id=test_user.id,
            name="Payment Integration",
            integration_type=IntegrationType.STRIPE,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        
        db_session.add_all([calendar_integration, payment_integration])
        db_session.commit()
        
        # Query by type
        calendar_integrations = db_session.query(Integration).filter_by(
            user_id=test_user.id,
            integration_type=IntegrationType.GOOGLE_CALENDAR
        ).all()
        
        assert len(calendar_integrations) == 1
        assert calendar_integrations[0].name == "Calendar Integration"

    def test_query_active_integrations(self, db_session, test_user, setup_database):
        """Test querying only active integrations"""
        active_integration = Integration(
            user_id=test_user.id,
            name="Active Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            is_active=True
        )
        
        inactive_integration = Integration(
            user_id=test_user.id,
            name="Inactive Integration",
            integration_type=IntegrationType.STRIPE,
            status=IntegrationStatus.INACTIVE,
            is_active=False
        )
        
        db_session.add_all([active_integration, inactive_integration])
        db_session.commit()
        
        # Query only active integrations
        active_integrations = db_session.query(Integration).filter_by(
            user_id=test_user.id,
            is_active=True
        ).all()
        
        assert len(active_integrations) == 1
        assert active_integrations[0].name == "Active Integration"

    def test_query_expired_tokens(self, db_session, test_user, setup_database):
        """Test querying integrations with expired tokens"""
        expired_integration = Integration(
            user_id=test_user.id,
            name="Expired Integration",
            integration_type=IntegrationType.GOOGLE_CALENDAR,
            status=IntegrationStatus.ACTIVE,
            access_token="expired_token",
            token_expires_at=datetime.utcnow() - timedelta(hours=1),
            is_active=True
        )
        
        valid_integration = Integration(
            user_id=test_user.id,
            name="Valid Integration",
            integration_type=IntegrationType.STRIPE,
            status=IntegrationStatus.ACTIVE,
            access_token="valid_token",
            token_expires_at=datetime.utcnow() + timedelta(hours=1),
            is_active=True
        )
        
        db_session.add_all([expired_integration, valid_integration])
        db_session.commit()
        
        # Query expired tokens
        expired_integrations = db_session.query(Integration).filter(
            Integration.user_id == test_user.id,
            Integration.token_expires_at < datetime.utcnow()
        ).all()
        
        assert len(expired_integrations) == 1
        assert expired_integrations[0].name == "Expired Integration"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])