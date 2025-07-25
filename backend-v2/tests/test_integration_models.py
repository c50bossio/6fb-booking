"""
Tests for integration-related database models
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models.integration import Integration, IntegrationType, IntegrationStatus
from models.review import Review, ReviewStatus, ReviewSource
from models import User


class TestIntegrationModel:
    """Test Integration model functionality"""
    
    def test_create_integration(self, db: Session, test_user: User):
        """Test creating a new integration"""
        integration = Integration(
            user_id=test_user.id,
            name="Test GMB Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.PENDING,
            config={"business_id": "test_123"}
        )
        
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        assert integration.id is not None
        assert integration.user_id == test_user.id
        assert integration.name == "Test GMB Integration"
        assert integration.integration_type == IntegrationType.GOOGLE_MY_BUSINESS
        assert integration.status == IntegrationStatus.PENDING
        assert integration.config["business_id"] == "test_123"
        assert integration.created_at is not None
        assert integration.updated_at is not None
    
    def test_integration_relationships(self, db: Session, test_user: User):
        """Test integration relationships with user"""
        integration = Integration(
            user_id=test_user.id,
            name="Test Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.ACTIVE
        )
        
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        # Test relationship with user
        assert integration.user == test_user
        assert integration in test_user.integrations
    
    def test_integration_encrypted_fields(self, db: Session, test_user: User):
        """Test that sensitive fields are handled properly"""
        integration = Integration(
            user_id=test_user.id,
            name="Test Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.ACTIVE,
            access_token="sensitive_access_token",
            refresh_token="sensitive_refresh_token",
            api_key="sensitive_api_key",
            api_secret="sensitive_api_secret"
        )
        
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        # Values should be accessible (encryption/decryption handled by SQLAlchemy)
        assert integration.access_token == "sensitive_access_token"
        assert integration.refresh_token == "sensitive_refresh_token"
        assert integration.api_key == "sensitive_api_key"
        assert integration.api_secret == "sensitive_api_secret"
    
    def test_integration_status_updates(self, db: Session, test_user: User):
        """Test integration status management"""
        integration = Integration(
            user_id=test_user.id,
            name="Test Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.PENDING
        )
        
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        # Test status updates
        integration.status = IntegrationStatus.ACTIVE
        db.commit()
        db.refresh(integration)
        assert integration.status == IntegrationStatus.ACTIVE
        
        # Test error marking
        integration.mark_error("Test error message")
        db.commit()
        db.refresh(integration)
        assert integration.status == IntegrationStatus.ERROR
        assert integration.last_error == "Test error message"
        assert integration.error_count == 1
    
    def test_integration_health_check_updates(self, db: Session, test_user: User):
        """Test health check data updates"""
        integration = Integration(
            user_id=test_user.id,
            name="Test Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.ACTIVE
        )
        
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        # Test health check update
        health_data = {
            "healthy": True,
            "checked_at": datetime.utcnow().isoformat(),
            "response_time": 0.5
        }
        
        integration.update_health_check(health_data)
        db.commit()
        db.refresh(integration)
        
        assert integration.health_check_data == health_data
        assert integration.last_health_check is not None
    
    def test_integration_token_expiration(self, db: Session, test_user: User):
        """Test token expiration handling"""
        future_time = datetime.utcnow() + timedelta(hours=1)
        
        integration = Integration(
            user_id=test_user.id,
            name="Test Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.ACTIVE,
            access_token="test_token",
            token_expires_at=future_time
        )
        
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        assert integration.token_expires_at == future_time
        # Token should not be expired yet
        assert integration.token_expires_at > datetime.utcnow()


class TestReviewModel:
    """Test Review model functionality"""
    
    def test_create_review(self, db: Session, test_user: User):
        """Test creating a new review"""
        review = Review(
            user_id=test_user.id,
            reviewer_name="John Doe",
            rating=5,
            comment="Great service!",
            source=ReviewSource.GOOGLE_MY_BUSINESS,
            external_id="review_123",
            status=ReviewStatus.PENDING_RESPONSE
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        assert review.id is not None
        assert review.user_id == test_user.id
        assert review.reviewer_name == "John Doe"
        assert review.rating == 5
        assert review.comment == "Great service!"
        assert review.source == ReviewSource.GOOGLE_MY_BUSINESS
        assert review.external_id == "review_123"
        assert review.status == ReviewStatus.PENDING_RESPONSE
        assert review.created_at is not None
    
    def test_review_relationships(self, db: Session, test_user: User):
        """Test review relationships"""
        review = Review(
            user_id=test_user.id,
            reviewer_name="Jane Doe",
            rating=4,
            comment="Good experience",
            source=ReviewSource.GOOGLE_MY_BUSINESS,
            external_id="review_456"
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        # Test relationship with user
        assert review.user == test_user
        assert review in test_user.reviews
    
    def test_review_response_handling(self, db: Session, test_user: User):
        """Test review response functionality"""
        review = Review(
            user_id=test_user.id,
            reviewer_name="Bob Smith",
            rating=3,
            comment="Average service",
            source=ReviewSource.GOOGLE_MY_BUSINESS,
            external_id="review_789",
            status=ReviewStatus.PENDING_RESPONSE
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        # Add response
        review.response_text = "Thank you for your feedback!"
        review.response_date = datetime.utcnow()
        review.status = ReviewStatus.RESPONDED
        
        db.commit()
        db.refresh(review)
        
        assert review.response_text == "Thank you for your feedback!"
        assert review.response_date is not None
        assert review.status == ReviewStatus.RESPONDED
    
    def test_review_sentiment_analysis(self, db: Session, test_user: User):
        """Test review sentiment analysis fields"""
        review = Review(
            user_id=test_user.id,
            reviewer_name="Alice Johnson",
            rating=5,
            comment="Absolutely amazing service! Best barber in town!",
            source=ReviewSource.GOOGLE_MY_BUSINESS,
            external_id="review_positive",
            sentiment_score=0.95,
            sentiment_label="positive"
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        assert review.sentiment_score == 0.95
        assert review.sentiment_label == "positive"
    
    def test_review_auto_response_flag(self, db: Session, test_user: User):
        """Test auto-response functionality flag"""
        review = Review(
            user_id=test_user.id,
            reviewer_name="Chris Wilson",
            rating=4,
            comment="Good job!",
            source=ReviewSource.GOOGLE_MY_BUSINESS,
            external_id="review_auto",
            auto_response_sent=True
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        assert review.auto_response_sent is True
    
    def test_review_integration_link(self, db: Session, test_user: User):
        """Test linking reviews to integrations"""
        # Create integration
        integration = Integration(
            user_id=test_user.id,
            name="GMB Integration",
            integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
            status=IntegrationStatus.ACTIVE
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        # Create review linked to integration
        review = Review(
            user_id=test_user.id,
            integration_id=integration.id,
            reviewer_name="David Brown",
            rating=5,
            comment="Excellent work!",
            source=ReviewSource.GOOGLE_MY_BUSINESS,
            external_id="review_linked"
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        assert review.integration_id == integration.id
        assert review.integration == integration


class TestIntegrationEnums:
    """Test integration enum types"""
    
    def test_integration_type_enum(self):
        """Test IntegrationType enum values"""
        assert IntegrationType.GOOGLE_MY_BUSINESS.value == "google_my_business"
        assert IntegrationType.GOOGLE_CALENDAR.value == "google_calendar"
        assert IntegrationType.STRIPE.value == "stripe"
        assert IntegrationType.EMAIL_MARKETING.value == "email_marketing"
        assert IntegrationType.SMS_MARKETING.value == "sms_marketing"
    
    def test_integration_status_enum(self):
        """Test IntegrationStatus enum values"""
        assert IntegrationStatus.PENDING.value == "pending"
        assert IntegrationStatus.ACTIVE.value == "active"
        assert IntegrationStatus.ERROR.value == "error"
        assert IntegrationStatus.SUSPENDED.value == "suspended"
    
    def test_review_source_enum(self):
        """Test ReviewSource enum values"""
        assert ReviewSource.GOOGLE_MY_BUSINESS.value == "google_my_business"
        assert ReviewSource.YELP.value == "yelp"
        assert ReviewSource.FACEBOOK.value == "facebook"
        assert ReviewSource.MANUAL.value == "manual"
    
    def test_review_status_enum(self):
        """Test ReviewStatus enum values"""
        assert ReviewStatus.NEW.value == "new"
        assert ReviewStatus.PENDING_RESPONSE.value == "pending_response"
        assert ReviewStatus.RESPONDED.value == "responded"
        assert ReviewStatus.IGNORED.value == "ignored"