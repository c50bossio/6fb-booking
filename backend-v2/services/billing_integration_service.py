"""
Billing Integration Service for Communication Revenue Stream
Tracks usage and generates billing for SMS/Email reminders
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models.reminder_models import ReminderDelivery, ReminderAnalytics
from models import Shop, Barber
from services.stripe_service import StripeService
from core.logging import get_logger

logger = get_logger(__name__)


class CommunicationBillingService:
    """
    Revenue stream management for SMS/Email reminder services
    Implements usage-based billing with tiered pricing
    """
    
    # Pricing tiers (monthly)
    PRICING_TIERS = {
        "basic": {
            "monthly_fee": 19.00,
            "sms_included": 500,
            "email_included": 1000,
            "sms_overage": 0.025,  # $0.025 per SMS over limit
            "email_overage": 0.005,  # $0.005 per email over limit
            "features": ["basic_templates", "standard_reporting"]
        },
        "professional": {
            "monthly_fee": 39.00,
            "sms_included": 1500,
            "email_included": 3000,
            "sms_overage": 0.022,
            "email_overage": 0.004,
            "features": ["custom_templates", "advanced_analytics", "no_show_reports"]
        },
        "premium": {
            "monthly_fee": 79.00,
            "sms_included": 99999,  # "Unlimited"
            "email_included": 99999,
            "sms_overage": 0.00,
            "email_overage": 0.00,
            "features": ["unlimited_messaging", "ai_optimization", "revenue_analytics", "multi_location"]
        }
    }
    
    def __init__(self):
        self.stripe = StripeService()
    
    async def calculate_monthly_usage(self, shop_id: int, month: int, year: int, db: Session) -> Dict:
        """
        Calculate communication usage for billing period
        
        Returns usage data for invoice generation
        """
        try:
            # Get date range for the month
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date()
            else:
                end_date = datetime(year, month + 1, 1).date()
            
            # Query delivered messages for the month
            usage_query = db.query(
                ReminderDelivery.channel,
                func.count(ReminderDelivery.id).label('count')
            ).join(
                ReminderDelivery.schedule
            ).join(
                ReminderSchedule.appointment
            ).filter(
                and_(
                    Appointment.shop_id == shop_id,
                    ReminderDelivery.delivered_at >= start_date,
                    ReminderDelivery.delivered_at < end_date,
                    ReminderDelivery.delivery_status == 'delivered'
                )
            ).group_by(ReminderDelivery.channel).all()
            
            # Process usage data
            usage = {
                "shop_id": shop_id,
                "period": f"{year}-{month:02d}",
                "sms_count": 0,
                "email_count": 0,
                "push_count": 0,
                "total_messages": 0
            }
            
            for channel, count in usage_query:
                usage[f"{channel}_count"] = count
                usage["total_messages"] += count
            
            # Get shop's current plan
            shop = db.query(Shop).filter(Shop.id == shop_id).first()
            current_plan = getattr(shop, 'communication_plan', 'basic')
            
            # Calculate billing
            billing = self._calculate_billing(usage, current_plan)
            
            return {
                "usage": usage,
                "billing": billing,
                "plan": current_plan
            }
            
        except Exception as e:
            logger.error(f"Error calculating usage for shop {shop_id}: {str(e)}")
            raise
    
    def _calculate_billing(self, usage: Dict, plan: str) -> Dict:
        """
        Calculate billing amount based on usage and plan
        """
        plan_config = self.PRICING_TIERS.get(plan, self.PRICING_TIERS["basic"])
        
        # Base monthly fee
        total_amount = plan_config["monthly_fee"]
        
        # SMS overage
        sms_overage = max(0, usage["sms_count"] - plan_config["sms_included"])
        sms_overage_cost = sms_overage * plan_config["sms_overage"]
        
        # Email overage  
        email_overage = max(0, usage["email_count"] - plan_config["email_included"])
        email_overage_cost = email_overage * plan_config["email_overage"]
        
        total_amount += sms_overage_cost + email_overage_cost
        
        return {
            "base_fee": plan_config["monthly_fee"],
            "sms_included": plan_config["sms_included"],
            "email_included": plan_config["email_included"],
            "sms_overage_count": sms_overage,
            "sms_overage_cost": sms_overage_cost,
            "email_overage_count": email_overage, 
            "email_overage_cost": email_overage_cost,
            "total_amount": round(total_amount, 2),
            "cost_breakdown": {
                "base": plan_config["monthly_fee"],
                "sms_overage": sms_overage_cost,
                "email_overage": email_overage_cost
            }
        }
    
    async def generate_invoice(self, shop_id: int, month: int, year: int, db: Session) -> Dict:
        """
        Generate Stripe invoice for communication services
        """
        try:
            # Calculate usage and billing
            billing_data = await self.calculate_monthly_usage(shop_id, month, year, db)
            
            shop = db.query(Shop).filter(Shop.id == shop_id).first()
            if not shop or not shop.stripe_customer_id:
                raise ValueError(f"Shop {shop_id} not found or missing Stripe customer ID")
            
            # Create Stripe invoice
            invoice_items = []
            
            # Base plan fee
            invoice_items.append({
                "customer": shop.stripe_customer_id,
                "amount": int(billing_data["billing"]["base_fee"] * 100),  # Convert to cents
                "currency": "usd",
                "description": f"Communication Plan - {shop.communication_plan.title()} ({month}/{year})"
            })
            
            # SMS overage
            if billing_data["billing"]["sms_overage_cost"] > 0:
                invoice_items.append({
                    "customer": shop.stripe_customer_id,
                    "amount": int(billing_data["billing"]["sms_overage_cost"] * 100),
                    "currency": "usd", 
                    "description": f"SMS Overage - {billing_data['billing']['sms_overage_count']} messages"
                })
            
            # Email overage
            if billing_data["billing"]["email_overage_cost"] > 0:
                invoice_items.append({
                    "customer": shop.stripe_customer_id,
                    "amount": int(billing_data["billing"]["email_overage_cost"] * 100),
                    "currency": "usd",
                    "description": f"Email Overage - {billing_data['billing']['email_overage_count']} messages"
                })
            
            # Create invoice in Stripe
            stripe_result = await self.stripe.create_usage_invoice(
                customer_id=shop.stripe_customer_id,
                items=invoice_items,
                description=f"BookedBarber Communication Services - {month}/{year}",
                metadata={
                    "shop_id": str(shop_id),
                    "billing_period": f"{year}-{month:02d}",
                    "plan": shop.communication_plan,
                    "sms_count": str(billing_data["usage"]["sms_count"]),
                    "email_count": str(billing_data["usage"]["email_count"])
                }
            )
            
            return {
                "success": True,
                "invoice_id": stripe_result["invoice_id"],
                "amount": billing_data["billing"]["total_amount"],
                "billing_data": billing_data,
                "stripe_result": stripe_result
            }
            
        except Exception as e:
            logger.error(f"Error generating invoice for shop {shop_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def upgrade_plan(self, shop_id: int, new_plan: str, db: Session) -> Dict:
        """
        Upgrade/downgrade communication plan
        """
        try:
            if new_plan not in self.PRICING_TIERS:
                raise ValueError(f"Invalid plan: {new_plan}")
            
            shop = db.query(Shop).filter(Shop.id == shop_id).first()
            old_plan = getattr(shop, 'communication_plan', 'basic')
            
            # Update shop plan
            shop.communication_plan = new_plan
            shop.communication_plan_updated = datetime.utcnow()
            db.commit()
            
            # Log plan change
            logger.info(f"Shop {shop_id} plan changed from {old_plan} to {new_plan}")
            
            return {
                "success": True,
                "shop_id": shop_id,
                "old_plan": old_plan,
                "new_plan": new_plan,
                "new_pricing": self.PRICING_TIERS[new_plan]
            }
            
        except Exception as e:
            logger.error(f"Error upgrading plan for shop {shop_id}: {str(e)}")
            db.rollback()
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_usage_analytics(self, shop_id: int, months: int, db: Session) -> Dict:
        """
        Get communication usage analytics for revenue optimization
        """
        try:
            # Get usage trends over time
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=months * 30)
            
            analytics = db.query(ReminderAnalytics).filter(
                and_(
                    ReminderAnalytics.shop_id == shop_id,
                    ReminderAnalytics.date >= start_date,
                    ReminderAnalytics.date <= end_date
                )
            ).all()
            
            # Process analytics
            monthly_data = {}
            total_revenue_protected = 0
            
            for record in analytics:
                month_key = record.date.strftime("%Y-%m")
                if month_key not in monthly_data:
                    monthly_data[month_key] = {
                        "sms_sent": 0,
                        "email_sent": 0,
                        "revenue_protected": 0,
                        "no_shows_prevented": 0
                    }
                
                monthly_data[month_key]["sms_sent"] += record.total_sent if record.channel == "sms" else 0
                monthly_data[month_key]["email_sent"] += record.total_sent if record.channel == "email" else 0
                monthly_data[month_key]["revenue_protected"] += float(record.revenue_protected or 0)
                monthly_data[month_key]["no_shows_prevented"] += record.no_show_prevented or 0
                total_revenue_protected += float(record.revenue_protected or 0)
            
            return {
                "shop_id": shop_id,
                "period_months": months,
                "monthly_data": monthly_data,
                "total_revenue_protected": total_revenue_protected,
                "average_monthly_messages": sum(
                    data["sms_sent"] + data["email_sent"] for data in monthly_data.values()
                ) / max(len(monthly_data), 1)
            }
            
        except Exception as e:
            logger.error(f"Error getting usage analytics for shop {shop_id}: {str(e)}")
            raise


# Singleton instance
communication_billing = CommunicationBillingService()