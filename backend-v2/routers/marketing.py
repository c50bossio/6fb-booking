from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import csv
import io
import json

from database import get_db
from models import User, Client, NotificationTemplate
from schemas import (
    MarketingCampaignCreate, MarketingCampaignUpdate, MarketingCampaignResponse,
    MarketingTemplateCreate, MarketingTemplateUpdate, MarketingTemplateResponse,
    ContactListCreate, ContactListResponse, ContactSegmentCreate, ContactSegmentResponse,
    CampaignAnalyticsResponse, MarketingUsageResponse, CampaignSendRequest,
    ContactImportResponse, ContactExportRequest, ContactBulkActionRequest,
    MarketingCampaignListResponse
)
from utils.auth import get_current_user
from utils.rate_limit import limiter
from services.notification_service import NotificationService
from services.marketing_service import MarketingService
import logging

logger = logging.getLogger(__name__)

# Create service instances
notification_service = NotificationService()
marketing_service = MarketingService()

router = APIRouter(prefix="/marketing", tags=["marketing"])

# Rate limiting for campaign sending
campaign_send_rate_limit = limiter.limit("5/hour")  # 5 campaigns per hour
bulk_action_rate_limit = limiter.limit("10/minute")  # 10 bulk actions per minute

def verify_admin_access(current_user: User) -> None:
    """Verify user has admin or super_admin role"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin or Super Admin access required."
        )

# Campaign Management Endpoints
@router.post("/campaigns", response_model=MarketingCampaignResponse)
async def create_campaign(
    campaign_data: MarketingCampaignCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new marketing campaign"""
    verify_admin_access(current_user)
    
    try:
        campaign = marketing_service.create_campaign(
            db=db,
            campaign_data=campaign_data,
            created_by_id=current_user.id
        )
        logger.info(f"Campaign '{campaign.name}' created by user {current_user.id}")
        return campaign
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create campaign"
        )

@router.get("/campaigns", response_model=MarketingCampaignListResponse)
async def list_campaigns(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    status: Optional[str] = Query(None, description="Filter by campaign status"),
    campaign_type: Optional[str] = Query(None, description="Filter by campaign type (email/sms)"),
    search: Optional[str] = Query(None, description="Search in campaign name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all marketing campaigns with pagination and filters"""
    verify_admin_access(current_user)
    
    campaigns, total = marketing_service.list_campaigns(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        campaign_type=campaign_type,
        search=search
    )
    
    return {
        "campaigns": campaigns,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/campaigns/{campaign_id}", response_model=MarketingCampaignResponse)
async def get_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific campaign"""
    verify_admin_access(current_user)
    
    campaign = marketing_service.get_campaign(db=db, campaign_id=campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    return campaign

@router.put("/campaigns/{campaign_id}", response_model=MarketingCampaignResponse)
async def update_campaign(
    campaign_id: int,
    campaign_data: MarketingCampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a marketing campaign"""
    verify_admin_access(current_user)
    
    try:
        campaign = marketing_service.update_campaign(
            db=db,
            campaign_id=campaign_id,
            campaign_data=campaign_data
        )
        logger.info(f"Campaign {campaign_id} updated by user {current_user.id}")
        return campaign
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating campaign: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update campaign"
        )

@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a marketing campaign"""
    verify_admin_access(current_user)
    
    success = marketing_service.delete_campaign(db=db, campaign_id=campaign_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found or already sent"
        )
    
    logger.info(f"Campaign {campaign_id} deleted by user {current_user.id}")
    return {"message": "Campaign deleted successfully"}

@router.post("/campaigns/{campaign_id}/send")
@campaign_send_rate_limit
async def send_campaign(
    request: Request,
    campaign_id: int,
    send_request: CampaignSendRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a marketing campaign with rate limiting"""
    verify_admin_access(current_user)
    
    # Verify campaign exists and is ready to send
    campaign = marketing_service.get_campaign(db=db, campaign_id=campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    if campaign.status != 'draft':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Campaign is already {campaign.status}. Only draft campaigns can be sent."
        )
    
    try:
        # Queue campaign for sending
        background_tasks.add_task(
            marketing_service.send_campaign,
            db=db,
            campaign_id=campaign_id,
            test_mode=send_request.test_mode,
            test_recipients=send_request.test_recipients
        )
        
        logger.info(f"Campaign {campaign_id} queued for sending by user {current_user.id}")
        return {
            "message": "Campaign queued for sending",
            "campaign_id": campaign_id,
            "test_mode": send_request.test_mode
        }
    except Exception as e:
        logger.error(f"Error queueing campaign: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue campaign for sending"
        )

# Template Management Endpoints
@router.post("/templates", response_model=MarketingTemplateResponse)
async def create_template(
    template_data: MarketingTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new marketing template"""
    verify_admin_access(current_user)
    
    try:
        template = marketing_service.create_template(
            db=db,
            template_data=template_data,
            created_by_id=current_user.id
        )
        logger.info(f"Template '{template.name}' created by user {current_user.id}")
        return template
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template"
        )

@router.get("/templates", response_model=List[MarketingTemplateResponse])
async def list_templates(
    template_type: Optional[str] = Query(None, description="Filter by template type (email/sms)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all marketing templates"""
    verify_admin_access(current_user)
    
    templates = marketing_service.list_templates(
        db=db,
        template_type=template_type,
        category=category
    )
    
    return templates

@router.get("/templates/{template_id}", response_model=MarketingTemplateResponse)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific template"""
    verify_admin_access(current_user)
    
    template = marketing_service.get_template(db=db, template_id=template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return template

@router.put("/templates/{template_id}", response_model=MarketingTemplateResponse)
async def update_template(
    template_id: int,
    template_data: MarketingTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a marketing template"""
    verify_admin_access(current_user)
    
    try:
        template = marketing_service.update_template(
            db=db,
            template_id=template_id,
            template_data=template_data
        )
        logger.info(f"Template {template_id} updated by user {current_user.id}")
        return template
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update template"
        )

@router.post("/templates/{template_id}/preview")
async def preview_template(
    template_id: int,
    sample_data: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview a template with sample data"""
    verify_admin_access(current_user)
    
    preview = marketing_service.preview_template(
        db=db,
        template_id=template_id,
        sample_data=sample_data
    )
    
    if not preview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return preview

# Contact Management Endpoints
@router.get("/contacts", response_model=Dict[str, Any])
async def list_contacts(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    list_id: Optional[int] = Query(None, description="Filter by contact list"),
    segment_id: Optional[int] = Query(None, description="Filter by segment"),
    search: Optional[str] = Query(None, description="Search in name, email, or phone"),
    subscribed_only: bool = Query(True, description="Show only subscribed contacts"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List contacts with filtering and pagination"""
    verify_admin_access(current_user)
    
    contacts, total = marketing_service.list_contacts(
        db=db,
        skip=skip,
        limit=limit,
        list_id=list_id,
        segment_id=segment_id,
        search=search,
        subscribed_only=subscribed_only
    )
    
    return {
        "contacts": contacts,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("/contacts/import", response_model=ContactImportResponse)
@bulk_action_rate_limit
async def import_contacts(
    request: Request,
    file: UploadFile = File(...),
    list_id: Optional[int] = Query(None, description="Add imported contacts to this list"),
    update_existing: bool = Query(False, description="Update existing contacts"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import contacts from CSV file"""
    verify_admin_access(current_user)
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )
    
    try:
        # Read CSV file
        contents = await file.read()
        csv_data = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(csv_data)
        
        # Import contacts
        result = marketing_service.import_contacts(
            db=db,
            csv_reader=reader,
            list_id=list_id,
            update_existing=update_existing,
            imported_by_id=current_user.id
        )
        
        logger.info(f"Imported {result['imported']} contacts by user {current_user.id}")
        return result
        
    except Exception as e:
        logger.error(f"Error importing contacts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import contacts: {str(e)}"
        )

@router.post("/contacts/export")
async def export_contacts(
    export_request: ContactExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export contacts to CSV"""
    verify_admin_access(current_user)
    
    try:
        csv_content = marketing_service.export_contacts(
            db=db,
            list_id=export_request.list_id,
            segment_id=export_request.segment_id,
            fields=export_request.fields
        )
        
        return {
            "content": csv_content,
            "filename": f"contacts_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
        
    except Exception as e:
        logger.error(f"Error exporting contacts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export contacts"
        )

@router.post("/contacts/bulk-action")
@bulk_action_rate_limit
async def bulk_contact_action(
    request: Request,
    bulk_action: ContactBulkActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Perform bulk actions on contacts"""
    verify_admin_access(current_user)
    
    try:
        result = marketing_service.bulk_contact_action(
            db=db,
            contact_ids=bulk_action.contact_ids,
            action=bulk_action.action,
            action_data=bulk_action.action_data
        )
        
        logger.info(f"Bulk action '{bulk_action.action}' performed on {len(bulk_action.contact_ids)} contacts by user {current_user.id}")
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error performing bulk action: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform bulk action"
        )

# Contact Lists
@router.post("/lists", response_model=ContactListResponse)
async def create_contact_list(
    list_data: ContactListCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new contact list"""
    verify_admin_access(current_user)
    
    try:
        contact_list = marketing_service.create_contact_list(
            db=db,
            list_data=list_data,
            created_by_id=current_user.id
        )
        logger.info(f"Contact list '{contact_list.name}' created by user {current_user.id}")
        return contact_list
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/lists", response_model=List[ContactListResponse])
async def list_contact_lists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all contact lists"""
    verify_admin_access(current_user)
    
    lists = marketing_service.list_contact_lists(db=db)
    return lists

# Segments
@router.post("/segments", response_model=ContactSegmentResponse)
async def create_segment(
    segment_data: ContactSegmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new contact segment with dynamic criteria"""
    verify_admin_access(current_user)
    
    try:
        segment = marketing_service.create_segment(
            db=db,
            segment_data=segment_data,
            created_by_id=current_user.id
        )
        logger.info(f"Segment '{segment.name}' created by user {current_user.id}")
        return segment
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/segments", response_model=List[ContactSegmentResponse])
async def list_segments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all contact segments"""
    verify_admin_access(current_user)
    
    segments = marketing_service.list_segments(db=db)
    return segments

# Analytics Endpoints
@router.get("/analytics/{campaign_id}", response_model=CampaignAnalyticsResponse)
async def get_campaign_analytics(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a specific campaign"""
    verify_admin_access(current_user)
    
    analytics = marketing_service.get_campaign_analytics(db=db, campaign_id=campaign_id)
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found or has no analytics data"
        )
    
    return analytics

@router.get("/analytics", response_model=Dict[str, Any])
async def get_marketing_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date for analytics"),
    end_date: Optional[datetime] = Query(None, description="End date for analytics"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall marketing analytics"""
    verify_admin_access(current_user)
    
    # Default to last 30 days if no dates provided
    if not end_date:
        end_date = datetime.now(timezone.utc)
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    analytics = marketing_service.get_overall_analytics(
        db=db,
        start_date=start_date,
        end_date=end_date
    )
    
    return analytics

# Usage/Billing Endpoints
@router.get("/usage", response_model=MarketingUsageResponse)
async def get_marketing_usage(
    period: str = Query("current", description="Usage period: current, last_month, custom"),
    start_date: Optional[datetime] = Query(None, description="Start date for custom period"),
    end_date: Optional[datetime] = Query(None, description="End date for custom period"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get marketing usage statistics for billing purposes"""
    verify_admin_access(current_user)
    
    usage = marketing_service.get_usage_stats(
        db=db,
        period=period,
        start_date=start_date,
        end_date=end_date
    )
    
    return usage

@router.get("/usage/limits")
async def get_usage_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current usage limits and remaining quota"""
    verify_admin_access(current_user)
    
    limits = marketing_service.get_usage_limits(db=db)
    return limits

# Quick Actions
@router.post("/quick-send")
@campaign_send_rate_limit
async def quick_send_message(
    request: Request,
    message_type: str = Query(..., description="Type of message: email or sms"),
    recipients: List[str] = Query(..., description="List of email addresses or phone numbers"),
    subject: Optional[str] = Query(None, description="Email subject (required for email)"),
    content: str = Query(..., description="Message content"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a quick marketing message without creating a campaign"""
    verify_admin_access(current_user)
    
    if message_type not in ['email', 'sms']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message type must be 'email' or 'sms'"
        )
    
    if message_type == 'email' and not subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject is required for email messages"
        )
    
    try:
        result = marketing_service.send_quick_message(
            db=db,
            message_type=message_type,
            recipients=recipients,
            subject=subject,
            content=content,
            sent_by_id=current_user.id
        )
        
        logger.info(f"Quick {message_type} sent to {len(recipients)} recipients by user {current_user.id}")
        return result
        
    except Exception as e:
        logger.error(f"Error sending quick message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )