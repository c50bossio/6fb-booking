"""
Staging environment configuration validation.
Ensures all required configuration is present and valid for staging webhook operations.
"""

import os
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ValidationLevel(Enum):
    """Validation severity levels"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationResult:
    """Result of configuration validation"""
    level: ValidationLevel
    component: str
    message: str
    fix_suggestion: Optional[str] = None


class StagingConfigValidator:
    """Validates staging environment configuration"""
    
    def __init__(self):
        self.results: List[ValidationResult] = []
    
    def validate_all(self) -> Dict[str, Any]:
        """Run all validation checks and return summary"""
        
        self.results = []  # Reset results
        
        # Core configuration checks
        self._validate_environment_variables()
        self._validate_database_config()
        self._validate_webhook_secrets()
        self._validate_security_settings()
        self._validate_service_endpoints()
        self._validate_logging_config()
        
        # Summarize results
        errors = [r for r in self.results if r.level == ValidationLevel.ERROR]
        warnings = [r for r in self.results if r.level == ValidationLevel.WARNING]
        info = [r for r in self.results if r.level == ValidationLevel.INFO]
        
        return {
            "status": "failed" if errors else ("warning" if warnings else "passed"),
            "summary": {
                "total_checks": len(self.results),
                "errors": len(errors),
                "warnings": len(warnings),
                "info": len(info)
            },
            "results": [
                {
                    "level": r.level.value,
                    "component": r.component,
                    "message": r.message,
                    "fix_suggestion": r.fix_suggestion
                }
                for r in self.results
            ],
            "is_production_ready": len(errors) == 0
        }
    
    def _validate_environment_variables(self):
        """Validate core environment variables"""
        
        required_vars = [
            "ENVIRONMENT",
            "STAGING_MODE", 
            "PORT"
        ]
        
        for var in required_vars:
            value = os.getenv(var)
            if not value:
                self.results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    component="environment",
                    message=f"Missing required environment variable: {var}",
                    fix_suggestion=f"Set {var} in .env.staging file"
                ))
            else:
                self.results.append(ValidationResult(
                    level=ValidationLevel.INFO,
                    component="environment",
                    message=f"Environment variable {var} is set: {value}"
                ))
        
        # Validate environment-specific values
        environment = os.getenv("ENVIRONMENT")
        if environment and environment != "staging":
            self.results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                component="environment",
                message=f"ENVIRONMENT is '{environment}', expected 'staging'",
                fix_suggestion="Set ENVIRONMENT=staging in .env.staging"
            ))
        
        staging_mode = os.getenv("STAGING_MODE")
        if staging_mode and staging_mode.lower() != "true":
            self.results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                component="environment",
                message="STAGING_MODE is not enabled",
                fix_suggestion="Set STAGING_MODE=true in .env.staging"
            ))
    
    def _validate_database_config(self):
        """Validate database configuration"""
        
        db_url = os.getenv("STAGING_DATABASE_URL")
        if not db_url:
            self.results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                component="database",
                message="Missing STAGING_DATABASE_URL",
                fix_suggestion="Set STAGING_DATABASE_URL in .env.staging (e.g., sqlite:///./staging_6fb_booking.db)"
            ))
        else:
            # Check if it's properly isolated from production
            if "staging" not in db_url.lower():
                self.results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    component="database",
                    message="Database URL doesn't contain 'staging' - ensure it's isolated from production",
                    fix_suggestion="Use a staging-specific database name or path"
                ))
            else:
                self.results.append(ValidationResult(
                    level=ValidationLevel.INFO,
                    component="database",
                    message="Database URL appears to be staging-specific"
                ))
    
    def _validate_webhook_secrets(self):
        """Validate webhook secrets configuration"""
        
        webhook_secrets = {
            "STRIPE_WEBHOOK_SECRET_STAGING": "Stripe webhook secret for staging",
            "TWILIO_WEBHOOK_SECRET_STAGING": "Twilio webhook secret for staging"
        }
        
        for secret_var, description in webhook_secrets.items():
            secret = os.getenv(secret_var)
            if not secret:
                self.results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    component="webhooks",
                    message=f"Missing {description}: {secret_var}",
                    fix_suggestion=f"Set {secret_var} in .env.staging with your staging webhook secret"
                ))
            else:
                # Check if it looks like a staging secret
                if "staging" not in secret.lower() and "test" not in secret.lower():
                    self.results.append(ValidationResult(
                        level=ValidationLevel.WARNING,
                        component="webhooks",
                        message=f"{secret_var} doesn't appear to be a staging secret",
                        fix_suggestion="Ensure you're using test/staging webhook secrets, not production ones"
                    ))
                else:
                    self.results.append(ValidationResult(
                        level=ValidationLevel.INFO,
                        component="webhooks",
                        message=f"{description} is configured"
                    ))
    
    def _validate_security_settings(self):
        """Validate security configuration"""
        
        # Check CORS origins
        cors_origins = os.getenv("CORS_ORIGINS", "[]")
        if "localhost:3001" not in cors_origins:
            self.results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                component="security",
                message="CORS origins may not include staging frontend (localhost:3001)",
                fix_suggestion="Add 'http://localhost:3001' to CORS_ORIGINS"
            ))
        
        # Check allowed hosts
        allowed_hosts = os.getenv("ALLOWED_HOSTS", "[]")
        if "localhost" not in allowed_hosts:
            self.results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                component="security",
                message="ALLOWED_HOSTS may not include localhost",
                fix_suggestion="Add 'localhost' to ALLOWED_HOSTS for staging"
            ))
        
        # Check JWT secret
        jwt_secret = os.getenv("JWT_SECRET_KEY")
        if not jwt_secret:
            self.results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                component="security",
                message="Missing JWT_SECRET_KEY",
                fix_suggestion="Set JWT_SECRET_KEY in .env.staging (use different key than production)"
            ))
        elif len(jwt_secret) < 32:
            self.results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                component="security",
                message="JWT_SECRET_KEY is too short (should be at least 32 characters)",
                fix_suggestion="Generate a longer JWT secret for better security"
            ))
    
    def _validate_service_endpoints(self):
        """Validate external service configuration"""
        
        services = {
            "STRIPE_SECRET_KEY": "Stripe API key",
            "SENDGRID_API_KEY": "SendGrid API key",
            "TWILIO_ACCOUNT_SID": "Twilio account SID"
        }
        
        for service_var, description in services.items():
            key = os.getenv(service_var)
            if not key:
                self.results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    component="services",
                    message=f"Missing {description}: {service_var}",
                    fix_suggestion=f"Set {service_var} in .env.staging with your staging/test API key"
                ))
            else:
                # Check if it looks like a test key
                if "test" not in key.lower() and "staging" not in key.lower():
                    self.results.append(ValidationResult(
                        level=ValidationLevel.WARNING,
                        component="services",
                        message=f"{service_var} doesn't appear to be a test/staging key",
                        fix_suggestion="Ensure you're using test/staging API keys, not production ones"
                    ))
    
    def _validate_logging_config(self):
        """Validate logging configuration"""
        
        log_level = os.getenv("LOG_LEVEL", "INFO")
        if log_level.upper() not in ["DEBUG", "INFO", "WARNING", "ERROR"]:
            self.results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                component="logging",
                message=f"Invalid LOG_LEVEL: {log_level}",
                fix_suggestion="Set LOG_LEVEL to DEBUG, INFO, WARNING, or ERROR"
            ))
        
        # Staging should have debug logging enabled
        if log_level.upper() != "DEBUG":
            self.results.append(ValidationResult(
                level=ValidationLevel.INFO,
                component="logging",
                message="Consider setting LOG_LEVEL=DEBUG for staging environment",
                fix_suggestion="Set LOG_LEVEL=DEBUG in .env.staging for detailed debugging"
            ))


def validate_staging_config() -> Dict[str, Any]:
    """Convenience function to validate staging configuration"""
    validator = StagingConfigValidator()
    return validator.validate_all()


def check_staging_readiness() -> bool:
    """Quick check if staging environment is ready for use"""
    result = validate_staging_config()
    return result["status"] != "failed"


if __name__ == "__main__":
    # CLI usage for testing
    result = validate_staging_config()
    
    print(f"Staging Configuration Validation: {result['status'].upper()}")
    print(f"Summary: {result['summary']}")
    
    for check in result['results']:
        icon = "❌" if check['level'] == 'error' else "⚠️" if check['level'] == 'warning' else "ℹ️"
        print(f"{icon} [{check['component']}] {check['message']}")
        if check['fix_suggestion']:
            print(f"   Fix: {check['fix_suggestion']}")
    
    if not result['is_production_ready']:
        print("\n⚠️ Staging environment has configuration issues that should be resolved.")
        exit(1)
    else:
        print("\n✅ Staging environment configuration looks good!")