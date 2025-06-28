from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./6fb_booking.db"
    
    # App settings
    app_name: str = "6FB Booking API"
    debug: bool = True
    
    # Simple secret key
    secret_key: str = "your-secret-key-here"
    
    # Stripe settings (test keys)
    stripe_secret_key: str = "sk_test_51234567890"
    stripe_publishable_key: str = "pk_test_51234567890"
    
    class Config:
        env_file = ".env"

settings = Settings()