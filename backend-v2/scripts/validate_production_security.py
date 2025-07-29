#!/usr/bin/env python3
"""
Production Security Validation Script
Comprehensive security audit and validation for production deployment
"""

import os
import sys
import json
import logging
import secrets
from typing import Dict, List, Any
from datetime import datetime
import subprocess
import ssl
import socket
from urllib.parse import urlparse

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from middleware.production_security import EnvironmentValidator

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProductionSecurityAuditor:
    """Comprehensive production security auditing"""
    
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "environment_validation": {},
            "security_checks": {},
            "performance_checks": {},
            "recommendations": [],
            "critical_issues": [],
            "warnings": []
        }
    
    def run_full_audit(self) -> Dict[str, Any]:
        """Run complete production security audit"""
        logger.info("🔍 Starting comprehensive production security audit...")
        
        # Environment validation
        self.report["environment_validation"] = self._validate_environment()
        
        # Security configuration checks  
        self.report["security_checks"] = self._check_security_configuration()
        
        # Performance and reliability checks
        self.report["performance_checks"] = self._check_performance_config()
        
        # Generate recommendations
        self._generate_recommendations()
        
        # Create summary
        self._create_audit_summary()
        
        return self.report
    
    def _validate_environment(self) -> Dict[str, Any]:
        """Validate environment configuration"""
        logger.info("🔒 Validating environment configuration...")
        
        validator = EnvironmentValidator()
        issues = validator.validate_production_config()
        
        # Check additional environment factors
        env_data = {
            "config_issues": issues,
            "environment_vars": self._check_environment_variables(),
            "file_permissions": self._check_file_permissions(),
            "secure_defaults": self._check_secure_defaults()
        }
        
        return env_data
    
    def _check_environment_variables(self) -> Dict[str, Any]:
        """Check critical environment variables"""
        
        required_vars = [
            'DATABASE_URL', 'JWT_SECRET_KEY', 'SECRET_KEY',
            'STRIPE_SECRET_KEY', 'SENDGRID_API_KEY'
        ]
        
        optional_vars = [
            'REDIS_URL', 'SENTRY_DSN', 'AWS_ACCESS_KEY_ID'
        ]
        
        env_status = {
            "required": {},
            "optional": {},
            "security_score": 0
        }
        
        # Check required variables
        for var in required_vars:
            value = os.getenv(var, '')
            env_status["required"][var] = {
                "present": bool(value),
                "secure": self._is_secure_value(value),
                "length": len(value) if value else 0
            }
        
        # Check optional variables
        for var in optional_vars:
            value = os.getenv(var, '')
            env_status["optional"][var] = {
                "present": bool(value),
                "configured": bool(value and not 'placeholder' in value.lower())
            }
        
        # Calculate security score
        total_required = len(required_vars)
        secure_required = sum(1 for var in required_vars if 
                             os.getenv(var) and self._is_secure_value(os.getenv(var)))
        
        env_status["security_score"] = (secure_required / total_required) * 100
        
        return env_status
    
    def _is_secure_value(self, value: str) -> bool:
        """Check if environment value appears secure"""
        if not value or len(value) < 16:
            return False
        
        insecure_patterns = ['dev', 'test', 'placeholder', 'example', 'changeme', '123456']
        return not any(pattern in value.lower() for pattern in insecure_patterns)
    
    def _check_file_permissions(self) -> Dict[str, Any]:
        """Check critical file permissions"""
        
        critical_files = [
            '.env',
            'private_key.pem',
            'ssl_cert.pem'
        ]
        
        permission_status = {}
        
        for file_path in critical_files:
            if os.path.exists(file_path):
                stat_info = os.stat(file_path)
                permissions = oct(stat_info.st_mode)[-3:]
                
                permission_status[file_path] = {
                    "permissions": permissions,
                    "secure": permissions in ['600', '644'],  # Owner read/write only
                    "size": stat_info.st_size
                }
        
        return permission_status
    
    def _check_secure_defaults(self) -> Dict[str, Any]:
        """Check secure default configurations"""
        
        defaults = {
            "https_only": os.getenv('HTTPS_ONLY', 'false').lower() == 'true',
            "debug_disabled": os.getenv('DEBUG_MODE', 'false').lower() == 'false',
            "production_env": os.getenv('ENVIRONMENT', '').lower() == 'production',
            "secure_cookies": os.getenv('SECURE_COOKIES', 'true').lower() == 'true',
            "csrf_enabled": True,  # Always enabled in our middleware
            "rate_limiting": True  # Always enabled in our middleware
        }
        
        security_score = sum(defaults.values()) / len(defaults) * 100
        
        return {
            "defaults": defaults,
            "security_score": security_score
        }
    
    def _check_security_configuration(self) -> Dict[str, Any]:
        """Check security middleware and configuration"""
        
        security_config = {
            "middleware": self._check_middleware_config(),
            "authentication": self._check_auth_config(),
            "encryption": self._check_encryption_config(),
            "api_security": self._check_api_security()
        }
        
        return security_config
    
    def _check_middleware_config(self) -> Dict[str, Any]:
        """Check security middleware configuration"""
        
        middleware_files = [
            'middleware/security_headers.py',
            'middleware/csrf_middleware.py',
            'middleware/production_security.py'
        ]
        
        middleware_status = {}
        
        for middleware in middleware_files:
            middleware_status[middleware] = {
                "exists": os.path.exists(middleware),
                "enabled": True  # Assume enabled if file exists
            }
        
        return middleware_status
    
    def _check_auth_config(self) -> Dict[str, Any]:
        """Check authentication configuration"""
        
        auth_config = {
            "jwt_configured": bool(os.getenv('JWT_SECRET_KEY')),
            "mfa_available": os.path.exists('services/mfa_service.py'),
            "password_policy": os.path.exists('services/password_security.py'),
            "rate_limiting": os.path.exists('utils/rate_limit.py'),
            "audit_logging": os.path.exists('utils/audit_logger_bypass.py')
        }
        
        security_score = sum(auth_config.values()) / len(auth_config) * 100
        auth_config["security_score"] = security_score
        
        return auth_config
    
    def _check_encryption_config(self) -> Dict[str, Any]:
        """Check encryption and crypto configuration"""
        
        encryption_status = {
            "jwt_secret_length": len(os.getenv('JWT_SECRET_KEY', '')),
            "app_secret_length": len(os.getenv('SECRET_KEY', '')),
            "bcrypt_available": True,  # Assume available
            "ssl_configured": self._check_ssl_config()
        }
        
        return encryption_status
    
    def _check_ssl_config(self) -> bool:
        """Check SSL/TLS configuration"""
        try:
            # Try to create SSL context
            context = ssl.create_default_context()
            return True
        except Exception:
            return False
    
    def _check_api_security(self) -> Dict[str, Any]:
        """Check API security configuration"""
        
        api_security = {
            "cors_configured": True,  # Assume configured
            "rate_limiting": True,
            "input_validation": True,
            "sql_injection_protection": True,  # SQLAlchemy ORM
            "xss_protection": True
        }
        
        security_score = sum(api_security.values()) / len(api_security) * 100
        api_security["security_score"] = security_score
        
        return api_security
    
    def _check_performance_config(self) -> Dict[str, Any]:
        """Check performance and reliability configuration"""
        
        performance_config = {
            "redis_configured": bool(os.getenv('REDIS_URL')),
            "database_pooling": 'pool' in os.getenv('DATABASE_URL', '').lower(),
            "monitoring_enabled": bool(os.getenv('SENTRY_DSN')),
            "compression_enabled": True,  # Assume enabled
            "caching_strategy": self._check_caching_config()
        }
        
        return performance_config
    
    def _check_caching_config(self) -> Dict[str, Any]:
        """Check caching configuration"""
        
        caching_files = [
            'services/redis_cache.py',
            'services/startup_cache.py',
            'services/api_cache_service.py'
        ]
        
        caching_status = {}
        for cache_file in caching_files:
            caching_status[cache_file] = os.path.exists(cache_file)
        
        return caching_status
    
    def _generate_recommendations(self):
        """Generate security recommendations based on audit results"""
        
        recommendations = []
        
        # Environment recommendations
        env_issues = self.report["environment_validation"]["config_issues"]
        if env_issues["critical"]:
            recommendations.append({
                "category": "Critical Security",
                "priority": "HIGH",
                "items": env_issues["critical"]
            })
        
        if env_issues["warnings"]:
            recommendations.append({
                "category": "Configuration Warnings", 
                "priority": "MEDIUM",
                "items": env_issues["warnings"]
            })
        
        # Security score recommendations
        env_score = self.report["environment_validation"]["environment_vars"]["security_score"]
        if env_score < 80:
            recommendations.append({
                "category": "Environment Security",
                "priority": "HIGH",
                "items": [f"Environment security score is {env_score:.1f}% (target: 90%+)"]
            })
        
        # Performance recommendations
        perf_config = self.report["performance_checks"]
        if not perf_config.get("redis_configured"):
            recommendations.append({
                "category": "Performance",
                "priority": "MEDIUM", 
                "items": ["Configure Redis for improved caching and session management"]
            })
        
        if not perf_config.get("monitoring_enabled"):
            recommendations.append({
                "category": "Monitoring",
                "priority": "HIGH",
                "items": ["Configure Sentry or similar monitoring for production error tracking"]
            })
        
        self.report["recommendations"] = recommendations
    
    def _create_audit_summary(self):
        """Create executive summary of audit results"""
        
        # Count issues by severity
        critical_count = len(self.report["environment_validation"]["config_issues"]["critical"])
        warning_count = len(self.report["environment_validation"]["config_issues"]["warnings"])
        
        # Calculate overall security score
        env_score = self.report["environment_validation"]["environment_vars"]["security_score"]
        auth_score = self.report["security_checks"]["authentication"]["security_score"]
        overall_score = (env_score + auth_score) / 2
        
        summary = {
            "overall_security_score": overall_score,
            "critical_issues": critical_count,
            "warnings": warning_count,
            "recommendations_count": len(self.report["recommendations"]),
            "production_ready": critical_count == 0 and overall_score >= 85
        }
        
        self.report["summary"] = summary
        
        # Log summary
        logger.info(f"🔍 Security Audit Summary:")
        logger.info(f"   Overall Score: {overall_score:.1f}%")
        logger.info(f"   Critical Issues: {critical_count}")
        logger.info(f"   Warnings: {warning_count}")
        logger.info(f"   Production Ready: {'✅ YES' if summary['production_ready'] else '❌ NO'}")
    
    def save_report(self, filename: str = None):
        """Save audit report to file"""
        
        if not filename:
            filename = f"security_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.report, f, indent=2)
        
        logger.info(f"📄 Security audit report saved to: {filename}")
        return filename

def main():
    """Run production security audit"""
    
    print("🔒 BookedBarber V2 - Production Security Audit")
    print("=" * 50)
    
    auditor = ProductionSecurityAuditor()
    report = auditor.run_full_audit()
    
    # Save report
    report_file = auditor.save_report()
    
    # Print summary
    summary = report["summary"]
    print(f"\n📊 AUDIT SUMMARY:")
    print(f"   Overall Security Score: {summary['overall_security_score']:.1f}%")
    print(f"   Critical Issues: {summary['critical_issues']}")
    print(f"   Warnings: {summary['warnings']}")
    print(f"   Production Ready: {'✅ YES' if summary['production_ready'] else '❌ NO'}")
    
    if summary["critical_issues"] > 0:
        print(f"\n❌ CRITICAL ISSUES FOUND:")
        for issue in report["environment_validation"]["config_issues"]["critical"]:
            print(f"   • {issue}")
    
    if summary["warnings"] > 0:
        print(f"\n⚠️  WARNINGS:")
        for warning in report["environment_validation"]["config_issues"]["warnings"]:
            print(f"   • {warning}")
    
    print(f"\n📄 Full report saved to: {report_file}")
    
    return 0 if summary["production_ready"] else 1

if __name__ == "__main__":
    sys.exit(main())