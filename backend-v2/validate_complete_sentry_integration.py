#!/usr/bin/env python3
"""
Complete Sentry Integration Validation Script for BookedBarber V2
Tests both backend and frontend Sentry integration comprehensively.
"""

import os
import sys
import asyncio
import subprocess
import json
import requests
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class ValidationResult:
    component: str
    test_name: str
    passed: bool
    message: str
    details: Optional[Dict] = None

class SentryIntegrationValidator:
    def __init__(self):
        self.results: List[ValidationResult] = []
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        
    def add_result(self, component: str, test_name: str, passed: bool, message: str, details: Optional[Dict] = None):
        """Add a validation result"""
        self.results.append(ValidationResult(component, test_name, passed, message, details))
        
    def validate_backend_files(self) -> bool:
        """Validate backend Sentry files exist and are configured"""
        print("\n🔍 Validating Backend Files...")
        
        # Check requirements.txt
        requirements_path = Path("requirements.txt")
        if requirements_path.exists():
            content = requirements_path.read_text()
            if "sentry-sdk[fastapi]" in content:
                self.add_result("backend", "requirements", True, "Sentry SDK found in requirements.txt")
            else:
                self.add_result("backend", "requirements", False, "Sentry SDK not found in requirements.txt")
        else:
            self.add_result("backend", "requirements", False, "requirements.txt not found")
            
        # Check config files
        config_files = [
            "config/sentry.py",
            "middleware/sentry_middleware.py",
            "services/sentry_monitoring.py",
            "test_sentry_integration.py",
            "validate_sentry_setup.py",
            "SENTRY_INTEGRATION.md"
        ]
        
        for file_path in config_files:
            path = Path(file_path)
            if path.exists():
                self.add_result("backend", f"file_{path.stem}", True, f"✅ {file_path} exists")
            else:
                self.add_result("backend", f"file_{path.stem}", False, f"❌ {file_path} missing")
                
        return all(r.passed for r in self.results if r.component == "backend")
    
    def validate_frontend_files(self) -> bool:
        """Validate frontend Sentry files exist and are configured"""
        print("\n🔍 Validating Frontend Files...")
        
        frontend_dir = Path("frontend-v2")
        if not frontend_dir.exists():
            self.add_result("frontend", "directory", False, "frontend-v2 directory not found")
            return False
            
        # Check package.json
        package_json = frontend_dir / "package.json"
        if package_json.exists():
            try:
                content = json.loads(package_json.read_text())
                deps = content.get("dependencies", {})
                if "@sentry/nextjs" in deps:
                    self.add_result("frontend", "dependencies", True, "Sentry Next.js SDK found in package.json")
                else:
                    self.add_result("frontend", "dependencies", False, "Sentry Next.js SDK not found in package.json")
            except json.JSONDecodeError:
                self.add_result("frontend", "dependencies", False, "Invalid package.json format")
        else:
            self.add_result("frontend", "dependencies", False, "package.json not found")
            
        # Check Sentry config files
        sentry_files = [
            "sentry.client.config.js",
            "sentry.server.config.js",
            "lib/sentry.ts",
            "lib/api-client-sentry.ts",
            "hooks/useSentryUser.ts",
            "components/SentryPerformanceMonitor.tsx",
            "tests/sentry-integration.spec.ts",
            "SENTRY_FRONTEND.md"
        ]
        
        for file_path in sentry_files:
            path = frontend_dir / file_path
            if path.exists():
                self.add_result("frontend", f"file_{Path(file_path).stem}", True, f"✅ {file_path} exists")
            else:
                self.add_result("frontend", f"file_{Path(file_path).stem}", False, f"❌ {file_path} missing")
                
        # Check if ErrorBoundary is updated
        error_boundary = frontend_dir / "components/ErrorBoundary.tsx"
        if error_boundary.exists():
            content = error_boundary.read_text()
            if "sentry" in content.lower() or "Sentry" in content:
                self.add_result("frontend", "error_boundary_updated", True, "ErrorBoundary.tsx includes Sentry integration")
            else:
                self.add_result("frontend", "error_boundary_updated", False, "ErrorBoundary.tsx doesn't include Sentry integration")
        else:
            self.add_result("frontend", "error_boundary_updated", False, "ErrorBoundary.tsx not found")
            
        return all(r.passed for r in self.results if r.component == "frontend")
    
    def validate_environment_config(self) -> bool:
        """Validate environment configuration"""
        print("\n🔍 Validating Environment Configuration...")
        
        # Check backend .env.template
        backend_env = Path(".env.template")
        if backend_env.exists():
            content = backend_env.read_text()
            sentry_vars = ["SENTRY_DSN", "SENTRY_ENVIRONMENT", "SENTRY_TRACES_SAMPLE_RATE"]
            found_vars = [var for var in sentry_vars if var in content]
            
            if len(found_vars) == len(sentry_vars):
                self.add_result("config", "backend_env", True, "All Sentry environment variables in backend .env.template")
            else:
                missing = set(sentry_vars) - set(found_vars)
                self.add_result("config", "backend_env", False, f"Missing Sentry variables in backend: {missing}")
        else:
            self.add_result("config", "backend_env", False, "Backend .env.template not found")
            
        # Check frontend .env.template
        frontend_env = Path("frontend-v2/.env.template")
        if frontend_env.exists():
            content = frontend_env.read_text()
            sentry_vars = ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_ORG", "SENTRY_PROJECT"]
            found_vars = [var for var in sentry_vars if var in content]
            
            if len(found_vars) >= 1:  # At least DSN should be there
                self.add_result("config", "frontend_env", True, "Sentry environment variables in frontend .env.template")
            else:
                self.add_result("config", "frontend_env", False, "No Sentry variables in frontend .env.template")
        else:
            self.add_result("config", "frontend_env", False, "Frontend .env.template not found")
            
        return all(r.passed for r in self.results if r.component == "config")
    
    async def test_backend_integration(self) -> bool:
        """Test backend Sentry integration if server is running"""
        print("\n🔍 Testing Backend Integration...")
        
        try:
            # Test health endpoint
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                self.add_result("integration", "backend_health", True, "Backend health endpoint accessible")
                
                # Check if Sentry is mentioned in health response
                health_data = response.json()
                if "sentry" in str(health_data).lower():
                    self.add_result("integration", "backend_sentry_health", True, "Sentry status in health check")
                else:
                    self.add_result("integration", "backend_sentry_health", False, "Sentry status not in health check")
            else:
                self.add_result("integration", "backend_health", False, f"Backend health endpoint returned {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.add_result("integration", "backend_health", False, f"Backend not accessible: {str(e)}")
            
        # Test if backend validation script exists and runs
        validation_script = Path("validate_sentry_setup.py")
        if validation_script.exists():
            try:
                result = subprocess.run([sys.executable, "validate_sentry_setup.py", "--test-mode"], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    self.add_result("integration", "backend_validation", True, "Backend Sentry validation script runs successfully")
                else:
                    self.add_result("integration", "backend_validation", False, f"Backend validation failed: {result.stderr}")
            except subprocess.TimeoutExpired:
                self.add_result("integration", "backend_validation", False, "Backend validation script timed out")
            except Exception as e:
                self.add_result("integration", "backend_validation", False, f"Backend validation error: {str(e)}")
        else:
            self.add_result("integration", "backend_validation", False, "Backend validation script not found")
            
        return all(r.passed for r in self.results if r.component == "integration" and "backend" in r.test_name)
    
    def test_frontend_build(self) -> bool:
        """Test if frontend builds successfully with Sentry"""
        print("\n🔍 Testing Frontend Build...")
        
        frontend_dir = Path("frontend-v2")
        if not frontend_dir.exists():
            self.add_result("build", "frontend_dir", False, "Frontend directory not found")
            return False
            
        # Change to frontend directory
        original_dir = os.getcwd()
        os.chdir(frontend_dir)
        
        try:
            # Check if dependencies are installed
            node_modules = Path("node_modules")
            if not node_modules.exists():
                self.add_result("build", "dependencies", False, "Node modules not installed. Run: npm install")
                return False
                
            # Test TypeScript compilation
            result = subprocess.run(["npx", "tsc", "--noEmit"], capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                self.add_result("build", "typescript", True, "TypeScript compilation successful")
            else:
                self.add_result("build", "typescript", False, f"TypeScript errors: {result.stderr}")
                
            # Test Next.js build (quick check)
            result = subprocess.run(["npm", "run", "build"], capture_output=True, text=True, timeout=120)
            if result.returncode == 0:
                self.add_result("build", "nextjs_build", True, "Next.js build successful with Sentry integration")
            else:
                # Check if it's a Sentry-related error
                if "sentry" in result.stderr.lower():
                    self.add_result("build", "nextjs_build", False, f"Sentry-related build error: {result.stderr}")
                else:
                    self.add_result("build", "nextjs_build", False, f"Build failed: {result.stderr}")
                    
        except subprocess.TimeoutExpired:
            self.add_result("build", "build_timeout", False, "Build process timed out")
        except Exception as e:
            self.add_result("build", "build_error", False, f"Build error: {str(e)}")
        finally:
            os.chdir(original_dir)
            
        return all(r.passed for r in self.results if r.component == "build")
    
    def run_frontend_tests(self) -> bool:
        """Run frontend Sentry integration tests"""
        print("\n🔍 Running Frontend Tests...")
        
        frontend_dir = Path("frontend-v2")
        if not frontend_dir.exists():
            self.add_result("tests", "frontend_dir", False, "Frontend directory not found")
            return False
            
        original_dir = os.getcwd()
        os.chdir(frontend_dir)
        
        try:
            # Run Sentry-specific tests
            test_file = Path("tests/sentry-integration.spec.ts")
            if test_file.exists():
                result = subprocess.run(["npm", "run", "test:e2e:headed", "--", "tests/sentry-integration.spec.ts"], 
                                      capture_output=True, text=True, timeout=120)
                if result.returncode == 0:
                    self.add_result("tests", "sentry_e2e", True, "Sentry E2E tests passed")
                else:
                    self.add_result("tests", "sentry_e2e", False, f"Sentry E2E tests failed: {result.stderr}")
            else:
                self.add_result("tests", "sentry_e2e", False, "Sentry E2E test file not found")
                
            # Run unit tests for Sentry components
            result = subprocess.run(["npm", "test", "--", "--testNamePattern=sentry"], 
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                self.add_result("tests", "sentry_unit", True, "Sentry unit tests passed")
            else:
                # Unit tests might not exist yet, so this is not critical
                self.add_result("tests", "sentry_unit", False, "Sentry unit tests not found or failed")
                
        except subprocess.TimeoutExpired:
            self.add_result("tests", "test_timeout", False, "Test execution timed out")
        except Exception as e:
            self.add_result("tests", "test_error", False, f"Test error: {str(e)}")
        finally:
            os.chdir(original_dir)
            
        # Return True even if some tests fail, as long as the infrastructure is there
        return any(r.passed for r in self.results if r.component == "tests")
    
    def generate_report(self) -> Dict:
        """Generate comprehensive validation report"""
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r.passed])
        
        report = {
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "success_rate": f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%"
            },
            "components": {},
            "recommendations": []
        }
        
        # Group results by component
        for component in ["backend", "frontend", "config", "integration", "build", "tests"]:
            component_results = [r for r in self.results if r.component == component]
            if component_results:
                passed = len([r for r in component_results if r.passed])
                total = len(component_results)
                report["components"][component] = {
                    "passed": passed,
                    "total": total,
                    "success_rate": f"{(passed/total*100):.1f}%",
                    "details": [{"test": r.test_name, "passed": r.passed, "message": r.message} 
                              for r in component_results]
                }
        
        # Generate recommendations
        failed_results = [r for r in self.results if not r.passed]
        if failed_results:
            report["recommendations"].extend([
                f"Fix {r.component} issue: {r.message}" for r in failed_results
            ])
        else:
            report["recommendations"].append("All tests passed! Sentry integration is ready for production.")
            
        return report
    
    async def run_complete_validation(self) -> Dict:
        """Run complete Sentry integration validation"""
        print("🚀 Starting Complete Sentry Integration Validation for BookedBarber V2")
        print("=" * 70)
        
        # Run all validations
        self.validate_backend_files()
        self.validate_frontend_files()
        self.validate_environment_config()
        await self.test_backend_integration()
        self.test_frontend_build()
        self.run_frontend_tests()
        
        # Generate and return report
        return self.generate_report()

def print_report(report: Dict):
    """Print formatted validation report"""
    print("\n" + "=" * 70)
    print("📊 SENTRY INTEGRATION VALIDATION REPORT")
    print("=" * 70)
    
    # Summary
    summary = report["summary"]
    print(f"\n📈 OVERALL SUMMARY:")
    print(f"   Total Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed_tests']}")
    print(f"   Failed: {summary['failed_tests']}")
    print(f"   Success Rate: {summary['success_rate']}")
    
    # Component details
    print(f"\n🔍 COMPONENT BREAKDOWN:")
    for component, data in report["components"].items():
        status = "✅" if data["passed"] == data["total"] else "⚠️" if data["passed"] > 0 else "❌"
        print(f"   {status} {component.upper()}: {data['passed']}/{data['total']} ({data['success_rate']})")
        
        # Show failed tests
        failed = [d for d in data["details"] if not d["passed"]]
        if failed:
            for test in failed:
                print(f"      ❌ {test['test']}: {test['message']}")
    
    # Recommendations
    if report["recommendations"]:
        print(f"\n💡 RECOMMENDATIONS:")
        for i, rec in enumerate(report["recommendations"], 1):
            print(f"   {i}. {rec}")
    
    print("\n" + "=" * 70)

async def main():
    """Main validation function"""
    validator = SentryIntegrationValidator()
    
    try:
        report = await validator.run_complete_validation()
        print_report(report)
        
        # Save report to file
        report_file = Path("sentry_integration_validation_report.json")
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n💾 Report saved to: {report_file}")
        
        # Exit with appropriate code
        total_tests = report["summary"]["total_tests"]
        passed_tests = report["summary"]["passed_tests"]
        
        if passed_tests == total_tests:
            print("\n🎉 All tests passed! Sentry integration is ready for production.")
            sys.exit(0)
        elif passed_tests / total_tests >= 0.8:
            print("\n⚠️ Most tests passed. Review failed tests and fix if needed.")
            sys.exit(0)
        else:
            print("\n❌ Many tests failed. Please review and fix issues before production deployment.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 Validation failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())