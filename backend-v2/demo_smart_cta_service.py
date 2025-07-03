"""
Smart Call-to-Action Generation System Demo
Demonstrates the comprehensive features and capabilities of the SmartCTAService.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Any
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Mock imports for demo (replace with actual imports in production)
from services.smart_cta_service import (
    SmartCTAService, CTAType, CTAPlacement, CTAPersonalization,
    CTAVariant, CTAContext, calculate_cta_roi_estimate
)
from services.business_context_service import BusinessContext
from models.review import Review, ReviewSentiment


def create_mock_database_session():
    """Create a mock database session for demo purposes"""
    # In production, use your actual database setup
    engine = create_engine('sqlite:///:memory:')
    Session = sessionmaker(bind=engine)
    return Session()


def create_demo_business_context() -> BusinessContext:
    """Create demo business context"""
    return BusinessContext(
        business_name="Elite Cuts Barbershop",
        location_name="Downtown Seattle",
        address="456 Pine Street, Seattle, WA 98101",
        city="Seattle",
        state="WA", 
        phone="(206) 555-0123",
        email="info@elitecuts.com",
        website="https://elitecuts.com",
        specialty_services=["Premium Haircuts", "Beard Styling", "Hot Towel Shaves", "Hair Washing"],
        barber_names=["Marcus Thompson", "David Rodriguez", "Alex Chen"],
        total_barbers=3,
        years_established=8
    )


def create_demo_reviews() -> Dict[str, Review]:
    """Create demo review objects"""
    reviews = {}
    
    # Positive review
    positive_review = Review()
    positive_review.rating = 5
    positive_review.sentiment = ReviewSentiment.POSITIVE
    positive_review.review_text = "Amazing haircut by Marcus! The attention to detail was incredible and the hot towel shave was so relaxing. Definitely coming back!"
    positive_review.reviewer_name = "John Smith"
    positive_review.platform = "Google"
    positive_review.review_date = datetime.now()
    reviews["positive"] = positive_review
    
    # Negative review
    negative_review = Review()
    negative_review.rating = 2
    negative_review.sentiment = ReviewSentiment.NEGATIVE
    negative_review.review_text = "Waited 45 minutes past my appointment time. The haircut was rushed and not what I asked for. Very disappointed."
    negative_review.reviewer_name = "Sarah Johnson"
    negative_review.platform = "Yelp"
    negative_review.review_date = datetime.now()
    reviews["negative"] = negative_review
    
    # Neutral review
    neutral_review = Review()
    neutral_review.rating = 3
    neutral_review.sentiment = ReviewSentiment.NEUTRAL
    neutral_review.review_text = "Decent haircut, nothing special. The place is clean and the staff is professional. Prices are reasonable."
    neutral_review.reviewer_name = "Mike Chen"
    neutral_review.platform = "Facebook"
    neutral_review.review_date = datetime.now()
    reviews["neutral"] = neutral_review
    
    return reviews


def demo_basic_cta_generation():
    """Demo: Basic CTA generation for different sentiments"""
    print("=" * 80)
    print("DEMO 1: Basic Smart CTA Generation")
    print("=" * 80)
    
    # Setup
    db_session = create_mock_database_session()
    cta_service = SmartCTAService(db_session)
    business_context = create_demo_business_context()
    reviews = create_demo_reviews()
    
    # Test each sentiment
    for sentiment_name, review in reviews.items():
        print(f"\n--- {sentiment_name.upper()} REVIEW CTA ---")
        print(f"Review: {review.review_text[:100]}...")
        
        recommendation = cta_service.generate_smart_cta(
            business_context=business_context,
            review=review,
            service_type="haircut"
        )
        
        print(f"Primary CTA: {recommendation.primary_variant.text}")
        print(f"CTA Type: {recommendation.primary_variant.type.value}")
        print(f"Placement: {recommendation.primary_variant.placement.value}")
        print(f"Effectiveness Score: {recommendation.effectiveness_score:.2f}")
        print(f"Local SEO Value: {recommendation.local_seo_value:.2f}")
        print(f"A/B Test Ready: {recommendation.a_b_test_ready}")
        
        if recommendation.alternative_variants:
            print("\nAlternative Variants:")
            for i, variant in enumerate(recommendation.alternative_variants[:2], 1):
                print(f"  {i}. {variant.text} ({variant.type.value})")


def demo_service_specific_ctas():
    """Demo: Service-specific CTA generation"""
    print("\n" + "=" * 80)
    print("DEMO 2: Service-Specific CTA Generation")
    print("=" * 80)
    
    # Setup
    db_session = create_mock_database_session()
    cta_service = SmartCTAService(db_session)
    business_context = create_demo_business_context()
    positive_review = create_demo_reviews()["positive"]
    
    # Test different service types
    service_types = ["haircut", "beard_trim", "shave", "styling"]
    
    for service_type in service_types:
        print(f"\n--- {service_type.upper()} SERVICE CTA ---")
        
        recommendation = cta_service.generate_smart_cta(
            business_context=business_context,
            review=positive_review,
            service_type=service_type
        )
        
        print(f"CTA: {recommendation.primary_variant.text}")
        print(f"Type: {recommendation.primary_variant.type.value}")
        print(f"Service Context: {service_type}")


def demo_seasonal_cta_variants():
    """Demo: Seasonal CTA variants"""
    print("\n" + "=" * 80)
    print("DEMO 3: Seasonal CTA Variants")
    print("=" * 80)
    
    # Setup
    db_session = create_mock_database_session()
    cta_service = SmartCTAService(db_session)
    business_context = create_demo_business_context()
    
    # Test each season
    seasons = ["spring", "summer", "fall", "winter"]
    
    for season in seasons:
        print(f"\n--- {season.upper()} SEASONAL CTAs ---")
        
        variants = cta_service.get_seasonal_cta_variants(
            business_context=business_context,
            season=season
        )
        
        for i, variant in enumerate(variants[:3], 1):
            print(f"  {i}. {variant}")


def demo_cta_optimization():
    """Demo: CTA optimization for sentiment"""
    print("\n" + "=" * 80)
    print("DEMO 4: CTA Sentiment Optimization")
    print("=" * 80)
    
    # Setup
    db_session = create_mock_database_session()
    cta_service = SmartCTAService(db_session)
    business_context = create_demo_business_context()
    
    # Original CTA
    original_cta = "Visit us again soon for great service!"
    print(f"Original CTA: {original_cta}")
    
    # Optimize for different sentiments
    sentiments = [ReviewSentiment.POSITIVE, ReviewSentiment.NEUTRAL, ReviewSentiment.NEGATIVE]
    
    for sentiment in sentiments:
        print(f"\n--- {sentiment.value.upper()} OPTIMIZATION ---")
        
        optimized_cta = cta_service.optimize_cta_for_sentiment(
            cta=original_cta,
            sentiment=sentiment,
            business_context=business_context
        )
        
        print(f"Optimized CTA: {optimized_cta}")


def demo_ab_testing():
    """Demo: A/B testing functionality"""
    print("\n" + "=" * 80)
    print("DEMO 5: A/B Testing Setup and Tracking")
    print("=" * 80)
    
    # Setup
    db_session = create_mock_database_session()
    cta_service = SmartCTAService(db_session)
    business_context = create_demo_business_context()
    
    # Create test variants
    variant_a = CTAVariant(
        id="visit_variant_a",
        text="Visit Elite Cuts Barbershop again soon!",
        type=CTAType.VISIT,
        placement=CTAPlacement.END,
        personalization_level=CTAPersonalization.BASIC
    )
    
    variant_b = CTAVariant(
        id="book_variant_b",
        text="Book your next appointment at Elite Cuts today!",
        type=CTAType.BOOK,
        placement=CTAPlacement.END,
        personalization_level=CTAPersonalization.ADVANCED
    )
    
    # Create A/B test
    test_id = cta_service.create_ab_test(
        test_name="visit_vs_book_cta",
        variants=[variant_a, variant_b],
        business_context=business_context
    )
    
    print(f"A/B Test Created: {test_id}")
    print(f"Variant A: {variant_a.text}")
    print(f"Variant B: {variant_b.text}")
    
    # Simulate performance tracking
    print("\n--- Simulating Performance Data ---")
    
    # Variant A performance
    for _ in range(100):  # 100 impressions
        cta_service.track_cta_performance("visit_variant_a", "impression")
    for _ in range(8):    # 8 clicks
        cta_service.track_cta_performance("visit_variant_a", "click")
    for _ in range(2):    # 2 conversions
        cta_service.track_cta_performance("visit_variant_a", "conversion")
    
    # Variant B performance
    for _ in range(100):  # 100 impressions
        cta_service.track_cta_performance("book_variant_b", "impression")
    for _ in range(12):   # 12 clicks
        cta_service.track_cta_performance("book_variant_b", "click")
    for _ in range(4):    # 4 conversions
        cta_service.track_cta_performance("book_variant_b", "conversion")
    
    # Get analytics
    analytics = cta_service.get_cta_performance_analytics(30)
    
    print(f"Total Impressions: {analytics['total_impressions']}")
    print(f"Total Clicks: {analytics['total_clicks']}")
    print(f"Total Conversions: {analytics['total_conversions']}")
    print(f"Average CTR: {analytics['average_ctr']:.3f}")
    print(f"Average Conversion Rate: {analytics['average_conversion_rate']:.3f}")
    
    print("\nTop Performers:")
    for performer in analytics['top_performers']:
        print(f"  {performer['cta_id']}: CTR {performer['ctr']:.3f}, "
              f"Conv Rate {performer['conversion_rate']:.3f}")


def demo_performance_analytics():
    """Demo: Performance analytics and ROI calculation"""
    print("\n" + "=" * 80)
    print("DEMO 6: Performance Analytics and ROI")
    print("=" * 80)
    
    # Setup
    db_session = create_mock_database_session()
    cta_service = SmartCTAService(db_session)
    
    # Add sample performance data
    cta_ids = ["cta_haircut_1", "cta_beard_1", "cta_shave_1"]
    
    for cta_id in cta_ids:
        # Simulate different performance levels
        impressions = 150
        clicks = int(impressions * (0.05 + (hash(cta_id) % 10) / 100))  # 5-15% CTR
        conversions = int(clicks * (0.1 + (hash(cta_id) % 20) / 100))   # 10-30% conv rate
        
        for _ in range(impressions):
            cta_service.track_cta_performance(cta_id, "impression")
        for _ in range(clicks):
            cta_service.track_cta_performance(cta_id, "click")
        for _ in range(conversions):
            cta_service.track_cta_performance(cta_id, "conversion")
    
    # Get comprehensive analytics
    analytics = cta_service.get_cta_performance_analytics(30)
    
    print("=== PERFORMANCE SUMMARY ===")
    print(f"Timeframe: {analytics['timeframe_days']} days")
    print(f"CTAs Tracked: {analytics['total_ctas_tracked']}")
    print(f"Total Impressions: {analytics['total_impressions']:,}")
    print(f"Total Clicks: {analytics['total_clicks']:,}")
    print(f"Total Conversions: {analytics['total_conversions']:,}")
    print(f"Average CTR: {analytics['average_ctr']:.2%}")
    print(f"Average Conversion Rate: {analytics['average_conversion_rate']:.2%}")
    
    # Calculate ROI estimate
    baseline_ctr = 0.03  # 3% baseline
    current_ctr = analytics['average_ctr']
    
    roi_estimate = calculate_cta_roi_estimate(
        baseline_conversion_rate=baseline_ctr,
        optimized_conversion_rate=current_ctr,
        monthly_impressions=analytics['total_impressions']
    )
    
    print("\n=== ROI ANALYSIS ===")
    print(f"Baseline CTR: {baseline_ctr:.2%}")
    print(f"Optimized CTR: {current_ctr:.2%}")
    print(f"Improvement: {roi_estimate['conversion_rate_improvement']:.2%}")
    print(f"Additional Monthly Conversions: {roi_estimate['additional_monthly_conversions']:.1f}")
    print(f"Est. Monthly Revenue Increase: ${roi_estimate['estimated_monthly_revenue_increase']:,.2f}")
    print(f"Est. Annual Revenue Increase: ${roi_estimate['estimated_annual_revenue_increase']:,.2f}")
    print(f"ROI Percentage: {roi_estimate['roi_percentage']:.1f}%")


def demo_advanced_personalization():
    """Demo: Advanced personalization features"""
    print("\n" + "=" * 80)
    print("DEMO 7: Advanced Personalization")
    print("=" * 80)
    
    # Setup
    db_session = create_mock_database_session()
    cta_service = SmartCTAService(db_session)
    business_context = create_demo_business_context()
    reviews = create_demo_reviews()
    
    # Test personalization levels
    personalization_levels = [
        CTAPersonalization.NONE,
        CTAPersonalization.BASIC,
        CTAPersonalization.ADVANCED,
        CTAPersonalization.HYPER_PERSONALIZED
    ]
    
    base_template = "Visit {business_name} for excellent service!"
    
    for level in personalization_levels:
        print(f"\n--- {level.value.upper()} PERSONALIZATION ---")
        
        # Create context with different customer segments
        contexts = {
            "loyal": CTAContext(
                business_context=business_context,
                review=reviews["positive"],
                customer_segment="loyal",
                service_type="haircut"
            ),
            "detractor": CTAContext(
                business_context=business_context,
                review=reviews["negative"],
                customer_segment="detractor",
                service_type="haircut"
            )
        }
        
        for segment, context in contexts.items():
            variant = cta_service._create_personalized_variant(
                context=context,
                sentiment="positive",
                personalization_level=level
            )
            
            print(f"  {segment.capitalize()}: {variant.text}")


def demo_quality_validation():
    """Demo: CTA quality validation and spam detection"""
    print("\n" + "=" * 80)
    print("DEMO 8: Quality Validation and Spam Detection")
    print("=" * 80)
    
    # Setup
    db_session = create_mock_database_session()
    cta_service = SmartCTAService(db_session)
    
    # Test cases
    test_ctas = [
        ("Valid CTA", "Visit Elite Cuts for your next haircut!", True),
        ("Too Short", "Hi!", False),
        ("Too Long", "A" * 300, False),
        ("Excessive Caps", "VISIT US TODAY FOR AMAZING SERVICE!!!", False),
        ("Spam Keywords", "FREE! URGENT! ACT NOW! LIMITED TIME!", False),
        ("Good Quality", "Book your appointment with our skilled barbers today.", True),
        ("Phone Number", "Call us at 555-1234 for booking!", False),  # Contains personal info
        ("Natural Text", "We'd love to see you again at our barbershop.", True)
    ]
    
    print("Quality Validation Results:")
    print("-" * 60)
    
    for description, cta_text, expected in test_ctas:
        result = cta_service._validate_cta_quality(cta_text)
        status = "✓ PASS" if result else "✗ FAIL"
        expected_status = "✓ PASS" if expected else "✗ FAIL"
        
        print(f"{description:20} | {status:6} | Expected: {expected_status}")
        print(f"{'':20} | Text: {cta_text[:50]}...")
        print()


def run_comprehensive_demo():
    """Run all demo functions"""
    print("🚀 SMART CALL-TO-ACTION GENERATION SYSTEM DEMO")
    print("📋 Comprehensive Feature Demonstration")
    print("🏪 BookedBarber V2 - Elite Cuts Barbershop")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        demo_basic_cta_generation()
        demo_service_specific_ctas()
        demo_seasonal_cta_variants()
        demo_cta_optimization()
        demo_ab_testing()
        demo_performance_analytics()
        demo_advanced_personalization()
        demo_quality_validation()
        
        print("\n" + "=" * 80)
        print("✅ DEMO COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\n📊 Key Features Demonstrated:")
        print("  • Context-aware CTA generation")
        print("  • Sentiment-based optimization")
        print("  • Service-specific customization")
        print("  • Seasonal variant generation")
        print("  • A/B testing and performance tracking")
        print("  • Advanced personalization")
        print("  • Quality validation and spam detection")
        print("  • ROI analysis and reporting")
        
        print("\n🔧 Integration Points:")
        print("  • SEOOptimizationService - Enhanced CTA recommendations")
        print("  • BusinessContextService - Business-specific personalization")
        print("  • ReviewService - Sentiment-aware responses")
        print("  • BookingLinkGenerator - Marketing campaign CTAs")
        
        print("\n📈 Business Benefits:")
        print("  • Increased conversion rates")
        print("  • Better customer engagement")
        print("  • Improved local SEO performance")
        print("  • Data-driven CTA optimization")
        print("  • Automated A/B testing")
        print("  • Spam-free, high-quality content")
        
    except Exception as e:
        print(f"\n❌ Demo failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_comprehensive_demo()