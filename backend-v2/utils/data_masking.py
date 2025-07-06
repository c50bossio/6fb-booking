"""
Data Masking Utilities for Sensitive Financial Data in Logs

Provides comprehensive data masking functionality to protect sensitive financial
information and PII while maintaining debugging capability for 6FB Booking Platform.

Key Features:
- Financial amount masking (show only last 2 digits)
- Credit card number masking
- Email and phone number masking
- User ID and sensitive field masking
- Configurable masking patterns
- Safe logging formatters
"""

import re
import logging
from typing import Any, Dict, List, Union, Optional
from decimal import Decimal
import json


class DataMasker:
    """
    Comprehensive data masking utility for sensitive information
    """
    
    # Sensitive field patterns
    SENSITIVE_PATTERNS = {
        'credit_card': re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),
        'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
        'phone': re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'),
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'bank_account': re.compile(r'\b\d{8,17}\b'),
        'routing_number': re.compile(r'\b\d{9}\b')
    }
    
    # Fields that should be completely masked
    FULLY_MASKED_FIELDS = {
        'password', 'secret', 'token', 'key', 'authorization', 'credential',
        'stripe_secret', 'api_key', 'webhook_secret', 'client_secret'
    }
    
    # Financial fields that need amount masking
    FINANCIAL_FIELDS = {
        'amount', 'price', 'total', 'subtotal', 'tax', 'fee', 'commission',
        'payout', 'balance', 'refund', 'tip', 'deposit', 'charge'
    }
    
    # PII fields that need partial masking
    PII_FIELDS = {
        'name', 'first_name', 'last_name', 'address', 'street', 'city',
        'zip', 'postal_code', 'phone', 'email', 'ssn', 'license'
    }

    @classmethod
    def mask_financial_amount(cls, amount: Union[float, int, str, Decimal]) -> str:
        """
        Mask financial amounts showing only last 2 digits of decimal part
        
        Examples:
        - 123.45 -> "**.*45"
        - 1000.00 -> "***.**00"
        - 50 -> "**"
        """
        if amount is None:
            return None
        
        try:
            # Convert to float to normalize, then to string
            if isinstance(amount, str):
                try:
                    amount_float = float(amount)
                except ValueError:
                    return "***INVALID_AMOUNT***"
            else:
                amount_float = float(amount)
            
            # Format to 2 decimal places
            amount_str = f"{amount_float:.2f}"
            
            # Handle decimal amounts
            if '.' in amount_str:
                parts = amount_str.split('.')
                integer_part = parts[0]
                decimal_part = parts[1][:2]  # Take only first 2 decimal places
                
                # Mask integer part completely
                masked_integer = '*' * len(integer_part)
                
                return f"{masked_integer}.*{decimal_part}"
            else:
                # Handle whole numbers (shouldn't happen with .2f format, but just in case)
                return '*' * len(amount_str)
                    
        except (ValueError, TypeError):
            return "***INVALID_AMOUNT***"

    @classmethod
    def mask_credit_card(cls, card_number: str) -> str:
        """
        Mask credit card number showing only last 4 digits
        
        Example: 4111111111111111 -> "****-****-****-1111"
        """
        if not card_number:
            return card_number
        
        # Remove all non-digits
        digits_only = re.sub(r'\D', '', str(card_number))
        
        if len(digits_only) < 4:
            return '*' * len(digits_only)
        
        # Show last 4 digits
        masked = '*' * (len(digits_only) - 4) + digits_only[-4:]
        
        # Add formatting if original had dashes or spaces
        if '-' in str(card_number):
            return f"****-****-****-{digits_only[-4:]}"
        elif ' ' in str(card_number):
            return f"**** **** **** {digits_only[-4:]}"
        
        return masked

    @classmethod
    def mask_email(cls, email: str) -> str:
        """
        Mask email showing first 2 and last 2 characters of username
        
        Example: john.doe@example.com -> "jo****oe@example.com"
        """
        if not email or '@' not in email:
            return email
        
        username, domain = email.split('@', 1)
        
        if len(username) <= 4:
            masked_username = username[0] + '*' * (len(username) - 1)
        else:
            masked_username = username[:2] + '*' * (len(username) - 4) + username[-2:]
        
        return f"{masked_username}@{domain}"

    @classmethod
    def mask_phone(cls, phone: str) -> str:
        """
        Mask phone number showing only last 4 digits
        
        Example: 555-123-4567 -> "***-***-4567"
        """
        if not phone:
            return phone
        
        # Extract digits
        digits = re.sub(r'\D', '', str(phone))
        
        if len(digits) < 4:
            return '*' * len(str(phone))
        
        # Keep original formatting but mask digits
        masked = str(phone)
        for i, char in enumerate(str(phone)):
            if char.isdigit() and i < len(str(phone)) - 4:
                masked = masked[:i] + '*' + masked[i+1:]
        
        return masked

    @classmethod
    def mask_user_id(cls, user_id: Union[str, int]) -> str:
        """
        Mask user ID showing only first 2 and last 2 characters
        
        Example: user_12345678 -> "us******78"
        """
        if not user_id:
            return user_id
        
        user_id_str = str(user_id)
        
        if len(user_id_str) <= 4:
            return '*' * len(user_id_str)
        
        return user_id_str[:2] + '*' * (len(user_id_str) - 4) + user_id_str[-2:]

    @classmethod
    def mask_text_patterns(cls, text: str) -> str:
        """
        Mask sensitive patterns in text using regex
        """
        if not isinstance(text, str):
            return text
        
        masked_text = text
        
        # Mask credit cards
        masked_text = cls.SENSITIVE_PATTERNS['credit_card'].sub(
            lambda m: cls.mask_credit_card(m.group()), masked_text
        )
        
        # Mask emails
        masked_text = cls.SENSITIVE_PATTERNS['email'].sub(
            lambda m: cls.mask_email(m.group()), masked_text
        )
        
        # Mask phone numbers
        masked_text = cls.SENSITIVE_PATTERNS['phone'].sub(
            lambda m: cls.mask_phone(m.group()), masked_text
        )
        
        # Mask SSN
        masked_text = cls.SENSITIVE_PATTERNS['ssn'].sub('***-**-****', masked_text)
        
        return masked_text

    @classmethod
    def mask_dict_data(cls, data: Dict[str, Any], deep: bool = True) -> Dict[str, Any]:
        """
        Mask sensitive data in dictionary structures
        
        Args:
            data: Dictionary to mask
            deep: Whether to recursively mask nested dictionaries
        """
        if not isinstance(data, dict):
            return data
        
        masked_data = {}
        
        for key, value in data.items():
            key_lower = key.lower()
            
            # Fully mask sensitive fields
            if any(sensitive in key_lower for sensitive in cls.FULLY_MASKED_FIELDS):
                masked_data[key] = "***MASKED***"
            
            # Mask financial amounts
            elif any(financial in key_lower for financial in cls.FINANCIAL_FIELDS):
                if isinstance(value, (int, float, Decimal)):
                    masked_data[key] = cls.mask_financial_amount(value)
                else:
                    masked_data[key] = value
            
            # Mask user ID fields specifically
            elif 'user_id' in key_lower or (key_lower.endswith('_id') and 'user' in key_lower):
                masked_data[key] = cls.mask_user_id(value)
            
            # Mask PII fields
            elif any(pii in key_lower for pii in cls.PII_FIELDS):
                if key_lower in ['email']:
                    masked_data[key] = cls.mask_email(str(value)) if value else value
                elif key_lower in ['phone', 'phone_number']:
                    masked_data[key] = cls.mask_phone(str(value)) if value else value
                elif isinstance(value, str) and len(value) > 2:
                    # Generic PII masking - show first and last character
                    masked_data[key] = value[0] + '*' * (len(value) - 2) + value[-1]
                else:
                    masked_data[key] = value
            
            # Recursively mask nested dictionaries
            elif deep and isinstance(value, dict):
                masked_data[key] = cls.mask_dict_data(value, deep=True)
            
            # Recursively mask lists containing dictionaries
            elif deep and isinstance(value, list):
                masked_data[key] = [
                    cls.mask_dict_data(item, deep=True) if isinstance(item, dict) else item
                    for item in value
                ]
            
            # Mask text content
            elif isinstance(value, str):
                masked_data[key] = cls.mask_text_patterns(value)
            
            else:
                masked_data[key] = value
        
        return masked_data

    @classmethod
    def safe_log_format(cls, message: str, data: Dict[str, Any] = None) -> str:
        """
        Format log message with masked sensitive data
        
        Args:
            message: Log message
            data: Additional data to include (will be masked)
        
        Returns:
            Formatted log message with masked sensitive data
        """
        if data:
            masked_data = cls.mask_dict_data(data)
            return f"{message} | Data: {json.dumps(masked_data, default=str, separators=(',', ':'))}"
        
        return cls.mask_text_patterns(message)


class MaskedStructuredFormatter(logging.Formatter):
    """
    Enhanced structured formatter with data masking for financial logs
    """
    
    def format(self, record):
        log_entry = {
            "timestamp": record.created,
            "level": record.levelname,
            "logger": record.name,
            "message": DataMasker.mask_text_patterns(record.getMessage()),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Process extra fields with masking
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'getMessage']:
                extra_fields[key] = value
        
        # Mask extra fields
        if extra_fields:
            masked_extra = DataMasker.mask_dict_data(extra_fields)
            log_entry.update(masked_extra)
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, default=str, separators=(',', ':'))


def create_safe_payment_log(event_type: str, amount: Union[float, int, Decimal] = None,
                           user_id: str = None, payment_id: str = None,
                           card_last_four: str = None, **kwargs) -> Dict[str, Any]:
    """
    Create a safe payment log entry with proper masking
    
    Args:
        event_type: Type of payment event
        amount: Payment amount (will be masked)
        user_id: User ID (will be masked)
        payment_id: Payment ID (will be masked)
        card_last_four: Last 4 digits of card (safe to log)
        **kwargs: Additional fields (will be masked if sensitive)
    
    Returns:
        Masked log entry dictionary
    """
    log_data = {
        "event_type": "payment",
        "payment_event": event_type,
        "amount": DataMasker.mask_financial_amount(amount) if amount else None,
        "user_id": DataMasker.mask_user_id(user_id) if user_id else None,
        "payment_id": DataMasker.mask_user_id(payment_id) if payment_id else None,
        "card_last_four": card_last_four,  # This is safe to log
        **kwargs
    }
    
    # Mask any additional sensitive fields
    return DataMasker.mask_dict_data(log_data)


def create_safe_commission_log(event_type: str, commission_amount: Union[float, int, Decimal] = None,
                              barber_id: str = None, booking_id: str = None,
                              **kwargs) -> Dict[str, Any]:
    """
    Create a safe commission log entry with proper masking
    
    Args:
        event_type: Type of commission event
        commission_amount: Commission amount (will be masked)
        barber_id: Barber ID (will be masked)
        booking_id: Booking ID (will be masked)
        **kwargs: Additional fields (will be masked if sensitive)
    
    Returns:
        Masked log entry dictionary
    """
    log_data = {
        "event_type": "commission",
        "commission_event": event_type,
        "commission_amount": DataMasker.mask_financial_amount(commission_amount) if commission_amount else None,
        "barber_id": DataMasker.mask_user_id(barber_id) if barber_id else None,
        "booking_id": DataMasker.mask_user_id(booking_id) if booking_id else None,
        **kwargs
    }
    
    # Mask any additional sensitive fields
    return DataMasker.mask_dict_data(log_data)


def create_safe_user_activity_log(event_type: str, user_id: str = None,
                                 ip_address: str = None, user_agent: str = None,
                                 financial_data: Dict[str, Any] = None,
                                 **kwargs) -> Dict[str, Any]:
    """
    Create a safe user activity log entry with proper masking
    
    Args:
        event_type: Type of user activity
        user_id: User ID (will be masked)
        ip_address: IP address (will be partially masked)
        user_agent: User agent string
        financial_data: Any financial data (will be fully masked)
        **kwargs: Additional fields (will be masked if sensitive)
    
    Returns:
        Masked log entry dictionary
    """
    # Mask IP address (keep first 2 octets)
    masked_ip = None
    if ip_address:
        ip_parts = ip_address.split('.')
        if len(ip_parts) == 4:
            masked_ip = f"{ip_parts[0]}.{ip_parts[1]}.*.{ip_parts[3]}"
        else:
            masked_ip = "***masked***"
    
    log_data = {
        "event_type": "user_activity",
        "activity_event": event_type,
        "user_id": DataMasker.mask_user_id(user_id) if user_id else None,
        "ip_address": masked_ip,
        "user_agent": user_agent,  # User agent is generally safe to log
        "financial_data": DataMasker.mask_dict_data(financial_data) if financial_data else None,
        **kwargs
    }
    
    # Only mask additional kwargs, not the already-processed fields
    masked_kwargs = DataMasker.mask_dict_data(kwargs) if kwargs else {}
    
    # Return data with already-masked fields intact
    return {
        "event_type": log_data["event_type"],
        "activity_event": log_data["activity_event"],
        "user_id": log_data["user_id"],
        "ip_address": log_data["ip_address"],
        "user_agent": log_data["user_agent"],
        "financial_data": log_data["financial_data"],
        **masked_kwargs
    }


# Convenience functions for common logging scenarios
def log_payment_safely(logger: logging.Logger, level: int, message: str, 
                      amount: Union[float, int, Decimal] = None, **kwargs):
    """
    Log payment information safely with automatic masking
    """
    safe_data = create_safe_payment_log("custom", amount=amount, **kwargs)
    logger.log(level, DataMasker.safe_log_format(message, safe_data))


def log_commission_safely(logger: logging.Logger, level: int, message: str,
                         commission_amount: Union[float, int, Decimal] = None, **kwargs):
    """
    Log commission information safely with automatic masking
    """
    safe_data = create_safe_commission_log("custom", commission_amount=commission_amount, **kwargs)
    logger.log(level, DataMasker.safe_log_format(message, safe_data))


def log_user_activity_safely(logger: logging.Logger, level: int, message: str,
                            user_id: str = None, financial_data: Dict[str, Any] = None, **kwargs):
    """
    Log user activity safely with automatic masking
    """
    safe_data = create_safe_user_activity_log("custom", user_id=user_id, 
                                            financial_data=financial_data, **kwargs)
    logger.log(level, DataMasker.safe_log_format(message, safe_data))