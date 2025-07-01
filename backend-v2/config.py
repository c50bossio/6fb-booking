from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")
    
    # Database
    database_url: str = "sqlite:///./6fb_booking.db"
    
    # App settings
    app_name: str = "6FB Booking API"
    debug: bool = True
    
    # Security & Authentication
    secret_key: str = "your-secret-key-here"
    jwt_secret_key: str = "test-jwt-secret-key-for-testing-only"
    jwt_algorithm: str = "HS256"
    jwt_expiration_delta: str = "30"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    bcrypt_rounds: int = 12
    
    # CORS and URLs
    cors_origins: str = '["http://localhost:3000", "http://localhost:8000"]'
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    
    # Stripe settings
    stripe_secret_key: str = "sk_test_your_stripe_test_secret_key_here"  # Replace with your test key
    stripe_publishable_key: str = "pk_test_default"
    stripe_webhook_secret: str = "whsec_default"
    
    # Google Calendar OAuth2 settings
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/calendar/callback"
    google_calendar_scopes: list = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ]
    
    # Booking Configuration
    booking_min_lead_time_minutes: int = 15  # Minimum time before appointment can be booked
    booking_max_advance_days: int = 30       # Maximum days in advance bookings allowed
    booking_same_day_cutoff: str = "17:00"   # No same-day bookings after this time
    
    # Optional settings
    environment: str = "development"
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:3000"
    
    # Email Configuration (SendGrid)
    sendgrid_api_key: str = "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"
    sendgrid_from_email: str = "support@em3014.6fbmentorship.com"
    sendgrid_from_name: str = "BookedBarber"
    
    # SMS Configuration (Twilio)
    twilio_account_sid: str = "ACe5b803b2dee8cfeffbfc19330838d25f"
    twilio_auth_token: str = "f4a6b0c96d7394e3037b1c3063cf8369"
    twilio_phone_number: str = "+18135483884"
    
    # Redis Configuration
    redis_url: str = "redis://localhost:6379/0"
    
    # Notification Settings
    appointment_reminder_hours: list[int] = [24, 2]  # Send reminders 24h and 2h before
    notification_retry_attempts: int = 3
    notification_retry_delay_seconds: int = 60
    enable_email_notifications: bool = True
    enable_sms_notifications: bool = True


settings = Settings()