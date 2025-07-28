"""
Six Figure Barber Achievement Definitions

This module contains predefined achievements aligned with the Six Figure Barber methodology.
These achievements are designed to motivate barbers to improve their business metrics
while following the core principles of revenue optimization, client value creation,
service excellence, efficiency, and professional growth.

Each achievement includes:
- Clear business-focused criteria
- Six Figure Barber methodology alignment
- Progressive difficulty levels
- Appropriate rewards and recognition
- Visual design elements for gamification
"""

from models.gamification import (
    AchievementCategory, AchievementRarity, AchievementType, XPSource
)

# ============================================================================
# ACHIEVEMENT DEFINITIONS DATA
# ============================================================================

ACHIEVEMENT_DEFINITIONS = [
    
    # ============================================================================
    # REVENUE MASTERY ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "first_thousand",
        "title": "First Thousand",
        "description": "Earn your first $1,000 in monthly revenue. The beginning of your Six Figure journey.",
        "category": AchievementCategory.REVENUE_MASTERY,
        "rarity": AchievementRarity.COMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "💰",
        "badge_design": {
            "background_color": "#4CAF50",
            "border_color": "#2E7D32",
            "icon_color": "#FFFFFF"
        },
        "color_scheme": {
            "primary": "#4CAF50",
            "secondary": "#81C784",
            "accent": "#FFFFFF"
        },
        "requirements": {
            "type": "monthly_revenue",
            "value": 1000,
            "period": "monthly"
        },
        "xp_reward": 100,
        "sfb_principle": "revenue_optimization",
        "business_impact": "Establishes baseline revenue generation and business viability",
        "coaching_insight": "First milestone in revenue optimization - focus on consistent booking schedule"
    },
    
    {
        "name": "five_figure_monthly",
        "title": "Five Figure Monthly",
        "description": "Achieve $10,000+ in monthly revenue. You're entering serious business territory.",
        "category": AchievementCategory.REVENUE_MASTERY,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "💎",
        "badge_design": {
            "background_color": "#9C27B0",
            "border_color": "#6A1B9A",
            "icon_color": "#FFFFFF"
        },
        "color_scheme": {
            "primary": "#9C27B0",
            "secondary": "#BA68C8",
            "accent": "#FFFFFF"
        },
        "requirements": {
            "type": "monthly_revenue",
            "value": 10000,
            "period": "monthly"
        },
        "xp_reward": 500,
        "prerequisite_achievements": ["first_thousand"],
        "sfb_principle": "revenue_optimization",
        "business_impact": "Demonstrates sustainable high-value service delivery and premium positioning",
        "coaching_insight": "Focus on premium service packages and consistent high-value client relationships"
    },
    
    {
        "name": "six_figure_annual",
        "title": "Six Figure Barber",
        "description": "Achieve $100,000+ in annual revenue. Welcome to the Six Figure Barber club!",
        "category": AchievementCategory.REVENUE_MASTERY,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "👑",
        "badge_design": {
            "background_color": "#FFD700",
            "border_color": "#FFA000",
            "icon_color": "#1A1A1A"
        },
        "color_scheme": {
            "primary": "#FFD700",
            "secondary": "#FFEB3B",
            "accent": "#1A1A1A"
        },
        "requirements": {
            "type": "total_revenue",
            "value": 100000,
            "period": "annual"
        },
        "xp_reward": 1000,
        "prerequisite_achievements": ["five_figure_monthly"],
        "sfb_principle": "revenue_optimization",
        "business_impact": "Achieves the core Six Figure Barber methodology goal",
        "coaching_insight": "Mastery of all Six Figure Barber principles - revenue, efficiency, and premium positioning"
    },
    
    {
        "name": "consistent_earner",
        "title": "Consistent Earner",
        "description": "Maintain $5,000+ monthly revenue for 6 consecutive months.",
        "category": AchievementCategory.REVENUE_MASTERY,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.STREAK,
        "icon": "📈",
        "badge_design": {
            "background_color": "#2196F3",
            "border_color": "#1976D2",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "revenue_streak",
            "threshold": 5000,
            "months": 6
        },
        "xp_reward": 400,
        "sfb_principle": "business_efficiency",
        "business_impact": "Demonstrates reliable business systems and client retention",
        "coaching_insight": "Consistency is key to Six Figure success - focus on systems and processes"
    },
    
    {
        "name": "premium_pricing_master",
        "title": "Premium Pricing Master",
        "description": "Achieve $150+ average ticket size across 50+ appointments.",
        "category": AchievementCategory.REVENUE_MASTERY,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "💰",
        "badge_design": {
            "background_color": "#E91E63",
            "border_color": "#C2185B",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "average_ticket",
            "value": 150,
            "minimum_appointments": 50
        },
        "xp_reward": 600,
        "sfb_principle": "client_value_maximization",
        "business_impact": "Mastery of premium positioning and value-based pricing",
        "coaching_insight": "Premium pricing reflects exceptional value delivery and brand positioning"
    },
    
    # ============================================================================
    # CLIENT EXCELLENCE ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "first_fifty_clients",
        "title": "Client Builder",
        "description": "Successfully serve 50 unique clients. Building your foundation.",
        "category": AchievementCategory.CLIENT_EXCELLENCE,
        "rarity": AchievementRarity.COMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "👥",
        "badge_design": {
            "background_color": "#FF9800",
            "border_color": "#F57C00",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "total_clients_served",
            "value": 50
        },
        "xp_reward": 150,
        "sfb_principle": "client_value_maximization",
        "business_impact": "Establishes foundational client base for sustainable business growth",
        "coaching_insight": "Focus on exceptional service delivery to build repeat client relationships"
    },
    
    {
        "name": "client_satisfaction_expert",
        "title": "Client Satisfaction Expert",
        "description": "Maintain 4.8+ average client satisfaction score across 100+ services.",
        "category": AchievementCategory.CLIENT_EXCELLENCE,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "⭐",
        "badge_design": {
            "background_color": "#4CAF50",
            "border_color": "#2E7D32",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "client_satisfaction_average",
            "value": 4.8,
            "minimum_services": 100
        },
        "xp_reward": 300,
        "sfb_principle": "service_delivery_excellence",
        "business_impact": "Demonstrates exceptional service quality and client experience mastery",
        "coaching_insight": "Consistent high satisfaction scores drive referrals and premium positioning"
    },
    
    {
        "name": "retention_master",
        "title": "Retention Master",
        "description": "Achieve 85%+ client retention rate over 6 months.",
        "category": AchievementCategory.CLIENT_EXCELLENCE,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "🔄",
        "badge_design": {
            "background_color": "#3F51B5",
            "border_color": "#303F9F",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "client_retention_rate",
            "value": 85
        },
        "xp_reward": 500,
        "sfb_principle": "client_value_maximization",
        "business_impact": "Maximizes lifetime client value and reduces acquisition costs",
        "coaching_insight": "High retention indicates mastery of relationship building and value delivery"
    },
    
    {
        "name": "premium_client_developer",
        "title": "Premium Client Developer",
        "description": "Develop 25+ premium/VIP tier clients who generate $200+ per visit.",
        "category": AchievementCategory.CLIENT_EXCELLENCE,
        "rarity": AchievementRarity.EPIC,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "💎",
        "badge_design": {
            "background_color": "#9C27B0",
            "border_color": "#6A1B9A",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "premium_clients_count",
            "value": 25
        },
        "xp_reward": 750,
        "sfb_principle": "client_value_maximization",
        "business_impact": "Creates sustainable high-value revenue stream through premium positioning",
        "coaching_insight": "Premium clients are the foundation of Six Figure Barber success"
    },
    
    {
        "name": "referral_generator",
        "title": "Referral Generator",
        "description": "Generate 50+ client referrals in a 12-month period.",
        "category": AchievementCategory.CLIENT_EXCELLENCE,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "🗣️",
        "badge_design": {
            "background_color": "#FF5722",
            "border_color": "#D84315",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "referral_count",
            "value": 50,
            "period_months": 12
        },
        "xp_reward": 400,
        "sfb_principle": "brand_recognition",
        "business_impact": "Reduces marketing costs and demonstrates exceptional client satisfaction",
        "coaching_insight": "Referrals are the strongest indicator of client satisfaction and brand strength"
    },
    
    # ============================================================================
    # EFFICIENCY EXPERT ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "efficiency_optimizer",
        "title": "Efficiency Optimizer",
        "description": "Achieve 80%+ booking utilization rate for 4 consecutive weeks.",
        "category": AchievementCategory.EFFICIENCY_EXPERT,
        "rarity": AchievementRarity.COMMON,
        "achievement_type": AchievementType.STREAK,
        "icon": "⚡",
        "badge_design": {
            "background_color": "#FFEB3B",
            "border_color": "#F57F17",
            "icon_color": "#1A1A1A"
        },
        "requirements": {
            "type": "utilization_rate",
            "value": 80,
            "streak_weeks": 4
        },
        "xp_reward": 200,
        "sfb_principle": "business_efficiency",
        "business_impact": "Maximizes revenue potential through optimal schedule utilization",
        "coaching_insight": "High utilization with quality service delivery is the efficiency sweet spot"
    },
    
    {
        "name": "punctuality_pro",
        "title": "Punctuality Pro",
        "description": "Maintain 95%+ on-time appointment start rate for 8 weeks.",
        "category": AchievementCategory.EFFICIENCY_EXPERT,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.STREAK,
        "icon": "⏰",
        "badge_design": {
            "background_color": "#795548",
            "border_color": "#5D4037",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "on_time_percentage",
            "value": 95,
            "streak_weeks": 8
        },
        "xp_reward": 300,
        "sfb_principle": "service_delivery_excellence",
        "business_impact": "Improves client satisfaction and enables predictable scheduling",
        "coaching_insight": "Punctuality is a cornerstone of professional service delivery"
    },
    
    {
        "name": "no_show_eliminator",
        "title": "No-Show Eliminator",
        "description": "Achieve <5% no-show rate for 3 consecutive months.",
        "category": AchievementCategory.EFFICIENCY_EXPERT,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.STREAK,
        "icon": "🎯",
        "badge_design": {
            "background_color": "#4CAF50",
            "border_color": "#2E7D32",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "no_show_rate",
            "value": 5,
            "streak_months": 3
        },
        "xp_reward": 450,
        "sfb_principle": "business_efficiency",
        "business_impact": "Maximizes revenue capture and reduces schedule gaps",
        "coaching_insight": "Low no-show rates indicate strong client relationships and effective communication"
    },
    
    {
        "name": "productivity_master",
        "title": "Productivity Master",
        "description": "Complete 40+ appointments per week for 4 consecutive weeks while maintaining quality.",
        "category": AchievementCategory.EFFICIENCY_EXPERT,
        "rarity": AchievementRarity.EPIC,
        "achievement_type": AchievementType.STREAK,
        "icon": "🚀",
        "badge_design": {
            "background_color": "#FF5722",
            "border_color": "#D84315",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "high_volume_quality",
            "appointments_per_week": 40,
            "streak_weeks": 4,
            "minimum_satisfaction": 4.5
        },
        "xp_reward": 600,
        "sfb_principle": "business_efficiency",
        "business_impact": "Demonstrates mastery of high-volume, high-quality service delivery",
        "coaching_insight": "True efficiency balances volume with unwavering quality standards"
    },
    
    # ============================================================================
    # GROWTH CHAMPION ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "steady_climber",
        "title": "Steady Climber",
        "description": "Achieve 15%+ month-over-month revenue growth for 3 consecutive months.",
        "category": AchievementCategory.GROWTH_CHAMPION,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.STREAK,
        "icon": "📊",
        "badge_design": {
            "background_color": "#2196F3",
            "border_color": "#1976D2",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "revenue_growth_rate",
            "value": 15,
            "streak_months": 3
        },
        "xp_reward": 350,
        "sfb_principle": "professional_growth",
        "business_impact": "Demonstrates sustainable business expansion and market development",
        "coaching_insight": "Consistent growth indicates effective strategy execution and market adaptation"
    },
    
    {
        "name": "client_base_expander",
        "title": "Client Base Expander",
        "description": "Grow client base by 50+ new clients in 6 months while maintaining retention.",
        "category": AchievementCategory.GROWTH_CHAMPION,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "🌱",
        "badge_design": {
            "background_color": "#4CAF50",
            "border_color": "#2E7D32",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "client_base_growth",
            "new_clients": 50,
            "period_months": 6,
            "maintain_retention": 75
        },
        "xp_reward": 500,
        "sfb_principle": "professional_growth",
        "business_impact": "Balances new client acquisition with existing client retention",
        "coaching_insight": "Sustainable growth requires both acquisition and retention mastery"
    },
    
    {
        "name": "tier_climber",
        "title": "Tier Climber",
        "description": "Advance to the next pricing tier within 90 days of eligibility.",
        "category": AchievementCategory.GROWTH_CHAMPION,
        "rarity": AchievementRarity.COMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "⬆️",
        "badge_design": {
            "background_color": "#FF9800",
            "border_color": "#F57C00",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "tier_advancement",
            "timeframe_days": 90
        },
        "xp_reward": 250,
        "sfb_principle": "revenue_optimization",
        "business_impact": "Demonstrates ability to capture increased market value",
        "coaching_insight": "Tier advancement reflects improved value delivery and market positioning"
    },
    
    {
        "name": "skill_developer",
        "title": "Skill Developer",
        "description": "Complete 5+ professional development courses or certifications in 12 months.",
        "category": AchievementCategory.GROWTH_CHAMPION,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "🎓",
        "badge_design": {
            "background_color": "#673AB7",
            "border_color": "#512DA8",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "skill_certifications",
            "count": 5,
            "period_months": 12
        },
        "xp_reward": 400,
        "sfb_principle": "professional_growth",
        "business_impact": "Enhances service quality and competitive differentiation",
        "coaching_insight": "Continuous learning is essential for maintaining premium market position"
    },
    
    # ============================================================================
    # SERVICE MASTERY ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "technical_excellence",
        "title": "Technical Excellence",
        "description": "Achieve 95+ technical skill score across 50+ service assessments.",
        "category": AchievementCategory.SERVICE_MASTERY,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "✂️",
        "badge_design": {
            "background_color": "#607D8B",
            "border_color": "#455A64",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "service_excellence_score",
            "area": "technical_skill",
            "value": 95,
            "minimum_assessments": 50
        },
        "xp_reward": 400,
        "sfb_principle": "service_delivery_excellence",
        "business_impact": "Establishes technical credibility and supports premium positioning",
        "coaching_insight": "Technical mastery is the foundation of professional confidence and client trust"
    },
    
    {
        "name": "consultation_master",
        "title": "Consultation Master",
        "description": "Achieve 90+ consultation quality score with 95%+ client agreement rate.",
        "category": AchievementCategory.SERVICE_MASTERY,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "💬",
        "badge_design": {
            "background_color": "#E91E63",
            "border_color": "#C2185B",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "service_excellence_score",
            "area": "consultation_quality",
            "value": 90,
            "client_agreement_rate": 95
        },
        "xp_reward": 500,
        "sfb_principle": "client_value_maximization",
        "business_impact": "Improves service customization and client satisfaction",
        "coaching_insight": "Excellent consultations build trust and enable premium service positioning"
    },
    
    {
        "name": "service_variety_specialist",
        "title": "Service Variety Specialist",
        "description": "Master 10+ different service types with 4.5+ average rating each.",
        "category": AchievementCategory.SERVICE_MASTERY,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "🌟",
        "badge_design": {
            "background_color": "#9C27B0",
            "border_color": "#6A1B9A",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "specialty_services_mastery",
            "service_count": 10,
            "minimum_rating": 4.5
        },
        "xp_reward": 600,
        "sfb_principle": "service_delivery_excellence",
        "business_impact": "Increases revenue opportunities and client retention through variety",
        "coaching_insight": "Service variety demonstrates expertise breadth and increases client lifetime value"
    },
    
    {
        "name": "perfectionist",
        "title": "The Perfectionist",
        "description": "Deliver 25 consecutive services with perfect 5.0 client satisfaction scores.",
        "category": AchievementCategory.SERVICE_MASTERY,
        "rarity": AchievementRarity.LEGENDARY,
        "achievement_type": AchievementType.STREAK,
        "icon": "👑",
        "badge_design": {
            "background_color": "#FFD700",
            "border_color": "#FFA000",
            "icon_color": "#1A1A1A"
        },
        "requirements": {
            "type": "perfect_service_streak",
            "streak_count": 25,
            "required_score": 5.0
        },
        "xp_reward": 1000,
        "sfb_principle": "service_delivery_excellence",
        "business_impact": "Demonstrates exceptional consistency and quality control",
        "coaching_insight": "Perfect streaks indicate mastery of all service delivery elements"
    },
    
    # ============================================================================
    # PREMIUM POSITIONING ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "premium_pioneer",
        "title": "Premium Pioneer",
        "description": "Achieve Elite tier pricing while maintaining 90%+ booking rate.",
        "category": AchievementCategory.PREMIUM_POSITIONING,
        "rarity": AchievementRarity.EPIC,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "💎",
        "badge_design": {
            "background_color": "#9C27B0",
            "border_color": "#6A1B9A",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "premium_pricing_tier",
            "tier": "elite",
            "booking_rate": 90
        },
        "xp_reward": 800,
        "sfb_principle": "revenue_optimization",
        "business_impact": "Demonstrates successful premium market positioning",
        "coaching_insight": "Elite positioning requires exceptional value delivery and brand strength"
    },
    
    {
        "name": "vip_client_magnet",
        "title": "VIP Client Magnet",
        "description": "Build a client base where 30%+ are premium/VIP tier clients.",
        "category": AchievementCategory.PREMIUM_POSITIONING,
        "rarity": AchievementRarity.EPIC,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "🧲",
        "badge_design": {
            "background_color": "#FF5722",
            "border_color": "#D84315",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "premium_client_percentage",
            "value": 30
        },
        "xp_reward": 750,
        "sfb_principle": "client_value_maximization",
        "business_impact": "Creates sustainable high-value revenue base",
        "coaching_insight": "High premium client percentage indicates exceptional brand positioning"
    },
    
    # ============================================================================
    # CONSISTENCY KING ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "daily_champion",
        "title": "Daily Champion",
        "description": "Complete 30 consecutive days of business activity (bookings, client communication, or skill development).",
        "category": AchievementCategory.CONSISTENCY_KING,
        "rarity": AchievementRarity.COMMON,
        "achievement_type": AchievementType.STREAK,
        "icon": "📅",
        "badge_design": {
            "background_color": "#4CAF50",
            "border_color": "#2E7D32",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "login_streak",
            "value": 30
        },
        "xp_reward": 200,
        "sfb_principle": "business_efficiency",
        "business_impact": "Develops disciplined business habits and consistent client touchpoints",
        "coaching_insight": "Daily consistency builds momentum and prevents business stagnation"
    },
    
    {
        "name": "reliability_expert",
        "title": "Reliability Expert",
        "description": "Maintain 98%+ appointment completion rate (no cancellations or no-shows) for 12 weeks.",
        "category": AchievementCategory.CONSISTENCY_KING,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.STREAK,
        "icon": "🔒",
        "badge_design": {
            "background_color": "#3F51B5",
            "border_color": "#303F9F",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "booking_consistency",
            "completion_rate": 98,
            "streak_weeks": 12
        },
        "xp_reward": 600,
        "sfb_principle": "service_delivery_excellence",
        "business_impact": "Builds exceptional client trust and predictable revenue",
        "coaching_insight": "Reliability is the foundation of premium service positioning"
    },
    
    {
        "name": "quality_consistency_master",
        "title": "Quality Consistency Master",
        "description": "Maintain 4.7+ average service rating with <0.3 standard deviation for 100+ services.",
        "category": AchievementCategory.CONSISTENCY_KING,
        "rarity": AchievementRarity.LEGENDARY,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "🎯",
        "badge_design": {
            "background_color": "#FFD700",
            "border_color": "#FFA000",
            "icon_color": "#1A1A1A"
        },
        "requirements": {
            "type": "service_delivery_consistency",
            "average_rating": 4.7,
            "max_deviation": 0.3,
            "minimum_services": 100
        },
        "xp_reward": 1200,
        "sfb_principle": "service_delivery_excellence",
        "business_impact": "Demonstrates exceptional quality control and professional mastery",
        "coaching_insight": "Consistent excellence is the hallmark of true professional mastery"
    },
    
    # ============================================================================
    # BRAND BUILDER ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "social_media_presence",
        "title": "Digital Brand Builder",
        "description": "Build 1,000+ social media followers with regular business-focused content.",
        "category": AchievementCategory.BRAND_BUILDER,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "📱",
        "badge_design": {
            "background_color": "#E91E63",
            "border_color": "#C2185B",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "social_media_following",
            "follower_count": 1000,
            "content_posts": 50
        },
        "xp_reward": 300,
        "sfb_principle": "brand_recognition",
        "business_impact": "Increases market reach and supports premium positioning",
        "coaching_insight": "Digital presence amplifies reputation and attracts quality clients"
    },
    
    {
        "name": "review_accumulator",
        "title": "Review Accumulator",
        "description": "Collect 100+ authentic client reviews with 4.8+ average rating.",
        "category": AchievementCategory.BRAND_BUILDER,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "⭐",
        "badge_design": {
            "background_color": "#FF9800",
            "border_color": "#F57C00",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "review_collection",
            "review_count": 100,
            "average_rating": 4.8
        },
        "xp_reward": 400,
        "sfb_principle": "brand_recognition",
        "business_impact": "Builds social proof and supports premium market positioning",
        "coaching_insight": "Reviews are modern word-of-mouth and crucial for new client acquisition"
    },
    
    # ============================================================================
    # INNOVATION LEADER ACHIEVEMENTS
    # ============================================================================
    
    {
        "name": "early_adopter",
        "title": "Innovation Early Adopter",
        "description": "Be among the first 100 users to adopt 3+ new platform features within 30 days of release.",
        "category": AchievementCategory.INNOVATION_LEADER,
        "rarity": AchievementRarity.RARE,
        "achievement_type": AchievementType.SPECIAL,
        "icon": "🚀",
        "badge_design": {
            "background_color": "#FF5722",
            "border_color": "#D84315",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "early_adopter",
            "feature_count": 3,
            "adoption_rank": 100,
            "timeframe_days": 30
        },
        "xp_reward": 500,
        "sfb_principle": "professional_growth",
        "business_impact": "Gains competitive advantage through technology adoption",
        "coaching_insight": "Innovation adoption demonstrates growth mindset and competitive awareness"
    },
    
    {
        "name": "feature_mastery",
        "title": "Feature Mastery Champion",
        "description": "Achieve 90%+ utilization rate on 5+ advanced platform features for 60+ days.",
        "category": AchievementCategory.INNOVATION_LEADER,
        "rarity": AchievementRarity.UNCOMMON,
        "achievement_type": AchievementType.MILESTONE,
        "icon": "⚙️",
        "badge_design": {
            "background_color": "#607D8B",
            "border_color": "#455A64",
            "icon_color": "#FFFFFF"
        },
        "requirements": {
            "type": "feature_adoption",
            "feature_count": 5,
            "utilization_rate": 90,
            "duration_days": 60
        },
        "xp_reward": 400,
        "sfb_principle": "business_efficiency",
        "business_impact": "Maximizes platform value and operational efficiency",
        "coaching_insight": "Feature mastery demonstrates commitment to operational excellence"
    }
]


def get_achievement_by_name(name: str) -> dict:
    """Get achievement definition by name"""
    for achievement in ACHIEVEMENT_DEFINITIONS:
        if achievement["name"] == name:
            return achievement
    return None


def get_achievements_by_category(category: AchievementCategory) -> list:
    """Get all achievements in a specific category"""
    return [a for a in ACHIEVEMENT_DEFINITIONS if a["category"] == category]


def get_achievements_by_rarity(rarity: AchievementRarity) -> list:
    """Get all achievements of a specific rarity"""
    return [a for a in ACHIEVEMENT_DEFINITIONS if a["rarity"] == rarity]


def get_starter_achievements() -> list:
    """Get achievements suitable for new users"""
    return [a for a in ACHIEVEMENT_DEFINITIONS if a["rarity"] == AchievementRarity.COMMON]


def get_milestone_achievements() -> list:
    """Get major milestone achievements"""
    return [a for a in ACHIEVEMENT_DEFINITIONS if a["rarity"] in [AchievementRarity.EPIC, AchievementRarity.LEGENDARY]]