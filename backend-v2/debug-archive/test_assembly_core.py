#!/usr/bin/env python3
"""
Core functionality test for Dynamic Content Assembly System.
"""

import sys
import os
from datetime import datetime

# Add backend-v2 to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, ServiceCategoryEnum
from models.review import Review, ReviewPlatform, ReviewSentiment, ReviewResponseStatus
from services.dynamic_content_assembly import DynamicContentAssemblyService
from services.business_context_service import BusinessContext


def test_assembly_core_functionality():
    """Test core assembly functionality with existing user"""
    print("🧪 Testing Dynamic Content Assembly System Core Functionality")
    
    db = SessionLocal()
    try:
        # Create a fresh test user for this test
        user = User(
            email=f"test_{int(datetime.now().timestamp())}@barbershop.com",
            name="Test Barber",
            role="barber",
            phone="+1234567890",
            hashed_password="test_hash",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ Using test user: {user.email}")
        
        # Create a test review
        review = Review(
            user_id=user.id,
            platform=ReviewPlatform.GOOGLE,
            external_review_id=f"test_{int(datetime.now().timestamp())}",
            reviewer_name="John Smith",
            rating=5.0,
            review_text="Excellent haircut! Very professional service and great attention to detail.",
            sentiment=ReviewSentiment.POSITIVE,
            review_date=datetime.now(),
            response_status=ReviewResponseStatus.PENDING,
            is_verified=True,
            is_flagged=False
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        
        print(f"✅ Created test review: {review.id}")
        
        # Initialize assembly service
        print("🔧 Initializing Dynamic Content Assembly Service...")
        assembly_service = DynamicContentAssemblyService(db)
        print("✅ Assembly service initialized successfully")
        
        # Test business context extraction
        print("🔍 Testing business context extraction...")
        business_context = assembly_service.business_context_service.get_business_context(user.id)
        print(f"✅ Business context: {business_context.business_name}")
        
        # Test keyword analysis
        print("🔤 Testing keyword analysis...")
        keyword_analysis = assembly_service.keyword_service.analyze_review_for_keywords(
            review=review,
            business_context=business_context
        )
        print(f"✅ Keywords extracted: {keyword_analysis.extracted_keywords[:5]}")
        
        # Test complete assembly
        print("🚀 Testing complete response assembly...")
        assembled_response = assembly_service.assemble_complete_response(review, db)
        
        print("\n" + "="*80)
        print("📝 ASSEMBLED RESPONSE RESULTS:")
        print("="*80)
        print(f"Final Response: {assembled_response.final_response}")
        print(f"Character Count: {assembled_response.character_count}")
        print(f"Word Count: {assembled_response.word_count}")
        print(f"Processing Time: {assembled_response.processing_time:.2f}s")
        print(f"Quality Level: {assembled_response.quality_report.quality_level.value}")
        print(f"Overall Score: {assembled_response.quality_report.overall_score:.2f}")
        print(f"SEO Score: {assembled_response.quality_report.seo_score:.2f}")
        print(f"Optimizations Applied: {assembled_response.optimization_applied}")
        print(f"Fallbacks Used: {assembled_response.fallbacks_used}")
        print("="*80)
        
        # Validate response quality
        assert assembled_response.final_response is not None
        assert len(assembled_response.final_response) > 0
        assert assembled_response.quality_report.overall_score >= 0.0
        assert assembled_response.processing_time > 0
        
        print("✅ All core functionality tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Core functionality test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_security_validation():
    """Test security validation"""
    print("\n🛡️  Testing Security Validation...")
    
    db = SessionLocal()
    try:
        assembly_service = DynamicContentAssemblyService(db)
        
        # Test malicious content
        malicious_content = """
        Thank you for your review! <script>alert('xss')</script>
        Please visit our website at javascript:alert('evil')
        """
        
        # Validate security
        is_secure = assembly_service._validate_security(malicious_content)
        print(f"Security validation result: {is_secure}")
        
        # Test sanitization
        sanitized = assembly_service._sanitize_response(malicious_content)
        print(f"Original: {malicious_content.strip()}")
        print(f"Sanitized: {sanitized}")
        
        assert '<script>' not in sanitized
        assert 'javascript:' not in sanitized.lower()
        
        print("✅ Security validation passed!")
        return True
        
    except Exception as e:
        print(f"❌ Security test failed: {e}")
        return False
    finally:
        db.close()


def test_quality_validation():
    """Test quality validation"""
    print("\n📊 Testing Quality Validation...")
    
    db = SessionLocal()
    try:
        assembly_service = DynamicContentAssemblyService(db)
        
        # Create a business context for testing
        business_context = BusinessContext(
            business_name="Elite Barbershop",
            specialty_services=["haircut", "beard trim", "hot shave"],
            barber_names=["Master Barber"],
            total_barbers=1
        )
        
        # Test different quality responses
        test_responses = [
            {
                "content": "Thank you for your wonderful review! We're thrilled you enjoyed your experience at Elite Barbershop. Our professional team takes pride in delivering exceptional barbering services. We look forward to seeing you again!",
                "expected_quality": "good"
            },
            {
                "content": "Thanks.",
                "expected_quality": "poor"
            },
            {
                "content": "Thank you for your review! We appreciate your feedback about your experience at Elite Barbershop. Our skilled barbers are committed to providing professional haircut and grooming services that exceed expectations. We'd love to welcome you back soon for another exceptional barbering experience!",
                "expected_quality": "excellent"
            }
        ]
        
        for i, test_case in enumerate(test_responses):
            print(f"\nTest Case {i+1}: {test_case['expected_quality'].title()} Quality")
            
            quality_report = assembly_service.validate_content_quality(
                test_case["content"], 
                business_context
            )
            
            print(f"Content: {test_case['content'][:50]}...")
            print(f"Overall Score: {quality_report.overall_score:.2f}")
            print(f"Quality Level: {quality_report.quality_level.value}")
            print(f"SEO Score: {quality_report.seo_score:.2f}")
            print(f"Readability Score: {quality_report.readability_score:.2f}")
            print(f"Length Appropriate: {quality_report.length_appropriateness}")
            
            if quality_report.content_issues:
                print(f"Issues: {quality_report.content_issues}")
            
            if quality_report.recommendations:
                print(f"Recommendations: {quality_report.recommendations}")
        
        print("✅ Quality validation tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ Quality validation test failed: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("Dynamic Content Assembly System - Core Functionality Test")
    print("BookedBarber V2 - Marketing Enhancement Validation")
    print("="*80)
    
    tests = [
        test_assembly_core_functionality,
        test_security_validation,
        test_quality_validation
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
                print("✅ PASSED")
            else:
                failed += 1
                print("❌ FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ FAILED: {e}")
        
        print("-" * 40)
    
    print("="*80)
    print(f"🏁 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All core tests passed! Dynamic Content Assembly System is working!")
    else:
        print("⚠️  Some tests failed. Please review the issues.")
    
    exit(0 if failed == 0 else 1)