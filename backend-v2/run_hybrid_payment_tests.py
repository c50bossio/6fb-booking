#!/usr/bin/env python3
"""
Comprehensive test runner for the hybrid payment system.

This script runs all tests related to the hybrid payment system and provides
a summary of the testing coverage and results.
"""

import subprocess
import sys
import os
from pathlib import Path

# Test categories and their descriptions
TEST_CATEGORIES = {
    "unit": {
        "description": "Unit tests for individual components",
        "path": "tests/unit/test_unified_payment_analytics_service_real.py",
        "focus": "Analytics service functionality"
    },
    "integration": {
        "description": "Integration tests for cross-component functionality", 
        "path": "tests/integration/test_hybrid_payment_system_comprehensive.py",
        "focus": "Payment routing, external connections, commission collection"
    },
    "e2e": {
        "description": "End-to-end tests for complete user flows",
        "path": "tests/e2e/test_hybrid_payment_end_to_end.py", 
        "focus": "Complete payment flows from appointment to analytics"
    }
}

def run_command(command, description):
    """Run a command and return the result."""
    print(f"\n🧪 {description}")
    print("=" * 60)
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            print("✅ PASSED")
            # Extract test summary from output
            lines = result.stdout.split('\n')
            for line in lines:
                if 'passed' in line and ('warning' in line or 'error' in line or 'failed' in line):
                    print(f"📊 {line.strip()}")
                    break
            return True
        else:
            print("❌ FAILED")
            print("\nSTDOUT:")
            print(result.stdout)
            print("\nSTDERR:")
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("⏰ TIMEOUT - Test took longer than 5 minutes")
        return False
    except Exception as e:
        print(f"💥 ERROR: {e}")
        return False

def run_test_category(category, info):
    """Run tests for a specific category."""
    print(f"\n📂 {category.upper()} TESTS")
    print(f"📝 {info['description']}")
    print(f"🎯 Focus: {info['focus']}")
    
    # Check if test file exists
    if not Path(info['path']).exists():
        print(f"❌ Test file not found: {info['path']}")
        return False
    
    # Run the tests
    command = f"python -m pytest {info['path']} -v --tb=short"
    return run_command(command, f"Running {category} tests")

def run_all_tests():
    """Run all hybrid payment system tests."""
    print("🚀 HYBRID PAYMENT SYSTEM - COMPREHENSIVE TEST SUITE")
    print("=" * 80)
    print("Testing the complete hybrid payment system implementation including:")
    print("• Payment mode routing (centralized vs decentralized)")
    print("• External payment processor integrations")
    print("• Platform commission collection system")
    print("• Unified analytics across all payment flows")
    print("• Six Figure Barber methodology integration")
    print("• End-to-end payment flows")
    
    results = {}
    
    # Run each test category
    for category, info in TEST_CATEGORIES.items():
        results[category] = run_test_category(category, info)
    
    # Summary
    print("\n📊 TEST SUMMARY")
    print("=" * 40)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for category, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{category.upper():<12} {status}")
    
    print(f"\nOverall: {passed}/{total} test categories passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Hybrid payment system is fully tested and ready for deployment")
        return True
    else:
        print(f"\n⚠️  {total - passed} test categories failed")
        print("❌ Some components need attention before deployment")
        return False

def run_quick_smoke_test():
    """Run a quick smoke test to verify basic functionality."""
    print("\n💨 SMOKE TEST - Quick verification of core functionality")
    print("=" * 60)
    
    # Test basic imports
    test_imports = """
python -c "
from models.hybrid_payment import PaymentMode, ExternalPaymentProcessor, PlatformCollection
from services.hybrid_payment_router import HybridPaymentRouter
from services.external_payment_service import ExternalPaymentService
from services.unified_payment_analytics_service import UnifiedPaymentAnalyticsService
from tests.factories import UserFactory, PaymentFactory
print('✅ All imports successful')
"
"""
    
    success = run_command(test_imports, "Testing core imports")
    
    if success:
        print("\n✅ Smoke test passed - Core system is functional")
        return True
    else:
        print("\n❌ Smoke test failed - Core system has issues")
        return False

def main():
    """Main test runner."""
    if len(sys.argv) > 1:
        if sys.argv[1] == "--smoke":
            return run_quick_smoke_test()
        elif sys.argv[1] == "--unit":
            return run_test_category("unit", TEST_CATEGORIES["unit"])
        elif sys.argv[1] == "--integration":
            return run_test_category("integration", TEST_CATEGORIES["integration"])
        elif sys.argv[1] == "--e2e":
            return run_test_category("e2e", TEST_CATEGORIES["e2e"])
        elif sys.argv[1] == "--help":
            print("Hybrid Payment System Test Runner")
            print("\nUsage:")
            print("  python run_hybrid_payment_tests.py [OPTIONS]")
            print("\nOptions:")
            print("  --smoke      Run quick smoke test")
            print("  --unit       Run unit tests only")
            print("  --integration Run integration tests only")
            print("  --e2e        Run end-to-end tests only")
            print("  --help       Show this help message")
            print("\nWith no arguments, runs all test categories")
            return True
    
    # Run all tests by default
    return run_all_tests()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)