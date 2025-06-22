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
    TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN")
    SENDGRID_API_KEY: Optional[str] = os.getenv("SENDGRID_API_KEY")

    # Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAIL_FROM_ADDRESS: Optional[str] = os.getenv("FROM_EMAIL")
    EMAIL_FROM_NAME: str = os.getenv("EMAIL_FROM_NAME", "6FB Platform")

    @property
    def email_enabled(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.SMTP_USERNAME and self.SMTP_PASSWORD)

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

    # Google Calendar Integration
    GOOGLE_CALENDAR_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CALENDAR_CLIENT_ID")
    GOOGLE_CALENDAR_CLIENT_SECRET: Optional[str] = os.getenv(
        "GOOGLE_CALENDAR_CLIENT_SECRET"
    )
    GOOGLE_CALENDAR_REDIRECT_URI: str = os.getenv(
        "GOOGLE_CALENDAR_REDIRECT_URI",
        "http://localhost:8000/api/v1/calendar/oauth/callback",
    )

    # Authentication - REQUIRE secure secret keys
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )

    def model_post_init(self, __context) -> None:
        """Validate required security settings"""
        if not self.SECRET_KEY or self.SECRET_KEY == "your-secret-key-change-this":
            raise ValueError(
                "SECRET_KEY environment variable must be set to a secure random value. "
                "Generate one with: python3 -c 'import secrets; print(secrets.token_urlsafe(64))'"
            )

        if (
            not self.JWT_SECRET_KEY
            or self.JWT_SECRET_KEY == "your-secret-key-change-this"
        ):
            raise ValueError(
                "JWT_SECRET_KEY environment variable must be set to a secure random value"
            )

    # Redis (optional)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

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
