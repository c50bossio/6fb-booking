"""
Secure logging utilities to prevent sensitive data exposure
"""
import re
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime


class SensitiveDataSanitizer:
    """Sanitize sensitive data from logs and responses"""
    
    # Patterns for sensitive data detection
    SENSITIVE_PATTERNS = {
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'phone': r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
        'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b',
        'credit_card': r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
        'jwt_token': r'\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b',
        'api_key': r'\b[A-Za-z0-9]{20,}\b',
        'password': r'"password"\s*:\s*"[^"]*"',
        'secret': r'"secret[^"]*"\s*:\s*"[^"]*"',
        'token': r'"[^"]*token[^"]*"\s*:\s*"[^"]*"',
    }
    
    # Sensitive field names to redact
    SENSITIVE_FIELDS = {
        'password', 'hashed_password', 'token', 'secret', 'api_key',
        'private_key', 'client_secret', 'webhook_secret', 'jwt_secret',
        'stripe_secret_key', 'sendgrid_api_key', 'twilio_auth_token',
        'oauth_token', 'refresh_token', 'access_token', 'session_id',
        'credit_card', 'card_number', 'cvv', 'expiry', 'bank_account',
        'routing_number', 'account_number', 'ssn', 'social_security',
        'payment_method_id', 'customer_id', 'subscription_id'
    }
    
    @classmethod
    def sanitize_string(cls, text: str) -> str:
        """Sanitize sensitive data from a string"""
        if not isinstance(text, str):
            return text
            
        sanitized = text
        
        # Replace sensitive patterns
        for pattern_name, pattern in cls.SENSITIVE_PATTERNS.items():
            if pattern_name == 'email':
                # Partially mask emails: u***@d***.com
                sanitized = re.sub(pattern, cls._mask_email, sanitized)
            elif pattern_name == 'phone':
                # Mask phone: (***) ***-1234
                sanitized = re.sub(pattern, r'(***) ***-\3', sanitized)
            elif pattern_name == 'credit_card':
                # Mask credit card: ****-****-****-1234
                sanitized = re.sub(pattern, lambda m: '*' * (len(m.group()) - 4) + m.group()[-4:], sanitized)
            else:
                # Completely redact other sensitive data
                sanitized = re.sub(pattern, '[REDACTED]', sanitized)
        
        return sanitized
    
    @classmethod
    def _mask_email(cls, match) -> str:
        """Mask email address partially"""
        email = match.group()
        try:
            local, domain = email.split('@')
            if len(local) <= 2:
                masked_local = '*' * len(local)
            else:
                masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
            
            domain_parts = domain.split('.')
            if len(domain_parts) >= 2:
                masked_domain = domain_parts[0][0] + '*' * (len(domain_parts[0]) - 1)
                masked_domain += '.' + '.'.join(domain_parts[1:])
            else:
                masked_domain = '*' * len(domain)
                
            return f"{masked_local}@{masked_domain}"
        except:
            return '[EMAIL_REDACTED]'
    
    @classmethod
    def sanitize_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize sensitive data from a dictionary"""
        if not isinstance(data, dict):
            return data
            
        sanitized = {}
        
        for key, value in data.items():
            # Check if field name is sensitive
            if key.lower() in cls.SENSITIVE_FIELDS:
                sanitized[key] = '[REDACTED]'
            elif isinstance(value, dict):
                sanitized[key] = cls.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = cls.sanitize_list(value)
            elif isinstance(value, str):
                sanitized[key] = cls.sanitize_string(value)
            else:
                sanitized[key] = value
                
        return sanitized
    
    @classmethod
    def sanitize_list(cls, data: List[Any]) -> List[Any]:
        """Sanitize sensitive data from a list"""
        if not isinstance(data, list):
            return data
            
        sanitized = []
        
        for item in data:
            if isinstance(item, dict):
                sanitized.append(cls.sanitize_dict(item))
            elif isinstance(item, list):
                sanitized.append(cls.sanitize_list(item))
            elif isinstance(item, str):
                sanitized.append(cls.sanitize_string(item))
            else:
                sanitized.append(item)
                
        return sanitized
    
    @classmethod
    def sanitize_any(cls, data: Any) -> Any:
        """Sanitize any type of data"""
        if isinstance(data, dict):
            return cls.sanitize_dict(data)
        elif isinstance(data, list):
            return cls.sanitize_list(data)
        elif isinstance(data, str):
            return cls.sanitize_string(data)
        else:
            return data


class SecureLogger:
    """Enhanced logger with automatic data sanitization"""
    
    def __init__(self, logger_name: str):
        self.logger = logging.getLogger(logger_name)
        self.sanitizer = SensitiveDataSanitizer()
    
    def _sanitize_message(self, message: str, *args, **kwargs) -> tuple:
        """Sanitize log message and arguments"""
        # Sanitize the main message
        sanitized_message = self.sanitizer.sanitize_string(message)
        
        # Sanitize positional arguments
        sanitized_args = []
        for arg in args:
            sanitized_args.append(self.sanitizer.sanitize_any(arg))
        
        # Sanitize keyword arguments
        sanitized_kwargs = {}
        for key, value in kwargs.items():
            if key in ['exc_info', 'stack_info', 'stacklevel']:
                # Don't sanitize logging-specific kwargs
                sanitized_kwargs[key] = value
            else:
                sanitized_kwargs[key] = self.sanitizer.sanitize_any(value)
        
        return sanitized_message, tuple(sanitized_args), sanitized_kwargs
    
    def debug(self, message: str, *args, **kwargs):
        """Log debug message with sanitization"""
        sanitized_message, sanitized_args, sanitized_kwargs = self._sanitize_message(message, *args, **kwargs)
        self.logger.debug(sanitized_message, *sanitized_args, **sanitized_kwargs)
    
    def info(self, message: str, *args, **kwargs):
        """Log info message with sanitization"""
        sanitized_message, sanitized_args, sanitized_kwargs = self._sanitize_message(message, *args, **kwargs)
        self.logger.info(sanitized_message, *sanitized_args, **sanitized_kwargs)
    
    def warning(self, message: str, *args, **kwargs):
        """Log warning message with sanitization"""
        sanitized_message, sanitized_args, sanitized_kwargs = self._sanitize_message(message, *args, **kwargs)
        self.logger.warning(sanitized_message, *sanitized_args, **sanitized_kwargs)
    
    def error(self, message: str, *args, **kwargs):
        """Log error message with sanitization"""
        sanitized_message, sanitized_args, sanitized_kwargs = self._sanitize_message(message, *args, **kwargs)
        self.logger.error(sanitized_message, *sanitized_args, **sanitized_kwargs)
    
    def critical(self, message: str, *args, **kwargs):
        """Log critical message with sanitization"""
        sanitized_message, sanitized_args, sanitized_kwargs = self._sanitize_message(message, *args, **kwargs)
        self.logger.critical(sanitized_message, *sanitized_args, **sanitized_kwargs)


def get_secure_logger(name: str) -> SecureLogger:
    """Get a secure logger instance"""
    return SecureLogger(name)


def sanitize_for_response(data: Any) -> Any:
    """Sanitize data before sending in API responses"""
    return SensitiveDataSanitizer.sanitize_any(data)


def log_security_event(
    event_type: str,
    description: str,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None,
    severity: str = "INFO"
):
    """Log security-related events with proper sanitization"""
    security_logger = get_secure_logger("security")
    
    event_data = {
        "event_type": event_type,
        "description": description,
        "timestamp": datetime.utcnow().isoformat(),
        "severity": severity,
        "user_id": user_id,
        "ip_address": ip_address,
        "additional_data": additional_data or {}
    }
    
    if severity.upper() == "CRITICAL":
        security_logger.critical(f"Security Event: {event_type}", extra=event_data)
    elif severity.upper() == "ERROR":
        security_logger.error(f"Security Event: {event_type}", extra=event_data)
    elif severity.upper() == "WARNING":
        security_logger.warning(f"Security Event: {event_type}", extra=event_data)
    else:
        security_logger.info(f"Security Event: {event_type}", extra=event_data)


# Test the sanitization
if __name__ == "__main__":
    # Test data with sensitive information
    test_data = {
        "user_email": "john.doe@example.com",
        "password": "secretpassword123",
        "phone": "+1-555-123-4567",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        "nested": {
            "credit_card": "4111-1111-1111-1111",
            "api_key": "sk_test_1234567890abcdef"
        }
    }
    
    sanitizer = SensitiveDataSanitizer()
    sanitized = sanitizer.sanitize_dict(test_data)
    
    print("Original:", json.dumps(test_data, indent=2))
    print("\nSanitized:", json.dumps(sanitized, indent=2))