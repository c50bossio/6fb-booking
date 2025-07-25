"""
Six Figure Barber Service Template Service

This service manages the 6FB methodology-aligned service templates
that enable plug-and-play onboarding for new barbers.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models import ServiceTemplate, UserServiceTemplate, Service
from schemas import (
    ServiceTemplateCreate, ServiceTemplateApplyRequest, ServiceTemplateApplyResponse,
    ServiceTemplateFilterRequest, ServiceCategoryEnum
)
import logging

logger = logging.getLogger(__name__)


class ServiceTemplateService:
    """Service for managing 6FB service templates"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_six_fb_preset_templates(self) -> List[Dict[str, Any]]:
        """
        Get the built-in Six Figure Barber methodology service templates.
        
        These templates are designed to align with 6FB principles and provide
        new barbers with proven business models from day one.
        """
        return [
            # STARTER TIER - Foundation Services
            {
                "name": "essential_haircut",
                "display_name": "Essential Haircut",
                "description": "Core barbering service optimized for 6FB methodology. Focuses on quality execution and client relationship building.",
                "category": ServiceCategoryEnum.HAIRCUT,
                "six_fb_tier": "starter",
                "methodology_score": 90.0,
                "revenue_impact": "high",
                "client_relationship_impact": "high",
                "suggested_base_price": 35.0,
                "suggested_min_price": 25.0,
                "suggested_max_price": 50.0,
                "duration_minutes": 45,
                "buffer_time_minutes": 10,
                "requires_consultation": False,
                "upsell_opportunities": [],
                "client_value_tier": "standard",
                "profit_margin_target": 75.0,
                "template_type": "preset",
                "is_six_fb_certified": True,
                "target_market": "urban",
                "recommended_for": ["new_barbers", "6fb_practitioners"],
                "service_details": {
                    "includes": ["Shampoo", "Cut", "Style", "Hot towel finish"],
                    "techniques": ["Scissor cut", "Clipper work", "Detail trimming"],
                    "consultation_notes": "Brief consultation to understand client preferences",
                    "value_adds": ["Scalp massage", "Product recommendations"]
                },
                "pricing_strategy": {
                    "methodology": "value_based",
                    "factors": ["expertise", "experience", "location", "time_investment"],
                    "upsell_triggers": ["special_occasions", "style_change_requests"],
                    "minimum_viable_price": 25.0,
                    "target_profit_margin": 75.0
                },
                "business_rules": {
                    "booking_restrictions": [],
                    "preparation_time": 5,
                    "cleanup_time": 5,
                    "consultation_required": False,
                    "advance_booking_days": 14
                }
            },
            
            {
                "name": "precision_beard_trim",
                "display_name": "Precision Beard Trim",
                "description": "Professional beard grooming service that showcases technical skill and attention to detail.",
                "category": ServiceCategoryEnum.BEARD,
                "six_fb_tier": "starter",
                "methodology_score": 85.0,
                "revenue_impact": "medium",
                "client_relationship_impact": "high",
                "suggested_base_price": 25.0,
                "suggested_min_price": 20.0,
                "suggested_max_price": 35.0,
                "duration_minutes": 30,
                "buffer_time_minutes": 5,
                "requires_consultation": False,
                "upsell_opportunities": [],
                "client_value_tier": "standard",
                "profit_margin_target": 80.0,
                "template_type": "preset",
                "is_six_fb_certified": True,
                "target_market": "urban",
                "recommended_for": ["new_barbers", "6fb_practitioners"],
                "service_details": {
                    "includes": ["Trim", "Shape", "Hot towel", "Beard oil application"],
                    "techniques": ["Precision trimming", "Shaping", "Edge work"],
                    "consultation_notes": "Discuss desired length and style",
                    "value_adds": ["Beard care tips", "Product recommendations"]
                },
                "pricing_strategy": {
                    "methodology": "value_based",
                    "factors": ["precision", "styling", "maintenance_advice"],
                    "bundle_opportunities": ["haircut_combo"],
                    "minimum_viable_price": 20.0,
                    "target_profit_margin": 80.0
                }
            },
            
            # PROFESSIONAL TIER - Enhanced Services
            {
                "name": "signature_cut_style",
                "display_name": "Signature Cut & Style",
                "description": "Premium haircut service that demonstrates advanced skill and personal attention. Perfect for building client loyalty.",
                "category": ServiceCategoryEnum.HAIRCUT,
                "six_fb_tier": "professional",
                "methodology_score": 95.0,
                "revenue_impact": "high",
                "client_relationship_impact": "high",
                "suggested_base_price": 65.0,
                "suggested_min_price": 45.0,
                "suggested_max_price": 85.0,
                "duration_minutes": 60,
                "buffer_time_minutes": 15,
                "requires_consultation": True,
                "upsell_opportunities": [],
                "client_value_tier": "premium",
                "profit_margin_target": 70.0,
                "template_type": "preset",
                "is_six_fb_certified": True,
                "target_market": "urban",
                "recommended_for": ["6fb_practitioners", "experienced_barbers"],
                "service_details": {
                    "includes": ["Consultation", "Shampoo", "Precision cut", "Custom styling", "Hot towel finish", "Scalp massage"],
                    "techniques": ["Advanced cutting", "Texturizing", "Custom styling"],
                    "consultation_notes": "Detailed consultation on lifestyle, preferences, maintenance",
                    "value_adds": ["Style maintenance tips", "Home care routine", "Product recommendations"]
                },
                "pricing_strategy": {
                    "methodology": "value_based_premium",
                    "factors": ["consultation_time", "advanced_techniques", "personalization", "experience"],
                    "premium_positioning": True,
                    "minimum_viable_price": 45.0,
                    "target_profit_margin": 70.0
                },
                "business_rules": {
                    "booking_restrictions": [],
                    "preparation_time": 10,
                    "cleanup_time": 5,
                    "consultation_required": True,
                    "consultation_duration": 10,
                    "advance_booking_days": 21
                }
            },
            
            {
                "name": "complete_grooming_experience",
                "display_name": "Complete Grooming Experience",
                "description": "Full-service grooming package combining haircut and beard work. High-value service that maximizes revenue per client.",
                "category": ServiceCategoryEnum.PACKAGE,
                "six_fb_tier": "professional",
                "methodology_score": 92.0,
                "revenue_impact": "high",
                "client_relationship_impact": "high",
                "suggested_base_price": 80.0,
                "suggested_min_price": 60.0,
                "suggested_max_price": 110.0,
                "duration_minutes": 75,
                "buffer_time_minutes": 15,
                "requires_consultation": True,
                "upsell_opportunities": [],
                "client_value_tier": "premium",
                "profit_margin_target": 65.0,
                "template_type": "preset",
                "is_six_fb_certified": True,
                "target_market": "urban",
                "recommended_for": ["6fb_practitioners", "premium_shops"],
                "service_details": {
                    "includes": ["Consultation", "Shampoo", "Haircut", "Beard trim", "Hot towel", "Scalp massage", "Styling"],
                    "techniques": ["Complete grooming", "Advanced styling", "Beard shaping"],
                    "consultation_notes": "Comprehensive grooming consultation",
                    "value_adds": ["Grooming routine", "Product education", "Maintenance schedule"]
                },
                "pricing_strategy": {
                    "methodology": "package_value",
                    "individual_service_total": 100.0,
                    "package_discount": 20.0,
                    "value_perception": "convenience_premium",
                    "minimum_viable_price": 60.0,
                    "target_profit_margin": 65.0
                }
            },
            
            # PREMIUM TIER - Luxury Services
            {
                "name": "executive_grooming_service",
                "display_name": "Executive Grooming Service",
                "description": "Premium service designed for professionals who value quality and time efficiency. Perfect for building high-value client relationships.",
                "category": ServiceCategoryEnum.PACKAGE,
                "six_fb_tier": "premium",
                "methodology_score": 98.0,
                "revenue_impact": "high",
                "client_relationship_impact": "high",
                "suggested_base_price": 120.0,
                "suggested_min_price": 90.0,
                "suggested_max_price": 160.0,
                "duration_minutes": 90,
                "buffer_time_minutes": 20,
                "requires_consultation": True,
                "upsell_opportunities": [],
                "client_value_tier": "luxury",
                "profit_margin_target": 60.0,
                "template_type": "preset",
                "is_six_fb_certified": True,
                "target_market": "luxury",
                "recommended_for": ["6fb_practitioners", "premium_shops", "luxury_establishments"],
                "service_details": {
                    "includes": ["VIP consultation", "Luxury shampoo", "Precision cut", "Beard service", "Hot towel treatment", "Scalp massage", "Premium styling", "Refreshments"],
                    "techniques": ["Master-level cutting", "Luxury treatments", "Executive styling"],
                    "consultation_notes": "Comprehensive lifestyle and image consultation",
                    "value_adds": ["Image consulting", "Grooming schedule", "Priority booking", "Premium products"]
                },
                "pricing_strategy": {
                    "methodology": "luxury_value",
                    "factors": ["exclusivity", "time_efficiency", "premium_experience", "expertise"],
                    "positioning": "executive_service",
                    "minimum_viable_price": 90.0,
                    "target_profit_margin": 60.0
                },
                "business_rules": {
                    "booking_restrictions": ["vip_clients_only"],
                    "preparation_time": 15,
                    "cleanup_time": 5,
                    "consultation_required": True,
                    "consultation_duration": 15,
                    "advance_booking_days": 30,
                    "priority_scheduling": True
                }
            },
            
            {
                "name": "classic_straight_razor_shave",
                "display_name": "Classic Straight Razor Shave",
                "description": "Traditional luxury shaving experience that showcases master craftsmanship and creates memorable client experiences.",
                "category": ServiceCategoryEnum.SHAVE,
                "six_fb_tier": "premium",
                "methodology_score": 95.0,
                "revenue_impact": "high",
                "client_relationship_impact": "high",
                "suggested_base_price": 75.0,
                "suggested_min_price": 55.0,
                "suggested_max_price": 100.0,
                "duration_minutes": 50,
                "buffer_time_minutes": 10,
                "requires_consultation": True,
                "upsell_opportunities": [],
                "client_value_tier": "luxury",
                "profit_margin_target": 70.0,
                "template_type": "preset",
                "is_six_fb_certified": True,
                "target_market": "luxury",
                "recommended_for": ["experienced_barbers", "luxury_establishments"],
                "service_details": {
                    "includes": ["Hot towel prep", "Pre-shave oil", "Straight razor shave", "Hot towel finish", "After-shave treatment", "Face massage"],
                    "techniques": ["Straight razor mastery", "Traditional techniques", "Luxury treatments"],
                    "consultation_notes": "Skin assessment and shaving preferences",
                    "value_adds": ["Shaving education", "Product recommendations", "Skin care advice"]
                },
                "pricing_strategy": {
                    "methodology": "experiential_luxury",
                    "factors": ["craftsmanship", "tradition", "experience", "time_investment"],
                    "positioning": "luxury_experience",
                    "minimum_viable_price": 55.0,
                    "target_profit_margin": 70.0
                }
            },
            
            # LUXURY TIER - Ultimate Services
            {
                "name": "master_craftsman_experience",
                "display_name": "Master Craftsman Experience",
                "description": "The ultimate barbering experience combining advanced techniques, luxury treatments, and personalized service. Peak 6FB methodology implementation.",
                "category": ServiceCategoryEnum.PACKAGE,
                "six_fb_tier": "luxury",
                "methodology_score": 100.0,
                "revenue_impact": "high",
                "client_relationship_impact": "high",
                "suggested_base_price": 200.0,
                "suggested_min_price": 150.0,
                "suggested_max_price": 280.0,
                "duration_minutes": 120,
                "buffer_time_minutes": 30,
                "requires_consultation": True,
                "upsell_opportunities": [],
                "client_value_tier": "luxury",
                "profit_margin_target": 55.0,
                "template_type": "preset",
                "is_six_fb_certified": True,
                "target_market": "luxury",
                "recommended_for": ["master_barbers", "luxury_establishments"],
                "service_details": {
                    "includes": ["VIP reception", "Luxury consultation", "Premium shampoo", "Master-level cut", "Straight razor shave", "Beard sculpting", "Multiple hot towel treatments", "Scalp massage", "Face treatment", "Premium styling", "Luxury refreshments"],
                    "techniques": ["Master craftsmanship", "Advanced techniques", "Luxury service delivery"],
                    "consultation_notes": "Complete image and lifestyle consultation",
                    "value_adds": ["Personal grooming plan", "VIP scheduling", "Exclusive products", "Ongoing style evolution"]
                },
                "pricing_strategy": {
                    "methodology": "ultimate_luxury",
                    "factors": ["mastery", "exclusivity", "complete_experience", "time_investment", "luxury_positioning"],
                    "positioning": "ultimate_experience",
                    "minimum_viable_price": 150.0,
                    "target_profit_margin": 55.0
                },
                "business_rules": {
                    "booking_restrictions": ["exclusive_clients_only"],
                    "preparation_time": 20,
                    "cleanup_time": 10,
                    "consultation_required": True,
                    "consultation_duration": 20,
                    "advance_booking_days": 45,
                    "priority_scheduling": True,
                    "requires_certification": True
                }
            },
            
            # SPECIALIZED SERVICES
            {
                "name": "consultation_and_style_planning",
                "display_name": "Style Consultation & Planning",
                "description": "In-depth consultation service for style planning and client relationship building. Essential for 6FB methodology implementation.",
                "category": ServiceCategoryEnum.OTHER,
                "six_fb_tier": "professional",
                "methodology_score": 88.0,
                "revenue_impact": "medium",
                "client_relationship_impact": "high",
                "suggested_base_price": 30.0,
                "suggested_min_price": 20.0,
                "suggested_max_price": 50.0,
                "duration_minutes": 30,
                "buffer_time_minutes": 5,
                "requires_consultation": False,
                "upsell_opportunities": [],
                "client_value_tier": "premium",
                "profit_margin_target": 85.0,
                "template_type": "preset",
                "is_six_fb_certified": True,
                "target_market": "urban",
                "recommended_for": ["6fb_practitioners", "relationship_builders"],
                "service_details": {
                    "includes": ["Comprehensive consultation", "Style analysis", "Lifestyle assessment", "Maintenance planning", "Product recommendations"],
                    "techniques": ["Consultation mastery", "Style analysis", "Client relationship building"],
                    "consultation_notes": "Complete style and lifestyle consultation",
                    "value_adds": ["Written style plan", "Photo references", "Maintenance schedule"]
                },
                "pricing_strategy": {
                    "methodology": "consultation_value",
                    "factors": ["expertise", "time_investment", "planning_value", "relationship_building"],
                    "positioning": "professional_consultation",
                    "minimum_viable_price": 20.0,
                    "target_profit_margin": 85.0
                }
            }
        ]
    
    def create_template(self, template_data: ServiceTemplateCreate, created_by_id: Optional[int] = None) -> ServiceTemplate:
        """Create a new service template"""
        template = ServiceTemplate(
            **template_data.dict(),
            created_by_id=created_by_id
        )
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        
        logger.info(f"Created service template: {template.name} (ID: {template.id})")
        return template
    
    def get_templates(self, filters: Optional[ServiceTemplateFilterRequest] = None, skip: int = 0, limit: int = 50) -> List[ServiceTemplate]:
        """Get service templates with optional filtering"""
        query = self.db.query(ServiceTemplate).filter(ServiceTemplate.is_active == True)
        
        if filters:
            if filters.category:
                query = query.filter(ServiceTemplate.category == filters.category)
            if filters.six_fb_tier:
                query = query.filter(ServiceTemplate.six_fb_tier == filters.six_fb_tier)
            if filters.revenue_impact:
                query = query.filter(ServiceTemplate.revenue_impact == filters.revenue_impact)
            if filters.client_relationship_impact:
                query = query.filter(ServiceTemplate.client_relationship_impact == filters.client_relationship_impact)
            if filters.min_price is not None:
                query = query.filter(ServiceTemplate.suggested_base_price >= filters.min_price)
            if filters.max_price is not None:
                query = query.filter(ServiceTemplate.suggested_base_price <= filters.max_price)
            if filters.requires_consultation is not None:
                query = query.filter(ServiceTemplate.requires_consultation == filters.requires_consultation)
            if filters.target_market:
                query = query.filter(ServiceTemplate.target_market == filters.target_market)
            if filters.is_six_fb_certified is not None:
                query = query.filter(ServiceTemplate.is_six_fb_certified == filters.is_six_fb_certified)
            if filters.is_featured is not None:
                query = query.filter(ServiceTemplate.is_featured == filters.is_featured)
            if filters.search_query:
                search_term = f"%{filters.search_query}%"
                query = query.filter(
                    or_(
                        ServiceTemplate.display_name.ilike(search_term),
                        ServiceTemplate.description.ilike(search_term)
                    )
                )
        
        # Order by 6FB alignment, featured status, and popularity
        query = query.order_by(
            ServiceTemplate.is_featured.desc(),
            ServiceTemplate.methodology_score.desc(),
            ServiceTemplate.popularity_score.desc(),
            ServiceTemplate.display_name
        )
        
        return query.offset(skip).limit(limit).all()
    
    def get_template_by_id(self, template_id: int) -> Optional[ServiceTemplate]:
        """Get a specific service template by ID"""
        return self.db.query(ServiceTemplate).filter(
            ServiceTemplate.id == template_id,
            ServiceTemplate.is_active == True
        ).first()
    
    def apply_template_to_user(self, user_id: int, apply_request: ServiceTemplateApplyRequest) -> ServiceTemplateApplyResponse:
        """Apply a service template to create a new service for the user"""
        template = self.get_template_by_id(apply_request.template_id)
        if not template:
            raise ValueError(f"Service template {apply_request.template_id} not found")
        
        # Determine final pricing
        applied_price = apply_request.custom_price or template.suggested_base_price
        
        # Create the service from template
        service_data = {
            "name": apply_request.custom_name or template.display_name,
            "description": apply_request.custom_description or template.description,
            "category": template.category,
            "base_price": applied_price,
            "min_price": template.suggested_min_price,
            "max_price": template.suggested_max_price,
            "duration_minutes": template.duration_minutes,
            "buffer_time_minutes": template.buffer_time_minutes,
            "requires_consultation": template.requires_consultation,
            "is_active": True,
            "created_by_id": user_id
        }
        
        service = Service(**service_data)
        self.db.add(service)
        self.db.flush()  # Get the service ID
        
        # Track template application
        user_template = UserServiceTemplate(
            user_id=user_id,
            service_template_id=template.id,
            service_id=service.id,
            applied_price=applied_price,
            customizations={
                "custom_name": apply_request.custom_name,
                "custom_description": apply_request.custom_description,
                "apply_business_rules": apply_request.apply_business_rules,
                "apply_pricing_rules": apply_request.apply_pricing_rules
            }
        )
        self.db.add(user_template)
        
        # Update template usage count
        template.usage_count += 1
        
        self.db.commit()
        self.db.refresh(service)
        
        logger.info(f"Applied template {template.name} to user {user_id}, created service {service.id}")
        
        return ServiceTemplateApplyResponse(
            service_id=service.id,
            template_id=template.id,
            applied_price=applied_price,
            customizations_applied=user_template.customizations,
            business_rules_created=[],  # TODO: Implement business rule creation
            message=f"Successfully created '{service.name}' from 6FB template"
        )
    
    def get_user_applied_templates(self, user_id: int) -> List[UserServiceTemplate]:
        """Get templates that a user has applied"""
        return self.db.query(UserServiceTemplate).filter(
            UserServiceTemplate.user_id == user_id
        ).order_by(UserServiceTemplate.applied_at.desc()).all()
    
    def get_featured_templates(self, limit: int = 6) -> List[ServiceTemplate]:
        """Get featured service templates for onboarding"""
        return self.db.query(ServiceTemplate).filter(
            ServiceTemplate.is_active == True,
            ServiceTemplate.is_featured == True
        ).order_by(
            ServiceTemplate.methodology_score.desc(),
            ServiceTemplate.popularity_score.desc()
        ).limit(limit).all()
    
    def populate_six_fb_presets(self) -> List[ServiceTemplate]:
        """Populate the database with built-in 6FB service templates"""
        templates = []
        preset_data = self.get_six_fb_preset_templates()
        
        for template_data in preset_data:
            # Check if template already exists
            existing = self.db.query(ServiceTemplate).filter(
                ServiceTemplate.name == template_data["name"]
            ).first()
            
            if existing:
                logger.info(f"Service template {template_data['name']} already exists, skipping")
                templates.append(existing)
                continue
            
            # Create template
            template = ServiceTemplate(**template_data)
            template.is_featured = True  # All 6FB presets are featured
            self.db.add(template)
            templates.append(template)
            
            logger.info(f"Created 6FB preset template: {template_data['name']}")
        
        self.db.commit()
        
        # Refresh all templates
        for template in templates:
            self.db.refresh(template)
        
        logger.info(f"Successfully populated {len(templates)} 6FB service template presets")
        return templates


def get_service_template_service(db: Session) -> ServiceTemplateService:
    """Dependency injection for ServiceTemplateService"""
    return ServiceTemplateService(db)