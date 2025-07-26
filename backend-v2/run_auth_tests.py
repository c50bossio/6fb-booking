#!/usr/bin/env python3
"""
Authentication Integration Test Runner

This script provides a convenient way to run the enhanced authentication
integration tests with proper setup and reporting.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def setup_test_environment():
    """Set up the test environment variables."""
    os.environ["TESTING"] = "true"
    os.environ["ENVIRONMENT"] = "test"
    if not os.environ.get("SECRET_KEY"):
        os.environ["SECRET_KEY"] = "test_secret_key_for_testing_only"
    
    print("✅ Test environment configured")

def run_tests(test_class=None, verbose=True, coverage=False):
    """
    Run the authentication integration tests.
    
    Args:
        test_class: Specific test class to run (optional)
        verbose: Enable verbose output
        coverage: Generate coverage report
    """
    # Ensure we're in the right directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Build pytest command
    cmd = ["python", "-m", "pytest"]
    
    # Test path
    if test_class:
        test_path = f"tests/integration/test_auth_enhanced.py::{test_class}"
    else:
        test_path = "tests/integration/test_auth_enhanced.py"
    
    cmd.append(test_path)
    
    # Add flags
    if verbose:
        cmd.append("-v")
    
    if coverage:
        cmd.extend([
            "--cov=routers.auth",
            "--cov=utils.auth", 
            "--cov=utils.cookie_auth",
            "--cov=services.token_blacklist",
            "--cov=utils.password_reset",
            "--cov-report=html",
            "--cov-report=term-missing"
        ])
    
    # Add other useful flags
    cmd.extend([
        "--tb=short",  # Shorter traceback format
        "-x",  # Stop on first failure
        "--disable-warnings"  # Disable pytest warnings for cleaner output
    ])
    
    print(f"🧪 Running command: {' '.join(cmd)}")
    print("=" * 60)
    
    try:
        result = subprocess.run(cmd, capture_output=False, text=True)
        return result.returncode == 0
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        return False
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False

def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="Run BookedBarber V2 Authentication Integration Tests")
    
    parser.add_argument(
        "--class", "-c",
        dest="test_class",
        help="Run specific test class (e.g., TestJWTRefreshTokenRotation)"
    )
    
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Generate coverage report"
    )
    
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Run in quiet mode (less verbose output)"
    )
    
    parser.add_argument(
        "--list-classes",
        action="store_true",
        help="List available test classes"
    )
    
    args = parser.parse_args()
    
    if args.list_classes:
        print("Available test classes:")
        print("=" * 40)
        test_classes = [
            "TestJWTRefreshTokenRotation",
            "TestCookieBasedAuthFlow", 
            "TestTokenBlacklistingLogout",
            "TestPasswordResetFunctionality",
            "TestCSRFProtection",
            "TestAuthenticationRateLimiting",
            "TestAuthenticationEdgeCases",
            "TestAuthenticationIntegration"
        ]
        for i, cls in enumerate(test_classes, 1):
            print(f"{i:2d}. {cls}")
        return
    
    print("🚀 BookedBarber V2 Authentication Integration Tests")
    print("=" * 60)
    
    setup_test_environment()
    
    success = run_tests(
        test_class=args.test_class,
        verbose=not args.quiet,
        coverage=args.coverage
    )
    
    print("=" * 60)
    if success:
        print("✅ All tests passed!")
        if args.coverage:
            print("📊 Coverage report generated in htmlcov/index.html")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()