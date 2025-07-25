"""
Configuration Security Validation Middleware
Validates and enforces security configuration at runtime
"""

import logging
from typing import Dict, List
from datetime import datetime, timedelta
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from config import settings

logger = logging.getLogger(__name__)

class ConfigurationSecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate and enforce security configuration at runtime
    """
    
    def __init__(self, app, check_interval_minutes: int = 60):
        super().__init__(app)
        self.check_interval = timedelta(minutes=check_interval_minutes)
        self.last_check = datetime.now()
        self.security_issues: List[str] = []
        self.configuration_valid = True
        
        # Run initial security validation
        self._validate_configuration()
    
    async def dispatch(self, request: Request, call_next):
        """Validate security configuration before processing requests"""
        
        # Periodic security checks
        if datetime.now() - self.last_check > self.check_interval:
            self._validate_configuration()
            self.last_check = datetime.now()
        
        # Block requests if critical security issues exist
        if not self.configuration_valid and settings.is_production():
            logger.error("Request blocked due to critical security configuration issues")
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Service unavailable due to security configuration issues",
                    "message": "Critical security configuration problems detected"
                }
            )
        
        # Add security headers to response
        response = await call_next(request)
        
        # Add configuration security headers
        response.headers["X-Configuration-Security"] = "validated"
        response.headers["X-Security-Check-Timestamp"] = self.last_check.isoformat()
        
        if self.security_issues:
            response.headers["X-Security-Issues-Count"] = str(len(self.security_issues))
            if not settings.is_production():
                # Only expose details in non-production environments
                response.headers["X-Security-Issues"] = "; ".join(self.security_issues[:3])
        
        return response
    
    def _validate_configuration(self):
        """Validate security configuration"""
        try:
            # Reset state
            self.security_issues = []
            self.configuration_valid = True
            
            # Run comprehensive security validation
            self._validate_environment_security()
            self._validate_authentication_security()
            self._validate_external_service_security()
            self._validate_database_security()
            self._validate_middleware_security()
            
            # Determine if configuration is valid
            critical_issues = [issue for issue in self.security_issues if "CRITICAL" in issue]
            self.configuration_valid = len(critical_issues) == 0
            
            if self.security_issues:
                logger.warning(f"Configuration security validation found {len(self.security_issues)} issues")
                for issue in self.security_issues:
                    if "CRITICAL" in issue:
                        logger.error(f"Critical security issue: {issue}")
                    else:
                        logger.warning(f"Security warning: {issue}")
            else:
                logger.info("Configuration security validation passed")
                
        except Exception as e:
            logger.error(f"Error during configuration security validation: {e}")
            self.security_issues.append(f"CRITICAL: Configuration validation failed - {str(e)}")
            self.configuration_valid = False
    
    def _validate_environment_security(self):
        """Validate environment-specific security settings"""
        # Check DEBUG mode
        if settings.debug and settings.is_production():
            self.security_issues.append("CRITICAL: DEBUG mode enabled in production")
        
        # Check environment variable
        if not settings.environment:
            self.security_issues.append("WARNING: ENVIRONMENT not set")
        
        # Validate CORS origins
        if settings.is_production():
            cors_origins = settings.cors_origins
            if "localhost" in cors_origins:
                self.security_issues.append("CRITICAL: localhost in CORS origins in production")
            if "127.0.0.1" in cors_origins:
                self.security_issues.append("CRITICAL: 127.0.0.1 in CORS origins in production")
    
    def _validate_authentication_security(self):
        """Validate authentication security settings"""
        # Check secret keys
        if not settings.secret_key:
            self.security_issues.append("CRITICAL: SECRET_KEY not set")
        elif len(settings.secret_key) < 32:
            self.security_issues.append("CRITICAL: SECRET_KEY too short (minimum 32 characters)")
        
        if not settings.jwt_secret_key:
            self.security_issues.append("CRITICAL: JWT_SECRET_KEY not set")
        elif len(settings.jwt_secret_key) < 32:
            self.security_issues.append("CRITICAL: JWT_SECRET_KEY too short (minimum 32 characters)")
        
        # Check token expiry settings
        if settings.access_token_expire_minutes > 60:
            self.security_issues.append("WARNING: Access token expiry too long for production")
        
        if settings.refresh_token_expire_days > 30:
            self.security_issues.append("WARNING: Refresh token expiry too long for production")
        
        # Check password hashing settings
        if settings.bcrypt_rounds < 12:
            self.security_issues.append("WARNING: BCrypt rounds should be at least 12")
    
    def _validate_external_service_security(self):
        """Validate external service security settings"""
        # Stripe validation
        if settings.stripe_secret_key:
            if settings.is_production() and not settings.stripe_secret_key.startswith("sk_live_"):
                self.security_issues.append("WARNING: Using Stripe test key in production")
            elif not settings.is_production() and settings.stripe_secret_key.startswith("sk_live_"):
                self.security_issues.append("WARNING: Using Stripe live key in non-production")
        
        # Webhook secret validation
        if settings.stripe_webhook_secret and len(settings.stripe_webhook_secret) < 16:
            self.security_issues.append("WARNING: Stripe webhook secret too short")
        
        # API key validation
        if settings.sendgrid_api_key and not settings.sendgrid_api_key.startswith("SG."):
            self.security_issues.append("WARNING: Invalid SendGrid API key format")
        
        if settings.twilio_account_sid and not settings.twilio_account_sid.startswith("AC"):
            self.security_issues.append("WARNING: Invalid Twilio Account SID format")
    
    def _validate_database_security(self):
        """Validate database security settings"""
        if settings.database_url.startswith("sqlite") and settings.is_production():
            self.security_issues.append("WARNING: SQLite in production - consider PostgreSQL")
        
        # Check for database credentials in URL
        if "password" in settings.database_url and settings.database_url.count("@") > 0:
            # Database has credentials - validate they're not default
            if "password" in settings.database_url or "123456" in settings.database_url:
                self.security_issues.append("CRITICAL: Weak database credentials detected")
    
    def _validate_middleware_security(self):
        """Validate middleware security configuration"""
        # Check if security middleware is properly configured
        # This is a basic check - in production, you'd verify middleware stack
        
        # Check rate limiting settings
        if not hasattr(settings, 'rate_limit_per_minute'):
            self.security_issues.append("WARNING: Rate limiting not configured")
        
        # Check if HTTPS is enforced
        if settings.is_production():
            backend_url = getattr(settings, 'backend_url', '')
            if backend_url and not backend_url.startswith('https://'):
                self.security_issues.append("WARNING: HTTPS not enforced in production")
    
    def get_security_report(self) -> Dict:
        """Get current security configuration report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "environment": settings.environment,
            "configuration_valid": self.configuration_valid,
            "total_issues": len(self.security_issues),
            "critical_issues": len([i for i in self.security_issues if "CRITICAL" in i]),
            "warning_issues": len([i for i in self.security_issues if "WARNING" in i]),
            "issues": self.security_issues if not settings.is_production() else [],
            "last_check": self.last_check.isoformat(),
            "next_check": (self.last_check + self.check_interval).isoformat()
        }

class ProductionConfigurationEnforcer:
    """
    Enforces production-specific configuration requirements
    """
    
    @staticmethod
    def enforce_production_settings():
        """Enforce production-specific settings"""
        if not settings.is_production():
            return
        
        # Force DEBUG to False in production
        if settings.debug:
            logger.warning("Forcing DEBUG=False in production environment")
            settings.debug = False
        
        # Enforce minimum security settings
        if settings.bcrypt_rounds < 12:
            logger.warning("Enforcing minimum BCrypt rounds (12) in production")
            settings.bcrypt_rounds = 12
        
        # Enforce token expiry limits
        if settings.access_token_expire_minutes > 60:
            logger.warning("Limiting access token expiry to 60 minutes in production")
            settings.access_token_expire_minutes = 60
        
        if settings.refresh_token_expire_days > 30:
            logger.warning("Limiting refresh token expiry to 30 days in production")
            settings.refresh_token_expire_days = 30
        
        logger.info("Production configuration enforcement completed")

class ConfigurationSecurityReporter:
    """
    Reports configuration security status and issues
    """
    
    def __init__(self):
        self.middleware = None
    
    def set_middleware(self, middleware: ConfigurationSecurityMiddleware):
        """Set the middleware instance for reporting"""
        self.middleware = middleware
    
    def get_security_status(self) -> Dict:
        """Get current security status"""
        if not self.middleware:
            return {"error": "Configuration security middleware not initialized"}
        
        return self.middleware.get_security_report()
    
    def get_compliance_report(self) -> Dict:
        """Get compliance report for production deployment"""
        status = self.get_security_status()
        
        return {
            "compliance_status": "COMPLIANT" if status.get("configuration_valid", False) else "NON_COMPLIANT",
            "production_ready": status.get("critical_issues", 1) == 0,
            "security_score": max(0, 100 - (status.get("critical_issues", 0) * 25 + status.get("warning_issues", 0) * 5)),
            "timestamp": datetime.now().isoformat(),
            "recommendations": self._generate_recommendations(status)
        }
    
    def _generate_recommendations(self, status: Dict) -> List[str]:
        """Generate security recommendations based on status"""
        recommendations = []
        
        if status.get("critical_issues", 0) > 0:
            recommendations.append("❌ Fix critical security issues before production deployment")
        
        if status.get("warning_issues", 0) > 0:
            recommendations.append("⚠️ Address security warnings for optimal security posture")
        
        if status.get("configuration_valid", False):
            recommendations.append("✅ Configuration security validation passed")
        
        return recommendations

# Global instances
configuration_enforcer = ProductionConfigurationEnforcer()
configuration_reporter = ConfigurationSecurityReporter()

# Initialize enforcement
configuration_enforcer.enforce_production_settings()