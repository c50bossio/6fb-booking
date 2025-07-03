#!/usr/bin/env python3
"""
Environment validation script for BookedBarber V2
Validates current environment setup and ensures production readiness
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import urllib.parse

@dataclass
class EnvCheck:
    name: str
    required: bool
    description: str
    current_value: Optional[str] = None
    is_valid: bool = False
    validation_message: str = ""

class EnvironmentValidator:
    def __init__(self, env_file_path: Optional[str] = None):
        self.env_file_path = env_file_path or ".env"
        self.checks: List[EnvCheck] = []
        self.environment = os.getenv("ENVIRONMENT", "development")
        
    def load_env_file(self) -> Dict[str, str]:
        """Load environment variables from .env file"""
        env_vars = {}
        env_path = Path(self.env_file_path)
        
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
        
        return env_vars
    
    def validate_database_url(self, db_url: str) -> Tuple[bool, str]:
        """Validate database URL format"""
        if not db_url:
            return False, "Database URL is empty"
        
        try:
            parsed = urllib.parse.urlparse(db_url)
            if parsed.scheme in ['sqlite', 'postgresql']:
                if parsed.scheme == 'sqlite':
                    return True, "SQLite database (development)"
                elif parsed.scheme == 'postgresql':
                    if parsed.hostname and parsed.username:
                        return True, "PostgreSQL database (production-ready)"
                    else:
                        return False, "PostgreSQL URL missing hostname or username"
            else:
                return False, f"Unsupported database scheme: {parsed.scheme}"
        except Exception as e:
            return False, f"Invalid database URL format: {str(e)}"
    
    def validate_secret_key(self, secret_key: str) -> Tuple[bool, str]:
        """Validate JWT secret key strength"""
        if not secret_key:
            return False, "Secret key is empty"
        
        if secret_key == "your-secret-key-here-generate-with-openssl-rand-hex-32":
            return False, "Using default/template secret key - SECURITY RISK!"
        
        if len(secret_key) < 32:
            return False, f"Secret key too short ({len(secret_key)} chars), minimum 32 required"
        
        if secret_key.isalnum() and len(set(secret_key)) < 10:
            return False, "Secret key lacks entropy - use a randomly generated key"
        
        return True, f"Strong secret key ({len(secret_key)} characters)"
    
    def validate_stripe_key(self, stripe_key: str, key_type: str) -> Tuple[bool, str]:
        """Validate Stripe API key format"""
        if not stripe_key:
            return False, f"Stripe {key_type} key is empty"
        
        if stripe_key.startswith("sk_test_") and self.environment == "production":
            return False, f"Using test Stripe key in production environment"
        
        if stripe_key.startswith("sk_live_") and self.environment == "development":
            return False, f"Using live Stripe key in development environment"
        
        if stripe_key.startswith(("sk_test_", "pk_test_")):
            return True, f"Test {key_type} key (development)"
        elif stripe_key.startswith(("sk_live_", "pk_live_")):
            return True, f"Live {key_type} key (production)"
        else:
            return False, f"Invalid {key_type} key format"
    
    def validate_url(self, url: str, name: str) -> Tuple[bool, str]:
        """Validate URL format"""
        if not url:
            return False, f"{name} URL is empty"
        
        try:
            parsed = urllib.parse.urlparse(url)
            if parsed.scheme in ['http', 'https'] and parsed.netloc:
                if parsed.scheme == 'http' and self.environment == "production":
                    return False, f"{name} using HTTP in production (should use HTTPS)"
                return True, f"Valid {name} URL ({parsed.scheme}://{parsed.netloc})"
            else:
                return False, f"Invalid {name} URL format"
        except Exception as e:
            return False, f"Invalid {name} URL: {str(e)}"
    
    def run_validation(self) -> Dict:
        """Run comprehensive environment validation"""
        print(f"🔍 Validating environment: {self.environment}")
        print(f"📁 Environment file: {self.env_file_path}")
        
        # Load environment variables
        env_vars = self.load_env_file()
        
        # Define validation checks
        validation_checks = [
            # Core Settings
            ("ENVIRONMENT", True, "Application environment"),
            ("SECRET_KEY", True, "JWT secret key for authentication"),
            ("DATABASE_URL", True, "Database connection string"),
            
            # Security
            ("JWT_ALGORITHM", False, "JWT signing algorithm"),
            ("BCRYPT_ROUNDS", False, "Password hashing rounds"),
            
            # Stripe Payment
            ("STRIPE_SECRET_KEY", True, "Stripe secret key for payments"),
            ("STRIPE_PUBLISHABLE_KEY", True, "Stripe publishable key"),
            ("STRIPE_WEBHOOK_SECRET", False, "Stripe webhook signature verification"),
            
            # API Configuration
            ("ALLOWED_ORIGINS", True, "CORS allowed origins"),
            
            # Optional Services
            ("REDIS_URL", False, "Redis connection for caching"),
            ("SENTRY_DSN", False, "Sentry error tracking"),
            ("SENDGRID_API_KEY", False, "Email service API key"),
            ("TWILIO_ACCOUNT_SID", False, "SMS service configuration"),
        ]
        
        results = []
        
        for var_name, required, description in validation_checks:
            value = env_vars.get(var_name) or os.getenv(var_name)
            check = EnvCheck(var_name, required, description, value)
            
            if required and not value:
                check.validation_message = "REQUIRED: Variable not set"
                check.is_valid = False
            elif not value:
                check.validation_message = "Optional: Not configured"
                check.is_valid = True  # Optional variables can be empty
            else:
                # Run specific validations
                if var_name == "DATABASE_URL":
                    check.is_valid, check.validation_message = self.validate_database_url(value)
                elif var_name == "SECRET_KEY":
                    check.is_valid, check.validation_message = self.validate_secret_key(value)
                elif var_name == "STRIPE_SECRET_KEY":
                    check.is_valid, check.validation_message = self.validate_stripe_key(value, "secret")
                elif var_name == "STRIPE_PUBLISHABLE_KEY":
                    check.is_valid, check.validation_message = self.validate_stripe_key(value, "publishable")
                elif var_name in ["ALLOWED_ORIGINS"]:
                    # Basic URL validation for origins
                    if "localhost" in value and self.environment == "production":
                        check.is_valid = False
                        check.validation_message = "Contains localhost URLs in production"
                    else:
                        check.is_valid = True
                        check.validation_message = f"Configured: {value[:50]}..."
                else:
                    check.is_valid = True
                    check.validation_message = f"Configured: {value[:30]}..." if len(value) > 30 else f"Configured: {value}"
            
            results.append(check)
            self.checks.append(check)
        
        return self.generate_report()
    
    def generate_report(self) -> Dict:
        """Generate validation report"""
        total_checks = len(self.checks)
        required_checks = [c for c in self.checks if c.required]
        optional_checks = [c for c in self.checks if not c.required]
        
        passed_required = [c for c in required_checks if c.is_valid]
        failed_required = [c for c in required_checks if not c.is_valid]
        
        report = {
            "environment": self.environment,
            "env_file": self.env_file_path,
            "summary": {
                "total_checks": total_checks,
                "required_checks": len(required_checks),
                "optional_checks": len(optional_checks),
                "required_passed": len(passed_required),
                "required_failed": len(failed_required),
                "overall_status": "READY" if len(failed_required) == 0 else "NEEDS_ATTENTION"
            },
            "checks": [
                {
                    "name": c.name,
                    "required": c.required,
                    "description": c.description,
                    "status": "PASS" if c.is_valid else "FAIL",
                    "message": c.validation_message,
                    "has_value": c.current_value is not None and c.current_value != ""
                }
                for c in self.checks
            ],
            "recommendations": []
        }
        
        # Add recommendations
        if failed_required:
            report["recommendations"].append("❌ Fix required environment variables before production deployment")
        
        if self.environment == "development":
            report["recommendations"].append("✅ Development environment detected - this is normal for local development")
        
        if any("localhost" in str(c.current_value) for c in self.checks if c.current_value):
            if self.environment == "production":
                report["recommendations"].append("⚠️ Remove localhost URLs for production deployment")
            else:
                report["recommendations"].append("✅ Using localhost URLs for development - this is correct")
        
        return report

def print_report(report: Dict):
    """Print formatted validation report"""
    print("\n" + "="*70)
    print(f"🔍 ENVIRONMENT VALIDATION REPORT - {report['environment'].upper()}")
    print("="*70)
    
    summary = report["summary"]
    status_emoji = "✅" if summary["overall_status"] == "READY" else "⚠️"
    
    print(f"\n{status_emoji} OVERALL STATUS: {summary['overall_status']}")
    print(f"📊 Required Variables: {summary['required_passed']}/{summary['required_checks']} passing")
    print(f"📋 Optional Variables: {summary['optional_checks']} total")
    
    print(f"\n🔧 REQUIRED VARIABLES:")
    for check in report["checks"]:
        if check["required"]:
            status_emoji = "✅" if check["status"] == "PASS" else "❌"
            print(f"   {status_emoji} {check['name']}: {check['message']}")
    
    print(f"\n⚙️ OPTIONAL VARIABLES:")
    for check in report["checks"]:
        if not check["required"]:
            status_emoji = "✅" if check["status"] == "PASS" else "⚠️"
            value_indicator = "✓" if check["has_value"] else "○"
            print(f"   {status_emoji} {check['name']} {value_indicator}: {check['message']}")
    
    if report["recommendations"]:
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in report["recommendations"]:
            print(f"   {rec}")
    
    print("\n" + "="*70)

def main():
    """Main validation function"""
    if len(sys.argv) > 1:
        env_file = sys.argv[1]
    else:
        env_file = ".env"
    
    print(f"🚀 BookedBarber V2 Environment Validator")
    print(f"📅 Environment check for: {env_file}")
    
    validator = EnvironmentValidator(env_file)
    report = validator.run_validation()
    print_report(report)
    
    # Save report to file
    report_file = f"environment_validation_report_{report['environment']}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\n💾 Detailed report saved to: {report_file}")
    
    # Exit with appropriate code
    if report["summary"]["overall_status"] == "READY":
        print("\n🎉 Environment is ready for deployment!")
        sys.exit(0)
    else:
        print("\n⚠️ Environment needs attention before production deployment.")
        sys.exit(1)

if __name__ == "__main__":
    main()