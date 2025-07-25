"""
Staff invitation API endpoints.

This module provides endpoints for creating, managing, and accepting
staff invitations for organizations.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, EmailStr, Field

from db import get_db
from models import User, UserOrganization
from models.invitation import StaffInvitation, InvitationStatus, InvitationRole
from dependencies import get_current_user, require_organization_access
from services.notification_service import NotificationService
from config import settings
from utils.role_permissions import (
    Permission,
    PermissionChecker
)

import logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/invitations",
    tags=["invitations"],
    responses={404: {"description": "Not found"}},
)


# Pydantic models
class InvitationCreate(BaseModel):
    """Request model for creating an invitation"""
    email: EmailStr
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: InvitationRole
    message: Optional[str] = Field(None, max_length=500)
    organization_id: int


class InvitationResponse(BaseModel):
    """Response model for invitation data"""
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    organization_id: int
    organization_name: str
    status: str
    created_at: datetime
    expires_at: datetime
    days_until_expiry: int
    invited_by_name: str
    message: Optional[str]
    invitation_url: Optional[str] = None

    class Config:
        from_attributes = True


class InvitationAccept(BaseModel):
    """Request model for accepting an invitation"""
    password: str = Field(..., min_length=8)
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class InvitationListResponse(BaseModel):
    """Response model for invitation list"""
    invitations: List[InvitationResponse]
    total: int
    pending_count: int
    accepted_count: int


def has_invitation_permission(checker: PermissionChecker) -> bool:
    """Check if user has permission to manage invitations using new permission system"""
    return checker.has_permission(Permission.INVITE_STAFF)


@router.post("/", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    invitation_data: InvitationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create and send a new staff invitation.
    
    Requires: Organization owner/manager or staff management permission
    """
    # Check organization access
    user_org = require_organization_access(
        db, current_user, invitation_data.organization_id
    )
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, invitation_data.organization_id)
    if not has_invitation_permission(checker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to send invitations"
        )
    
    # Check if user already exists with this email
    existing_user = db.query(User).filter(User.email == invitation_data.email).first()
    if existing_user:
        # Check if already in organization
        existing_member = db.query(UserOrganization).filter(
            and_(
                UserOrganization.user_id == existing_user.id,
                UserOrganization.organization_id == invitation_data.organization_id
            )
        ).first()
        
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this organization"
            )
    
    # Check for existing pending invitation
    existing_invitation = db.query(StaffInvitation).filter(
        and_(
            StaffInvitation.email == invitation_data.email,
            StaffInvitation.organization_id == invitation_data.organization_id,
            StaffInvitation.status == InvitationStatus.PENDING
        )
    ).first()
    
    if existing_invitation and existing_invitation.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending invitation already exists for this email"
        )
    
    # Create invitation
    invitation = StaffInvitation(
        email=invitation_data.email,
        first_name=invitation_data.first_name,
        last_name=invitation_data.last_name,
        invited_role=invitation_data.role,
        message=invitation_data.message,
        organization_id=invitation_data.organization_id,
        invited_by_id=current_user.id
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Generate invitation URL
    invitation_url = f"{settings.FRONTEND_URL}/invitations/{invitation.token}"
    
    # Send invitation email in background
    if settings.ENABLE_EMAIL_NOTIFICATIONS:
        background_tasks.add_task(
            send_invitation_email,
            invitation,
            invitation_url
        )
        invitation.email_sent_at = datetime.utcnow()
        invitation.email_send_count = 1
        db.commit()
    
    # Convert to response
    response = invitation.to_dict()
    response["invitation_url"] = invitation_url
    
    return InvitationResponse(**response)


@router.get("/", response_model=InvitationListResponse)
async def list_invitations(
    organization_id: int,
    status: Optional[InvitationStatus] = Query(None),
    include_expired: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all invitations for an organization.
    
    Requires: Organization owner/manager or staff management permission
    """
    # Check organization access
    user_org = require_organization_access(db, current_user, organization_id)
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, organization_id)
    if not has_invitation_permission(checker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view invitations"
        )
    
    # Build query
    query = db.query(StaffInvitation).filter(
        StaffInvitation.organization_id == organization_id
    )
    
    # Filter by status
    if status:
        query = query.filter(StaffInvitation.status == status)
    
    # Filter expired unless requested
    if not include_expired:
        query = query.filter(
            or_(
                StaffInvitation.status != InvitationStatus.PENDING,
                StaffInvitation.expires_at > datetime.utcnow()
            )
        )
    
    # Order by creation date
    query = query.order_by(StaffInvitation.created_at.desc())
    
    # Get all invitations
    invitations = query.all()
    
    # Count by status
    pending_count = sum(1 for inv in invitations if inv.status == InvitationStatus.PENDING and inv.is_valid)
    accepted_count = sum(1 for inv in invitations if inv.status == InvitationStatus.ACCEPTED)
    
    # Convert to response
    invitation_list = [
        InvitationResponse(**inv.to_dict()) for inv in invitations
    ]
    
    return InvitationListResponse(
        invitations=invitation_list,
        total=len(invitations),
        pending_count=pending_count,
        accepted_count=accepted_count
    )


@router.get("/{token}", response_model=InvitationResponse)
async def get_invitation_by_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get invitation details by token.
    
    Public endpoint - no authentication required
    """
    invitation = db.query(StaffInvitation).filter(
        StaffInvitation.token == token
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Mark as viewed
    invitation.mark_as_viewed()
    db.commit()
    
    # Check if expired
    if invitation.is_expired and invitation.status == InvitationStatus.PENDING:
        invitation.status = InvitationStatus.EXPIRED
        db.commit()
    
    return InvitationResponse(**invitation.to_dict())


@router.post("/{token}/accept", response_model=dict)
async def accept_invitation(
    token: str,
    accept_data: InvitationAccept,
    db: Session = Depends(get_db)
):
    """
    Accept an invitation and create/add user to organization.
    
    Public endpoint - creates new user or adds existing user
    """
    # Get invitation
    invitation = db.query(StaffInvitation).filter(
        StaffInvitation.token == token
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Validate invitation
    if not invitation.is_valid:
        if invitation.is_expired:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has expired"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invitation is {invitation.status.value}"
            )
    
    # Check if user exists
    user = db.query(User).filter(User.email == invitation.email).first()
    
    if user:
        # User exists - check if already in organization
        existing_member = db.query(UserOrganization).filter(
            and_(
                UserOrganization.user_id == user.id,
                UserOrganization.organization_id == invitation.organization_id
            )
        ).first()
        
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already a member of this organization"
            )
    else:
        # Create new user
        from services.auth_service import AuthService
        auth_service = AuthService()
        
        # Determine name
        name = accept_data.name
        if not name:
            if invitation.first_name and invitation.last_name:
                name = f"{invitation.first_name} {invitation.last_name}"
            elif invitation.first_name:
                name = invitation.first_name
            else:
                name = invitation.email.split('@')[0]
        
        # Map invitation role to unified role
        role_mapping = {
            InvitationRole.BARBER: "barber",
            InvitationRole.RECEPTIONIST: "receptionist",
            InvitationRole.SHOP_MANAGER: "shop_manager"
        }
        
        # Create user
        user = User(
            email=invitation.email,
            name=name,
            hashed_password=auth_service.hash_password(accept_data.password),
            unified_role=role_mapping[invitation.invited_role],
            is_active=True,
            is_verified=True  # Pre-verified via invitation
        )
        db.add(user)
        db.flush()
    
    # Add user to organization
    user_org = UserOrganization(
        user_id=user.id,
        organization_id=invitation.organization_id,
        role=invitation.invited_role.value,
        is_primary=True  # Set as primary if first organization
    )
    
    # Set permissions based on role
    if invitation.invited_role == InvitationRole.SHOP_MANAGER:
        user_org.can_manage_staff = True
        user_org.can_view_analytics = True
    elif invitation.invited_role == InvitationRole.RECEPTIONIST:
        user_org.can_view_analytics = True
    
    db.add(user_org)
    
    # Accept invitation
    invitation.accept(user.id)
    
    # Commit all changes
    db.commit()
    
    return {
        "message": "Invitation accepted successfully",
        "user_id": user.id,
        "organization_id": invitation.organization_id,
        "redirect_url": "/dashboard"
    }


@router.post("/{invitation_id}/resend", response_model=dict)
async def resend_invitation(
    invitation_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resend invitation email.
    
    Requires: Organization owner/manager or staff management permission
    """
    # Get invitation
    invitation = db.query(StaffInvitation).filter(
        StaffInvitation.id == invitation_id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check permissions
    user_org = require_organization_access(
        db, current_user, invitation.organization_id
    )
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, invitation.organization_id)
    if not has_invitation_permission(checker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to resend invitations"
        )
    
    # Check if invitation is valid
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resend invitation with status: {invitation.status.value}"
        )
    
    # Extend expiration if needed
    if invitation.is_expired:
        invitation.extend_expiration()
    
    # Generate invitation URL
    invitation_url = f"{settings.FRONTEND_URL}/invitations/{invitation.token}"
    
    # Send email
    if settings.ENABLE_EMAIL_NOTIFICATIONS:
        background_tasks.add_task(
            send_invitation_email,
            invitation,
            invitation_url
        )
        invitation.email_send_count += 1
        invitation.email_sent_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Invitation resent successfully",
        "expires_at": invitation.expires_at.isoformat()
    }


@router.delete("/{invitation_id}", response_model=dict)
async def cancel_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a pending invitation.
    
    Requires: Organization owner/manager or staff management permission
    """
    # Get invitation
    invitation = db.query(StaffInvitation).filter(
        StaffInvitation.id == invitation_id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check permissions
    user_org = require_organization_access(
        db, current_user, invitation.organization_id
    )
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, invitation.organization_id)
    if not has_invitation_permission(checker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel invitations"
        )
    
    # Check if can be cancelled
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel invitation with status: {invitation.status.value}"
        )
    
    # Cancel invitation
    invitation.cancel()
    db.commit()
    
    return {"message": "Invitation cancelled successfully"}


async def send_invitation_email(invitation: StaffInvitation, invitation_url: str):
    """Send invitation email to the invitee"""
    try:
        notification_service = NotificationService()
        
        # Prepare email content
        subject = f"You're invited to join {invitation.organization.name} on BookedBarber"
        
        # Role display names
        role_names = {
            InvitationRole.BARBER: "Barber",
            InvitationRole.RECEPTIONIST: "Receptionist",
            InvitationRole.SHOP_MANAGER: "Shop Manager"
        }
        
        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #000; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9f9f9; padding: 30px; }}
                .button {{ display: inline-block; background-color: #000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .role {{ font-weight: bold; color: #000; }}
                .message-box {{ background-color: #fff; padding: 15px; border-left: 4px solid #FFD700; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>BookedBarber</h1>
                </div>
                <div class="content">
                    <h2>Hello{' ' + invitation.first_name if invitation.first_name else ''}!</h2>
                    
                    <p><strong>{invitation.invited_by.name}</strong> has invited you to join <strong>{invitation.organization.name}</strong> as a <span class="role">{role_names[invitation.invited_role]}</span> on BookedBarber.</p>
                    
                    {f'<div class="message-box"><p><strong>Personal message:</strong><br>{invitation.message}</p></div>' if invitation.message else ''}
                    
                    <p>BookedBarber is the premier platform for barbershop management, helping barbers build their brand and maximize their business.</p>
                    
                    <div style="text-align: center;">
                        <a href="{invitation_url}" class="button">Accept Invitation</a>
                    </div>
                    
                    <p><small>This invitation will expire in {invitation.days_until_expiry} days.</small></p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                    
                    <p>If you have any questions, please contact {invitation.invited_by.name} or reply to this email.</p>
                    
                    <p>Best regards,<br>The BookedBarber Team</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text fallback
        plain_body = f"""
Hello{' ' + invitation.first_name if invitation.first_name else ''},

{invitation.invited_by.name} has invited you to join {invitation.organization.name} as a {role_names[invitation.invited_role]} on BookedBarber.

{f"Personal message: {invitation.message}" if invitation.message else ""}

Click the link below to accept your invitation:
{invitation_url}

This invitation will expire in {invitation.days_until_expiry} days.

If you have any questions, please contact {invitation.invited_by.name} or reply to this email.

Best regards,
The BookedBarber Team
"""
        
        # Send email using SendGrid
        result = await notification_service.send_email(
            to_email=invitation.email,
            subject=subject,
            html_content=html_body,
            plain_content=plain_body
        )
        
        if result:
            logger.info(f"Invitation email sent successfully to {invitation.email}")
        else:
            logger.error(f"Failed to send invitation email to {invitation.email}")
        
    except Exception as e:
        # Log error but don't fail the request
        logger.error(f"Failed to send invitation email: {e}", exc_info=True)