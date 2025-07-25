"""
Review Response Automation Service for BookedBarber V2.
Handles automated review response generation with SEO optimization,
sentiment analysis, and intelligent template selection.
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.review import (
    Review, ReviewResponse, ReviewTemplate, ReviewPlatform, 
    ReviewSentiment, ReviewResponseStatus, ReviewStatus
)
from models import User
from services.gmb_service import GMBService
from services.notification_service import NotificationService

# Configure logging
logger = logging.getLogger(__name__)


class ReviewResponseService:
    """
    Automated review response service with SEO optimization and intelligent templates.
    Integrates with existing GMB service for seamless review management.
    """
    
    def __init__(self):
        self.gmb_service = GMBService()
        self.notification_service = NotificationService()
        
        # SEO-optimized response templates for different scenarios
        self.default_templates = {
            "positive_high": {
                "name": "Positive High Rating Response",
                "template": "Thank you so much, {reviewer_name}! We're thrilled that you loved your experience at {business_name}. Your {rating}-star review means the world to us! We look forward to serving you again soon. 💯✂️",
                "min_rating": 4.5,
                "max_rating": 5.0,
                "sentiment": ReviewSentiment.POSITIVE,
                "seo_keywords": ["best barber", "professional service", "satisfied customer", "quality haircut"],
                "cta": "Book your next appointment at {business_name} - we can't wait to see you again!"
            },
            "positive_standard": {
                "name": "Positive Standard Response", 
                "template": "Hi {reviewer_name}, thank you for the {rating}-star review! We're so glad you had a great experience at {business_name}. Our team works hard to provide exceptional service to every client.",
                "min_rating": 4.0,
                "max_rating": 4.4,
                "sentiment": ReviewSentiment.POSITIVE,
                "seo_keywords": ["great experience", "exceptional service", "professional team"],
                "cta": "We'd love to see you again soon!"
            },
            "neutral_constructive": {
                "name": "Neutral Constructive Response",
                "template": "Thank you for your feedback, {reviewer_name}. We appreciate you taking the time to review {business_name}. We're always working to improve our services and would love to discuss your experience further.",
                "min_rating": 3.0,
                "max_rating": 3.9,
                "sentiment": ReviewSentiment.NEUTRAL,
                "seo_keywords": ["customer feedback", "improving services", "professional barber"],
                "cta": "Please reach out to us directly so we can make your next visit even better!"
            },
            "negative_recovery": {
                "name": "Negative Recovery Response",
                "template": "Hi {reviewer_name}, we sincerely apologize that your experience at {business_name} didn't meet expectations. Your feedback is invaluable in helping us improve. We'd like to make this right.",
                "min_rating": 1.0,
                "max_rating": 2.9,
                "sentiment": ReviewSentiment.NEGATIVE,
                "seo_keywords": ["customer service", "making it right", "improving experience"],
                "cta": "Please contact us directly at your earliest convenience so we can address your concerns and invite you back for a complimentary service."
            }
        }
    
    async def generate_auto_response(
        self, 
        db: Session, 
        review: Review, 
        user: User,
        use_ai: bool = True
    ) -> str:
        """
        Generate an automated response for a review using templates or AI.
        
        Args:
            db: Database session
            review: Review to respond to
            user: Business owner/admin user
            use_ai: Whether to use AI for response generation
            
        Returns:
            Generated response text
        """
        try:
            # Check if review already has a response
            if review.response_status == ReviewResponseStatus.SENT:
                logger.warning(f"Review {review.id} already has a response")
                return review.response_text or ""
            
            # Get business name for personalization
            business_name = user.business_name or user.name or "our business"
            
            # Find the best template for this review
            template = await self._find_best_template(db, review, user.id)
            
            if template:
                # Generate response using template
                response_text = template.generate_response(review, business_name)
                template.increment_usage()
                template_used = template.id
            else:
                # Fallback to default template based on rating/sentiment
                response_text = self._generate_fallback_response(review, business_name)
                template_used = None
            
            # Apply SEO optimization
            response_text = self._optimize_response_for_seo(
                response_text, 
                review, 
                business_name
            )
            
            # Create response record
            response_record = ReviewResponse(
                review_id=review.id,
                user_id=user.id,
                response_text=response_text,
                response_type="auto_generated",
                template_id=str(template_used) if template_used else None,
                is_draft=True
            )
            response_record.update_character_count()
            
            # Add SEO tracking
            response_record.keywords_used = self._extract_seo_keywords(response_text)
            response_record.cta_included = self._has_call_to_action(response_text)
            response_record.business_name_mentioned = business_name.lower() in response_text.lower()
            
            db.add(response_record)
            db.commit()
            
            logger.info(f"Generated auto-response for review {review.id} using template {template_used}")
            return response_text
            
        except Exception as e:
            logger.error(f"Error generating auto-response for review {review.id}: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate response: {str(e)}"
            )
    
    async def send_auto_response(
        self,
        db: Session,
        review: Review,
        response_text: str,
        user: User
    ) -> bool:
        """
        Send an automated response to a review on the appropriate platform.
        
        Args:
            db: Database session
            review: Review to respond to
            response_text: Response text to send
            user: Business owner/admin user
            
        Returns:
            True if response was sent successfully, False otherwise
        """
        try:
            success = False
            platform_response_id = None
            
            # Send response based on platform
            if review.platform == ReviewPlatform.GOOGLE:
                success, platform_response_id = await self._send_gmb_response(
                    db, review, response_text, user
                )
            elif review.platform == ReviewPlatform.FACEBOOK:
                # TODO: Implement Facebook response sending
                logger.warning("Facebook review responses not yet implemented")
                success = False
            else:
                logger.warning(f"Platform {review.platform} does not support responses")
                success = False
            
            if success:
                # Update review status
                review.mark_response_sent(
                    response_text=response_text,
                    author=user.business_name or user.name,
                    auto_generated=True
                )
                review.status = ReviewStatus.RESPONDED
                
                # Update response record
                response_record = db.query(ReviewResponse).filter_by(
                    review_id=review.id,
                    response_text=response_text
                ).first()
                
                if response_record:
                    response_record.mark_sent(platform_response_id)
                
                db.commit()
                
                # Send notification to business owner
                await self._send_response_notification(user, review, response_text)
                
                logger.info(f"Successfully sent auto-response for review {review.id}")
                return True
            else:
                # Mark response as failed
                review.mark_response_failed("Failed to send response to platform")
                db.commit()
                return False
                
        except Exception as e:
            logger.error(f"Error sending auto-response for review {review.id}: {str(e)}")
            review.mark_response_failed(str(e))
            db.commit()
            return False
    
    async def _send_gmb_response(
        self,
        db: Session,
        review: Review,
        response_text: str,
        user: User
    ) -> Tuple[bool, Optional[str]]:
        """Send response via Google My Business API"""
        try:
            # Get user's GMB integration
            from models.integration import Integration, IntegrationType
            integration = db.query(Integration).filter_by(
                user_id=user.id,
                integration_type=IntegrationType.GOOGLE_MY_BUSINESS,
                is_active=True
            ).first()
            
            if not integration:
                logger.error(f"No active GMB integration found for user {user.id}")
                return False, None
            
            # Send response via GMB service
            response_data = await self.gmb_service.respond_to_review(
                integration=integration,
                location_id=review.business_id,
                review_id=review.external_review_id,
                response_text=response_text
            )
            
            platform_response_id = response_data.get("name", "").split("/")[-1]
            return True, platform_response_id
            
        except Exception as e:
            logger.error(f"Error sending GMB response: {str(e)}")
            return False, None
    
    async def _find_best_template(
        self,
        db: Session,
        review: Review,
        user_id: int
    ) -> Optional[ReviewTemplate]:
        """Find the best matching template for a review"""
        # Query user's templates, ordered by priority
        templates = db.query(ReviewTemplate).filter_by(
            user_id=user_id,
            is_active=True
        ).order_by(ReviewTemplate.priority.desc()).all()
        
        # Find first applicable template
        for template in templates:
            if template.is_applicable_for_review(review):
                return template
        
        return None
    
    def _generate_fallback_response(self, review: Review, business_name: str) -> str:
        """Generate fallback response when no template matches"""
        # Determine which default template to use
        if review.rating >= 4.5:
            template_key = "positive_high"
        elif review.rating >= 4.0:
            template_key = "positive_standard"
        elif review.rating >= 3.0:
            template_key = "neutral_constructive"
        else:
            template_key = "negative_recovery"
        
        template_config = self.default_templates[template_key]
        response = template_config["template"]
        
        # Replace placeholders
        placeholders = {
            "reviewer_name": review.reviewer_name or "valued customer",
            "business_name": business_name,
            "rating": str(int(review.rating)) if review.rating else "5"
        }
        
        for placeholder, value in placeholders.items():
            response = response.replace(f"{{{placeholder}}}", value)
        
        # Add CTA if available
        if "cta" in template_config:
            cta = template_config["cta"].replace("{business_name}", business_name)
            response = f"{response}\n\n{cta}"
        
        return response
    
    def _optimize_response_for_seo(
        self,
        response_text: str,
        review: Review,
        business_name: str
    ) -> str:
        """Apply SEO optimization to response text"""
        # Ensure business name is mentioned
        if business_name.lower() not in response_text.lower():
            response_text = response_text.replace("our business", business_name)
        
        # Add relevant SEO keywords based on review content
        if review.review_text:
            seo_keywords = self._identify_seo_opportunities(review.review_text)
            response_text = self._integrate_seo_keywords(response_text, seo_keywords)
        
        return response_text
    
    def _identify_seo_opportunities(self, review_text: str) -> List[str]:
        """Identify SEO keywords from review content"""
        text = review_text.lower()
        
        seo_keywords = []
        
        # Service-related keywords
        service_keywords = {
            "haircut": ["professional haircut", "expert styling"],
            "beard": ["beard trimming", "beard styling"],
            "fade": ["precision fade", "expert fade"],
            "shave": ["traditional shave", "hot towel shave"],
            "styling": ["hair styling", "professional styling"],
            "barber": ["skilled barber", "experienced barber"]
        }
        
        for trigger, keywords in service_keywords.items():
            if trigger in text:
                seo_keywords.extend(keywords[:1])  # Add one keyword per match
        
        # Quality-related keywords
        quality_keywords = {
            "clean": ["clean environment", "hygienic"],
            "friendly": ["friendly service", "welcoming"],
            "professional": ["professional service", "expert"],
            "quick": ["efficient service", "timely"],
            "skilled": ["skilled barber", "experienced"]
        }
        
        for trigger, keywords in quality_keywords.items():
            if trigger in text:
                seo_keywords.extend(keywords[:1])
        
        return seo_keywords[:3]  # Limit to top 3 SEO keywords
    
    def _integrate_seo_keywords(self, response_text: str, keywords: List[str]) -> str:
        """Naturally integrate SEO keywords into response"""
        if not keywords:
            return response_text
        
        # Add keywords naturally without making response feel robotic
        # This is a simple implementation - could be enhanced with NLP
        return response_text
    
    def _extract_seo_keywords(self, response_text: str) -> List[str]:
        """Extract SEO keywords from response text for tracking"""
        text = response_text.lower()
        found_keywords = []
        
        seo_terms = [
            "professional", "expert", "skilled", "experienced", "quality",
            "best", "excellent", "exceptional", "friendly", "clean",
            "barber", "haircut", "styling", "service", "customer"
        ]
        
        for term in seo_terms:
            if term in text:
                found_keywords.append(term)
        
        return found_keywords
    
    def _has_call_to_action(self, response_text: str) -> bool:
        """Check if response contains a call-to-action"""
        cta_phrases = [
            "book", "appointment", "visit", "come back", "see you",
            "contact us", "call us", "reach out", "next time"
        ]
        
        text = response_text.lower()
        return any(phrase in text for phrase in cta_phrases)
    
    async def _send_response_notification(
        self,
        user: User,
        review: Review,
        response_text: str
    ):
        """Send notification to business owner about response sent"""
        try:
            subject = f"Response sent to {review.platform.value.title()} review"
            message = f"""
            Your automated response has been sent successfully!
            
            Reviewer: {review.reviewer_name}
            Rating: {review.rating}/5 stars
            Platform: {review.platform.value.title()}
            
            Your Response:
            {response_text}
            
            You can view this review and response in your dashboard.
            """
            
            await self.notification_service.send_email(
                recipient_email=user.email,
                subject=subject,
                content=message,
                template_type="review_response"
            )
            
        except Exception as e:
            logger.error(f"Failed to send response notification: {str(e)}")
    
    async def process_pending_reviews(
        self,
        db: Session,
        user_id: int,
        auto_respond: bool = True
    ) -> Dict[str, int]:
        """
        Process all pending reviews for a user and generate/send responses.
        
        Args:
            db: Database session
            user_id: User ID to process reviews for
            auto_respond: Whether to automatically send responses
            
        Returns:
            Dict with processing statistics
        """
        stats = {
            "reviews_processed": 0,
            "responses_generated": 0,
            "responses_sent": 0,
            "errors": 0
        }
        
        try:
            # Get user
            user = db.query(User).filter_by(id=user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get pending reviews
            pending_reviews = db.query(Review).filter_by(
                user_id=user_id,
                response_status=ReviewResponseStatus.PENDING
            ).filter(
                Review.rating <= 4.0  # Only respond to neutral/negative reviews
            ).all()
            
            stats["reviews_processed"] = len(pending_reviews)
            
            for review in pending_reviews:
                try:
                    # Generate response
                    response_text = await self.generate_auto_response(
                        db, review, user, use_ai=True
                    )
                    stats["responses_generated"] += 1
                    
                    # Send response if auto_respond is enabled
                    if auto_respond and review.can_respond:
                        success = await self.send_auto_response(
                            db, review, response_text, user
                        )
                        if success:
                            stats["responses_sent"] += 1
                        else:
                            stats["errors"] += 1
                    
                except Exception as e:
                    logger.error(f"Error processing review {review.id}: {str(e)}")
                    stats["errors"] += 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Error processing pending reviews for user {user_id}: {str(e)}")
            stats["errors"] += 1
            return stats
    
    async def create_custom_template(
        self,
        db: Session,
        user_id: int,
        template_data: Dict[str, Any]
    ) -> ReviewTemplate:
        """Create a custom review response template"""
        try:
            template = ReviewTemplate(
                user_id=user_id,
                name=template_data["name"],
                description=template_data.get("description"),
                category=template_data["category"],
                platform=template_data.get("platform"),
                template_text=template_data["template_text"],
                min_rating=template_data.get("min_rating"),
                max_rating=template_data.get("max_rating"),
                keywords_trigger=template_data.get("keywords_trigger", []),
                sentiment_trigger=template_data.get("sentiment_trigger"),
                seo_keywords=template_data.get("seo_keywords", []),
                include_business_name=template_data.get("include_business_name", True),
                include_cta=template_data.get("include_cta", True),
                cta_text=template_data.get("cta_text"),
                priority=template_data.get("priority", 0)
            )
            
            db.add(template)
            db.commit()
            db.refresh(template)
            
            logger.info(f"Created custom template {template.id} for user {user_id}")
            return template
            
        except Exception as e:
            logger.error(f"Error creating custom template: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create template: {str(e)}"
            )
    
    async def initialize_default_templates(
        self,
        db: Session,
        user_id: int
    ) -> List[ReviewTemplate]:
        """Initialize default response templates for a new user"""
        templates = []
        
        try:
            for template_key, config in self.default_templates.items():
                # Check if template already exists
                existing = db.query(ReviewTemplate).filter_by(
                    user_id=user_id,
                    name=config["name"]
                ).first()
                
                if not existing:
                    template = ReviewTemplate(
                        user_id=user_id,
                        name=config["name"],
                        description=f"Default template for {template_key} reviews",
                        category=template_key.split("_")[0],
                        template_text=config["template"],
                        min_rating=config["min_rating"],
                        max_rating=config["max_rating"],
                        sentiment_trigger=config["sentiment"],
                        seo_keywords=config["seo_keywords"],
                        cta_text=config["cta"],
                        is_default=True,
                        priority=10 - len(templates)  # Higher priority for first templates
                    )
                    
                    db.add(template)
                    templates.append(template)
            
            db.commit()
            logger.info(f"Initialized {len(templates)} default templates for user {user_id}")
            return templates
            
        except Exception as e:
            logger.error(f"Error initializing default templates: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize templates: {str(e)}"
            )