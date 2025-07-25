
import re
import html
import bleach
from typing import Any, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel, validator
import logging

logger = logging.getLogger(__name__)

class SecurityValidation:
    """Comprehensive input validation and sanitization"""
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(union\s+select)",
        r"(drop\s+table)",
        r"(delete\s+from)",
        r"(insert\s+into)",
        r"(update\s+set)",
        r"(exec\s*\()",
        r"(script\s*>)",
        r"(javascript:)",
        r"(<\s*script)",
        r"(on\w+\s*=)"
    ]
    
    # XSS patterns
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>.*?</iframe>",
        r"<object[^>]*>.*?</object>",
        r"<embed[^>]*>.*?</embed>"
    ]
    
    @staticmethod
    def sanitize_html(text: str) -> str:
        """Sanitize HTML content"""
        if not text:
            return text
            
        # Allowed HTML tags for rich content
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
        allowed_attributes = {}
        
        sanitized = bleach.clean(
            text,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
        
        return sanitized
    
    @staticmethod
    def validate_sql_injection(text: str) -> bool:
        """Check for SQL injection patterns"""
        if not text:
            return True
            
        text_lower = text.lower()
        
        for pattern in SecurityValidation.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.warning(f"Potential SQL injection detected: {pattern}")
                return False
        
        return True
    
    @staticmethod
    def validate_xss(text: str) -> bool:
        """Check for XSS patterns"""
        if not text:
            return True
            
        for pattern in SecurityValidation.XSS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"Potential XSS detected: {pattern}")
                return False
        
        return True
    
    @staticmethod
    def sanitize_input(data: Any) -> Any:
        """Recursively sanitize input data"""
        if isinstance(data, str):
            # HTML escape
            data = html.escape(data)
            
            # Check for malicious patterns
            if not SecurityValidation.validate_sql_injection(data):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
            
            if not SecurityValidation.validate_xss(data):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
            
            return data
            
        elif isinstance(data, dict):
            return {key: SecurityValidation.sanitize_input(value) for key, value in data.items()}
            
        elif isinstance(data, list):
            return [SecurityValidation.sanitize_input(item) for item in data]
            
        return data

# Enhanced Pydantic models with security validation
class SecureBaseModel(BaseModel):
    """Base model with security validation"""
    
    @validator('*', pre=True)
    def validate_security(cls, v):
        return SecurityValidation.sanitize_input(v)

# Specific validation models
class SecureAppointmentCreate(SecureBaseModel):
    title: str
    description: Optional[str] = None
    start_time: str
    duration: int
    
    @validator('title')
    def validate_title(cls, v):
        if len(v) > 200:
            raise ValueError('Title too long')
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if v and len(v) > 1000:
            raise ValueError('Description too long')
        return SecurityValidation.sanitize_html(v) if v else v

class SecureUserRegistration(SecureBaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    
    @validator('email')
    def validate_email(cls, v):
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        # Password strength validation
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain special character')
        return v
