#!/usr/bin/env python3
"""
Barber Profile Testing Suite Runner

This script runs the comprehensive test suite for the barber profile enhancement system.
It executes all test categories and generates a detailed report.

Usage:
    python run_barber_profile_tests.py [--verbose] [--category CATEGORY] [--report]

Categories:
    - api: API endpoint tests
    - service: Service layer tests  
    - migration: Database migration tests
    - integration: End-to-end integration tests
    - documentation: OpenAPI documentation tests
    - all: Run all test categories (default)
"""

import argparse
import os
import sys
import subprocess
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional


class BarberProfileTestRunner:
    """Test runner for barber profile system"""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.test_results: Dict[str, Dict] = {}
        self.start_time = time.time()
        
        # Define test categories and their files
        self.test_categories = {
            "api": {
                "name": "API Endpoint Tests",
                "file": "tests/test_barber_profiles.py",
                "description": "Tests for REST API endpoints, authentication, and validation"
            },
            "service": {
                "name": "Service Layer Tests", 
                "file": "tests/test_barber_profiles.py::TestBarberProfileService",
                "description": "Tests for business logic in BarberProfileService"
            },
            "migration": {
                "name": "Database Migration Tests",
                "file": "tests/test_barber_profile_migrations.py", 
                "description": "Tests for database schema migrations and rollbacks"
            },
            "integration": {
                "name": "Integration Tests",
                "file": "tests/test_barber_profile_integration.py",
                "description": "End-to-end tests for complete workflows"
            },
            "documentation": {
                "name": "API Documentation Tests",
                "file": "tests/test_openapi_documentation.py",
                "description": "Tests for OpenAPI/Swagger documentation generation"
            }
        }

    def run_test_category(self, category: str) -> Dict:
        """Run tests for a specific category"""
        if category not in self.test_categories:
            raise ValueError(f"Unknown category: {category}")
        
        category_info = self.test_categories[category]
        test_file = category_info["file"]
        
        print(f"\n{'='*60}")
        print(f"Running {category_info['name']}")
        print(f"File: {test_file}")
        print(f"Description: {category_info['description']}")
        print(f"{'='*60}")
        
        # Build pytest command
        cmd = [
            "python", "-m", "pytest", 
            test_file,
            "-v" if self.verbose else "-q",
            "--tb=short",
            "--json-report",
            f"--json-report-file=test_results_{category}.json"
        ]
        
        # Add coverage if requested
        if os.getenv("COVERAGE", "").lower() == "true":
            cmd.extend(["--cov=services", "--cov=routers", "--cov=models"])
        
        start_time = time.time()
        
        try:
            # Run the tests
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent
            )
            
            execution_time = time.time() - start_time
            
            # Parse JSON report if available
            json_file = f"test_results_{category}.json"
            test_data = {}
            
            if os.path.exists(json_file):
                try:
                    with open(json_file, 'r') as f:
                        test_data = json.load(f)
                    os.remove(json_file)  # Clean up
                except Exception as e:
                    print(f"Warning: Could not parse JSON report: {e}")
            
            # Compile results
            category_result = {
                "category": category,
                "name": category_info["name"],
                "success": result.returncode == 0,
                "execution_time": execution_time,
                "return_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "test_data": test_data
            }
            
            # Extract key metrics from test data
            if test_data:
                summary = test_data.get("summary", {})
                category_result.update({
                    "total_tests": summary.get("total", 0),
                    "passed_tests": summary.get("passed", 0), 
                    "failed_tests": summary.get("failed", 0),
                    "skipped_tests": summary.get("skipped", 0),
                    "error_tests": summary.get("error", 0)
                })
            
            self.test_results[category] = category_result
            
            # Print immediate results
            if category_result["success"]:
                print(f"✅ {category_info['name']} - PASSED")
                if test_data:
                    summary = test_data.get("summary", {})
                    print(f"   Tests: {summary.get('passed', 0)} passed, {summary.get('total', 0)} total")
            else:
                print(f"❌ {category_info['name']} - FAILED")
                if test_data:
                    summary = test_data.get("summary", {})
                    failed = summary.get('failed', 0)
                    errors = summary.get('error', 0)
                    print(f"   Tests: {failed} failed, {errors} errors")
            
            print(f"   Execution time: {execution_time:.2f}s")
            
            if not category_result["success"] and self.verbose:
                print("\n--- STDOUT ---")
                print(result.stdout)
                print("\n--- STDERR ---") 
                print(result.stderr)
            
            return category_result
            
        except Exception as e:
            print(f"❌ Failed to run {category} tests: {e}")
            error_result = {
                "category": category,
                "name": category_info["name"], 
                "success": False,
                "execution_time": time.time() - start_time,
                "error": str(e)
            }
            self.test_results[category] = error_result
            return error_result

    def run_categories(self, categories: List[str]) -> Dict:
        """Run multiple test categories"""
        print(f"🚀 Starting Barber Profile Test Suite")
        print(f"Categories: {', '.join(categories)}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run each category
        for category in categories:
            self.run_test_category(category)
        
        # Generate summary
        return self.generate_summary()

    def generate_summary(self) -> Dict:
        """Generate test execution summary"""
        total_time = time.time() - self.start_time
        
        summary = {
            "timestamp": datetime.now().isoformat(),
            "total_execution_time": total_time,
            "categories_run": len(self.test_results),
            "categories_passed": sum(1 for r in self.test_results.values() if r.get("success", False)),
            "categories_failed": sum(1 for r in self.test_results.values() if not r.get("success", True)),
            "total_tests": sum(r.get("total_tests", 0) for r in self.test_results.values()),
            "total_passed": sum(r.get("passed_tests", 0) for r in self.test_results.values()),
            "total_failed": sum(r.get("failed_tests", 0) for r in self.test_results.values()),
            "total_skipped": sum(r.get("skipped_tests", 0) for r in self.test_results.values()),
            "total_errors": sum(r.get("error_tests", 0) for r in self.test_results.values()),
            "results": self.test_results
        }
        
        return summary

    def print_summary(self, summary: Dict):
        """Print formatted test summary"""
        print(f"\n{'='*80}")
        print(f"🎯 BARBER PROFILE TEST SUITE SUMMARY")
        print(f"{'='*80}")
        
        # Overall results
        print(f"⏱️  Total execution time: {summary['total_execution_time']:.2f}s")
        print(f"📊 Categories: {summary['categories_passed']}/{summary['categories_run']} passed")
        
        if summary['total_tests'] > 0:
            print(f"🧪 Individual tests: {summary['total_passed']}/{summary['total_tests']} passed")
            if summary['total_failed'] > 0:
                print(f"❌ Failed: {summary['total_failed']}")
            if summary['total_skipped'] > 0:
                print(f"⏭️  Skipped: {summary['total_skipped']}")
            if summary['total_errors'] > 0:
                print(f"💥 Errors: {summary['total_errors']}")
        
        print(f"\n📋 Category Results:")
        print("-" * 80)
        
        for category, result in summary['results'].items():
            status = "✅ PASS" if result.get('success', False) else "❌ FAIL"
            name = result.get('name', category.title())
            time_str = f"{result.get('execution_time', 0):.2f}s"
            
            print(f"{status:8} | {name:30} | {time_str:8}")
            
            # Show test breakdown if available
            if result.get('total_tests', 0) > 0:
                passed = result.get('passed_tests', 0)
                total = result.get('total_tests', 0)
                failed = result.get('failed_tests', 0)
                print(f"         |   └─ Tests: {passed}/{total} passed" + 
                      (f", {failed} failed" if failed > 0 else ""))

        # Overall verdict
        print(f"\n{'='*80}")
        if summary['categories_failed'] == 0:
            print("🎉 ALL TESTS PASSED! Barber profile system is ready for deployment.")
        else:
            print("⚠️  SOME TESTS FAILED! Please review and fix issues before deployment.")
        print(f"{'='*80}")

    def save_report(self, summary: Dict, filename: Optional[str] = None):
        """Save detailed test report to file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"barber_profile_test_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(summary, f, indent=2, default=str)
        
        print(f"📄 Detailed report saved to: {filename}")

    def check_prerequisites(self) -> bool:
        """Check if all prerequisites are met for running tests"""
        print("🔍 Checking prerequisites...")
        
        issues = []
        
        # Check if we're in the right directory
        if not os.path.exists("main.py"):
            issues.append("❌ main.py not found - are you in the backend-v2 directory?")
        
        # Check for test files
        for category, info in self.test_categories.items():
            test_file = info["file"].split("::")[0]  # Remove class specifier
            if not os.path.exists(test_file):
                issues.append(f"❌ Test file missing: {test_file}")
        
        # Check for required dependencies
        try:
            import pytest
            import fastapi
            import sqlalchemy
        except ImportError as e:
            issues.append(f"❌ Missing dependency: {e}")
        
        if issues:
            print("🚨 Prerequisites check failed:")
            for issue in issues:
                print(f"   {issue}")
            return False
        else:
            print("✅ All prerequisites met!")
            return True


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Run comprehensive barber profile test suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Test Categories:
  api           - API endpoint tests (CRUD, authentication, validation)
  service       - Service layer business logic tests
  migration     - Database migration and rollback tests
  integration   - End-to-end workflow integration tests
  documentation - OpenAPI/Swagger documentation tests
  all           - Run all test categories (default)

Examples:
  python run_barber_profile_tests.py                    # Run all tests
  python run_barber_profile_tests.py --verbose          # Run all tests with detailed output
  python run_barber_profile_tests.py --category api     # Run only API tests
  python run_barber_profile_tests.py --report           # Save detailed report
        """
    )
    
    parser.add_argument(
        "--category", "-c",
        choices=["api", "service", "migration", "integration", "documentation", "all"],
        default="all",
        help="Test category to run (default: all)"
    )
    
    parser.add_argument(
        "--verbose", "-v", 
        action="store_true",
        help="Verbose output with detailed test results"
    )
    
    parser.add_argument(
        "--report", "-r",
        action="store_true", 
        help="Save detailed test report to JSON file"
    )
    
    parser.add_argument(
        "--skip-prereq",
        action="store_true",
        help="Skip prerequisite checks"
    )
    
    args = parser.parse_args()
    
    # Initialize test runner
    runner = BarberProfileTestRunner(verbose=args.verbose)
    
    # Check prerequisites
    if not args.skip_prereq and not runner.check_prerequisites():
        print("\n💡 Fix the issues above and try again, or use --skip-prereq to ignore.")
        sys.exit(1)
    
    # Determine categories to run
    if args.category == "all":
        categories = list(runner.test_categories.keys())
    else:
        categories = [args.category]
    
    try:
        # Run tests
        summary = runner.run_categories(categories)
        
        # Print summary
        runner.print_summary(summary)
        
        # Save report if requested
        if args.report:
            runner.save_report(summary)
        
        # Exit with appropriate code
        if summary['categories_failed'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Test execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Unexpected error during test execution: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()