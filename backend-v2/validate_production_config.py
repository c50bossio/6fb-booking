#!/usr/bin/env python3
"""
Production Configuration Validator
=================================
Validates that all production environment variables are properly configured.
Run this after setting up your .env.production file.
"""

import os
import sys
from pathlib import Path

def load_env_file(file_path: str) -> dict:
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

def validate_production_config():
    """Validate production configuration."""
    print("🔍 PRODUCTION CONFIGURATION VALIDATOR")
    print("=" * 50)
    
    env_file = ".env.production"
    if not os.path.exists(env_file):
        print(f"❌ Production environment file not found: {env_file}")
        print("   Please create .env.production with your API keys")
        return False

    env_vars = load_env_file(env_file)
    
    # Critical production variables
    critical_vars = {
        "SECRET_KEY": "Application security key",
        "JWT_SECRET_KEY": "JWT authentication key", 
        "DATABASE_URL": "Production database connection",
        "STRIPE_SECRET_KEY": "Stripe payment processing",
        "STRIPE_PUBLISHABLE_KEY": "Stripe public key",
        "SENDGRID_API_KEY": "Email service",
        "TWILIO_ACCOUNT_SID": "SMS service",
        "TWILIO_AUTH_TOKEN": "SMS authentication",
        "SENTRY_DSN": "Error tracking",
        "FRONTEND_URL": "Frontend domain",
        "NEXT_PUBLIC_API_URL": "API domain"
    }
    
    # Check for missing or placeholder values
    missing_vars = []
    placeholder_vars = []
    configured_vars = []
    
    for var, description in critical_vars.items():
        if var not in env_vars or not env_vars[var]:
            missing_vars.append(f"{var} ({description})")
        elif any(placeholder in env_vars[var].upper() for placeholder in [
            "YOUR_", "CHANGE_ME", "PLACEHOLDER", "REPLACE", "HERE", "EXAMPLE"
        ]):
            placeholder_vars.append(f"{var} ({description})")
        else:
            configured_vars.append(f"{var} ({description})")
    
    # Validation results
    print(f"\n✅ CONFIGURED VARIABLES ({len(configured_vars)}):")
    for var in configured_vars:
        print(f"   ✓ {var}")
    
    if placeholder_vars:
        print(f"\n⚠️  PLACEHOLDER VALUES DETECTED ({len(placeholder_vars)}):")
        for var in placeholder_vars:
            print(f"   ⚠️  {var}")
    
    if missing_vars:
        print(f"\n❌ MISSING VARIABLES ({len(missing_vars)}):")
        for var in missing_vars:
            print(f"   ❌ {var}")
    
    # Security validation
    print(f"\n🔒 SECURITY VALIDATION:")
    
    # Check for production-grade keys
    security_issues = []
    
    if "SECRET_KEY" in env_vars:
        if len(env_vars["SECRET_KEY"]) < 50:
            security_issues.append("SECRET_KEY too short (should be 64+ chars)")
        elif "dev" in env_vars["SECRET_KEY"].lower():
            security_issues.append("SECRET_KEY appears to be development key")
    
    if "STRIPE_SECRET_KEY" in env_vars:
        if not env_vars["STRIPE_SECRET_KEY"].startswith("sk_live_"):
            security_issues.append("Stripe secret key is not a LIVE key (should start with sk_live_)")
    
    if "STRIPE_PUBLISHABLE_KEY" in env_vars:
        if not env_vars["STRIPE_PUBLISHABLE_KEY"].startswith("pk_live_"):
            security_issues.append("Stripe publishable key is not a LIVE key (should start with pk_live_)")
    
    if "ENVIRONMENT" in env_vars and env_vars["ENVIRONMENT"] != "production":
        security_issues.append(f"ENVIRONMENT is set to '{env_vars['ENVIRONMENT']}' (should be 'production')")
    
    if security_issues:
        print("   ⚠️  Security Issues Found:")
        for issue in security_issues:
            print(f"      - {issue}")
    else:
        print("   ✅ No security issues detected")
    
    # Overall status
    print(f"\n" + "=" * 50)
    total_critical = len(critical_vars)
    configured_count = len(configured_vars)
    completion_rate = (configured_count / total_critical) * 100
    
    print(f"📊 CONFIGURATION COMPLETION: {completion_rate:.1f}%")
    print(f"   Configured: {configured_count}/{total_critical} critical variables")
    
    if completion_rate == 100 and not security_issues:
        print("🎯 STATUS: ✅ READY FOR PRODUCTION DEPLOYMENT")
        return True
    elif completion_rate >= 80:
        print("🎯 STATUS: ⚠️  MOSTLY READY - Minor configuration needed")
        return False
    else:
        print("🎯 STATUS: ❌ NOT READY - Major configuration required")
        return False

def main():
    """Main validation function."""
    success = validate_production_config()
    
    if not success:
        print(f"\n📋 NEXT STEPS:")
        print("1. Edit .env.production file")
        print("2. Replace all 'YOUR_*_HERE' placeholders with real API keys")
        print("3. Ensure using LIVE Stripe keys (sk_live_*, pk_live_*)")
        print("4. Run this validator again: python validate_production_config.py")
        print("5. Test deployment in staging environment first")
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()