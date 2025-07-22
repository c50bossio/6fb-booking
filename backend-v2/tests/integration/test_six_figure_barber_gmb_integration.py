"""
Integration tests for Six Figure Barber GMB automated response system.
Tests the complete flow from review to Six Figure Barber methodology-aligned response.
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from main import app
from models import User
from models.review import Review, ReviewPlatform, ReviewSentiment
from models.integration import Integration, IntegrationType
from services.review_service import ReviewService
from services.six_figure_barber_templates import SixFigureBarberTemplates
from services.business_context_service import BusinessContext
from database import get_db


client = TestClient(app)


class TestSixFigureBarberGMBIntegration:
    """Test Six Figure Barber GMB automated response system"""
    
    @pytest.fixture
    def db_session(self):
        """Get database session for testing"""
        return next(get_db())
    
    @pytest.fixture 
    def test_user(self, db_session: Session):
        """Create test user with premium barber profile"""
        user = User(
            email="premium.barber@6fb.com",
            username="sixfigurebarber",
            full_name="Premium Barber",
            hashed_password="test_password_hash",
            is_active=True,
            role="SHOP_OWNER",
            created_at=datetime.utcnow()
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def test_review(self, db_session: Session, test_user: User):
        """Create test review for Six Figure Barber methodology testing"""
        review = Review(
            user_id=test_user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id="test_gmb_review_123",
            business_id="test_business_location",
            reviewer_name="Professional Client",
            rating=5.0,
            review_text="Amazing precision haircut! The attention to detail and professional service exceeded my expectations. This investment in my appearance was absolutely worth it. The barber's expertise really shows in the final result.",
            review_date=datetime.utcnow(),
            sentiment=ReviewSentiment.POSITIVE,
            is_verified=True,
            can_respond=True,
            created_at=datetime.utcnow()
        )
        db_session.add(review)
        db_session.commit()
        db_session.refresh(review)
        return review
    
    @pytest.fixture
    def business_context(self):
        """Create business context for Six Figure Barber methodology"""
        return BusinessContext(
            business_name="Elite Barbering Studio",
            location_name="Downtown Elite Location",
            city="Beverly Hills", 
            state="CA",
            address="123 Rodeo Drive, Beverly Hills, CA 90210",
            phone="(310) 555-0123",
            specialty_services=[
                "Precision Styling", "Executive Grooming", "Beard Sculpting"
            ],
            barber_names=["Master Barber John", "Style Expert Mike"],
            total_barbers=3,
            years_established=8
        )
    
    def test_six_figure_barber_template_creation(self):
        """Test Six Figure Barber template service initialization"""
        six_fb_templates = SixFigureBarberTemplates()
        
        assert six_fb_templates is not None
        assert hasattr(six_fb_templates, 'methodology_themes')
        assert hasattr(six_fb_templates, 'service_positioning')
        
        # Test methodology themes
        assert 'premium_positioning' in six_fb_templates.methodology_themes
        assert 'client_value_focus' in six_fb_templates.methodology_themes  
        assert 'business_growth' in six_fb_templates.methodology_themes
        
        # Test service positioning
        assert 'haircut' in six_fb_templates.service_positioning
        assert six_fb_templates.service_positioning['haircut'] == "precision styling and image consulting"
    
    def test_six_figure_barber_positive_template_generation(self, business_context: BusinessContext):
        """Test Six Figure Barber positive review template generation"""
        six_fb_templates = SixFigureBarberTemplates()
        
        template = six_fb_templates.get_six_figure_barber_template(
            service_type="haircut",
            sentiment="positive", 
            context=business_context
        )
        
        assert template is not None
        assert len(template) > 50  # Ensure substantial content
        
        # Check for Six Figure Barber methodology elements
        template_lower = template.lower()
        
        # Check for premium positioning language
        premium_indicators = ["excellence", "artistry", "precision", "professional", "investment"]
        assert any(word in template_lower for word in premium_indicators)
        
        # Check for value-focused messaging  
        value_indicators = ["investment", "transformation", "confidence", "professional image"]
        assert any(word in template_lower for word in value_indicators)
        
        # Check for relationship building
        relationship_indicators = ["partnership", "relationship", "journey", "trusted", "community"]
        assert any(word in template_lower for word in relationship_indicators)
    
    def test_six_figure_barber_negative_template_recovery_focus(self, business_context: BusinessContext):
        """Test Six Figure Barber negative review templates focus on recovery"""
        six_fb_templates = SixFigureBarberTemplates()
        
        template = six_fb_templates.get_six_figure_barber_template(
            service_type="general", 
            sentiment="negative",
            context=business_context
        )
        
        assert template is not None
        template_lower = template.lower()
        
        # Check for recovery-focused messaging
        recovery_indicators = [
            "apologize", "make this right", "opportunity", "demonstrate", 
            "complimentary", "restore", "standards"
        ]
        assert any(word in template_lower for word in recovery_indicators)
        
        # Check for Six Figure Barber methodology references
        assert "six figure barber" in template_lower
        assert any(word in template_lower for word in ["excellence", "methodology", "standards"])
    
    def test_six_figure_barber_seo_keywords(self):
        """Test Six Figure Barber SEO keyword generation"""
        six_fb_templates = SixFigureBarberTemplates()
        
        # Test general keywords
        keywords = six_fb_templates.get_six_figure_barber_seo_keywords("general")
        assert len(keywords) >= 6
        assert "Six Figure Barber" in keywords
        assert "premium grooming" in keywords
        assert "professional styling" in keywords
        
        # Test service-specific keywords
        haircut_keywords = six_fb_templates.get_six_figure_barber_seo_keywords("haircut")
        assert "precision cutting" in haircut_keywords
        assert "style transformation" in haircut_keywords
    
    def test_six_figure_barber_template_validation(self):
        """Test Six Figure Barber template validation system"""
        six_fb_templates = SixFigureBarberTemplates()
        
        # Test compliant template
        compliant_template = """Thank you for the incredible 5-star review! At Elite Barbering, 
        we're committed to the Six Figure Barber methodology - delivering excellence that transforms 
        not just your appearance, but your confidence and professional presence. Every service we 
        provide is designed to be an investment in your success. We're honored to be your trusted 
        grooming partner and look forward to continuing our professional relationship!"""
        
        validation = six_fb_templates.validate_six_figure_barber_template(compliant_template)
        assert validation["compliant"] == True
        assert validation["score"] >= 30
        assert len(validation["issues"]) == 0
        
        # Test non-compliant template
        non_compliant = "Thanks for the review. We appreciate your feedback."
        
        validation = six_fb_templates.validate_six_figure_barber_template(non_compliant)
        assert validation["compliant"] == False
        assert validation["score"] < 30
        assert len(validation["issues"]) > 0
    
    def test_contextual_six_figure_barber_response_generation(
        self, 
        db_session: Session,
        test_review: Review,
        business_context: BusinessContext
    ):
        """Test contextual Six Figure Barber response generation"""
        review_service = ReviewService()
        
        # Mock business context service
        import unittest.mock
        with unittest.mock.patch('services.business_context_service.BusinessContextService.get_business_context') as mock_context:
            mock_context.return_value = business_context
            
            response = review_service.generate_contextual_response(test_review, db_session)
            
            assert response is not None
            assert len(response) > 100  # Ensure substantial response
            
            response_lower = response.lower()
            
            # Check for Six Figure Barber elements
            assert any(word in response_lower for word in ["excellence", "precision", "professional", "investment"])
            assert "elite barbering studio" in response_lower  # Business name
            assert "professional client" in response_lower  # Reviewer name
    
    def test_six_figure_barber_api_endpoint(
        self,
        db_session: Session, 
        test_user: User,
        test_review: Review
    ):
        """Test Six Figure Barber API endpoint for automated responses"""
        
        # Mock authentication
        import unittest.mock
        with unittest.mock.patch('utils.auth.get_current_user') as mock_user:
            mock_user.return_value = test_user
            
            # Mock business context
            with unittest.mock.patch('services.business_context_service.BusinessContextService.get_business_context') as mock_context:
                mock_context.return_value = BusinessContext(
                    business_name="Test Barber Shop",
                    city="Test City"
                )
                
                response = client.post(
                    f"/api/v1/reviews/auto-response/six-figure-barber?review_id={test_review.id}",
                    headers={"Authorization": "Bearer test_token"}
                )
                
                assert response.status_code == 200
                data = response.json()
                
                assert data["success"] == True
                assert "Six Figure Barber aligned response generated successfully" in data["message"]
                assert "response_text" in data
                assert "six_figure_barber_compliance" in data
                assert data["methodology"] == "Six Figure Barber Program"
    
    def test_six_figure_barber_template_api_endpoint(self, test_user: User):
        """Test Six Figure Barber template retrieval endpoint"""
        
        import unittest.mock
        with unittest.mock.patch('utils.auth.get_current_user') as mock_user:
            mock_user.return_value = test_user
            
            response = client.get(
                "/api/v1/reviews/templates/six-figure-barber?service_type=haircut",
                headers={"Authorization": "Bearer test_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] == True
            assert data["service_type"] == "haircut"
            assert "templates" in data
            assert "positive" in data["templates"]
            assert "negative" in data["templates"]
            assert "neutral" in data["templates"]
            assert "seo_keywords" in data
            assert data["methodology"] == "Six Figure Barber Program"
    
    def test_template_enhancement_with_business_context(
        self,
        test_review: Review,
        business_context: BusinessContext
    ):
        """Test template enhancement with Six Figure Barber business context"""
        six_fb_templates = SixFigureBarberTemplates()
        
        base_template = """Thank you for the {rating}-star review, {reviewer_name}! 
        At {business_name}, we believe every {service_type} is an investment in your success."""
        
        enhanced_template = six_fb_templates.enhance_template_with_six_figure_barber_context(
            base_template, business_context, test_review
        )
        
        assert enhanced_template != base_template  # Should be modified
        assert "precision styling and image consulting" in enhanced_template  # Service positioning
        assert len(enhanced_template) >= len(base_template)  # Should be enhanced
    
    def test_full_gmb_integration_flow_simulation(
        self,
        db_session: Session,
        test_user: User, 
        business_context: BusinessContext
    ):
        """Test complete GMB integration flow with Six Figure Barber responses"""
        
        # Simulate GMB review data
        gmb_review_data = {
            "name": "accounts/123/locations/456/reviews/test_review_789",
            "reviewer": {
                "displayName": "Executive Client",
                "profilePhotoUrl": "https://example.com/photo.jpg"
            },
            "starRating": "FIVE",
            "comment": "Outstanding precision cut for my corporate presentation. The investment in professional grooming shows in my confidence and executive presence.",
            "createTime": "2024-01-15T10:30:00Z"
        }
        
        # Test GMB service review parsing
        from services.gmb_service import GMBService
        gmb_service = GMBService()
        
        parsed_data = gmb_service._parse_gmb_review(
            gmb_review_data, "test_location", test_user.id
        )
        
        assert parsed_data["platform"] == ReviewPlatform.GOOGLE
        assert parsed_data["rating"] == 5
        assert parsed_data["reviewer_name"] == "Executive Client"
        
        # Create review from parsed data
        review = Review(user_id=test_user.id, **parsed_data)
        review.can_respond = True
        db_session.add(review)
        db_session.commit()
        
        # Generate Six Figure Barber response
        review_service = ReviewService()
        
        with unittest.mock.patch('services.business_context_service.BusinessContextService.get_business_context') as mock_context:
            mock_context.return_value = business_context
            
            response_text = review_service.generate_contextual_response(review, db_session)
            
            # Validate Six Figure Barber methodology compliance
            six_fb_templates = SixFigureBarberTemplates()
            validation = six_fb_templates.validate_six_figure_barber_template(response_text)
            
            assert validation["compliant"] == True
            assert validation["score"] >= 30
            assert "executive client" in response_text.lower()
            assert "elite barbering studio" in response_text.lower()
            assert any(word in response_text.lower() for word in ["investment", "professional", "excellence"])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])