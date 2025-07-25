"""
Shared Utility Library for BookedBarber V2

This module provides common utility functions used across the application,
reducing code duplication and providing consistent implementations.
"""

import re
import uuid
import hashlib
import secrets
import asyncio
from typing import Any, Dict, List, Optional, Union, Callable, TypeVar
from datetime import datetime, date, time, timedelta, timezone
from functools import wraps
from decimal import Decimal, ROUND_HALF_UP
import logging
from enum import Enum
import json

logger = logging.getLogger(__name__)

T = TypeVar('T')
F = TypeVar('F', bound=Callable[..., Any])


# String Utilities
class StringUtils:
    """String manipulation utilities"""
    
    @staticmethod
    def generate_id(prefix: str = "") -> str:
        """Generate a unique identifier with optional prefix"""
        unique_id = str(uuid.uuid4()).replace('-', '')[:12]
        return f"{prefix}_{unique_id}" if prefix else unique_id
    
    @staticmethod
    def slugify(text: str) -> str:
        """Convert text to URL-friendly slug"""
        text = text.lower().strip()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[-\s]+', '-', text)
        return text.strip('-')
    
    @staticmethod
    def truncate(text: str, max_length: int, suffix: str = "...") -> str:
        """Truncate text to maximum length with suffix"""
        if len(text) <= max_length:
            return text
        return text[:max_length - len(suffix)] + suffix
    
    @staticmethod
    def mask_email(email: str) -> str:
        """Mask email address for privacy (e.g., j***@example.com)"""
        if '@' not in email:
            return email
        
        local, domain = email.split('@', 1)
        if len(local) <= 2:
            masked_local = local[0] + '*' * (len(local) - 1)
        else:
            masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
        
        return f"{masked_local}@{domain}"
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """Mask phone number for privacy (e.g., ***-***-1234)"""
        digits = re.sub(r'\D', '', phone)
        if len(digits) >= 4:
            return f"***-***-{digits[-4:]}"
        return phone
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email address format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number format (US format)"""
        digits = re.sub(r'\D', '', phone)
        return len(digits) == 10 or (len(digits) == 11 and digits[0] == '1')
    
    @staticmethod
    def format_phone(phone: str) -> str:
        """Format phone number to (XXX) XXX-XXXX"""
        digits = re.sub(r'\D', '', phone)
        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == '1':
            return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        return phone


# Date/Time Utilities
class DateTimeUtils:
    """Date and time manipulation utilities"""
    
    @staticmethod
    def now_utc() -> datetime:
        """Get current UTC datetime"""
        return datetime.now(timezone.utc)
    
    @staticmethod
    def to_timezone(dt: datetime, tz_name: str) -> datetime:
        """Convert datetime to specific timezone"""
        from zoneinfo import ZoneInfo  # Python 3.9+
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(ZoneInfo(tz_name))
    
    @staticmethod
    def format_duration(start: datetime, end: datetime) -> str:
        """Format duration between two datetimes"""
        delta = end - start
        hours, remainder = divmod(delta.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        
        if delta.days > 0:
            return f"{delta.days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    
    @staticmethod
    def business_hours_only(dt: datetime, start_hour: int = 9, end_hour: int = 17) -> bool:
        """Check if datetime is within business hours"""
        return start_hour <= dt.hour < end_hour and dt.weekday() < 5
    
    @staticmethod
    def round_to_nearest_minute(dt: datetime, minutes: int = 15) -> datetime:
        """Round datetime to nearest N minutes"""
        rounded_minute = (dt.minute // minutes) * minutes
        return dt.replace(minute=rounded_minute, second=0, microsecond=0)
    
    @staticmethod
    def get_week_range(dt: datetime) -> tuple[datetime, datetime]:
        """Get start and end of week for given datetime"""
        start_of_week = dt - timedelta(days=dt.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
        return start_of_week, end_of_week
    
    @staticmethod
    def get_month_range(dt: datetime) -> tuple[datetime, datetime]:
        """Get start and end of month for given datetime"""
        start_of_month = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = start_of_month.replace(month=start_of_month.month + 1) if start_of_month.month < 12 else start_of_month.replace(year=start_of_month.year + 1, month=1)
        end_of_month = next_month - timedelta(microseconds=1)
        return start_of_month, end_of_month


# Financial Utilities
class MoneyUtils:
    """Money and financial calculation utilities"""
    
    @staticmethod
    def round_currency(amount: Union[float, Decimal], places: int = 2) -> Decimal:
        """Round currency amount to specified decimal places"""
        decimal_amount = Decimal(str(amount))
        return decimal_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    @staticmethod
    def format_currency(amount: Union[float, Decimal], currency: str = "USD") -> str:
        """Format amount as currency string"""
        rounded_amount = MoneyUtils.round_currency(amount)
        if currency == "USD":
            return f"${rounded_amount:,.2f}"
        else:
            return f"{rounded_amount:,.2f} {currency}"
    
    @staticmethod
    def cents_to_dollars(cents: int) -> Decimal:
        """Convert cents to dollar amount"""
        return Decimal(cents) / 100
    
    @staticmethod
    def dollars_to_cents(dollars: Union[float, Decimal]) -> int:
        """Convert dollar amount to cents"""
        return int(MoneyUtils.round_currency(dollars) * 100)
    
    @staticmethod
    def calculate_percentage(amount: Union[float, Decimal], percentage: Union[float, Decimal]) -> Decimal:
        """Calculate percentage of amount"""
        return MoneyUtils.round_currency(Decimal(str(amount)) * Decimal(str(percentage)) / 100)
    
    @staticmethod
    def calculate_tax(amount: Union[float, Decimal], tax_rate: Union[float, Decimal]) -> Decimal:
        """Calculate tax amount"""
        return MoneyUtils.calculate_percentage(amount, tax_rate)
    
    @staticmethod
    def calculate_tip(amount: Union[float, Decimal], tip_percentage: Union[float, Decimal]) -> Decimal:
        """Calculate tip amount"""
        return MoneyUtils.calculate_percentage(amount, tip_percentage)


# Security Utilities
class SecurityUtils:
    """Security and cryptography utilities"""
    
    @staticmethod
    def generate_token(length: int = 32) -> str:
        """Generate secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_verification_code(length: int = 6) -> str:
        """Generate numeric verification code"""
        return ''.join([secrets.choice('0123456789') for _ in range(length)])
    
    @staticmethod
    def hash_string(text: str, salt: Optional[str] = None) -> str:
        """Hash string with optional salt"""
        if salt is None:
            salt = secrets.token_hex(16)
        
        hash_input = (text + salt).encode('utf-8')
        hashed = hashlib.sha256(hash_input).hexdigest()
        return f"{salt}:{hashed}"
    
    @staticmethod
    def verify_hash(text: str, hashed: str) -> bool:
        """Verify string against hash"""
        try:
            salt, hash_value = hashed.split(':', 1)
            return SecurityUtils.hash_string(text, salt) == hashed
        except ValueError:
            return False
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        # Remove path separators and dangerous characters
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        filename = filename.strip('. ')
        return filename or 'file'


# Collection Utilities
class CollectionUtils:
    """Collection manipulation utilities"""
    
    @staticmethod
    def chunk_list(lst: List[T], chunk_size: int) -> List[List[T]]:
        """Split list into chunks of specified size"""
        return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]
    
    @staticmethod
    def flatten_list(nested_list: List[List[T]]) -> List[T]:
        """Flatten nested list"""
        return [item for sublist in nested_list for item in sublist]
    
    @staticmethod
    def group_by(lst: List[T], key_func: Callable[[T], Any]) -> Dict[Any, List[T]]:
        """Group list items by key function"""
        groups = {}
        for item in lst:
            key = key_func(item)
            if key not in groups:
                groups[key] = []
            groups[key].append(item)
        return groups
    
    @staticmethod
    def unique_by(lst: List[T], key_func: Callable[[T], Any]) -> List[T]:
        """Get unique items by key function"""
        seen = set()
        result = []
        for item in lst:
            key = key_func(item)
            if key not in seen:
                seen.add(key)
                result.append(item)
        return result
    
    @staticmethod
    def safe_get(dictionary: Dict[str, Any], path: str, default: Any = None) -> Any:
        """Safely get nested dictionary value using dot notation"""
        keys = path.split('.')
        value = dictionary
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        
        return value


# Async Utilities
class AsyncUtils:
    """Asynchronous operation utilities"""
    
    @staticmethod
    async def gather_with_limit(tasks: List[Callable], limit: int = 10) -> List[Any]:
        """Execute async tasks with concurrency limit"""
        semaphore = asyncio.Semaphore(limit)
        
        async def limited_task(task):
            async with semaphore:
                return await task()
        
        return await asyncio.gather(*[limited_task(task) for task in tasks])
    
    @staticmethod
    async def retry_async(func: Callable, max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0) -> Any:
        """Retry async function with exponential backoff"""
        for attempt in range(max_retries + 1):
            try:
                return await func()
            except Exception as e:
                if attempt == max_retries:
                    raise e
                
                wait_time = delay * (backoff ** attempt)
                logger.warning(f"Attempt {attempt + 1} failed, retrying in {wait_time}s: {str(e)}")
                await asyncio.sleep(wait_time)


# Decorators
def retry(max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """Retry decorator for functions"""
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries:
                        raise e
                    
                    wait_time = delay * (backoff ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {wait_time}s: {str(e)}")
                    import time
                    time.sleep(wait_time)
        
        return wrapper
    return decorator


def timing(func: F) -> F:
    """Timing decorator to measure function execution time"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = datetime.now()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            end_time = datetime.now()
            duration = end_time - start_time
            logger.debug(f"{func.__name__} took {duration.total_seconds():.3f} seconds")
    
    return wrapper


def async_timing(func: F) -> F:
    """Async timing decorator"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = datetime.now()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            end_time = datetime.now()
            duration = end_time - start_time
            logger.debug(f"{func.__name__} took {duration.total_seconds():.3f} seconds")
    
    return wrapper


def cached_property(func: F) -> F:
    """Simple cached property decorator"""
    cache = {}
    
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        key = (id(self), args, tuple(sorted(kwargs.items())))
        if key not in cache:
            cache[key] = func(self, *args, **kwargs)
        return cache[key]
    
    return wrapper


# Validation Utilities
class ValidationUtils:
    """Input validation utilities"""
    
    @staticmethod
    def validate_uuid(uuid_string: str) -> bool:
        """Validate UUID format"""
        try:
            uuid.UUID(uuid_string)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def validate_price(price: Union[str, float, Decimal]) -> bool:
        """Validate price format and range"""
        try:
            decimal_price = Decimal(str(price))
            return decimal_price >= 0 and decimal_price <= 10000  # Max $10,000
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def validate_time_slot(time_str: str) -> bool:
        """Validate time slot format (HH:MM)"""
        try:
            time.fromisoformat(time_str)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def validate_date_range(start_date: str, end_date: str) -> bool:
        """Validate date range"""
        try:
            start = date.fromisoformat(start_date)
            end = date.fromisoformat(end_date)
            return start <= end
        except ValueError:
            return False


# JSON Utilities
class JSONUtils:
    """JSON serialization utilities"""
    
    @staticmethod
    def serialize_datetime(obj: Any) -> Any:
        """JSON serializer for datetime objects"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, date):
            return obj.isoformat()
        elif isinstance(obj, time):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, Enum):
            return obj.value
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    @staticmethod
    def safe_json_loads(json_str: str, default: Any = None) -> Any:
        """Safely parse JSON string"""
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, TypeError):
            return default
    
    @staticmethod
    def safe_json_dumps(obj: Any, default: Any = None) -> str:
        """Safely serialize object to JSON"""
        try:
            return json.dumps(obj, default=JSONUtils.serialize_datetime)
        except (TypeError, ValueError):
            return json.dumps(default) if default is not None else "{}"


# Error Handling Utilities
class ErrorUtils:
    """Error handling and logging utilities"""
    
    @staticmethod
    def log_error(error: Exception, context: Optional[Dict[str, Any]] = None) -> str:
        """Log error with context and return error ID"""
        error_id = StringUtils.generate_id("err")
        error_msg = f"[{error_id}] {type(error).__name__}: {str(error)}"
        
        if context:
            error_msg += f" | Context: {json.dumps(context, default=str)}"
        
        logger.error(error_msg, exc_info=True)
        return error_id
    
    @staticmethod
    def create_error_response(message: str, error_code: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create standardized error response"""
        response = {
            "error": {
                "message": message,
                "code": error_code,
                "timestamp": DateTimeUtils.now_utc().isoformat()
            }
        }
        
        if details:
            response["error"]["details"] = details
        
        return response