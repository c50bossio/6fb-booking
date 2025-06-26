"""
User Model
Enhanced user model with role-based access control for 6FB platform
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    Enum,
)
import enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base
from utils.encryption import EncryptedString, SearchableEncryptedString, EncryptedText


class SubscriptionStatus(enum.Enum):
    """User subscription status for trial and billing management"""

    TRIAL = "trial"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    # ENCRYPTED: Email is searchable encrypted for login and searching
    email = Column(
        SearchableEncryptedString(500), unique=True, index=True, nullable=False
    )
    username = Column(String(100), unique=True, index=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)

    # Authentication
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)

    # Subscription and Trial Management
    subscription_status = Column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL, nullable=False
    )
    trial_start_date = Column(DateTime, nullable=True)
    trial_end_date = Column(DateTime, nullable=True)
    trial_used = Column(
        Boolean, default=False, nullable=False
    )  # Prevent multiple trials
    subscription_id = Column(String(255), nullable=True)  # Stripe subscription ID
    customer_id = Column(String(255), nullable=True)  # Stripe customer ID

    # Role and Permissions
    role = Column(
        String(50), nullable=False, default="barber"
    )  # super_admin, admin, mentor, barber, staff
    permissions = Column(JSON, nullable=True)  # Custom permissions JSON

    # Contact Information
    phone = Column(SearchableEncryptedString(100), nullable=True)
    address = Column(EncryptedString(500), nullable=True)
    city = Column(String(100), nullable=True)  # Keep unencrypted for filtering
    state = Column(String(50), nullable=True)  # Keep unencrypted for filtering
    zip_code = Column(String(20), nullable=True)  # Keep unencrypted for filtering

    # Profile
    profile_picture = Column(String(500), nullable=True)
    bio = Column(EncryptedText, nullable=True)  # May contain personal information

    # 6FB Specific
    sixfb_certification_level = Column(
        String(50), nullable=True
    )  # bronze, silver, gold, platinum
    certification_date = Column(DateTime, nullable=True)
    mentor_since = Column(DateTime, nullable=True)

    # Location Assignment
    primary_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    accessible_locations = Column(
        JSON, nullable=True
    )  # List of location IDs user can access

    # Preferences
    timezone = Column(String(50), default="America/New_York")
    notification_preferences = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    primary_location = relationship("Location", foreign_keys=[primary_location_id])
    mentee_locations = relationship(
        "Location", foreign_keys="Location.mentor_id", back_populates="mentor"
    )
    # barber_profile = relationship("Barber", back_populates="user", uselist=False)  # Temporarily disabled
    sessions = relationship("UserSession", back_populates="user")
    activities = relationship("UserActivity", back_populates="user")
    # training_enrollments = relationship("TrainingEnrollment", back_populates="user")  # Temporarily disabled
    # notifications = relationship("Notification", back_populates="user")  # Temporarily disabled

    # Payment relationships
    payment_methods = relationship("PaymentMethod", back_populates="user")
    payments = relationship("Payment", back_populates="user")
    stripe_customer = relationship(
        "StripeCustomer", back_populates="user", uselist=False
    )

    # Communication relationships
    email_logs = relationship("EmailLog", back_populates="user")
    sms_logs = relationship("SMSLog", back_populates="user")
    notification_preferences = relationship(
        "NotificationPreference", back_populates="user", uselist=False
    )

    # MFA relationships
    mfa_settings = relationship("MFASettings", back_populates="user", uselist=False)
    trusted_devices = relationship("TrustedDevice", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def has_permission(self, permission: str) -> bool:
        """Check if user has specific permission"""
        if self.role == "super_admin":
            return True

        role_permissions = {
            "admin": [
                "view_all_locations",
                "manage_locations",
                "view_all_analytics",
                "manage_users",
                "view_financial_data",
                "manage_automation",
            ],
            "mentor": [
                "view_assigned_locations",
                "view_mentee_analytics",
                "manage_training",
                "view_mentee_data",
                "create_reports",
                "manage_goals",
            ],
            "barber": [
                "view_own_data",
                "view_own_analytics",
                "manage_own_schedule",
                "view_clients",
                "update_profile",
            ],
            "staff": ["view_location_data", "manage_appointments", "view_clients"],
        }

        default_permissions = role_permissions.get(self.role, [])
        custom_permissions = self.permissions or []

        all_permissions = default_permissions + custom_permissions
        return permission in all_permissions

    def is_mfa_required(self, db_session=None) -> bool:
        """Check if MFA is required for this user based on role"""
        # Super admins and admins should have MFA required by default
        if self.role in ["super_admin", "admin"]:
            return True

        # Check if there's an enforcement policy for this role
        if db_session:
            from models.mfa_settings import MFAEnforcementPolicy

            policy = (
                db_session.query(MFAEnforcementPolicy)
                .filter(MFAEnforcementPolicy.role == self.role)
                .first()
            )
            if policy:
                return policy.is_required

        return False

    def has_mfa_enabled(self) -> bool:
        """Check if user has MFA enabled"""
        return self.mfa_settings and self.mfa_settings.is_enabled

    def is_trial_active(self) -> bool:
        """Check if user's trial is currently active"""
        if self.subscription_status != SubscriptionStatus.TRIAL:
            return False

        if not self.trial_end_date:
            return False

        from datetime import datetime, timezone

        return datetime.now(timezone.utc) < self.trial_end_date

    def is_subscription_active(self) -> bool:
        """Check if user has an active subscription (including trial)"""
        if self.subscription_status == SubscriptionStatus.ACTIVE:
            return True
        return self.is_trial_active()

    def days_remaining_in_trial(self) -> int:
        """Get number of days remaining in trial"""
        if not self.is_trial_active():
            return 0

        from datetime import datetime, timezone

        remaining = self.trial_end_date - datetime.now(timezone.utc)
        return max(0, remaining.days)

    def start_trial(self, trial_days: int = 30) -> None:
        """Start a trial period for the user"""
        from datetime import datetime, timezone, timedelta

        if self.trial_used:
            raise ValueError("User has already used their trial period")

        now = datetime.now(timezone.utc)
        self.trial_start_date = now
        self.trial_end_date = now + timedelta(days=trial_days)
        self.trial_used = True
        self.subscription_status = SubscriptionStatus.TRIAL

    def activate_subscription(self, stripe_subscription_id: str = None) -> None:
        """Activate paid subscription"""
        self.subscription_status = SubscriptionStatus.ACTIVE
        if stripe_subscription_id:
            self.subscription_id = stripe_subscription_id


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    device_info = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)
    location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=True
    )  # Current working location

    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
    location = relationship("Location")


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    activity_type = Column(
        String(100), nullable=False
    )  # login, logout, view_report, etc.
    activity_description = Column(String(500), nullable=True)
    resource_type = Column(
        String(100), nullable=True
    )  # appointment, client, report, etc.
    resource_id = Column(String(100), nullable=True)

    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
    location = relationship("Location")
