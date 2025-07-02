#!/usr/bin/env python3
"""
Debug script to find schema validation issues.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import traceback

def test_schema_validation():
    """Test that review schemas work correctly"""
    print("Testing review schema validation...")
    
    try:
        from schemas.review import ReviewCreate, ReviewTemplateCreate
        from models.review import ReviewPlatform
        from datetime import datetime
        
        print("Imported schemas successfully")
        
        # Test ReviewCreate schema
        review_data = {
            "platform": ReviewPlatform.GOOGLE,
            "external_review_id": "test123",
            "reviewer_name": "John Doe",
            "rating": 5.0,
            "review_text": "Great service!",
            "review_date": datetime.now()
        }
        
        print("Creating ReviewCreate instance...")
        review_create = ReviewCreate(**review_data)
        print(f"✓ ReviewCreate: {review_create}")
        
        # Test ReviewTemplateCreate schema
        template_data = {
            "name": "Test Template",
            "category": "positive",
            "template_text": "Thank you {reviewer_name}!",
            "min_rating": 4.0,
            "max_rating": 5.0
        }
        
        print("Creating ReviewTemplateCreate instance...")
        template_create = ReviewTemplateCreate(**template_data)
        print(f"✓ ReviewTemplateCreate: {template_create}")
        
        print("✓ Schema validation passed")
        
    except Exception as e:
        print(f"✗ Error testing schemas: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        raise

if __name__ == "__main__":
    test_schema_validation()