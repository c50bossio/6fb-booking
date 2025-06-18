"""
Location Model
Represents barbershop locations in the 6FB network
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    name = Column(String(255), nullable=False)
    business_name = Column(String(255), nullable=False)
    location_code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Address Information
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    country = Column(String(50), default="USA", nullable=False)
    
    # Contact Information
    phone = Column(String(20))
    email = Column(String(255))
    website = Column(String(255))
    
    # Business Details
    timezone = Column(String(50), default="America/New_York")
    operating_hours = Column(Text)  # JSON string of operating hours
    services_offered = Column(Text)  # JSON string of services
    
    # 6FB Franchise Details
    franchise_type = Column(String(50))  # "franchise", "corporate", "independent"
    franchise_fee = Column(Float, default=0.0)
    royalty_percentage = Column(Float, default=0.0)
    
    # Performance Targets
    monthly_revenue_target = Column(Float, default=0.0)
    monthly_appointment_target = Column(Integer, default=0)
    target_6fb_score = Column(Float, default=85.0)
    
    # Status
    is_active = Column(Boolean, default=True)
    onboarding_status = Column(String(50), default="pending")  # pending, in_progress, completed
    launch_date = Column(DateTime)
    
    # Ownership
    owner_name = Column(String(255))
    owner_email = Column(String(255))
    owner_phone = Column(String(20))
    
    # 6FB Mentor Assignment
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Trafft Integration
    trafft_location_id = Column(String(100), nullable=True)
    trafft_api_key = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    barbers = relationship("Barber", back_populates="location")
    mentor = relationship("User", foreign_keys=[mentor_id])
    location_analytics = relationship("LocationAnalytics", back_populates="location")
    
    def __repr__(self):
        return f"<Location(id={self.id}, name='{self.name}', code='{self.location_code}')>"

class LocationAnalytics(Base):
    __tablename__ = "location_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    
    # Period
    period_type = Column(String(20), nullable=False)  # daily, weekly, monthly
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Performance Metrics
    total_revenue = Column(Float, default=0.0)
    total_appointments = Column(Integer, default=0)
    total_clients = Column(Integer, default=0)
    new_clients = Column(Integer, default=0)
    returning_clients = Column(Integer, default=0)
    
    # 6FB Metrics
    average_6fb_score = Column(Float, default=0.0)
    booking_utilization = Column(Float, default=0.0)
    client_retention_rate = Column(Float, default=0.0)
    average_ticket = Column(Float, default=0.0)
    
    # Team Metrics
    active_barbers = Column(Integer, default=0)
    total_barber_hours = Column(Float, default=0.0)
    revenue_per_barber = Column(Float, default=0.0)
    
    # Operational Metrics
    no_show_rate = Column(Float, default=0.0)
    cancellation_rate = Column(Float, default=0.0)
    walk_in_percentage = Column(Float, default=0.0)
    
    # Financial Performance
    revenue_target_achievement = Column(Float, default=0.0)  # Percentage
    profit_margin = Column(Float, default=0.0)
    cost_per_acquisition = Column(Float, default=0.0)
    
    # Rankings (within network)
    revenue_rank = Column(Integer, default=0)
    score_rank = Column(Integer, default=0)
    growth_rank = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    location = relationship("Location", back_populates="location_analytics")
    
    def __repr__(self):
        return f"<LocationAnalytics(location_id={self.location_id}, period='{self.period_type}')>"