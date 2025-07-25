"""
SEO Optimization Service Usage Examples
Demonstrates how to use the Intelligent SEO Optimization System for BookedBarber V2.
"""

from sqlalchemy.orm import Session
from services.seo_optimization_service import (
    SEOOptimizationService, 
    calculate_seo_roi_estimate, 
    generate_seo_performance_report
)
from services.business_context_service import BusinessContext


def example_basic_optimization(db: Session):
    """Example 1: Basic response optimization"""
    print("=" * 60)
    print("EXAMPLE 1: Basic Response Optimization")
    print("=" * 60)
    
    # Initialize the service
    seo_service = SEOOptimizationService(db)
    
    # Create business context
    business_context = BusinessContext(
        business_name="Elite Cuts Barbershop",
        city="Austin",
        state="Texas",
        specialty_services=["haircut", "beard trim", "hot shave"],
        barber_names=["Marcus Johnson", "David Lee"]
    )
    
    # Original response text
    original_response = "Thank you for your review."
    
    # Target keywords for optimization
    keywords = ["barber", "professional", "Austin", "haircut", "grooming"]
    
    # Optimize the response
    optimized = seo_service.optimize_response_for_seo(
        original_response, 
        keywords, 
        business_context
    )
    
    print(f"Original Response: {optimized.original_text}")
    print(f"Optimized Response: {optimized.optimized_text}")
    print(f"SEO Score: {optimized.seo_analysis.overall_seo_score}")
    print(f"Character Count: {optimized.character_count}")
    print(f"Readability: {optimized.estimated_readability}")
    print(f"Optimizations Applied: {sum(optimized.optimization_applied.values())}")
    
    return optimized


def example_keyword_density_analysis(db: Session):
    """Example 2: Keyword density analysis"""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Keyword Density Analysis")
    print("=" * 60)
    
    seo_service = SEOOptimizationService(db)
    
    # Sample response text
    response_text = """
    Thank you for choosing Elite Cuts Barbershop in Austin! 
    Our professional barbers specialize in premium haircut services. 
    We're proud to be Austin's premier barbershop for men's grooming.
    """
    
    # Keywords to analyze
    keywords = ["barber", "barbershop", "Austin", "haircut", "professional", "grooming"]
    
    # Calculate keyword density
    density = seo_service.calculate_keyword_density(response_text, keywords)
    
    print("Keyword Density Analysis:")
    for keyword, percentage in density.items():
        print(f"  {keyword}: {percentage}%")
    
    # Identify optimal vs. high density
    print("\nDensity Assessment:")
    for keyword, percentage in density.items():
        if percentage > 4.0:
            print(f"  ⚠️  {keyword}: HIGH density ({percentage}%) - may appear spammy")
        elif percentage >= 2.0:
            print(f"  ✅ {keyword}: GOOD density ({percentage}%)")
        elif percentage > 0:
            print(f"  📈 {keyword}: LOW density ({percentage}%) - can be increased")
        else:
            print(f"  ❌ {keyword}: NOT FOUND")
    
    return density


def example_comprehensive_seo_analysis(db: Session):
    """Example 3: Comprehensive SEO analysis"""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Comprehensive SEO Analysis")
    print("=" * 60)
    
    seo_service = SEOOptimizationService(db)
    
    business_context = BusinessContext(
        business_name="Downtown Barber Co",
        city="Nashville",
        state="Tennessee",
        address="123 Broadway Street",
        specialty_services=["fade haircut", "beard grooming", "straight razor shave"]
    )
    
    # Response to analyze
    response_text = """
    Thanks for the amazing review! We're delighted you loved your fade haircut 
    at Downtown Barber Co. Our skilled barbers take pride in delivering 
    exceptional grooming services here in Nashville. We look forward to 
    seeing you again soon for another great experience!
    """
    
    keywords = ["barber", "Nashville", "fade", "grooming", "skilled"]
    
    # Perform comprehensive analysis
    analysis = seo_service.analyze_seo_quality(response_text, keywords, business_context)
    
    print("SEO Quality Analysis:")
    print(f"  Overall SEO Score: {analysis.overall_seo_score}/1.0")
    print(f"  Keyword Stuffing Score: {analysis.keyword_stuffing_score}/1.0")
    print(f"  Readability Score: {analysis.readability_score}/1.0")
    print(f"  Local SEO Score: {analysis.local_seo_score}/1.0")
    print(f"  CTA Effectiveness: {analysis.cta_effectiveness_score}/1.0")
    print(f"  Total Keywords Found: {analysis.total_keywords}")
    
    print("\nKeyword Density Breakdown:")
    for keyword, density in analysis.keyword_density.items():
        print(f"  {keyword}: {density}%")
    
    print("\nSEO Suggestions:")
    for suggestion in analysis.suggestions:
        print(f"  💡 {suggestion}")
    
    if analysis.warnings:
        print("\nWarnings:")
        for warning in analysis.warnings:
            print(f"  ⚠️  {warning}")
    
    return analysis


def example_cta_optimization(db: Session):
    """Example 4: Call-to-Action optimization"""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Call-to-Action Optimization")
    print("=" * 60)
    
    seo_service = SEOOptimizationService(db)
    
    business_context = BusinessContext(
        business_name="Modern Cuts Studio",
        city="Denver",
        state="Colorado",
        phone="(303) 555-0123",
        specialty_services=["precision cuts", "beard styling"]
    )
    
    # Test different service types
    service_types = ["haircut", "beard", "general", "negative_feedback"]
    
    for service_type in service_types:
        cta = seo_service.suggest_cta_optimization(business_context, service_type)
        
        print(f"\nService Type: {service_type}")
        print(f"  Recommended CTA: {cta.cta_text}")
        print(f"  CTA Type: {cta.cta_type}")
        print(f"  Placement: {cta.placement}")
        print(f"  Effectiveness Score: {cta.effectiveness_score}")
        print(f"  Local SEO Value: {cta.local_seo_value}")


def example_local_seo_phrases(db: Session):
    """Example 5: Local SEO phrase generation"""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Local SEO Phrase Generation")
    print("=" * 60)
    
    seo_service = SEOOptimizationService(db)
    
    business_context = BusinessContext(
        business_name="Vintage Barber Lounge",
        city="Portland",
        state="Oregon",
        address="456 Pearl District Ave",
        specialty_services=["vintage cuts", "traditional shave", "beard oil treatment"]
    )
    
    # Generate local SEO phrases
    phrases = seo_service.generate_local_seo_phrases(business_context)
    
    print(f"Generated {len(phrases)} Local SEO Phrases:")
    for i, phrase in enumerate(phrases, 1):
        print(f"  {i:2d}. {phrase}")
    
    # Show how to integrate into responses
    print("\nExample Integration into Review Response:")
    original = "Thank you for your review! We appreciate your feedback."
    enhanced = f"{original} We're proud to be {phrases[0] if phrases else 'your local barber'}."
    
    print(f"Original: {original}")
    print(f"Enhanced: {enhanced}")
    
    return phrases


def example_review_response_optimization(db: Session):
    """Example 6: Complete review response optimization workflow"""
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Complete Review Response Optimization")
    print("=" * 60)
    
    seo_service = SEOOptimizationService(db)
    
    # Mock review data
    business_context = BusinessContext(
        business_name="The Gentleman's Cut",
        city="Charleston",
        state="South Carolina",
        specialty_services=["gentleman's cut", "hot towel shave", "beard grooming"]
    )
    
    # Simulate different review scenarios
    scenarios = [
        {
            "rating": 5,
            "sentiment": "positive",
            "review_text": "Amazing haircut! The barber was very skilled and professional.",
            "original_response": "Thank you for your review!"
        },
        {
            "rating": 2,
            "sentiment": "negative", 
            "review_text": "Disappointed with the service. The cut wasn't what I asked for.",
            "original_response": "We apologize for your disappointing experience."
        },
        {
            "rating": 3,
            "sentiment": "neutral",
            "review_text": "The service was okay. Nothing special but not bad either.",
            "original_response": "Thank you for your feedback."
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n--- Scenario {i}: {scenario['sentiment'].title()} Review ---")
        print(f"Customer Review: {scenario['review_text']}")
        print(f"Original Response: {scenario['original_response']}")
        
        # Extract keywords from review
        keywords = ["barber", "professional", "Charleston", "gentleman", "service"]
        
        # Optimize response
        optimized = seo_service.optimize_response_for_seo(
            scenario['original_response'],
            keywords,
            business_context
        )
        
        print(f"Optimized Response: {optimized.optimized_text}")
        print(f"SEO Score: {optimized.seo_analysis.overall_seo_score}")
        print(f"Applied Optimizations:")
        for opt_type, applied in optimized.optimization_applied.items():
            if applied:
                print(f"  ✅ {opt_type.replace('_', ' ').title()}")


def example_performance_tracking(db: Session):
    """Example 7: Performance tracking and ROI estimation"""
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Performance Tracking & ROI Estimation")
    print("=" * 60)
    
    # Simulate before/after SEO scores
    original_score = 0.35
    optimized_score = 0.72
    monthly_reviews = 80
    
    # Calculate ROI estimate
    roi = calculate_seo_roi_estimate(original_score, optimized_score, monthly_reviews)
    
    print("SEO ROI Estimation:")
    print(f"  Improvement Score: {roi['improvement_score']}")
    print(f"  Estimated Visibility Increase: {roi['estimated_visibility_increase_pct']}%")
    print(f"  Estimated Click Increase: {roi['estimated_click_increase_pct']}%")
    print(f"  Estimated Conversion Increase: {roi['estimated_conversion_increase_pct']}%")
    print(f"  Monthly Review Volume: {roi['monthly_review_volume']}")
    print(f"  Projected Monthly Benefit: {roi['projected_monthly_benefit']}")
    
    # Simulate performance report data
    print("\nSample Performance Report:")
    mock_optimizations = []
    
    # Create mock optimization results for reporting
    seo_service = SEOOptimizationService(db)
    business_context = BusinessContext(
        business_name="Sample Shop",
        city="Sample City",
        specialty_services=["haircut"]
    )
    
    for i in range(10):
        optimized = seo_service.optimize_response_for_seo(
            f"Thank you for review {i}",
            ["barber", "professional"],
            business_context
        )
        mock_optimizations.append(optimized)
    
    # Generate performance report
    report = generate_seo_performance_report(mock_optimizations, 30)
    
    print(f"  Total Optimizations: {report['total_optimizations']}")
    print(f"  Success Rate: {report['success_rate_pct']}%")
    print(f"  Average SEO Score: {report['average_seo_score']}")
    print(f"  Optimization Breakdown:")
    for opt_type, count in report['optimization_breakdown'].items():
        print(f"    {opt_type.replace('_', ' ').title()}: {count}")


def example_anti_spam_validation(db: Session):
    """Example 8: Anti-spam validation demonstration"""
    print("\n" + "=" * 60)
    print("EXAMPLE 8: Anti-Spam Validation")
    print("=" * 60)
    
    seo_service = SEOOptimizationService(db)
    
    # Test cases for spam detection
    test_cases = [
        {
            "name": "Normal Response",
            "text": "Thank you for your review! We appreciate your feedback and look forward to serving you again.",
            "keywords": ["review", "feedback", "appreciate"]
        },
        {
            "name": "Keyword Stuffed",
            "text": "barber barber barber professional barber barber haircut barber barber",
            "keywords": ["barber", "professional", "haircut"]
        },
        {
            "name": "Repetitive Content",
            "text": "Thank you thank you thank you thank you for your review review review",
            "keywords": ["thank", "review"]
        },
        {
            "name": "Unnatural Language",
            "text": "THANK YOU!!! AMAZING!!! BEST BARBER!!! PROFESSIONAL!!!",
            "keywords": ["thank", "amazing", "barber", "professional"]
        }
    ]
    
    for test_case in test_cases:
        print(f"\n--- Testing: {test_case['name']} ---")
        print(f"Text: {test_case['text']}")
        
        # Check anti-spam validation
        is_valid = seo_service._validate_anti_spam(test_case['text'], test_case['keywords'])
        print(f"Anti-Spam Validation: {'✅ PASS' if is_valid else '❌ FAIL (Detected as spam)'}")
        
        # Show specific metrics
        density = seo_service.calculate_keyword_density(test_case['text'], test_case['keywords'])
        repetition = seo_service._calculate_repetition_ratio(test_case['text'])
        natural_score = seo_service._calculate_natural_language_score(test_case['text'])
        
        print(f"  Max Keyword Density: {max(density.values()) if density else 0}%")
        print(f"  Repetition Ratio: {repetition:.3f}")
        print(f"  Natural Language Score: {natural_score:.3f}")


def main():
    """Run all examples"""
    print("SEO OPTIMIZATION SERVICE - COMPREHENSIVE EXAMPLES")
    print("=" * 80)
    print("This demo shows how to use the Intelligent SEO Optimization System")
    print("for optimizing review responses in BookedBarber V2.")
    print("=" * 80)
    
    # Mock database session for examples
    from unittest.mock import Mock
    mock_db = Mock(spec=Session)
    
    try:
        # Run all examples
        example_basic_optimization(mock_db)
        example_keyword_density_analysis(mock_db)
        example_comprehensive_seo_analysis(mock_db)
        example_cta_optimization(mock_db)
        example_local_seo_phrases(mock_db)
        example_review_response_optimization(mock_db)
        example_performance_tracking(mock_db)
        example_anti_spam_validation(mock_db)
        
        print("\n" + "=" * 80)
        print("🎉 ALL EXAMPLES COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nKey Benefits of the SEO Optimization Service:")
        print("✅ Intelligent keyword integration without spam")
        print("✅ Local SEO optimization for better visibility")
        print("✅ Call-to-action optimization for engagement")
        print("✅ Readability improvements for better user experience")
        print("✅ Anti-spam validation for quality assurance")
        print("✅ Performance tracking and ROI estimation")
        print("✅ Integration with existing BookedBarber services")
        
        print("\nNext Steps:")
        print("1. Integrate with review_service.py for automated optimization")
        print("2. Set up performance monitoring and reporting")
        print("3. Train staff on interpreting SEO metrics")
        print("4. Monitor search ranking improvements")
        
    except Exception as e:
        print(f"\n❌ Example execution failed: {e}")
        raise


if __name__ == "__main__":
    main()