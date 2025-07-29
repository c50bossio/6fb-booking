#!/usr/bin/env python3
"""
Simple Security Audit for Production Readiness
Quick security validation without FastAPI dependencies
"""

import os
import sys
import json
import logging
import secrets
from typing import Dict, List, Any
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleSecurityAuditor:
    """Simple production security auditing"""
    
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "critical_issues": [],
            "warnings": [],
            "recommendations": [],
            "security_score": 0
        }
    
    def run_audit(self) -> Dict[str, Any]:
        """Run simple production security audit"""
        logger.info("🔍 Starting simple production security audit...")
        
        # Check environment variables
        self._check_environment_variables()
        
        # Check file security
        self._check_file_security()
        
        # Check configuration security
        self._check_configuration_security()
        
        # Calculate overall score
        self._calculate_security_score()
        
        return self.report
    
    def _check_environment_variables(self):
        """Check critical environment variables"""
        
        # Critical variables that must be secure
        critical_vars = {
            'JWT_SECRET_KEY': {'min_length': 32, 'description': 'JWT signing key'},
            'SECRET_KEY': {'min_length': 32, 'description': 'Application secret key'},
            'NEXTAUTH_SECRET': {'min_length': 16, 'description': 'NextAuth secret'}
        }
        
        # Service variables that should be configured
        service_vars = {
            'SENDGRID_API_KEY': 'Email service API key',
            'TWILIO_AUTH_TOKEN': 'SMS service token',
            'STRIPE_SECRET_KEY': 'Payment processing key',
            'DATABASE_URL': 'Database connection string'
        }
        
        # Check critical variables
        for var_name, config in critical_vars.items():
            value = os.getenv(var_name, '')
            
            if not value:
                self.report["critical_issues"].append(f"{config['description']} ({var_name}) is not configured")
            elif len(value) < config['min_length']:
                self.report["critical_issues"].append(f"{config['description']} ({var_name}) is too short (minimum {config['min_length']} characters)")
            elif self._is_insecure_value(value):
                self.report["critical_issues"].append(f"{config['description']} ({var_name}) appears to be a development/test value")
        
        # Check service variables
        for var_name, description in service_vars.items():
            value = os.getenv(var_name, '')
            
            if not value:
                self.report["warnings"].append(f"{description} ({var_name}) is not configured")
            elif self._is_placeholder_value(value):
                self.report["warnings"].append(f"{description} ({var_name}) appears to be a placeholder value")
            elif var_name == 'STRIPE_SECRET_KEY' and not value.startswith('sk_live_'):
                if value.startswith('sk_test_'):
                    self.report["warnings"].append(f"Stripe is using test keys - ensure live keys for production")
                else:
                    self.report["warnings"].append(f"Stripe secret key format appears invalid")
    
    def _is_insecure_value(self, value: str) -> bool:
        """Check if value appears to be insecure"""
        insecure_patterns = ['dev-', 'test-', 'placeholder', 'changeme', 'example', '123456']
        return any(pattern in value.lower() for pattern in insecure_patterns)
    
    def _is_placeholder_value(self, value: str) -> bool:
        """Check if value appears to be a placeholder"""
        placeholder_patterns = ['placeholder', 'dev_', 'test_', 'example', 'changeme', 'todo']
        return any(pattern in value.lower() for pattern in placeholder_patterns)
    
    def _check_file_security(self):
        """Check security of important files"""
        
        # Check if sensitive files exist and have proper permissions
        sensitive_files = ['.env', 'private_key.pem']
        
        for file_path in sensitive_files:
            if os.path.exists(file_path):
                stat_info = os.stat(file_path)
                permissions = oct(stat_info.st_mode)[-3:]
                
                # Check if file is readable by others
                if permissions[2] != '0':  # Others have read permission
                    self.report["warnings"].append(f"File {file_path} has overly permissive permissions ({permissions})")
        
        # Check for backup files that might contain secrets
        backup_patterns = ['.env.backup', '.env.bak', 'config.bak']
        for pattern in backup_patterns:
            if os.path.exists(pattern):
                self.report["warnings"].append(f"Backup file {pattern} found - ensure it doesn't contain secrets")
    
    def _check_configuration_security(self):
        """Check security configuration"""
        
        # Check environment settings
        environment = os.getenv('ENVIRONMENT', '').lower()
        if environment != 'production':
            self.report["recommendations"].append(f"Set ENVIRONMENT=production (currently: {environment or 'not set'})")
        
        debug_mode = os.getenv('DEBUG_MODE', '').lower()
        if debug_mode == 'true':
            self.report["critical_issues"].append("DEBUG_MODE is enabled - must be disabled in production")
        
        # Check HTTPS settings
        https_only = os.getenv('HTTPS_ONLY', '').lower()
        if https_only != 'true':
            self.report["recommendations"].append("Enable HTTPS_ONLY=true for production")
        
        # Check if secure cookies are enabled
        secure_cookies = os.getenv('SECURE_COOKIES', 'true').lower()
        if secure_cookies != 'true':
            self.report["warnings"].append("SECURE_COOKIES should be enabled for production")
    
    def _calculate_security_score(self):
        """Calculate overall security score"""
        
        # Start with 100 points
        score = 100
        
        # Deduct points for issues
        score -= len(self.report["critical_issues"]) * 20  # 20 points per critical issue
        score -= len(self.report["warnings"]) * 10         # 10 points per warning
        score -= len(self.report["recommendations"]) * 5   # 5 points per recommendation
        
        # Ensure score doesn't go below 0
        score = max(0, score)
        
        self.report["security_score"] = score
        
        # Add production readiness assessment
        self.report["production_ready"] = (
            len(self.report["critical_issues"]) == 0 and 
            score >= 80
        )
    
    def print_summary(self):
        """Print audit summary"""
        
        print("\n🔒 SECURITY AUDIT SUMMARY")
        print("=" * 40)
        print(f"Security Score: {self.report['security_score']}/100")
        print(f"Production Ready: {'✅ YES' if self.report['production_ready'] else '❌ NO'}")
        
        if self.report["critical_issues"]:
            print(f"\n❌ CRITICAL ISSUES ({len(self.report['critical_issues'])}):")
            for issue in self.report["critical_issues"]:
                print(f"   • {issue}")
        
        if self.report["warnings"]:
            print(f"\n⚠️  WARNINGS ({len(self.report['warnings'])}):")
            for warning in self.report["warnings"]:
                print(f"   • {warning}")
        
        if self.report["recommendations"]:
            print(f"\n💡 RECOMMENDATIONS ({len(self.report['recommendations'])}):")
            for rec in self.report["recommendations"]:
                print(f"   • {rec}")
        
        if self.report["production_ready"]:
            print(f"\n✅ System appears ready for production deployment!")
        else:
            print(f"\n❌ System requires security fixes before production deployment.")

def generate_secure_keys():
    """Generate secure keys for production"""
    
    print("\n🔑 GENERATING SECURE KEYS FOR PRODUCTION")
    print("=" * 50)
    
    keys = {
        'JWT_SECRET_KEY': secrets.token_urlsafe(64),
        'SECRET_KEY': secrets.token_urlsafe(64), 
        'NEXTAUTH_SECRET': secrets.token_urlsafe(32)
    }
    
    print("Add these to your production environment:")
    print()
    for key_name, key_value in keys.items():
        print(f"{key_name}=\"{key_value}\"")
    
    print("\n⚠️  IMPORTANT: Store these securely and never commit to version control!")

def main():
    """Run security audit"""
    
    print("🔒 BookedBarber V2 - Simple Security Audit")
    print("=" * 50)
    
    auditor = SimpleSecurityAuditor()
    report = auditor.run_audit()
    
    # Print summary
    auditor.print_summary()
    
    # Offer to generate secure keys if needed
    if report["critical_issues"]:
        print("\n" + "=" * 50)
        response = input("Generate secure keys for production? (y/n): ")
        if response.lower() in ['y', 'yes']:
            generate_secure_keys()
    
    # Save report
    report_file = f"security_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Full report saved to: {report_file}")
    
    return 0 if report["production_ready"] else 1

if __name__ == "__main__":
    sys.exit(main())