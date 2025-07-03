"""
Validation script for Smart Keyword Generation Engine installation.
Verifies all components are working correctly and integration is ready.
"""

import sys
import os
import traceback
from unittest.mock import Mock
from typing import List, Dict, Any

# Add the backend-v2 directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def validate_imports():
    """Validate all required imports are working"""
    print("📦 Validating Imports...")
    
    try:
        from services.keyword_generation_service import (
            KeywordGenerationService, 
            KeywordAnalysisResult, 
            SEOKeywordSet,
            get_trending_barbershop_keywords,
            validate_keyword_quality
        )
        print("   ✅ KeywordGenerationService imports successful")
        
        from services.business_context_service import BusinessContext
        print("   ✅ BusinessContext imports successful")
        
        from utils.sanitization import sanitize_input, validate_text_content
        print("   ✅ Sanitization utilities imports successful")
        
        from models.review import Review, ReviewSentiment, ReviewPlatform
        print("   ✅ Review models imports successful")
        
        return True
        
    except ImportError as e:
        print(f"   ❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False


def validate_service_initialization():
    """Validate service can be initialized correctly"""
    print("\n🔧 Validating Service Initialization...")
    
    try:
        from services.keyword_generation_service import KeywordGenerationService
        from sqlalchemy.orm import Session
        
        # Mock database session
        mock_db = Mock(spec=Session)
        
        # Test valid initialization
        service = KeywordGenerationService(mock_db)
        print("   ✅ Service initialization with valid DB session")
        
        # Test invalid initialization
        try:
            KeywordGenerationService(None)
            print("   ❌ Service should reject None DB session")
            return False
        except ValueError:
            print("   ✅ Service correctly rejects None DB session")
        
        # Validate service has required attributes
        required_attributes = [
            'industry_keywords', 'service_keyword_map', 'local_seo_patterns',
            'sentiment_modifiers', 'trending_keywords'
        ]
        
        for attr in required_attributes:
            if hasattr(service, attr):
                print(f"   ✅ Service has {attr}")
            else:
                print(f"   ❌ Service missing {attr}")
                return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Service initialization failed: {e}")
        return False


def validate_core_functionality():
    """Validate core keyword generation functionality"""
    print("\n⚙️ Validating Core Functionality...")
    
    try:
        from services.keyword_generation_service import KeywordGenerationService
        from services.business_context_service import BusinessContext
        from sqlalchemy.orm import Session
        
        # Initialize service
        mock_db = Mock(spec=Session)
        service = KeywordGenerationService(mock_db)
        
        # Test 1: Service keyword generation
        service_keywords = service.generate_service_keywords(["haircut", "shave", "beard"])
        if isinstance(service_keywords, list) and len(service_keywords) > 0:
            print("   ✅ Service keyword generation working")
        else:
            print("   ❌ Service keyword generation failed")
            return False
        
        # Test 2: Review keyword extraction
        review_text = "Great haircut and professional service! Clean shop."
        keyword_extraction = service.extract_keywords_from_review(review_text)
        if isinstance(keyword_extraction, dict) and "service_keywords" in keyword_extraction:
            print("   ✅ Review keyword extraction working")
        else:
            print("   ❌ Review keyword extraction failed")
            return False
        
        # Test 3: Local SEO keywords
        business_context = BusinessContext(
            business_name="Test Barbershop",
            city="San Francisco",
            state="CA"
        )
        local_keywords = service.get_local_seo_keywords(business_context)
        if isinstance(local_keywords, list) and len(local_keywords) > 0:
            print("   ✅ Local SEO keyword generation working")
        else:
            print("   ❌ Local SEO keyword generation failed")
            return False
        
        # Test 4: Sentiment optimization
        base_keywords = ["haircut", "service", "professional"]
        optimized = service.optimize_keywords_for_sentiment(base_keywords, "positive")
        if isinstance(optimized, list) and len(optimized) >= len(base_keywords):
            print("   ✅ Sentiment keyword optimization working")
        else:
            print("   ❌ Sentiment keyword optimization failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Core functionality validation failed: {e}")
        traceback.print_exc()
        return False


def validate_security_features():
    """Validate security and input sanitization"""
    print("\n🔒 Validating Security Features...")
    
    try:
        from services.keyword_generation_service import KeywordGenerationService
        from utils.sanitization import sanitize_input, validate_text_content
        from sqlalchemy.orm import Session
        
        # Initialize service
        mock_db = Mock(spec=Session)
        service = KeywordGenerationService(mock_db)
        
        # Test malicious inputs
        malicious_inputs = [
            "<script>alert('xss')</script>",
            "'; DROP TABLE reviews; --",
            "javascript:void(0)",
            "eval('malicious')"
        ]
        
        for malicious_input in malicious_inputs:
            # Test sanitization
            sanitized = sanitize_input(malicious_input)
            if "<script>" not in sanitized and "DROP TABLE" not in sanitized:
                print(f"   ✅ Input sanitization working for: {malicious_input[:20]}...")
            else:
                print(f"   ❌ Input sanitization failed for: {malicious_input[:20]}...")
                return False
            
            # Test content validation
            is_valid = validate_text_content(malicious_input)
            if not is_valid:
                print(f"   ✅ Content validation correctly flagged: {malicious_input[:20]}...")
            else:
                print(f"   ❌ Content validation missed threat: {malicious_input[:20]}...")
                return False
            
            # Test service handles malicious input safely
            try:
                result = service.extract_keywords_from_review(malicious_input)
                # Should succeed but return clean results
                if isinstance(result, dict):
                    print(f"   ✅ Service safely handled malicious input")
                else:
                    print(f"   ❌ Service failed to handle malicious input safely")
                    return False
            except Exception as e:
                # Only accept specific validation errors
                if "Invalid content detected" in str(e):
                    print(f"   ✅ Service correctly rejected malicious input")
                else:
                    print(f"   ❌ Service failed unexpectedly: {e}")
                    return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Security validation failed: {e}")
        return False


def validate_integration_points():
    """Validate integration with existing services"""
    print("\n🔗 Validating Integration Points...")
    
    try:
        from services.keyword_generation_service import KeywordGenerationService
        from services.business_context_service import BusinessContext, BusinessContextService
        from models.review import Review, ReviewSentiment
        from sqlalchemy.orm import Session
        
        # Initialize services
        mock_db = Mock(spec=Session)
        keyword_service = KeywordGenerationService(mock_db)
        
        # Test integration with BusinessContext
        business_context = BusinessContext(
            business_name="Integration Test Shop",
            city="Test City",
            specialty_services=["haircut", "shave"]
        )
        
        # Test comprehensive analysis
        mock_review = Mock(spec=Review)
        mock_review.id = 1
        mock_review.user_id = 123
        mock_review.rating = 4.5
        mock_review.review_text = "Great service and professional haircut!"
        mock_review.sentiment = ReviewSentiment.POSITIVE
        
        analysis_result = keyword_service.analyze_review_for_keywords(
            mock_review, business_context
        )
        
        if hasattr(analysis_result, 'extracted_keywords') and hasattr(analysis_result, 'service_keywords'):
            print("   ✅ Integration with review analysis working")
        else:
            print("   ❌ Integration with review analysis failed")
            return False
        
        # Test SEO keyword set generation
        seo_keywords = keyword_service.generate_seo_keyword_set(
            business_context,
            target_services=["haircut", "shave"],
            competitor_analysis=True
        )
        
        required_seo_fields = [
            'primary_keywords', 'secondary_keywords', 'local_seo_keywords',
            'long_tail_keywords', 'branded_keywords', 'relevance_scores'
        ]
        
        for field in required_seo_fields:
            if hasattr(seo_keywords, field):
                print(f"   ✅ SEO keyword set has {field}")
            else:
                print(f"   ❌ SEO keyword set missing {field}")
                return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Integration validation failed: {e}")
        return False


def validate_utility_functions():
    """Validate utility functions work correctly"""
    print("\n🛠️ Validating Utility Functions...")
    
    try:
        from services.keyword_generation_service import (
            get_trending_barbershop_keywords,
            validate_keyword_quality
        )
        
        # Test trending keywords
        trending = get_trending_barbershop_keywords()
        if isinstance(trending, list) and len(trending) > 0:
            print("   ✅ Trending keywords function working")
        else:
            print("   ❌ Trending keywords function failed")
            return False
        
        # Test keyword quality validation - valid case
        valid_keywords = ["professional barber", "haircut service", "quality grooming"]
        valid_result = validate_keyword_quality(valid_keywords)
        if valid_result.get("valid") is True:
            print("   ✅ Keyword quality validation (valid case) working")
        else:
            print("   ❌ Keyword quality validation (valid case) failed")
            return False
        
        # Test keyword quality validation - invalid case
        invalid_keywords = ["a", "haircut", "haircut", "very@#$long" * 10]
        invalid_result = validate_keyword_quality(invalid_keywords)
        if valid_result.get("valid") is False or len(invalid_result.get("issues", [])) > 0:
            print("   ✅ Keyword quality validation (invalid case) working")
        else:
            print("   ❌ Keyword quality validation (invalid case) failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Utility function validation failed: {e}")
        return False


def validate_performance():
    """Validate performance with various input sizes"""
    print("\n🚀 Validating Performance...")
    
    try:
        from services.keyword_generation_service import KeywordGenerationService
        from sqlalchemy.orm import Session
        import time
        
        # Initialize service
        mock_db = Mock(spec=Session)
        service = KeywordGenerationService(mock_db)
        
        # Test large input handling
        large_text = "Great haircut service and professional barber. " * 100
        
        start_time = time.time()
        result = service.extract_keywords_from_review(large_text)
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        if isinstance(result, dict) and processing_time < 5.0:  # Should complete within 5 seconds
            print(f"   ✅ Large input processing completed in {processing_time:.2f}s")
        else:
            print(f"   ❌ Large input processing too slow: {processing_time:.2f}s")
            return False
        
        # Test large service list
        large_service_list = ["haircut"] * 50
        
        start_time = time.time()
        keywords = service.generate_service_keywords(large_service_list)
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        if isinstance(keywords, list) and processing_time < 2.0:  # Should complete within 2 seconds
            print(f"   ✅ Large service list processing completed in {processing_time:.2f}s")
        else:
            print(f"   ❌ Large service list processing too slow: {processing_time:.2f}s")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Performance validation failed: {e}")
        return False


def generate_summary_report():
    """Generate a summary report of the validation"""
    print("\n" + "="*80)
    print("📊 SMART KEYWORD GENERATION ENGINE - VALIDATION SUMMARY")
    print("="*80)
    
    validation_results = []
    
    # Run all validations
    validations = [
        ("Import Validation", validate_imports),
        ("Service Initialization", validate_service_initialization),
        ("Core Functionality", validate_core_functionality),
        ("Security Features", validate_security_features),
        ("Integration Points", validate_integration_points),
        ("Utility Functions", validate_utility_functions),
        ("Performance Tests", validate_performance)
    ]
    
    for name, validation_func in validations:
        try:
            result = validation_func()
            validation_results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} failed with exception: {e}")
            validation_results.append((name, False))
    
    # Print summary
    print(f"\n📋 VALIDATION RESULTS:")
    print("-" * 40)
    
    passed = 0
    total = len(validation_results)
    
    for name, result in validation_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {name:<25} {status}")
        if result:
            passed += 1
    
    print("-" * 40)
    print(f"   TOTAL: {passed}/{total} validations passed")
    
    if passed == total:
        print("\n🎉 ALL VALIDATIONS PASSED!")
        print("\n✨ Smart Keyword Generation Engine is ready for production!")
        print("\n📦 Installed Components:")
        print("   • KeywordGenerationService - Core keyword intelligence")
        print("   • SecurityValidation - Input sanitization and validation")
        print("   • BusinessContext Integration - Contextual keyword generation")
        print("   • SEO Optimization - Local and sentiment-aware keywords")
        print("   • Utility Functions - Supporting tools and validation")
        
        print("\n🚀 Key Features Ready:")
        print("   • Industry-specific keyword generation")
        print("   • Review content analysis and extraction")
        print("   • Local SEO keyword optimization")
        print("   • Sentiment-aware keyword selection")
        print("   • Security-first input validation")
        print("   • Performance optimized processing")
        print("   • Comprehensive error handling")
        
        print("\n📖 Next Steps:")
        print("   1. Review the comprehensive documentation in KEYWORD_GENERATION_SERVICE_README.md")
        print("   2. Run integration examples: python integration_examples_keyword_service.py")
        print("   3. Integrate with existing review response system")
        print("   4. Configure monitoring and analytics")
        print("   5. Set up production caching (Redis recommended)")
        
    else:
        print(f"\n⚠️ {total - passed} VALIDATION(S) FAILED!")
        print("\n🔧 Please review the failed validations above and resolve any issues.")
        print("   • Check import paths and dependencies")
        print("   • Verify database connectivity")
        print("   • Review security configuration")
        print("   • Test integration points")
        
    return passed == total


if __name__ == "__main__":
    """Run complete validation of Smart Keyword Generation Engine"""
    
    print("🧪 Smart Keyword Generation Engine - Installation Validation")
    print("="*80)
    print("This validation will test all components and features of the")
    print("Smart Keyword Generation Engine to ensure proper installation.")
    print("="*80)
    
    try:
        success = generate_summary_report()
        
        if success:
            print("\n✅ Installation validation completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Installation validation failed!")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 Validation script failed with unexpected error: {e}")
        traceback.print_exc()
        sys.exit(1)