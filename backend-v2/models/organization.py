"""
Organization models for the new business hierarchy.

This module defines the organizations table and user-organization mapping
to support individual barbers, single barbershops, and multi-location enterprises.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Table, Index
from sqlalchemy.orm import relationship
from db import Base
from datetime import datetime, timezone
import enum


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class BillingPlan(enum.Enum):
    """Billing plan options for organizations"""
    INDIVIDUAL = "individual"      # Single barber
    STUDIO = "studio"             # Small shop (2-5 chairs)
    SALON = "salon"               # Medium shop (6-10 chairs)
    ENTERPRISE = "enterprise"     # Large operation (11+ chairs)


class OrganizationType(enum.Enum):
    """Organization type for hierarchy management"""
    HEADQUARTERS = "headquarters" # Main organization for multi-location enterprise
    LOCATION = "location"         # Individual location within enterprise
    FRANCHISE = "franchise"       # Franchised location
    INDEPENDENT = "independent"   # Independent single location


class UserRole(enum.Enum):
    """
    Legacy user roles within an organization.
    
    DEPRECATED: Use UnifiedUserRole from models.py instead.
    This enum is kept for backwards compatibility during migration.
    """
    OWNER = "owner"               # Organization owner (maps to SHOP_OWNER or ENTERPRISE_OWNER)
    MANAGER = "manager"           # Shop manager (maps to SHOP_MANAGER)
    BARBER = "barber"            # Individual barber (maps to BARBER)
    RECEPTIONIST = "receptionist" # Front desk staff (maps to RECEPTIONIST)
    VIEWER = "viewer"            # Read-only access (maps to VIEWER)


class Organization(Base):
    """
    Organizations table to support business hierarchy.
    
    Supports:
    - Individual barbers (no organization)
    - Single barbershops (one organization)
    - Multi-location enterprises (multiple organizations)
    """
    __tablename__ = "organizations"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Address fields
    street_address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(50), default='US')
    
    # Contact information
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    
    # Business settings
    timezone = Column(String(50), default='UTC')
    business_hours = Column(JSON, nullable=True)  # JSON object with open/close times per day
    
    # Subscription and billing
    chairs_count = Column(Integer, default=1)
    billing_plan = Column(String(20), default=BillingPlan.INDIVIDUAL.value)
    subscription_status = Column(String(20), default='trial')  # trial, active, expired, cancelled
    subscription_started_at = Column(DateTime, nullable=True)
    subscription_expires_at = Column(DateTime, nullable=True)
    
    # Stripe Connect for organization-level billing
    stripe_account_id = Column(String(100), nullable=True)
    stripe_subscription_id = Column(String(100), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)  # Stripe customer ID for billing
    
    # Enhanced billing fields
    monthly_revenue_limit = Column(Float, nullable=True, comment='Monthly revenue limit for billing plan')
    features_enabled = Column(JSON, nullable=True, comment='JSON object with enabled features per plan')
    billing_contact_email = Column(String(255), nullable=True, comment='Email for billing notifications')
    tax_id = Column(String(50), nullable=True, comment='Tax ID or EIN for business')
    
    # Payment failure tracking
    payment_status = Column(String(20), default='active', comment='active/failed/pending')
    last_payment_failure = Column(DateTime, nullable=True, comment='Last payment failure timestamp')
    next_payment_retry = Column(DateTime, nullable=True, comment='Next scheduled payment retry')
    payment_failure_history = Column(JSON, nullable=True, comment='History of payment failures')
    
    # Marketing and tracking pixels
    gtm_container_id = Column(String(50), nullable=True, comment='Google Tag Manager Container ID (GTM-XXXXXXX)')
    ga4_measurement_id = Column(String(50), nullable=True, comment='Google Analytics 4 Measurement ID (G-XXXXXXXXXX)')
    meta_pixel_id = Column(String(50), nullable=True, comment='Meta/Facebook Pixel ID')
    google_ads_conversion_id = Column(String(50), nullable=True, comment='Google Ads Conversion ID (AW-XXXXXXXXX)')
    google_ads_conversion_label = Column(String(50), nullable=True, comment='Google Ads Conversion Label')
    tracking_enabled = Column(Boolean, default=True, comment='Enable/disable all tracking pixels')
    custom_tracking_code = Column(Text, nullable=True, comment='Custom HTML/JS tracking code')
    tracking_settings = Column(JSON, nullable=True, comment='JSON object with advanced tracking settings')
    
    # Landing page configuration
    landing_page_config = Column(JSON, nullable=True, comment='JSON object with landing page configuration')
    
    # Organization hierarchy support
    parent_organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=True, comment='Parent organization for multi-location enterprises')
    organization_type = Column(String(20), default=OrganizationType.INDEPENDENT.value, comment='Type: headquarters, location, franchise, independent')
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    
    # Relationships
    user_organizations = relationship("UserOrganization", back_populates="organization", cascade="all, delete-orphan")
    
    # Organization hierarchy relationships
    parent_organization = relationship("Organization", remote_side=[id], backref="child_organizations")
    # child_organizations is automatically created by the backref above
    
    # Staff invitations
    invitations = relationship("StaffInvitation", back_populates="organization", cascade="all, delete-orphan")
    
    # Guest bookings
    guest_bookings = relationship("GuestBooking", back_populates="organization", cascade="all, delete-orphan")
    
    # Computed properties
    @property
    def is_trial_active(self) -> bool:
        """Check if organization's trial is still active"""
        if self.subscription_status != 'trial':
            return False
        if not self.subscription_expires_at:
            return True
        return self.subscription_expires_at > utcnow()
    
    @property
    def primary_owner(self):
        """Get the primary owner of this organization"""
        primary_relation = next(
            (uo for uo in self.user_organizations if uo.role == UserRole.OWNER.value and uo.is_primary),
            None
        )
        return primary_relation.user if primary_relation else None
    
    @property
    def total_chairs_count(self) -> int:
        """Get total chairs including child organizations"""
        total = self.chairs_count or 0
        if hasattr(self, 'child_organizations'):
            for child in self.child_organizations:
                total += child.chairs_count or 0
        return total
    
    @property
    def is_enterprise(self) -> bool:
        """Check if this is an enterprise organization"""
        return (self.organization_type == OrganizationType.HEADQUARTERS.value or 
                (hasattr(self, 'child_organizations') and len(self.child_organizations) > 0))
    
    @property
    def enabled_features(self) -> dict:
        """Get enabled features with defaults based on billing plan"""
        default_features = {
            BillingPlan.INDIVIDUAL.value: {
                'appointments': True,
                'payments': True,
                'basic_analytics': True,
                'sms_notifications': True,
                'google_calendar': True,
                'max_staff': 1
            },
            BillingPlan.STUDIO.value: {
                'appointments': True,
                'payments': True,
                'analytics': True,
                'sms_notifications': True,
                'email_marketing': True,
                'google_calendar': True,
                'staff_management': True,
                'max_staff': 5
            },
            BillingPlan.SALON.value: {
                'appointments': True,
                'payments': True,
                'advanced_analytics': True,
                'sms_notifications': True,
                'email_marketing': True,
                'google_calendar': True,
                'staff_management': True,
                'inventory_management': True,
                'max_staff': 10
            },
            BillingPlan.ENTERPRISE.value: {
                'appointments': True,
                'payments': True,
                'enterprise_analytics': True,
                'sms_notifications': True,
                'email_marketing': True,
                'google_calendar': True,
                'staff_management': True,
                'inventory_management': True,
                'multi_location': True,
                'api_access': True,
                'white_label': True,
                'max_staff': None  # Unlimited
            }
        }
        
        plan_features = default_features.get(self.billing_plan, default_features[BillingPlan.INDIVIDUAL.value])
        
        # Merge with custom features
        if self.features_enabled:
            plan_features.update(self.features_enabled)
        
        return plan_features
    
    def __repr__(self):
        return f"<Organization(id={self.id}, name='{self.name}', slug='{self.slug}')>"


class UserOrganization(Base):
    """
    Many-to-many mapping table between users and organizations.
    
    Supports:
    - User roles within organizations
    - Permission levels
    - Primary organization designation
    - Join/leave tracking
    """
    __tablename__ = "user_organizations"
    
    # Primary key and foreign keys
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    
    # Role and permissions
    role = Column(String(20), default=UserRole.BARBER.value, nullable=False)
    permissions = Column(JSON, nullable=True)  # JSON object with specific permissions
    is_primary = Column(Boolean, default=False)  # Is this the user's primary organization?
    
    # Granular permissions
    can_manage_billing = Column(Boolean, default=False, comment='Can manage billing and subscriptions')
    can_manage_staff = Column(Boolean, default=False, comment='Can invite and manage staff members')
    can_view_analytics = Column(Boolean, default=True, comment='Can view business analytics')
    
    # Metadata
    joined_at = Column(DateTime, default=utcnow, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True, comment='Last time user accessed this organization')
    
    # Relationships
    user = relationship("User", back_populates="user_organizations")
    organization = relationship("Organization", back_populates="user_organizations")
    
    # Constraints
    __table_args__ = (
        Index('idx_user_org_user_id', 'user_id'),
        Index('idx_user_org_organization_id', 'organization_id'),
        Index('idx_user_org_primary', 'user_id', 'is_primary'),
        Index('idx_user_org_role', 'role'),
    )
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission in this organization"""
        # Owners have all permissions
        if self.role == UserRole.OWNER.value:
            return True
        
        # Check explicit permissions
        if self.permissions and permission in self.permissions:
            return self.permissions[permission]
        
        # Check granular permission fields
        permission_map = {
            'manage_billing': self.can_manage_billing,
            'manage_staff': self.can_manage_staff,
            'view_analytics': self.can_view_analytics,
        }
        
        if permission in permission_map:
            return permission_map[permission]
        
        # Default role-based permissions
        role_permissions = {
            UserRole.OWNER.value: True,  # All permissions
            UserRole.MANAGER.value: permission in ['view_analytics', 'manage_staff'],
            UserRole.BARBER.value: permission in ['view_analytics'],
            UserRole.RECEPTIONIST.value: permission in ['view_analytics'],
            UserRole.VIEWER.value: permission in ['view_analytics']
        }
        
        return role_permissions.get(self.role, False)
    
    def update_last_accessed(self):
        """Update the last accessed timestamp"""
        self.last_accessed_at = utcnow()
    
    def __repr__(self):
        return f"<UserOrganization(user_id={self.user_id}, org_id={self.organization_id}, role='{self.role}')>"