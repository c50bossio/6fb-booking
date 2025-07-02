"""
Input sanitization utilities for preventing XSS and injection attacks
"""
import re
import html
from typing import Optional
import bleach


# Allowed HTML tags for product descriptions
ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 
    'h3', 'h4', 'h5', 'h6', 'blockquote'
]

# Allowed HTML attributes
ALLOWED_ATTRIBUTES = {
    '*': ['class'],  # Allow class attribute on all tags
}


def sanitize_html(content: Optional[str]) -> Optional[str]:
    """
    Sanitize HTML content to prevent XSS attacks.
    Allows basic formatting tags but strips dangerous content.
    """
    if not content:
        return content
    
    # First, clean with bleach to remove dangerous tags/attributes
    cleaned = bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True  # Strip disallowed tags instead of escaping
    )
    
    # Additional cleaning for javascript: and data: URLs
    cleaned = re.sub(r'javascript:', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'data:', '', cleaned, flags=re.IGNORECASE)
    
    # Remove any remaining script tags that might have slipped through
    cleaned = re.sub(r'<script[^>]*>.*?</script>', '', cleaned, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove event handlers
    cleaned = re.sub(r'\son\w+\s*=', '', cleaned, flags=re.IGNORECASE)
    
    return cleaned


def sanitize_plain_text(content: Optional[str]) -> Optional[str]:
    """
    Sanitize plain text by escaping HTML entities.
    Use this for content that should not contain any HTML.
    """
    if not content:
        return content
    
    return html.escape(content)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent directory traversal attacks.
    """
    # Remove any path separators
    filename = filename.replace('/', '').replace('\\', '')
    
    # Remove special characters that could be problematic
    filename = re.sub(r'[^\w\s.-]', '', filename)
    
    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')
    
    # Limit length
    max_length = 255
    if len(filename) > max_length:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:max_length - len(ext) - 1] + '.' + ext if ext else name[:max_length]
    
    return filename or 'unnamed'


def sanitize_url(url: Optional[str]) -> Optional[str]:
    """
    Sanitize URLs to prevent javascript: and data: schemes.
    """
    if not url:
        return url
    
    url = url.strip()
    
    # Check for dangerous schemes
    dangerous_schemes = ['javascript:', 'data:', 'vbscript:', 'file:']
    lower_url = url.lower()
    
    for scheme in dangerous_schemes:
        if lower_url.startswith(scheme):
            return '#'  # Return safe default
    
    # Ensure URL starts with http/https or is relative
    if not (url.startswith('http://') or url.startswith('https://') or url.startswith('/')):
        url = 'https://' + url
    
    return url


def sanitize_decimal(value: any, default: float = 0.0) -> float:
    """
    Sanitize decimal/float inputs to prevent injection and ensure valid numbers.
    """
    if value is None:
        return default
    
    try:
        # Convert to string first to handle various input types
        str_value = str(value)
        
        # Remove any non-numeric characters except . and -
        cleaned = re.sub(r'[^0-9.-]', '', str_value)
        
        # Ensure only one decimal point
        parts = cleaned.split('.')
        if len(parts) > 2:
            cleaned = parts[0] + '.' + ''.join(parts[1:])
        
        # Convert to float
        result = float(cleaned)
        
        # Validate reasonable bounds for financial data
        if result < -1000000000 or result > 1000000000:  # $1 billion limit
            return default
        
        return result
    except (ValueError, TypeError):
        return default


def sanitize_integer(value: any, default: int = 0) -> int:
    """
    Sanitize integer inputs to prevent injection and ensure valid numbers.
    """
    if value is None:
        return default
    
    try:
        # Convert to string first to handle various input types
        str_value = str(value)
        
        # Remove any non-numeric characters except -
        cleaned = re.sub(r'[^0-9-]', '', str_value)
        
        # Convert to int
        result = int(cleaned)
        
        # Validate reasonable bounds
        if result < -2147483648 or result > 2147483647:  # 32-bit int limits
            return default
        
        return result
    except (ValueError, TypeError):
        return default


def sanitize_input(value: any) -> str:
    """
    General input sanitization for strings, removing potentially dangerous characters.
    Used for general text inputs like keywords, names, etc.
    """
    if value is None:
        return ""
    
    # Convert to string
    text = str(value)
    
    # Remove potentially dangerous characters that could be used for injection
    # Keep alphanumeric, spaces, hyphens, apostrophes, and basic punctuation
    sanitized = re.sub(r'[<>"\';\\&]', '', text)
    
    # Remove SQL injection patterns
    sql_patterns = [
        r'drop\s+table',
        r'delete\s+from',
        r'insert\s+into',
        r'update\s+\w+\s+set',
        r'union\s+select',
        r'exec\s*\(',
        r'--',
        r'/\*.*?\*/',
    ]
    
    for pattern in sql_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
    
    # Remove excessive whitespace
    sanitized = re.sub(r'\s+', ' ', sanitized)
    
    # Strip leading/trailing whitespace
    sanitized = sanitized.strip()
    
    # Limit length to prevent resource exhaustion
    max_length = 1000
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized


def validate_text_content(content: str) -> bool:
    """
    Validate text content for potential security threats.
    Returns False if content contains suspicious patterns.
    """
    if not content:
        return True
    
    # Check for script injection patterns
    script_patterns = [
        r'<script[^>]*>',
        r'javascript:',
        r'vbscript:',
        r'data:',
        r'on\w+\s*=',  # Event handlers like onclick=
        r'eval\s*\(',
        r'expression\s*\(',
        r'url\s*\(',
        r'import\s*\(',
    ]
    
    content_lower = content.lower()
    
    for pattern in script_patterns:
        if re.search(pattern, content_lower, re.IGNORECASE):
            return False
    
    # Check for SQL injection patterns
    sql_patterns = [
        r'union\s+select',
        r'drop\s+table',
        r'delete\s+from',
        r'insert\s+into',
        r'update\s+\w+\s+set',
        r'exec\s*\(',
        r'sp_\w+',
        r'xp_\w+',
    ]
    
    for pattern in sql_patterns:
        if re.search(pattern, content_lower, re.IGNORECASE):
            return False
    
    # Check for excessive special characters (potential obfuscation)
    special_char_ratio = len(re.findall(r'[^\w\s]', content)) / len(content) if content else 0
    if special_char_ratio > 0.3:  # More than 30% special characters
        return False
    
    return True