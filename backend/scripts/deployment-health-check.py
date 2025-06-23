#!/usr/bin/env python3
"""
Deployment health check script for Render
Validates that all critical services and dependencies are working correctly
"""

import os
import sys
import json
import time
from datetime import datetime


def check_environment_variables():
    """Check if all required environment variables are set"""
    required_vars = ["DATABASE_URL", "SECRET_KEY", "JWT_SECRET_KEY", "ENVIRONMENT"]

    optional_vars = [
        "STRIPE_SECRET_KEY",
        "SENDGRID_API_KEY",
        "GOOGLE_CLIENT_ID",
        "ENCRYPTION_KEY",
    ]

    missing_required = []
    missing_optional = []

    for var in required_vars:
        if not os.getenv(var):
            missing_required.append(var)

    for var in optional_vars:
        if not os.getenv(var):
            missing_optional.append(var)

    return {
        "status": "pass" if not missing_required else "fail",
        "missing_required": missing_required,
        "missing_optional": missing_optional,
    }


def check_database_connection():
    """Test database connectivity"""
    try:
        from sqlalchemy import create_engine, text

        engine = create_engine(os.environ["DATABASE_URL"])

        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            conn.execute(text("SELECT COUNT(*) FROM alembic_version"))

        return {"status": "pass", "message": "Database connection successful"}
    except Exception as e:
        return {"status": "fail", "message": str(e)}


def check_application_imports():
    """Test if all critical imports work"""
    try:
        import fastapi
        import sqlalchemy
        import alembic
        import stripe
        import sendgrid
        import jwt
        import passlib
        import psycopg2
        import gunicorn

        return {"status": "pass", "message": "All critical imports successful"}
    except ImportError as e:
        return {"status": "fail", "message": f"Import error: {e}"}


def check_api_endpoints():
    """Test if API can be imported and initialized"""
    try:
        from main import app
        from api.v1.endpoints import health

        return {"status": "pass", "message": "API endpoints loaded successfully"}
    except Exception as e:
        return {"status": "fail", "message": str(e)}


def main():
    print("Running deployment health checks...")
    print("=" * 50)

    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "checks": {},
    }

    # Run all checks
    checks = [
        ("Environment Variables", check_environment_variables),
        ("Database Connection", check_database_connection),
        ("Application Imports", check_application_imports),
        ("API Endpoints", check_api_endpoints),
    ]

    all_passed = True

    for check_name, check_func in checks:
        print(f"\nChecking {check_name}...")
        try:
            result = check_func()
            results["checks"][check_name] = result

            if result["status"] == "pass":
                print(f"✓ {check_name}: PASSED")
            else:
                print(f"✗ {check_name}: FAILED")
                print(f"  Error: {result.get('message', 'Unknown error')}")
                all_passed = False

        except Exception as e:
            print(f"✗ {check_name}: ERROR - {e}")
            results["checks"][check_name] = {"status": "error", "message": str(e)}
            all_passed = False

    # Summary
    print("\n" + "=" * 50)
    print("HEALTH CHECK SUMMARY")
    print("=" * 50)

    if all_passed:
        print("✓ All checks passed! Deployment is healthy.")
        results["overall_status"] = "healthy"
    else:
        print("✗ Some checks failed. Please review the errors above.")
        results["overall_status"] = "unhealthy"

    # Save results
    with open("deployment_health_check.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDetailed results saved to: deployment_health_check.json")

    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
