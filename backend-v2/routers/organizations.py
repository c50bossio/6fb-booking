"""
Organization management router for the new business hierarchy system.

This router handles:
- Organization CRUD operations
- User-organization relationships
- Billing and subscription management
- Permission management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import User, Organization, UserOrganization
from models.organization import BillingPlan, UserRole, OrganizationType
from utils.error_handling import AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, PaymentError, IntegrationError, safe_endpoint
from schemas import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse, OrganizationWithUsers,
    UserOrganizationCreate, UserOrganizationUpdate, UserOrganizationResponse,
    UserWithOrganizations, OrganizationStatsResponse, BillingPlanFeatures
)
from schemas_new.landing_page import LandingPageConfig
from routers.auth import get_current_user
from utils.permissions import require_organization_permission, require_role

router = APIRouter(prefix="/organizations", tags=["organizations"])


# Organization CRUD Operations

@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    organization: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new organization.
    Only authenticated users can create organizations.
    The creator automatically becomes the owner.
    """
    
    # Check if slug is already taken
    if db.query(Organization).filter(Organization.slug == organization.slug).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization slug already exists"
        )
    
    # Create organization
    db_organization = Organization(
        name=organization.name,
        slug=organization.slug,
        description=organization.description,
        street_address=organization.street_address,
        city=organization.city,
        state=organization.state,
        zip_code=organization.zip_code,
        country=organization.country,
        phone=organization.phone,
        email=organization.email,
        website=organization.website,
        timezone=organization.timezone,
        business_hours=organization.business_hours,
        chairs_count=organization.chairs_count,
        billing_plan=organization.billing_plan.value,
        organization_type=organization.organization_type.value,
        parent_organization_id=organization.parent_organization_id,
        billing_contact_email=organization.billing_contact_email,
        tax_id=organization.tax_id,
        subscription_status='trial',
        subscription_started_at=datetime.utcnow(),
        subscription_expires_at=datetime.utcnow() + timedelta(days=14)  # 14-day trial
    )
    
    db.add(db_organization)
    db.commit()
    db.refresh(db_organization)
    
    # Add creator as primary owner
    user_org = UserOrganization(
        user_id=current_user.id,
        organization_id=db_organization.id,
        role=UserRole.OWNER.value,
        is_primary=True,
        can_manage_billing=True,
        can_manage_staff=True,
        can_view_analytics=True
    )
    
    db.add(user_org)
    db.commit()
    
    return db_organization


@router.get("/", response_model=List[OrganizationResponse])
def list_organizations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    billing_plan: Optional[str] = Query(None),
    organization_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List organizations that the current user has access to.
    Owners and admins can see all organizations.
    Regular users see only their organizations.
    """
    
    query = db.query(Organization)
    
    # Apply filters
    if billing_plan:
        query = query.filter(Organization.billing_plan == billing_plan)
    if organization_type:
        query = query.filter(Organization.organization_type == organization_type)
    if is_active is not None:
        query = query.filter(Organization.is_active == is_active)
    
    # Non-admin users can only see their organizations
    if current_user.role != "admin":
        user_org_ids = db.query(UserOrganization.organization_id).filter(
            UserOrganization.user_id == current_user.id
        ).subquery()
        query = query.filter(Organization.id.in_(user_org_ids))
    
    organizations = query.offset(skip).limit(limit).all()
    return organizations


@router.get("/{organization_id}", response_model=OrganizationWithUsers)
def get_organization(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific organization with user relationships.
    Requires read access to the organization.
    """
    
    organization = db.query(Organization).options(
        selectinload(Organization.user_organizations).selectinload(UserOrganization.user)
    ).filter(Organization.id == organization_id).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check if user has access to this organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this organization"
        )
    
    # Add computed fields
    organization.total_chairs_count = organization.total_chairs_count
    organization.is_enterprise = organization.is_enterprise
    organization.enabled_features = organization.enabled_features
    
    return organization


@router.put("/{organization_id}", response_model=OrganizationResponse)
def update_organization(
    organization_id: int,
    organization_update: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an organization.
    Requires owner role or billing management permission.
    """
    
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check permissions
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org or (user_org.role != UserRole.OWNER.value and not user_org.can_manage_billing):
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update organization"
            )
    
    # Update fields
    update_data = organization_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(organization, field):
            setattr(organization, field, value)
    
    organization.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(organization)
    
    return organization


@router.delete("/{organization_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an organization.
    Only organization owners or admins can delete organizations.
    """
    
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check permissions
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == organization_id,
        UserOrganization.role == UserRole.OWNER.value
    ).first()
    
    if not user_org and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization owners can delete organizations"
        )
    
    # Soft delete
    organization.is_active = False
    organization.updated_at = datetime.utcnow()
    db.commit()


# User-Organization Relationship Management

@router.post("/{organization_id}/users", response_model=UserOrganizationResponse, status_code=status.HTTP_201_CREATED)
def add_user_to_organization(
    organization_id: int,
    user_org_create: UserOrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a user to an organization.
    Requires staff management permission.
    """
    
    # Validate organization exists
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check permissions
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org or (user_org.role not in [UserRole.OWNER.value, UserRole.MANAGER.value] and not user_org.can_manage_staff):
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to add users"
            )
    
    # Check if user already in organization
    existing = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_org_create.user_id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already in organization"
        )
    
    # Create user-organization relationship
    new_user_org = UserOrganization(
        user_id=user_org_create.user_id,
        organization_id=organization_id,
        role=user_org_create.role.value,
        is_primary=user_org_create.is_primary,
        permissions=user_org_create.permissions,
        can_manage_billing=user_org_create.can_manage_billing,
        can_manage_staff=user_org_create.can_manage_staff,
        can_view_analytics=user_org_create.can_view_analytics
    )
    
    db.add(new_user_org)
    db.commit()
    db.refresh(new_user_org)
    
    return new_user_org


@router.get("/{organization_id}/users", response_model=List[UserOrganizationResponse])
def list_organization_users(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all users in an organization.
    Requires access to the organization.
    """
    
    # Check if user has access to organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this organization"
        )
    
    user_orgs = db.query(UserOrganization).options(
        selectinload(UserOrganization.user)
    ).filter(UserOrganization.organization_id == organization_id).all()
    
    return user_orgs


@router.put("/{organization_id}/users/{user_id}", response_model=UserOrganizationResponse)
def update_user_organization(
    organization_id: int,
    user_id: int,
    user_org_update: UserOrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's role and permissions in an organization.
    Requires staff management permission.
    """
    
    # Check permissions
    current_user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not current_user_org or (current_user_org.role not in [UserRole.OWNER.value, UserRole.MANAGER.value] and not current_user_org.can_manage_staff):
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update user roles"
            )
    
    # Get user-organization relationship
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in organization"
        )
    
    # Update fields
    update_data = user_org_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(user_org, field):
            if field == 'role' and isinstance(value, str):
                setattr(user_org, field, value)
            else:
                setattr(user_org, field, value)
    
    db.commit()
    db.refresh(user_org)
    
    return user_org


@router.delete("/{organization_id}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_from_organization(
    organization_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a user from an organization.
    Requires staff management permission or self-removal.
    """
    
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in organization"
        )
    
    # Check permissions (can remove self or have staff management permission)
    if user_id != current_user.id:
        current_user_org = db.query(UserOrganization).filter(
            UserOrganization.user_id == current_user.id,
            UserOrganization.organization_id == organization_id
        ).first()
        
        if not current_user_org or (current_user_org.role not in [UserRole.OWNER.value, UserRole.MANAGER.value] and not current_user_org.can_manage_staff):
            if current_user.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to remove users"
                )
    
    db.delete(user_org)
    db.commit()


# Landing Page Settings Endpoints

@router.get("/current/landing-page-settings", response_model=LandingPageConfig)
def get_current_organization_landing_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get landing page settings for current user's organization.
    """
    # Get user's primary organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not associated with any organization"
        )
    
    organization = db.query(Organization).filter(
        Organization.id == user_org.organization_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Get landing page config from organization
    config_data = organization.landing_page_config or {}
    
    # Set defaults if not configured
    defaults = {
        "enabled": False,
        "logo_url": None,
        "primary_color": "#000000",
        "accent_color": "#FFD700",
        "background_preset": "professional_dark",
        "custom_headline": None,
        "show_testimonials": True,
        "testimonial_source": "gmb_auto",
        "custom_testimonials": None
    }
    
    # Merge with defaults
    for key, default_value in defaults.items():
        if key not in config_data:
            config_data[key] = default_value
    
    return LandingPageConfig(**config_data)


@router.put("/current/landing-page-settings", response_model=LandingPageConfig)
def update_current_organization_landing_settings(
    settings: LandingPageConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update landing page settings for current user's organization.
    """
    # Get user's primary organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not associated with any organization"
        )
    
    organization = db.query(Organization).filter(
        Organization.id == user_org.organization_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check permissions (owner, manager, or can manage settings)
    if (user_org.role not in [UserRole.OWNER.value, UserRole.MANAGER.value] and 
        not getattr(user_org, 'can_manage_settings', False)):
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update landing page settings"
            )
    
    # Update landing page config
    organization.landing_page_config = settings.dict()
    organization.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(organization)
    
    return settings


# Organization Statistics and Analytics

@router.get("/{organization_id}/stats", response_model=OrganizationStatsResponse)
def get_organization_stats(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get organization statistics.
    Requires analytics view permission.
    """
    
    # Check permissions
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org or not user_org.can_view_analytics:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view analytics"
            )
    
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Calculate stats (placeholder implementation)
    # In a real implementation, these would be calculated from appointments, payments, etc.
    stats = OrganizationStatsResponse(
        organization_id=organization_id,
        total_chairs=organization.total_chairs_count,
        active_staff=len(organization.user_organizations),
        monthly_appointments=0,  # TODO: Calculate from appointments table
        monthly_revenue=0.0,  # TODO: Calculate from payments table
        trial_days_remaining=organization.trial_days_remaining if organization.subscription_status == 'trial' else None,
        subscription_status=organization.subscription_status,
        enabled_features=organization.enabled_features
    )
    
    return stats


@router.get("/billing-plans/features", response_model=dict)
def get_billing_plan_features():
    """
    Get features available for each billing plan.
    Public endpoint for pricing page.
    """
    
    return {
        "individual": BillingPlanFeatures(
            max_staff=1,
            email_marketing=False,
            staff_management=False,
            inventory_management=False,
            multi_location=False,
            api_access=False,
            white_label=False
        ).dict(),
        "studio": BillingPlanFeatures(
            max_staff=5,
            email_marketing=True,
            staff_management=True,
            inventory_management=False,
            multi_location=False,
            api_access=False,
            white_label=False
        ).dict(),
        "salon": BillingPlanFeatures(
            max_staff=10,
            email_marketing=True,
            staff_management=True,
            inventory_management=True,
            multi_location=False,
            api_access=False,
            white_label=False
        ).dict(),
        "enterprise": BillingPlanFeatures(
            max_staff=None,
            email_marketing=True,
            staff_management=True,
            inventory_management=True,
            multi_location=True,
            api_access=True,
            white_label=True
        ).dict()
    }


# User's Organizations

@router.get("/my/organizations", response_model=UserWithOrganizations)
def get_my_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all organizations the current user belongs to.
    """
    
    user_orgs = db.query(UserOrganization).options(
        selectinload(UserOrganization.organization)
    ).filter(UserOrganization.user_id == current_user.id).all()
    
    # Update last accessed for all organizations
    for user_org in user_orgs:
        user_org.update_last_accessed()
    
    db.commit()
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "organizations": user_orgs,
        "primary_organization": current_user.primary_organization
    }


@router.get("/{organization_id}/trial-status")
def get_organization_trial_status(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get trial status for an organization.
    
    Returns trial information including days remaining, expiration date,
    and subscription status.
    """
    # Check if user has access to this organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this organization"
        )
    
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Use subscription service to get detailed trial status
    from services.subscription_service import SubscriptionService
    subscription_service = SubscriptionService()
    trial_status = subscription_service.check_trial_status(db, organization_id)
    
    # Calculate pricing for this organization
    from utils.pricing import calculate_progressive_price
    pricing = calculate_progressive_price(organization.chairs_count)
    
    return {
        "organization_id": organization_id,
        "organization_name": organization.name,
        "subscription_status": organization.subscription_status,
        "trial_active": trial_status.get('trial_active', False),
        "trial_started_at": organization.subscription_started_at.isoformat() if organization.subscription_started_at else None,
        "trial_expires_at": organization.subscription_expires_at.isoformat() if organization.subscription_expires_at else None,
        "days_remaining": trial_status.get('days_remaining', 0),
        "chairs_count": organization.chairs_count,
        "monthly_cost": pricing['monthly_total'],
        "pricing_breakdown": pricing,
        "stripe_customer_id": organization.stripe_customer_id,
        "stripe_subscription_id": organization.stripe_subscription_id,
        "features_enabled": organization.features_enabled,
        "billing_plan": organization.billing_plan
    }