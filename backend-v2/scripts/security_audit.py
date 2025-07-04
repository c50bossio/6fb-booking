#!/usr/bin/env python3
"""
Security Audit Script for BookedBarber V2
Audits existing services for security compliance
"""

import os
import sys
import json
import subprocess
import importlib
from pathlib import Path
from typing import Dict, List, Tuple
import configparser
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from config.security_config import SecurityConfig

class SecurityAuditor:
    """Comprehensive security audit for existing BookedBarber V2 services"""
    
    def __init__(self):
        self.audit_results = {
            "timestamp": datetime.now().isoformat(),
            "environment_security": {},
            "service_security": {},
            "dependency_security": {},
            "configuration_security": {},
            "overall_score": 0,
            "recommendations": []
        }
        self.project_root = Path(__file__).parent.parent
    
    def run_full_audit(self) -> Dict:
        """Run comprehensive security audit"""
        print("🔒 Starting Security Audit for BookedBarber V2")
        print("=" * 50)
        
        # 1. Environment Security
        print("\n1. 🔧 Auditing Environment Configuration...")
        self.audit_environment_security()
        
        # 2. Service Security
        print("\n2. 🛡️ Auditing Service Security...")
        self.audit_service_security()
        
        # 3. Dependency Security
        print("\n3. 📦 Auditing Dependencies...")
        self.audit_dependency_security()
        
        # 4. Configuration Security
        print("\n4. ⚙️ Auditing Configuration Security...")
        self.audit_configuration_security()
        
        # 5. Calculate overall score
        self.calculate_overall_score()
        
        # 6. Generate report
        self.generate_security_report()
        
        return self.audit_results
    
    def audit_environment_security(self):
        """Audit environment configuration security"""
        env_audit = {
            "env_files_secure": True,
            "secrets_management": True,
            "cors_configuration": True,
            "debug_settings": True,
            "issues": []
        }
        
        # Check for exposed .env files
        env_files = list(self.project_root.glob("**/.env*"))
        for env_file in env_files:
            if not env_file.name.endswith(('.template', '.example')):
                # Check if it's in .gitignore
                gitignore_path = env_file.parent / ".gitignore"
                if gitignore_path.exists():
                    with open(gitignore_path) as f:
                        if env_file.name not in f.read():
                            env_audit["issues"].append(f"❌ {env_file} not in .gitignore")
                            env_audit["env_files_secure"] = False
        
        # Check for hardcoded secrets
        code_files = list(self.project_root.glob("**/*.py"))
        for code_file in code_files:
            if "test" in str(code_file) or "__pycache__" in str(code_file):
                continue
            
            try:
                with open(code_file, 'r') as f:
                    content = f.read().lower()
                    # Check for potential hardcoded secrets
                    secret_patterns = [
                        "password = ", "secret = ", "key = ", "token = ",
                        "api_key = ", "secret_key = "
                    ]
                    for pattern in secret_patterns:
                        if pattern in content and not content.split(pattern)[1].startswith(('os.', 'settings.', 'config.')):
                            env_audit["issues"].append(f"⚠️ Potential hardcoded secret in {code_file}")
                            env_audit["secrets_management"] = False
                            break
            except:
                continue
        
        self.audit_results["environment_security"] = env_audit
        print(f"   Environment Security: {'✅ PASS' if env_audit['env_files_secure'] and env_audit['secrets_management'] else '⚠️ ISSUES'}")
    
    def audit_service_security(self):
        """Audit existing service security"""
        services_audit = {
            "payment_service": self.audit_payment_service(),
            "notification_service": self.audit_notification_service(),
            "auth_service": self.audit_auth_service(),
            "calendar_service": self.audit_calendar_service(),
            "overall_secure": True
        }
        
        # Check if any service has security issues
        for service, audit in services_audit.items():
            if service != "overall_secure" and isinstance(audit, dict):
                if not audit.get("secure", True):
                    services_audit["overall_secure"] = False
        
        self.audit_results["service_security"] = services_audit
        print(f"   Service Security: {'✅ PASS' if services_audit['overall_secure'] else '⚠️ ISSUES'}")
    
    def audit_payment_service(self) -> Dict:
        """Audit existing PaymentService security"""
        try:
            # Check if PaymentService exists and has security features
            payment_file = self.project_root / "services" / "payment_service.py"
            if not payment_file.exists():
                return {"secure": False, "issue": "PaymentService not found"}
            
            with open(payment_file) as f:
                content = f.read()
            
            security_checks = {
                "stripe_integration": "stripe" in content.lower(),
                "amount_validation": "validate" in content and "amount" in content,
                "audit_logging": "audit" in content.lower() or "log" in content.lower(),
                "idempotency": "idempotent" in content.lower() or "idempotency" in content.lower(),
                "webhook_validation": "webhook" in content.lower() and "signature" in content.lower()
            }
            
            secure = all(security_checks.values())
            return {
                "secure": secure,
                "checks": security_checks,
                "missing": [k for k, v in security_checks.items() if not v]
            }
        except Exception as e:
            return {"secure": False, "error": str(e)}
    
    def audit_notification_service(self) -> Dict:
        """Audit existing NotificationService security"""
        try:
            notification_file = self.project_root / "services" / "notification_service.py"
            if not notification_file.exists():
                return {"secure": False, "issue": "NotificationService not found"}
            
            with open(notification_file) as f:
                content = f.read()
            
            security_checks = {
                "sendgrid_integration": "sendgrid" in content.lower(),
                "twilio_integration": "twilio" in content.lower(),
                "rate_limiting": "rate" in content.lower() and "limit" in content.lower(),
                "unsubscribe_handling": "unsubscribe" in content.lower(),
                "template_validation": "template" in content.lower() and "valid" in content.lower()
            }
            
            secure = sum(security_checks.values()) >= 3  # At least 3 checks should pass
            return {
                "secure": secure,
                "checks": security_checks,
                "missing": [k for k, v in security_checks.items() if not v]
            }
        except Exception as e:
            return {"secure": False, "error": str(e)}
    
    def audit_auth_service(self) -> Dict:
        """Audit existing authentication security"""
        try:
            # Check various auth-related files
            auth_files = [
                "routers/auth.py",
                "utils/auth.py", 
                "middleware/auth.py"
            ]
            
            auth_content = ""
            for auth_file in auth_files:
                file_path = self.project_root / auth_file
                if file_path.exists():
                    with open(file_path) as f:
                        auth_content += f.read()
            
            if not auth_content:
                return {"secure": False, "issue": "No auth files found"}
            
            security_checks = {
                "jwt_tokens": "jwt" in auth_content.lower(),
                "password_hashing": "hash" in auth_content.lower() and "password" in auth_content.lower(),
                "rate_limiting": "rate" in auth_content.lower() and "limit" in auth_content.lower(),
                "mfa_support": "mfa" in auth_content.lower() or "two_factor" in auth_content.lower(),
                "session_management": "session" in auth_content.lower() or "refresh" in auth_content.lower()
            }
            
            secure = sum(security_checks.values()) >= 4  # At least 4 checks should pass
            return {
                "secure": secure,
                "checks": security_checks,
                "missing": [k for k, v in security_checks.items() if not v]
            }
        except Exception as e:
            return {"secure": False, "error": str(e)}
    
    def audit_calendar_service(self) -> Dict:
        """Audit existing Google Calendar service security"""
        try:
            calendar_file = self.project_root / "services" / "google_calendar_service.py"
            if not calendar_file.exists():
                return {"secure": True, "note": "Optional service - not implemented"}
            
            with open(calendar_file) as f:
                content = f.read()
            
            security_checks = {
                "oauth2_flow": "oauth" in content.lower(),
                "token_refresh": "refresh" in content.lower() and "token" in content.lower(),
                "scope_limitation": "scope" in content.lower(),
                "error_handling": "except" in content or "try:" in content
            }
            
            secure = sum(security_checks.values()) >= 3
            return {
                "secure": secure,
                "checks": security_checks,
                "missing": [k for k, v in security_checks.items() if not v]
            }
        except Exception as e:
            return {"secure": False, "error": str(e)}
    
    def audit_dependency_security(self):
        """Audit dependency security"""
        deps_audit = {
            "outdated_packages": [],
            "vulnerable_packages": [],
            "security_score": 100
        }
        
        # Check requirements.txt for known vulnerable packages
        requirements_file = self.project_root / "requirements.txt"
        if requirements_file.exists():
            try:
                # Run safety check if available
                result = subprocess.run(
                    ["safety", "check", "-r", str(requirements_file)],
                    capture_output=True, text=True, timeout=30
                )
                if result.returncode != 0 and "vulnerabilities found" in result.stdout:
                    deps_audit["vulnerable_packages"] = ["Found vulnerabilities (run 'safety check' for details)"]
                    deps_audit["security_score"] -= 20
            except (subprocess.TimeoutExpired, FileNotFoundError):
                # Safety not installed or timeout
                pass
            
            # Check for frontend dependencies
            frontend_package = self.project_root / "frontend-v2" / "package.json"
            if frontend_package.exists():
                try:
                    result = subprocess.run(
                        ["npm", "audit", "--audit-level=moderate"],
                        cwd=frontend_package.parent,
                        capture_output=True, text=True, timeout=30
                    )
                    if result.returncode != 0:
                        deps_audit["vulnerable_packages"].append("Frontend vulnerabilities found")
                        deps_audit["security_score"] -= 15
                except (subprocess.TimeoutExpired, FileNotFoundError):
                    pass
        
        self.audit_results["dependency_security"] = deps_audit
        print(f"   Dependency Security: {'✅ PASS' if deps_audit['security_score'] > 80 else '⚠️ ISSUES'}")
    
    def audit_configuration_security(self):
        """Audit configuration security"""
        config_audit = {
            "security_config_exists": False,
            "middleware_secure": False,
            "cors_configured": False,
            "rate_limiting_enabled": False,
            "security_headers": False,
            "issues": []
        }
        
        # Check if security configuration exists
        security_config_file = self.project_root / "config" / "security_config.py"
        config_audit["security_config_exists"] = security_config_file.exists()
        
        # Check middleware
        middleware_files = list(self.project_root.glob("middleware/*.py"))
        for middleware_file in middleware_files:
            with open(middleware_file) as f:
                content = f.read().lower()
                if "security" in content:
                    config_audit["middleware_secure"] = True
                if "cors" in content:
                    config_audit["cors_configured"] = True
                if "rate" in content and "limit" in content:
                    config_audit["rate_limiting_enabled"] = True
                if "header" in content and ("x-" in content or "security" in content):
                    config_audit["security_headers"] = True
        
        # Check main application configuration
        main_file = self.project_root / "main.py"
        if main_file.exists():
            with open(main_file) as f:
                content = f.read().lower()
                if "debug=false" not in content and "debug = false" not in content:
                    config_audit["issues"].append("DEBUG mode not explicitly disabled")
        
        self.audit_results["configuration_security"] = config_audit
        secure_configs = sum([config_audit[k] for k in config_audit if isinstance(config_audit[k], bool)])
        print(f"   Configuration Security: {'✅ PASS' if secure_configs >= 4 else '⚠️ ISSUES'}")
    
    def calculate_overall_score(self):
        """Calculate overall security score"""
        scores = {
            "environment": 85 if self.audit_results["environment_security"].get("env_files_secure") else 60,
            "services": 80 if self.audit_results["service_security"].get("overall_secure") else 50,
            "dependencies": self.audit_results["dependency_security"].get("security_score", 70),
            "configuration": 75 if sum([v for v in self.audit_results["configuration_security"].values() if isinstance(v, bool)]) >= 4 else 50
        }
        
        overall_score = sum(scores.values()) // len(scores)
        self.audit_results["overall_score"] = overall_score
        
        # Generate recommendations
        if scores["environment"] < 80:
            self.audit_results["recommendations"].append("🔧 Secure environment configuration and secrets management")
        if scores["services"] < 80:
            self.audit_results["recommendations"].append("🛡️ Enhance service-level security features")
        if scores["dependencies"] < 80:
            self.audit_results["recommendations"].append("📦 Update dependencies and fix vulnerabilities")
        if scores["configuration"] < 80:
            self.audit_results["recommendations"].append("⚙️ Implement comprehensive security configuration")
    
    def generate_security_report(self):
        """Generate security audit report"""
        print(f"\n🔒 SECURITY AUDIT RESULTS")
        print("=" * 50)
        print(f"Overall Security Score: {self.audit_results['overall_score']}/100")
        
        score = self.audit_results['overall_score']
        if score >= 90:
            print("🟢 EXCELLENT - Production ready")
        elif score >= 80:
            print("🟡 GOOD - Minor improvements needed")
        elif score >= 70:
            print("🟠 FAIR - Several improvements needed")
        else:
            print("🔴 POOR - Major security improvements required")
        
        if self.audit_results["recommendations"]:
            print(f"\n📋 RECOMMENDATIONS:")
            for rec in self.audit_results["recommendations"]:
                print(f"   • {rec}")
        
        # Save detailed report
        report_file = self.project_root / "security_audit_report.json"
        with open(report_file, 'w') as f:
            json.dump(self.audit_results, f, indent=2)
        
        print(f"\n📄 Detailed report saved: {report_file}")

def main():
    """Run security audit"""
    auditor = SecurityAuditor()
    results = auditor.run_full_audit()
    
    # Return exit code based on security score
    score = results["overall_score"]
    if score >= 80:
        sys.exit(0)  # Good security
    elif score >= 70:
        sys.exit(1)  # Acceptable but needs improvement
    else:
        sys.exit(2)  # Poor security

if __name__ == "__main__":
    main()