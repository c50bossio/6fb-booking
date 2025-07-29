#!/usr/bin/env python3
"""
Comprehensive test runner for AI Business Calendar system

This script runs all tests for the AI Business Calendar system including:
- Frontend component tests (React/Jest)
- Backend API tests (pytest)
- Database model tests
- Integration tests
- Performance tests

Usage:
    python run_ai_calendar_tests.py [options]

Options:
    --frontend-only    Run only frontend tests
    --backend-only     Run only backend tests
    --integration-only Run only integration tests
    --coverage         Generate coverage reports
    --verbose          Verbose output
    --parallel         Run tests in parallel where possible
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime


class AICalendarTestRunner:
    """Comprehensive test runner for AI Business Calendar system"""
    
    def __init__(self):
        self.backend_path = Path(__file__).parent
        self.frontend_path = self.backend_path / "frontend-v2"
        self.test_results = {}
        
    def run_command(self, command, cwd=None, description=""):
        """Run a command and capture results"""
        print(f"\n🔄 {description}")
        print(f"   Command: {' '.join(command) if isinstance(command, list) else command}")
        
        try:
            if cwd:
                print(f"   Working directory: {cwd}")
                
            result = subprocess.run(
                command,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                print(f"   ✅ Success")
                return True, result.stdout, result.stderr
            else:
                print(f"   ❌ Failed (exit code: {result.returncode})")
                print(f"   Error output: {result.stderr}")
                return False, result.stdout, result.stderr
                
        except subprocess.TimeoutExpired:
            print(f"   ⏰ Timeout after 5 minutes")
            return False, "", "Timeout"
        except Exception as e:
            print(f"   💥 Exception: {str(e)}")
            return False, "", str(e)
    
    def run_frontend_tests(self, verbose=False):
        """Run frontend React/Jest tests"""
        print("\n" + "="*60)
        print("🌐 RUNNING FRONTEND TESTS")
        print("="*60)
        
        if not self.frontend_path.exists():
            print(f"❌ Frontend path not found: {self.frontend_path}")
            return False
            
        # Check if node_modules exists
        node_modules = self.frontend_path / "node_modules"
        if not node_modules.exists():
            print("📦 Installing frontend dependencies...")
            success, stdout, stderr = self.run_command(
                ["npm", "install"],
                cwd=self.frontend_path,
                description="Installing frontend dependencies"
            )
            if not success:
                print("❌ Failed to install frontend dependencies")
                return False
        
        # Run specific AI Calendar component tests
        test_files = [
            "__tests__/components/calendar/AIBusinessCalendar.test.tsx",
            "__tests__/components/ai/AICoachingChatInterface.test.tsx"
        ]
        
        all_passed = True
        
        for test_file in test_files:
            test_path = self.frontend_path / test_file
            if test_path.exists():
                cmd = ["npm", "test", "--", test_file, "--passWithNoTests"]
                if verbose:
                    cmd.append("--verbose")
                    
                success, stdout, stderr = self.run_command(
                    cmd,
                    cwd=self.frontend_path,
                    description=f"Running {test_file}"
                )
                
                self.test_results[f"frontend_{test_file}"] = success
                all_passed = all_passed and success
            else:
                print(f"⚠️  Test file not found: {test_file}")
        
        # Run all frontend tests if individual tests passed
        if all_passed:
            cmd = ["npm", "test", "--", "--watchAll=false", "--passWithNoTests"]
            if verbose:
                cmd.append("--verbose")
                
            success, stdout, stderr = self.run_command(
                cmd,
                cwd=self.frontend_path,
                description="Running all frontend tests"
            )
            
            self.test_results["frontend_all"] = success
            all_passed = all_passed and success
        
        return all_passed
    
    def run_backend_tests(self, verbose=False, coverage=False):
        """Run backend pytest tests"""
        print("\n" + "="*60)
        print("🔧 RUNNING BACKEND TESTS")
        print("="*60)
        
        # Backend test files
        test_files = [
            "tests/test_ai_business_calendar_api.py",
            "tests/test_agents_api.py", 
            "tests/test_business_intelligence_services.py",
            "tests/test_ai_models_and_migrations.py"
        ]
        
        all_passed = True
        
        for test_file in test_files:
            test_path = self.backend_path / test_file
            if test_path.exists():
                cmd = ["python", "-m", "pytest", test_file]
                
                if verbose:
                    cmd.append("-v")
                if coverage:
                    cmd.extend(["--cov=.", "--cov-report=html", "--cov-report=term"])
                    
                success, stdout, stderr = self.run_command(
                    cmd,
                    cwd=self.backend_path,
                    description=f"Running {test_file}"
                )
                
                self.test_results[f"backend_{test_file}"] = success
                all_passed = all_passed and success
            else:
                print(f"⚠️  Test file not found: {test_file}")
        
        return all_passed
    
    def run_integration_tests(self, verbose=False):
        """Run integration tests"""
        print("\n" + "="*60)
        print("🔗 RUNNING INTEGRATION TESTS")
        print("="*60)
        
        test_file = "tests/test_ai_business_calendar_integration.py"
        test_path = self.backend_path / test_file
        
        if not test_path.exists():
            print(f"❌ Integration test file not found: {test_file}")
            return False
            
        cmd = ["python", "-m", "pytest", test_file]
        if verbose:
            cmd.append("-v")
            
        success, stdout, stderr = self.run_command(
            cmd,
            cwd=self.backend_path,
            description="Running integration tests"
        )
        
        self.test_results["integration"] = success
        return success
    
    def run_performance_tests(self):
        """Run performance tests"""
        print("\n" + "="*60)
        print("⚡ RUNNING PERFORMANCE TESTS")
        print("="*60)
        
        # Run specific performance-related tests
        cmd = [
            "python", "-m", "pytest", 
            "-k", "performance",
            "-v"
        ]
        
        success, stdout, stderr = self.run_command(
            cmd,
            cwd=self.backend_path,
            description="Running performance tests"
        )
        
        self.test_results["performance"] = success
        return success
    
    def generate_coverage_report(self):
        """Generate comprehensive coverage report"""
        print("\n" + "="*60)
        print("📊 GENERATING COVERAGE REPORT")
        print("="*60)
        
        # Backend coverage
        cmd = [
            "python", "-m", "pytest",
            "--cov=routers",
            "--cov=services", 
            "--cov=models",
            "--cov-report=html:htmlcov",
            "--cov-report=term-missing",
            "--cov-report=json:coverage.json",
            "tests/test_ai_business_calendar_api.py",
            "tests/test_agents_api.py",
            "tests/test_business_intelligence_services.py",
            "tests/test_ai_models_and_migrations.py"
        ]
        
        success, stdout, stderr = self.run_command(
            cmd,
            cwd=self.backend_path,
            description="Generating backend coverage report"
        )
        
        if success:
            print("📄 Coverage reports generated:")
            print(f"   - HTML: {self.backend_path}/htmlcov/index.html")
            print(f"   - JSON: {self.backend_path}/coverage.json")
        
        # Frontend coverage (if available)
        frontend_coverage_cmd = [
            "npm", "test", "--", 
            "--coverage", 
            "--watchAll=false",
            "--passWithNoTests"
        ]
        
        frontend_success, _, _ = self.run_command(
            frontend_coverage_cmd,
            cwd=self.frontend_path,
            description="Generating frontend coverage report"
        )
        
        return success and frontend_success
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*60)
        print("📋 TEST RESULTS SUMMARY")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result)
        failed_tests = total_tests - passed_tests
        
        print(f"📊 Overall Results:")
        print(f"   Total test suites: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {failed_tests}")
        print(f"   📈 Success rate: {(passed_tests/total_tests*100):.1f}%")
        
        print(f"\n📝 Detailed Results:")
        for test_name, passed in self.test_results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"   {status} {test_name}")
        
        if failed_tests == 0:
            print(f"\n🎉 ALL TESTS PASSED! 🎉")
            print(f"   The AI Business Calendar system is ready for deployment.")
        else:
            print(f"\n⚠️  {failed_tests} test suite(s) failed.")
            print(f"   Please review the failures before deployment.")
        
        return failed_tests == 0
    
    def run_all_tests(self, args):
        """Run all tests based on arguments"""
        print("🚀 AI Business Calendar Comprehensive Test Suite")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        success = True
        
        if not args.backend_only and not args.integration_only:
            frontend_success = self.run_frontend_tests(verbose=args.verbose)
            success = success and frontend_success
        
        if not args.frontend_only and not args.integration_only:
            backend_success = self.run_backend_tests(
                verbose=args.verbose, 
                coverage=args.coverage
            )
            success = success and backend_success
        
        if not args.frontend_only and not args.backend_only:
            integration_success = self.run_integration_tests(verbose=args.verbose)
            success = success and integration_success
        
        # Always run performance tests unless specifically excluded
        if not any([args.frontend_only, args.backend_only, args.integration_only]):
            performance_success = self.run_performance_tests()
            success = success and performance_success
        
        if args.coverage:
            self.generate_coverage_report()
        
        return self.print_summary()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Comprehensive test runner for AI Business Calendar system"
    )
    
    parser.add_argument(
        "--frontend-only",
        action="store_true",
        help="Run only frontend tests"
    )
    
    parser.add_argument(
        "--backend-only", 
        action="store_true",
        help="Run only backend tests"
    )
    
    parser.add_argument(
        "--integration-only",
        action="store_true", 
        help="Run only integration tests"
    )
    
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Generate coverage reports"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Verbose output"
    )
    
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run tests in parallel where possible"
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    exclusive_flags = [args.frontend_only, args.backend_only, args.integration_only]
    if sum(exclusive_flags) > 1:
        print("❌ Error: Only one of --frontend-only, --backend-only, --integration-only can be specified")
        sys.exit(1)
    
    # Create and run test runner
    runner = AICalendarTestRunner()
    success = runner.run_all_tests(args)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()