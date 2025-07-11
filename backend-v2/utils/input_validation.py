"""
Comprehensive input validation utilities for secure API endpoints.
Prevents injection attacks, data corruption, and resource exhaustion.
"""

import re
import os
import magic
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation
from pydantic import BaseModel, validator, EmailStr, constr, conint, condecimal
from fastapi import HTTPException, UploadFile, status
import bleach
from email_validator import validate_email, EmailNotValidError
import pytz
from pathlib import Path

# Security constants
MAX_STRING_LENGTH = 1000
MAX_TEXT_LENGTH = 10000
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_ARRAY_SIZE = 100
MAX_JSON_DEPTH = 5
MIN_AMOUNT = Decimal("0.01")
MAX_AMOUNT = Decimal("999999.99")
ALLOWED_FILE_EXTENSIONS = {'.csv', '.xlsx', '.xls', '.pdf', '.png', '.jpg', '.jpeg'}
ALLOWED_MIME_TYPES = {
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'image/png',
    'image/jpeg'
}

# Regex patterns for validation
SLUG_PATTERN = re.compile(r'^[a-z0-9-]+$')
PHONE_PATTERN = re.compile(r'^\+?1?\d{10,15}$')
ALPHANUMERIC_PATTERN = re.compile(r'^[a-zA-Z0-9\s_-]+$')
SQL_INJECTION_PATTERN = re.compile(
    r'(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)\b)',
    re.IGNORECASE
)

class ValidationError(HTTPException):
    """Custom validation error with consistent format"""
    def __init__(self, message: str, field: Optional[str] = None):
        detail = {"message": message}
        if field:
            detail["field"] = field
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )

def validate_string(
    value: Optional[str],
    field_name: str,
    min_length: int = 0,
    max_length: int = MAX_STRING_LENGTH,
    pattern: Optional[re.Pattern] = None,
    allow_none: bool = False,
    strip_html: bool = True
) -> Optional[str]:
    """
    Validate and sanitize string input.
    
    Args:
        value: String to validate
        field_name: Name of field for error messages
        min_length: Minimum allowed length
        max_length: Maximum allowed length
        pattern: Regex pattern to match
        allow_none: Whether None is allowed
        strip_html: Whether to strip HTML tags
    
    Returns:
        Sanitized string or None
    
    Raises:
        ValidationError: If validation fails
    """
    if value is None:
        if allow_none:
            return None
        raise ValidationError(f"{field_name} is required")
    
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string")
    
    # Strip whitespace
    value = value.strip()
    
    # Check for SQL injection attempts
    if SQL_INJECTION_PATTERN.search(value):
        raise ValidationError(f"Invalid characters in {field_name}")
    
    # Strip HTML if requested
    if strip_html:
        value = bleach.clean(value, tags=[], strip=True)
    
    # Check length
    if len(value) < min_length:
        raise ValidationError(f"{field_name} must be at least {min_length} characters")
    
    if len(value) > max_length:
        raise ValidationError(f"{field_name} must not exceed {max_length} characters")
    
    # Check pattern if provided
    if pattern and not pattern.match(value):
        raise ValidationError(f"Invalid format for {field_name}")
    
    return value

def validate_email_address(email: Optional[str], field_name: str = "email") -> str:
    """Validate email address format and domain"""
    if not email:
        raise ValidationError(f"{field_name} is required")
    
    try:
        # Validate and normalize email
        validation = validate_email(email, check_deliverability=False)
        return validation.email
    except EmailNotValidError as e:
        raise ValidationError(f"Invalid {field_name}: {str(e)}")

def validate_phone_number(phone: Optional[str], field_name: str = "phone") -> str:
    """Validate phone number format"""
    if not phone:
        raise ValidationError(f"{field_name} is required")
    
    # Remove common separators
    phone = re.sub(r'[\s\-\(\)]+', '', phone)
    
    if not PHONE_PATTERN.match(phone):
        raise ValidationError(f"Invalid {field_name} format")
    
    return phone

def validate_integer(
    value: Any,
    field_name: str,
    min_value: Optional[int] = None,
    max_value: Optional[int] = None,
    allow_none: bool = False
) -> Optional[int]:
    """Validate integer input with bounds checking"""
    if value is None:
        if allow_none:
            return None
        raise ValidationError(f"{field_name} is required")
    
    try:
        int_value = int(value)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be a valid integer")
    
    if min_value is not None and int_value < min_value:
        raise ValidationError(f"{field_name} must be at least {min_value}")
    
    if max_value is not None and int_value > max_value:
        raise ValidationError(f"{field_name} must not exceed {max_value}")
    
    return int_value

def validate_decimal(
    value: Any,
    field_name: str,
    min_value: Optional[Decimal] = None,
    max_value: Optional[Decimal] = None,
    decimal_places: int = 2,
    allow_none: bool = False
) -> Optional[Decimal]:
    """Validate decimal/money input"""
    if value is None:
        if allow_none:
            return None
        raise ValidationError(f"{field_name} is required")
    
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValidationError(f"{field_name} must be a valid decimal number")
    
    # Check decimal places
    if decimal_value.as_tuple().exponent < -decimal_places:
        raise ValidationError(f"{field_name} must have at most {decimal_places} decimal places")
    
    if min_value is not None and decimal_value < min_value:
        raise ValidationError(f"{field_name} must be at least {min_value}")
    
    if max_value is not None and decimal_value > max_value:
        raise ValidationError(f"{field_name} must not exceed {max_value}")
    
    return decimal_value

def validate_date(
    value: Any,
    field_name: str,
    min_date: Optional[date] = None,
    max_date: Optional[date] = None,
    allow_none: bool = False
) -> Optional[date]:
    """Validate date input"""
    if value is None:
        if allow_none:
            return None
        raise ValidationError(f"{field_name} is required")
    
    # Handle string input
    if isinstance(value, str):
        try:
            # Try common date formats
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']:
                try:
                    value = datetime.strptime(value, fmt).date()
                    break
                except ValueError:
                    continue
            else:
                raise ValueError("Invalid date format")
        except ValueError:
            raise ValidationError(f"{field_name} must be a valid date (YYYY-MM-DD)")
    
    # Handle datetime input
    if isinstance(value, datetime):
        value = value.date()
    
    if not isinstance(value, date):
        raise ValidationError(f"{field_name} must be a valid date")
    
    # Check bounds
    if min_date and value < min_date:
        raise ValidationError(f"{field_name} cannot be before {min_date}")
    
    if max_date and value > max_date:
        raise ValidationError(f"{field_name} cannot be after {max_date}")
    
    return value

def validate_datetime(
    value: Any,
    field_name: str,
    min_datetime: Optional[datetime] = None,
    max_datetime: Optional[datetime] = None,
    timezone: Optional[str] = None,
    allow_none: bool = False
) -> Optional[datetime]:
    """Validate datetime input with timezone support"""
    if value is None:
        if allow_none:
            return None
        raise ValidationError(f"{field_name} is required")
    
    # Handle string input
    if isinstance(value, str):
        try:
            # Try ISO format first
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            try:
                # Try other common formats
                dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                raise ValidationError(f"{field_name} must be a valid datetime")
    elif isinstance(value, datetime):
        dt = value
    else:
        raise ValidationError(f"{field_name} must be a valid datetime")
    
    # Apply timezone if specified
    if timezone:
        try:
            tz = pytz.timezone(timezone)
            if dt.tzinfo is None:
                dt = tz.localize(dt)
            else:
                dt = dt.astimezone(tz)
        except pytz.exceptions.UnknownTimeZoneError:
            raise ValidationError(f"Invalid timezone: {timezone}")
    
    # Check bounds
    if min_datetime and dt < min_datetime:
        raise ValidationError(f"{field_name} cannot be before {min_datetime}")
    
    if max_datetime and dt > max_datetime:
        raise ValidationError(f"{field_name} cannot be after {max_datetime}")
    
    return dt

def validate_array(
    value: Any,
    field_name: str,
    min_length: int = 0,
    max_length: int = MAX_ARRAY_SIZE,
    allow_none: bool = False,
    item_validator: Optional[callable] = None
) -> Optional[List[Any]]:
    """Validate array/list input"""
    if value is None:
        if allow_none:
            return None
        raise ValidationError(f"{field_name} is required")
    
    if not isinstance(value, list):
        raise ValidationError(f"{field_name} must be an array")
    
    if len(value) < min_length:
        raise ValidationError(f"{field_name} must have at least {min_length} items")
    
    if len(value) > max_length:
        raise ValidationError(f"{field_name} must not exceed {max_length} items")
    
    # Validate individual items if validator provided
    if item_validator:
        validated_items = []
        for i, item in enumerate(value):
            try:
                validated_items.append(item_validator(item))
            except ValidationError as e:
                raise ValidationError(f"{field_name}[{i}]: {e.detail}")
        return validated_items
    
    return value

async def validate_file_upload(
    file: UploadFile,
    field_name: str = "file",
    max_size: int = MAX_FILE_SIZE,
    allowed_extensions: Optional[set] = None,
    allowed_mime_types: Optional[set] = None
) -> UploadFile:
    """
    Validate uploaded file for security.
    
    Args:
        file: Uploaded file
        field_name: Field name for errors
        max_size: Maximum file size in bytes
        allowed_extensions: Set of allowed file extensions
        allowed_mime_types: Set of allowed MIME types
    
    Returns:
        Validated file
    
    Raises:
        ValidationError: If validation fails
    """
    if not file or not file.filename:
        raise ValidationError(f"{field_name} is required")
    
    # Sanitize filename
    filename = Path(file.filename).name
    if not filename or filename.startswith('.'):
        raise ValidationError(f"Invalid {field_name} name")
    
    # Check extension
    file_ext = Path(filename).suffix.lower()
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_FILE_EXTENSIONS
    
    if file_ext not in allowed_extensions:
        raise ValidationError(
            f"Invalid {field_name} type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Read file content for validation (limit to first 1MB for efficiency)
    content = await file.read(1024 * 1024)
    await file.seek(0)  # Reset file position
    
    # Check file size
    file_size = len(content)
    if file_size > max_size:
        raise ValidationError(
            f"{field_name} size exceeds maximum allowed size of {max_size / 1024 / 1024:.1f}MB"
        )
    
    # Verify MIME type using file content
    if allowed_mime_types is None:
        allowed_mime_types = ALLOWED_MIME_TYPES
    
    try:
        mime = magic.Magic(mime=True)
        detected_mime = mime.from_buffer(content)
        
        if detected_mime not in allowed_mime_types:
            raise ValidationError(
                f"Invalid {field_name} content type. File content does not match extension."
            )
    except Exception:
        # If magic fails, at least check the extension
        pass
    
    return file

def validate_slug(value: str, field_name: str = "slug") -> str:
    """Validate URL slug format"""
    if not value:
        raise ValidationError(f"{field_name} is required")
    
    value = value.lower().strip()
    
    if not SLUG_PATTERN.match(value):
        raise ValidationError(
            f"{field_name} must contain only lowercase letters, numbers, and hyphens"
        )
    
    if len(value) < 3:
        raise ValidationError(f"{field_name} must be at least 3 characters")
    
    if len(value) > 50:
        raise ValidationError(f"{field_name} must not exceed 50 characters")
    
    return value

def validate_enum(value: Any, enum_class: type, field_name: str) -> Any:
    """Validate enum value"""
    if value is None:
        raise ValidationError(f"{field_name} is required")
    
    try:
        if isinstance(value, str):
            return enum_class(value)
        elif isinstance(value, enum_class):
            return value
        else:
            raise ValueError()
    except ValueError:
        valid_values = [e.value for e in enum_class]
        raise ValidationError(
            f"Invalid {field_name}. Must be one of: {', '.join(valid_values)}"
        )

def validate_json_depth(obj: Any, max_depth: int = MAX_JSON_DEPTH, current_depth: int = 0) -> None:
    """Validate JSON object depth to prevent resource exhaustion"""
    if current_depth > max_depth:
        raise ValidationError(f"JSON object exceeds maximum depth of {max_depth}")
    
    if isinstance(obj, dict):
        for value in obj.values():
            validate_json_depth(value, max_depth, current_depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            validate_json_depth(item, max_depth, current_depth + 1)

def sanitize_html(html: str, allowed_tags: Optional[List[str]] = None) -> str:
    """Sanitize HTML content to prevent XSS"""
    if allowed_tags is None:
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
    
    allowed_attributes = {
        'a': ['href', 'title'],
    }
    
    return bleach.clean(
        html,
        tags=allowed_tags,
        attributes=allowed_attributes,
        strip=True
    )

# Pydantic models for common validations
class PaginationParams(BaseModel):
    """Validated pagination parameters"""
    skip: conint(ge=0, le=10000) = 0
    limit: conint(ge=1, le=100) = 20

class DateRangeParams(BaseModel):
    """Validated date range parameters"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            if v < values['start_date']:
                raise ValueError('end_date must be after start_date')
        return v

class MoneyAmount(BaseModel):
    """Validated money amount"""
    amount: condecimal(gt=0, max_digits=10, decimal_places=2)
    currency: constr(pattern='^[A-Z]{3}$') = 'USD'

class PhoneNumber(BaseModel):
    """Validated phone number"""
    number: constr(pattern=r'^\+?1?\d{10,15}$')
    
    @validator('number')
    def clean_phone(cls, v):
        return re.sub(r'[\s\-\(\)]+', '', v)

# Validation decorators for endpoints
def validate_request_size(max_size: int = 1024 * 1024):  # 1MB default
    """Decorator to limit request body size"""
    def decorator(func):
        async def wrapper(request, *args, **kwargs):
            content_length = request.headers.get('content-length')
            if content_length and int(content_length) > max_size:
                raise ValidationError(
                    f"Request body too large. Maximum size: {max_size / 1024 / 1024:.1f}MB"
                )
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator