#!/usr/bin/env python3
"""
GDPR Test Suite Runner

Comprehensive test runner for all GDPR compliance and privacy tests.
Includes unit tests, integration tests, and validation scripts.

Usage:
    python run_gdpr_tests.py [OPTIONS]
    
Options:
    --unit          Run only unit tests
    --integration   Run only integration tests  
    --validation    Run compliance validation
    --coverage      Generate coverage report
    --verbose       Verbose output
    --report        Generate test report
"""

import argparse
import subprocess
import sys
import json
import os
from datetime import datetime
from pathlib import Path


class GDPRTestRunner:
    """Test runner for GDPR compliance tests"""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results = {}
        
    def run_command(self, command: list, description: str) -> tuple[int, str, str]:
        """Run a command and capture output"""
        if self.verbose:
            print(f"Running: {description}")
            print(f"Command: {' '.join(command)}")
        
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent
            )
            
            if self.verbose:
                print(f"Exit code: {result.returncode}")
                if result.stdout:
                    print(f"STDOUT:\n{result.stdout}")
                if result.stderr:
                    print(f"STDERR:\n{result.stderr}")
            
            return result.returncode, result.stdout, result.stderr
            
        except Exception as e:
            error_msg = f"Failed to run command: {e}"
            if self.verbose:
                print(error_msg)
            return 1, "", error_msg
    
    def run_unit_tests(self) -> bool:
        """Run GDPR unit tests"""
        print("🧪 Running GDPR Unit Tests...")
        
        # Backend unit tests
        backend_cmd = [
            "python", "-m", "pytest", 
            "tests/test_privacy_api.py",
            "-v", "--tb=short", "-m", "not integration"
        ]
        
        code, stdout, stderr = self.run_command(backend_cmd, "Backend Privacy API Tests")
        
        self.results["backend_unit_tests"] = {
            "exit_code": code,
            "passed": code == 0,
            "output": stdout,
            "errors": stderr
        }
        
        # Frontend unit tests (if npm is available)
        frontend_path = Path("frontend-v2")
        if frontend_path.exists():
            frontend_cmd = ["npm", "run", "test:gdpr"]
            code, stdout, stderr = self.run_command(frontend_cmd, "Frontend GDPR Tests")
            
            self.results["frontend_unit_tests"] = {
                "exit_code": code,
                "passed": code == 0,
                "output": stdout,
                "errors": stderr
            }
        else:
            print("⚠️  Frontend directory not found, skipping frontend tests")
            self.results["frontend_unit_tests"] = {
                "exit_code": 0,
                "passed": True,
                "output": "Skipped - frontend directory not found",
                "errors": ""
            }
        
        backend_passed = self.results["backend_unit_tests"]["passed"]
        frontend_passed = self.results["frontend_unit_tests"]["passed"]
        
        if backend_passed and frontend_passed:
            print("✅ Unit tests passed")
            return True
        else:
            print("❌ Unit tests failed")
            return False
    
    def run_integration_tests(self) -> bool:
        """Run GDPR integration tests"""
        print("🔗 Running GDPR Integration Tests...")
        
        # Backend integration tests
        integration_cmd = [
            "python", "-m", "pytest", 
            "test_gdpr_compliance.py",
            "-v", "--tb=short", "-m", "integration"
        ]
        
        code, stdout, stderr = self.run_command(integration_cmd, "GDPR Integration Tests")
        
        self.results["integration_tests"] = {
            "exit_code": code,
            "passed": code == 0,
            "output": stdout,
            "errors": stderr
        }
        
        if code == 0:
            print("✅ Integration tests passed")
            return True
        else:
            print("❌ Integration tests failed")
            return False
    
    def run_e2e_tests(self) -> bool:
        """Run GDPR E2E tests"""
        print("🎭 Running GDPR E2E Tests...")
        
        frontend_path = Path("frontend-v2")
        if not frontend_path.exists():
            print("⚠️  Frontend directory not found, skipping E2E tests")
            self.results["e2e_tests"] = {
                "exit_code": 0,
                "passed": True,
                "output": "Skipped - frontend directory not found",
                "errors": ""
            }
            return True
        
        # Change to frontend directory for E2E tests
        e2e_cmd = ["npm", "run", "test:e2e:gdpr"]
        
        try:
            result = subprocess.run(
                e2e_cmd,
                capture_output=True,
                text=True,
                cwd=frontend_path
            )
            
            self.results["e2e_tests"] = {
                "exit_code": result.returncode,
                "passed": result.returncode == 0,
                "output": result.stdout,
                "errors": result.stderr
            }
            
            if result.returncode == 0:
                print("✅ E2E tests passed")
                return True
            else:
                print("❌ E2E tests failed")
                if self.verbose:
                    print(f"STDOUT: {result.stdout}")
                    print(f"STDERR: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ E2E tests failed to run: {e}")
            self.results["e2e_tests"] = {
                "exit_code": 1,
                "passed": False,
                "output": "",
                "errors": str(e)
            }
            return False
    
    def run_compliance_validation(self) -> bool:
        """Run GDPR compliance validation"""
        print("📋 Running GDPR Compliance Validation...")
        
        validation_cmd = [
            "python", "validate_gdpr_compliance.py",
            "--verbose" if self.verbose else "--quiet",
            "--report-file", "gdpr_compliance_report.json"
        ]
        
        code, stdout, stderr = self.run_command(validation_cmd, "GDPR Compliance Validation")
        
        self.results["compliance_validation"] = {
            "exit_code": code,
            "passed": code == 0,
            "output": stdout,
            "errors": stderr
        }
        
        # Try to load the generated report
        report_file = Path("gdpr_compliance_report.json")
        if report_file.exists():
            try:
                with open(report_file) as f:
                    report_data = json.load(f)
                    self.results["compliance_validation"]["report"] = report_data
            except Exception as e:
                if self.verbose:
                    print(f"Failed to load compliance report: {e}")
        
        if code == 0:
            print("✅ Compliance validation passed")
            return True
        elif code == 2:
            print("⚠️  Compliance validation passed with warnings")
            return True
        else:
            print("❌ Compliance validation failed")
            return False
    
    def generate_coverage_report(self) -> bool:
        """Generate test coverage report"""
        print("📊 Generating Coverage Report...")
        
        coverage_cmd = [
            "python", "-m", "pytest", 
            "tests/test_privacy_api.py",
            "test_gdpr_compliance.py",
            "--cov=models.consent",
            "--cov=routers.privacy", 
            "--cov=schemas_new.privacy",
            "--cov-report=html:htmlcov",
            "--cov-report=term-missing",
            "--cov-report=json:coverage.json"
        ]
        
        code, stdout, stderr = self.run_command(coverage_cmd, "Coverage Report Generation")
        
        self.results["coverage"] = {
            "exit_code": code,
            "passed": code == 0,
            "output": stdout,
            "errors": stderr
        }
        
        # Try to load coverage data
        coverage_file = Path("coverage.json")
        if coverage_file.exists():
            try:
                with open(coverage_file) as f:
                    coverage_data = json.load(f)
                    self.results["coverage"]["data"] = coverage_data
                    
                    # Extract summary
                    if "totals" in coverage_data:
                        totals = coverage_data["totals"]
                        coverage_percent = totals.get("percent_covered", 0)
                        print(f"📊 Overall coverage: {coverage_percent:.1f}%")
                        
            except Exception as e:
                if self.verbose:
                    print(f"Failed to load coverage data: {e}")
        
        if code == 0:
            print("✅ Coverage report generated")
            return True
        else:
            print("❌ Coverage report generation failed")
            return False
    
    def generate_test_report(self, output_file: str = "gdpr_test_report.json"):
        """Generate comprehensive test report"""
        print(f"📄 Generating test report: {output_file}")
        
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "test_suite": "GDPR Compliance Tests",
            "results": self.results,
            "summary": {
                "total_test_suites": len(self.results),
                "passed_suites": len([r for r in self.results.values() if r.get("passed", False)]),
                "failed_suites": len([r for r in self.results.values() if not r.get("passed", True)]),
            }
        }
        
        # Calculate overall status
        all_passed = all(r.get("passed", False) for r in self.results.values())
        report["summary"]["overall_status"] = "PASS" if all_passed else "FAIL"
        
        try:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            print(f"✅ Test report saved to {output_file}")
        except Exception as e:
            print(f"❌ Failed to save test report: {e}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("GDPR TEST SUITE SUMMARY")
        print("="*60)
        
        for test_name, result in self.results.items():
            status = "✅ PASS" if result.get("passed", False) else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
        
        total_suites = len(self.results)
        passed_suites = len([r for r in self.results.values() if r.get("passed", False)])
        
        print(f"\nTotal Test Suites: {total_suites}")
        print(f"Passed: {passed_suites}")
        print(f"Failed: {total_suites - passed_suites}")
        
        if passed_suites == total_suites:
            print("\n🎉 All GDPR tests passed!")
            return True
        else:
            print(f"\n❌ {total_suites - passed_suites} test suite(s) failed")
            return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="GDPR Test Suite Runner")
    parser.add_argument("--unit", action="store_true", help="Run only unit tests")
    parser.add_argument("--integration", action="store_true", help="Run only integration tests")
    parser.add_argument("--e2e", action="store_true", help="Run only E2E tests")
    parser.add_argument("--validation", action="store_true", help="Run only compliance validation")
    parser.add_argument("--coverage", action="store_true", help="Generate coverage report")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--report", help="Generate test report to file")
    
    args = parser.parse_args()
    
    # If no specific tests specified, run all
    if not any([args.unit, args.integration, args.e2e, args.validation, args.coverage]):
        run_all = True
    else:
        run_all = False
    
    runner = GDPRTestRunner(verbose=args.verbose)
    
    print("🚀 Starting GDPR Test Suite")
    print("="*60)
    
    success = True
    
    # Run tests based on arguments
    if run_all or args.unit:
        success &= runner.run_unit_tests()
    
    if run_all or args.integration:
        success &= runner.run_integration_tests()
    
    if run_all or args.e2e:
        success &= runner.run_e2e_tests()
    
    if run_all or args.validation:
        success &= runner.run_compliance_validation()
    
    if run_all or args.coverage:
        runner.generate_coverage_report()
    
    # Generate report if requested
    if args.report:
        runner.generate_test_report(args.report)
    
    # Print summary
    overall_success = runner.print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if overall_success else 1)


if __name__ == "__main__":
    main()