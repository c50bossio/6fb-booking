"""FastAPI router for homepage builder functionality.

This router provides endpoints for managing advanced homepage customization
with section-based design that extends the existing landing page system.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
import asyncio
from datetime import datetime

from database import get_db
from models import User, Organization, UserOrganization
from routers.auth import get_current_user
# UserOrganization is imported via the main models import
from schemas_new.homepage_builder import (
    HomepageBuilderConfig,
    HomepageBuilderResponse,
    HomepageBuilderUpdate,
    HomepageTemplate,
    HomepageSectionConfig,
    SectionType,
    BrandingConfig,
    SEOConfig,
    AdvancedConfig,
    HomepageAnalytics
)
from services.homepage_builder_service import HomepageBuilderService
from services.landing_page_service import LandingPageService
from dependencies import get_current_organization, require_organization_access
from utils.permissions import require_role
from models.organization import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/organizations/current/homepage-builder",
    tags=["Homepage Builder"]
)


@router.get("/config", response_model=HomepageBuilderConfig)
async def get_homepage_config(
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get the current homepage builder configuration."""
    
    try:
        # Check permissions
        require_organization_access(db, current_user, organization.id)
        
        config = HomepageBuilderService.get_organization_homepage_config(db, organization)
        return config
        
    except Exception as e:
        logger.error(f"Error getting homepage config for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve homepage configuration"
        )


@router.put("/config", response_model=HomepageBuilderConfig)
async def update_homepage_config(
    config_update: HomepageBuilderUpdate,
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update the homepage builder configuration."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        updated_config = HomepageBuilderService.update_homepage_config(
            db, organization, config_update
        )
        
        logger.info(f"Homepage config updated for organization {organization.id} by user {current_user.id}")
        return updated_config
        
    except ValueError as e:
        logger.warning(f"Invalid homepage config update: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating homepage config for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update homepage configuration"
        )


@router.get("/data", response_model=HomepageBuilderResponse)
async def get_homepage_data(
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get complete homepage data including populated sections."""
    
    try:
        # Check permissions
        require_organization_access(db, current_user, organization.id)
        
        homepage_data = await HomepageBuilderService.get_homepage_builder_data(
            db, organization.slug
        )
        
        if not homepage_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homepage data not found or not enabled"
            )
        
        return homepage_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting homepage data for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve homepage data"
        )


@router.get("/templates", response_model=List[HomepageTemplate])
async def get_available_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available homepage templates."""
    
    try:
        templates = HomepageBuilderService.get_available_templates()
        return templates
        
    except Exception as e:
        logger.error(f"Error getting homepage templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve homepage templates"
        )


@router.get("/templates/{template_id}", response_model=HomepageTemplate)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific homepage template by ID."""
    
    try:
        template = HomepageBuilderService.get_template_by_id(template_id)
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template {template_id} not found"
            )
        
        return template
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template {template_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve template"
        )


@router.post("/apply-template/{template_id}", response_model=HomepageBuilderConfig)
async def apply_template(
    template_id: str,
    preserve_content: bool = Body(True, embed=True),
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Apply a template to the organization's homepage."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        updated_config = HomepageBuilderService.apply_template(
            db, organization, template_id, preserve_content
        )
        
        logger.info(f"Template {template_id} applied to organization {organization.id} by user {current_user.id}")
        return updated_config
        
    except ValueError as e:
        logger.warning(f"Invalid template application: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error applying template {template_id} to org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply template"
        )


@router.post("/sections", response_model=HomepageBuilderConfig)
async def add_section(
    section_config: HomepageSectionConfig,
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Add a new section to the homepage."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        # Get current config
        current_config = HomepageBuilderService.get_organization_homepage_config(db, organization)
        
        # Add the new section
        sections = current_config.sections.copy()
        sections.append(section_config)
        
        # Update configuration
        update = HomepageBuilderUpdate(sections=sections)
        updated_config = HomepageBuilderService.update_homepage_config(
            db, organization, update
        )
        
        logger.info(f"Section {section_config.section_type} added to organization {organization.id}")
        return updated_config
        
    except Exception as e:
        logger.error(f"Error adding section to org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add section"
        )


@router.put("/sections/{section_type}", response_model=HomepageBuilderConfig)
async def update_section(
    section_type: SectionType,
    section_config: HomepageSectionConfig,
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update a specific section configuration."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        # Get current config
        current_config = HomepageBuilderService.get_organization_homepage_config(db, organization)
        
        # Find and update the section
        sections = current_config.sections.copy()
        section_found = False
        
        for i, section in enumerate(sections):
            if section.section_type == section_type:
                sections[i] = section_config
                section_found = True
                break
        
        if not section_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section {section_type} not found"
            )
        
        # Update configuration
        update = HomepageBuilderUpdate(sections=sections)
        updated_config = HomepageBuilderService.update_homepage_config(
            db, organization, update
        )
        
        logger.info(f"Section {section_type} updated for organization {organization.id}")
        return updated_config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating section {section_type} for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update section"
        )


@router.delete("/sections/{section_type}", response_model=HomepageBuilderConfig)
async def delete_section(
    section_type: SectionType,
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Delete a section from the homepage."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        # Get current config
        current_config = HomepageBuilderService.get_organization_homepage_config(db, organization)
        
        # Remove the section
        sections = [s for s in current_config.sections if s.section_type != section_type]
        
        if len(sections) == len(current_config.sections):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section {section_type} not found"
            )
        
        # Update configuration
        update = HomepageBuilderUpdate(sections=sections)
        updated_config = HomepageBuilderService.update_homepage_config(
            db, organization, update
        )
        
        logger.info(f"Section {section_type} deleted from organization {organization.id}")
        return updated_config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting section {section_type} for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete section"
        )


@router.post("/sections/reorder", response_model=HomepageBuilderConfig)
async def reorder_sections(
    section_orders: List[Dict[str, Any]] = Body(...),
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Reorder homepage sections.
    
    Args:
        section_orders: List of {"section_type": "hero", "order": 0} objects
    """
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        # Get current config
        current_config = HomepageBuilderService.get_organization_homepage_config(db, organization)
        
        # Update section orders
        sections = current_config.sections.copy()
        order_map = {item["section_type"]: item["order"] for item in section_orders}
        
        for section in sections:
            if section.section_type in order_map:
                section.order = order_map[section.section_type]
        
        # Sort by order
        sections.sort(key=lambda x: x.order)
        
        # Update configuration
        update = HomepageBuilderUpdate(sections=sections)
        updated_config = HomepageBuilderService.update_homepage_config(
            db, organization, update
        )
        
        logger.info(f"Sections reordered for organization {organization.id}")
        return updated_config
        
    except Exception as e:
        logger.error(f"Error reordering sections for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder sections"
        )


@router.post("/branding", response_model=HomepageBuilderConfig)
async def update_branding(
    branding_config: BrandingConfig,
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update homepage branding configuration."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        update = HomepageBuilderUpdate(branding=branding_config)
        updated_config = HomepageBuilderService.update_homepage_config(
            db, organization, update
        )
        
        logger.info(f"Branding updated for organization {organization.id}")
        return updated_config
        
    except Exception as e:
        logger.error(f"Error updating branding for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update branding"
        )


@router.post("/seo", response_model=HomepageBuilderConfig)
async def update_seo(
    seo_config: SEOConfig,
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update homepage SEO configuration."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        update = HomepageBuilderUpdate(seo=seo_config)
        updated_config = HomepageBuilderService.update_homepage_config(
            db, organization, update
        )
        
        logger.info(f"SEO config updated for organization {organization.id}")
        return updated_config
        
    except Exception as e:
        logger.error(f"Error updating SEO for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update SEO configuration"
        )


@router.post("/upload-media")
async def upload_media(
    file: UploadFile = File(...),
    media_type: str = Body("image", embed=True),
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Upload media (images, videos) for homepage use."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        # Validate file type
        allowed_types = {
            "image": ["image/jpeg", "image/png", "image/webp", "image/gif"],
            "video": ["video/mp4", "video/webm", "video/ogg"]
        }
        
        if file.content_type not in allowed_types.get(media_type, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type for {media_type}"
            )
        
        # TODO: Implement actual file upload to cloud storage
        # For now, return a mock URL
        mock_url = f"/uploads/{organization.slug}/{file.filename}"
        
        logger.info(f"Media uploaded for organization {organization.id}: {file.filename}")
        
        return {"url": mock_url, "type": media_type, "filename": file.filename}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading media for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload media"
        )


@router.post("/publish", response_model=Dict[str, Any])
async def publish_homepage(
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Publish the homepage (make it live)."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        success = HomepageBuilderService.publish_homepage(db, organization)
        
        if success:
            published_url = f"/{organization.slug}"
            logger.info(f"Homepage published for organization {organization.id}")
            
            return {
                "published": True,
                "url": published_url,
                "message": "Homepage has been published successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to publish homepage"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing homepage for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish homepage"
        )


@router.post("/unpublish", response_model=Dict[str, Any])
async def unpublish_homepage(
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Unpublish the homepage (take it offline)."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        success = HomepageBuilderService.unpublish_homepage(db, organization)
        
        if success:
            logger.info(f"Homepage unpublished for organization {organization.id}")
            
            return {
                "published": False,
                "message": "Homepage has been unpublished successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to unpublish homepage"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unpublishing homepage for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unpublish homepage"
        )


@router.post("/migrate-from-landing-page", response_model=HomepageBuilderConfig)
async def migrate_from_landing_page(
    current_user: User = Depends(get_current_user),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Migrate existing landing page configuration to homepage builder."""
    
    try:
        # Check permissions - require shop owner or admin
        require_organization_access(db, current_user, organization.id)
        require_role(current_user, [UserRole.SHOP_OWNER, UserRole.ENTERPRISE_OWNER])
        
        homepage_config = HomepageBuilderService.duplicate_from_landing_page(
            db, organization
        )
        
        logger.info(f"Landing page migrated to homepage builder for organization {organization.id}")
        return homepage_config
        
    except Exception as e:
        logger.error(f"Error migrating landing page for org {organization.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to migrate landing page"
        )


@router.get("/preview/{organization_slug}")
async def preview_homepage(
    organization_slug: str,
    db: Session = Depends(get_db)
):
    """Get public preview of homepage data for rendering."""
    
    try:
        homepage_data = await HomepageBuilderService.get_homepage_builder_data(
            db, organization_slug
        )
        
        if not homepage_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homepage not found or not published"
            )
        
        return homepage_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting homepage preview for {organization_slug}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve homepage preview"
        )