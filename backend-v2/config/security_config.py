"""
Security Configuration for BookedBarber V2 Production
Hardens existing services with production security settings
"""

from typing import Dict, List

class SecurityConfig:
    """Production security configuration for existing services"""
    
    @staticmethod
    def get_production_settings() -> Dict:
        """Get production security settings for existing services"""
        return {
            # Core Security
            "DEBUG": False,
            "ENVIRONMENT": "production",
            "LOG_LEVEL": "INFO",
            
            # CORS Security (enhance existing middleware)
            "CORS_ALLOWED_ORIGINS": [
                "https://app.bookedbarber.com",
                "https://bookedbarber.com",
                "https://www.bookedbarber.com"
            ],
            "CORS_ALLOW_CREDENTIALS": True,
            "CORS_ALLOW_METHODS": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "CORS_ALLOW_HEADERS": ["Authorization", "Content-Type", "X-Requested-With"],
            
            # Security Headers (enhance existing middleware)
            "SECURITY_HEADERS": {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "X-XSS-Protection": "1; mode=block",
                "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                "Content-Security-Policy": (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com; "
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                    "font-src 'self' https://fonts.gstatic.com; "
                    "img-src 'self' data: https:; "
                    "connect-src 'self' https://api.stripe.com https://www.google-analytics.com;"
                ),
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            
            # Rate Limiting (enhance existing rate limiting)
            "RATE_LIMITS": {
                "AUTH_LOGIN": "20/minute",
                "AUTH_REGISTER": "10/minute", 
                "PASSWORD_RESET": "5/minute",
                "PAYMENTS": "100/minute",
                "API_GENERAL": "1000/minute",
                "EMAIL_NOTIFICATIONS": "50/minute",
                "SMS_NOTIFICATIONS": "20/minute"
            },
            
            # JWT Security (enhance existing auth)
            "JWT_SETTINGS": {
                "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
                "REFRESH_TOKEN_EXPIRE_DAYS": 7,
                "ALGORITHM": "HS256",
                "REQUIRE_VERIFICATION": True,
                "BLACKLIST_ENABLED": True
            },
            
            # Session Security
            "SESSION_SETTINGS": {
                "SECURE_COOKIES": True,
                "HTTPONLY_COOKIES": True,
                "SAMESITE_COOKIES": "strict",
                "SESSION_TIMEOUT_HOURS": 8
            },
            
            # Database Security (for PostgreSQL migration)
            "DATABASE_SECURITY": {
                "SSL_REQUIRE": True,
                "CONNECTION_TIMEOUT": 30,
                "COMMAND_TIMEOUT": 300,
                "POOL_SIZE": 20,
                "MAX_OVERFLOW": 30,
                "POOL_RECYCLE": 3600  # 1 hour
            },
            
            # External Service Security
            "EXTERNAL_SERVICES": {
                "WEBHOOK_SIGNATURE_VERIFICATION": True,
                "API_KEY_ROTATION_DAYS": 90,
                "OAUTH_TOKEN_REFRESH_BUFFER_MINUTES": 5,
                "TIMEOUT_SECONDS": 30
            },
            
            # File Upload Security (if enabled)
            "FILE_UPLOAD": {
                "MAX_FILE_SIZE": 10 * 1024 * 1024,  # 10MB
                "ALLOWED_EXTENSIONS": [".jpg", ".jpeg", ".png", ".pdf"],
                "SCAN_FOR_MALWARE": True,
                "STORE_OUTSIDE_WEBROOT": True
            },
            
            # Logging and Monitoring
            "SECURITY_MONITORING": {
                "LOG_FAILED_LOGINS": True,
                "LOG_PRIVILEGE_ESCALATIONS": True,
                "LOG_DATA_ACCESS": True,
                "ALERT_THRESHOLD_FAILED_LOGINS": 5,
                "ALERT_THRESHOLD_TIME_MINUTES": 15
            }
        }
    
    @staticmethod
    def get_environment_specific_config(environment: str) -> Dict:
        """Get environment-specific security configurations"""
        base_config = SecurityConfig.get_production_settings()
        
        if environment == "staging":
            # Slightly relaxed for staging
            base_config.update({
                "CORS_ALLOWED_ORIGINS": [
                    "https://staging.bookedbarber.com",
                    "http://localhost:3001",  # Local staging
                ],
                "DEBUG": False,  # Still false for staging
                "LOG_LEVEL": "DEBUG",
                "RATE_LIMITS": {k: v.replace("/minute", "/30seconds") for k, v in base_config["RATE_LIMITS"].items()}
            })
        
        elif environment == "development":
            # Development-friendly but still secure
            base_config.update({
                "CORS_ALLOWED_ORIGINS": [
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "http://127.0.0.1:3000"
                ],
                "DEBUG": True,
                "LOG_LEVEL": "DEBUG",
                "SECURITY_HEADERS": {k: v for k, v in base_config["SECURITY_HEADERS"].items() 
                                   if k != "Strict-Transport-Security"},  # Remove HSTS for local dev
                "SESSION_SETTINGS": {
                    **base_config["SESSION_SETTINGS"],
                    "SECURE_COOKIES": False  # Allow HTTP for local dev
                }
            })
        
        return base_config
    
    @staticmethod
    def validate_security_config(config: Dict) -> List[str]:
        """Validate security configuration and return warnings"""
        warnings = []
        
        # Check critical security settings
        if config.get("DEBUG", False) and config.get("ENVIRONMENT") == "production":
            warnings.append("❌ CRITICAL: DEBUG=True in production environment")
        
        if not config.get("SECURITY_HEADERS", {}).get("Strict-Transport-Security"):
            warnings.append("⚠️ WARNING: HSTS not configured")
        
        if "http://" in str(config.get("CORS_ALLOWED_ORIGINS", [])) and config.get("ENVIRONMENT") == "production":
            warnings.append("❌ CRITICAL: HTTP origins allowed in production")
        
        if not config.get("JWT_SETTINGS", {}).get("REQUIRE_VERIFICATION"):
            warnings.append("⚠️ WARNING: Email verification not required")
        
        if config.get("SESSION_SETTINGS", {}).get("SECURE_COOKIES") is False and config.get("ENVIRONMENT") == "production":
            warnings.append("❌ CRITICAL: Insecure cookies in production")
        
        # Check rate limiting
        rate_limits = config.get("RATE_LIMITS", {})
        if not rate_limits.get("AUTH_LOGIN"):
            warnings.append("⚠️ WARNING: No rate limiting on authentication")
        
        return warnings

def apply_security_middleware_config():
    """Apply security configuration to existing middleware"""
    return {
        "middleware_config": {
            "security_headers": SecurityConfig.get_production_settings()["SECURITY_HEADERS"],
            "cors_settings": {
                "allow_origins": SecurityConfig.get_production_settings()["CORS_ALLOWED_ORIGINS"],
                "allow_credentials": SecurityConfig.get_production_settings()["CORS_ALLOW_CREDENTIALS"],
                "allow_methods": SecurityConfig.get_production_settings()["CORS_ALLOW_METHODS"],
                "allow_headers": SecurityConfig.get_production_settings()["CORS_ALLOW_HEADERS"]
            },
            "rate_limiting": SecurityConfig.get_production_settings()["RATE_LIMITS"]
        }
    }

def get_secure_database_url(base_url: str, environment: str = "production") -> str:
    """Enhance database URL with security parameters"""
    config = SecurityConfig.get_environment_specific_config(environment)
    db_config = config["DATABASE_SECURITY"]
    
    # Add security parameters to PostgreSQL URL
    if "postgresql://" in base_url:
        separator = "&" if "?" in base_url else "?"
        security_params = [
            f"sslmode=require" if db_config["SSL_REQUIRE"] else "",
            f"connect_timeout={db_config['CONNECTION_TIMEOUT']}",
            f"command_timeout={db_config['COMMAND_TIMEOUT']}"
        ]
        security_params = [p for p in security_params if p]  # Remove empty
        return base_url + separator + "&".join(security_params)
    
    return base_url