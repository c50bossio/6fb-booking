#!/usr/bin/env python3
"""
Test script to verify the review system setup.
Tests model creation, schema validation, and basic functionality.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models.review import Review, ReviewResponse, ReviewTemplate, ReviewPlatform, ReviewSentiment, ReviewResponseStatus
from schemas.review import ReviewCreate, ReviewTemplateCreate
from datetime import datetime

def test_model_creation():
    """Test that review models can be created"""
    print("Testing review model creation...")
    
    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    try:
        # Test creating a review
        review_data = {
            "platform": ReviewPlatform.GOOGLE,
            "external_review_id": "test123",
            "reviewer_name": "John Doe",
            "rating": 5.0,
            "review_text": "Great haircut! Very professional service.",
            "review_date": datetime.utcnow()
        }
        
        review = Review(
            user_id=1,
            **review_data
        )
        
        db.add(review)
        db.commit()
        
        # Test querying the review
        saved_review = db.query(Review).filter(Review.external_review_id == "test123").first()
        assert saved_review is not None
        assert saved_review.rating == 5.0
        assert saved_review.sentiment == ReviewSentiment.UNKNOWN  # Default value
        
        # Test creating a template
        template = ReviewTemplate(
            user_id=1,
            name="Positive Response Template",
            description="Template for positive reviews",
            category="positive",
            template_text="Thank you for your amazing review, {reviewer_name}! We're thrilled you enjoyed your experience at {business_name}.",
            min_rating=4.0,
            max_rating=5.0
        )
        
        db.add(template)
        db.commit()
        
        # Test template functionality
        assert template.is_applicable_for_review(saved_review) == True
        response_text = template.generate_response(saved_review, "BookedBarber")
        assert "Thank you for your amazing review, John Doe!" in response_text
        assert "BookedBarber" in response_text
        
        print("✓ Review models created and tested successfully")
        
    except Exception as e:
        print(f"✗ Error testing models: {str(e)}")
        raise
    finally:
        db.close()

def test_schema_validation():
    """Test that review schemas work correctly"""
    print("Testing review schema validation...")
    
    try:
        from schemas.review import ReviewCreate, ReviewTemplateCreate
        
        # Test ReviewCreate schema
        review_data = {
            "platform": ReviewPlatform.GOOGLE,
            "external_review_id": "test123",
            "reviewer_name": "John Doe",
            "rating": 5.0,
            "review_text": "Great service!",
            "review_date": datetime.now()
        }
        
        review_create = ReviewCreate(**review_data)
        assert review_create.platform == ReviewPlatform.GOOGLE
        assert review_create.rating == 5.0
        
        # Test ReviewTemplateCreate schema
        template_data = {
            "name": "Test Template",
            "category": "positive",
            "template_text": "Thank you {reviewer_name}!",
            "min_rating": 4.0,
            "max_rating": 5.0
        }
        
        template_create = ReviewTemplateCreate(**template_data)
        assert template_create.category == "positive"
        assert template_create.min_rating == 4.0
        
        print("✓ Schema validation passed")
        
    except Exception as e:
        print(f"✗ Error testing schemas: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def test_service_imports():
    """Test that services can be imported"""
    print("Testing service imports...")
    
    try:
        from services.review_service import ReviewService
        from services.gmb_service import GMBService
        
        review_service = ReviewService()
        gmb_service = GMBService()
        
        assert review_service is not None
        assert gmb_service is not None
        
        # Test that service has expected methods
        assert hasattr(review_service, 'get_reviews')
        assert hasattr(review_service, 'generate_auto_response')
        assert hasattr(gmb_service, 'get_oauth_url')
        
        print("✓ Services imported successfully")
        
    except Exception as e:
        print(f"✗ Error importing services: {str(e)}")
        raise

def test_router_imports():
    """Test that the router can be imported"""
    print("Testing router imports...")
    
    try:
        from routers.reviews import router
        
        assert router is not None
        print("✓ Router imported successfully")
        
    except Exception as e:
        print(f"✗ Error importing router: {str(e)}")
        raise

def main():
    print("=== BookedBarber Review System Setup Test ===\n")
    
    try:
        test_model_creation()
        test_schema_validation()
        test_service_imports()
        test_router_imports()
        
        print("\n=== All Tests Passed! ===")
        print("✓ Review models are working")
        print("✓ Schema validation is working")
        print("✓ Services are importable")
        print("✓ Router is importable")
        print("\nThe review system is ready for use!")
        
    except Exception as e:
        print(f"\n=== Test Failed ===")
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()