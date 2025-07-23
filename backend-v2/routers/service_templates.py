"""
Service Templates API Router

API endpoints for Six Figure Barber service template management.
Enables plug-and-play onboarding with 6FB methodology-aligned presets.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from db import get_db
from models import User
from dependencies import get_current_user
from services.service_template_service import ServiceTemplateService, get_service_template_service
from schemas import (
    ServiceTemplateResponse, ServiceTemplateListResponse, ServiceTemplateCreate,
    ServiceTemplateUpdate, ServiceTemplateApplyRequest, ServiceTemplateApplyResponse,
    ServiceTemplateFilterRequest, ServiceTemplateCategoryResponse
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=ServiceTemplateListResponse)
async def get_service_templates(
    category: Optional[str] = Query(None, description="Filter by service category"),
    six_fb_tier: Optional[str] = Query(None, description="Filter by 6FB tier"),
    revenue_impact: Optional[str] = Query(None, description="Filter by revenue impact"),
    client_relationship_impact: Optional[str] = Query(None, description="Filter by client relationship impact"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    requires_consultation: Optional[bool] = Query(None, description="Filter by consultation requirement"),
    target_market: Optional[str] = Query(None, description="Filter by target market"),
    is_six_fb_certified: Optional[bool] = Query(None, description="Filter by 6FB certification"),
    is_featured: Optional[bool] = Query(None, description="Filter by featured status"),
    search_query: Optional[str] = Query(None, max_length=100, description="Search in name and description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    template_service: ServiceTemplateService = Depends(get_service_template_service)
):
    """
    Get service templates with optional filtering.
    
    Supports comprehensive filtering by 6FB methodology criteria:
    - Service category and tier
    - Revenue and relationship impact
    - Pricing ranges
    - Market targeting
    - 6FB certification status
    """
    try:
        # Build filter request
        filters = ServiceTemplateFilterRequest(
            category=category,
            six_fb_tier=six_fb_tier,
            revenue_impact=revenue_impact,
            client_relationship_impact=client_relationship_impact,
            min_price=min_price,
            max_price=max_price,
            requires_consultation=requires_consultation,
            target_market=target_market,
            is_six_fb_certified=is_six_fb_certified,
            is_featured=is_featured,
            search_query=search_query
        )
        
        # Calculate pagination
        skip = (page - 1) * page_size
        
        # Get templates
        templates = template_service.get_templates(filters=filters, skip=skip, limit=page_size + 1)
        
        # Check if there are more results
        has_next = len(templates) > page_size
        if has_next:
            templates = templates[:-1]  # Remove the extra item
        
        # Convert to response format
        template_responses = []
        for template in templates:
            response = ServiceTemplateResponse.from_orm(template)
            response.pricing_range_display = template.pricing_range_display
            response.is_six_figure_aligned = template.is_six_figure_aligned
            template_responses.append(response)
        
        return ServiceTemplateListResponse(
            templates=template_responses,
            total=len(template_responses),  # Note: This is page total, not global total
            page=page,
            page_size=page_size,
            has_next=has_next,
            has_previous=page > 1
        )
        
    except Exception as e:
        logger.error(f"Error fetching service templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch service templates"
        )


@router.get("/featured", response_model=List[ServiceTemplateResponse])
async def get_featured_templates(
    limit: int = Query(6, ge=1, le=20, description="Number of featured templates to return"),
    db: Session = Depends(get_db),
    template_service: ServiceTemplateService = Depends(get_service_template_service)
):
    """
    Get featured service templates for onboarding.
    
    Returns the most popular and highly-rated 6FB methodology templates
    that are recommended for new users during onboarding.
    """
    try:
        templates = template_service.get_featured_templates(limit=limit)
        
        # Convert to response format
        responses = []
        for template in templates:
            response = ServiceTemplateResponse.from_orm(template)
            response.pricing_range_display = template.pricing_range_display
            response.is_six_figure_aligned = template.is_six_figure_aligned
            responses.append(response)
        
        return responses
        
    except Exception as e:
        logger.error(f"Error fetching featured templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch featured templates"
        )


@router.get("/{template_id}", response_model=ServiceTemplateResponse)
async def get_service_template(
    template_id: int,
    db: Session = Depends(get_db),
    template_service: ServiceTemplateService = Depends(get_service_template_service)
):
    """
    Get a specific service template by ID.
    
    Returns detailed information about a service template including
    6FB methodology alignment, pricing strategy, and implementation details.
    """
    try:
        template = template_service.get_template_by_id(template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service template {template_id} not found"
            )
        
        response = ServiceTemplateResponse.from_orm(template)
        response.pricing_range_display = template.pricing_range_display
        response.is_six_figure_aligned = template.is_six_figure_aligned
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching service template {template_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch service template"
        )


@router.post("/apply", response_model=ServiceTemplateApplyResponse)
async def apply_service_template(
    apply_request: ServiceTemplateApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    template_service: ServiceTemplateService = Depends(get_service_template_service)
):
    """
    Apply a service template to create a new service for the current user.
    
    This endpoint allows users to quickly create services from 6FB methodology
    templates with optional customizations for pricing and details.
    """
    try:
        result = template_service.apply_template_to_user(
            user_id=current_user.id,
            apply_request=apply_request
        )
        
        logger.info(f"User {current_user.id} applied template {apply_request.template_id}")
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error applying template {apply_request.template_id} for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply service template"
        )


@router.get("/user/applied", response_model=List[dict])
async def get_user_applied_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    template_service: ServiceTemplateService = Depends(get_service_template_service)
):
    """
    Get service templates that the current user has applied.
    
    Returns a history of applied templates with usage statistics
    and success metrics for tracking business performance.
    """
    try:
        applied_templates = template_service.get_user_applied_templates(current_user.id)
        
        # Convert to response format with additional template info
        results = []
        for user_template in applied_templates:
            template = user_template.service_template
            service = user_template.service
            
            result = {
                "id": user_template.id,
                "template_id": template.id,
                "template_name": template.display_name,
                "template_tier": template.six_fb_tier,
                "service_id": user_template.service_id,
                "service_name": service.name if service else None,
                "applied_price": user_template.applied_price,
                "applied_at": user_template.applied_at,
                "last_used_at": user_template.last_used_at,
                "customizations": user_template.customizations,
                "revenue_generated": user_template.revenue_generated,
                "bookings_count": user_template.bookings_count,
                "client_satisfaction_avg": user_template.client_satisfaction_avg,
                "template_methodology_score": template.methodology_score,
                "is_six_figure_aligned": template.is_six_figure_aligned
            }
            results.append(result)
        
        return results
        
    except Exception as e:
        logger.error(f"Error fetching applied templates for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch applied templates"
        )


@router.post("/populate-presets", response_model=dict)
async def populate_six_fb_presets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    template_service: ServiceTemplateService = Depends(get_service_template_service)
):
    """
    Populate the database with built-in Six Figure Barber service templates.
    
    This endpoint creates the default 6FB methodology-aligned service templates
    that provide plug-and-play onboarding for new barbers.
    
    Note: Requires admin privileges in production.
    """
    try:
        # TODO: Add admin authorization check in production
        # if not current_user.is_admin:
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        templates = template_service.populate_six_fb_presets()
        
        logger.info(f"Populated {len(templates)} 6FB preset templates")
        
        return {
            "message": f"Successfully populated {len(templates)} Six Figure Barber preset templates",
            "templates_created": [
                {
                    "id": t.id,
                    "name": t.display_name,
                    "tier": t.six_fb_tier,
                    "methodology_score": t.methodology_score
                }
                for t in templates
            ]
        }
        
    except Exception as e:
        logger.error(f"Error populating 6FB presets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to populate 6FB preset templates"
        )


@router.post("/", response_model=ServiceTemplateResponse)
async def create_service_template(
    template_data: ServiceTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    template_service: ServiceTemplateService = Depends(get_service_template_service)
):
    """
    Create a new custom service template.
    
    Allows users to create their own service templates based on
    successful services, contributing to the community marketplace.
    """
    try:
        template = template_service.create_template(
            template_data=template_data,
            created_by_id=current_user.id
        )
        
        response = ServiceTemplateResponse.from_orm(template)
        response.pricing_range_display = template.pricing_range_display
        response.is_six_figure_aligned = template.is_six_figure_aligned
        
        logger.info(f"User {current_user.id} created custom template: {template.name}")
        return response
        
    except Exception as e:
        logger.error(f"Error creating template for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create service template"
        )


@router.get("/tiers/summary", response_model=dict)
async def get_six_fb_tier_summary(
    db: Session = Depends(get_db),
    template_service: ServiceTemplateService = Depends(get_service_template_service)
):
    """
    Get a summary of available service templates organized by 6FB tiers.
    
    Provides an overview of the template ecosystem with counts and
    average metrics for each methodology tier.
    """
    try:
        # Get all active templates
        all_templates = template_service.get_templates()
        
        # Organize by tier
        tiers = {}
        for template in all_templates:
            tier = template.six_fb_tier
            if tier not in tiers:
                tiers[tier] = {
                    "tier": tier,
                    "count": 0,
                    "avg_methodology_score": 0.0,
                    "avg_price": 0.0,
                    "price_range": {"min": float('inf'), "max": 0.0},
                    "categories": set(),
                    "templates": []
                }
            
            tier_data = tiers[tier]
            tier_data["count"] += 1
            tier_data["avg_methodology_score"] += template.methodology_score
            tier_data["avg_price"] += template.suggested_base_price
            tier_data["price_range"]["min"] = min(tier_data["price_range"]["min"], template.suggested_base_price)
            tier_data["price_range"]["max"] = max(tier_data["price_range"]["max"], template.suggested_base_price)
            tier_data["categories"].add(template.category.value)
            tier_data["templates"].append({
                "id": template.id,
                "name": template.display_name,
                "price": template.suggested_base_price,
                "methodology_score": template.methodology_score
            })
        
        # Calculate averages and clean up
        for tier_data in tiers.values():
            if tier_data["count"] > 0:
                tier_data["avg_methodology_score"] /= tier_data["count"]
                tier_data["avg_price"] /= tier_data["count"]
                tier_data["categories"] = list(tier_data["categories"])
                if tier_data["price_range"]["min"] == float('inf'):
                    tier_data["price_range"]["min"] = 0.0
        
        return {
            "tiers": tiers,
            "total_templates": len(all_templates),
            "six_fb_methodology_info": {
                "starter": "Foundation services for new 6FB practitioners",
                "professional": "Enhanced services for established practitioners", 
                "premium": "High-value services for experienced practitioners",
                "luxury": "Ultimate services for master-level practitioners"
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating tier summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate tier summary"
        )