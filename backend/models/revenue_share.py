"""
Revenue Sharing and Commission Models
Handles financial calculations and distributions
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Date,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base


class RevenueShare(Base):
    __tablename__ = "revenue_shares"

    id = Column(Integer, primary_key=True, index=True)

    # Location and Period
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    period_type = Column(
        String(20), nullable=False
    )  # daily, weekly, bi-weekly, monthly
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Revenue Details
    total_revenue = Column(Float, default=0.0)
    service_revenue = Column(Float, default=0.0)
    product_revenue = Column(Float, default=0.0)
    tip_revenue = Column(Float, default=0.0)

    # Commission Calculation
    base_commission_rate = Column(Float, default=0.50)  # 50% default
    certification_bonus_rate = Column(Float, default=0.0)
    performance_bonus_rate = Column(Float, default=0.0)
    total_commission_rate = Column(Float, default=0.50)

    # Deductions
    chair_rental = Column(Float, default=0.0)
    product_charges = Column(Float, default=0.0)
    other_deductions = Column(Float, default=0.0)
    total_deductions = Column(Float, default=0.0)

    # Final Amounts
    gross_commission = Column(Float, default=0.0)
    net_commission = Column(Float, default=0.0)

    # 6FB Franchise Fees (if applicable)
    franchise_fee = Column(Float, default=0.0)
    royalty_fee = Column(Float, default=0.0)
    marketing_fee = Column(Float, default=0.0)

    # Payment Details
    payment_status = Column(String(20), default="pending")  # pending, processed, paid
    payment_date = Column(DateTime, nullable=True)
    payment_method = Column(String(50), nullable=True)
    payment_reference = Column(String(100), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    location = relationship("Location", foreign_keys=[location_id])
    barber = relationship("Barber", back_populates="revenue_shares")
    commissions = relationship("Commission", back_populates="revenue_share")


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(Integer, primary_key=True, index=True)
    revenue_share_id = Column(Integer, ForeignKey("revenue_shares.id"), nullable=False)

    # Commission Components
    component_type = Column(
        String(50), nullable=False
    )  # base, certification, performance, retention
    description = Column(String(255))
    rate = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)

    # Conditions
    condition_met = Column(Boolean, default=True)
    condition_details = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    revenue_share = relationship("RevenueShare", back_populates="commissions")

    def __repr__(self):
        return f"<Commission(type='{self.component_type}', amount={self.amount})>"
