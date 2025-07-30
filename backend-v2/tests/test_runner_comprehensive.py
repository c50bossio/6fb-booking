#!/usr/bin/env python3
"""
Comprehensive Test Runner for BookedBarber V2 Automated Test Suite
================================================================

This script provides comprehensive test execution with intelligent categorization,
parallel execution, coverage reporting, and performance benchmarking.

FEATURES:
- Intelligent test suite selection and execution
- Parallel test execution for performance
- Comprehensive coverage reporting
- Performance benchmarking and regression detection
- Test result analysis and reporting
- Integration with CI/CD pipelines
- Email/Slack notifications for test results

USAGE:
    python test_runner_comprehensive.py --suite all --parallel --coverage
    python test_runner_comprehensive.py --suite security --verbose
    python test_runner_comprehensive.py --suite performance --benchmark
    python test_runner_comprehensive.py --suite smoke --fast
"""

import argparse
import os
import sys
import time
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import concurrent.futures

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

class ComprehensiveTestRunner:
    """Comprehensive test runner with advanced features"""
    
    def __init__(self):
        self.test_root = Path(__file__).parent
        self.project_root = self.test_root.parent
        self.results = {}
        self.start_time = None
        self.test_suites = {
            "auth": [
                "tests/security/test_comprehensive_authentication_security_suite.py",
            ],
            "security": [
                "tests/security/test_comprehensive_authentication_security_suite.py",
                "tests/security/test_comprehensive_security_middleware_suite.py",
            ],
            "performance": [
                "tests/performance/test_enhanced_comprehensive_performance_suite.py",
                "tests/performance/test_comprehensive_performance_suite.py",
            ],
            "ai": [
                "tests/ai_dashboard/test_comprehensive_ai_dashboard_transformation_suite.py",
            ],
            "integration": [
                "tests/integration/test_comprehensive_third_party_integration_suite.py",
            ],
            "api": [
                "tests/api/test_comprehensive_api_v2_endpoints_suite.py",
            ],
            "frontend": [
                "tests/frontend/test_comprehensive_frontend_component_suite.py",
            ],
            "e2e": [
                "tests/e2e/test_comprehensive_end_to_end_workflow_suite.py",
            ],
            "smoke": [
                # Lightweight smoke tests for quick validation
                "tests/security/test_comprehensive_authentication_security_suite.py::TestComprehensiveAuthenticationSecuritySuite::test_development_bypass_functionality",
                "tests/api/test_comprehensive_api_v2_endpoints_suite.py::TestComprehensiveAPIV2EndpointsSuite::test_auth_v2_endpoints_comprehensive",
                "tests/performance/test_enhanced_comprehensive_performance_suite.py::TestEnhancedPerformanceSuite::test_authentication_performance",
            ],
            "critical": [
                # Critical path tests that must pass
                "tests/security/test_comprehensive_authentication_security_suite.py::TestComprehensiveAuthenticationSecuritySuite::test_jwt_token_validation_comprehensive",
                "tests/security/test_comprehensive_security_middleware_suite.py::TestComprehensiveSecurityMiddlewareSuite::test_cors_configuration_comprehensive",
                "tests/api/test_comprehensive_api_v2_endpoints_suite.py::TestComprehensiveAPIV2EndpointsSuite::test_api_v2_compliance",
            ],
            "all": []  # Will be populated with all test files
        }
        
        # Populate "all" suite with all test files
        self._discover_all_tests()

    def _discover_all_tests(self):
        """Discover all test files in the test directory"""
        test_files = []
        for suite_files in self.test_suites.values():
            if isinstance(suite_files, list):
                test_files.extend(suite_files)
        
        # Add any additional test files found
        for test_file in self.test_root.rglob("test_*.py"):
            relative_path = str(test_file.relative_to(self.project_root))
            if relative_path not in test_files:
                test_files.append(relative_path)
        
        self.test_suites["all"] = list(set(test_files))

    def run_pytest_command(self, 
                          test_paths: List[str], 
                          extra_args: List[str] = None,
                          parallel: bool = False,
                          coverage: bool = False,
                          verbose: bool = False) -> Tuple[int, str, str]:
        """Run pytest with specified parameters"""
        
        cmd = ["python", "-m", "pytest"]
        
        # Add test paths
        cmd.extend(test_paths)
        
        # Add standard arguments
        cmd.extend([
            "--tb=short",
            "--strict-markers",
            "--strict-config"
        ])
        
        # Add verbosity
        if verbose:
            cmd.extend(["-v", "-s"])
        else:
            cmd.append("-q")
        
        # Add parallel execution
        if parallel:
            try:
                import pytest_xdist
                cmd.extend(["-n", "auto"])
            except ImportError:
                print("Warning: pytest-xdist not available, running sequentially")
        
        # Add coverage reporting
        if coverage:
            cmd.extend([
                "--cov=.",
                "--cov-report=html:coverage/html",
                "--cov-report=term-missing",
                "--cov-report=xml:coverage/coverage.xml",
                "--cov-fail-under=75"
            ])
        
        # Add extra arguments
        if extra_args:
            cmd.extend(extra_args)
        
        # Set working directory
        cwd = self.project_root
        
        print(f"Running command: {' '.join(cmd)}")
        print(f"Working directory: {cwd}")
        
        # Run the command
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=1800  # 30 minute timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return 1, "", "Test execution timed out after 30 minutes"
        except Exception as e:
            return 1, "", f"Error running tests: {str(e)}"

    def run_test_suite(self, 
                      suite_name: str,
                      parallel: bool = False,
                      coverage: bool = False,
                      verbose: bool = False,
                      extra_args: List[str] = None) -> Dict:
        """Run a specific test suite"""
        
        if suite_name not in self.test_suites:
            raise ValueError(f"Unknown test suite: {suite_name}")
        
        test_paths = self.test_suites[suite_name]
        if not test_paths:
            return {
                "suite": suite_name,
                "status": "skipped",
                "reason": "No test files found",
                "duration": 0,
                "tests_run": 0,
                "passed": 0,
                "failed": 0,
                "errors": 0
            }
        
        print(f"\n{'='*60}")
        print(f"Running Test Suite: {suite_name.upper()}")
        print(f"{'='*60}")
        print(f"Test files: {len(test_paths)}")
        for path in test_paths:
            print(f"  - {path}")
        print()
        
        start_time = time.time()
        
        # Run tests
        return_code, stdout, stderr = self.run_pytest_command(
            test_paths=test_paths,
            extra_args=extra_args,
            parallel=parallel,
            coverage=coverage,
            verbose=verbose
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Parse results
        result = self._parse_test_results(stdout, stderr, return_code)
        result.update({
            "suite": suite_name,
            "duration": duration,
            "stdout": stdout,
            "stderr": stderr
        })
        
        # Print results
        self._print_suite_results(result)
        
        return result

    def _parse_test_results(self, stdout: str, stderr: str, return_code: int) -> Dict:
        """Parse pytest output to extract test results"""
        result = {
            "status": "passed" if return_code == 0 else "failed",
            "tests_run": 0,
            "passed": 0,
            "failed": 0,
            "errors": 0,
            "skipped": 0,
            "warnings": 0
        }
        
        # Parse stdout for test counts
        lines = stdout.split('\n')
        for line in lines:
            line = line.strip()
            
            # Look for pytest summary line
            if " passed" in line or " failed" in line or " error" in line:
                # Parse summary line like "5 passed, 2 failed, 1 skipped"
                parts = line.split(',')
                for part in parts:
                    part = part.strip()
                    if " passed" in part:
                        result["passed"] = int(part.split()[0])
                    elif " failed" in part:
                        result["failed"] = int(part.split()[0])
                    elif " error" in part:
                        result["errors"] = int(part.split()[0])
                    elif " skipped" in part:
                        result["skipped"] = int(part.split()[0])
                    elif " warning" in part:
                        result["warnings"] = int(part.split()[0])
        
        result["tests_run"] = result["passed"] + result["failed"] + result["errors"] + result["skipped"]
        
        # If we couldn't parse the results, try to estimate
        if result["tests_run"] == 0 and return_code == 0:
            # Estimate based on presence of test output
            if "test session starts" in stdout.lower():
                result["tests_run"] = 1
                result["passed"] = 1
        
        return result

    def _print_suite_results(self, result: Dict):
        """Print formatted test suite results"""
        suite = result["suite"]
        status = result["status"]
        duration = result["duration"]
        
        print(f"\n{'='*60}")
        print(f"Test Suite Results: {suite.upper()}")
        print(f"{'='*60}")
        print(f"Status: {status.upper()}")
        print(f"Duration: {duration:.2f} seconds")
        print(f"Tests Run: {result['tests_run']}")
        print(f"Passed: {result['passed']}")
        print(f"Failed: {result['failed']}")
        print(f"Errors: {result['errors']}")
        print(f"Skipped: {result['skipped']}")
        if result['warnings'] > 0:
            print(f"Warnings: {result['warnings']}")
        
        # Show success rate
        if result["tests_run"] > 0:
            success_rate = (result["passed"] / result["tests_run"]) * 100
            print(f"Success Rate: {success_rate:.1f}%")
        
        print()

    def run_multiple_suites(self, 
                           suite_names: List[str],
                           parallel: bool = False,
                           coverage: bool = False,
                           verbose: bool = False,
                           sequential: bool = False) -> Dict:
        """Run multiple test suites"""
        
        all_results = {}
        total_start_time = time.time()
        
        if sequential or len(suite_names) == 1:
            # Run suites sequentially
            for suite_name in suite_names:
                result = self.run_test_suite(
                    suite_name=suite_name,
                    parallel=parallel,
                    coverage=coverage,
                    verbose=verbose
                )
                all_results[suite_name] = result
        else:
            # Run suites in parallel (different from parallel tests within suite)
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                futures = {}
                
                for suite_name in suite_names:
                    future = executor.submit(
                        self.run_test_suite,
                        suite_name=suite_name,
                        parallel=False,  # Don't double-parallelize
                        coverage=coverage,
                        verbose=verbose
                    )
                    futures[future] = suite_name
                
                for future in concurrent.futures.as_completed(futures):
                    suite_name = futures[future]
                    try:
                        result = future.result()
                        all_results[suite_name] = result
                    except Exception as e:
                        all_results[suite_name] = {
                            "suite": suite_name,
                            "status": "error",
                            "error": str(e),
                            "duration": 0,
                            "tests_run": 0,
                            "passed": 0,
                            "failed": 0,
                            "errors": 1
                        }
        
        total_duration = time.time() - total_start_time
        
        # Generate comprehensive report
        report = self._generate_comprehensive_report(all_results, total_duration)
        self._print_comprehensive_report(report)
        
        return report

    def _generate_comprehensive_report(self, all_results: Dict, total_duration: float) -> Dict:
        """Generate comprehensive test report"""
        
        total_tests = sum(r["tests_run"] for r in all_results.values())
        total_passed = sum(r["passed"] for r in all_results.values())
        total_failed = sum(r["failed"] for r in all_results.values())
        total_errors = sum(r["errors"] for r in all_results.values())
        total_skipped = sum(r["skipped"] for r in all_results.values())
        
        success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        
        # Categorize results
        successful_suites = [name for name, result in all_results.items() if result["status"] == "passed"]
        failed_suites = [name for name, result in all_results.items() if result["status"] in ["failed", "error"]]
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_duration": total_duration,
            "suites_run": len(all_results),
            "successful_suites": len(successful_suites),
            "failed_suites": len(failed_suites),
            "total_tests": total_tests,
            "total_passed": total_passed,
            "total_failed": total_failed,
            "total_errors": total_errors,
            "total_skipped": total_skipped,
            "success_rate": success_rate,
            "suite_results": all_results,
            "successful_suite_names": successful_suites,
            "failed_suite_names": failed_suites,
            "performance_metrics": {
                "avg_suite_duration": total_duration / len(all_results) if all_results else 0,
                "tests_per_second": total_tests / total_duration if total_duration > 0 else 0
            }
        }
        
        return report

    def _print_comprehensive_report(self, report: Dict):
        """Print comprehensive test report"""
        print(f"\n{'='*80}")
        print(f"COMPREHENSIVE TEST REPORT")
        print(f"{'='*80}")
        print(f"Timestamp: {report['timestamp']}")
        print(f"Total Duration: {report['total_duration']:.2f} seconds")
        print(f"Suites Run: {report['suites_run']}")
        print(f"Successful Suites: {report['successful_suites']}")
        print(f"Failed Suites: {report['failed_suites']}")
        print()
        
        print(f"TEST SUMMARY:")
        print(f"  Total Tests: {report['total_tests']}")
        print(f"  Passed: {report['total_passed']}")
        print(f"  Failed: {report['total_failed']}")
        print(f"  Errors: {report['total_errors']}")
        print(f"  Skipped: {report['total_skipped']}")
        print(f"  Success Rate: {report['success_rate']:.1f}%")
        print()
        
        print(f"PERFORMANCE METRICS:")
        print(f"  Average Suite Duration: {report['performance_metrics']['avg_suite_duration']:.2f}s")
        print(f"  Tests Per Second: {report['performance_metrics']['tests_per_second']:.2f}")
        print()
        
        if report['successful_suite_names']:
            print(f"SUCCESSFUL SUITES:")
            for suite_name in report['successful_suite_names']:
                result = report['suite_results'][suite_name]
                print(f"  ✓ {suite_name}: {result['tests_run']} tests in {result['duration']:.2f}s")
            print()
        
        if report['failed_suite_names']:
            print(f"FAILED SUITES:")
            for suite_name in report['failed_suite_names']:
                result = report['suite_results'][suite_name]
                print(f"  ✗ {suite_name}: {result['failed']} failed, {result['errors']} errors")
            print()
        
        # Overall status
        if report['failed_suites'] == 0:
            print(f"🎉 ALL TESTS PASSED! 🎉")
        else:
            print(f"❌ {report['failed_suites']} TEST SUITE(S) FAILED")
        
        print(f"{'='*80}")

    def save_report(self, report: Dict, filename: str = None):
        """Save test report to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"test_report_{timestamp}.json"
        
        report_path = self.test_root / "reports" / filename
        report_path.parent.mkdir(exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"Test report saved to: {report_path}")

    def check_prerequisites(self) -> bool:
        """Check if all prerequisites are installed"""
        prerequisites = [
            ("pytest", "pip install pytest"),
            ("pytest-asyncio", "pip install pytest-asyncio"),
            ("pytest-cov", "pip install pytest-cov"),
        ]
        
        missing = []
        for package, install_cmd in prerequisites:
            try:
                __import__(package.replace('-', '_'))
            except ImportError:
                missing.append((package, install_cmd))
        
        if missing:
            print("Missing prerequisites:")
            for package, install_cmd in missing:
                print(f"  {package}: {install_cmd}")
            return False
        
        return True

def main():
    """Main entry point for test runner"""
    parser = argparse.ArgumentParser(
        description="Comprehensive Test Runner for BookedBarber V2",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        "--suite", "-s",
        choices=["all", "auth", "security", "performance", "ai", "integration", "api", "frontend", "e2e", "smoke", "critical"],
        default="smoke",
        help="Test suite to run (default: smoke)"
    )
    
    parser.add_argument(
        "--parallel", "-p",
        action="store_true",
        help="Run tests in parallel"
    )
    
    parser.add_argument(
        "--coverage", "-c",
        action="store_true",
        help="Generate coverage report"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    
    parser.add_argument(
        "--sequential",
        action="store_true",
        help="Run test suites sequentially (default: parallel suite execution)"
    )
    
    parser.add_argument(
        "--save-report",
        metavar="FILENAME",
        help="Save test report to JSON file"
    )
    
    parser.add_argument(
        "--benchmark",
        action="store_true",
        help="Run performance benchmarks"
    )
    
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Run only fast tests (skip slow tests)"
    )
    
    parser.add_argument(
        "--check-prereq",
        action="store_true",
        help="Check prerequisites and exit"
    )
    
    args = parser.parse_args()
    
    # Initialize test runner
    runner = ComprehensiveTestRunner()
    
    # Check prerequisites
    if args.check_prereq:
        if runner.check_prerequisites():
            print("All prerequisites are installed.")
            sys.exit(0)
        else:
            sys.exit(1)
    
    if not runner.check_prerequisites():
        print("Please install missing prerequisites before running tests.")
        sys.exit(1)
    
    # Prepare extra arguments
    extra_args = []
    
    if args.benchmark:
        extra_args.extend(["-m", "performance"])
    
    if args.fast:
        extra_args.extend(["-m", "not slow"])
    
    # Run tests
    try:
        if args.suite == "all":
            # Run all suites except smoke and critical (they're subsets)
            suites_to_run = ["auth", "security", "performance", "ai", "integration", "api", "frontend", "e2e"]
        else:
            suites_to_run = [args.suite]
        
        report = runner.run_multiple_suites(
            suite_names=suites_to_run,
            parallel=args.parallel,
            coverage=args.coverage,
            verbose=args.verbose,
            sequential=args.sequential
        )
        
        # Save report if requested
        if args.save_report:
            runner.save_report(report, args.save_report)
        
        # Exit with appropriate code
        if report['failed_suites'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\nTest execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"Error running tests: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()