"""
AI-powered response generator for automated customer interactions.
Generates contextual, professional responses aligned with Six Figure Barber methodology.
"""

import openai
import logging
from typing import Dict, Any, List
from datetime import datetime
import json

from config import settings

logger = logging.getLogger(__name__)


class AIResponseGenerator:
    """
    AI-powered response generator for automated customer communications.
    Focuses on maintaining premium brand positioning and professional tone.
    """
    
    def __init__(self):
        if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
            self.ai_enabled = True
        else:
            logger.warning("OpenAI API key not configured. Using template-based responses.")
            self.ai_enabled = False
        
        # Six Figure Barber brand voice guidelines
        self.brand_voice_guidelines = {
            "professional": "Maintain a professional, knowledgeable tone that reflects expertise",
            "premium": "Emphasize quality, craftsmanship, and premium service experience", 
            "grateful": "Express genuine appreciation for the client's business and feedback",
            "solution_focused": "Address concerns proactively and offer solutions",
            "growth_minded": "Demonstrate commitment to continuous improvement"
        }
        
        # Response templates for fallback
        self.response_templates = {
            "positive_5_star": [
                "Thank you so much for your amazing 5-star review! We're thrilled that you had an exceptional experience with us. Your feedback means the world to our team, and we look forward to providing you with the same premium service on your next visit. We appreciate your trust in our craftsmanship!",
                "We're incredibly grateful for your wonderful review! It's feedback like yours that motivates our team to continue delivering the highest quality barbering services. Thank you for choosing us and for taking the time to share your experience. We can't wait to see you again soon!",
                "Your 5-star review just made our day! Thank you for recognizing the dedication and skill our team puts into every service. We're honored to be your trusted barbers and look forward to maintaining this level of excellence for you in the future."
            ],
            "positive_4_star": [
                "Thank you for your positive review! We're delighted that you had a great experience with us. We're always striving for perfection, and we'd love to earn that 5th star on your next visit. Is there anything specific we can improve to make your experience even better?",
                "We really appreciate your 4-star review! It's wonderful to hear that you enjoyed your service. We're committed to continuously improving, and we'd value any feedback on how we can enhance your experience even further. Thank you for choosing us!",
                "Thank you for the fantastic feedback! We're so glad you had a positive experience. We're always looking for ways to exceed expectations, so please don't hesitate to let us know if there's anything we can do to make your next visit absolutely perfect."
            ],
            "neutral_3_star": [
                "Thank you for taking the time to review us. We appreciate all feedback as it helps us improve our services. We'd love to learn more about your experience and how we can better serve you in the future. Please feel free to reach out to us directly so we can make things right.",
                "We value your honest feedback and appreciate you sharing your experience. We're committed to providing exceptional service to every client, and we'd like the opportunity to address any concerns you may have. Please contact us so we can discuss how to improve your experience.",
                "Thank you for your review. We take all feedback seriously and are always working to enhance our services. We'd appreciate the chance to speak with you directly about your visit to ensure we meet your expectations on your next appointment."
            ],
            "negative_1_2_star": [
                "We sincerely apologize that we didn't meet your expectations during your recent visit. Your feedback is invaluable to us, and we take all concerns seriously. We'd love the opportunity to make this right and discuss how we can improve. Please contact us directly so we can address your concerns properly.",
                "We're truly sorry to hear about your disappointing experience. This is not the level of service we strive to provide, and we understand your frustration. We'd like to make this right and would appreciate the chance to speak with you directly to resolve any issues. Your satisfaction is our priority.",
                "Thank you for bringing your concerns to our attention. We're disappointed that we fell short of the high standards we set for ourselves. We take full responsibility and would like the opportunity to rectify this situation. Please reach out to us directly so we can address your concerns and earn back your trust."
            ]
        }
    
    async def generate_review_response(
        self,
        review_data: Dict[str, Any],
        response_settings: Dict[str, Any],
        business_type: str = "barbershop"
    ) -> Dict[str, Any]:
        """
        Generate an AI-powered response to a customer review.
        
        Args:
            review_data: Review information including rating, text, reviewer name
            response_settings: Configuration for response tone and style
            business_type: Type of business for context
            
        Returns:
            Dict containing generated response and metadata
        """
        try:
            rating = review_data.get("rating", 5)
            review_text = review_data.get("review_text", "")
            reviewer_name = review_data.get("reviewer_name", "Valued Customer")
            sentiment = review_data.get("sentiment", "positive")
            
            if self.ai_enabled and response_settings.get("use_ai", True):
                # Generate AI response
                response = await self._generate_ai_response(
                    review_data, response_settings, business_type
                )
            else:
                # Use template-based response
                response = self._generate_template_response(
                    rating, review_text, reviewer_name, response_settings
                )
            
            return {
                "response_text": response,
                "generation_method": "ai" if self.ai_enabled else "template",
                "response_tone": response_settings.get("response_tone", "professional"),
                "brand_voice": response_settings.get("brand_voice", "premium"),
                "generated_at": datetime.utcnow().isoformat(),
                "word_count": len(response.split()),
                "character_count": len(response)
            }
            
        except Exception as e:
            logger.error(f"Failed to generate review response: {str(e)}")
            # Fallback to simple template
            return {
                "response_text": self._generate_fallback_response(review_data.get("rating", 5)),
                "generation_method": "fallback",
                "error": str(e),
                "generated_at": datetime.utcnow().isoformat()
            }
    
    async def _generate_ai_response(
        self,
        review_data: Dict[str, Any],
        response_settings: Dict[str, Any],
        business_type: str
    ) -> str:
        """Generate AI-powered response using OpenAI"""
        try:
            rating = review_data.get("rating", 5)
            review_text = review_data.get("review_text", "")
            reviewer_name = review_data.get("reviewer_name", "Valued Customer")
            
            # Build prompt based on Six Figure Barber methodology
            prompt = self._build_ai_prompt(
                rating, review_text, reviewer_name, response_settings, business_type
            )
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional response generator for a premium barbershop following the Six Figure Barber methodology. Generate authentic, professional responses that maintain premium brand positioning."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            generated_response = response.choices[0].message.content.strip()
            
            # Post-process to ensure quality
            return self._post_process_ai_response(generated_response, response_settings)
            
        except Exception as e:
            logger.error(f"AI response generation failed: {str(e)}")
            raise
    
    def _build_ai_prompt(
        self,
        rating: int,
        review_text: str,
        reviewer_name: str,
        response_settings: Dict[str, Any],
        business_type: str
    ) -> str:
        """Build AI prompt based on review context and settings"""
        tone = response_settings.get("response_tone", "professional")
        brand_voice = response_settings.get("brand_voice", "premium")
        business_name = response_settings.get("business_name", "our barbershop")
        
        prompt = f"""
Generate a professional response to this {business_type} review:

Review Details:
- Rating: {rating}/5 stars
- Reviewer: {reviewer_name}
- Review Text: "{review_text}"

Response Guidelines:
- Tone: {tone}
- Brand Voice: {brand_voice}
- Business Name: {business_name}
- Keep response under 150 words
- Follow Six Figure Barber methodology (premium positioning, professionalism, client value focus)

Brand Voice Guidelines:
{self.brand_voice_guidelines.get(brand_voice, self.brand_voice_guidelines['professional'])}

Requirements:
- Address the reviewer by name if provided
- Acknowledge their specific feedback
- Maintain professional, grateful tone
- For negative reviews: apologize, take responsibility, offer to resolve
- For positive reviews: express gratitude, invite return visits
- Avoid generic responses
- Include subtle call-to-action when appropriate

Generate the response:
        """
        
        return prompt.strip()
    
    def _post_process_ai_response(
        self,
        response: str,
        response_settings: Dict[str, Any]
    ) -> str:
        """Post-process AI response for quality and compliance"""
        # Remove any quotes that might wrap the response
        response = response.strip('"\'')
        
        # Ensure proper greeting
        if not any(greeting in response.lower() for greeting in ['thank', 'hi', 'hello']):
            response = "Thank you for your review! " + response
        
        # Ensure length is appropriate (50-200 words)
        words = response.split()
        if len(words) > 200:
            response = ' '.join(words[:200]) + "..."
        elif len(words) < 10:
            # Too short, add more content
            response += " We appreciate your business and look forward to serving you again soon!"
        
        # Ensure professional closing
        if not response.endswith(('.', '!', '?')):
            response += "."
        
        return response
    
    def _generate_template_response(
        self,
        rating: int,
        review_text: str,
        reviewer_name: str,
        response_settings: Dict[str, Any]
    ) -> str:
        """Generate response using predefined templates"""
        import random
        
        # Determine response category based on rating
        if rating >= 5:
            category = "positive_5_star"
        elif rating >= 4:
            category = "positive_4_star"  
        elif rating >= 3:
            category = "neutral_3_star"
        else:
            category = "negative_1_2_star"
        
        # Select template
        templates = self.response_templates.get(category, self.response_templates["positive_5_star"])
        base_response = random.choice(templates)
        
        # Personalize with reviewer name if provided and appropriate
        if reviewer_name and reviewer_name.lower() != "anonymous":
            # Add personalization to positive reviews
            if rating >= 4:
                base_response = f"Hi {reviewer_name}! " + base_response
        
        return base_response
    
    def _generate_fallback_response(self, rating: int) -> str:
        """Generate simple fallback response when all else fails"""
        if rating >= 4:
            return "Thank you for your wonderful review! We're thrilled that you had a great experience with us and look forward to serving you again soon."
        elif rating >= 3:
            return "Thank you for your feedback. We appreciate all reviews as they help us improve our services. We'd love the opportunity to provide you with an even better experience next time."
        else:
            return "Thank you for your feedback. We take all concerns seriously and would like the opportunity to address them directly. Please contact us so we can make this right."
    
    async def generate_marketing_copy(
        self,
        content_type: str,
        business_data: Dict[str, Any],
        target_audience: str = "local_clients"
    ) -> Dict[str, Any]:
        """
        Generate marketing copy for various purposes (social media, email, ads).
        
        Args:
            content_type: Type of content (social_post, email_campaign, ad_copy)
            business_data: Business information and recent performance data
            target_audience: Target audience for the content
            
        Returns:
            Dict containing generated marketing copy and metadata
        """
        try:
            if not self.ai_enabled:
                return self._generate_template_marketing_copy(content_type, business_data)
            
            # Build marketing prompt
            prompt = self._build_marketing_prompt(content_type, business_data, target_audience)
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a marketing copywriter specializing in premium barbershop services following the Six Figure Barber methodology. Create compelling, professional copy that drives bookings."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=300,
                temperature=0.8
            )
            
            generated_copy = response.choices[0].message.content.strip()
            
            return {
                "content": generated_copy,
                "content_type": content_type,
                "target_audience": target_audience,
                "word_count": len(generated_copy.split()),
                "character_count": len(generated_copy),
                "generated_at": datetime.utcnow().isoformat(),
                "methodology": "six_figure_barber"
            }
            
        except Exception as e:
            logger.error(f"Failed to generate marketing copy: {str(e)}")
            return self._generate_template_marketing_copy(content_type, business_data)
    
    def _build_marketing_prompt(
        self,
        content_type: str,
        business_data: Dict[str, Any],
        target_audience: str
    ) -> str:
        """Build marketing copy generation prompt"""
        business_name = business_data.get("business_name", "Premium Barbershop")
        specialties = business_data.get("specialties", ["Classic Cuts", "Beard Styling"])
        recent_achievements = business_data.get("recent_achievements", [])
        
        content_specs = {
            "social_post": "Create a social media post (150-200 characters) that drives bookings",
            "email_campaign": "Create an email campaign subject line and preview text",
            "ad_copy": "Create compelling ad copy for Google/Facebook ads (under 100 words)",
            "gmb_post": "Create a Google My Business post that showcases expertise"
        }
        
        spec = content_specs.get(content_type, content_specs["social_post"])
        
        prompt = f"""
{spec} for a premium barbershop following Six Figure Barber methodology.

Business Details:
- Business Name: {business_name}
- Specialties: {', '.join(specialties)}
- Target Audience: {target_audience}
- Recent Achievements: {', '.join(recent_achievements) if recent_achievements else 'Consistent 5-star service'}

Six Figure Barber Methodology Guidelines:
- Emphasize premium quality and craftsmanship
- Focus on client value and experience
- Professional, confident tone
- Avoid competing on price
- Highlight expertise and results
- Include clear call-to-action

Create content that:
- Drives bookings and builds brand value
- Appeals to clients who value quality over price
- Showcases professionalism and expertise
- Includes relevant local SEO keywords when appropriate

Generate the marketing copy:
        """
        
        return prompt.strip()
    
    def _generate_template_marketing_copy(
        self,
        content_type: str,
        business_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate marketing copy using templates"""
        business_name = business_data.get("business_name", "our barbershop")
        
        templates = {
            "social_post": [
                f"Experience the art of premium barbering at {business_name}. Book your appointment today for a cut that reflects your success. #PremiumGrooming #QualityCuts",
                f"Elevate your style with our expert barbers. At {business_name}, we don't just cut hair - we craft your image. Schedule your session today!",
                f"Professional cuts for professional men. Experience the {business_name} difference. Book now and join the ranks of our distinguished clientele."
            ],
            "email_campaign": [
                f"Subject: Your next great haircut awaits at {business_name}",
                f"Subject: Time for a refresh? Book your premium cut today",
                f"Subject: Exclusive appointment available - Reserve your spot"
            ],
            "ad_copy": [
                f"Premium barbering services at {business_name}. Expert cuts, professional service, uncompromising quality. Book your appointment today.",
                f"Discover the difference quality makes. {business_name} - where craftsmanship meets style. Schedule your consultation now.",
                f"Professional men choose {business_name} for premium grooming services. Experience excellence - book your appointment today."
            ]
        }
        
        import random
        content = random.choice(templates.get(content_type, templates["social_post"]))
        
        return {
            "content": content,
            "content_type": content_type,
            "generation_method": "template",
            "generated_at": datetime.utcnow().isoformat()
        }