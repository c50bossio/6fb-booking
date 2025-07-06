"""
Pricing utilities for chair-based billing.

This module contains functions for calculating progressive pricing
based on the number of chairs/seats.
"""

from typing import Dict, Any


def calculate_progressive_price(chairs: int) -> Dict[str, Any]:
    """
    Calculate the progressive price based on number of chairs.
    
    Uses a tax bracket-style progressive pricing model where each bracket
    is priced separately and the total is the sum of all brackets.
    
    Args:
        chairs: Number of chairs/seats
        
    Returns:
        Dictionary with pricing information including:
        - total_price: Total monthly price
        - average_per_chair: Average price per chair
        - breakdown: List of price brackets applied
        - tier_name: Descriptive tier name
    """
    if chairs <= 0:
        return {
            "total_price": 0.0,
            "average_per_chair": 0.0,
            "breakdown": [],
            "tier_name": "Invalid"
        }
    
    # Progressive pricing brackets (like tax brackets)
    brackets = [
        {"min": 1, "max": 1, "price": 19.00},      # First chair: $19
        {"min": 2, "max": 5, "price": 17.00},      # Chairs 2-5: $17 each
        {"min": 6, "max": 10, "price": 15.00},     # Chairs 6-10: $15 each
        {"min": 11, "max": 20, "price": 12.00},    # Chairs 11-20: $12 each
        {"min": 21, "max": 50, "price": 10.00},    # Chairs 21-50: $10 each
        {"min": 51, "max": float('inf'), "price": 8.00}  # 51+: $8 each
    ]
    
    total_price = 0.0
    breakdown = []
    
    remaining_chairs = chairs
    for bracket in brackets:
        if remaining_chairs <= 0:
            break
            
        # Calculate how many chairs fall in this bracket
        bracket_start = bracket["min"]
        bracket_end = min(bracket["max"], chairs)
        
        if chairs >= bracket_start:
            chairs_in_bracket = min(bracket_end - bracket_start + 1, remaining_chairs)
            bracket_total = chairs_in_bracket * bracket["price"]
            
            total_price += bracket_total
            breakdown.append({
                "chairs": f"{bracket_start}-{bracket_start + chairs_in_bracket - 1}" if chairs_in_bracket > 1 else str(bracket_start),
                "price_per_chair": bracket["price"],
                "subtotal": bracket_total
            })
            
            remaining_chairs -= chairs_in_bracket
    
    # Determine tier name based on total chairs
    if chairs == 1:
        tier_name = "Starter"
    elif chairs <= 5:
        tier_name = "Studio"
    elif chairs <= 10:
        tier_name = "Salon"
    elif chairs <= 20:
        tier_name = "Premium"
    elif chairs <= 50:
        tier_name = "Enterprise"
    else:
        tier_name = "Enterprise Plus"
    
    return {
        "total_price": round(total_price, 2),
        "average_per_chair": round(total_price / chairs, 2),
        "breakdown": breakdown,
        "tier_name": tier_name
    }