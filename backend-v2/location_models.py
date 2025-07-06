"""
Location-related models for enterprise dashboard functionality
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class CompensationModel(str, enum.Enum):
    """Compensation model types for barbershops"""
    BOOTH_RENTAL = "booth_rental"
    COMMISSION = "commission"
    HYBRID = "hybrid"
    CUSTOM = "custom"


class LocationStatus(str, enum.Enum):
    """Location operational status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMING_SOON = "coming_soon"
    CLOSED = "closed"


class ChairStatus(str, enum.Enum):
    """Chair/booth availability status"""
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"
    RESERVED = "reserved"
    INACTIVE = "inactive"


class ChairType(str, enum.Enum):
    """Type of chair/booth"""
    STANDARD = "standard"
    PREMIUM = "premium"
    PRIVATE_BOOTH = "private_booth"
    TRAINING = "training"


class BarbershopLocation(Base):
    """Barbershop location model for multi-location management"""
    __tablename__ = "barbershop_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    phone = Column(String(20))
    email = Column(String(255))
    status = Column(Enum(LocationStatus), default=LocationStatus.ACTIVE, nullable=False)
    compensation_model = Column(Enum(CompensationModel), default=CompensationModel.COMMISSION, nullable=False)
    total_chairs = Column(Integer, default=0, nullable=False)
    active_chairs = Column(Integer, default=0, nullable=False)
    compensation_config = Column(JSON, default={})
    manager_id = Column(Integer, ForeignKey("users.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    business_hours = Column(JSON, default={})
    timezone = Column(String(50), default="America/New_York")
    currency = Column(String(10), default="USD")
    
    # Relationships
    chair_inventory = relationship("ChairInventory", back_populates="location", cascade="all, delete-orphan")
    compensation_plans = relationship("CompensationPlan", back_populates="location", cascade="all, delete-orphan")
    # barbers = relationship("User", secondary="barber_locations", back_populates="locations")


class BarberLocation(Base):
    """Association table for many-to-many relationship between barbers and locations"""
    __tablename__ = "barber_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=False)
    is_primary = Column(Boolean, default=True)
    chair_number = Column(String(50))
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ChairInventory(Base):
    """Individual chair/booth tracking within locations"""
    __tablename__ = "chair_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=False)
    chair_number = Column(String(50), nullable=False)
    chair_type = Column(Enum(ChairType), default=ChairType.STANDARD, nullable=False)
    status = Column(Enum(ChairStatus), default=ChairStatus.AVAILABLE, nullable=False)
    assigned_barber_id = Column(Integer, ForeignKey("users.id"))
    assignment_start = Column(DateTime(timezone=True))
    assignment_end = Column(DateTime(timezone=True))
    rental_rate_weekly = Column(Float, default=0)
    rental_rate_monthly = Column(Float, default=0)
    last_payment_date = Column(DateTime(timezone=True))
    next_payment_due = Column(DateTime(timezone=True))
    features = Column(JSON, default=[])
    equipment = Column(JSON, default={})
    total_appointments_today = Column(Integer, default=0)
    total_appointments_week = Column(Integer, default=0)
    total_appointments_month = Column(Integer, default=0)
    last_appointment_time = Column(DateTime(timezone=True))
    revenue_today = Column(Float, default=0)
    revenue_week = Column(Float, default=0)
    revenue_month = Column(Float, default=0)
    last_maintenance_date = Column(DateTime(timezone=True))
    next_maintenance_due = Column(DateTime(timezone=True))
    maintenance_notes = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    location = relationship("BarbershopLocation", back_populates="chair_inventory")


class ChairAssignmentHistory(Base):
    """Track historical chair assignments for reporting"""
    __tablename__ = "chair_assignment_history"
    
    id = Column(Integer, primary_key=True, index=True)
    chair_id = Column(Integer, ForeignKey("chair_inventory.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))
    total_revenue = Column(Float, default=0)
    total_appointments = Column(Integer, default=0)
    avg_ticket = Column(Float, default=0)
    rental_rate = Column(Float, default=0)
    total_rent_collected = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes = Column(String(500))


class CompensationPlan(Base):
    """Flexible compensation plan configuration for barbers"""
    __tablename__ = "compensation_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500))
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("users.id"))
    model_type = Column(Enum(CompensationModel), nullable=False)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    effective_from = Column(DateTime(timezone=True), nullable=False)
    effective_to = Column(DateTime(timezone=True))
    configuration = Column(JSON, nullable=False)
    incentives = Column(JSON, default={})
    deductions = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    location = relationship("BarbershopLocation", back_populates="compensation_plans")