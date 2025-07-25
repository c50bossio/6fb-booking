"""
AI Agent Pricing Service
Handles tiered token pricing, subscription management, and billing calculations
"""

from typing import Dict, Optional
from enum import Enum
from dataclasses import dataclass
from models.agent import SubscriptionTier


class TokenPricingTier(Enum):
    """Token pricing tiers with volume discounts"""
    TIER_1 = "tier_1"  # 0-25K tokens
    TIER_2 = "tier_2"  # 25K-100K tokens  
    TIER_3 = "tier_3"  # 100K+ tokens


@dataclass
class SubscriptionPlan:
    """Subscription plan configuration"""
    name: str
    monthly_price: float
    agent_limit: int
    included_tokens: int
    description: str
    features: list


@dataclass
class TokenUsageCost:
    """Token usage cost calculation result"""
    total_tokens: int
    included_tokens: int
    billable_tokens: int
    tier_breakdown: Dict[str, int]
    tier_costs: Dict[str, float]
    total_token_cost: float


class AgentPricingService:
    """Service for handling AI agent pricing and billing calculations"""
    
    # Token pricing rates by tier (per token)
    TOKEN_RATES = {
        TokenPricingTier.TIER_1: 0.0005,  # $0.0005 per token (0-25K)
        TokenPricingTier.TIER_2: 0.0004,  # $0.0004 per token (25K-100K)
        TokenPricingTier.TIER_3: 0.0003,  # $0.0003 per token (100K+)
    }
    
    # Tier thresholds
    TIER_THRESHOLDS = {
        TokenPricingTier.TIER_1: (0, 25000),
        TokenPricingTier.TIER_2: (25000, 100000),
        TokenPricingTier.TIER_3: (100000, float('inf'))
    }
    
    # Subscription plans configuration
    SUBSCRIPTION_PLANS = {
        SubscriptionTier.STARTER: SubscriptionPlan(
            name="Starter",
            monthly_price=10.00,
            agent_limit=1,
            included_tokens=5000,
            description="Perfect for getting started with AI automation",
            features=[
                "1 AI agent",
                "5,000 free tokens/month",
                "Basic templates",
                "Email support",
                "Essential analytics"
            ]
        ),
        SubscriptionTier.PROFESSIONAL: SubscriptionPlan(
            name="Professional",
            monthly_price=25.00,
            agent_limit=3,
            included_tokens=15000,
            description="Advanced automation for growing barbershops",
            features=[
                "3 AI agents",
                "15,000 free tokens/month",
                "Advanced templates + customization",
                "Priority support",
                "Full analytics dashboard",
                "A/B testing capabilities"
            ]
        ),
        SubscriptionTier.BUSINESS: SubscriptionPlan(
            name="Business",
            monthly_price=50.00,
            agent_limit=-1,  # Unlimited
            included_tokens=50000,
            description="Complete automation suite for established businesses",
            features=[
                "Unlimited AI agents",
                "50,000 free tokens/month",
                "Full automation suite",
                "White-label options",
                "Dedicated support",
                "Custom integrations",
                "Advanced reporting"
            ]
        ),
        SubscriptionTier.ENTERPRISE: SubscriptionPlan(
            name="Enterprise",
            monthly_price=0.00,  # Custom pricing
            agent_limit=-1,
            included_tokens=100000,
            description="Custom solutions for enterprise barbershop chains",
            features=[
                "Unlimited everything",
                "100,000+ free tokens/month",
                "Custom development",
                "24/7 dedicated support",
                "SLA guarantees",
                "On-premise deployment options",
                "Advanced security features"
            ]
        )
    }
    
    @classmethod
    def calculate_token_cost(
        self, 
        total_tokens: int, 
        included_tokens: int = 0
    ) -> TokenUsageCost:
        """
        Calculate the cost of token usage with tiered pricing
        
        Args:
            total_tokens: Total tokens used
            included_tokens: Free tokens included in subscription
            
        Returns:
            TokenUsageCost object with detailed breakdown
        """
        # Calculate billable tokens (after free allowance)
        billable_tokens = max(0, total_tokens - included_tokens)
        
        if billable_tokens == 0:
            return TokenUsageCost(
                total_tokens=total_tokens,
                included_tokens=included_tokens,
                billable_tokens=0,
                tier_breakdown={},
                tier_costs={},
                total_token_cost=0.0
            )
        
        # Calculate cost by tier
        remaining_tokens = billable_tokens
        tier_breakdown = {}
        tier_costs = {}
        total_cost = 0.0
        
        for tier in [TokenPricingTier.TIER_1, TokenPricingTier.TIER_2, TokenPricingTier.TIER_3]:
            tier_min, tier_max = self.TIER_THRESHOLDS[tier]
            tier_rate = self.TOKEN_RATES[tier]
            
            if remaining_tokens <= 0:
                break
                
            # Calculate tokens in this tier
            if tier == TokenPricingTier.TIER_1:
                # First tier: 0-25K
                tokens_in_tier = min(remaining_tokens, 25000)
            elif tier == TokenPricingTier.TIER_2:  
                # Second tier: 25K-100K
                if billable_tokens <= 25000:
                    tokens_in_tier = 0
                else:
                    tokens_in_tier = min(remaining_tokens, 75000)  # 100K - 25K = 75K
            else:
                # Third tier: 100K+
                if billable_tokens <= 100000:
                    tokens_in_tier = 0
                else:
                    tokens_in_tier = remaining_tokens
            
            if tokens_in_tier > 0:
                tier_cost = tokens_in_tier * tier_rate
                tier_breakdown[tier.value] = tokens_in_tier
                tier_costs[tier.value] = round(tier_cost, 4)
                total_cost += tier_cost
                remaining_tokens -= tokens_in_tier
        
        return TokenUsageCost(
            total_tokens=total_tokens,
            included_tokens=included_tokens,
            billable_tokens=billable_tokens,
            tier_breakdown=tier_breakdown,
            tier_costs=tier_costs,
            total_token_cost=round(total_cost, 2)
        )
    
    @classmethod
    def get_subscription_plan(self, tier: SubscriptionTier) -> SubscriptionPlan:
        """Get subscription plan details by tier"""
        return self.SUBSCRIPTION_PLANS.get(tier, self.SUBSCRIPTION_PLANS[SubscriptionTier.STARTER])
    
    @classmethod
    def calculate_monthly_bill(
        self,
        subscription_tier: SubscriptionTier,
        tokens_used: int,
        success_revenue: float = 0.0
    ) -> Dict:
        """
        Calculate total monthly bill including subscription, tokens, and success fees
        
        Args:
            subscription_tier: User's subscription tier
            tokens_used: Total tokens used in the month
            success_revenue: Revenue generated through AI agents
            
        Returns:
            Detailed billing breakdown
        """
        plan = self.get_subscription_plan(subscription_tier)
        
        # Calculate token costs
        token_cost_breakdown = self.calculate_token_cost(
            total_tokens=tokens_used,
            included_tokens=plan.included_tokens
        )
        
        # Calculate success fee (1.5% of generated revenue)
        success_fee = success_revenue * 0.015
        
        # Total bill
        total_cost = plan.monthly_price + token_cost_breakdown.total_token_cost + success_fee
        
        return {
            "subscription": {
                "tier": subscription_tier.value,
                "plan_name": plan.name,
                "monthly_price": plan.monthly_price,
                "included_tokens": plan.included_tokens,
                "agent_limit": plan.agent_limit
            },
            "token_usage": {
                "total_tokens": token_cost_breakdown.total_tokens,
                "included_tokens": token_cost_breakdown.included_tokens,
                "billable_tokens": token_cost_breakdown.billable_tokens,
                "tier_breakdown": token_cost_breakdown.tier_breakdown,
                "tier_costs": token_cost_breakdown.tier_costs,
                "total_token_cost": token_cost_breakdown.total_token_cost
            },
            "success_fee": {
                "revenue_generated": success_revenue,
                "fee_percentage": 1.5,
                "fee_amount": round(success_fee, 2)
            },
            "total": {
                "subtotal": plan.monthly_price + token_cost_breakdown.total_token_cost,
                "success_fee": round(success_fee, 2),
                "total_amount": round(total_cost, 2)
            }
        }
    
    @classmethod
    def estimate_monthly_cost(
        self,
        subscription_tier: SubscriptionTier,
        estimated_tokens: int,
        estimated_revenue: float = 0.0
    ) -> Dict:
        """
        Estimate monthly cost for pricing display purposes
        
        Args:
            subscription_tier: Subscription tier to estimate
            estimated_tokens: Estimated monthly token usage
            estimated_revenue: Estimated monthly revenue from agents
            
        Returns:
            Cost estimation breakdown
        """
        return self.calculate_monthly_bill(
            subscription_tier=subscription_tier,
            tokens_used=estimated_tokens,
            success_revenue=estimated_revenue
        )
    
    @classmethod
    def get_upgrade_recommendations(
        self,
        current_tier: SubscriptionTier,
        monthly_tokens: int,
        monthly_revenue: float
    ) -> Optional[Dict]:
        """
        Analyze usage and recommend subscription upgrades
        
        Args:
            current_tier: User's current subscription tier
            monthly_tokens: Average monthly token usage
            monthly_revenue: Average monthly revenue
            
        Returns:
            Upgrade recommendation or None if no upgrade needed
        """
        current_plan = self.get_subscription_plan(current_tier)
        current_cost = self.calculate_monthly_bill(current_tier, monthly_tokens, monthly_revenue)
        
        # Check if user would benefit from upgrading
        upgrade_recommendations = []
        
        for tier in [SubscriptionTier.PROFESSIONAL, SubscriptionTier.BUSINESS]:
            if tier.value <= current_tier.value:
                continue
                
            upgrade_plan = self.get_subscription_plan(tier)
            upgrade_cost = self.calculate_monthly_bill(tier, monthly_tokens, monthly_revenue)
            
            # Calculate potential savings
            current_total = current_cost["total"]["total_amount"]
            upgrade_total = upgrade_cost["total"]["total_amount"]
            monthly_savings = current_total - upgrade_total
            
            # Recommend upgrade if it saves money or provides significantly more value
            if monthly_savings > 5.00 or (monthly_tokens > current_plan.included_tokens * 1.5):
                upgrade_recommendations.append({
                    "tier": tier,
                    "plan": upgrade_plan,
                    "current_cost": current_total,
                    "upgrade_cost": upgrade_total,
                    "monthly_savings": round(monthly_savings, 2),
                    "annual_savings": round(monthly_savings * 12, 2),
                    "additional_benefits": {
                        "extra_agents": max(0, upgrade_plan.agent_limit - current_plan.agent_limit),
                        "extra_tokens": upgrade_plan.included_tokens - current_plan.included_tokens
                    }
                })
        
        return upgrade_recommendations[0] if upgrade_recommendations else None


# Convenience functions for easy importing
def calculate_token_cost(total_tokens: int, included_tokens: int = 0) -> TokenUsageCost:
    """Calculate token cost with tiered pricing"""
    return AgentPricingService.calculate_token_cost(total_tokens, included_tokens)


def get_subscription_plan(tier: SubscriptionTier) -> SubscriptionPlan:
    """Get subscription plan details"""
    return AgentPricingService.get_subscription_plan(tier)


def calculate_monthly_bill(
    subscription_tier: SubscriptionTier,
    tokens_used: int,
    success_revenue: float = 0.0
) -> Dict:
    """Calculate total monthly bill"""
    return AgentPricingService.calculate_monthly_bill(
        subscription_tier, tokens_used, success_revenue
    )