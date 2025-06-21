from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(".env.auth")  # Load auth-specific environment variables


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")

    # External APIs
    TRAFFT_API_BASE_URL: str = os.getenv("TRAFFT_API_URL", "https://api.trafft.com")
    TRAFFT_API_KEY: str = os.getenv("TRAFFT_API_KEY", "")
    TRAFFT_WEBHOOK_SECRET: str = os.getenv("TRAFFT_WEBHOOK_SECRET", "")
    TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN")
    SENDGRID_API_KEY: Optional[str] = os.getenv("SENDGRID_API_KEY")

    # Stripe Configuration
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    # Tremendous Configuration for Flexible Payouts
    TREMENDOUS_API_KEY: str = os.getenv("TREMENDOUS_API_KEY", "")
    TREMENDOUS_TEST_MODE: bool = (
        os.getenv("TREMENDOUS_TEST_MODE", "true").lower() == "true"
    )
    TREMENDOUS_WEBHOOK_SECRET: str = os.getenv("TREMENDOUS_WEBHOOK_SECRET", "")
    TREMENDOUS_FUNDING_SOURCE_ID: str = os.getenv("TREMENDOUS_FUNDING_SOURCE_ID", "")
    TREMENDOUS_CAMPAIGN_ID: str = os.getenv("TREMENDOUS_CAMPAIGN_ID", "")

    # Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this")
    JWT_SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this")
    JWT_ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )

    # Redis (optional)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ]

    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


def get_settings():
    return Settings()


settings = Settings()
