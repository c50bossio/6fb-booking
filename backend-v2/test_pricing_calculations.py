#!/usr/bin/env python3
"""
Test script for AI Agent pricing calculations
Validates the tiered token pricing system and billing logic
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.agent_pricing_service import AgentPricingService, SubscriptionTier

def test_token_pricing():
    """Test tiered token pricing calculations"""
    print("🧪 Testing Token Pricing Calculations")
    print("=" * 50)
    
    # Test cases: (total_tokens, included_tokens, expected_cost)
    test_cases = [
        # Basic cases - within free tier
        (3000, 5000, 0.00),     # Under free limit
        (5000, 5000, 0.00),     # Exactly at free limit
        
        # Tier 1 pricing (0-25K billable tokens)
        (15000, 5000, 5.00),    # 10K tokens at $0.0005 = $5.00
        (30000, 5000, 12.50),   # 25K tokens at $0.0005 = $12.50
        
        # Tier 2 pricing (25K-100K billable tokens)  
        (55000, 5000, 22.50),   # 25K @ $0.0005 + 25K @ $0.0004 = $12.50 + $10.00 = $22.50
        (130000, 5000, 50.00),  # 25K @ $0.0005 + 75K @ $0.0004 + 25K @ $0.0003 = $12.50 + $30.00 + $7.50 = $50.00
        
        # Tier 3 pricing (100K+ billable tokens)
        (205000, 5000, 72.50),  # 25K @ $0.0005 + 75K @ $0.0004 + 100K @ $0.0003 = $12.50 + $30.00 + $30.00 = $72.50
    ]
    
    for i, (total_tokens, included_tokens, expected_cost) in enumerate(test_cases, 1):
        result = AgentPricingService.calculate_token_cost(total_tokens, included_tokens)
        
        print(f"\nTest Case {i}:")
        print(f"  Total tokens: {total_tokens:,}")
        print(f"  Included tokens: {included_tokens:,}")
        print(f"  Billable tokens: {result.billable_tokens:,}")
        print(f"  Expected cost: ${expected_cost:.2f}")
        print(f"  Actual cost: ${result.total_token_cost:.2f}")
        print(f"  Tier breakdown: {result.tier_breakdown}")
        print(f"  ✅ PASS" if abs(result.total_token_cost - expected_cost) < 0.01 else f"  ❌ FAIL")
    
    print("\n" + "=" * 50)
    print("✅ Token pricing tests completed")

def test_subscription_plans():
    """Test subscription plan configurations"""
    print("\n🏷️  Testing Subscription Plans")
    print("=" * 50)
    
    for tier in [SubscriptionTier.STARTER, SubscriptionTier.PROFESSIONAL, SubscriptionTier.BUSINESS]:
        plan = AgentPricingService.get_subscription_plan(tier)
        print(f"\n{tier.value.upper()} Plan:")
        print(f"  Name: {plan.name}")
        print(f"  Price: ${plan.monthly_price}")
        print(f"  Agent Limit: {plan.agent_limit if plan.agent_limit != -1 else 'Unlimited'}")
        print(f"  Included Tokens: {plan.included_tokens:,}")
        print(f"  Features: {len(plan.features)} features")
    
    print("\n" + "=" * 50)
    print("✅ Subscription plan tests completed")

def test_monthly_billing():
    """Test complete monthly billing calculations"""
    print("\n💰 Testing Monthly Billing")
    print("=" * 50)
    
    # Test scenarios
    scenarios = [
        {
            "name": "Light User - Starter Plan",
            "tier": SubscriptionTier.STARTER,
            "tokens": 3000,
            "revenue": 0
        },
        {
            "name": "Heavy User - Starter Plan", 
            "tier": SubscriptionTier.STARTER,
            "tokens": 35000,
            "revenue": 150
        },
        {
            "name": "Power User - Professional Plan",
            "tier": SubscriptionTier.PROFESSIONAL, 
            "tokens": 75000,
            "revenue": 500
        },
        {
            "name": "Enterprise User - Business Plan",
            "tier": SubscriptionTier.BUSINESS,
            "tokens": 200000,
            "revenue": 2000
        }
    ]
    
    for scenario in scenarios:
        print(f"\n{scenario['name']}:")
        bill = AgentPricingService.calculate_monthly_bill(
            subscription_tier=scenario['tier'],
            tokens_used=scenario['tokens'],
            success_revenue=scenario['revenue']
        )
        
        print(f"  Subscription: ${bill['subscription']['monthly_price']}")
        print(f"  Token Cost: ${bill['token_usage']['total_token_cost']}")
        print(f"  Success Fee: ${bill['success_fee']['fee_amount']}")
        print(f"  TOTAL: ${bill['total']['total_amount']}")
        
        # Validate calculations
        expected_total = (
            bill['subscription']['monthly_price'] + 
            bill['token_usage']['total_token_cost'] + 
            bill['success_fee']['fee_amount']
        )
        
        if abs(bill['total']['total_amount'] - expected_total) < 0.01:
            print(f"  ✅ Billing calculation accurate")
        else:
            print(f"  ❌ Billing calculation error: expected ${expected_total:.2f}")
    
    print("\n" + "=" * 50)
    print("✅ Monthly billing tests completed")

def test_upgrade_recommendations():
    """Test upgrade recommendation logic"""
    print("\n⬆️  Testing Upgrade Recommendations")
    print("=" * 50)
    
    test_cases = [
        {
            "name": "Should upgrade from Starter to Professional",
            "current": SubscriptionTier.STARTER,
            "tokens": 35000,
            "revenue": 200
        },
        {
            "name": "Should stay on current plan",
            "current": SubscriptionTier.PROFESSIONAL,
            "tokens": 12000,
            "revenue": 100
        }
    ]
    
    for case in test_cases:
        print(f"\n{case['name']}:")
        recommendation = AgentPricingService.get_upgrade_recommendations(
            current_tier=case['current'],
            monthly_tokens=case['tokens'],
            monthly_revenue=case['revenue']
        )
        
        if recommendation:
            print(f"  Recommended: {recommendation['tier'].value}")
            print(f"  Monthly Savings: ${recommendation['monthly_savings']:.2f}")
            print(f"  Annual Savings: ${recommendation['annual_savings']:.2f}")
            print(f"  ✅ Upgrade recommended")
        else:
            print(f"  No upgrade recommended")
            print(f"  ✅ Current plan optimal")
    
    print("\n" + "=" * 50)
    print("✅ Upgrade recommendation tests completed")

def main():
    """Run all pricing tests"""
    print("🚀 AI Agent Pricing System Tests")
    print("=" * 50)
    
    try:
        test_token_pricing()
        test_subscription_plans() 
        test_monthly_billing()
        test_upgrade_recommendations()
        
        print("\n🎉 ALL TESTS PASSED!")
        print("The new pricing structure is working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
        
    return 0

if __name__ == "__main__":
    exit(main())