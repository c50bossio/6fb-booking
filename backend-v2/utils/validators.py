"""
Currency and financial validation utilities.
"""
from decimal import Decimal, InvalidOperation
from typing import Union


# ISO 4217 currency codes (most common ones)
ISO_4217_CURRENCIES = {
    'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
    'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
    'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
    'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD',
    'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GGP', 'GHS',
    'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF',
    'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD',
    'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT',
    'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD',
    'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN',
    'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK',
    'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR',
    'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SLL', 'SOS', 'SRD',
    'SSP', 'STD', 'STN', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP',
    'TRY', 'TTD', 'TVD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS',
    'VED', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF', 'XPF', 'YER',
    'ZAR', 'ZMW', 'ZWL'
}


def validate_currency_code(currency: str) -> str:
    """
    Validate and normalize currency code to ISO 4217 standard.
    
    Args:
        currency: Currency code to validate
        
    Returns:
        Normalized uppercase currency code
        
    Raises:
        ValueError: If currency code is invalid
    """
    if not currency:
        raise ValueError("Currency code cannot be empty")
        
    normalized = currency.strip().upper()
    
    if len(normalized) != 3:
        raise ValueError(f"Currency code must be exactly 3 characters, got '{currency}'")
        
    if normalized not in ISO_4217_CURRENCIES:
        raise ValueError(f"'{currency}' is not a valid ISO 4217 currency code")
        
    return normalized


def normalize_currency(currency: str) -> str:
    """
    Normalize currency code to uppercase without validation.
    Use this for less strict scenarios.
    
    Args:
        currency: Currency code to normalize
        
    Returns:
        Uppercase currency code
    """
    return currency.strip().upper() if currency else 'USD'


def validate_decimal_precision(value: Union[float, Decimal, str], precision: int = 2) -> Decimal:
    """
    Validate and convert financial amount to Decimal with specified precision.
    
    Args:
        value: The value to validate
        precision: Number of decimal places (default: 2)
        
    Returns:
        Decimal value with correct precision
        
    Raises:
        ValueError: If value cannot be converted or has too many decimal places
    """
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise ValueError(f"Invalid decimal value: {value}")
    
    # Check if value has more decimal places than allowed
    if decimal_value.as_tuple().exponent < -precision:
        raise ValueError(
            f"Value {value} has more than {precision} decimal places. "
            f"Financial amounts must have exactly {precision} decimal places."
        )
    
    # Quantize to correct precision
    quantized = decimal_value.quantize(Decimal(f"0.{'0' * precision}"))
    
    return quantized


def format_financial_amount(value: Union[float, Decimal, str]) -> str:
    """
    Format financial amount to string with exactly 2 decimal places.
    
    Args:
        value: The value to format
        
    Returns:
        Formatted string representation
    """
    decimal_value = validate_decimal_precision(value, 2)
    return f"{decimal_value:.2f}"


# Pydantic validators for use in schemas
def currency_validator(v: str) -> str:
    """Pydantic validator for currency codes."""
    return validate_currency_code(v)


def financial_amount_validator(v: Union[float, Decimal, str]) -> Decimal:
    """Pydantic validator for financial amounts."""
    return validate_decimal_precision(v, 2)