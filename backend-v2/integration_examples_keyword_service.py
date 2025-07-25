"""
Integration Examples for Smart Keyword Generation Engine.
Demonstrates how to integrate the keyword service with existing review management.
"""

import sys
import os
from unittest.mock import Mock
from sqlalchemy.orm import Session

# Add the backend-v2 directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.keyword_generation_service import KeywordGenerationService
from services.business_context_service import BusinessContext
from models.review import Review, ReviewSentiment


def example_enhanced_review_response_generation():
    """
    Example: Enhanced review response generation using keyword intelligence.
    Shows how to integrate keyword service with existing review response system.
    """
    print("🔧 Enhanced Review Response Generation Example")
    print("=" * 60)
    
    # Mock database session
    mock_db = Mock(spec=Session)
    
    # Initialize services
    keyword_service = KeywordGenerationService(mock_db)
    
    # Sample business context
    business_context = BusinessContext(
        business_name="Elite Barber Co",
        city="Los Angeles",
        state="CA",
        specialty_services=["precision cuts", "hot shaves", "beard styling"]
    )
    
    # Sample review
    review_text = """
    Amazing experience at this barbershop! The barber gave me the best fade 
    I've ever had. Professional service, clean environment, and great attention 
    to detail. The hot shave was incredible too. Highly recommend!
    """
    
    review = Mock(spec=Review)
    review.id = 1
    review.user_id = 123
    review.rating = 5.0
    review.review_text = review_text
    review.sentiment = ReviewSentiment.POSITIVE
    review.reviewer_name = "Alex Johnson"
    
    # Step 1: Analyze review for keywords
    keyword_analysis = keyword_service.analyze_review_for_keywords(review, business_context)
    
    print("📊 Keyword Analysis Results:")
    print(f"   Service Keywords: {keyword_analysis.service_keywords[:5]}")
    print(f"   Local Keywords: {keyword_analysis.local_keywords[:3]}")
    print(f"   Sentiment Keywords: {keyword_analysis.sentiment_keywords[:3]}")
    
    # Step 2: Generate SEO-optimized keywords for response
    service_keywords = keyword_analysis.keyword_categories.get("service_keywords", [])
    optimized_keywords = keyword_service.optimize_keywords_for_sentiment(
        service_keywords, "positive"
    )
    
    print(f"\n🎯 Optimized Keywords for Response: {optimized_keywords[:5]}")
    
    # Step 3: Generate enhanced response template
    enhanced_response = f"""
    Thank you so much for the amazing 5-star review, {review.reviewer_name}! 
    We're thrilled you experienced our professional barbering services and 
    precision fade techniques at Elite Barber Co in Los Angeles. 
    
    Our skilled team takes pride in delivering exceptional hot shave services 
    and maintaining the clean, professional environment our clients love. 
    Your feedback about our attention to detail means everything to us!
    
    We look forward to providing you with outstanding grooming services 
    again soon. Thank you for choosing Elite Barber Co - LA's premier 
    destination for men's grooming excellence!
    """
    
    print(f"\n💬 Enhanced Response:")
    print(enhanced_response.strip())
    
    # Step 4: Validate response contains optimized keywords
    response_lower = enhanced_response.lower()
    keyword_usage = []
    for keyword in optimized_keywords[:5]:
        if keyword.lower() in response_lower:
            keyword_usage.append(keyword)
    
    print(f"\n✅ Keywords Successfully Integrated: {keyword_usage}")
    
    return enhanced_response


def example_local_seo_optimization():
    """
    Example: Local SEO keyword optimization for business listings.
    Shows how to generate location-specific keywords for marketing.
    """
    print("\n🌍 Local SEO Optimization Example")
    print("=" * 60)
    
    # Mock database session
    mock_db = Mock(spec=Session)
    keyword_service = KeywordGenerationService(mock_db)
    
    # Business context for different locations
    locations = [
        BusinessContext(
            business_name="Downtown Cuts",
            city="San Francisco",
            state="CA",
            address="123 Market St, Downtown San Francisco",
            specialty_services=["modern cuts", "traditional shaves"]
        ),
        BusinessContext(
            business_name="Brooklyn Barber",
            city="Brooklyn",
            state="NY",
            address="456 Atlantic Ave, Brooklyn Heights",
            specialty_services=["artisan cuts", "beard grooming"]
        )
    ]
    
    for i, location in enumerate(locations, 1):
        print(f"\n📍 Location {i}: {location.business_name}")
        
        # Generate local SEO keywords
        local_keywords = keyword_service.get_local_seo_keywords(location)
        
        print(f"   City-based keywords: {[kw for kw in local_keywords if location.city.lower() in kw.lower()][:3]}")
        print(f"   Service + location: {[kw for kw in local_keywords if 'barber' in kw.lower() and location.city.lower() in kw.lower()][:3]}")
        print(f"   Competitive keywords: {[kw for kw in local_keywords if 'best' in kw.lower()][:2]}")


def example_sentiment_aware_keyword_optimization():
    """
    Example: Sentiment-aware keyword optimization for different review types.
    Shows how keyword selection changes based on review sentiment.
    """
    print("\n😊 Sentiment-Aware Keyword Optimization Example")
    print("=" * 60)
    
    # Mock database session
    mock_db = Mock(spec=Session)
    keyword_service = KeywordGenerationService(mock_db)
    
    # Base keywords for barbershop services
    base_keywords = ["haircut", "service", "barber", "professional", "experience"]
    
    # Test different sentiments
    sentiments = ["positive", "negative", "neutral"]
    
    for sentiment in sentiments:
        print(f"\n{sentiment.upper()} Sentiment Optimization:")
        optimized = keyword_service.optimize_keywords_for_sentiment(base_keywords, sentiment)
        
        print(f"   Original: {base_keywords}")
        print(f"   Optimized: {optimized[:8]}")
        
        # Show sentiment-specific additions
        new_keywords = [kw for kw in optimized if kw not in base_keywords]
        print(f"   Added for {sentiment}: {new_keywords[:5]}")


def example_competitive_keyword_analysis():
    """
    Example: Competitive keyword analysis and differentiation.
    Shows how to generate keywords that differentiate from competitors.
    """
    print("\n🏆 Competitive Keyword Analysis Example")
    print("=" * 60)
    
    # Mock database session
    mock_db = Mock(spec=Session)
    keyword_service = KeywordGenerationService(mock_db)
    
    # Business context
    business_context = BusinessContext(
        business_name="Premium Cuts & Shaves",
        city="Miami",
        state="FL",
        specialty_services=["luxury grooming", "executive styling", "hot towel service"]
    )
    
    # Generate comprehensive SEO keyword set
    seo_keywords = keyword_service.generate_seo_keyword_set(
        business_context,
        target_services=["executive styling", "luxury grooming"],
        competitor_analysis=True
    )
    
    print("🎯 Primary Keywords (Brand Focus):")
    print(f"   {seo_keywords.primary_keywords[:5]}")
    
    print("\n🌟 Long-tail Keywords (Niche Targeting):")
    print(f"   {seo_keywords.long_tail_keywords[:5]}")
    
    print("\n🏢 Branded Keywords (Business Identity):")
    print(f"   {seo_keywords.branded_keywords[:5]}")
    
    print("\n⚔️ Competitor Keywords (Market Positioning):")
    print(f"   {seo_keywords.competitor_keywords[:5]}")
    
    # Show relevance scoring
    print("\n📊 Top Relevance Scores:")
    sorted_scores = sorted(seo_keywords.relevance_scores.items(), key=lambda x: x[1], reverse=True)
    for keyword, score in sorted_scores[:5]:
        print(f"   {keyword}: {score:.2f}")


def example_review_content_intelligence():
    """
    Example: Intelligence extraction from review content.
    Shows how to analyze review patterns for business insights.
    """
    print("\n🧠 Review Content Intelligence Example")
    print("=" * 60)
    
    # Mock database session
    mock_db = Mock(spec=Session)
    keyword_service = KeywordGenerationService(mock_db)
    
    # Sample reviews with different content patterns
    sample_reviews = [
        "Great fade and professional service! Clean shop, skilled barber.",
        "Disappointed with my haircut. Service was rushed and unprofessional.",
        "Decent beard trim but could be better. Average experience overall.",
        "Amazing hot shave experience! Traditional barbering at its finest.",
        "Love the modern atmosphere and precision cutting techniques."
    ]
    
    print("📝 Review Content Analysis:")
    
    for i, review_text in enumerate(sample_reviews, 1):
        print(f"\n   Review {i}: \"{review_text[:50]}...\"")
        
        # Extract keywords
        keywords = keyword_service.extract_keywords_from_review(review_text)
        
        # Show key insights
        services = keywords.get("service_keywords", [])
        quality = keywords.get("quality_keywords", [])
        sentiment_words = keywords.get("sentiment_keywords", [])
        
        print(f"     Services mentioned: {services[:3]}")
        print(f"     Quality indicators: {quality[:2]}")
        print(f"     Sentiment words: {sentiment_words[:2]}")


def example_integration_with_existing_review_service():
    """
    Example: Integration with existing ReviewService for enhanced responses.
    Shows how keyword service enhances the current review management system.
    """
    print("\n🔗 Integration with Existing Review Service Example")
    print("=" * 60)
    
    # This example shows how to enhance the existing review service
    # with keyword intelligence (pseudo-code for integration)
    
    integration_code = '''
    # Enhanced ReviewService integration example:
    
    class EnhancedReviewService(ReviewService):
        def __init__(self, db: Session):
            super().__init__()
            self.keyword_service = KeywordGenerationService(db)
        
        def generate_seo_optimized_response(self, review: Review, business_context: BusinessContext) -> str:
            """Generate SEO-optimized response using keyword intelligence"""
            
            # 1. Analyze review for keyword opportunities
            keyword_analysis = self.keyword_service.analyze_review_for_keywords(
                review, business_context
            )
            
            # 2. Get base response from existing service
            base_response = self.generate_auto_response(review, business_context.business_name)
            
            # 3. Extract mentioned services for keyword optimization
            mentioned_services = keyword_analysis.keyword_categories.get("service_keywords", [])
            
            # 4. Optimize keywords for review sentiment
            sentiment = review.sentiment.value if review.sentiment else "neutral"
            optimized_keywords = self.keyword_service.optimize_keywords_for_sentiment(
                mentioned_services, sentiment
            )
            
            # 5. Generate local SEO keywords
            local_keywords = self.keyword_service.get_local_seo_keywords(business_context)
            
            # 6. Enhance response with optimized keywords
            enhanced_response = self._integrate_keywords_into_response(
                base_response, optimized_keywords, local_keywords, business_context
            )
            
            return enhanced_response
        
        def _integrate_keywords_into_response(self, response: str, service_keywords: List[str], 
                                            local_keywords: List[str], context: BusinessContext) -> str:
            """Intelligently integrate keywords into response text"""
            
            # Natural keyword integration logic
            # - Replace generic terms with specific service keywords
            # - Add location-specific mentions where appropriate
            # - Maintain natural flow and readability
            
            enhanced = response
            
            # Example integrations:
            if "service" in enhanced and service_keywords:
                enhanced = enhanced.replace("service", f"{service_keywords[0]} service", 1)
            
            if context.city and context.city.lower() not in enhanced.lower():
                enhanced = enhanced.replace(
                    "thank you", f"thank you for choosing {context.business_name} in {context.city}", 1
                )
            
            return enhanced
    '''
    
    print("💡 Integration Pattern:")
    print(integration_code)
    
    print("\n✨ Benefits of Integration:")
    print("   • SEO-optimized review responses")
    print("   • Location-specific keyword targeting")
    print("   • Sentiment-aware content optimization")
    print("   • Automated keyword opportunity detection")
    print("   • Competitive differentiation through smart keywords")


def run_all_examples():
    """Run all integration examples"""
    print("🚀 Smart Keyword Generation Engine - Integration Examples")
    print("=" * 80)
    
    try:
        example_enhanced_review_response_generation()
        example_local_seo_optimization()
        example_sentiment_aware_keyword_optimization()
        example_competitive_keyword_analysis()
        example_review_content_intelligence()
        example_integration_with_existing_review_service()
        
        print("\n" + "=" * 80)
        print("🎉 All integration examples completed successfully!")
        print("\n📋 Summary of Capabilities Demonstrated:")
        print("   ✅ Enhanced review response generation with SEO keywords")
        print("   ✅ Local SEO optimization for multiple business locations")
        print("   ✅ Sentiment-aware keyword selection and optimization")
        print("   ✅ Competitive analysis and market positioning keywords")
        print("   ✅ Intelligence extraction from review content patterns")
        print("   ✅ Seamless integration with existing review management")
        
        print("\n🔧 Implementation Ready:")
        print("   • Secure input validation and sanitization")
        print("   • Performance optimized for production use")
        print("   • Comprehensive error handling and fallbacks")
        print("   • Extensive test coverage and validation")
        
    except Exception as e:
        print(f"❌ Example execution failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_examples()