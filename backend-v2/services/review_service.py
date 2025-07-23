"""
Review management service for BookedBarber V2.
Handles review responses, templates, sentiment analysis, and SEO optimization.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from fastapi import HTTPException

from models.review import (
    Review, ReviewResponse, ReviewTemplate, ReviewPlatform, 
    ReviewSentiment, ReviewResponseStatus
)
from schemas_new.review import (
    ReviewFilters, ReviewAnalytics, ReviewTemplateGenerateRequest,
    AutoResponseConfig, AutoResponseStats
)
from services.business_context_service import BusinessContextService, BusinessContext


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ReviewService:
    """Service for managing reviews and generating SEO-optimized responses"""
    
    def __init__(self):
        # SEO keywords for barbershop industry
        self.industry_keywords = [
            "barber", "barbershop", "haircut", "hair styling", "beard trim",
            "shave", "grooming", "men's hair", "professional", "skilled",
            "experienced", "clean", "modern", "traditional", "style"
        ]
        
        # Common response templates by sentiment
        self.default_templates = {
            "positive": [
                "Thank you so much for the {rating}-star review, {reviewer_name}! We're thrilled you had such a great experience at {business_name}. Our team takes pride in providing excellent barbering services and we're glad it shows. We look forward to seeing you again soon!",
                "Thanks for the amazing review, {reviewer_name}! It's wonderful to hear you enjoyed your experience at {business_name}. We strive to provide the best barbering services in town and your feedback means the world to us. See you next time!",
                "We're so grateful for your {rating}-star review, {reviewer_name}! At {business_name}, we're committed to delivering top-notch barbering services and it's great to know we hit the mark. Thank you for choosing us!"
            ],
            "neutral": [
                "Thank you for your review, {reviewer_name}. We appreciate your feedback about your experience at {business_name}. We're always working to improve our barbering services and would love to exceed your expectations next time. Please feel free to reach out if there's anything specific we can do better.",
                "Thanks for taking the time to review {business_name}, {reviewer_name}. We value all feedback as it helps us enhance our barbering services. We'd love the opportunity to provide you with an even better experience in the future.",
                "We appreciate your honest feedback, {reviewer_name}. At {business_name}, we're dedicated to continuous improvement in our barbering services. We hope to see you again and show you the exceptional service we're known for."
            ],
            "negative": [
                "Thank you for bringing this to our attention, {reviewer_name}. We sincerely apologize that your experience at {business_name} didn't meet your expectations. We take all feedback seriously and are committed to improving our barbering services. Please contact us directly so we can make this right and restore your confidence in our team.",
                "We're sorry to hear about your disappointing experience, {reviewer_name}. This is not the level of service we strive for at {business_name}. We'd appreciate the opportunity to discuss this with you personally and find a way to exceed your expectations. Please reach out to us directly.",
                "Thank you for your feedback, {reviewer_name}. We're genuinely sorry your visit to {business_name} didn't go as expected. Your concerns are important to us and we're taking immediate steps to address them. We'd love the chance to make things right - please contact us directly."
            ]
        }
    
    def get_reviews(
        self,
        db: Session,
        user_id: int,
        filters: ReviewFilters = None,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Review], int]:
        """Get paginated reviews with filters"""
        query = db.query(Review).filter(Review.user_id == user_id)
        
        # Apply filters
        if filters:
            if filters.platform:
                query = query.filter(Review.platform == filters.platform)
            
            if filters.sentiment:
                query = query.filter(Review.sentiment == filters.sentiment)
            
            if filters.response_status:
                query = query.filter(Review.response_status == filters.response_status)
            
            if filters.min_rating is not None:
                query = query.filter(Review.rating >= filters.min_rating)
            
            if filters.max_rating is not None:
                query = query.filter(Review.rating <= filters.max_rating)
            
            if filters.start_date:
                query = query.filter(Review.review_date >= filters.start_date)
            
            if filters.end_date:
                query = query.filter(Review.review_date <= filters.end_date)
            
            if filters.is_flagged is not None:
                query = query.filter(Review.is_flagged == filters.is_flagged)
            
            if filters.is_verified is not None:
                query = query.filter(Review.is_verified == filters.is_verified)
            
            if filters.has_response is not None:
                if filters.has_response:
                    query = query.filter(Review.response_status == ReviewResponseStatus.SENT)
                else:
                    query = query.filter(Review.response_status != ReviewResponseStatus.SENT)
            
            if filters.search_query:
                search_term = f"%{filters.search_query}%"
                query = query.filter(
                    or_(
                        Review.review_text.ilike(search_term),
                        Review.reviewer_name.ilike(search_term)
                    )
                )
            
            if filters.business_id:
                query = query.filter(Review.business_id == filters.business_id)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        sort_column = getattr(Review, sort_by, Review.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        reviews = query.offset(skip).limit(limit).all()
        
        return reviews, total
    
    def get_review_analytics(
        self,
        db: Session,
        user_id: int,
        start_date: datetime = None,
        end_date: datetime = None,
        business_id: str = None
    ) -> ReviewAnalytics:
        """Generate comprehensive review analytics"""
        # Base query
        query = db.query(Review).filter(Review.user_id == user_id)
        
        # Apply date filters
        if start_date:
            query = query.filter(Review.review_date >= start_date)
        if end_date:
            query = query.filter(Review.review_date <= end_date)
        if business_id:
            query = query.filter(Review.business_id == business_id)
        
        reviews = query.all()
        
        if not reviews:
            return ReviewAnalytics()
        
        # Basic metrics
        total_reviews = len(reviews)
        average_rating = sum(r.rating for r in reviews) / total_reviews
        
        # Rating distribution
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = len([r for r in reviews if int(r.rating) == i])
        
        # Platform breakdown
        platform_breakdown = {}
        for platform in ReviewPlatform:
            platform_reviews = [r for r in reviews if r.platform == platform]
            if platform_reviews:
                platform_breakdown[platform.value] = {
                    "count": len(platform_reviews),
                    "average_rating": sum(r.rating for r in platform_reviews) / len(platform_reviews),
                    "response_rate": len([r for r in platform_reviews if r.response_status == ReviewResponseStatus.SENT]) / len(platform_reviews) * 100
                }
        
        # Sentiment breakdown
        sentiment_breakdown = {}
        for sentiment in ReviewSentiment:
            sentiment_breakdown[sentiment.value] = len([r for r in reviews if r.sentiment == sentiment])
        
        positive_count = sentiment_breakdown.get("positive", 0) + len([r for r in reviews if r.rating >= 4])
        negative_count = sentiment_breakdown.get("negative", 0) + len([r for r in reviews if r.rating <= 2])
        
        positive_percentage = (positive_count / total_reviews) * 100 if total_reviews > 0 else 0
        negative_percentage = (negative_count / total_reviews) * 100 if total_reviews > 0 else 0
        
        # Response metrics
        responded_reviews = [r for r in reviews if r.response_status == ReviewResponseStatus.SENT]
        response_rate = (len(responded_reviews) / total_reviews) * 100 if total_reviews > 0 else 0
        
        # Calculate average response time
        response_times = []
        for review in responded_reviews:
            if review.response_date and review.review_date:
                response_time = (review.response_date - review.review_date).total_seconds() / 3600  # hours
                response_times.append(response_time)
        
        avg_response_time_hours = sum(response_times) / len(response_times) if response_times else 0
        
        auto_response_count = len([r for r in responded_reviews if r.auto_response_generated])
        auto_response_percentage = (auto_response_count / len(responded_reviews)) * 100 if responded_reviews else 0
        
        # Time-based metrics
        now = datetime.utcnow()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        
        reviews_this_month = len([r for r in reviews if r.review_date >= current_month_start])
        reviews_last_month = len([r for r in reviews if last_month_start <= r.review_date < current_month_start])
        
        month_over_month_change = 0
        if reviews_last_month > 0:
            month_over_month_change = ((reviews_this_month - reviews_last_month) / reviews_last_month) * 100
        
        # Quality metrics
        verified_reviews_count = len([r for r in reviews if r.is_verified])
        flagged_reviews_count = len([r for r in reviews if r.is_flagged])
        helpful_reviews_count = len([r for r in reviews if r.is_helpful])
        
        # SEO insights
        top_keywords = self._extract_top_keywords(reviews)
        services_mentioned = self._extract_services_mentioned(reviews)
        competitor_mentions = self._extract_competitor_mentions(reviews)
        
        return ReviewAnalytics(
            total_reviews=total_reviews,
            average_rating=round(average_rating, 2),
            rating_distribution=rating_distribution,
            platform_breakdown=platform_breakdown,
            sentiment_breakdown=sentiment_breakdown,
            positive_percentage=round(positive_percentage, 1),
            negative_percentage=round(negative_percentage, 1),
            response_rate=round(response_rate, 1),
            avg_response_time_hours=round(avg_response_time_hours, 1),
            auto_response_percentage=round(auto_response_percentage, 1),
            reviews_this_month=reviews_this_month,
            reviews_last_month=reviews_last_month,
            month_over_month_change=round(month_over_month_change, 1),
            verified_reviews_count=verified_reviews_count,
            flagged_reviews_count=flagged_reviews_count,
            helpful_reviews_count=helpful_reviews_count,
            top_keywords=top_keywords,
            services_mentioned=services_mentioned,
            competitor_mentions=competitor_mentions
        )
    
    def _extract_top_keywords(self, reviews: List[Review]) -> List[Dict[str, Any]]:
        """Extract top keywords mentioned in reviews"""
        keyword_counts = {}
        
        for review in reviews:
            if not review.review_text:
                continue
                
            text = review.review_text.lower()
            
            # Count industry keywords
            for keyword in self.industry_keywords:
                if keyword in text:
                    keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
            
            # Extract additional keywords from review text
            words = re.findall(r'\b\w+\b', text)
            for word in words:
                if len(word) > 3 and word not in ['very', 'really', 'great', 'good', 'nice']:
                    keyword_counts[word] = keyword_counts.get(word, 0) + 1
        
        # Sort by frequency and return top 10
        top_keywords = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return [{"keyword": k, "count": v, "percentage": round((v / len(reviews)) * 100, 1)} for k, v in top_keywords]
    
    def _extract_services_mentioned(self, reviews: List[Review]) -> List[Dict[str, Any]]:
        """Extract services mentioned in reviews"""
        services = [
            "haircut", "hair cut", "trim", "shave", "beard trim", "beard cut",
            "mustache", "styling", "wash", "shampoo", "blowdry", "lineup",
            "fade", "taper", "buzz cut", "scissor cut", "straight razor"
        ]
        
        service_counts = {}
        
        for review in reviews:
            if not review.review_text:
                continue
                
            text = review.review_text.lower()
            for service in services:
                if service in text:
                    service_counts[service] = service_counts.get(service, 0) + 1
        
        # Sort by frequency
        top_services = sorted(service_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return [{"service": s, "count": c, "percentage": round((c / len(reviews)) * 100, 1)} for s, c in top_services]
    
    def _extract_competitor_mentions(self, reviews: List[Review]) -> List[str]:
        """Extract competitor mentions from reviews"""
        # This would be customized based on local competitors
        competitor_patterns = [
            r'\b(?:went to|tried|from|at)\s+([A-Z][a-z]+\s+(?:Barber|Salon|Shop))\b',
            r'\b([A-Z][a-z]+\'s\s+(?:Barber|Salon|Shop))\b'
        ]
        
        competitors = set()
        
        for review in reviews:
            if not review.review_text:
                continue
                
            for pattern in competitor_patterns:
                matches = re.findall(pattern, review.review_text, re.IGNORECASE)
                competitors.update(matches)
        
        return list(competitors)[:10]  # Limit to top 10
    
    def get_applicable_templates(
        self,
        db: Session,
        user_id: int,
        review: Review
    ) -> List[ReviewTemplate]:
        """Get templates applicable for a specific review"""
        query = db.query(ReviewTemplate).filter(
            ReviewTemplate.user_id == user_id,
            ReviewTemplate.is_active == True
        )
        
        templates = query.all()
        applicable_templates = []
        
        for template in templates:
            if template.is_applicable_for_review(review):
                applicable_templates.append(template)
        
        # Sort by priority (higher first)
        applicable_templates.sort(key=lambda t: t.priority, reverse=True)
        
        return applicable_templates
    
    def generate_response_from_template(
        self,
        db: Session,
        template: ReviewTemplate,
        review: Review,
        business_name: str = None,
        custom_placeholders: Dict[str, str] = None
    ) -> str:
        """Generate a response using a template"""
        # Use business name from custom placeholders or default
        if not business_name and custom_placeholders:
            business_name = custom_placeholders.get("business_name", "our business")
        if not business_name:
            business_name = "our business"
        
        # Generate base response
        response = template.generate_response(review, business_name)
        
        # Apply custom placeholders
        if custom_placeholders:
            for key, value in custom_placeholders.items():
                response = response.replace(f"{{{key}}}", value)
        
        # Apply SEO optimization
        response = self._optimize_response_for_seo(response, template.seo_keywords, business_name)
        
        # Update template usage
        template.increment_usage()
        db.commit()
        
        return response
    
    def generate_auto_response(
        self,
        db: Session,
        review: Review,
        business_name: str = None
    ) -> str:
        """
        Generate automatic response for a review with contextual intelligence.
        Enhanced to use BusinessContextService and contextual analysis.
        """
        try:
            # Use the new contextual response generation if available
            if hasattr(self, 'generate_contextual_response'):
                try:
                    return self.generate_contextual_response(review, db)
                except Exception as e:
                    logger.warning(f"Contextual response generation failed for review {review.id}, falling back to basic method: {e}")
            
            # Original logic as fallback
            # Determine response category based on rating and sentiment
            if review.rating >= 4 or review.sentiment == ReviewSentiment.POSITIVE:
                category = "positive"
            elif review.rating <= 2 or review.sentiment == ReviewSentiment.NEGATIVE:
                category = "negative"
            else:
                category = "neutral"
            
            # Try to get business context for enhanced placeholders
            business_context = None
            try:
                business_context_service = BusinessContextService(db)
                business_context = business_context_service.get_business_context(review.user_id)
                if not business_name:
                    business_name = business_context.business_name
            except Exception as e:
                logger.debug(f"Could not get business context for review {review.id}: {e}")
            
            # Try to find matching template first
            applicable_templates = self.get_applicable_templates(db, review.user_id, review)
            
            if applicable_templates:
                # Use the highest priority template
                template = applicable_templates[0]
                response = self.generate_response_from_template(db, template, review, business_name)
                
                # Enhance with business context if available
                if business_context and hasattr(self, 'auto_populate_template_variables'):
                    try:
                        response = self.auto_populate_template_variables(response, business_context, review)
                    except Exception as e:
                        logger.debug(f"Could not enhance template with business context: {e}")
                
                return response
            
            # Enhanced fallback: Try Six Figure Barber templates first, then service-specific templates
            try:
                # Try Six Figure Barber templates as enhanced fallback
                from services.six_figure_barber_templates import SixFigureBarberTemplates
                six_fb_templates = SixFigureBarberTemplates()
                
                review_analysis = self.analyze_review_content(review.review_text or "")
                service_type = review_analysis.get("service_type", "general")
                
                # Get Six Figure Barber aligned template
                six_fb_template = six_fb_templates.get_six_figure_barber_template(
                    service_type, category, business_context
                )
                
                # Use Six Figure Barber template with business context
                if business_context:
                    enhanced_template = six_fb_templates.enhance_template_with_six_figure_barber_context(
                        six_fb_template, business_context, review
                    )
                    response = self.auto_populate_template_variables(enhanced_template, business_context, review)
                    
                    # Apply Six Figure Barber SEO optimization
                    six_fb_keywords = six_fb_templates.get_six_figure_barber_seo_keywords(service_type)
                    response = self._optimize_response_for_seo(response, six_fb_keywords[:3], business_name)
                    
                    logger.info(f"Used Six Figure Barber fallback template for review {review.id}")
                    return response
                else:
                    # Basic Six Figure Barber template replacement
                    placeholders = {
                        "reviewer_name": review.reviewer_name or "valued customer",
                        "business_name": business_name or "our business",
                        "rating": str(int(review.rating)) if review.rating else "5"
                    }
                    
                    response = six_fb_template
                    for key, value in placeholders.items():
                        response = response.replace(f"{{{key}}}", value)
                    
                    return response
                        
            except Exception as e:
                logger.debug(f"Six Figure Barber template fallback failed, trying service-specific: {e}")
                
                # Fallback to original service-specific templates
                if hasattr(self, 'analyze_review_content') and hasattr(self, 'get_service_specific_template'):
                    try:
                        review_analysis = self.analyze_review_content(review.review_text or "")
                        service_template = self.get_service_specific_template(
                            review_analysis.get("service_type", "general"), 
                            category
                        )
                        
                        # Use service-specific template with business context
                        if business_context:
                            response = self.auto_populate_template_variables(service_template, business_context, review)
                            return response
                        else:
                            # Basic placeholder replacement
                            template_text = service_template
                            placeholders = {
                                "reviewer_name": review.reviewer_name or "valued customer",
                                "business_name": business_name or "our business",
                                "rating": str(int(review.rating)) if review.rating else "5"
                            }
                            
                            response = template_text
                            for key, value in placeholders.items():
                                response = response.replace(f"{{{key}}}", value)
                            
                            return response
                            
                    except Exception as e:
                        logger.debug(f"Service-specific template generation failed: {e}")
            
            # Original fallback to default templates
            import random
            default_responses = self.default_templates.get(category, self.default_templates["neutral"])
            template_text = random.choice(default_responses)
            
            # Enhanced placeholder replacement
            placeholders = {
                "reviewer_name": review.reviewer_name or "valued customer",
                "business_name": business_name or "our business",
                "rating": str(int(review.rating)) if review.rating else "5"
            }
            
            # Add business context placeholders if available
            if business_context:
                placeholders.update({
                    "location_name": business_context.location_name or business_context.business_name,
                    "city": business_context.city or "",
                    "barber_name": business_context.barber_names[0] if business_context.barber_names else "our skilled barber"
                })
            
            response = template_text
            for key, value in placeholders.items():
                if value:  # Only replace if we have a value
                    response = response.replace(f"{{{key}}}", value)
            
            # Apply SEO optimization with enhanced keywords
            seo_keywords = self.industry_keywords[:3]
            if business_context and hasattr(business_context_service, 'get_service_keywords'):
                try:
                    # Get service-specific keywords if available
                    service_keywords = business_context_service.get_service_keywords([])
                    seo_keywords = service_keywords[:3] if service_keywords else seo_keywords
                except:
                    pass
            
            response = self._optimize_response_for_seo(response, seo_keywords, business_name)
            
            return response
            
        except Exception as e:
            logger.error(f"Error in enhanced generate_auto_response for review {review.id}: {e}")
            # Ultimate fallback - basic response
            return f"Thank you for your review, {review.reviewer_name or 'valued customer'}! We appreciate your feedback and look forward to serving you again at {business_name or 'our business'}."
    
    def _optimize_response_for_seo(
        self,
        response: str,
        seo_keywords: List[str] = None,
        business_name: str = None
    ) -> str:
        """Optimize response for SEO while maintaining natural tone"""
        if not seo_keywords:
            seo_keywords = []
        
        # Ensure business name is mentioned if not already present
        if business_name and business_name.lower() not in response.lower():
            # Add business name naturally
            if "thank you" in response.lower():
                response = response.replace("Thank you", f"Thank you for choosing {business_name}")
            elif "thanks" in response.lower():
                response = response.replace("Thanks", f"Thanks for visiting {business_name}")
        
        # Add relevant SEO keywords naturally
        keyword_phrases = []
        for keyword in seo_keywords[:2]:  # Limit to 2 keywords to avoid keyword stuffing
            if keyword.lower() not in response.lower():
                keyword_phrases.append(keyword)
        
        if keyword_phrases and "service" in response.lower():
            # Replace generic "service" with "barbering service" or similar
            for phrase in keyword_phrases:
                if phrase in ["barber", "barbering", "barbershop"]:
                    response = re.sub(r'\bservice\b', f"{phrase} service", response, count=1, flags=re.IGNORECASE)
                    break
        
        return response
    
    def create_review_response(
        self,
        db: Session,
        review_id: int,
        user_id: int,
        response_text: str,
        template_id: int = None,
        auto_generated: bool = False
    ) -> ReviewResponse:
        """Create a new review response"""
        # Validate review exists and belongs to user
        review = db.query(Review).filter(
            Review.id == review_id,
            Review.user_id == user_id
        ).first()
        
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        if not review.can_respond:
            raise HTTPException(status_code=400, detail="Cannot respond to this review")
        
        # Analyze response for SEO metrics
        keywords_used = []
        for keyword in self.industry_keywords:
            if keyword.lower() in response_text.lower():
                keywords_used.append(keyword)
        
        # Create response
        review_response = ReviewResponse(
            review_id=review_id,
            user_id=user_id,
            response_text=response_text,
            response_type="auto_generated" if auto_generated else "custom",
            template_id=str(template_id) if template_id else None,
            keywords_used=keywords_used,
            cta_included="contact" in response_text.lower() or "visit" in response_text.lower(),
            business_name_mentioned=any(word.istitle() for word in response_text.split()),
            character_count=len(response_text)
        )
        
        db.add(review_response)
        db.commit()
        db.refresh(review_response)
        
        return review_response
    
    def send_review_response(
        self,
        db: Session,
        response_id: int,
        user_id: int,
        platform_response_id: str = None
    ) -> ReviewResponse:
        """Mark a review response as sent"""
        response = db.query(ReviewResponse).filter(
            ReviewResponse.id == response_id,
            ReviewResponse.user_id == user_id
        ).first()
        
        if not response:
            raise HTTPException(status_code=404, detail="Review response not found")
        
        if response.is_sent:
            raise HTTPException(status_code=400, detail="Response already sent")
        
        # Mark response as sent
        response.mark_sent(platform_response_id)
        
        # Update the review's response status
        review = response.review
        review.mark_response_sent(
            response.response_text,
            "Business Owner",  # Could be customized
            response.response_type == "auto_generated"
        )
        
        db.commit()
        
        return response
    
    def get_auto_response_stats(
        self,
        db: Session,
        user_id: int,
        days_back: int = 30
    ) -> AutoResponseStats:
        """Get statistics for auto-response system"""
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get all auto-generated responses
        auto_responses = db.query(ReviewResponse).join(Review).filter(
            Review.user_id == user_id,
            ReviewResponse.response_type == "auto_generated",
            ReviewResponse.created_at >= start_date
        ).all()
        
        # Calculate stats
        total_auto_responses = len(auto_responses)
        
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        
        auto_responses_today = len([r for r in auto_responses if r.created_at >= today_start])
        auto_responses_this_week = len([r for r in auto_responses if r.created_at >= week_start])
        auto_responses_this_month = len([r for r in auto_responses if r.created_at >= month_start])
        
        # Success rate (responses that were actually sent)
        sent_responses = [r for r in auto_responses if r.is_sent]
        success_rate = (len(sent_responses) / total_auto_responses * 100) if total_auto_responses > 0 else 0
        
        # Average response time
        response_times = []
        for response in sent_responses:
            if response.sent_at and response.review.review_date:
                response_time = (response.sent_at - response.review.review_date).total_seconds() / 3600
                response_times.append(response_time)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Most used template
        template_usage = {}
        for response in auto_responses:
            template_id = response.template_id or "default"
            template_usage[template_id] = template_usage.get(template_id, 0) + 1
        
        most_used_template = max(template_usage.items(), key=lambda x: x[1])[0] if template_usage else None
        
        # Platform breakdown
        platform_breakdown = {}
        for response in auto_responses:
            platform = response.review.platform.value
            platform_breakdown[platform] = platform_breakdown.get(platform, 0) + 1
        
        return AutoResponseStats(
            total_auto_responses=total_auto_responses,
            auto_responses_today=auto_responses_today,
            auto_responses_this_week=auto_responses_this_week,
            auto_responses_this_month=auto_responses_this_month,
            success_rate=round(success_rate, 1),
            average_response_time_hours=round(avg_response_time, 1),
            most_used_template=most_used_template,
            platform_breakdown=platform_breakdown
        )
    
    # ============= CONTEXTUAL AI INTELLIGENCE METHODS =============
    
    def generate_contextual_response(self, review: Review, db: Session) -> str:
        """
        Generate a contextually intelligent response using BusinessContextService.
        Enhanced with Six Figure Barber methodology alignment.
        
        Args:
            review: Review object to generate response for
            db: Database session
            
        Returns:
            Contextually enhanced response string
            
        Raises:
            HTTPException: If review is invalid or response generation fails
            ValueError: If required context cannot be retrieved
        """
        try:
            # Import Six Figure Barber templates
            from services.six_figure_barber_templates import SixFigureBarberTemplates
            
            # Validate inputs
            if not review:
                raise ValueError("Review cannot be None")
            if not review.user_id:
                raise ValueError("Review must have a valid user_id")
            if not db:
                raise ValueError("Database session cannot be None")
            
            # Get business context
            business_context_service = BusinessContextService(db)
            business_context = business_context_service.get_business_context(review.user_id)
            
            # Analyze review content for contextual insights
            review_analysis = self.analyze_review_content(review.review_text or "")
            
            # Initialize Six Figure Barber templates
            six_fb_templates = SixFigureBarberTemplates()
            
            # Determine response category
            template_category = self._determine_response_category(review, review_analysis)
            service_type = review_analysis.get("service_type", "general")
            
            # Try to find matching custom template first
            applicable_templates = self.get_applicable_templates(db, review.user_id, review)
            
            if applicable_templates:
                # Use highest priority template with Six Figure Barber enhancement
                template = applicable_templates[0]
                response = self.generate_response_from_template(
                    db, template, review, business_context.business_name
                )
                # Enhance with Six Figure Barber methodology
                response = six_fb_templates.enhance_template_with_six_figure_barber_context(
                    response, business_context, review
                )
                # Further enhance with business context
                response = self.auto_populate_template_variables(
                    response, business_context, review
                )
            else:
                # Use Six Figure Barber methodology-aligned template
                six_fb_template = six_fb_templates.get_six_figure_barber_template(
                    service_type, template_category, business_context
                )
                
                # Enhance with Six Figure Barber context
                enhanced_template = six_fb_templates.enhance_template_with_six_figure_barber_context(
                    six_fb_template, business_context, review
                )
                
                # Populate with business variables
                response = self.auto_populate_template_variables(
                    enhanced_template, business_context, review
                )
            
            # Apply Six Figure Barber SEO optimization
            six_fb_keywords = six_fb_templates.get_six_figure_barber_seo_keywords(service_type)
            response = self._optimize_response_for_seo(
                response, six_fb_keywords[:3], business_context.business_name
            )
            
            # Apply contextual SEO optimization
            response = self._apply_contextual_seo_optimization(
                response, business_context, review_analysis
            )
            
            # Validate Six Figure Barber compliance
            validation_results = six_fb_templates.validate_six_figure_barber_template(response)
            if not validation_results["compliant"]:
                logger.warning(f"Six Figure Barber template validation failed for review {review.id}: "
                             f"{validation_results['issues']}")
            
            # Log contextual response generation
            logger.info(f"Generated Six Figure Barber aligned response for review {review.id} "
                       f"with service type: {service_type}, compliance score: {validation_results['score']}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating Six Figure Barber contextual response for review {review.id}: {e}")
            # Fallback to existing auto-response system
            return self.generate_auto_response(db, review, business_context.business_name if 'business_context' in locals() else None)
    
    def analyze_review_content(self, review_text: str) -> Dict[str, Any]:
        """
        Analyze review content to extract contextual information.
        
        Args:
            review_text: The text content of the review
            
        Returns:
            Dictionary containing analysis results with keys:
                - service_type: Detected service type (haircut, shave, beard, etc.)
                - sentiment_keywords: Key phrases that indicate sentiment
                - local_references: Any local area/landmark references
                - barber_mentions: Specific barber name mentions
                - service_quality_indicators: Words indicating service quality
                - time_references: References to time/duration
                - price_mentions: Any price/value references
        """
        if not review_text:
            return {
                "service_type": "general",
                "sentiment_keywords": [],
                "local_references": [],
                "barber_mentions": [],
                "service_quality_indicators": [],
                "time_references": [],
                "price_mentions": []
            }
        
        # Convert to lowercase for analysis
        text_lower = review_text.lower()
        
        # Service type detection
        service_keywords = {
            "haircut": ["haircut", "hair cut", "cut", "trim", "style", "fade", "buzz", "scissor"],
            "shave": ["shave", "shaving", "razor", "straight razor", "hot shave", "face"],
            "beard": ["beard", "beard trim", "mustache", "goatee", "facial hair"],
            "wash": ["wash", "shampoo", "clean", "rinse"],
            "styling": ["style", "styling", "pomade", "gel", "wax", "product"],
            "color": ["color", "dye", "highlights", "gray", "grey"],
            "general": ["service", "experience", "visit", "appointment"]
        }
        
        detected_service = "general"
        service_score = 0
        
        for service_type, keywords in service_keywords.items():
            current_score = sum(1 for keyword in keywords if keyword in text_lower)
            if current_score > service_score:
                service_score = current_score
                detected_service = service_type
        
        # Sentiment keywords extraction
        positive_indicators = [
            "great", "excellent", "amazing", "fantastic", "wonderful", "perfect",
            "professional", "skilled", "friendly", "clean", "quick", "efficient",
            "recommend", "satisfied", "happy", "pleased", "impressed", "love"
        ]
        
        negative_indicators = [
            "bad", "terrible", "awful", "disappointing", "unprofessional", "rude",
            "slow", "dirty", "expensive", "overpriced", "rushed", "careless",
            "mistake", "wrong", "dissatisfied", "unhappy", "complaint"
        ]
        
        sentiment_keywords = []
        for word in positive_indicators + negative_indicators:
            if word in text_lower:
                sentiment_keywords.append(word)
        
        # Local references detection
        local_indicators = [
            "neighborhood", "area", "downtown", "uptown", "near", "close to",
            "location", "convenient", "parking", "drive", "walk"
        ]
        
        local_references = []
        for indicator in local_indicators:
            if indicator in text_lower:
                local_references.append(indicator)
        
        # Barber name mentions (look for capitalized names)
        import re
        barber_mentions = []
        # Look for patterns like "John did" or "with Mike" or "barber named David"
        name_patterns = [
            r'\b([A-Z][a-z]+)\s+(?:did|was|cut|gave|provided)',
            r'(?:with|by|barber)\s+([A-Z][a-z]+)',
            r'(?:named|called)\s+([A-Z][a-z]+)'
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, review_text)
            barber_mentions.extend(matches)
        
        # Service quality indicators
        quality_indicators = []
        quality_words = [
            "professional", "experienced", "skilled", "talented", "careful",
            "thorough", "detailed", "precise", "artistic", "creative"
        ]
        
        for word in quality_words:
            if word in text_lower:
                quality_indicators.append(word)
        
        # Time references
        time_references = []
        time_words = [
            "quick", "fast", "slow", "rushed", "took time", "patient",
            "efficient", "prompt", "on time", "waiting"
        ]
        
        for word in time_words:
            if word in text_lower:
                time_references.append(word)
        
        # Price mentions
        price_mentions = []
        price_indicators = [
            "price", "cost", "expensive", "cheap", "affordable", "value",
            "worth", "money", "charge", "fee", "$", "dollar"
        ]
        
        for indicator in price_indicators:
            if indicator in text_lower:
                price_mentions.append(indicator)
        
        return {
            "service_type": detected_service,
            "sentiment_keywords": sentiment_keywords,
            "local_references": local_references,
            "barber_mentions": list(set(barber_mentions)),  # Remove duplicates
            "service_quality_indicators": quality_indicators,
            "time_references": time_references,
            "price_mentions": price_mentions
        }
    
    def get_service_specific_template(self, service_type: str, sentiment: str) -> str:
        """
        Get a template tailored to specific service type and sentiment.
        
        Args:
            service_type: Type of service (haircut, shave, beard, etc.)
            sentiment: Response sentiment (positive, negative, neutral)
            
        Returns:
            Service-specific template string with placeholders
        """
        # Service-specific templates
        service_templates = {
            "haircut": {
                "positive": [
                    "Thank you so much for the {rating}-star review, {reviewer_name}! We're thrilled you loved your haircut at {business_name}. {barber_name} takes great pride in creating the perfect cut for each client. We look forward to keeping your style fresh - see you next time!",
                    "Thanks for the amazing feedback, {reviewer_name}! It's wonderful to hear your haircut exceeded expectations at {business_name}. Our skilled barbers are passionate about delivering precision cuts that look and feel great. We can't wait to style you again!",
                    "We're so grateful for your {rating}-star review, {reviewer_name}! At {business_name}, we believe every haircut should be a masterpiece, and we're glad we delivered exactly that. Thank you for trusting us with your style!"
                ],
                "negative": [
                    "We sincerely apologize that your haircut at {business_name} didn't meet your expectations, {reviewer_name}. This is not the level of precision and artistry we strive for. Please contact us directly - we'd love to make this right with a complimentary restyle and restore your confidence in our barbering skills.",
                    "Thank you for bringing this to our attention, {reviewer_name}. We're genuinely sorry your haircut experience at {business_name} was disappointing. Our barbers are committed to excellence, and we clearly missed the mark. Please reach out so we can correct this and show you the quality craftsmanship we're known for.",
                    "We're deeply sorry about your haircut experience, {reviewer_name}. At {business_name}, every cut should be perfect, and we failed to deliver that standard. We'd appreciate the opportunity to make this right - please contact us for a complimentary correction."
                ],
                "neutral": [
                    "Thank you for your honest feedback about your haircut at {business_name}, {reviewer_name}. We appreciate all input as it helps us refine our cutting techniques and client experience. We'd love the opportunity to exceed your expectations next time and show you why our clients keep coming back.",
                    "Thanks for taking the time to review your haircut experience, {reviewer_name}. At {business_name}, we're always working to perfect our craft and client service. We hope to see you again and deliver the exceptional cut you deserve."
                ]
            },
            "shave": {
                "positive": [
                    "Thank you for the {rating}-star review, {reviewer_name}! We're delighted you enjoyed your shave at {business_name}. There's nothing quite like a professional hot shave, and we're proud to continue this classic barbering tradition. Looking forward to your next visit!",
                    "Thanks for the fantastic feedback, {reviewer_name}! It's wonderful to hear you had such a smooth experience with your shave at {business_name}. Our barbers are masters of the straight razor and hot towel technique. See you soon for another classic shave!",
                    "We're thrilled you loved your shave experience, {reviewer_name}! At {business_name}, we take pride in our traditional shaving services and attention to detail. Thank you for appreciating the art of the perfect shave!"
                ],
                "negative": [
                    "We're truly sorry your shave at {business_name} didn't meet expectations, {reviewer_name}. A professional shave should be relaxing and precise, and we clearly didn't deliver that experience. Please contact us directly - we'd like to provide a complimentary service to restore your confidence in our traditional barbering skills.",
                    "Thank you for your feedback, {reviewer_name}. We sincerely apologize that your shave at {business_name} was disappointing. Our barbers are trained in classical techniques, and this experience doesn't reflect our standards. We'd appreciate the chance to make this right."
                ],
                "neutral": [
                    "Thank you for your review of your shave experience, {reviewer_name}. We value your feedback as we continue to perfect our traditional barbering services at {business_name}. We'd love to show you the exceptional shave experience that keeps our clients coming back."
                ]
            },
            "beard": {
                "positive": [
                    "Thank you for the {rating}-star review, {reviewer_name}! We're so glad you're happy with your beard trim at {business_name}. Proper beard grooming is an art, and we're thrilled we could help you look and feel your best. Keep that beard looking sharp!",
                    "Thanks for the amazing feedback on your beard service, {reviewer_name}! At {business_name}, we understand that every beard is unique and requires a personalized approach. We're delighted our attention to detail showed. See you for your next trim!",
                    "We're grateful for your {rating}-star review, {reviewer_name}! Beard trimming and styling is one of our specialties at {business_name}, and we're proud to help you maintain that perfect look. Thanks for trusting us with your grooming!"
                ],
                "negative": [
                    "We sincerely apologize that your beard service at {business_name} didn't meet your expectations, {reviewer_name}. Proper beard grooming requires skill and attention to detail, and we clearly fell short. Please contact us directly - we'd like to correct this with a complimentary trim and restore your confidence in our grooming expertise.",
                    "Thank you for bringing this to our attention, {reviewer_name}. We're sorry your beard trim experience at {business_name} was disappointing. Our barbers are trained in precision grooming techniques, and this doesn't reflect our standards. We'd appreciate the opportunity to make this right."
                ],
                "neutral": [
                    "Thank you for your feedback on your beard service, {reviewer_name}. We appreciate your input as it helps us improve our grooming techniques at {business_name}. We'd love the chance to show you the exceptional beard care that our regular clients experience."
                ]
            },
            "general": {
                "positive": [
                    "Thank you so much for the {rating}-star review, {reviewer_name}! We're thrilled you had such a great experience at {business_name}. Our team takes pride in providing excellent barbering services and creating a welcoming atmosphere. We look forward to seeing you again soon!",
                    "Thanks for the wonderful feedback, {reviewer_name}! It's fantastic to hear you enjoyed your visit to {business_name}. We strive to provide top-notch barbering services and exceptional customer care. Your satisfaction means everything to us!",
                    "We're so grateful for your {rating}-star review, {reviewer_name}! At {business_name}, we're committed to delivering outstanding barbering services and making every client feel valued. Thank you for choosing us and sharing your positive experience!"
                ],
                "negative": [
                    "Thank you for bringing this to our attention, {reviewer_name}. We sincerely apologize that your experience at {business_name} didn't meet your expectations. We take all feedback seriously and are committed to improving our services. Please contact us directly so we can make this right and restore your confidence in our team.",
                    "We're sorry to hear about your disappointing experience, {reviewer_name}. This is not the level of service we strive for at {business_name}. Your concerns are important to us, and we'd appreciate the opportunity to discuss this with you personally and find a way to exceed your expectations.",
                    "Thank you for your honest feedback, {reviewer_name}. We're genuinely sorry your visit to {business_name} didn't go as expected. We're taking immediate steps to address your concerns and would love the chance to make things right - please contact us directly."
                ],
                "neutral": [
                    "Thank you for your review, {reviewer_name}. We appreciate your feedback about your experience at {business_name}. We're always working to improve our barbering services and client experience. We'd love the opportunity to exceed your expectations next time you visit.",
                    "Thanks for taking the time to review {business_name}, {reviewer_name}. We value all feedback as it helps us enhance our services and atmosphere. We hope to see you again and provide you with the exceptional barbering experience we're known for."
                ]
            }
        }
        
        # Get templates for service type, fallback to general if not found
        service_templates_dict = service_templates.get(service_type, service_templates["general"])
        sentiment_templates = service_templates_dict.get(sentiment, service_templates_dict.get("neutral", service_templates["general"]["neutral"]))
        
        # Return a random template from the appropriate category
        import random
        return random.choice(sentiment_templates)
    
    def auto_populate_template_variables(self, template: str, context: BusinessContext, review: Review) -> str:
        """
        Auto-populate template variables using business context and review data.
        
        Args:
            template: Template string with placeholders
            context: BusinessContext object with business information
            review: Review object with review details
            
        Returns:
            Template with all placeholders replaced with actual values
        """
        try:
            # Sanitize inputs
            if not template:
                return ""
            if not context:
                raise ValueError("BusinessContext cannot be None")
            if not review:
                raise ValueError("Review cannot be None")
            
            # Create comprehensive placeholder mapping
            placeholders = {
                # Basic review data
                "reviewer_name": self._sanitize_placeholder_value(review.reviewer_name or "valued customer"),
                "rating": str(int(review.rating)) if review.rating else "5",
                "review_date": review.review_date.strftime("%B %Y") if review.review_date else "",
                
                # Business context data
                "business_name": self._sanitize_placeholder_value(context.business_name),
                "location_name": self._sanitize_placeholder_value(context.location_name or context.business_name),
                "city": self._sanitize_placeholder_value(context.city or ""),
                "state": self._sanitize_placeholder_value(context.state or ""),
                
                # Service-specific data
                "service_type": self._infer_service_from_template(template),
                
                # Dynamic barber name selection
                "barber_name": self._select_contextual_barber_name(context, review),
                
                # Location-specific enhancements
                "location_reference": self._generate_location_reference(context),
                "local_seo_phrase": self._generate_local_seo_phrase(context)
            }
            
            # Replace all placeholders
            populated_template = template
            for placeholder, value in placeholders.items():
                if value:  # Only replace if we have a value
                    populated_template = populated_template.replace(f"{{{placeholder}}}", value)
            
            # Clean up any remaining unreplaced placeholders
            populated_template = self._clean_unreplaced_placeholders(populated_template)
            
            return populated_template
            
        except Exception as e:
            logger.error(f"Error auto-populating template variables: {e}")
            # Return original template as fallback
            return template
    
    def _determine_response_category(self, review: Review, analysis: Dict[str, Any]) -> str:
        """Determine response category based on review and analysis"""
        if review.rating >= 4 or review.sentiment == ReviewSentiment.POSITIVE:
            return "positive"
        elif review.rating <= 2 or review.sentiment == ReviewSentiment.NEGATIVE:
            return "negative"
        else:
            return "neutral"
    
    def _apply_contextual_seo_optimization(self, response: str, context: BusinessContext, analysis: Dict[str, Any]) -> str:
        """Apply contextual SEO optimization to response"""
        # Add location-based SEO if not present
        if context.city and context.city.lower() not in response.lower():
            if "thank you" in response.lower():
                response = response.replace(
                    "Thank you", 
                    f"Thank you for choosing {context.business_name} in {context.city}"
                )
        
        # Add service-specific keywords naturally
        service_type = analysis.get("service_type", "general")
        if service_type != "general" and service_type not in response.lower():
            # Add service keyword naturally
            response = response.replace(
                "service", 
                f"{service_type} service", 
                1  # Only replace first occurrence
            )
        
        return response
    
    def _sanitize_placeholder_value(self, value: str) -> str:
        """Sanitize placeholder values to prevent injection attacks"""
        if not value:
            return ""
        
        # Remove potentially malicious characters
        import re
        sanitized = re.sub(r'[<>"\';\\]', '', str(value))
        return sanitized.strip()
    
    def _infer_service_from_template(self, template: str) -> str:
        """Infer service type from template content"""
        template_lower = template.lower()
        
        if "haircut" in template_lower or "cut" in template_lower:
            return "haircut"
        elif "shave" in template_lower:
            return "shave"
        elif "beard" in template_lower:
            return "beard trim"
        elif "styling" in template_lower:
            return "hair styling"
        else:
            return "barbering"
    
    def _select_contextual_barber_name(self, context: BusinessContext, review: Review) -> str:
        """Select appropriate barber name based on context"""
        # If review mentions a specific barber name, use that
        review_analysis = self.analyze_review_content(review.review_text or "")
        if review_analysis.get("barber_mentions"):
            return review_analysis["barber_mentions"][0]
        
        # Otherwise, use first available barber name or generic reference
        if context.barber_names:
            return context.barber_names[0]
        
        return "our skilled barber"
    
    def _generate_location_reference(self, context: BusinessContext) -> str:
        """Generate location reference for templates"""
        if context.city and context.state:
            return f"in {context.city}, {context.state}"
        elif context.city:
            return f"in {context.city}"
        elif context.location_name:
            return f"at {context.location_name}"
        else:
            return ""
    
    def _generate_local_seo_phrase(self, context: BusinessContext) -> str:
        """Generate local SEO phrase"""
        if context.city:
            return f"the best barbershop in {context.city}"
        else:
            return "your neighborhood barbershop"
    
    def _clean_unreplaced_placeholders(self, text: str) -> str:
        """Clean up any placeholders that weren't replaced"""
        import re
        # Remove any remaining {placeholder} patterns
        cleaned = re.sub(r'\{[^}]+\}', '', text)
        # Clean up extra spaces
        cleaned = re.sub(r'\s+', ' ', cleaned)
        return cleaned.strip()
    
    # ============= ENHANCED VALIDATION AND ERROR HANDLING =============
    
    def _validate_review_input(self, review: Review) -> None:
        """
        Comprehensive validation for review input.
        
        Args:
            review: Review object to validate
            
        Raises:
            ValueError: If review is invalid
            HTTPException: If review fails business rules validation
        """
        if not review:
            raise ValueError("Review cannot be None or empty")
        
        if not hasattr(review, 'id') or review.id is None:
            raise ValueError("Review must have a valid ID")
        
        if not hasattr(review, 'user_id') or review.user_id is None:
            raise ValueError("Review must have a valid user_id")
        
        if not hasattr(review, 'rating') or review.rating is None:
            raise ValueError("Review must have a rating")
        
        # Validate rating range
        if not (0 <= review.rating <= 5):
            raise ValueError(f"Review rating must be between 0 and 5, got: {review.rating}")
        
        # Validate review text length if present
        if hasattr(review, 'review_text') and review.review_text:
            if len(review.review_text) > 10000:  # Reasonable limit
                raise ValueError("Review text is too long (maximum 10,000 characters)")
        
        # Validate reviewer name if present
        if hasattr(review, 'reviewer_name') and review.reviewer_name:
            if len(review.reviewer_name) > 255:
                raise ValueError("Reviewer name is too long (maximum 255 characters)")
            
            # Check for potentially malicious content
            import re
            if re.search(r'[<>"\';\\]', review.reviewer_name):
                raise ValueError("Reviewer name contains invalid characters")
    
    def _validate_db_session(self, db: Session) -> None:
        """
        Validate database session.
        
        Args:
            db: Database session to validate
            
        Raises:
            ValueError: If session is invalid
        """
        if not db:
            raise ValueError("Database session cannot be None")
        
        try:
            # Test the connection
            db.execute("SELECT 1")
        except Exception as e:
            raise ValueError(f"Database session is not valid: {e}")
    
    def _validate_business_context(self, context: BusinessContext) -> None:
        """
        Validate business context object.
        
        Args:
            context: BusinessContext to validate
            
        Raises:
            ValueError: If context is invalid
        """
        if not context:
            raise ValueError("BusinessContext cannot be None")
        
        if not hasattr(context, 'business_name') or not context.business_name:
            raise ValueError("BusinessContext must have a valid business_name")
        
        # Validate business name length and content
        if len(context.business_name) > 255:
            raise ValueError("Business name is too long (maximum 255 characters)")
        
        # Sanitize business name
        import re
        if re.search(r'[<>"\';\\]', context.business_name):
            raise ValueError("Business name contains invalid characters")
    
    def _safe_get_business_context(self, db: Session, user_id: int) -> Optional[BusinessContext]:
        """
        Safely retrieve business context with comprehensive error handling.
        
        Args:
            db: Database session
            user_id: User ID to get context for
            
        Returns:
            BusinessContext object or None if retrieval fails
        """
        try:
            self._validate_db_session(db)
            
            if not user_id or user_id <= 0:
                logger.warning(f"Invalid user_id provided: {user_id}")
                return None
            
            business_context_service = BusinessContextService(db)
            context = business_context_service.get_business_context(user_id)
            
            self._validate_business_context(context)
            
            return context
            
        except ValueError as e:
            logger.warning(f"Validation error getting business context for user {user_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting business context for user {user_id}: {e}")
            return None
    
    def _safe_analyze_review_content(self, review_text: str) -> Dict[str, Any]:
        """
        Safely analyze review content with error handling.
        
        Args:
            review_text: Review text to analyze
            
        Returns:
            Analysis results dictionary with safe defaults
        """
        try:
            if not review_text or not isinstance(review_text, str):
                return self._get_default_analysis_result()
            
            # Limit text length for analysis
            if len(review_text) > 10000:
                review_text = review_text[:10000]
                logger.warning("Review text truncated for analysis due to length")
            
            return self.analyze_review_content(review_text)
            
        except Exception as e:
            logger.error(f"Error analyzing review content: {e}")
            return self._get_default_analysis_result()
    
    def _get_default_analysis_result(self) -> Dict[str, Any]:
        """Get default analysis result for error cases"""
        return {
            "service_type": "general",
            "sentiment_keywords": [],
            "local_references": [],
            "barber_mentions": [],
            "service_quality_indicators": [],
            "time_references": [],
            "price_mentions": []
        }
    
    def _safe_template_population(self, template: str, context: BusinessContext, review: Review) -> str:
        """
        Safely populate template with comprehensive error handling.
        
        Args:
            template: Template string to populate
            context: Business context
            review: Review object
            
        Returns:
            Populated template or safe fallback
        """
        try:
            if not template:
                return self._get_emergency_fallback_response(review, context)
            
            self._validate_business_context(context)
            self._validate_review_input(review)
            
            return self.auto_populate_template_variables(template, context, review)
            
        except Exception as e:
            logger.error(f"Error populating template: {e}")
            return self._get_emergency_fallback_response(review, context)
    
    def _get_emergency_fallback_response(self, review: Review, context: BusinessContext = None) -> str:
        """
        Generate emergency fallback response when all else fails.
        
        Args:
            review: Review object
            context: Optional business context
            
        Returns:
            Safe fallback response string
        """
        try:
            reviewer_name = "valued customer"
            business_name = "our business"
            
            if review and hasattr(review, 'reviewer_name') and review.reviewer_name:
                reviewer_name = self._sanitize_placeholder_value(review.reviewer_name)
            
            if context and hasattr(context, 'business_name') and context.business_name:
                business_name = self._sanitize_placeholder_value(context.business_name)
            
            return (f"Thank you for your review, {reviewer_name}! "
                   f"We appreciate your feedback and look forward to serving you again at {business_name}.")
                   
        except Exception as e:
            logger.critical(f"Emergency fallback response generation failed: {e}")
            return "Thank you for your review! We appreciate your feedback and look forward to serving you again."