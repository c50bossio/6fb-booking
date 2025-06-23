#!/usr/bin/env python3
"""
Production Environment Validation Script
========================================
Validates that all required environment variables are properly configured
for production deployment of the 6FB Booking Platform.
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Any


def load_env_file(file_path: str) -> Dict[str, str]:
    """Load environment variables from .env file."""
    env_vars = {}
    if not os.path.exists(file_path):
        print(f"❌ Environment file not found: {file_path}")
        return env_vars

    with open(file_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env_vars[key.strip()] = value.strip()

    return env_vars


def validate_required_vars(env_vars: Dict[str, str]) -> List[str]:
    """Validate required environment variables."""
    required_vars = [
        "SECRET_KEY",
        "JWT_SECRET_KEY",
        "DATABASE_URL",
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "ENVIRONMENT",
        "FRONTEND_URL",
    ]

    missing_vars = []
    placeholder_vars = []

    for var in required_vars:
        if var not in env_vars or not env_vars[var]:
            missing_vars.append(var)
        elif env_vars[var].startswith("YOUR_") or env_vars[var] == "placeholder":
            placeholder_vars.append(var)

    issues = []
    if missing_vars:
        issues.extend([f"Missing required variable: {var}" for var in missing_vars])
    if placeholder_vars:
        issues.extend([f"Placeholder value found: {var}" for var in placeholder_vars])

    return issues


def validate_security_requirements(env_vars: Dict[str, str]) -> List[str]:
    """Validate security requirements."""
    issues = []

    # Check SECRET_KEY length and strength
    secret_key = env_vars.get("SECRET_KEY", "")
    if len(secret_key) < 64:
        issues.append("SECRET_KEY must be at least 64 characters long")

    # Check JWT_SECRET_KEY length and strength
    jwt_secret = env_vars.get("JWT_SECRET_KEY", "")
    if len(jwt_secret) < 64:
        issues.append("JWT_SECRET_KEY must be at least 64 characters long")

    # Ensure keys are different
    if secret_key == jwt_secret:
        issues.append("SECRET_KEY and JWT_SECRET_KEY must be different")

    # Check production environment
    if env_vars.get("ENVIRONMENT") != "production":
        issues.append("ENVIRONMENT must be set to 'production'")

    # Check Stripe keys are live keys
    stripe_secret = env_vars.get("STRIPE_SECRET_KEY", "")
    stripe_public = env_vars.get("STRIPE_PUBLISHABLE_KEY", "")

    if stripe_secret and not stripe_secret.startswith("sk_live_"):
        issues.append("STRIPE_SECRET_KEY should start with 'sk_live_' for production")

    if stripe_public and not stripe_public.startswith("pk_live_"):
        issues.append(
            "STRIPE_PUBLISHABLE_KEY should start with 'pk_live_' for production"
        )

    return issues


def validate_database_config(env_vars: Dict[str, str]) -> List[str]:
    """Validate database configuration."""
    issues = []

    database_url = env_vars.get("DATABASE_URL", "")
    if not database_url:
        issues.append("DATABASE_URL is required")
    elif database_url.startswith("sqlite"):
        issues.append(
            "SQLite should not be used in production. Use PostgreSQL instead."
        )
    elif not database_url.startswith("postgresql://"):
        issues.append("DATABASE_URL should use PostgreSQL for production")

    return issues


def validate_email_config(env_vars: Dict[str, str]) -> List[str]:
    """Validate email configuration."""
    issues = []

    # Check if at least one email service is configured
    has_sendgrid = bool(env_vars.get("SENDGRID_API_KEY"))
    has_smtp = bool(env_vars.get("SMTP_SERVER") and env_vars.get("SMTP_USERNAME"))

    if not (has_sendgrid or has_smtp):
        issues.append("Email service must be configured (SendGrid or SMTP)")

    if not env_vars.get("FROM_EMAIL"):
        issues.append("FROM_EMAIL is required for email delivery")

    return issues


def validate_monitoring_config(env_vars: Dict[str, str]) -> List[str]:
    """Validate monitoring configuration."""
    issues = []

    if not env_vars.get("SENTRY_DSN"):
        issues.append("SENTRY_DSN recommended for production error tracking")

    if not env_vars.get("LOG_LEVEL"):
        issues.append("LOG_LEVEL should be set (recommended: INFO)")

    return issues


def main():
    """Main validation function."""
    print("🔍 6FB Booking Platform - Production Environment Validation")
    print("=" * 60)

    # Load environment file
    env_file = ".env.production"
    if len(sys.argv) > 1:
        env_file = sys.argv[1]

    print(f"📁 Loading environment file: {env_file}")
    env_vars = load_env_file(env_file)

    if not env_vars:
        print("❌ No environment variables loaded. Exiting.")
        sys.exit(1)

    print(f"✅ Loaded {len(env_vars)} environment variables")
    print()

    # Run all validations
    all_issues = []

    print("🔐 Validating required variables...")
    all_issues.extend(validate_required_vars(env_vars))

    print("🛡️  Validating security requirements...")
    all_issues.extend(validate_security_requirements(env_vars))

    print("🗄️  Validating database configuration...")
    all_issues.extend(validate_database_config(env_vars))

    print("📧 Validating email configuration...")
    all_issues.extend(validate_email_config(env_vars))

    print("📊 Validating monitoring configuration...")
    all_issues.extend(validate_monitoring_config(env_vars))

    print()
    print("=" * 60)

    # Report results
    if all_issues:
        print("❌ VALIDATION FAILED")
        print(f"Found {len(all_issues)} issues that need to be resolved:")
        print()
        for i, issue in enumerate(all_issues, 1):
            print(f"{i:2}. {issue}")
        print()
        print("🔧 Please fix these issues before deploying to production.")
        sys.exit(1)
    else:
        print("✅ VALIDATION PASSED")
        print("🎉 Your production environment configuration looks good!")
        print()
        print("📋 Next Steps:")
        print("1. Replace all placeholder values with actual credentials")
        print("2. Test database connectivity")
        print("3. Verify Stripe webhook endpoints")
        print("4. Configure monitoring services (Sentry, etc.)")
        print("5. Set up SSL certificates")
        print("6. Run deployment")


if __name__ == "__main__":
    main()
