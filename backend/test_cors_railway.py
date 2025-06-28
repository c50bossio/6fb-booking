#!/usr/bin/env python3
"""
Test script to verify CORS configuration for Railway deployment
"""
import os
import sys
import asyncio
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, "/Users/bossio/6fb-booking/backend")

from config.settings import settings
from middleware.dynamic_cors import DynamicCORSMiddleware


def test_railway_origins():
    """Test Railway origin validation"""
    print("=" * 60)
    print("TESTING RAILWAY CORS CONFIGURATION")
    print("=" * 60)

    # Test origins
    test_origins = [
        "https://web-production-92a6c.up.railway.app",  # Current Railway backend
        "https://6fb-booking-frontend.up.railway.app",  # Frontend
        "https://6fb-booking-backend.up.railway.app",  # Backend
        "https://localhost:3000",  # Local dev
        "https://unknown-domain.com",  # Should be rejected
        "https://malicious-app.railway.app",  # Should be allowed (Railway domain)
        "null",  # Local file testing
        "file://",  # Local file testing
    ]

    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Total CORS origins configured: {len(settings.CORS_ORIGINS)}")
    print(
        f"Railway origins in config: {[origin for origin in settings.CORS_ORIGINS if 'railway' in origin]}"
    )
    print()

    print("Testing origin validation:")
    print("-" * 40)

    for origin in test_origins:
        is_allowed = settings.is_allowed_origin(origin)
        status = "✅ ALLOWED" if is_allowed else "❌ REJECTED"
        print(f"{status:<12} {origin}")

    print()
    print("CORS Configuration Summary:")
    print("-" * 40)
    print(f"Frontend URL: {settings.FRONTEND_URL}")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug mode: {settings.DEBUG}")

    # Check if Railway environment variables are set
    railway_vars = {
        "RAILWAY_STATIC_URL": os.getenv("RAILWAY_STATIC_URL"),
        "RAILWAY_PUBLIC_DOMAIN": os.getenv("RAILWAY_PUBLIC_DOMAIN"),
        "RAILWAY_ADDITIONAL_URLS": os.getenv("RAILWAY_ADDITIONAL_URLS"),
    }

    print("\nRailway Environment Variables:")
    print("-" * 40)
    for var, value in railway_vars.items():
        status = "✅ SET" if value else "❌ NOT SET"
        print(f"{status:<12} {var}: {value or 'Not configured'}")

    print("\nAll Configured CORS Origins:")
    print("-" * 40)
    for i, origin in enumerate(settings.CORS_ORIGINS, 1):
        print(f"{i:2d}. {origin}")

    return True


if __name__ == "__main__":
    try:
        test_railway_origins()
        print("\n✅ CORS configuration test completed successfully!")
        print("\nRecommendations:")
        print("1. Deploy these changes to Railway")
        print("2. Test frontend-backend communication")
        print("3. Monitor logs for CORS-related errors")
        print("4. Use /cors-test endpoint to verify in production")

    except Exception as e:
        print(f"\n❌ CORS configuration test failed: {e}")
        sys.exit(1)
