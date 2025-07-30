#!/usr/bin/env python3
"""
Security Fixes Verification Script for BookedBarber V2

This script verifies that all critical security fixes have been properly implemented:
1. No hardcoded API keys in codebase
2. Build security checks are enabled
3. Image security is configured
4. CSRF protection is active
5. Environment variable validation is working
"""

import os
import sys
import re
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Any

# Add the parent directory to Python path to import our modules
sys.path.append(str(Path(__file__).parent.parent))

from utils.env_validator import EnvValidator

class SecurityVerifier:
    """Verify that critical security fixes are properly implemented"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.frontend_path = self.base_path / "frontend-v2"
        self.results = []
        
    def verify_all(self) -> Dict[str, Any]:
        """Run all security verification checks"""
        print("🔒 BookedBarber V2 Security Fixes Verification")
        print("=" * 60)
        
        checks = [
            self.check_no_hardcoded_keys,
            self.check_build_security_enabled,
            self.check_image_security_config,
            self.check_csrf_protection_enabled,
            self.check_environment_validation,
            self.check_csp_headers_configured,
        ]
        
        for check in checks:
            try:
                result = check()
                self.results.append(result)
                self._print_check_result(result)
            except Exception as e:
                error_result = {
                    "check": check.__name__,
                    "status": "error",
                    "message": f"Check failed with error: {str(e)}",
                    "details": []
                }
                self.results.append(error_result)
                self._print_check_result(error_result)
        
        return self._generate_summary()
    
    def check_no_hardcoded_keys(self) -> Dict[str, Any]:
        """Verify no hardcoded API keys exist in the codebase"""
        check_name = "No Hardcoded API Keys"
        
        # Patterns to search for
        key_patterns = [
            r'sk-[a-zA-Z0-9-]{20,}',  # OpenAI/Anthropic keys
            r'AIza[a-zA-Z0-9_-]{35}',  # Google API keys
            r'gho_[a-zA-Z0-9]{36}',   # GitHub tokens
            r'xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}',  # Slack tokens
        ]
        
        issues = []
        
        # Search in Python files
        for pattern in key_patterns:
            for py_file in self.base_path.rglob("*.py"):
                if any(exclude in str(py_file) for exclude in [".git", "__pycache__", "venv", "env", "site-packages"]):
                    continue
                    
                try:
                    content = py_file.read_text(encoding='utf-8')
                    matches = re.findall(pattern, content)
                    if matches:
                        issues.append(f"Found potential API key in {py_file}: {matches[0][:10]}...")
                except Exception:
                    continue
        
        # Search in TypeScript/JavaScript files
        for pattern in key_patterns:
            for ts_file in self.frontend_path.rglob("*.ts"):
                if any(exclude in str(ts_file) for exclude in [".git", "node_modules", ".next"]):
                    continue
                    
                try:
                    content = ts_file.read_text(encoding='utf-8')
                    matches = re.findall(pattern, content)
                    if matches:
                        issues.append(f"Found potential API key in {ts_file}: {matches[0][:10]}...")
                except Exception:
                    continue
        
        return {
            "check": check_name,
            "status": "pass" if not issues else "fail",
            "message": "No hardcoded API keys found" if not issues else f"Found {len(issues)} potential hardcoded keys",
            "details": issues
        }
    
    def check_build_security_enabled(self) -> Dict[str, Any]:
        """Verify that TypeScript and ESLint checks are enabled in Next.js config"""
        check_name = "Build Security Checks Enabled"
        
        next_config_path = self.frontend_path / "next.config.js"
        
        if not next_config_path.exists():
            return {
                "check": check_name,
                "status": "fail",
                "message": "next.config.js not found",
                "details": []
            }
        
        content = next_config_path.read_text()
        
        issues = []
        
        # Check TypeScript configuration
        if "ignoreBuildErrors: true" in content:
            issues.append("TypeScript build errors are being ignored")
        
        # Check ESLint configuration
        if "ignoreDuringBuilds: true" in content:
            issues.append("ESLint checks during builds are being ignored")
        
        return {
            "check": check_name,
            "status": "pass" if not issues else "fail",
            "message": "Build security checks are enabled" if not issues else "Build security checks are disabled",
            "details": issues
        }
    
    def check_image_security_config(self) -> Dict[str, Any]:
        """Verify that image domain restrictions are properly configured"""
        check_name = "Image Security Configuration"
        
        next_config_path = self.frontend_path / "next.config.js"
        
        if not next_config_path.exists():
            return {
                "check": check_name,
                "status": "fail",
                "message": "next.config.js not found",
                "details": []
            }
        
        content = next_config_path.read_text()
        
        issues = []
        details = []
        
        # Check for wildcard hostname (insecure)
        if 'hostname: "**"' in content:
            issues.append("Wildcard hostname pattern found (security risk)")
        
        # Check for proper image security settings
        if "dangerouslyAllowSVG: false" in content:
            details.append("✅ SVG uploads are properly restricted")
        else:
            issues.append("SVG security restriction not configured")
        
        if "contentSecurityPolicy" in content:
            details.append("✅ Image CSP is configured")
        else:
            issues.append("Image Content Security Policy not configured")
        
        return {
            "check": check_name,
            "status": "pass" if not issues else "fail",
            "message": "Image security is properly configured" if not issues else f"Found {len(issues)} image security issues",
            "details": issues + details
        }
    
    def check_csrf_protection_enabled(self) -> Dict[str, Any]:
        """Verify that CSRF protection middleware is enabled"""
        check_name = "CSRF Protection Enabled"
        
        main_py_path = self.base_path / "main.py"
        
        if not main_py_path.exists():
            return {
                "check": check_name,
                "status": "fail",
                "message": "main.py not found",
                "details": []
            }
        
        content = main_py_path.read_text()
        
        issues = []
        details = []
        
        # Check if CSRF middleware is commented out
        if "# app.add_middleware(CSRFMiddleware)" in content:
            issues.append("CSRF middleware is commented out (disabled)")
        elif "app.add_middleware(CSRFMiddleware)" in content:
            details.append("✅ CSRF middleware is enabled")
        else:
            issues.append("CSRF middleware not found in configuration")
        
        # Check if CSRF middleware is imported
        if "from middleware.csrf_middleware import CSRFMiddleware" in content:
            details.append("✅ CSRF middleware is properly imported")
        else:
            issues.append("CSRF middleware import not found")
        
        return {
            "check": check_name,
            "status": "pass" if not issues else "fail", 
            "message": "CSRF protection is enabled" if not issues else f"Found {len(issues)} CSRF configuration issues",
            "details": issues + details
        }
    
    def check_environment_validation(self) -> Dict[str, Any]:
        """Verify that environment variable validation is working"""
        check_name = "Environment Variable Validation"
        
        try:
            validator = EnvValidator()
            results = validator.validate_all()
            
            details = [
                f"Security score: {results['score']:.1f}/100",
                f"Critical failures: {len(results['critical_failures'])}",
                f"Required missing: {len(results['required_failures'])}",
                f"Warnings: {len(results['warnings'])}"
            ]
            
            # Environment validation is working if it can run and return results
            return {
                "check": check_name,
                "status": "pass",
                "message": "Environment validation system is working",
                "details": details
            }
            
        except Exception as e:
            return {
                "check": check_name,
                "status": "fail",
                "message": f"Environment validation failed: {str(e)}",
                "details": []
            }
    
    def check_csp_headers_configured(self) -> Dict[str, Any]:
        """Verify that Content Security Policy headers are configured"""
        check_name = "CSP Headers Configuration"
        
        next_config_path = self.frontend_path / "next.config.js"
        
        if not next_config_path.exists():
            return {
                "check": check_name,
                "status": "fail",
                "message": "next.config.js not found",
                "details": []
            }
        
        content = next_config_path.read_text()
        
        issues = []
        details = []
        
        # Check for CSP headers function
        if "async headers()" in content:
            details.append("✅ Headers function is configured")
        else:
            issues.append("Headers function not found")
        
        # Check for specific security headers
        security_headers = [
            "Content-Security-Policy",
            "X-Frame-Options",
            "X-Content-Type-Options", 
            "Referrer-Policy"
        ]
        
        for header in security_headers:
            if header in content:
                details.append(f"✅ {header} header configured")
            else:
                issues.append(f"{header} header not configured")
        
        return {
            "check": check_name,
            "status": "pass" if not issues else "fail",
            "message": "CSP and security headers are configured" if not issues else f"Found {len(issues)} missing security headers",
            "details": issues + details
        }
    
    def _print_check_result(self, result: Dict[str, Any]):
        """Print the result of a security check"""
        status_emoji = "✅" if result["status"] == "pass" else "❌" if result["status"] == "fail" else "⚠️"
        print(f"\n{status_emoji} {result['check']}: {result['message']}")
        
        if result["details"]:
            for detail in result["details"]:
                print(f"   {detail}")
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate a summary of all verification results"""
        total_checks = len(self.results)
        passed_checks = len([r for r in self.results if r["status"] == "pass"])
        failed_checks = len([r for r in self.results if r["status"] == "fail"])
        error_checks = len([r for r in self.results if r["status"] == "error"])
        
        all_passed = failed_checks == 0 and error_checks == 0
        
        summary = {
            "total_checks": total_checks,
            "passed": passed_checks,
            "failed": failed_checks,
            "errors": error_checks,
            "all_passed": all_passed,
            "results": self.results
        }
        
        print("\n" + "=" * 60)
        print("🔒 SECURITY VERIFICATION SUMMARY")
        print("=" * 60)
        
        if all_passed:
            print("✅ ALL SECURITY FIXES VERIFIED SUCCESSFULLY!")
        else:
            print("❌ SOME SECURITY ISSUES FOUND")
        
        print(f"\nTotal checks: {total_checks}")
        print(f"✅ Passed: {passed_checks}")
        print(f"❌ Failed: {failed_checks}")
        print(f"⚠️  Errors: {error_checks}")
        
        if not all_passed:
            print("\n⚠️  Please address the failed checks before deploying to production.")
        
        return summary


def main():
    """Main entry point"""
    verifier = SecurityVerifier()
    summary = verifier.verify_all()
    
    # Exit with appropriate code
    if summary["all_passed"]:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()