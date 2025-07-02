#!/usr/bin/env python3
"""
Test script to validate currency validation functions only.
"""

import sys
from decimal import Decimal, InvalidOperation

from utils.validators import (
    validate_currency_code,
    normalize_currency,
    validate_decimal_precision,
    format_financial_amount
)


def test_currency_validators():
    """Test the currency validation functions."""
    print("Testing currency validators...")
    
    # Test valid currencies
    valid_currencies = ['USD', 'EUR', 'GBP', 'CAD', 'JPY']
    for currency in valid_currencies:
        try:
            result = validate_currency_code(currency)
            print(f"✓ {currency} -> {result}")
        except ValueError as e:
            print(f"✗ {currency} failed: {e}")
    
    # Test lowercase currencies (should be normalized)
    try:
        result = validate_currency_code('usd')
        print(f"✓ 'usd' -> {result}")
    except ValueError as e:
        print(f"✗ 'usd' failed: {e}")
    
    # Test invalid currencies
    invalid_currencies = ['XYZ', 'ABC', '123', '', 'USDD']
    for currency in invalid_currencies:
        try:
            result = validate_currency_code(currency)
            print(f"✗ {currency} should have failed but got: {result}")
        except ValueError:
            print(f"✓ {currency} correctly rejected")
    
    print()


def test_decimal_precision():
    """Test decimal precision validation."""
    print("Testing decimal precision validators...")
    
    # Test valid amounts
    valid_amounts = ['10.99', '0.01', '100.00', 1000, 25.5]
    for amount in valid_amounts:
        try:
            result = validate_decimal_precision(amount, 2)
            print(f"✓ {amount} -> {result}")
        except ValueError as e:
            print(f"✗ {amount} failed: {e}")
    
    # Test invalid precision (too many decimal places)
    invalid_amounts = ['10.999', '0.001', '100.1234']
    for amount in invalid_amounts:
        try:
            result = validate_decimal_precision(amount, 2)
            print(f"✗ {amount} should have failed but got: {result}")
        except ValueError:
            print(f"✓ {amount} correctly rejected for precision")
    
    # Test invalid values
    invalid_values = ['abc', '', 'invalid']
    for value in invalid_values:
        try:
            result = validate_decimal_precision(value, 2)
            print(f"✗ {value} should have failed but got: {result}")
        except (ValueError, TypeError):
            print(f"✓ {value} correctly rejected")
    
    print()


def test_currency_normalization():
    """Test currency normalization."""
    print("Testing currency normalization...")
    
    test_cases = [
        ('usd', 'USD'),
        ('eur', 'EUR'),
        ('  GBP  ', 'GBP'),
        ('', 'USD'),  # Default
        (None, 'USD')  # Default
    ]
    
    for input_val, expected in test_cases:
        try:
            result = normalize_currency(input_val)
            if result == expected:
                print(f"✓ '{input_val}' -> '{result}'")
            else:
                print(f"✗ '{input_val}' -> '{result}' (expected '{expected}')")
        except Exception as e:
            print(f"✗ '{input_val}' failed: {e}")
    
    print()


def test_financial_formatting():
    """Test financial amount formatting."""
    print("Testing financial amount formatting...")
    
    test_amounts = [
        (10.5, "10.50"),
        (100, "100.00"),
        ("25.99", "25.99"),
        (Decimal("15.1"), "15.10")
    ]
    
    for amount, expected in test_amounts:
        try:
            result = format_financial_amount(amount)
            if result == expected:
                print(f"✓ {amount} -> {result}")
            else:
                print(f"✗ {amount} -> {result} (expected {expected})")
        except Exception as e:
            print(f"✗ {amount} failed: {e}")
    
    print()


def main():
    """Run all validation tests."""
    print("=== Currency Validation Tests ===\n")
    
    test_currency_validators()
    test_decimal_precision()
    test_currency_normalization()
    test_financial_formatting()
    
    print("=== Tests Complete ===")


if __name__ == "__main__":
    main()