"""
Compensation Plan Models for flexible barber payment structures
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    ForeignKey,
    JSON,
    Enum,
    DateTime,
)
from sqlalchemy.orm import relationship
from config.database import Base
from datetime import datetime
import enum


class CompensationType(enum.Enum):
    COMMISSION_ONLY = "commission_only"
    BOOTH_RENT_ONLY = "booth_rent_only"
    HYBRID = "hybrid"
    SALARY = "salary"
    SALARY_PLUS_COMMISSION = "salary_plus_commission"
    SLIDING_SCALE = "sliding_scale"


class PaymentFrequency(enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


class PayoutMethod(enum.Enum):
    STRIPE_INSTANT = "stripe_instant"
    STRIPE_STANDARD = "stripe_standard"
    BANK_TRANSFER = "bank_transfer"
    CHECK = "check"
    CASH = "cash"


class CompensationPlan(Base):
    __tablename__ = "compensation_plans"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), unique=True)
    plan_name = Column(String, nullable=False)
    compensation_type = Column(Enum(CompensationType), nullable=False)
    is_active = Column(Boolean, default=True)
    effective_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)

    # Base salary (if applicable)
    base_salary = Column(Float, nullable=True)
    salary_frequency = Column(Enum(PaymentFrequency), nullable=True)

    # Booth rent settings
    booth_rent_amount = Column(Float, nullable=True)
    booth_rent_frequency = Column(Enum(PaymentFrequency), nullable=True)
    booth_rent_due_day = Column(Integer, nullable=True)  # Day of week/month
    includes_utilities = Column(Boolean, default=True)
    includes_products = Column(Boolean, default=False)
    includes_marketing = Column(Boolean, default=True)

    # Commission settings (stored as JSON for flexibility)
    commission_structure = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "services": {
    #     "haircut": {"rate": 60, "new_client_bonus": 10},
    #     "color": {"rate": 50, "premium_rate": 55},
    #     "beard": {"rate": 70}
    #   },
    #   "products": {
    #     "default": 15,
    #     "premium": 20,
    #     "promotional": 10
    #   },
    #   "tiers": [
    #     {"min": 0, "max": 5000, "rate": 50},
    #     {"min": 5001, "max": 10000, "rate": 60},
    #     {"min": 10001, "max": null, "rate": 70}
    #   ]
    # }

    # Performance bonuses
    performance_bonuses = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "revenue_milestones": [
    #     {"target": 10000, "bonus": 500},
    #     {"target": 15000, "bonus": 1000}
    #   ],
    #   "client_retention": {"rate": 80, "bonus": 200},
    #   "review_rating": {"min_rating": 4.5, "bonus": 100},
    #   "new_clients": {"per_client": 25, "monthly_cap": 500}
    # }

    # Deductions and fees
    deductions = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "product_usage": {"type": "percentage", "value": 5},
    #   "processing_fees": {"type": "percentage", "value": 2.9},
    #   "marketing_contribution": {"type": "fixed", "value": 50},
    #   "supply_fee": {"type": "fixed", "value": 25},
    #   "no_show_penalty": {"type": "fixed", "value": 15}
    # }

    # Special conditions
    special_conditions = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "apprentice_period": {"months": 6, "reduced_rate": 40},
    #   "master_barber_bonus": {"years_experience": 5, "bonus_rate": 10},
    #   "weekend_premium": {"saturday": 5, "sunday": 10},
    #   "holiday_premium": 15
    # }
    
    # Automated payout settings
    payout_settings = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "enabled": true,
    #   "method": "stripe_instant",
    #   "frequency": "weekly",
    #   "day_of_week": 5,  # Friday
    #   "day_of_month": 15,  # For monthly payouts
    #   "time": "17:00",  # 5 PM
    #   "minimum_payout": 50,  # Don't process payouts under $50
    #   "hold_days": 2,  # Hold funds for 2 days before payout
    #   "auto_deduct_fees": true,
    #   "notification_settings": {
    #     "send_payout_notification": true,
    #     "send_summary_report": true,
    #     "send_failure_alerts": true
    #   }
    # }
    
    # Time-based variations
    time_based_rates = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "peak_hours": {
    #     "enabled": true,
    #     "hours": [
    #       {"day": "weekday", "start": "17:00", "end": "20:00", "rate_adjustment": 5},
    #       {"day": "saturday", "start": "10:00", "end": "16:00", "rate_adjustment": 10}
    #     ]
    #   },
    #   "off_peak_discount": {
    #     "enabled": true,
    #     "hours": [
    #       {"day": "weekday", "start": "09:00", "end": "12:00", "rate_adjustment": -5}
    #     ]
    #   },
    #   "last_minute_booking": {"hours_before": 2, "rate_adjustment": 15},
    #   "advance_booking": {"days_ahead": 7, "rate_adjustment": -5}
    # }
    
    # Client-type based rates
    client_type_rates = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "new_client": {"rate_adjustment": 10, "first_visits": 3},
    #   "vip_client": {"min_visits": 20, "min_spend": 1000, "rate_adjustment": 15},
    #   "loyalty_tiers": [
    #     {"name": "bronze", "min_visits": 5, "rate_adjustment": 0},
    #     {"name": "silver", "min_visits": 10, "rate_adjustment": 5},
    #     {"name": "gold", "min_visits": 20, "rate_adjustment": 10},
    #     {"name": "platinum", "min_visits": 50, "rate_adjustment": 15}
    #   ],
    #   "referral_bonus": {"referrer_bonus": 25, "referee_discount": 10}
    # }
    
    # Automatic escalation
    escalation_rules = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "tenure_based": [
    #     {"months": 6, "rate_increase": 5},
    #     {"months": 12, "rate_increase": 10},
    #     {"months": 24, "rate_increase": 15}
    #   ],
    #   "performance_based": {
    #     "revenue_threshold": 15000,
    #     "months_consecutive": 3,
    #     "rate_increase": 5
    #   },
    #   "skill_based": {
    #     "certifications": [
    #       {"name": "Advanced Color", "rate_increase": 5},
    #       {"name": "Master Barber", "rate_increase": 10}
    #     ]
    #   }
    # }

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    barber = relationship("Barber", back_populates="compensation_plan")
    commission_calculations = relationship(
        "CommissionCalculation", back_populates="compensation_plan"
    )
    payment_history = relationship("PaymentHistory", back_populates="compensation_plan")


class CommissionCalculation(Base):
    """Track individual commission calculations for transparency"""

    __tablename__ = "commission_calculations"

    id = Column(Integer, primary_key=True, index=True)
    compensation_plan_id = Column(Integer, ForeignKey("compensation_plans.id"))
    barber_id = Column(Integer, ForeignKey("barbers.id"))
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    product_sale_id = Column(Integer, ForeignKey("product_sales.id"), nullable=True)

    calculation_date = Column(DateTime, default=datetime.utcnow)
    service_type = Column(String, nullable=True)
    service_amount = Column(Float, nullable=False)
    commission_rate = Column(Float, nullable=False)
    commission_amount = Column(Float, nullable=False)

    # Bonuses applied
    bonuses_applied = Column(JSON, nullable=True)
    bonus_amount = Column(Float, default=0)

    # Deductions applied
    deductions_applied = Column(JSON, nullable=True)
    deduction_amount = Column(Float, default=0)

    # Final amounts
    gross_commission = Column(Float, nullable=False)
    net_commission = Column(Float, nullable=False)

    # Status
    is_paid = Column(Boolean, default=False)
    paid_date = Column(DateTime, nullable=True)
    payment_reference = Column(String, nullable=True)

    # Relationships
    compensation_plan = relationship(
        "CompensationPlan", back_populates="commission_calculations"
    )
    barber = relationship("Barber")


class PaymentHistory(Base):
    """Track all payments made to barbers"""

    __tablename__ = "payment_history"

    id = Column(Integer, primary_key=True, index=True)
    compensation_plan_id = Column(Integer, ForeignKey("compensation_plans.id"))
    barber_id = Column(Integer, ForeignKey("barbers.id"))

    payment_type = Column(
        String, nullable=False
    )  # commission, booth_rent, salary, bonus
    payment_period_start = Column(DateTime, nullable=False)
    payment_period_end = Column(DateTime, nullable=False)

    # Amounts
    gross_amount = Column(Float, nullable=False)
    deductions = Column(Float, default=0)
    net_amount = Column(Float, nullable=False)

    # Payment details
    payment_method = Column(String, nullable=False)  # stripe, square, cash, check
    payment_status = Column(
        String, nullable=False
    )  # pending, processing, completed, failed
    payment_date = Column(DateTime, nullable=True)
    payment_reference = Column(String, nullable=True)

    # Breakdown
    payment_breakdown = Column(JSON, nullable=True)
    # Example structure:
    # {
    #   "services": {"count": 45, "total": 2250, "commission": 1350},
    #   "products": {"count": 12, "total": 360, "commission": 54},
    #   "bonuses": {"new_clients": 125, "revenue_milestone": 500},
    #   "deductions": {"supplies": 25, "processing": 65}
    # }

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    compensation_plan = relationship(
        "CompensationPlan", back_populates="payment_history"
    )
    barber = relationship("Barber")
