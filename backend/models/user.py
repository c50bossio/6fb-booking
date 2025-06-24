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
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base
from utils.encryption import EncryptedString, SearchableEncryptedString


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Basic Information
    # TEMPORARY: Use plain string for testing (should be encrypted in production)
    email = Column(String(500), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)

    # Authentication
    hashed_password = Column(String(255), nullable=True)  # Nullable for Google OAuth users
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    
    # OAuth Authentication
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    auth_provider = Column(String(50), default="native")  # native, google
    profile_image_url = Column(String(500), nullable=True)  # Store Google profile picture

    # Role and Permissions
    role = Column(
        String(50), nullable=False, default="barber"
    )  # super_admin, admin, mentor, barber, staff
    permissions = Column(JSON, nullable=True)  # Custom permissions JSON

    # Contact Information
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip_code = Column(String(20), nullable=True)

    # Profile
    profile_picture = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)

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
