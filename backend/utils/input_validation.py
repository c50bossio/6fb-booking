"""
Enhanced input validation utilities for security
Production-grade input validation and sanitization
"""

import re
import magic
import mimetypes
import html
import json
import base64
import hashlib
from typing import Any, Dict, List, Optional, Tuple, Union
from fastapi import HTTPException, UploadFile, status
from pydantic import BaseModel, ValidationError, validator, Field
import sqlparse
from urllib.parse import urlparse
from datetime import datetime, date
import phonenumbers
from phonenumbers import NumberParseException


class InputValidationError(HTTPException):
    """Custom exception for input validation errors"""

    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class FileUploadValidator:
    """Secure file upload validation"""

    # Allowed file types and their MIME types
    ALLOWED_TYPES = {
        "image": {
            "jpg": ["image/jpeg"],
            "jpeg": ["image/jpeg"],
            "png": ["image/png"],
            "gif": ["image/gif"],
            "webp": ["image/webp"],
        },
        "document": {
            "pdf": ["application/pdf"],
            "doc": ["application/msword"],
            "docx": [
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ],
            "txt": ["text/plain"],
            "csv": ["text/csv", "application/csv"],
        },
    }

    # Maximum file sizes (in bytes)
    MAX_SIZES = {
        "image": 5 * 1024 * 1024,  # 5MB
        "document": 10 * 1024 * 1024,  # 10MB
        "default": 1 * 1024 * 1024,  # 1MB
    }

    @classmethod
    def validate_file(
        cls,
        file: UploadFile,
        allowed_categories: List[str] = ["image", "document"],
        max_size: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Validate uploaded file for security and constraints

        Args:
            file: FastAPI UploadFile instance
            allowed_categories: List of allowed file categories
            max_size: Maximum file size in bytes (optional)

        Returns:
            Dict with validation results

        Raises:
            InputValidationError: If validation fails
        """
        if not file:
            raise InputValidationError("No file provided")

        # Check filename
        if not file.filename:
            raise InputValidationError("Filename is required")

        # Sanitize filename
        filename = cls._sanitize_filename(file.filename)

        # Check file extension
        extension = filename.lower().split(".")[-1] if "." in filename else ""
        if not extension:
            raise InputValidationError("File must have an extension")

        # Validate against allowed types
        file_category = None
        allowed_extensions = []

        for category in allowed_categories:
            if category in cls.ALLOWED_TYPES:
                category_extensions = list(cls.ALLOWED_TYPES[category].keys())
                allowed_extensions.extend(category_extensions)

                if extension in category_extensions:
                    file_category = category
                    break

        if not file_category:
            raise InputValidationError(
                f"File type '{extension}' not allowed. "
                f"Allowed types: {', '.join(allowed_extensions)}"
            )

        # Check file size
        content_length = file.size
        max_allowed_size = max_size or cls.MAX_SIZES.get(
            file_category, cls.MAX_SIZES["default"]
        )

        if content_length and content_length > max_allowed_size:
            raise InputValidationError(
                f"File too large. Maximum size: {max_allowed_size / 1024 / 1024:.1f}MB"
            )

        # Read file content for MIME type validation
        file_content = file.file.read()
        file.file.seek(0)  # Reset file pointer

        if len(file_content) > max_allowed_size:
            raise InputValidationError(
                f"File too large. Maximum size: {max_allowed_size / 1024 / 1024:.1f}MB"
            )

        # Validate MIME type using python-magic
        try:
            detected_mime = magic.from_buffer(file_content, mime=True)
        except:
            # Fallback to mimetypes if magic fails
            detected_mime, _ = mimetypes.guess_type(filename)

        if detected_mime:
            allowed_mimes = cls.ALLOWED_TYPES[file_category][extension]
            if detected_mime not in allowed_mimes:
                raise InputValidationError(
                    f"File content doesn't match extension. "
                    f"Expected: {', '.join(allowed_mimes)}, Got: {detected_mime}"
                )

        # Additional security checks
        cls._check_malicious_content(file_content, file_category)

        return {
            "filename": filename,
            "original_filename": file.filename,
            "size": len(file_content),
            "mime_type": detected_mime,
            "category": file_category,
            "extension": extension,
            "content": file_content,
        }

    @classmethod
    def _sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename to prevent directory traversal"""
        # Remove path separators and dangerous characters
        filename = re.sub(r'[<>:"/\\|?*]', "", filename)
        filename = re.sub(r"\.\.", "", filename)  # Remove .. sequences
        filename = filename.strip(".")  # Remove leading/trailing dots

        # Ensure filename isn't too long
        if len(filename) > 255:
            name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
            filename = name[:250] + ("." + ext if ext else "")

        return filename

    @classmethod
    def _check_malicious_content(cls, content: bytes, category: str):
        """Check for malicious content patterns"""
        content_str = content.decode("utf-8", errors="ignore").lower()

        # Check for script injections in any file type
        malicious_patterns = [
            r"<script[^>]*>",
            r"javascript:",
            r"vbscript:",
            r"onload\s*=",
            r"onerror\s*=",
            r"eval\s*\(",
            r"document\.cookie",
            r"window\.location",
        ]

        for pattern in malicious_patterns:
            if re.search(pattern, content_str, re.IGNORECASE):
                raise InputValidationError(
                    "File contains potentially malicious content"
                )

        # Category-specific checks
        if category == "image":
            # Check for embedded scripts in image metadata
            if b"<script" in content or b"javascript:" in content:
                raise InputValidationError("Image contains embedded scripts")


class SQLInjectionValidator:
    """Validate against SQL injection attempts"""

    DANGEROUS_PATTERNS = [
        r"(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)",
        r"(--|#|/\*|\*/)",
        r"(\b(or|and)\s+\d+\s*=\s*\d+)",
        r"(\'\s*(or|and)\s+\'\w+\'\s*=\s*\'\w+\')",
        r"(\bunion\s+select\b)",
        r"(\binto\s+outfile\b)",
        r"(\bload_file\b)",
        r"(\bchar\(\d+\))",
        r"(\bhex\()",
        r"(\bconcat\s*\()",
        r"(\bsubstring\s*\()",
        r"(\bversion\s*\(\s*\))",
        r"(\b(information_schema|sys|mysql|pg_)\w*)",
    ]

    @classmethod
    def validate_query_string(cls, query: str) -> bool:
        """
        Validate if a string contains potential SQL injection

        Args:
            query: String to validate

        Returns:
            True if safe, raises exception if dangerous

        Raises:
            InputValidationError: If potential SQL injection detected
        """
        if not query:
            return True

        query_lower = query.lower()

        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, query_lower, re.IGNORECASE):
                raise InputValidationError(
                    "Input contains potentially dangerous SQL patterns"
                )

        return True

    @classmethod
    def validate_search_term(cls, term: str, max_length: int = 100) -> str:
        """
        Validate and sanitize search terms

        Args:
            term: Search term to validate
            max_length: Maximum allowed length

        Returns:
            Sanitized search term

        Raises:
            InputValidationError: If validation fails
        """
        if not term:
            return ""

        # Check length
        if len(term) > max_length:
            raise InputValidationError(
                f"Search term too long (max {max_length} characters)"
            )

        # Validate against SQL injection
        cls.validate_query_string(term)

        # Sanitize special characters but keep search functionality
        sanitized = re.sub(r'[<>"\']', "", term)
        sanitized = re.sub(r"--", "", sanitized)
        sanitized = re.sub(r"/\*.*?\*/", "", sanitized)

        return sanitized.strip()


class URLValidator:
    """Validate URLs for security"""

    ALLOWED_SCHEMES = ["http", "https"]
    BLOCKED_DOMAINS = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "10.",
        "192.168.",
        "172.16.",
        "172.17.",
        "172.18.",
        "172.19.",
        "172.20.",
        "172.21.",
        "172.22.",
        "172.23.",
        "172.24.",
        "172.25.",
        "172.26.",
        "172.27.",
        "172.28.",
        "172.29.",
        "172.30.",
        "172.31.",
    ]

    @classmethod
    def validate_url(cls, url: str, allow_internal: bool = False) -> str:
        """
        Validate URL for security

        Args:
            url: URL to validate
            allow_internal: Whether to allow internal/private network URLs

        Returns:
            Validated URL

        Raises:
            InputValidationError: If URL is invalid or dangerous
        """
        if not url:
            raise InputValidationError("URL is required")

        try:
            parsed = urlparse(url)
        except Exception:
            raise InputValidationError("Invalid URL format")

        # Check scheme
        if parsed.scheme not in cls.ALLOWED_SCHEMES:
            raise InputValidationError(
                f"URL scheme not allowed. Allowed: {', '.join(cls.ALLOWED_SCHEMES)}"
            )

        # Check for blocked domains (SSRF protection)
        if not allow_internal:
            hostname = parsed.hostname
            if hostname:
                hostname_lower = hostname.lower()
                for blocked in cls.BLOCKED_DOMAINS:
                    if hostname_lower.startswith(blocked):
                        raise InputValidationError(
                            "Internal/private network URLs not allowed"
                        )

        return url


class DataValidator:
    """General data validation utilities"""

    @classmethod
    def validate_phone_number(cls, phone: str) -> str:
        """Validate and format phone number"""
        if not phone:
            return ""

        # Remove all non-digit characters
        digits_only = re.sub(r"[^\d]", "", phone)

        # Check if it's a valid US phone number format
        if len(digits_only) == 10:
            # Format as (XXX) XXX-XXXX
            return f"({digits_only[:3]}) {digits_only[3:6]}-{digits_only[6:]}"
        elif len(digits_only) == 11 and digits_only.startswith("1"):
            # Remove leading 1 and format
            return f"({digits_only[1:4]}) {digits_only[4:7]}-{digits_only[7:]}"
        else:
            raise InputValidationError("Invalid phone number format")

    @classmethod
    def validate_email_domain(
        cls, email: str, allowed_domains: Optional[List[str]] = None
    ) -> bool:
        """Validate email domain against allowlist"""
        if not email or "@" not in email:
            return False

        if not allowed_domains:
            return True

        domain = email.split("@")[1].lower()
        return domain in [d.lower() for d in allowed_domains]

    @classmethod
    def sanitize_html_input(cls, text: str) -> str:
        """Sanitize HTML input to prevent XSS"""
        if not text:
            return ""

        # Remove potentially dangerous HTML tags and attributes
        dangerous_patterns = [
            r"<script[^>]*>.*?</script>",
            r"<iframe[^>]*>.*?</iframe>",
            r"<object[^>]*>.*?</object>",
            r"<embed[^>]*>.*?</embed>",
            r"<link[^>]*>",
            r"<meta[^>]*>",
            r'on\w+\s*=\s*["\'][^"\']*["\']',  # Event handlers
            r"javascript\s*:",
            r"vbscript\s*:",
            r"data\s*:",
        ]

        sanitized = text
        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, "", sanitized, flags=re.IGNORECASE | re.DOTALL)

        return sanitized

    @classmethod
    def validate_pagination_params(
        cls, limit: int, offset: int, max_limit: int = 100
    ) -> Tuple[int, int]:
        """Validate pagination parameters"""
        if limit < 1:
            limit = 10
        elif limit > max_limit:
            limit = max_limit

        if offset < 0:
            offset = 0

        return limit, offset


# Decorator for automatic input validation
def validate_input(validator_func):
    """Decorator to automatically validate input parameters"""

    def decorator(func):
        def wrapper(*args, **kwargs):
            # Apply validation
            validator_func(*args, **kwargs)
            return func(*args, **kwargs)

        return wrapper

    return decorator


class ProductionInputValidator:
    """Comprehensive production-grade input validation"""
    
    # XSS patterns for enhanced detection
    XSS_PATTERNS = [
        r"(?i)(<script[^>]*>)",
        r"(?i)(javascript\s*:)",
        r"(?i)(vbscript\s*:)",
        r"(?i)(on\w+\s*=)",
        r"(?i)(eval\s*\()",
        r"(?i)(expression\s*\()",
        r"(?i)(url\s*\()",
        r"(?i)(@import)",
        r"(?i)(document\.(write|cookie|location))",
        r"(?i)(window\.(location|open))",
        r"(?i)(alert\s*\()",
        r"(?i)(confirm\s*\()",
        r"(?i)(prompt\s*\()",
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r"(\.\.\/)",
        r"(\.\.\\)",
        r"(\/etc\/)",
        r"(\/proc\/)",
        r"(\/sys\/)",
        r"(\/var\/)",
        r"(\/tmp\/)",
        r"(\/boot\/)",
        r"(\/dev\/)",
        r"(\\windows\\)",
        r"(\\system32\\)",
    ]
    
    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        r"(;\s*(rm|del|format|shutdown))",
        r"(\|\s*(nc|netcat|curl|wget))",
        r"(&\s*(ping|nslookup|dig))",
        r"(`.*`)",
        r"(\$\(.*\))",
        r"(>\s*/dev/)",
        r"(<\s*/dev/)",
    ]
    
    @classmethod
    def validate_comprehensive_input(cls, value: str, field_name: str = "input") -> str:
        """
        Comprehensive input validation against multiple attack vectors
        
        Args:
            value: Input value to validate
            field_name: Name of the field being validated
            
        Returns:
            Sanitized input value
            
        Raises:
            InputValidationError: If malicious content detected
        """
        if not isinstance(value, str):
            raise InputValidationError(f"{field_name} must be a string")
        
        # Check for null bytes
        if '\x00' in value:
            raise InputValidationError(f"{field_name} contains null bytes")
        
        # Check for XSS patterns
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, value):
                raise InputValidationError(f"{field_name} contains potential XSS content")
        
        # Check for path traversal
        for pattern in cls.PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, value):
                raise InputValidationError(f"{field_name} contains path traversal attempt")
        
        # Check for command injection
        for pattern in cls.COMMAND_INJECTION_PATTERNS:
            if re.search(pattern, value):
                raise InputValidationError(f"{field_name} contains command injection attempt")
        
        # Validate against SQL injection (reuse existing)
        SQLInjectionValidator.validate_query_string(value)
        
        # HTML encode and sanitize
        sanitized = html.escape(value)
        sanitized = sanitized.strip()
        
        return sanitized
    
    @classmethod
    def validate_json_input(cls, json_str: str, max_size: int = 1024*1024) -> Dict:
        """
        Validate JSON input with size and content restrictions
        
        Args:
            json_str: JSON string to validate
            max_size: Maximum size in bytes
            
        Returns:
            Parsed JSON object
            
        Raises:
            InputValidationError: If validation fails
        """
        if len(json_str.encode('utf-8')) > max_size:
            raise InputValidationError(f"JSON input too large (max {max_size} bytes)")
        
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise InputValidationError(f"Invalid JSON: {str(e)}")
        
        # Recursively validate JSON values
        cls._validate_json_recursive(parsed)
        
        return parsed
    
    @classmethod
    def _validate_json_recursive(cls, obj: Any, depth: int = 0):
        """Recursively validate JSON object contents"""
        max_depth = 10
        max_string_length = 10000
        
        if depth > max_depth:
            raise InputValidationError("JSON structure too deep")
        
        if isinstance(obj, dict):
            if len(obj) > 100:  # Limit number of keys
                raise InputValidationError("Too many keys in JSON object")
            
            for key, value in obj.items():
                if isinstance(key, str):
                    cls.validate_comprehensive_input(key, "JSON key")
                cls._validate_json_recursive(value, depth + 1)
        
        elif isinstance(obj, list):
            if len(obj) > 1000:  # Limit array size
                raise InputValidationError("JSON array too large")
            
            for item in obj:
                cls._validate_json_recursive(item, depth + 1)
        
        elif isinstance(obj, str):
            if len(obj) > max_string_length:
                raise InputValidationError("JSON string value too long")
            cls.validate_comprehensive_input(obj, "JSON string value")

class SecureFormValidator:
    """Enhanced form validation for production security"""
    
    @classmethod
    def validate_email_comprehensive(cls, email: str) -> str:
        """
        Comprehensive email validation with security checks
        
        Args:
            email: Email address to validate
            
        Returns:
            Validated email address
            
        Raises:
            InputValidationError: If email is invalid or dangerous
        """
        if not email:
            raise InputValidationError("Email is required")
        
        # Basic format check
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise InputValidationError("Invalid email format")
        
        # Length check
        if len(email) > 254:
            raise InputValidationError("Email address too long")
        
        # Check for dangerous patterns
        ProductionInputValidator.validate_comprehensive_input(email, "email")
        
        # Domain validation
        domain = email.split('@')[1].lower()
        
        # Block common throwaway domains (optional)
        throwaway_domains = {
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'yopmail.com'
        }
        
        if domain in throwaway_domains:
            raise InputValidationError("Throwaway email domains not allowed")
        
        return email.lower()
    
    @classmethod
    def validate_phone_international(cls, phone: str, country_code: str = "US") -> str:
        """
        International phone number validation using phonenumbers library
        
        Args:
            phone: Phone number to validate
            country_code: Default country code
            
        Returns:
            Formatted phone number in E164 format
            
        Raises:
            InputValidationError: If phone number is invalid
        """
        if not phone:
            return ""
        
        try:
            parsed = phonenumbers.parse(phone, country_code)
            
            if not phonenumbers.is_valid_number(parsed):
                raise InputValidationError("Invalid phone number")
            
            # Format in E164 format for consistency
            formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            
            return formatted
            
        except NumberParseException as e:
            raise InputValidationError(f"Invalid phone number format: {str(e)}")
    
    @classmethod
    def validate_password_strength(cls, password: str) -> Dict[str, Any]:
        """
        Validate password strength and security
        
        Args:
            password: Password to validate
            
        Returns:
            Dictionary with validation results
            
        Raises:
            InputValidationError: If password doesn't meet requirements
        """
        if not password:
            raise InputValidationError("Password is required")
        
        min_length = 8
        max_length = 128
        
        # Length check
        if len(password) < min_length:
            raise InputValidationError(f"Password must be at least {min_length} characters")
        
        if len(password) > max_length:
            raise InputValidationError(f"Password must be no more than {max_length} characters")
        
        # Complexity checks
        checks = {
            'has_uppercase': bool(re.search(r'[A-Z]', password)),
            'has_lowercase': bool(re.search(r'[a-z]', password)),
            'has_digit': bool(re.search(r'\d', password)),
            'has_special': bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password)),
            'no_common_patterns': not cls._check_common_passwords(password),
            'no_personal_info': True,  # Would need user context to check properly
        }
        
        # Require at least 3 out of 4 character types
        char_type_count = sum([
            checks['has_uppercase'],
            checks['has_lowercase'], 
            checks['has_digit'],
            checks['has_special']
        ])
        
        if char_type_count < 3:
            raise InputValidationError(
                "Password must contain at least 3 of: uppercase, lowercase, digit, special character"
            )
        
        if not checks['no_common_patterns']:
            raise InputValidationError("Password is too common or predictable")
        
        # Calculate strength score
        strength_score = sum(checks.values()) * 100 // len(checks)
        
        return {
            'valid': True,
            'strength_score': strength_score,
            'checks': checks
        }
    
    @classmethod
    def _check_common_passwords(cls, password: str) -> bool:
        """Check against common password patterns"""
        common_patterns = [
            r'password\d*',
            r'123456\d*',
            r'qwerty\d*',
            r'admin\d*',
            r'letmein\d*',
            r'welcome\d*',
            r'monkey\d*',
            r'dragon\d*',
        ]
        
        password_lower = password.lower()
        
        for pattern in common_patterns:
            if re.fullmatch(pattern, password_lower):
                return True
        
        return False

class APIInputValidator:
    """API-specific input validation for production endpoints"""
    
    @classmethod
    def validate_api_pagination(cls, limit: Optional[int], offset: Optional[int]) -> Tuple[int, int]:
        """
        Validate API pagination parameters
        
        Args:
            limit: Number of items to return
            offset: Number of items to skip
            
        Returns:
            Tuple of validated (limit, offset)
        """
        # Default values
        default_limit = 20
        max_limit = 100
        
        # Validate limit
        if limit is None:
            limit = default_limit
        elif limit < 1:
            limit = default_limit
        elif limit > max_limit:
            limit = max_limit
        
        # Validate offset
        if offset is None:
            offset = 0
        elif offset < 0:
            offset = 0
        
        return limit, offset
    
    @classmethod
    def validate_sort_parameters(cls, sort_by: Optional[str], sort_order: Optional[str], 
                                allowed_fields: List[str]) -> Tuple[str, str]:
        """
        Validate API sorting parameters
        
        Args:
            sort_by: Field to sort by
            sort_order: Sort order (asc/desc)
            allowed_fields: List of allowed sort fields
            
        Returns:
            Tuple of validated (sort_by, sort_order)
        """
        # Validate sort_by
        if sort_by not in allowed_fields:
            sort_by = allowed_fields[0] if allowed_fields else 'id'
        
        # Validate sort_order
        if sort_order not in ['asc', 'desc']:
            sort_order = 'asc'
        
        return sort_by, sort_order
    
    @classmethod
    def validate_date_range(cls, start_date: Optional[str], end_date: Optional[str]) -> Tuple[Optional[date], Optional[date]]:
        """
        Validate date range parameters
        
        Args:
            start_date: Start date string (YYYY-MM-DD)
            end_date: End date string (YYYY-MM-DD)
            
        Returns:
            Tuple of validated date objects
        """
        validated_start = None
        validated_end = None
        
        if start_date:
            try:
                validated_start = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                raise InputValidationError("Invalid start_date format. Use YYYY-MM-DD")
        
        if end_date:
            try:
                validated_end = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                raise InputValidationError("Invalid end_date format. Use YYYY-MM-DD")
        
        # Validate date range logic
        if validated_start and validated_end:
            if validated_start > validated_end:
                raise InputValidationError("start_date cannot be after end_date")
            
            # Limit date range to prevent performance issues
            date_diff = (validated_end - validated_start).days
            if date_diff > 365:
                raise InputValidationError("Date range cannot exceed 365 days")
        
        return validated_start, validated_end

# Security utility functions
def generate_secure_token(length: int = 32) -> str:
    """Generate cryptographically secure random token"""
    import secrets
    return secrets.token_urlsafe(length)

def hash_sensitive_data(data: str, salt: Optional[str] = None) -> str:
    """Hash sensitive data with salt"""
    if salt is None:
        salt = generate_secure_token(16)
    
    hashed = hashlib.pbkdf2_hmac('sha256', data.encode(), salt.encode(), 100000)
    return f"{salt}${base64.b64encode(hashed).decode()}"

def verify_hashed_data(data: str, hashed: str) -> bool:
    """Verify hashed data"""
    try:
        salt, hash_value = hashed.split('$', 1)
        expected_hash = hashlib.pbkdf2_hmac('sha256', data.encode(), salt.encode(), 100000)
        return base64.b64encode(expected_hash).decode() == hash_value
    except:
        return False

# Usage example
if __name__ == "__main__":
    # Test comprehensive validation
    try:
        result = ProductionInputValidator.validate_comprehensive_input("normal input", "test_field")
        print("✅ Safe input validated")
    except InputValidationError as e:
        print(f"❌ Validation failed: {e.detail}")

    try:
        ProductionInputValidator.validate_comprehensive_input("<script>alert('xss')</script>", "test_field")
        print("❌ XSS not detected!")
    except InputValidationError as e:
        print(f"✅ XSS detected: {e.detail}")
