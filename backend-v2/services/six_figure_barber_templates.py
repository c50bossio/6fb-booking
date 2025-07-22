"""
Six Figure Barber Program Aligned Review Response Templates.
Provides premium, value-focused, and methodology-aligned response templates
for automated GMB review management system.
"""

import random
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

from models.review import Review, ReviewSentiment
from services.business_context_service import BusinessContext


logger = logging.getLogger(__name__)


class SixFigureBarberTemplates:
    """
    Six Figure Barber Program methodology-aligned review response templates.
    Implements premium positioning, value-based messaging, and client relationship focus.
    """
    
    def __init__(self):
        # Six Figure Barber core values and messaging themes
        self.methodology_themes = {
            "premium_positioning": [
                "excellence", "mastery", "artistry", "craftsmanship", "precision",
                "professional", "skilled", "experienced", "expert", "specialized"
            ],
            "client_value_focus": [
                "transformation", "confidence", "style", "image", "professional appearance",
                "personal brand", "grooming excellence", "attention to detail"
            ],
            "business_growth": [
                "investment in appearance", "long-term relationship", "comprehensive care",
                "ongoing partnership", "trusted advisor", "style consultant"
            ]
        }
        
        # Six Figure Barber service positioning language
        self.service_positioning = {
            "haircut": "precision styling and image consulting",
            "shave": "traditional grooming artistry",
            "beard": "facial hair sculpting and maintenance",
            "styling": "professional image enhancement",
            "consultation": "personalized grooming strategy",
            "general": "comprehensive grooming excellence"
        }
    
    def get_six_figure_barber_template(
        self,
        service_type: str,
        sentiment: str,
        context: Optional[BusinessContext] = None
    ) -> str:
        """
        Get Six Figure Barber methodology-aligned template for specific service and sentiment.
        
        Args:
            service_type: Type of service (haircut, shave, beard, etc.)
            sentiment: Response sentiment (positive, negative, neutral)
            context: Business context for enhanced personalization
            
        Returns:
            Six Figure Barber aligned template string
        """
        
        # Six Figure Barber Positive Response Templates
        positive_templates = {
            "haircut": [
                "Thank you for recognizing the artistry behind your {service_type} experience, {reviewer_name}! At {business_name}, we believe every haircut is an investment in your professional image and personal confidence. Our {rating}-star reviews reflect our commitment to precision styling that transforms how you look and feel. We're honored to be your trusted grooming partner and look forward to continuing to elevate your style journey!",
                
                "We're absolutely thrilled by your {rating}-star review, {reviewer_name}! Your transformation is exactly what the Six Figure Barber methodology is about - combining technical mastery with personalized style consultation. At {business_name}, we don't just cut hair; we craft confidence and enhance professional presence. Thank you for trusting us with your image and for sharing your incredible experience!",
                
                "Thank you for the outstanding {rating}-star feedback, {reviewer_name}! This is precisely the kind of experience we strive to create at {business_name} - where precision meets artistry. Your investment in professional grooming shows, and we're proud to be part of your success story. We look forward to our next session together and continuing to perfect your signature style!"
            ],
            "shave": [
                "Thank you for appreciating the traditional art of the hot shave, {reviewer_name}! Your {rating}-star review reflects our commitment to maintaining the highest standards of grooming excellence at {business_name}. In the Six Figure Barber methodology, we believe a professional shave is more than a service - it's a transformative experience that builds confidence and commands respect. We're honored to continue this grooming tradition with you!",
                
                "We're delighted you experienced the mastery of our traditional shaving services, {reviewer_name}! At {business_name}, we combine time-honored techniques with modern precision to deliver the ultimate grooming experience. Your {rating}-star review validates our belief that investing in professional grooming pays dividends in confidence and presence. Thank you for choosing excellence!",
                
                "Your {rating}-star review perfectly captures what we aim for at {business_name}, {reviewer_name}! The art of the professional shave requires skill, precision, and attention to detail - qualities that define the Six Figure Barber approach. We're proud to provide you with this level of grooming excellence and look forward to maintaining your distinguished appearance for years to come!"
            ],
            "beard": [
                "Thank you for the fantastic {rating}-star review on your beard sculpting experience, {reviewer_name}! At {business_name}, we understand that proper beard grooming is an art form that requires expertise and precision. Your investment in professional beard care reflects the Six Figure Barber principle of never compromising on quality. We're excited to continue helping you maintain that perfectly sculpted look!",
                
                "We're thrilled you experienced the artistry of professional beard grooming, {reviewer_name}! Your {rating}-star review highlights exactly what sets {business_name} apart - our commitment to transforming facial hair into a powerful element of your professional image. In the Six Figure Barber methodology, every detail matters, and your beard is no exception. Thank you for trusting us with your style!",
                
                "Your {rating}-star feedback means everything to us, {reviewer_name}! At {business_name}, we believe that exceptional beard grooming is an investment in your personal brand and professional presence. Our specialized techniques ensure your facial hair enhances rather than detracts from your image. We're honored to be your trusted beard grooming specialists!"
            ],
            "general": [
                "Thank you for the incredible {rating}-star review, {reviewer_name}! At {business_name}, we're committed to the Six Figure Barber methodology - delivering excellence that transforms not just your appearance, but your confidence and professional presence. Every service we provide is designed to be an investment in your success. We're honored to be part of your grooming journey and look forward to continuing to exceed your expectations!",
                
                "We're absolutely delighted by your {rating}-star experience, {reviewer_name}! This is precisely what the Six Figure Barber approach is about - combining technical mastery with personalized service to create transformative results. At {business_name}, we don't just provide grooming services; we craft confidence and enhance your professional image. Thank you for choosing excellence and for sharing your amazing experience!",
                
                "Your {rating}-star review perfectly captures our mission at {business_name}, {reviewer_name}! We believe that premium grooming is an investment that pays dividends in confidence, professional success, and personal satisfaction. Following the Six Figure Barber methodology, we're committed to delivering artistry, precision, and exceptional service every single time. Thank you for being part of our community of discerning clients!"
            ]
        }
        
        # Six Figure Barber Negative Response Templates (Recovery Focus)
        negative_templates = {
            "haircut": [
                "Thank you for bringing this to our attention, {reviewer_name}. At {business_name}, we follow the Six Figure Barber methodology which means every client deserves precision styling and an exceptional experience. We clearly did not meet our own high standards, and that's unacceptable. Please contact us directly - we'd like to provide you with a complimentary consultation and restyle to demonstrate the level of artistry and professionalism we're known for. Your satisfaction is our commitment.",
                
                "We sincerely apologize that your haircut experience at {business_name} did not reflect our Six Figure Barber standards, {reviewer_name}. Excellence in precision styling is non-negotiable for us, and we obviously fell short. We'd appreciate the opportunity to make this right with a complimentary service that showcases our true capabilities. Please reach out directly so we can restore your confidence in our commitment to grooming excellence.",
                
                "This is not the caliber of service we pride ourselves on at {business_name}, {reviewer_name}. The Six Figure Barber methodology demands precision, artistry, and client satisfaction - and we clearly missed the mark. We'd be honored to provide you with a complimentary consultation and restyle to demonstrate what true professional styling looks like. Your investment in grooming deserves nothing less than excellence."
            ],
            "general": [
                "Thank you for your honest feedback, {reviewer_name}. At {business_name}, we adhere to the Six Figure Barber methodology of delivering excellence in every aspect of the client experience. We clearly did not meet these standards during your visit, and we take full responsibility. Please contact us directly - we'd like to provide you with a complimentary service that demonstrates our true commitment to grooming excellence and client satisfaction.",
                
                "We sincerely apologize that your experience at {business_name} didn't meet our Six Figure Barber standards, {reviewer_name}. Our methodology is built on premium service, attention to detail, and client satisfaction - and we obviously fell short. We'd appreciate the opportunity to make this right and show you the level of excellence that has built our reputation. Please reach out so we can restore your confidence in our services.",
                
                "This feedback is invaluable, {reviewer_name}, and we're sorry your experience at {business_name} was disappointing. The Six Figure Barber approach demands that every client leaves feeling transformed and confident. We clearly didn't achieve this, and that's on us. We'd like to invite you back for a complimentary service to demonstrate what true grooming excellence looks like. Your satisfaction is our priority."
            ]
        }
        
        # Six Figure Barber Neutral Response Templates (Opportunity Focus)
        neutral_templates = {
            "general": [
                "Thank you for taking the time to share your experience, {reviewer_name}. At {business_name}, we follow the Six Figure Barber methodology which means we're always striving to transform good experiences into exceptional ones. We'd love the opportunity to show you what sets us apart - precision, artistry, and an unwavering commitment to client satisfaction. We believe your next visit will demonstrate why our clients consider us their trusted grooming partners.",
                
                "We appreciate your honest feedback, {reviewer_name}. The Six Figure Barber approach is about continuous improvement and exceeding client expectations every time. While we're glad you visited {business_name}, we know we can do better. We'd welcome the chance to provide you with the transformative grooming experience that reflects our true standards of excellence. Thank you for giving us the opportunity to earn your trust.",
                
                "Thank you for visiting {business_name} and sharing your thoughts, {reviewer_name}. Following the Six Figure Barber methodology, we believe every client deserves an experience that's memorable for all the right reasons. We'd love another opportunity to demonstrate our commitment to grooming excellence and show you why so many clients trust us with their professional image. We're confident your next experience will exceed your expectations."
            ]
        }
        
        # Get appropriate template set
        if sentiment == "positive":
            template_set = positive_templates.get(service_type, positive_templates["general"])
        elif sentiment == "negative":
            template_set = negative_templates.get(service_type, negative_templates["general"])
        else:
            template_set = neutral_templates["general"]
        
        # Select random template
        return random.choice(template_set)
    
    def enhance_template_with_six_figure_barber_context(
        self,
        template: str,
        context: BusinessContext,
        review: Review
    ) -> str:
        """
        Enhance template with Six Figure Barber methodology-specific context.
        
        Args:
            template: Base template string
            context: Business context information
            review: Review object with details
            
        Returns:
            Enhanced template with Six Figure Barber positioning
        """
        enhanced_template = template
        
        # Add Six Figure Barber methodology positioning
        if "service_type" in template:
            service_analysis = self._analyze_service_from_review(review)
            six_fb_service = self.service_positioning.get(
                service_analysis.get("service_type", "general"),
                self.service_positioning["general"]
            )
            enhanced_template = enhanced_template.replace("{service_type}", six_fb_service)
        
        # Enhance with premium positioning language
        if context and hasattr(context, 'specialty_services') and context.specialty_services:
            # Add specialty service context
            if "specialized" not in enhanced_template.lower():
                enhanced_template = self._add_specialty_reference(enhanced_template, context)
        
        # Add local SEO enhancement with Six Figure Barber methodology
        if context and context.city:
            enhanced_template = self._add_local_seo_six_figure_barber(
                enhanced_template, context
            )
        
        return enhanced_template
    
    def _analyze_service_from_review(self, review: Review) -> Dict[str, Any]:
        """
        Analyze review to determine service type for Six Figure Barber positioning.
        """
        if not review.review_text:
            return {"service_type": "general"}
        
        text = review.review_text.lower()
        
        # Six Figure Barber service analysis
        if any(word in text for word in ["haircut", "cut", "hair", "style", "fade"]):
            return {"service_type": "haircut"}
        elif any(word in text for word in ["shave", "razor", "hot towel"]):
            return {"service_type": "shave"}
        elif any(word in text for word in ["beard", "mustache", "facial hair"]):
            return {"service_type": "beard"}
        elif any(word in text for word in ["styling", "product", "consultation"]):
            return {"service_type": "styling"}
        else:
            return {"service_type": "general"}
    
    def _add_specialty_reference(
        self,
        template: str,
        context: BusinessContext
    ) -> str:
        """
        Add Six Figure Barber specialty service references to template.
        """
        specialties = context.specialty_services[:2]  # Use top 2 specialties
        
        if specialties and "professional" in template.lower():
            specialty_text = f"specializing in {' and '.join(specialties)}"
            template = template.replace(
                "professional",
                f"professional {specialty_text}"
            )
        
        return template
    
    def _add_local_seo_six_figure_barber(
        self,
        template: str,
        context: BusinessContext
    ) -> str:
        """
        Add Six Figure Barber methodology local SEO enhancement.
        """
        if context.city and "business_name" in template:
            # Enhance with local Six Figure Barber positioning
            location_enhancement = f"the premier Six Figure Barber methodology salon in {context.city}"
            if context.business_name not in template.lower():
                template = template.replace(
                    "{business_name}",
                    f"{{business_name}}, {location_enhancement}"
                )
        
        return template
    
    def get_six_figure_barber_seo_keywords(self, service_type: str) -> List[str]:
        """
        Get Six Figure Barber methodology SEO keywords for responses.
        
        Args:
            service_type: Type of service for targeted keywords
            
        Returns:
            List of SEO keywords aligned with Six Figure Barber methodology
        """
        base_keywords = [
            "Six Figure Barber", "premium grooming", "professional styling",
            "image consulting", "confidence building", "grooming excellence"
        ]
        
        service_keywords = {
            "haircut": ["precision cutting", "style transformation", "professional image"],
            "shave": ["traditional shaving", "hot towel service", "grooming artistry"],
            "beard": ["beard sculpting", "facial hair styling", "beard maintenance"],
            "styling": ["hair styling", "product consultation", "image enhancement"],
            "general": ["comprehensive grooming", "barbering excellence", "client transformation"]
        }
        
        return base_keywords + service_keywords.get(service_type, service_keywords["general"])
    
    def validate_six_figure_barber_template(self, template: str) -> Dict[str, Any]:
        """
        Validate template against Six Figure Barber methodology standards.
        
        Args:
            template: Template to validate
            
        Returns:
            Validation results with recommendations
        """
        validation_results = {
            "compliant": True,
            "score": 0,
            "issues": [],
            "recommendations": []
        }
        
        # Check for premium positioning language
        premium_indicators = [
            "excellence", "artistry", "precision", "professional", "investment",
            "transformation", "confidence", "mastery", "expertise"
        ]
        
        premium_score = sum(1 for word in premium_indicators if word in template.lower())
        validation_results["score"] += premium_score * 10
        
        if premium_score < 2:
            validation_results["issues"].append("Insufficient premium positioning language")
            validation_results["recommendations"].append("Add more Six Figure Barber methodology keywords")
        
        # Check for value-based messaging
        value_indicators = [
            "investment", "return", "worth", "value", "benefit", "transformation",
            "confidence", "success", "professional image"
        ]
        
        value_score = sum(1 for word in value_indicators if word in template.lower())
        validation_results["score"] += value_score * 15
        
        if value_score < 1:
            validation_results["issues"].append("Missing value-based messaging")
            validation_results["recommendations"].append("Emphasize client value and transformation")
        
        # Check for relationship-building language
        relationship_indicators = [
            "partnership", "relationship", "journey", "trusted", "honored",
            "community", "commitment", "ongoing", "continue"
        ]
        
        relationship_score = sum(1 for word in relationship_indicators if word in template.lower())
        validation_results["score"] += relationship_score * 12
        
        if relationship_score < 1:
            validation_results["issues"].append("Lacks relationship-building language")
            validation_results["recommendations"].append("Include long-term relationship focus")
        
        # Final compliance check
        if validation_results["score"] < 30:
            validation_results["compliant"] = False
            validation_results["recommendations"].append("Template needs significant Six Figure Barber alignment")
        
        return validation_results
