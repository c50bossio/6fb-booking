from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./6fb_booking.db"
    
    # App settings
    app_name: str = "6FB Booking API"
    debug: bool = True
    
    # Simple secret key
    secret_key: str = "your-secret-key-here"
    
    # Stripe settings
    stripe_secret_key: str = "sk_test_4eC39HqLyjWDarjtT1zdp7dc"  # Stripe's official test key
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
    
    # Notification settings
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@6fb-booking.com"
    sendgrid_from_name: str = "6FB Booking"
    
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    
    # Redis settings for notification queue
    redis_url: str = "redis://localhost:6379/0"
    
    # Notification timing settings
    appointment_reminder_hours: list[int] = [24, 2]  # Send reminders 24h and 2h before
    notification_retry_attempts: int = 3
    notification_retry_delay_seconds: int = 60
    
    class Config:
        env_file = ".env"

settings = Settings()