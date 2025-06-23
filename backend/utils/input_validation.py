"""
Enhanced input validation utilities for security
"""
import re
import magic
import mimetypes
from typing import Any, Dict, List, Optional, Tuple, Union
from fastapi import HTTPException, UploadFile, status
from pydantic import BaseModel, ValidationError, validator
import sqlparse
from urllib.parse import urlparse


class InputValidationError(HTTPException):
    """Custom exception for input validation errors"""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class FileUploadValidator:
    """Secure file upload validation"""
    
    # Allowed file types and their MIME types
    ALLOWED_TYPES = {
        'image': {
            'jpg': ['image/jpeg'],
            'jpeg': ['image/jpeg'],
            'png': ['image/png'],
            'gif': ['image/gif'],
            'webp': ['image/webp']
        },
        'document': {
            'pdf': ['application/pdf'],
            'doc': ['application/msword'],
            'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'txt': ['text/plain'],
            'csv': ['text/csv', 'application/csv']
        }
    }
    
    # Maximum file sizes (in bytes)
    MAX_SIZES = {
        'image': 5 * 1024 * 1024,  # 5MB
        'document': 10 * 1024 * 1024,  # 10MB
        'default': 1 * 1024 * 1024  # 1MB
    }
    
    @classmethod
    def validate_file(
        cls, 
        file: UploadFile, 
        allowed_categories: List[str] = ['image', 'document'],
        max_size: Optional[int] = None
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
        extension = filename.lower().split('.')[-1] if '.' in filename else ''
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
        max_allowed_size = max_size or cls.MAX_SIZES.get(file_category, cls.MAX_SIZES['default'])
        
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
            'filename': filename,
            'original_filename': file.filename,
            'size': len(file_content),
            'mime_type': detected_mime,
            'category': file_category,
            'extension': extension,
            'content': file_content
        }
    
    @classmethod
    def _sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename to prevent directory traversal"""
        # Remove path separators and dangerous characters
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        filename = re.sub(r'\.\.', '', filename)  # Remove .. sequences
        filename = filename.strip('.')  # Remove leading/trailing dots
        
        # Ensure filename isn't too long
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:250] + ('.' + ext if ext else '')
        
        return filename
    
    @classmethod
    def _check_malicious_content(cls, content: bytes, category: str):
        """Check for malicious content patterns"""
        content_str = content.decode('utf-8', errors='ignore').lower()
        
        # Check for script injections in any file type
        malicious_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'vbscript:',
            r'onload\s*=',
            r'onerror\s*=',
            r'eval\s*\(',
            r'document\.cookie',
            r'window\.location',
        ]
        
        for pattern in malicious_patterns:
            if re.search(pattern, content_str, re.IGNORECASE):
                raise InputValidationError("File contains potentially malicious content")
        
        # Category-specific checks
        if category == 'image':
            # Check for embedded scripts in image metadata
            if b'<script' in content or b'javascript:' in content:
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
            raise InputValidationError(f"Search term too long (max {max_length} characters)")
        
        # Validate against SQL injection
        cls.validate_query_string(term)
        
        # Sanitize special characters but keep search functionality
        sanitized = re.sub(r'[<>"\']', '', term)
        sanitized = re.sub(r'--', '', sanitized)
        sanitized = re.sub(r'/\*.*?\*/', '', sanitized)
        
        return sanitized.strip()


class URLValidator:
    """Validate URLs for security"""
    
    ALLOWED_SCHEMES = ['http', 'https']
    BLOCKED_DOMAINS = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '10.',
        '192.168.',
        '172.16.',
        '172.17.',
        '172.18.',
        '172.19.',
        '172.20.',
        '172.21.',
        '172.22.',
        '172.23.',
        '172.24.',
        '172.25.',
        '172.26.',
        '172.27.',
        '172.28.',
        '172.29.',
        '172.30.',
        '172.31.'
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
                        raise InputValidationError("Internal/private network URLs not allowed")
        
        return url


class DataValidator:
    """General data validation utilities"""
    
    @classmethod
    def validate_phone_number(cls, phone: str) -> str:
        """Validate and format phone number"""
        if not phone:
            return ""
        
        # Remove all non-digit characters
        digits_only = re.sub(r'[^\d]', '', phone)
        
        # Check if it's a valid US phone number format
        if len(digits_only) == 10:
            # Format as (XXX) XXX-XXXX
            return f"({digits_only[:3]}) {digits_only[3:6]}-{digits_only[6:]}"
        elif len(digits_only) == 11 and digits_only.startswith('1'):
            # Remove leading 1 and format
            return f"({digits_only[1:4]}) {digits_only[4:7]}-{digits_only[7:]}"
        else:
            raise InputValidationError("Invalid phone number format")
    
    @classmethod
    def validate_email_domain(cls, email: str, allowed_domains: Optional[List[str]] = None) -> bool:
        """Validate email domain against allowlist"""
        if not email or '@' not in email:
            return False
        
        if not allowed_domains:
            return True
        
        domain = email.split('@')[1].lower()
        return domain in [d.lower() for d in allowed_domains]
    
    @classmethod
    def sanitize_html_input(cls, text: str) -> str:
        """Sanitize HTML input to prevent XSS"""
        if not text:
            return ""
        
        # Remove potentially dangerous HTML tags and attributes
        dangerous_patterns = [
            r'<script[^>]*>.*?</script>',
            r'<iframe[^>]*>.*?</iframe>',
            r'<object[^>]*>.*?</object>',
            r'<embed[^>]*>.*?</embed>',
            r'<link[^>]*>',
            r'<meta[^>]*>',
            r'on\w+\s*=\s*["\'][^"\']*["\']',  # Event handlers
            r'javascript\s*:',
            r'vbscript\s*:',
            r'data\s*:',
        ]
        
        sanitized = text
        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE | re.DOTALL)
        
        return sanitized
    
    @classmethod
    def validate_pagination_params(cls, limit: int, offset: int, max_limit: int = 100) -> Tuple[int, int]:
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


# Usage example
if __name__ == "__main__":
    # Test SQL injection validation
    try:
        SQLInjectionValidator.validate_query_string("normal search term")
        print("✅ Safe query validated")
    except InputValidationError as e:
        print(f"❌ Validation failed: {e.detail}")
    
    try:
        SQLInjectionValidator.validate_query_string("'; DROP TABLE users; --")
        print("❌ SQL injection not detected!")
    except InputValidationError as e:
        print(f"✅ SQL injection detected: {e.detail}")