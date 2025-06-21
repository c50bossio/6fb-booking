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
