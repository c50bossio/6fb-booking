#!/usr/bin/env python3
"""
Integration test for Dynamic Content Assembly System.
Tests the complete orchestration of all AI services for review response generation.
"""

import sys
import os
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any

# Add backend-v2 to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, Service
from models.review import Review, ReviewPlatform, ReviewSentiment, ReviewResponseStatus
from models.integration import Integration, IntegrationType
from services.dynamic_content_assembly import (
    DynamicContentAssemblyService, 
    QualityLevel,
    AssembledResponse
)
from services.business_context_service import BusinessContext
from utils.sanitization import sanitize_input


def create_test_user(db: Session, test_id: str = None) -> User:
    """Create a test user for the integration test"""
    if test_id is None:
        test_id = str(int(datetime.now().timestamp() * 1000))
    
    user = User(
        email=f"test_{test_id}@barbershop.com",
        name="Test Barber",
        role="barber",
        phone="+1234567890",
        hashed_password="test_hash",  # Required field
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_test_review(db: Session, user_id: int, review_data: Dict[str, Any]) -> Review:
    """Create a test review"""
    review = Review(
        user_id=user_id,
        platform=review_data.get('platform', ReviewPlatform.GOOGLE),
        external_review_id=f"test_review_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        reviewer_name=review_data.get('reviewer_name', 'John Doe'),
        rating=review_data.get('rating', 5.0),
        review_text=review_data.get('review_text', 'Great service!'),
        sentiment=review_data.get('sentiment', ReviewSentiment.POSITIVE),
        review_date=datetime.now(),
        response_status=ReviewResponseStatus.PENDING,
        is_verified=True,
        is_flagged=False
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def create_test_services(db: Session, user_id: int) -> None:
    """Create test services for the barbershop"""
    from models import ServiceCategoryEnum
    
    services = [
        {
            "name": "Classic Haircut",
            "description": "Traditional men's haircut with scissors and clippers",
            "base_price": 25.00,
            "duration": 30,
            "category": ServiceCategoryEnum.HAIRCUT
        },
        {
            "name": "Beard Trim",
            "description": "Professional beard trimming and grooming",
            "base_price": 15.00,
            "duration": 15,
            "category": ServiceCategoryEnum.BEARD
        },
        {
            "name": "Hot Shave",
            "description": "Traditional hot towel shave with straight razor",
            "base_price": 35.00,
            "duration": 45,
            "category": ServiceCategoryEnum.SHAVE
        }
    ]
    
    for service_data in services:
        service = Service(
            name=service_data["name"],
            description=service_data["description"],
            base_price=service_data["base_price"],
            duration=service_data["duration"],
            category=service_data["category"],
            is_active=True,
            is_bookable_online=True
        )
        db.add(service)
    
    db.commit()


async def test_assembly_service_initialization():
    """Test 1: Service Initialization"""
    print("🧪 Test 1: Dynamic Content Assembly Service Initialization")
    
    db = SessionLocal()
    try:
        assembly_service = DynamicContentAssemblyService(db)
        
        # Verify all AI services are initialized
        assert assembly_service.business_context_service is not None
        assert assembly_service.keyword_service is not None
        assert assembly_service.seo_service is not None
        assert assembly_service.review_service is not None
        
        print("✅ All AI services initialized successfully")
        
        # Test analytics initialization
        analytics = assembly_service.get_assembly_analytics()
        assert analytics is not None
        assert analytics.performance_metrics is not None
        
        print("✅ Analytics system initialized successfully")
        
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        raise
    finally:
        db.close()


async def test_positive_review_assembly():
    """Test 2: Complete Assembly for Positive Review"""
    print("\n🧪 Test 2: Complete Assembly for Positive Review")
    
    db = SessionLocal()
    try:
        # Setup test data
        user = create_test_user(db, f"test_{datetime.now().timestamp()}")
        create_test_services(db, user.id)
        
        review_data = {
            'platform': ReviewPlatform.GOOGLE,
            'reviewer_name': 'Michael Smith',
            'rating': 5.0,
            'review_text': 'Amazing haircut! The barber was incredibly skilled and professional. Best barbershop in town!',
            'sentiment': ReviewSentiment.POSITIVE
        }
        
        review = create_test_review(db, user.id, review_data)
        
        # Initialize assembly service
        assembly_service = DynamicContentAssemblyService(db)
        
        # Test complete assembly
        assembled_response = assembly_service.assemble_complete_response(review, db)
        
        # Validate response structure
        assert isinstance(assembled_response, AssembledResponse)
        assert assembled_response.final_response is not None
        assert len(assembled_response.final_response) > 0
        assert assembled_response.quality_report is not None
        assert assembled_response.processing_time > 0
        
        print(f"✅ Generated Response ({assembled_response.character_count} chars, {assembled_response.word_count} words):")
        print(f"   📝 {assembled_response.final_response}")
        print(f"   📊 Quality Score: {assembled_response.quality_report.overall_score:.2f} ({assembled_response.quality_report.quality_level.value})")
        print(f"   ⚡ Processing Time: {assembled_response.processing_time:.2f}s")
        print(f"   🔧 Optimizations Applied: {assembled_response.optimization_applied}")
        
        # Validate quality metrics
        assert assembled_response.quality_report.overall_score >= 0.0
        assert assembled_response.quality_report.overall_score <= 1.0
        
        # Validate SEO optimization
        response_lower = assembled_response.final_response.lower()
        assert any(keyword in response_lower for keyword in ['barber', 'barbershop', 'professional'])
        
        print("✅ Positive review assembly completed successfully")
        
    except Exception as e:
        print(f"❌ Positive review assembly failed: {e}")
        raise
    finally:
        db.close()


async def test_negative_review_assembly():
    """Test 3: Complete Assembly for Negative Review"""
    print("\n🧪 Test 3: Complete Assembly for Negative Review")
    
    db = SessionLocal()
    try:
        # Setup test data
        user = create_test_user(db)
        create_test_services(db, user.id)
        
        review_data = {
            'platform': ReviewPlatform.YELP,
            'reviewer_name': 'Sarah Johnson',
            'rating': 2.0,
            'review_text': 'Very disappointed with the service. Had to wait too long and the haircut was not what I asked for.',
            'sentiment': ReviewSentiment.NEGATIVE
        }
        
        review = create_test_review(db, user.id, review_data)
        
        # Initialize assembly service
        assembly_service = DynamicContentAssemblyService(db)
        
        # Test complete assembly
        assembled_response = assembly_service.assemble_complete_response(review, db)
        
        print(f"✅ Generated Response ({assembled_response.character_count} chars):")
        print(f"   📝 {assembled_response.final_response}")
        print(f"   📊 Quality Score: {assembled_response.quality_report.overall_score:.2f}")
        
        # Validate appropriate tone for negative reviews
        response_lower = assembled_response.final_response.lower()
        assert any(phrase in response_lower for phrase in ['sorry', 'apologize', 'improve'])
        assert 'contact' in response_lower or 'reach out' in response_lower
        
        print("✅ Negative review assembly with appropriate tone")
        
    except Exception as e:
        print(f"❌ Negative review assembly failed: {e}")
        raise
    finally:
        db.close()


async def test_security_validation():
    """Test 4: Security Validation and Injection Prevention"""
    print("\n🧪 Test 4: Security Validation and Injection Prevention")
    
    db = SessionLocal()
    try:
        user = create_test_user(db)
        
        # Test malicious review content
        review_data = {
            'platform': ReviewPlatform.GOOGLE,
            'reviewer_name': '<script>alert("xss")</script>',
            'rating': 3.0,
            'review_text': 'Regular review but with <iframe src="evil.com"></iframe> embedded content',
            'sentiment': ReviewSentiment.NEUTRAL
        }
        
        review = create_test_review(db, user.id, review_data)
        
        assembly_service = DynamicContentAssemblyService(db)
        assembled_response = assembly_service.assemble_complete_response(review, db)
        
        # Verify no dangerous content in response
        response = assembled_response.final_response
        assert '<script>' not in response
        assert '<iframe>' not in response
        assert 'javascript:' not in response.lower()
        
        print("✅ Security validation passed - no dangerous content in response")
        print("✅ Injection prevention working correctly")
        
    except Exception as e:
        print(f"❌ Security validation failed: {e}")
        raise
    finally:
        db.close()


async def test_fallback_mechanisms():
    """Test 5: Fallback Mechanisms and Error Handling"""
    print("\n🧪 Test 5: Fallback Mechanisms and Error Handling")
    
    db = SessionLocal()
    try:
        user = create_test_user(db)
        
        # Test with minimal review data to trigger fallbacks
        review_data = {
            'platform': ReviewPlatform.OTHER,
            'reviewer_name': None,
            'rating': 4.0,
            'review_text': None,  # Empty review text to test fallbacks
            'sentiment': ReviewSentiment.UNKNOWN
        }
        
        review = create_test_review(db, user.id, review_data)
        
        assembly_service = DynamicContentAssemblyService(db)
        assembled_response = assembly_service.assemble_complete_response(review, db)
        
        # Should still generate a response despite missing data
        assert assembled_response.final_response is not None
        assert len(assembled_response.final_response) > 0
        
        # Check if fallbacks were used
        assert len(assembled_response.fallbacks_used) > 0
        
        print(f"✅ Fallback response generated: {assembled_response.final_response}")
        print(f"✅ Fallbacks used: {assembled_response.fallbacks_used}")
        
    except Exception as e:
        print(f"❌ Fallback mechanism test failed: {e}")
        raise
    finally:
        db.close()


async def test_quality_optimization():
    """Test 6: Quality Optimization Pipeline"""
    print("\n🧪 Test 6: Quality Optimization Pipeline")
    
    db = SessionLocal()
    try:
        user = create_test_user(db)
        create_test_services(db, user.id)
        
        review_data = {
            'platform': ReviewPlatform.GOOGLE,
            'reviewer_name': 'Professional Reviewer',
            'rating': 5.0,
            'review_text': 'Exceptional service, highly skilled barber, professional atmosphere, would definitely recommend to others.',
            'sentiment': ReviewSentiment.POSITIVE
        }
        
        review = create_test_review(db, user.id, review_data)
        
        assembly_service = DynamicContentAssemblyService(db)
        
        # Test quality optimization pipeline
        business_context = assembly_service.business_context_service.get_business_context(user.id)
        optimized_response = assembly_service.optimize_response_pipeline(
            review, 
            business_context, 
            target_quality=QualityLevel.EXCELLENT
        )
        
        assert optimized_response is not None
        assert len(optimized_response) > 0
        
        print(f"✅ Quality optimized response: {optimized_response}")
        
        # Test quality validation
        quality_report = assembly_service.validate_content_quality(optimized_response, business_context)
        
        print(f"📊 Quality Report:")
        print(f"   Overall Score: {quality_report.overall_score:.2f}")
        print(f"   SEO Score: {quality_report.seo_score:.2f}")
        print(f"   Readability Score: {quality_report.readability_score:.2f}")
        print(f"   Authenticity Score: {quality_report.authenticity_score:.2f}")
        print(f"   Quality Level: {quality_report.quality_level.value}")
        
        if quality_report.recommendations:
            print(f"   Recommendations: {quality_report.recommendations}")
        
    except Exception as e:
        print(f"❌ Quality optimization test failed: {e}")
        raise
    finally:
        db.close()


async def test_performance_metrics():
    """Test 7: Performance Metrics and Analytics"""
    print("\n🧪 Test 7: Performance Metrics and Analytics")
    
    db = SessionLocal()
    try:
        user = create_test_user(db)
        assembly_service = DynamicContentAssemblyService(db)
        
        # Process multiple reviews to generate metrics
        test_reviews = [
            {'rating': 5.0, 'text': 'Excellent service!', 'sentiment': ReviewSentiment.POSITIVE},
            {'rating': 4.0, 'text': 'Good haircut, professional staff.', 'sentiment': ReviewSentiment.POSITIVE},
            {'rating': 2.0, 'text': 'Not satisfied with the service.', 'sentiment': ReviewSentiment.NEGATIVE},
        ]
        
        for i, review_data in enumerate(test_reviews):
            review = create_test_review(db, user.id, {
                'platform': ReviewPlatform.GOOGLE,
                'reviewer_name': f'Test User {i+1}',
                'rating': review_data['rating'],
                'review_text': review_data['text'],
                'sentiment': review_data['sentiment']
            })
            
            assembled_response = assembly_service.assemble_complete_response(review, db)
            print(f"✅ Processed review {i+1}: {assembled_response.processing_time:.2f}s")
        
        # Get analytics
        analytics = assembly_service.get_assembly_analytics()
        
        print(f"\n📊 Assembly Analytics:")
        print(f"   Total Requests: {analytics.performance_metrics.total_requests}")
        print(f"   Successful Assemblies: {analytics.performance_metrics.successful_assemblies}")
        print(f"   Failed Assemblies: {analytics.performance_metrics.failed_assemblies}")
        print(f"   Average Response Time: {analytics.performance_metrics.average_response_time:.2f}s")
        print(f"   Quality Distribution: {analytics.performance_metrics.quality_distribution}")
        print(f"   Service Health: {analytics.service_health}")
        
    except Exception as e:
        print(f"❌ Performance metrics test failed: {e}")
        raise
    finally:
        db.close()


async def test_custom_context_and_keywords():
    """Test 8: Custom Context and Priority Keywords"""
    print("\n🧪 Test 8: Custom Context and Priority Keywords")
    
    db = SessionLocal()
    try:
        user = create_test_user(db)
        
        review_data = {
            'platform': ReviewPlatform.GOOGLE,
            'reviewer_name': 'VIP Customer',
            'rating': 5.0,
            'review_text': 'Amazing experience with the premium service package!',
            'sentiment': ReviewSentiment.POSITIVE
        }
        
        review = create_test_review(db, user.id, review_data)
        
        assembly_service = DynamicContentAssemblyService(db)
        
        # Test with custom context and priority keywords
        custom_context = {
            'business_name': 'Elite Barber Lounge',
            'specialty_services': ['Premium Grooming', 'Executive Styling', 'VIP Treatment']
        }
        
        priority_keywords = ['premium', 'luxury', 'executive', 'elite']
        
        assembled_response = assembly_service.assemble_complete_response(
            review, 
            db, 
            custom_context=custom_context,
            priority_keywords=priority_keywords
        )
        
        # Verify custom elements are included
        response_lower = assembled_response.final_response.lower()
        assert 'elite barber lounge' in response_lower or 'elite' in response_lower
        assert any(keyword in response_lower for keyword in priority_keywords)
        
        print(f"✅ Custom context response: {assembled_response.final_response}")
        print(f"✅ Priority keywords integrated successfully")
        
    except Exception as e:
        print(f"❌ Custom context test failed: {e}")
        raise
    finally:
        db.close()


async def run_comprehensive_integration_test():
    """Run all integration tests"""
    print("🚀 Starting Dynamic Content Assembly System Integration Tests\n")
    print("=" * 80)
    
    tests = [
        test_assembly_service_initialization,
        test_positive_review_assembly,
        test_negative_review_assembly,
        test_security_validation,
        test_fallback_mechanisms,
        test_quality_optimization,
        test_performance_metrics,
        test_custom_context_and_keywords
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            await test()
            passed += 1
            print("✅ PASSED\n" + "-" * 40)
        except Exception as e:
            failed += 1
            print(f"❌ FAILED: {e}\n" + "-" * 40)
    
    print("=" * 80)
    print(f"🏁 Integration Test Results:")
    print(f"   ✅ Passed: {passed}")
    print(f"   ❌ Failed: {failed}")
    print(f"   📊 Success Rate: {(passed / (passed + failed)) * 100:.1f}%")
    
    if failed == 0:
        print("\n🎉 All tests passed! Dynamic Content Assembly System is working correctly!")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please review the errors above.")
        return False


if __name__ == "__main__":
    print("Dynamic Content Assembly System - Comprehensive Integration Test")
    print("BookedBarber V2 - Marketing Enhancement Validation")
    print("=" * 80)
    
    # Run the comprehensive test
    success = asyncio.run(run_comprehensive_integration_test())
    
    if success:
        print("\n✅ Integration validation completed successfully!")
        print("🚀 Dynamic Content Assembly System is ready for production use!")
    else:
        print("\n❌ Integration validation failed!")
        print("🔧 Please address the issues before proceeding to production.")
    
    exit(0 if success else 1)