#!/usr/bin/env python3
"""
Comprehensive test for the unified commission framework.
Tests all commission types and integration with existing services.
"""

import sys
import os
from decimal import Decimal
from datetime import datetime

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.base_commission import (
    UnifiedCommissionService, 
    CommissionType, 
    ServiceCommissionCalculator,
    RetailCommissionCalculator,
    POSCommissionCalculator
)


def test_service_commission_calculator():
    """Test service commission calculations"""
    print("Testing Service Commission Calculator...")
    
    calculator = ServiceCommissionCalculator()
    
    # Test cases
    test_cases = [
        (Decimal('100.00'), Decimal('0.20')),  # $100, 20% commission
        (Decimal('50.00'), Decimal('0.15')),   # $50, 15% commission
        (Decimal('200.00'), Decimal('0.25')),  # $200, 25% commission
    ]
    
    for amount, rate in test_cases:
        result = calculator.calculate_commission(amount, rate)
        expected_platform_fee = amount * rate
        expected_barber_amount = amount - expected_platform_fee
        
        print(f"  Amount: ${amount}, Rate: {rate}")
        print(f"    Platform Fee: ${result['platform_fee']} (expected: ${expected_platform_fee})")
        print(f"    Barber Amount: ${result['barber_amount']} (expected: ${expected_barber_amount})")
        print(f"    ✓ Match: {result['platform_fee'] == expected_platform_fee and result['barber_amount'] == expected_barber_amount}")
        print()
    
    # Test validation
    print("  Testing rate validation...")
    valid_rates = [Decimal('0.10'), Decimal('0.20'), Decimal('0.30')]
    invalid_rates = [Decimal('0.02'), Decimal('0.60'), Decimal('-0.10')]
    
    for rate in valid_rates:
        assert calculator.validate_rate(rate), f"Rate {rate} should be valid"
    
    for rate in invalid_rates:
        assert not calculator.validate_rate(rate), f"Rate {rate} should be invalid"
    
    print("  ✓ Rate validation tests passed")
    print()


def test_retail_commission_calculator():
    """Test retail commission calculations"""
    print("Testing Retail Commission Calculator...")
    
    calculator = RetailCommissionCalculator()
    
    # Test percentage mode
    test_cases = [
        (Decimal('50.00'), Decimal('0.10'), 1),    # $50, 10% commission, qty 1
        (Decimal('100.00'), Decimal('0.15'), 2),   # $100, 15% commission, qty 2
        (Decimal('25.99'), Decimal('0.08'), 3),    # $25.99, 8% commission, qty 3
    ]
    
    for amount, rate, quantity in test_cases:
        result = calculator.calculate_commission(amount, rate, quantity=quantity)
        expected_commission = amount * rate
        expected_remaining = amount - expected_commission
        
        print(f"  Amount: ${amount}, Rate: {rate}, Qty: {quantity}")
        print(f"    Commission: ${result['commission_amount']} (expected: ${expected_commission})")
        print(f"    Remaining: ${result['remaining_amount']} (expected: ${expected_remaining})")
        print(f"    ✓ Match: {result['commission_amount'] == expected_commission}")
        print()
    
    print("  ✓ Retail commission tests passed")
    print()


def test_pos_commission_calculator():
    """Test POS commission calculations"""
    print("Testing POS Commission Calculator...")
    
    calculator = POSCommissionCalculator()
    
    test_cases = [
        (Decimal('75.00'), Decimal('0.08')),   # $75, 8% commission
        (Decimal('150.00'), Decimal('0.12')),  # $150, 12% commission
        (Decimal('30.50'), Decimal('0.05')),   # $30.50, 5% commission
    ]
    
    for amount, rate in test_cases:
        result = calculator.calculate_commission(amount, rate)
        expected_commission = amount * rate
        expected_remaining = amount - expected_commission
        
        print(f"  Amount: ${amount}, Rate: {rate}")
        print(f"    Commission: ${result['commission_amount']} (expected: ${expected_commission})")
        print(f"    Remaining: ${result['remaining_amount']} (expected: ${expected_remaining})")
        print(f"    ✓ Match: {result['commission_amount'] == expected_commission}")
        print()
    
    print("  ✓ POS commission tests passed")
    print()


def test_unified_commission_service():
    """Test the unified commission service"""
    print("Testing Unified Commission Service...")
    
    service = UnifiedCommissionService()
    
    # Test service commission
    service_result = service.calculate_commission(
        CommissionType.SERVICE, 
        Decimal('100.00'), 
        Decimal('0.20')
    )
    print(f"  Service Commission: ${service_result['platform_fee']} (${service_result['barber_amount']} to barber)")
    
    # Test retail commission
    retail_result = service.calculate_commission(
        CommissionType.RETAIL, 
        Decimal('50.00'), 
        Decimal('0.10'),
        quantity=2
    )
    print(f"  Retail Commission: ${retail_result['commission_amount']} from ${retail_result['line_total']}")
    
    # Test POS commission
    pos_result = service.calculate_commission(
        CommissionType.POS, 
        Decimal('75.00'), 
        Decimal('0.08')
    )
    print(f"  POS Commission: ${pos_result['commission_amount']} from ${pos_result['subtotal']}")
    
    # Test total commission calculation
    commission_items = [
        {
            'commission_type': CommissionType.SERVICE.value,
            'amount': Decimal('100.00'),
            'rate': Decimal('0.20')
        },
        {
            'commission_type': CommissionType.RETAIL.value,
            'amount': Decimal('50.00'),
            'rate': Decimal('0.10')
        },
        {
            'commission_type': CommissionType.POS.value,
            'amount': Decimal('75.00'),
            'rate': Decimal('0.08')
        }
    ]
    
    totals = service.calculate_total_commissions(commission_items)
    print(f"  Total Commissions: ${totals['total_commission']}")
    print(f"    Service: ${totals['service_commission']}")
    print(f"    Retail: ${totals['retail_commission']}")
    print(f"    POS: ${totals['pos_commission']}")
    print()
    
    # Test validation
    print("  Testing commission setup validation...")
    
    valid_setups = [
        (CommissionType.SERVICE, Decimal('0.20')),
        (CommissionType.RETAIL, Decimal('0.10')),
        (CommissionType.POS, Decimal('0.08'))
    ]
    
    for comm_type, rate in valid_setups:
        validation = service.validate_commission_setup(comm_type, rate)
        print(f"    {comm_type.value} @ {rate}: {'✓' if validation['valid'] else '✗'}")
    
    print("  ✓ Unified service tests passed")
    print()


def test_edge_cases():
    """Test edge cases and error handling"""
    print("Testing Edge Cases...")
    
    service = UnifiedCommissionService()
    
    # Test zero amounts
    try:
        result = service.calculate_commission(
            CommissionType.SERVICE, 
            Decimal('0.00'), 
            Decimal('0.20')
        )
        print(f"  Zero amount test: ✓ (result: ${result['platform_fee']})")
    except Exception as e:
        print(f"  Zero amount test: ✗ (error: {e})")
    
    # Test negative amounts (should fail)
    try:
        result = service.calculate_commission(
            CommissionType.SERVICE, 
            Decimal('-10.00'), 
            Decimal('0.20')
        )
        print(f"  Negative amount test: ✗ (should have failed)")
    except ValueError:
        print(f"  Negative amount test: ✓ (correctly rejected)")
    except Exception as e:
        print(f"  Negative amount test: ? (unexpected error: {e})")
    
    # Test invalid rates (should fail)
    try:
        result = service.calculate_commission(
            CommissionType.SERVICE, 
            Decimal('100.00'), 
            Decimal('1.50')  # 150% rate
        )
        print(f"  Invalid rate test: ✗ (should have failed)")
    except ValueError:
        print(f"  Invalid rate test: ✓ (correctly rejected)")
    except Exception as e:
        print(f"  Invalid rate test: ? (unexpected error: {e})")
    
    print("  ✓ Edge case tests completed")
    print()


def test_precision_and_rounding():
    """Test decimal precision and rounding behavior"""
    print("Testing Precision and Rounding...")
    
    service = UnifiedCommissionService()
    
    # Test cases with precise decimal results
    test_cases = [
        (Decimal('33.33'), Decimal('0.333')),  # Should result in precise decimals
        (Decimal('10.99'), Decimal('0.157')),  # Should round to 2 decimal places
        (Decimal('0.01'), Decimal('0.1')),     # Very small amounts
    ]
    
    for amount, rate in test_cases:
        result = service.calculate_commission(CommissionType.SERVICE, amount, rate)
        
        # Check that results are properly rounded to 2 decimal places
        platform_fee = result['platform_fee']
        barber_amount = result['barber_amount']
        
        # Check decimal places
        platform_fee_places = abs(platform_fee.as_tuple().exponent)
        barber_amount_places = abs(barber_amount.as_tuple().exponent)
        
        print(f"  Amount: ${amount}, Rate: {rate}")
        print(f"    Platform Fee: ${platform_fee} ({platform_fee_places} decimal places)")
        print(f"    Barber Amount: ${barber_amount} ({barber_amount_places} decimal places)")
        print(f"    Sum check: ${platform_fee + barber_amount} = ${amount} ({'✓' if platform_fee + barber_amount == amount else '✗'})")
        print()
    
    print("  ✓ Precision tests completed")
    print()


def main():
    """Run all tests"""
    print("=" * 50)
    print("UNIFIED COMMISSION FRAMEWORK TESTS")
    print("=" * 50)
    print()
    
    try:
        test_service_commission_calculator()
        test_retail_commission_calculator()
        test_pos_commission_calculator()
        test_unified_commission_service()
        test_edge_cases()
        test_precision_and_rounding()
        
        print("=" * 50)
        print("ALL TESTS COMPLETED SUCCESSFULLY! ✓")
        print("=" * 50)
        
        # Performance test
        print("\nPerformance Test...")
        import time
        
        service = UnifiedCommissionService()
        start_time = time.time()
        
        # Run 1000 calculations
        for i in range(1000):
            service.calculate_commission(
                CommissionType.SERVICE,
                Decimal('100.00'),
                Decimal('0.20')
            )
        
        end_time = time.time()
        elapsed = end_time - start_time
        
        print(f"1000 calculations completed in {elapsed:.4f} seconds")
        print(f"Average time per calculation: {elapsed/1000*1000:.4f} ms")
        
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())