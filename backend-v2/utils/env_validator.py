#!/usr/bin/env python3
"""
Environment Variable Validation Script for BookedBarber V2

This script validates that all required environment variables are set
and provides security recommendations for missing or weak configurations.
"""

import os
import sys
import re
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


class ValidationLevel(Enum):
    CRITICAL = "critical"
    REQUIRED = "required"
    RECOMMENDED = "recommended"
    OPTIONAL = "optional"


@dataclass
class EnvVariable:
    name: str
    level: ValidationLevel
    description: str
    format_validation: Optional[str] = None
    min_length: Optional[int] = None
    forbidden_values: List[str] = None
    example: Optional[str] = None

    def __post_init__(self):
        if self.forbidden_values is None:
            self.forbidden_values = []


class EnvValidator:
    """Environment variable validator for BookedBarber V2"""
    
    def __init__(self):
        self.env_variables = [
            # Critical Security Variables
            EnvVariable(
                name="SECRET_KEY",
                level=ValidationLevel.CRITICAL,
                description="Application secret key for session security",
                min_length=32,
                forbidden_values=["your-secret-key-here", "test-secret-key", ""],
                example="your-64-character-random-string-here"
            ),
            EnvVariable(
                name="JWT_SECRET_KEY",
                level=ValidationLevel.CRITICAL,
                description="JWT token signing secret",
                min_length=32,
                forbidden_values=["your-jwt-secret-here", "test-jwt-secret", ""],
                example="your-64-character-random-jwt-secret-here"
            ),
            
            # Database Configuration
            EnvVariable(
                name="DATABASE_URL",
                level=ValidationLevel.REQUIRED,
                description="Database connection URL",
                format_validation=r"^(sqlite|postgresql|mysql)://.*",
                forbidden_values=[""],
                example="postgresql://user:password@localhost:5432/bookedbarber"
            ),
            
            # Stripe Payment Configuration
            EnvVariable(
                name="STRIPE_SECRET_KEY",
                level=ValidationLevel.CRITICAL,
                description="Stripe secret key for payment processing",
                format_validation=r"^sk_(test|live)_[a-zA-Z0-9]{24,}$",
                forbidden_values=["", "sk_test_your_key_here"],
                example="sk_test_51234567890abcdef..."
            ),
            EnvVariable(
                name="STRIPE_PUBLISHABLE_KEY",
                level=ValidationLevel.CRITICAL,
                description="Stripe publishable key for frontend",
                format_validation=r"^pk_(test|live)_[a-zA-Z0-9]{24,}$",
                forbidden_values=["", "pk_test_your_key_here"],
                example="pk_test_51234567890abcdef..."
            ),
            EnvVariable(
                name="STRIPE_WEBHOOK_SECRET",
                level=ValidationLevel.CRITICAL,
                description="Stripe webhook endpoint secret",
                format_validation=r"^whsec_[a-zA-Z0-9]{32,}$",
                forbidden_values=["", "whsec_your_secret_here"],
                example="whsec_1234567890abcdef..."
            ),
            
            # Email Configuration (SendGrid)
            EnvVariable(
                name="SENDGRID_API_KEY",
                level=ValidationLevel.REQUIRED,
                description="SendGrid API key for email notifications",
                format_validation=r"^SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}$",
                forbidden_values=["", "SG.your_api_key_here"],
                example="SG.abc123def456..."
            ),
            
            # SMS Configuration (Twilio)
            EnvVariable(
                name="TWILIO_ACCOUNT_SID",
                level=ValidationLevel.REQUIRED,
                description="Twilio Account SID for SMS notifications",
                format_validation=r"^AC[a-fA-F0-9]{32}$",
                forbidden_values=["", "AC_your_account_sid_here"],
                example="AC1234567890abcdef..."
            ),
            EnvVariable(
                name="TWILIO_AUTH_TOKEN",
                level=ValidationLevel.CRITICAL,
                description="Twilio Auth Token",
                min_length=32,
                forbidden_values=["", "your_auth_token_here"],
                example="32-character-auth-token"
            ),
            EnvVariable(
                name="TWILIO_PHONE_NUMBER",
                level=ValidationLevel.REQUIRED,
                description="Twilio phone number for SMS",
                format_validation=r"^\+1[0-9]{10}$",
                forbidden_values=["", "+15551234567"],
                example="+15551234567"
            ),
            
            # Google OAuth Configuration
            EnvVariable(
                name="GOOGLE_CLIENT_ID",
                level=ValidationLevel.RECOMMENDED,
                description="Google OAuth client ID for calendar integration",
                format_validation=r"^[0-9]{12}-[a-zA-Z0-9]{32}\.apps\.googleusercontent\.com$",
                forbidden_values=["", "your_google_client_id_here"],
                example="123456789012-abcdefg...apps.googleusercontent.com"
            ),
            EnvVariable(
                name="GOOGLE_CLIENT_SECRET",
                level=ValidationLevel.RECOMMENDED,
                description="Google OAuth client secret",
                min_length=24,
                forbidden_values=["", "your_google_client_secret_here"],
                example="GOCSPX-your_client_secret_here"
            ),
            
            # AI Provider API Keys
            EnvVariable(
                name="ANTHROPIC_API_KEY",
                level=ValidationLevel.OPTIONAL,
                description="Anthropic Claude API key for AI features",
                format_validation=r"^sk-ant-api03-[a-zA-Z0-9_-]{95}$",
                forbidden_values=["", "sk-ant-api03-your_key_here"],
                example="sk-ant-api03-..."
            ),
            EnvVariable(
                name="OPENAI_API_KEY",
                level=ValidationLevel.OPTIONAL,
                description="OpenAI API key for AI features",
                format_validation=r"^sk-[a-zA-Z0-9]{48}$",
                forbidden_values=["", "sk-your_openai_key_here"],
                example="sk-1234567890abcdef..."
            ),
            
            # Analytics Configuration
            EnvVariable(
                name="GA4_MEASUREMENT_ID",
                level=ValidationLevel.RECOMMENDED,
                description="Google Analytics 4 Measurement ID",
                format_validation=r"^G-[A-Z0-9]{10}$",
                forbidden_values=["", "G-XXXXXXXXXX"],
                example="G-ABCD123456"
            ),
            
            # CORS and Security
            EnvVariable(
                name="ALLOWED_ORIGINS",
                level=ValidationLevel.REQUIRED,
                description="Comma-separated list of allowed CORS origins",
                forbidden_values=[""],
                example="http://localhost:3000,https://yourdomain.com"
            ),
            
            # Environment
            EnvVariable(
                name="ENVIRONMENT",
                level=ValidationLevel.REQUIRED,
                description="Application environment (development/staging/production)",
                forbidden_values=[""],
                example="production"
            ),
        ]
        
        self.validation_results = []
        self.security_score = 0
        self.max_score = 0
    
    def validate_all(self) -> Dict[str, any]:
        """Validate all environment variables and return results"""
        logger.info("Starting environment variable validation...")
        
        self.validation_results = []
        self.security_score = 0
        self.max_score = 0
        
        critical_failures = []
        required_failures = []
        warnings = []
        
        for env_var in self.env_variables:
            result = self._validate_single_var(env_var)
            self.validation_results.append(result)
            
            # Calculate scoring
            if env_var.level == ValidationLevel.CRITICAL:
                self.max_score += 3
                if result["status"] == "valid":
                    self.security_score += 3
                elif result["status"] == "warning":
                    self.security_score += 1
            elif env_var.level == ValidationLevel.REQUIRED:
                self.max_score += 2
                if result["status"] == "valid":
                    self.security_score += 2
                elif result["status"] == "warning":
                    self.security_score += 1
            elif env_var.level == ValidationLevel.RECOMMENDED:
                self.max_score += 1
                if result["status"] == "valid":
                    self.security_score += 1
            
            # Categorize issues
            if result["status"] == "critical":
                critical_failures.append(result)
            elif result["status"] == "missing" and env_var.level == ValidationLevel.REQUIRED:
                required_failures.append(result)
            elif result["status"] in ["warning", "missing"]:
                warnings.append(result)
        
        # Calculate final score
        score_percentage = (self.security_score / self.max_score * 100) if self.max_score > 0 else 0
        
        return {
            "score": score_percentage,
            "critical_failures": critical_failures,
            "required_failures": required_failures,
            "warnings": warnings,
            "all_results": self.validation_results,
            "recommendations": self._generate_recommendations()
        }
    
    def _validate_single_var(self, env_var: EnvVariable) -> Dict[str, any]:
        """Validate a single environment variable"""
        value = os.getenv(env_var.name)
        
        result = {
            "name": env_var.name,
            "level": env_var.level.value,
            "description": env_var.description,
            "status": "valid",
            "issues": [],
            "value_set": value is not None and value != ""
        }
        
        # Check if variable is set
        if not value:
            if env_var.level in [ValidationLevel.CRITICAL, ValidationLevel.REQUIRED]:
                result["status"] = "critical" if env_var.level == ValidationLevel.CRITICAL else "missing"
                result["issues"].append(f"Environment variable {env_var.name} is not set")
            else:
                result["status"] = "missing"
                result["issues"].append(f"Optional variable {env_var.name} is not set")
            return result
        
        # Check forbidden values
        if value in env_var.forbidden_values:
            result["status"] = "critical"
            result["issues"].append(f"Using forbidden/default value for {env_var.name}")
            return result
        
        # Check minimum length
        if env_var.min_length and len(value) < env_var.min_length:
            result["status"] = "warning" if env_var.level != ValidationLevel.CRITICAL else "critical"
            result["issues"].append(f"Value too short (minimum {env_var.min_length} characters)")
        
        # Check format validation
        if env_var.format_validation:
            if not re.match(env_var.format_validation, value):
                result["status"] = "warning" if env_var.level != ValidationLevel.CRITICAL else "critical"
                result["issues"].append(f"Value format doesn't match expected pattern")
        
        # Additional security checks
        if "secret" in env_var.name.lower() or "key" in env_var.name.lower():
            if self._is_weak_secret(value):
                result["status"] = "warning"
                result["issues"].append("Secret appears to be weak (consider using stronger randomness)")
        
        return result
    
    def _is_weak_secret(self, value: str) -> bool:
        """Check if a secret value appears weak"""
        if len(value) < 32:
            return True
        
        # Check for common weak patterns
        weak_patterns = [
            r"^[a-zA-Z]+$",  # Only letters
            r"^[0-9]+$",     # Only numbers
            r"^(.)\1{10,}",  # Repeated characters
            r"1234|abcd|qwerty|password|secret",  # Common weak strings
        ]
        
        for pattern in weak_patterns:
            if re.search(pattern, value.lower()):
                return True
        
        return False
    
    def _generate_recommendations(self) -> List[str]:
        """Generate security recommendations based on validation results"""
        recommendations = []
        
        # Critical security recommendations
        critical_count = len([r for r in self.validation_results if r["status"] == "critical"])
        if critical_count > 0:
            recommendations.append(
                f"🚨 CRITICAL: {critical_count} critical security issues found. "
                "Fix these immediately before deploying to production."
            )
        
        # Missing required variables
        missing_required = len([
            r for r in self.validation_results 
            if r["status"] == "missing" and r["level"] == "required"
        ])
        if missing_required > 0:
            recommendations.append(
                f"⚠️  {missing_required} required environment variables are missing. "
                "Some features may not work correctly."
            )
        
        # Environment-specific recommendations
        environment = os.getenv("ENVIRONMENT", "development").lower()
        if environment == "production":
            recommendations.extend([
                "✅ Production environment detected - ensure all secrets are rotated regularly",
                "✅ Use a secure secret management system (AWS Secrets Manager, Azure Key Vault, etc.)",
                "✅ Enable monitoring and alerting for failed authentication attempts",
                "✅ Regularly audit access to environment variables and secrets"
            ])
        
        # General security recommendations
        recommendations.extend([
            "🔐 Generate secrets using cryptographically secure random generators",
            "🔄 Rotate all API keys and secrets quarterly",
            "📝 Document all environment variables in your deployment guide",
            "🔍 Use automated tools to scan for accidentally committed secrets",
            "🚫 Never commit .env files or secrets to version control"
        ])
        
        return recommendations
    
    def print_results(self, results: Dict[str, any]):
        """Print validation results in a human-readable format"""
        print("\n" + "="*80)
        print("🔒 BOOKEDBARBER V2 ENVIRONMENT SECURITY VALIDATION")
        print("="*80)
        
        # Score
        score = results["score"]
        if score >= 90:
            score_emoji = "🟢"
        elif score >= 70:
            score_emoji = "🟡"
        else:
            score_emoji = "🔴"
        
        print(f"\n{score_emoji} SECURITY SCORE: {score:.1f}/100")
        
        # Critical failures
        if results["critical_failures"]:
            print(f"\n🚨 CRITICAL ISSUES ({len(results['critical_failures'])}):")
            for failure in results["critical_failures"]:
                print(f"  ❌ {failure['name']}: {', '.join(failure['issues'])}")
        
        # Required failures
        if results["required_failures"]:
            print(f"\n⚠️  REQUIRED MISSING ({len(results['required_failures'])}):")
            for failure in results["required_failures"]:
                print(f"  ⚠️  {failure['name']}: {', '.join(failure['issues'])}")
        
        # Warnings
        if results["warnings"]:
            print(f"\n💡 WARNINGS ({len(results['warnings'])}):")
            for warning in results["warnings"]:
                print(f"  💡 {warning['name']}: {', '.join(warning['issues'])}")
        
        # All variables summary
        print(f"\n📋 SUMMARY:")
        total = len(results["all_results"])
        valid = len([r for r in results["all_results"] if r["status"] == "valid"])
        missing = len([r for r in results["all_results"] if r["status"] == "missing"])
        
        print(f"  Total variables checked: {total}")
        print(f"  ✅ Valid: {valid}")
        print(f"  ❌ Issues: {total - valid}")
        print(f"  📝 Missing optional: {missing}")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        for i, rec in enumerate(results["recommendations"], 1):
            print(f"  {i}. {rec}")
        
        print("\n" + "="*80)
        
        # Return exit code
        if results["critical_failures"]:
            return 2  # Critical failures
        elif results["required_failures"]:
            return 1  # Required missing
        else:
            return 0  # All good


def main():
    """Main entry point for the validator"""
    validator = EnvValidator()
    results = validator.validate_all()
    exit_code = validator.print_results(results)
    
    # Exit with appropriate code
    sys.exit(exit_code)


if __name__ == "__main__":
    main()