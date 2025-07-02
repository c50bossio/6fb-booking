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
from schemas.review import (
    ReviewFilters, ReviewAnalytics, ReviewTemplateGenerateRequest,
    AutoResponseConfig, AutoResponseStats
)


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
        """Generate automatic response for a review"""
        # Determine response category based on rating and sentiment
        if review.rating >= 4 or review.sentiment == ReviewSentiment.POSITIVE:
            category = "positive"
        elif review.rating <= 2 or review.sentiment == ReviewSentiment.NEGATIVE:
            category = "negative"
        else:
            category = "neutral"
        
        # Try to find matching template first
        applicable_templates = self.get_applicable_templates(db, review.user_id, review)
        
        if applicable_templates:
            # Use the highest priority template
            template = applicable_templates[0]
            return self.generate_response_from_template(db, template, review, business_name)
        
        # Fall back to default templates
        import random
        default_responses = self.default_templates.get(category, self.default_templates["neutral"])
        template_text = random.choice(default_responses)
        
        # Replace placeholders
        placeholders = {
            "reviewer_name": review.reviewer_name or "valued customer",
            "business_name": business_name or "our business",
            "rating": str(int(review.rating)) if review.rating else "5"
        }
        
        response = template_text
        for key, value in placeholders.items():
            response = response.replace(f"{{{key}}}", value)
        
        # Apply SEO optimization
        response = self._optimize_response_for_seo(response, self.industry_keywords[:3], business_name)
        
        return response
    
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