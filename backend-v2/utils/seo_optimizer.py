"""
Local SEO optimizer for barbershop businesses.
Generates SEO-optimized content and recommendations based on Six Figure Barber methodology.
"""

import logging
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class LocalSEOOptimizer:
    """
    Local SEO optimization service focusing on barbershop industry best practices
    and Six Figure Barber methodology for premium positioning.
    """
    
    def __init__(self):
        # Core barbershop SEO keywords by intent
        self.primary_keywords = [
            "barber near me", "barbershop", "mens haircut", "professional barber",
            "beard trimming", "hair styling", "gentleman's haircut", "premium barber"
        ]
        
        self.local_modifiers = [
            "near me", "local", "in [city]", "best", "top rated", "professional"
        ]
        
        self.service_keywords = {
            "haircuts": ["mens haircut", "classic haircut", "fade", "buzz cut", "scissor cut"],
            "beard_services": ["beard trim", "beard styling", "mustache trim", "beard oil"],
            "premium_services": ["hot towel shave", "straight razor", "executive cut", "consultation"],
            "styling": ["hair styling", "pompadour", "undercut", "texture cut", "beard shaping"]
        }
        
        # Six Figure Barber methodology keywords
        self.six_figure_keywords = [
            "premium barber", "executive grooming", "professional haircut",
            "master barber", "skilled craftsman", "quality over price",
            "investment in appearance", "personal branding", "image consulting"
        ]
        
        # Content themes aligned with Six Figure Barber principles
        self.content_themes = {
            "expertise": "Showcase craftsmanship and professional expertise",
            "results": "Highlight client transformations and success stories", 
            "premium_experience": "Emphasize quality service and attention to detail",
            "professional_image": "Connect grooming to professional success",
            "education": "Share grooming tips and industry knowledge",
            "community": "Build local community presence and recognition"
        }
    
    async def optimize_business_listing(
        self,
        current_listing: Dict[str, Any],
        performance_data: Dict[str, Any],
        methodology: str = "six_figure_barber"
    ) -> Dict[str, Any]:
        """
        Optimize business listing for local SEO based on performance data.
        
        Args:
            current_listing: Current business listing information
            performance_data: Business performance and booking analytics
            methodology: Optimization methodology to apply
            
        Returns:
            Dict containing optimized listing data and changes made
        """
        try:
            optimizations = []
            optimized_listing = current_listing.copy()
            
            # Optimize business description
            if methodology == "six_figure_barber":
                optimized_description = self._generate_six_figure_description(
                    current_listing, performance_data
                )
                if optimized_description != current_listing.get("description"):
                    optimized_listing["description"] = optimized_description
                    optimizations.append("Updated business description for premium positioning")
            
            # Optimize business name for SEO (if allowed)
            optimized_name = self._optimize_business_name(
                current_listing.get("name", ""),
                performance_data.get("popular_services", [])
            )
            if optimized_name != current_listing.get("name"):
                optimized_listing["business_name"] = optimized_name
                optimizations.append("Enhanced business name for SEO")
            
            # Optimize business hours based on peak booking times
            if "peak_hours" in performance_data:
                optimized_hours = self._optimize_business_hours(
                    current_listing.get("hours", {}),
                    performance_data["peak_hours"]
                )
                optimized_listing["business_hours"] = optimized_hours
                optimizations.append("Optimized business hours based on booking patterns")
            
            # Generate SEO-optimized attributes
            seo_attributes = self._generate_seo_attributes(
                performance_data, methodology
            )
            optimized_listing["seo_attributes"] = seo_attributes
            optimizations.append("Added SEO-optimized business attributes")
            
            # Generate optimized categories
            optimized_categories = self._generate_optimized_categories(
                performance_data.get("popular_services", [])
            )
            optimized_listing["categories"] = optimized_categories
            optimizations.append("Updated business categories for better visibility")
            
            return {
                "optimized_listing": optimized_listing,
                "changes": optimizations,
                "seo_score_improvement": self._calculate_seo_improvement(
                    current_listing, optimized_listing
                ),
                "target_keywords": self._get_target_keywords(performance_data),
                "optimization_date": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to optimize business listing: {str(e)}")
            raise
    
    async def generate_local_seo_posts(
        self,
        location_id: str,
        booking_trends: Dict[str, Any],
        schedule: Dict[str, Any],
        methodology: str = "six_figure_barber"
    ) -> List[Dict[str, Any]]:
        """
        Generate SEO-optimized posts for local visibility and engagement.
        
        Args:
            location_id: Business location identifier
            booking_trends: Recent booking trends and popular services
            schedule: Posting schedule preferences
            methodology: Content methodology to follow
            
        Returns:
            List of optimized post content ready for publishing
        """
        try:
            posts = []
            
            # Generate different types of SEO posts
            post_types = [
                {"type": "service_showcase", "theme": "expertise"},
                {"type": "client_success", "theme": "results"},
                {"type": "tips_education", "theme": "education"},
                {"type": "behind_scenes", "theme": "premium_experience"},
                {"type": "local_community", "theme": "community"}
            ]
            
            for post_type in post_types:
                post_content = await self._generate_seo_post_content(
                    post_type, booking_trends, methodology
                )
                
                if post_content:
                    posts.append({
                        "type": post_type["type"],
                        "theme": post_type["theme"],
                        "content": post_content["content"],
                        "seo_keywords": post_content["keywords"],
                        "hashtags": post_content["hashtags"],
                        "cta_url": post_content.get("cta_url"),
                        "publish_time": self._calculate_optimal_posting_time(schedule),
                        "engagement_target": post_content.get("engagement_target", "bookings"),
                        "local_seo_score": post_content.get("seo_score", 75)
                    })
            
            # Sort by SEO effectiveness
            posts.sort(key=lambda x: x.get("local_seo_score", 0), reverse=True)
            
            return posts[:schedule.get("posts_per_batch", 3)]
            
        except Exception as e:
            logger.error(f"Failed to generate local SEO posts: {str(e)}")
            return []
    
    def analyze_keyword_opportunities(
        self,
        current_keywords: List[str],
        competitor_data: Dict[str, Any],
        local_market: str
    ) -> Dict[str, Any]:
        """
        Analyze keyword opportunities for local SEO improvement.
        
        Args:
            current_keywords: Currently targeted keywords
            competitor_data: Competitor analysis data
            local_market: Local market/city information
            
        Returns:
            Dict containing keyword opportunities and recommendations
        """
        try:
            # Identify gaps in current keyword targeting
            missing_primary = [kw for kw in self.primary_keywords if kw not in current_keywords]
            missing_six_figure = [kw for kw in self.six_figure_keywords if kw not in current_keywords]
            
            # Generate local keyword variations
            local_variations = self._generate_local_keyword_variations(local_market)
            
            # Analyze service-specific opportunities
            service_opportunities = self._analyze_service_keyword_gaps(current_keywords)
            
            # Calculate opportunity scores
            opportunities = []
            
            for keyword in missing_primary + missing_six_figure + local_variations:
                opportunity_score = self._calculate_keyword_opportunity_score(
                    keyword, competitor_data, local_market
                )
                
                opportunities.append({
                    "keyword": keyword,
                    "opportunity_score": opportunity_score,
                    "competition_level": self._assess_keyword_competition(keyword, competitor_data),
                    "local_relevance": self._assess_local_relevance(keyword, local_market),
                    "six_figure_alignment": keyword in self.six_figure_keywords,
                    "implementation_priority": self._calculate_implementation_priority(
                        keyword, opportunity_score
                    )
                })
            
            # Sort by opportunity score
            opportunities.sort(key=lambda x: x["opportunity_score"], reverse=True)
            
            return {
                "keyword_opportunities": opportunities[:20],  # Top 20 opportunities
                "current_keyword_coverage": len(current_keywords),
                "missing_primary_keywords": missing_primary,
                "service_gaps": service_opportunities,
                "local_optimization_score": self._calculate_local_optimization_score(
                    current_keywords, local_market
                ),
                "recommendations": self._generate_keyword_recommendations(opportunities[:10])
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze keyword opportunities: {str(e)}")
            return {"error": str(e)}
    
    def _generate_six_figure_description(
        self,
        current_listing: Dict[str, Any],
        performance_data: Dict[str, Any]
    ) -> str:
        """Generate business description aligned with Six Figure Barber methodology"""
        business_name = current_listing.get("name", "Our Barbershop")
        popular_services = performance_data.get("popular_services", ["Professional Haircuts"])
        
        # Build description emphasizing premium positioning
        description_parts = [
            f"{business_name} - Premium barbering services for the modern professional.",
            f"Specializing in {', '.join(popular_services[:3])} with uncompromising attention to detail.",
            "Our master barbers combine traditional craftsmanship with contemporary techniques,",
            "ensuring every client leaves looking sharp and feeling confident.",
            "Quality over quantity - because your image is an investment in your success.",
            "Book your appointment today and experience the difference expertise makes."
        ]
        
        description = " ".join(description_parts)
        
        # Ensure optimal length for SEO (150-320 characters)
        if len(description) > 320:
            description = description[:317] + "..."
        
        return description
    
    def _optimize_business_name(self, current_name: str, popular_services: List[str]) -> str:
        """Optimize business name for SEO while maintaining brand identity"""
        # Only suggest minor SEO enhancements, not full name changes
        if not current_name:
            return current_name
        
        # If name doesn't include "barber" or "barbershop", suggest addition
        if "barber" not in current_name.lower():
            if len(current_name) < 40:  # Google My Business character limit consideration
                return f"{current_name} - Premium Barbershop"
        
        return current_name
    
    def _optimize_business_hours(
        self,
        current_hours: Dict[str, Any],
        peak_hours: List[int]
    ) -> Dict[str, Any]:
        """Optimize business hours based on booking patterns"""
        # Suggest hours that align with peak booking times
        optimized_hours = current_hours.copy()
        
        if peak_hours:
            # Ensure business is open during peak booking hours
            earliest_peak = min(peak_hours)
            latest_peak = max(peak_hours)
            
            # Suggest optimal opening/closing times
            suggested_open = max(8, earliest_peak - 1)  # Open 1 hour before earliest peak
            suggested_close = min(20, latest_peak + 2)  # Close 2 hours after latest peak
            
            optimized_hours["suggested_schedule"] = {
                "monday_friday": f"{suggested_open}:00 AM - {suggested_close - 12 if suggested_close > 12 else suggested_close}:00 {'PM' if suggested_close > 12 else 'AM'}",
                "saturday": f"{suggested_open}:00 AM - {suggested_close - 12 if suggested_close > 12 else suggested_close}:00 {'PM' if suggested_close > 12 else 'AM'}",
                "sunday": "Closed or By Appointment"
            }
        
        return optimized_hours
    
    def _generate_seo_attributes(
        self,
        performance_data: Dict[str, Any],
        methodology: str
    ) -> Dict[str, Any]:
        """Generate SEO-optimized business attributes"""
        attributes = {
            "payment_options": ["Credit Cards", "Cash", "Digital Payments"],
            "amenities": ["WiFi", "Comfortable Seating", "Professional Consultation"],
            "specializations": performance_data.get("popular_services", ["Men's Haircuts"]),
            "quality_indicators": ["Licensed Barbers", "Premium Products", "Sanitized Tools"],
            "target_audience": ["Business Professionals", "Style-Conscious Men", "All Ages Welcome"]
        }
        
        if methodology == "six_figure_barber":
            attributes["premium_features"] = [
                "Master Barber on Staff",
                "Precision Cutting Techniques", 
                "Image Consultation",
                "Premium Product Lines",
                "Appointment-Based Service"
            ]
        
        return attributes
    
    def _generate_optimized_categories(self, popular_services: List[str]) -> List[str]:
        """Generate optimized business categories for better visibility"""
        primary_categories = ["Barber Shop", "Hair Salon"]
        
        # Add categories based on popular services
        service_category_map = {
            "beard": "Beard Trimming Service",
            "shave": "Shaving Service", 
            "styling": "Hair Styling Service",
            "cut": "Hair Cutting Service",
            "grooming": "Men's Grooming Service"
        }
        
        additional_categories = []
        for service in popular_services:
            for keyword, category in service_category_map.items():
                if keyword in service.lower() and category not in additional_categories:
                    additional_categories.append(category)
        
        return primary_categories + additional_categories[:3]  # Limit to 5 total categories
    
    def _calculate_seo_improvement(
        self,
        current_listing: Dict[str, Any],
        optimized_listing: Dict[str, Any]
    ) -> int:
        """Calculate estimated SEO improvement score"""
        improvements = 0
        
        # Description optimization
        current_desc = current_listing.get("description", "")
        optimized_desc = optimized_listing.get("description", "")
        
        if len(optimized_desc) > len(current_desc):
            improvements += 15
        
        # Keyword density improvement
        if any(kw in optimized_desc.lower() for kw in self.primary_keywords):
            improvements += 20
        
        # Six Figure keyword inclusion
        if any(kw in optimized_desc.lower() for kw in self.six_figure_keywords):
            improvements += 25
        
        # Category optimization
        if len(optimized_listing.get("categories", [])) > len(current_listing.get("categories", [])):
            improvements += 10
        
        # Attributes addition
        if "seo_attributes" in optimized_listing:
            improvements += 30
        
        return min(improvements, 100)  # Cap at 100%
    
    def _get_target_keywords(self, performance_data: Dict[str, Any]) -> List[str]:
        """Get target keywords based on business performance"""
        keywords = self.primary_keywords.copy()
        
        # Add service-specific keywords
        popular_services = performance_data.get("popular_services", [])
        for service in popular_services:
            for category, service_keywords in self.service_keywords.items():
                if any(s_kw in service.lower() for s_kw in service_keywords):
                    keywords.extend(service_keywords[:2])  # Add top 2 keywords per service
        
        # Add Six Figure Barber keywords
        if performance_data.get("avg_booking_value", 0) > 75:  # Premium service indicator
            keywords.extend(self.six_figure_keywords[:5])
        
        return list(set(keywords))  # Remove duplicates
    
    async def _generate_seo_post_content(
        self,
        post_type: Dict[str, str],
        booking_trends: Dict[str, Any],
        methodology: str
    ) -> Dict[str, Any]:
        """Generate SEO-optimized post content based on type and trends"""
        content_templates = {
            "service_showcase": {
                "content": "Precision meets artistry in every cut. Our master barbers bring years of experience to craft the perfect look for today's professional. Book your consultation and discover the difference expertise makes. #ProfessionalBarber #QualityCuts #MasterBarber",
                "keywords": ["professional barber", "master barber", "quality cuts", "barbershop"],
                "hashtags": ["#ProfessionalBarber", "#QualityCuts", "#MasterBarber", "#BarberLife"],
                "seo_score": 85
            },
            "client_success": {
                "content": "Another transformation complete! 🔥 When you invest in quality grooming, you invest in your success. Ready for your upgrade? Book now and join our community of well-groomed professionals. #ClientTransformation #ProfessionalGrooming #SuccessStory",
                "keywords": ["professional grooming", "barber transformation", "men's haircut"],
                "hashtags": ["#ClientTransformation", "#ProfessionalGrooming", "#SuccessStory"],
                "seo_score": 90
            },
            "tips_education": {
                "content": "Pro Tip: The right haircut can boost your confidence and professional presence. Our barbers provide personalized consultations to find your perfect style. Book your session today! #GroomingTips #ProfessionalImage #BarberAdvice",
                "keywords": ["grooming tips", "professional image", "barber advice", "haircut consultation"],
                "hashtags": ["#GroomingTips", "#ProfessionalImage", "#BarberAdvice"],
                "seo_score": 80
            },
            "behind_scenes": {
                "content": "Behind every great cut is precision, skill, and attention to detail. Take a look at our process and see why quality takes time. Excellence isn't rushed - it's crafted. #BehindTheScenes #Craftsmanship #QualityFirst",
                "keywords": ["barbershop quality", "precision cutting", "craftsmanship"],
                "hashtags": ["#BehindTheScenes", "#Craftsmanship", "#QualityFirst"],
                "seo_score": 75
            },
            "local_community": {
                "content": "Proud to serve our local community with premium grooming services. Supporting local professionals, one great cut at a time. Book your appointment and experience the local difference! #LocalBarber #CommunityFirst #LocalBusiness",
                "keywords": ["local barber", "community barbershop", "local business"],
                "hashtags": ["#LocalBarber", "#CommunityFirst", "#LocalBusiness"],
                "seo_score": 85
            }
        }
        
        return content_templates.get(post_type["type"], content_templates["service_showcase"])
    
    def _calculate_optimal_posting_time(self, schedule: Dict[str, Any]) -> str:
        """Calculate optimal posting time based on engagement data"""
        # Default optimal times for barbershop businesses
        optimal_times = {
            "monday": "09:00",
            "tuesday": "10:00", 
            "wednesday": "09:00",
            "thursday": "10:00",
            "friday": "08:00",
            "saturday": "09:00",
            "sunday": "10:00"
        }
        
        # Use provided schedule preferences or default
        preferred_times = schedule.get("optimal_times", optimal_times)
        
        # Calculate next posting time
        current_day = datetime.now().strftime("%A").lower()
        next_time = preferred_times.get(current_day, "10:00")
        
        next_post_date = datetime.now() + timedelta(days=1)
        return f"{next_post_date.strftime('%Y-%m-%d')} {next_time}:00"
    
    def _generate_local_keyword_variations(self, local_market: str) -> List[str]:
        """Generate local keyword variations for the market"""
        if not local_market:
            return []
        
        local_keywords = []
        
        # Add city-specific variations
        for keyword in self.primary_keywords[:5]:  # Top 5 primary keywords
            local_keywords.extend([
                f"{keyword} {local_market}",
                f"{keyword} in {local_market}",
                f"best {keyword} {local_market}",
                f"{local_market} {keyword}"
            ])
        
        return local_keywords
    
    def _analyze_service_keyword_gaps(self, current_keywords: List[str]) -> List[str]:
        """Analyze gaps in service-specific keyword coverage"""
        gaps = []
        
        for service_category, keywords in self.service_keywords.items():
            # Check if any keywords from this service category are missing
            missing_in_category = [kw for kw in keywords if kw not in current_keywords]
            if len(missing_in_category) == len(keywords):  # No coverage for this service
                gaps.append(f"Missing {service_category} keywords: {', '.join(keywords[:3])}")
        
        return gaps
    
    def _calculate_keyword_opportunity_score(
        self,
        keyword: str,
        competitor_data: Dict[str, Any],
        local_market: str
    ) -> int:
        """Calculate opportunity score for a keyword"""
        score = 50  # Base score
        
        # High-value keywords get bonus points
        if keyword in self.six_figure_keywords:
            score += 30
        
        if keyword in self.primary_keywords:
            score += 20
        
        # Local relevance bonus
        if local_market.lower() in keyword.lower():
            score += 25
        
        # Service-specific bonus
        if any(keyword in service_kws for service_kws in self.service_keywords.values()):
            score += 15
        
        return min(score, 100)
    
    def _assess_keyword_competition(self, keyword: str, competitor_data: Dict[str, Any]) -> str:
        """Assess competition level for a keyword"""
        # Simple heuristic based on keyword characteristics
        if len(keyword.split()) >= 3:  # Long-tail keywords typically have lower competition
            return "Low"
        elif keyword in self.primary_keywords:
            return "High"
        else:
            return "Medium"
    
    def _assess_local_relevance(self, keyword: str, local_market: str) -> str:
        """Assess local relevance of a keyword"""
        if local_market.lower() in keyword.lower() or "near me" in keyword:
            return "High"
        elif any(modifier in keyword for modifier in self.local_modifiers):
            return "Medium"
        else:
            return "Low"
    
    def _calculate_implementation_priority(self, keyword: str, opportunity_score: int) -> str:
        """Calculate implementation priority for a keyword"""
        if opportunity_score >= 80:
            return "High"
        elif opportunity_score >= 60:
            return "Medium"
        else:
            return "Low"
    
    def _calculate_local_optimization_score(
        self,
        current_keywords: List[str],
        local_market: str
    ) -> int:
        """Calculate current local optimization score"""
        score = 0
        
        # Check coverage of primary keywords
        primary_coverage = len([kw for kw in self.primary_keywords if kw in current_keywords])
        score += (primary_coverage / len(self.primary_keywords)) * 40
        
        # Check local keyword presence
        local_keywords = [kw for kw in current_keywords if local_market.lower() in kw.lower() or "near me" in kw]
        if local_keywords:
            score += 30
        
        # Check Six Figure Barber alignment
        six_figure_coverage = len([kw for kw in self.six_figure_keywords if kw in current_keywords])
        score += (six_figure_coverage / len(self.six_figure_keywords)) * 30
        
        return min(int(score), 100)
    
    def _generate_keyword_recommendations(self, top_opportunities: List[Dict[str, Any]]) -> List[str]:
        """Generate actionable keyword recommendations"""
        recommendations = []
        
        high_priority = [opp for opp in top_opportunities if opp["implementation_priority"] == "High"]
        
        if high_priority:
            recommendations.append(
                f"Immediately target these high-opportunity keywords: {', '.join([opp['keyword'] for opp in high_priority[:3]])}"
            )
        
        six_figure_opportunities = [opp for opp in top_opportunities if opp["six_figure_alignment"]]
        if six_figure_opportunities:
            recommendations.append(
                "Incorporate Six Figure Barber methodology keywords to attract premium clients"
            )
        
        local_opportunities = [opp for opp in top_opportunities if opp["local_relevance"] == "High"]
        if local_opportunities:
            recommendations.append(
                "Focus on local SEO keywords to dominate local search results"
            )
        
        return recommendations[:5]  # Limit to top 5 recommendations