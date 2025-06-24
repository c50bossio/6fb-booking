from sqlalchemy import Column, String, Boolean, Text, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel


class Barber(BaseModel):
    """Barber user model - represents 6FB mentorship members"""

    __tablename__ = "barbers"

    # Basic Info
    email = Column(String(255), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    business_name = Column(String(200))
    phone = Column(String(20))

    # Account Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    subscription_tier = Column(String(50), default="basic")  # basic, premium, elite

    # Business Settings (for 6FB calculations)
    target_booking_capacity = Column(Integer, default=40)  # Weekly target appointments
    hourly_rate = Column(Float, default=45.0)  # Base service rate
    average_service_duration = Column(Integer, default=60)  # Minutes

    # Goals and Targets
    monthly_revenue_goal = Column(Float)
    weekly_appointment_goal = Column(Integer)
    average_ticket_goal = Column(Float)

    # Location Assignment
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    # User Account Link
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Stripe Connect Integration
    stripe_account_id = Column(String(255), nullable=True)  # Stripe Express account ID

    # Relationships (temporarily simplified for Trafft integration)
    appointments = relationship("Appointment", back_populates="barber")
    clients = relationship("Client", back_populates="barber")
    location = relationship("Location", back_populates="barbers")
    # user = relationship("User")  # Commented out due to import issues
    revenue_shares = relationship(
        "RevenueShare", back_populates="barber", lazy="dynamic"
    )  # Fixed with lazy loading
    payment_models = relationship(
        "BarberPaymentModel", back_populates="barber", lazy="dynamic"
    )
    compensation_plan = relationship(
        "CompensationPlan", back_populates="barber", uselist=False
    )
    reviews = relationship("Review", back_populates="barber")
    google_calendar_settings = relationship(
        "GoogleCalendarSettings", back_populates="barber", uselist=False
    )
    
    # Square integration relationships
    square_account = relationship("SquareAccount", back_populates="barber", uselist=False)
    square_payments = relationship("SquarePayment", back_populates="barber")
    square_payouts = relationship("SquarePayout", back_populates="barber")

    def __repr__(self):
        return f"<Barber(email={self.email}, business_name={self.business_name})>"
