# Smart Keyword Generation Engine

A comprehensive keyword generation service for the BookedBarber review management system that provides intelligent keyword extraction, SEO optimization, and sentiment-aware content enhancement.

## 🎯 Overview

The Smart Keyword Generation Engine enhances the BookedBarber review response system by providing:

- **Industry-Specific Keyword Intelligence**: Barbershop and grooming service keywords
- **Review Content Analysis**: Extract keywords and insights from customer reviews
- **Local SEO Optimization**: Location-based keyword generation for local search
- **Sentiment-Aware Keywords**: Optimize keywords based on review sentiment
- **Security-First Design**: Input validation and sanitization to prevent attacks
- **Integration Ready**: Seamless integration with existing review management

## 🚀 Features

### 1. Industry-Specific Keyword Generation
- **Core Services**: haircut, fade, shave, beard trim, styling
- **Advanced Services**: skin fade, hot shave, beard grooming, scalp treatment
- **Quality Descriptors**: professional, skilled, precision, clean, modern
- **Experience Terms**: friendly, efficient, comfortable, relaxing
- **Trending Keywords**: Updated with current barbershop terminology

### 2. Review Content Analysis
- **Service Detection**: Automatically identify mentioned services
- **Quality Indicators**: Extract positive/negative quality mentions
- **Local References**: Detect location and area mentions
- **Sentiment Keywords**: Identify sentiment-indicating phrases
- **Product Mentions**: Find tool and product references
- **Competitor Analysis**: Detect competitor mentions

### 3. Local SEO Optimization
- **City + Service Combinations**: "barber Los Angeles", "haircut San Francisco"
- **Proximity Keywords**: "barber near me", "barbershop downtown"
- **Competitive Keywords**: "best barber [city]", "top barbershop [area]"
- **Neighborhood Targeting**: Area-specific keyword generation
- **Business Branding**: Integrate business name naturally

### 4. Sentiment-Aware Optimization
- **Positive Sentiment**: Amplifying words (excellent, amazing, outstanding)
- **Negative Sentiment**: Improvement focus (commitment, quality, satisfaction)
- **Neutral Sentiment**: Acknowledgment and invitation terms
- **Dynamic Scoring**: Prioritize keywords based on sentiment context

## 📋 Usage Examples

### Basic Service Initialization

```python
from services.keyword_generation_service import KeywordGenerationService
from sqlalchemy.orm import Session

# Initialize service
db: Session = get_db_session()
keyword_service = KeywordGenerationService(db)
```

### Generate Service Keywords

```python
# Generate keywords for specific services
service_types = ["haircut", "shave", "beard"]
keywords = keyword_service.generate_service_keywords(service_types)

# Result: ['haircut', 'professional haircut', 'precision cutting', 'hot shave', 
#          'straight razor', 'beard trim', 'beard grooming', ...]
```

### Extract Keywords from Review

```python
# Analyze review content
review_text = "Great haircut and professional service! Clean shop and skilled barber."
keyword_analysis = keyword_service.extract_keywords_from_review(review_text)

# Result:
# {
#     "service_keywords": ["haircut", "professional", "service"],
#     "quality_keywords": ["clean", "skilled", "professional"],
#     "local_keywords": [],
#     "sentiment_keywords": ["great"],
#     "product_keywords": [],
#     "competitor_keywords": []
# }
```

### Generate Local SEO Keywords

```python
from services.business_context_service import BusinessContext

# Create business context
business_context = BusinessContext(
    business_name="Mike's Barbershop",
    city="San Francisco",
    state="CA"
)

# Generate local SEO keywords
local_keywords = keyword_service.get_local_seo_keywords(business_context)

# Result: ['barber San Francisco', 'barbershop San Francisco', 'San Francisco barber',
#          'best barber San Francisco', 'professional barber San Francisco', ...]
```

### Optimize Keywords for Sentiment

```python
# Base keywords
base_keywords = ["haircut", "service", "professional", "barber"]

# Optimize for positive sentiment
positive_keywords = keyword_service.optimize_keywords_for_sentiment(
    base_keywords, "positive"
)

# Result: ['haircut', 'service', 'professional', 'barber', 'excellent', 
#          'amazing', 'outstanding', 'highly recommend', ...]
```

### Comprehensive Review Analysis

```python
from models.review import Review

# Analyze review with business context
review = get_review_by_id(123)
business_context = get_business_context(review.user_id)

analysis_result = keyword_service.analyze_review_for_keywords(
    review, business_context
)

# Access detailed analysis
print(f"Service keywords: {analysis_result.service_keywords}")
print(f"Local keywords: {analysis_result.local_keywords}")
print(f"Confidence scores: {analysis_result.confidence_scores}")
```

### Generate SEO Keyword Set

```python
# Generate comprehensive SEO keyword set
seo_keywords = keyword_service.generate_seo_keyword_set(
    business_context,
    target_services=["haircut", "beard trim"],
    competitor_analysis=True
)

# Access different keyword categories
print(f"Primary: {seo_keywords.primary_keywords}")
print(f"Long-tail: {seo_keywords.long_tail_keywords}")
print(f"Local SEO: {seo_keywords.local_seo_keywords}")
print(f"Branded: {seo_keywords.branded_keywords}")
```

## 🔒 Security Features

### Input Validation and Sanitization
- **XSS Prevention**: Removes script tags and dangerous attributes
- **SQL Injection Protection**: Validates against SQL injection patterns
- **Content Validation**: Checks for suspicious patterns and obfuscation
- **Length Limits**: Prevents resource exhaustion attacks
- **Character Filtering**: Removes potentially dangerous characters

### Example Security Validation

```python
# All inputs are automatically validated and sanitized
malicious_input = "<script>alert('xss')</script>; DROP TABLE reviews;"

# This is safely handled - malicious content is removed/sanitized
safe_keywords = keyword_service.generate_service_keywords([malicious_input])
# Result: Clean, safe keywords without malicious content
```

## 🔧 Integration with Existing Systems

### Enhanced Review Response Generation

```python
from services.review_service import ReviewService

class EnhancedReviewService(ReviewService):
    def __init__(self, db: Session):
        super().__init__()
        self.keyword_service = KeywordGenerationService(db)
    
    def generate_seo_optimized_response(self, review: Review, 
                                      business_context: BusinessContext) -> str:
        # Analyze review for keywords
        keyword_analysis = self.keyword_service.analyze_review_for_keywords(
            review, business_context
        )
        
        # Get base response
        base_response = self.generate_auto_response(review, business_context.business_name)
        
        # Optimize keywords for sentiment
        sentiment = review.sentiment.value if review.sentiment else "neutral"
        mentioned_services = keyword_analysis.keyword_categories.get("service_keywords", [])
        optimized_keywords = self.keyword_service.optimize_keywords_for_sentiment(
            mentioned_services, sentiment
        )
        
        # Generate enhanced response with SEO keywords
        enhanced_response = self._integrate_keywords_naturally(
            base_response, optimized_keywords, business_context
        )
        
        return enhanced_response
```

### API Endpoint Integration

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/reviews/{review_id}/keywords/analyze")
async def analyze_review_keywords(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze keywords in a specific review"""
    
    keyword_service = KeywordGenerationService(db)
    review = get_review_by_id(review_id)
    business_context = get_business_context(current_user.id)
    
    analysis = keyword_service.analyze_review_for_keywords(review, business_context)
    
    return {
        "review_id": review_id,
        "service_keywords": analysis.service_keywords,
        "local_keywords": analysis.local_keywords,
        "sentiment_keywords": analysis.sentiment_keywords,
        "confidence_scores": analysis.confidence_scores
    }

@router.get("/business/keywords/seo")
async def get_seo_keywords(
    target_services: List[str] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate SEO keyword set for business"""
    
    keyword_service = KeywordGenerationService(db)
    business_context = get_business_context(current_user.id)
    
    seo_keywords = keyword_service.generate_seo_keyword_set(
        business_context,
        target_services=target_services,
        competitor_analysis=True
    )
    
    return seo_keywords
```

## 📊 Performance Optimization

### Caching Strategy
- **Business Context Caching**: 30-minute TTL for business data
- **Keyword Generation Caching**: 2-hour TTL for service keywords
- **Local SEO Caching**: 1-hour TTL for location-based keywords

### Memory Management
- **Input Size Limits**: Maximum 1000 characters for text inputs
- **Collection Limits**: Maximum 1000 items in keyword lists
- **Batch Processing**: Efficient handling of multiple reviews

### Error Handling
- **Graceful Degradation**: Fallback to base keywords on errors
- **Comprehensive Logging**: Detailed error tracking and monitoring
- **Circuit Breaker Pattern**: Prevent cascade failures

## 🧪 Testing

### Run Comprehensive Tests

```bash
# Run the test suite
python test_keyword_generation_service.py

# Run integration examples
python integration_examples_keyword_service.py
```

### Test Coverage
- ✅ Service initialization and validation
- ✅ Keyword generation for all service types
- ✅ Review content analysis and extraction
- ✅ Local SEO keyword generation
- ✅ Sentiment-aware optimization
- ✅ Security validation and sanitization
- ✅ Error handling and fallbacks
- ✅ Performance with large inputs
- ✅ Integration with existing services

## 🔍 Monitoring and Analytics

### Key Metrics to Track
- **Keyword Generation Performance**: Response times and throughput
- **Review Analysis Accuracy**: Keyword extraction quality
- **SEO Impact**: Ranking improvements from optimized keywords
- **Security Events**: Blocked malicious inputs
- **Cache Hit Rates**: Caching effectiveness

### Logging Examples

```python
# Automatic logging provides insights
INFO:keyword_generation_service:Extracted 12 keywords from review text
INFO:keyword_generation_service:Generated contextual response for review 123 with service type: haircut
WARNING:keyword_generation_service:Input sanitization applied to review_text
ERROR:keyword_generation_service:Error generating contextual response for review 456: Database connection failed
```

## 🚀 Deployment Considerations

### Environment Variables
```bash
# Optional Redis for caching
REDIS_URL=redis://localhost:6379

# Database connection
DATABASE_URL=postgresql://user:pass@localhost/bookedbarber
```

### Dependencies
- `sqlalchemy`: Database ORM
- `pydantic`: Data validation
- `bleach`: HTML sanitization (from existing sanitization module)
- `redis`: Caching (optional)

### Production Checklist
- [ ] Input validation and sanitization enabled
- [ ] Database connection pooling configured
- [ ] Redis caching setup (optional but recommended)
- [ ] Monitoring and logging configured
- [ ] Rate limiting implemented
- [ ] Error alerting setup

## 🔧 Customization

### Adding New Service Keywords

```python
# Extend service keyword mapping
keyword_service.service_keyword_map["new_service"] = {
    "primary": ["new service", "custom service"],
    "techniques": ["technique1", "technique2"],
    "descriptors": ["quality", "professional"]
}
```

### Custom Sentiment Modifiers

```python
# Add custom sentiment keywords
keyword_service.sentiment_modifiers["positive"]["custom"] = [
    "exceptional", "remarkable", "outstanding"
]
```

### Industry-Specific Customization

```python
# Add industry-specific keywords
keyword_service.industry_keywords["luxury_services"] = [
    "premium grooming", "executive styling", "luxury experience"
]
```

## 📞 Support

For questions or issues with the Smart Keyword Generation Engine:

1. **Check the test suite**: Run tests to verify functionality
2. **Review integration examples**: See practical usage patterns
3. **Check logs**: Monitor application logs for detailed error information
4. **Performance monitoring**: Track metrics for optimization opportunities

## 🔄 Future Enhancements

### Planned Features
- **Machine Learning Integration**: AI-powered keyword suggestions
- **Real-time Trend Analysis**: Dynamic trending keyword updates
- **Advanced Analytics**: Keyword performance tracking
- **Multi-language Support**: Keyword generation for different languages
- **A/B Testing**: Keyword effectiveness testing

### Extensibility
The service is designed for easy extension with new features:
- Plugin architecture for custom keyword generators
- Event-driven keyword updates
- External API integrations for trend data
- Custom scoring algorithms

---

**Created for BookedBarber V2 - Smart Keyword Generation Engine**

*Empowering barbershops with intelligent keyword optimization for better SEO and customer engagement.*