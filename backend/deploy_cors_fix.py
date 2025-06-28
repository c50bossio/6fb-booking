#!/usr/bin/env python3
"""
Deploy CORS fixes for Railway - Production readiness check
"""
import os
import sys
import subprocess
from datetime import datetime


def check_environment():
    """Check if environment is ready for deployment"""
    print("=" * 60)
    print("RAILWAY CORS DEPLOYMENT READINESS CHECK")
    print("=" * 60)

    checks = []

    # Check 1: Git status
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            cwd="/Users/bossio/6fb-booking/backend",
        )
        if result.stdout.strip():
            checks.append(("❌", "Git", "Uncommitted changes detected"))
        else:
            checks.append(("✅", "Git", "Working directory clean"))
    except Exception as e:
        checks.append(("⚠️", "Git", f"Could not check git status: {e}"))

    # Check 2: Required files exist
    required_files = [
        "/Users/bossio/6fb-booking/backend/config/settings.py",
        "/Users/bossio/6fb-booking/backend/middleware/dynamic_cors.py",
        "/Users/bossio/6fb-booking/backend/main.py",
    ]

    for file_path in required_files:
        if os.path.exists(file_path):
            checks.append(("✅", "Files", f"{os.path.basename(file_path)} exists"))
        else:
            checks.append(("❌", "Files", f"{os.path.basename(file_path)} missing"))

    # Check 3: Environment variables
    env_vars = [
        "DATABASE_URL",
        "SECRET_KEY",
        "JWT_SECRET_KEY",
    ]

    for var in env_vars:
        if os.getenv(var):
            checks.append(("✅", "Env Vars", f"{var} is set"))
        else:
            checks.append(("❌", "Env Vars", f"{var} is missing"))

    # Check 4: Railway URL in allowed origins
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
    if "railway.app" in allowed_origins:
        checks.append(("✅", "CORS", "Railway URL found in ALLOWED_ORIGINS"))
    else:
        checks.append(
            (
                "⚠️",
                "CORS",
                "Railway URL not explicitly in ALLOWED_ORIGINS (but handled dynamically)",
            )
        )

    print("Deployment Readiness Checks:")
    print("-" * 40)
    for status, category, message in checks:
        print(f"{status} {category:<10} {message}")

    # Summary
    passed = sum(1 for status, _, _ in checks if status == "✅")
    warnings = sum(1 for status, _, _ in checks if status == "⚠️")
    failed = sum(1 for status, _, _ in checks if status == "❌")

    print(f"\nSummary: {passed} passed, {warnings} warnings, {failed} failed")

    if failed > 0:
        print("\n❌ Deployment NOT recommended - fix failed checks first")
        return False
    elif warnings > 0:
        print("\n⚠️ Deployment possible but review warnings")
        return True
    else:
        print("\n✅ Ready for deployment!")
        return True


def show_deployment_commands():
    """Show Railway deployment commands"""
    print("\n" + "=" * 60)
    print("RAILWAY DEPLOYMENT COMMANDS")
    print("=" * 60)

    print("If using Railway CLI:")
    print("1. railway up")
    print("2. railway deploy")
    print()

    print("If using Git deployment:")
    print("1. git add .")
    print("2. git commit -m 'fix: Update CORS configuration for Railway deployment'")
    print("3. git push origin main")
    print()

    print("Post-deployment verification:")
    print("1. Check logs: railway logs")
    print(
        "2. Test CORS: curl -H 'Origin: https://web-production-92a6c.up.railway.app' https://your-backend-url/cors-test"
    )
    print(
        "3. Test preflight: curl -X OPTIONS -H 'Origin: https://web-production-92a6c.up.railway.app' https://your-backend-url/api/v1/health"
    )


def main():
    """Main deployment check function"""
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    ready = check_environment()
    show_deployment_commands()

    print("\n" + "=" * 60)
    print("CORS FIXES SUMMARY")
    print("=" * 60)
    print("✅ Enhanced Railway URL handling in settings.py")
    print("✅ Improved dynamic CORS middleware")
    print("✅ Better OPTIONS preflight handling")
    print("✅ Added /cors-test endpoint for debugging")
    print("✅ Comprehensive origin pattern matching")
    print()

    if ready:
        print("🚀 Ready to deploy CORS fixes to Railway!")
    else:
        print("⏸️ Please fix issues before deploying")

    return ready


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
