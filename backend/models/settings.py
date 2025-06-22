"""
Settings System Models
Comprehensive configuration system for enterprise booking calendar
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, Time,
    Text, ForeignKey, JSON, Enum as SQLEnum, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel
import enum


class SettingsScope(enum.Enum):
    """Scope levels for settings"""
    GLOBAL = "global"          # System-wide defaults
    LOCATION = "location"      # Location-specific
    USER = "user"             # Individual user preferences
    BARBER = "barber"         # Barber-specific settings


class SettingsCategory(enum.Enum):
    """Categories of settings"""
    USER_EXPERIENCE = "user_experience"
    BUSINESS_CONFIG = "business_config"
    DISPLAY_OPTIONS = "display_options"
    BOOKING_RULES = "booking_rules"
    INTEGRATION = "integration"
    ACCESSIBILITY = "accessibility"
    ADVANCED = "advanced"
    SECURITY = "security"
    NOTIFICATION = "notification"


class ThemeMode(enum.Enum):
    """Theme preferences"""
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"
    HIGH_CONTRAST = "high_contrast"


class CalendarView(enum.Enum):
    """Default calendar view options"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    AGENDA = "agenda"


class TimeFormat(enum.Enum):
    """Time display formats"""
    TWELVE_HOUR = "12h"
    TWENTY_FOUR_HOUR = "24h"


class DateFormat(enum.Enum):
    """Date display formats"""
    US = "MM/DD/YYYY"
    EUROPEAN = "DD/MM/YYYY"
    ISO = "YYYY-MM-DD"
    RELATIVE = "relative"


class NotificationMethod(enum.Enum):
    """Notification delivery methods"""
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    PUSH = "push"
    WEBHOOK = "webhook"


class SettingsTemplate(BaseModel):
    """Pre-defined settings templates for quick setup"""
    __tablename__ = "settings_templates"
    
    # Template Information
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    category = Column(String(50), nullable=False)
    
    # Template Configuration
    template_data = Column(JSON, nullable=False)  # Complete settings configuration
    
    # Metadata
    is_system_template = Column(Boolean, default=False)  # System vs custom templates
    is_active = Column(Boolean, default=True)
    version = Column(String(20), default="1.0.0")
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime)
    
    def __repr__(self):
        return f"<SettingsTemplate(name='{self.name}', category='{self.category}')>"


class SettingsConfig(BaseModel):
    """Main settings configuration table"""
    __tablename__ = "settings_configs"
    
    # Scope and ownership
    scope = Column(SQLEnum(SettingsScope), nullable=False)
    scope_id = Column(Integer, nullable=True)  # ID of the location/user/barber if applicable
    category = Column(SQLEnum(SettingsCategory), nullable=False)
    
    # Setting identification
    setting_key = Column(String(100), nullable=False)
    setting_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Value storage (flexible JSON for any data type)
    setting_value = Column(JSON, nullable=False)
    default_value = Column(JSON, nullable=True)
    
    # Validation and constraints
    data_type = Column(String(50), nullable=False)  # string, number, boolean, object, array
    validation_rules = Column(JSON)  # JSON schema for validation
    options = Column(JSON)  # Available options for select/multi-select
    
    # UI Configuration
    ui_component = Column(String(50))  # input, select, checkbox, slider, color, etc.
    ui_group = Column(String(100))  # Grouping for UI organization
    display_order = Column(Integer, default=0)
    is_advanced = Column(Boolean, default=False)
    
    # Access control
    is_user_configurable = Column(Boolean, default=True)
    required_permission = Column(String(100))  # Permission needed to modify
    
    # Inheritance and overrides
    inherits_from_scope = Column(SQLEnum(SettingsScope))  # Which scope this inherits from
    can_be_overridden = Column(Boolean, default=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_deprecated = Column(Boolean, default=False)
    deprecation_message = Column(Text)
    
    # Relationships
    setting_history = relationship("SettingsHistory", back_populates="setting")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('scope', 'scope_id', 'category', 'setting_key', 
                        name='unique_setting_per_scope'),
        CheckConstraint('scope_id IS NOT NULL OR scope = \'global\'', 
                       name='check_scope_id_requirement'),
    )
    
    def __repr__(self):
        return f"<SettingsConfig(scope='{self.scope.value}', key='{self.setting_key}')>"


class SettingsHistory(BaseModel):
    """Track changes to settings over time"""
    __tablename__ = "settings_history"
    
    # Reference to setting
    setting_id = Column(Integer, ForeignKey("settings_configs.id"), nullable=False)
    
    # Change information
    old_value = Column(JSON)
    new_value = Column(JSON, nullable=False)
    change_reason = Column(String(500))
    
    # User who made the change
    changed_by_user_id = Column(Integer, ForeignKey("users.id"))
    changed_by_system = Column(Boolean, default=False)
    
    # Change metadata
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    
    # Relationships
    setting = relationship("SettingsConfig", back_populates="setting_history")
    changed_by = relationship("User")
    
    def __repr__(self):
        return f"<SettingsHistory(setting_id={self.setting_id}, changed_at={self.created_at})>"


class UserPreferences(BaseModel):
    """User-specific preferences and settings"""
    __tablename__ = "user_preferences"
    
    # User reference
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Theme and Display
    theme_mode = Column(SQLEnum(ThemeMode), default=ThemeMode.AUTO)
    theme_color = Column(String(7), default="#8b5cf6")  # Primary color hex
    font_size = Column(String(20), default="medium")  # small, medium, large, x-large
    information_density = Column(String(20), default="comfortable")  # compact, comfortable, spacious
    
    # Calendar Preferences
    default_view = Column(SQLEnum(CalendarView), default=CalendarView.WEEK)
    show_weekends = Column(Boolean, default=True)
    start_week_on = Column(Integer, default=1)  # 0=Sunday, 1=Monday
    default_duration = Column(Integer, default=60)  # Default appointment duration in minutes
    
    # Time and Date
    time_format = Column(SQLEnum(TimeFormat), default=TimeFormat.TWELVE_HOUR)
    date_format = Column(SQLEnum(DateFormat), default=DateFormat.US)
    timezone = Column(String(50), default="America/New_York")
    
    # Workspace Layout
    sidebar_collapsed = Column(Boolean, default=False)
    panel_layout = Column(JSON, default=lambda: {"left": True, "right": True, "bottom": False})
    widget_positions = Column(JSON, default=dict)  # Dashboard widget positions
    
    # Accessibility
    high_contrast_mode = Column(Boolean, default=False)
    reduce_motion = Column(Boolean, default=False)
    keyboard_navigation = Column(Boolean, default=True)
    screen_reader_optimized = Column(Boolean, default=False)
    
    # Performance
    enable_animations = Column(Boolean, default=True)
    lazy_loading = Column(Boolean, default=True)
    cache_duration = Column(Integer, default=300)  # Cache duration in seconds
    
    # Notifications (user-level overrides)
    desktop_notifications = Column(Boolean, default=True)
    sound_notifications = Column(Boolean, default=False)
    notification_quiet_hours = Column(JSON)  # {"start": "22:00", "end": "08:00"}
    
    # Advanced Preferences
    keyboard_shortcuts = Column(JSON, default=dict)  # Custom keyboard shortcuts
    custom_css = Column(Text)  # Custom CSS for personalization
    experimental_features = Column(Boolean, default=False)
    
    # Privacy
    analytics_opt_out = Column(Boolean, default=False)
    usage_tracking = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<UserPreferences(user_id={self.user_id})>"


class LocationSettings(BaseModel):
    """Location-specific business configuration settings"""
    __tablename__ = "location_settings"
    
    # Location reference
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, unique=True)
    
    # Business Hours Configuration
    business_hours = Column(JSON, nullable=False, default=lambda: {
        "monday": {"open": "09:00", "close": "18:00", "breaks": []},
        "tuesday": {"open": "09:00", "close": "18:00", "breaks": []},
        "wednesday": {"open": "09:00", "close": "18:00", "breaks": []},
        "thursday": {"open": "09:00", "close": "18:00", "breaks": []},
        "friday": {"open": "09:00", "close": "18:00", "breaks": []},
        "saturday": {"open": "09:00", "close": "17:00", "breaks": []},
        "sunday": {"open": null, "close": null, "breaks": []}
    })
    
    # Booking Configuration
    booking_window = Column(JSON, default=lambda: {
        "min_advance_hours": 2,
        "max_advance_days": 90,
        "same_day_booking": True,
        "booking_cutoff_time": "20:00"
    })
    
    # Time Slot Configuration
    default_slot_duration = Column(Integer, default=30)  # Minutes
    slot_intervals = Column(JSON, default=lambda: [15, 30, 45, 60, 90, 120])
    buffer_time = Column(Integer, default=15)  # Minutes between appointments
    
    # Cancellation Policy
    cancellation_policy = Column(JSON, default=lambda: {
        "cancellation_window_hours": 24,
        "reschedule_window_hours": 12,
        "cancellation_fee_type": "percentage",  # percentage, fixed, none
        "cancellation_fee_amount": 0,
        "no_show_fee": 25,
        "allow_online_cancellation": True
    })
    
    # Service Configuration
    service_categories = Column(JSON, default=list)
    service_color_coding = Column(JSON, default=dict)
    
    # Staff Management
    staff_permissions = Column(JSON, default=lambda: {
        "can_view_all_appointments": False,
        "can_modify_others_appointments": False,
        "can_access_reports": False,
        "can_manage_clients": True
    })
    
    # Client Management
    client_settings = Column(JSON, default=lambda: {
        "require_phone": True,
        "require_email": True,
        "allow_guest_booking": False,
        "auto_create_accounts": True,
        "client_notes_visible": False
    })
    
    # Payment Settings
    payment_configuration = Column(JSON, default=lambda: {
        "require_deposit": False,
        "deposit_type": "percentage",  # percentage, fixed
        "deposit_amount": 50,
        "payment_methods": ["cash", "card", "digital"],
        "tip_options": [15, 18, 20, 25],
        "currency": "USD"
    })
    
    # Communication Settings
    communication_preferences = Column(JSON, default=lambda: {
        "send_confirmation_emails": True,
        "send_reminder_emails": True,
        "send_follow_up_emails": True,
        "reminder_timing_hours": [24, 2],
        "email_templates": {}
    })
    
    # Integration Settings
    calendar_sync = Column(JSON, default=lambda: {
        "google_calendar_enabled": False,
        "outlook_calendar_enabled": False,
        "sync_direction": "bidirectional",  # push, pull, bidirectional
        "sync_frequency_minutes": 15
    })
    
    # Automation Rules
    automation_settings = Column(JSON, default=lambda: {
        "auto_confirm_bookings": False,
        "auto_block_past_slots": True,
        "auto_release_expired_holds": True,
        "hold_duration_minutes": 15,
        "waitlist_auto_notify": True
    })
    
    # Display Settings
    display_configuration = Column(JSON, default=lambda: {
        "show_pricing": True,
        "show_duration": True,
        "show_barber_photos": True,
        "show_service_descriptions": True,
        "color_theme": "professional",
        "branding": {}
    })
    
    # Reporting and Analytics
    analytics_settings = Column(JSON, default=lambda: {
        "track_no_shows": True,
        "track_cancellations": True,
        "track_revenue": True,
        "generate_daily_reports": True,
        "report_recipients": []
    })
    
    # Security Settings
    security_configuration = Column(JSON, default=lambda: {
        "require_2fa_for_staff": False,
        "session_timeout_minutes": 480,  # 8 hours
        "allowed_ip_ranges": [],
        "audit_log_retention_days": 90
    })
    
    # Relationships
    location = relationship("Location")
    
    def __repr__(self):
        return f"<LocationSettings(location_id={self.location_id})>"


class NotificationSettings(BaseModel):
    """Comprehensive notification configuration"""
    __tablename__ = "notification_settings"
    
    # Scope (can be global, location, or user-specific)
    scope = Column(SQLEnum(SettingsScope), nullable=False)
    scope_id = Column(Integer, nullable=True)
    
    # Notification Types Configuration
    appointment_reminders = Column(JSON, default=lambda: {
        "enabled": True,
        "methods": ["email", "sms"],
        "timing": [24, 2],  # Hours before appointment
        "templates": {}
    })
    
    booking_confirmations = Column(JSON, default=lambda: {
        "enabled": True,
        "methods": ["email"],
        "auto_send": True,
        "include_calendar_invite": True
    })
    
    cancellation_notifications = Column(JSON, default=lambda: {
        "enabled": True,
        "methods": ["email", "sms"],
        "notify_staff": True,
        "notify_client": True
    })
    
    waitlist_notifications = Column(JSON, default=lambda: {
        "enabled": True,
        "methods": ["email", "sms"],
        "response_timeout_hours": 2
    })
    
    staff_notifications = Column(JSON, default=lambda: {
        "new_bookings": True,
        "cancellations": True,
        "schedule_changes": True,
        "daily_schedule": True,
        "methods": ["email", "in_app"]
    })
    
    marketing_notifications = Column(JSON, default=lambda: {
        "enabled": False,
        "promotional_emails": False,
        "birthday_wishes": True,
        "service_recommendations": False
    })
    
    system_notifications = Column(JSON, default=lambda: {
        "maintenance_alerts": True,
        "security_alerts": True,
        "performance_alerts": False,
        "recipients": []
    })
    
    # Global Notification Settings
    quiet_hours = Column(JSON, default=lambda: {
        "enabled": False,
        "start_time": "22:00",
        "end_time": "08:00",
        "timezone": "location_default"
    })
    
    rate_limiting = Column(JSON, default=lambda: {
        "max_emails_per_hour": 50,
        "max_sms_per_hour": 20,
        "cooldown_between_same_type": 300  # seconds
    })
    
    # Delivery Preferences
    delivery_preferences = Column(JSON, default=lambda: {
        "retry_failed_attempts": 3,
        "retry_delay_minutes": [5, 15, 60],
        "fallback_methods": True,
        "delivery_reports": True
    })
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('scope', 'scope_id', name='unique_notification_settings_per_scope'),
    )
    
    def __repr__(self):
        return f"<NotificationSettings(scope='{self.scope.value}', scope_id={self.scope_id})>"


class AccessibilitySettings(BaseModel):
    """Accessibility and inclusive design settings"""
    __tablename__ = "accessibility_settings"
    
    # User reference (accessibility settings are user-specific)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Visual Accessibility
    font_settings = Column(JSON, default=lambda: {
        "font_size": "medium",  # small, medium, large, x-large, xx-large
        "font_family": "system",  # system, serif, sans-serif, monospace
        "line_height": "normal",  # tight, normal, relaxed, loose
        "letter_spacing": "normal"  # tight, normal, wide
    })
    
    contrast_settings = Column(JSON, default=lambda: {
        "high_contrast": False,
        "contrast_ratio": "normal",  # normal, enhanced, maximum
        "color_blind_friendly": False,
        "color_blind_type": None  # deuteranopia, protanopia, tritanopia
    })
    
    # Motor Accessibility
    interaction_settings = Column(JSON, default=lambda: {
        "larger_click_targets": False,
        "sticky_hover": False,
        "click_delay": 0,  # milliseconds
        "double_click_tolerance": 500  # milliseconds
    })
    
    # Cognitive Accessibility
    cognitive_settings = Column(JSON, default=lambda: {
        "reduce_motion": False,
        "disable_auto_play": False,
        "simple_language": False,
        "content_warnings": True,
        "focus_indicators": "enhanced"  # standard, enhanced, maximum
    })
    
    # Keyboard Navigation
    keyboard_settings = Column(JSON, default=lambda: {
        "keyboard_only_navigation": False,
        "skip_links": True,
        "tab_order_optimization": True,
        "keyboard_shortcuts_enabled": True,
        "custom_shortcuts": {}
    })
    
    # Screen Reader Support
    screen_reader_settings = Column(JSON, default=lambda: {
        "optimized_for_screen_reader": False,
        "verbose_descriptions": True,
        "skip_decorative_images": True,
        "live_region_announcements": True,
        "preferred_screen_reader": None  # jaws, nvda, voiceover, etc.
    })
    
    # Audio Settings
    audio_settings = Column(JSON, default=lambda: {
        "sound_notifications": False,
        "audio_descriptions": False,
        "sound_volume": 50,
        "audio_cues": False
    })
    
    # Language and Localization
    language_settings = Column(JSON, default=lambda: {
        "language": "en",
        "region": "US",
        "date_format": "auto",
        "number_format": "auto",
        "right_to_left": False
    })
    
    # Emergency and Safety
    emergency_settings = Column(JSON, default=lambda: {
        "emergency_contact_info": None,
        "medical_alerts": [],
        "accessibility_needs": [],
        "emergency_shortcuts": {}
    })
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<AccessibilitySettings(user_id={self.user_id})>"


class IntegrationSettings(BaseModel):
    """External system integration configurations"""
    __tablename__ = "integration_settings"
    
    # Scope (typically location-level)
    scope = Column(SQLEnum(SettingsScope), nullable=False)
    scope_id = Column(Integer, nullable=True)
    
    # Calendar Integrations
    google_calendar = Column(JSON, default=lambda: {
        "enabled": False,
        "client_id": None,
        "client_secret": None,  # Encrypted
        "refresh_token": None,  # Encrypted
        "calendar_id": "primary",
        "sync_direction": "bidirectional",
        "sync_frequency": 15,  # minutes
        "event_visibility": "private"
    })
    
    outlook_calendar = Column(JSON, default=lambda: {
        "enabled": False,
        "client_id": None,
        "client_secret": None,  # Encrypted
        "refresh_token": None,  # Encrypted
        "calendar_id": "primary",
        "sync_direction": "bidirectional",
        "sync_frequency": 15
    })
    
    # Payment Integrations
    stripe_settings = Column(JSON, default=lambda: {
        "enabled": False,
        "publishable_key": None,
        "secret_key": None,  # Encrypted
        "webhook_secret": None,  # Encrypted
        "connect_account_id": None,
        "automatic_payouts": True,
        "capture_method": "automatic"
    })
    
    square_settings = Column(JSON, default=lambda: {
        "enabled": False,
        "application_id": None,
        "access_token": None,  # Encrypted
        "webhook_signature_key": None,  # Encrypted
        "location_id": None,
        "environment": "sandbox"  # sandbox, production
    })
    
    # Communication Integrations
    twilio_settings = Column(JSON, default=lambda: {
        "enabled": False,
        "account_sid": None,
        "auth_token": None,  # Encrypted
        "phone_number": None,
        "messaging_service_sid": None
    })
    
    sendgrid_settings = Column(JSON, default=lambda: {
        "enabled": False,
        "api_key": None,  # Encrypted
        "from_email": None,
        "from_name": None,
        "template_ids": {}
    })
    
    # Social Media Integrations
    facebook_settings = Column(JSON, default=lambda: {
        "enabled": False,
        "page_id": None,
        "access_token": None,  # Encrypted
        "auto_post_promotions": False
    })
    
    instagram_settings = Column(JSON, default=lambda: {
        "enabled": False,
        "business_account_id": None,
        "access_token": None,  # Encrypted
        "auto_post_work": False
    })
    
    # Analytics Integrations
    google_analytics = Column(JSON, default=lambda: {
        "enabled": False,
        "tracking_id": None,
        "enhanced_ecommerce": True,
        "anonymize_ip": True
    })
    
    # Webhook Configurations
    webhooks = Column(JSON, default=lambda: {
        "appointment_created": [],
        "appointment_updated": [],
        "appointment_cancelled": [],
        "payment_completed": [],
        "client_registered": []
    })
    
    # API Access
    api_settings = Column(JSON, default=lambda: {
        "public_api_enabled": False,
        "api_key": None,  # Encrypted
        "rate_limit": 1000,  # requests per hour
        "allowed_origins": [],
        "webhook_secret": None  # Encrypted
    })
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('scope', 'scope_id', name='unique_integration_settings_per_scope'),
    )
    
    def __repr__(self):
        return f"<IntegrationSettings(scope='{self.scope.value}', scope_id={self.scope_id})>"


# Default settings data for system initialization
DEFAULT_SETTINGS_TEMPLATES = [
    {
        "name": "Small Barbershop",
        "description": "Perfect for independent barbers or small shops",
        "category": "business_type",
        "template_data": {
            "booking_window": {"min_advance_hours": 2, "max_advance_days": 30},
            "default_slot_duration": 45,
            "business_hours": {
                "tuesday": {"open": "09:00", "close": "18:00"},
                "wednesday": {"open": "09:00", "close": "18:00"},
                "thursday": {"open": "09:00", "close": "18:00"},
                "friday": {"open": "09:00", "close": "19:00"},
                "saturday": {"open": "08:00", "close": "17:00"},
                "sunday": {"open": None, "close": None},
                "monday": {"open": None, "close": None}
            },
            "cancellation_policy": {
                "cancellation_window_hours": 12,
                "cancellation_fee_amount": 0
            }
        },
        "is_system_template": True
    },
    {
        "name": "Enterprise Chain",
        "description": "Optimized for large barbershop chains",
        "category": "business_type",
        "template_data": {
            "booking_window": {"min_advance_hours": 1, "max_advance_days": 90},
            "default_slot_duration": 30,
            "automation_settings": {
                "auto_confirm_bookings": True,
                "waitlist_auto_notify": True
            },
            "staff_permissions": {
                "can_view_all_appointments": True,
                "can_access_reports": True
            }
        },
        "is_system_template": True
    },
    {
        "name": "High-End Salon",
        "description": "Premium experience with longer appointments",
        "category": "business_type", 
        "template_data": {
            "booking_window": {"min_advance_hours": 24, "max_advance_days": 60},
            "default_slot_duration": 90,
            "payment_configuration": {
                "require_deposit": True,
                "deposit_amount": 50
            },
            "cancellation_policy": {
                "cancellation_window_hours": 48,
                "cancellation_fee_amount": 25
            }
        },
        "is_system_template": True
    }
]