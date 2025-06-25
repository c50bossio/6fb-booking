"""Gift Certificate models for the booking system."""

from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Optional
import secrets
import string

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    JSON,
    Enum as SQLAlchemyEnum,
    Index,
    UniqueConstraint,
    CheckConstraint,
    Numeric,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from models.base import Base


class GiftCertificateStatus(str, Enum):
    """Gift certificate status enumeration."""

    ACTIVE = "active"
    PARTIALLY_USED = "partially_used"
    FULLY_USED = "fully_used"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class GiftCertificate(Base):
    """Model for gift certificates."""

    __tablename__ = "gift_certificates"

    id = Column(Integer, primary_key=True, index=True)

    # Unique certificate code
    code = Column(String(20), unique=True, nullable=False, index=True)

    # Certificate value
    original_amount = Column(Integer, nullable=False)  # Original amount in cents
    remaining_balance = Column(Integer, nullable=False)  # Remaining balance in cents
    currency = Column(String(3), default="USD", nullable=False)

    # Sender information
    sender_name = Column(String(200), nullable=False)
    sender_email = Column(String(255), nullable=False)
    sender_user_id = Column(
        Integer, ForeignKey("users.id")
    )  # Optional if sender is a registered user

    # Recipient information
    recipient_name = Column(String(200), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    recipient_user_id = Column(
        Integer, ForeignKey("users.id")
    )  # Set when recipient claims it

    # Personal message
    message = Column(Text)

    # Status and validity
    status = Column(
        SQLAlchemyEnum(GiftCertificateStatus),
        nullable=False,
        default=GiftCertificateStatus.ACTIVE,
        index=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)

    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    expiry_date = Column(DateTime(timezone=True), nullable=False, index=True)
    used_date = Column(DateTime(timezone=True))  # Date when fully used

    # Payment information
    stripe_payment_intent_id = Column(String(255), unique=True, index=True)
    stripe_charge_id = Column(String(255), unique=True, index=True)

    # Metadata
    meta_data = Column(JSON, default=dict)

    # Relationships
    sender_user = relationship(
        "User", foreign_keys=[sender_user_id], backref="sent_gift_certificates"
    )
    recipient_user = relationship(
        "User", foreign_keys=[recipient_user_id], backref="received_gift_certificates"
    )
    redemptions = relationship(
        "GiftCertificateRedemption", back_populates="gift_certificate"
    )

    # Indexes and constraints
    __table_args__ = (
        Index("idx_gift_certificates_status_expiry", "status", "expiry_date"),
        Index("idx_gift_certificates_recipient_email", "recipient_email"),
        Index("idx_gift_certificates_sender_email", "sender_email"),
        CheckConstraint("original_amount > 0", name="check_positive_original_amount"),
        CheckConstraint("remaining_balance >= 0", name="check_non_negative_balance"),
        CheckConstraint(
            "remaining_balance <= original_amount",
            name="check_balance_not_exceed_original",
        ),
    )

    @property
    def original_amount_decimal(self) -> Decimal:
        """Return original amount as decimal dollars."""
        return Decimal(self.original_amount) / 100

    @property
    def remaining_balance_decimal(self) -> Decimal:
        """Return remaining balance as decimal dollars."""
        return Decimal(self.remaining_balance) / 100

    @property
    def used_amount(self) -> int:
        """Calculate used amount in cents."""
        return self.original_amount - self.remaining_balance

    @property
    def is_expired(self) -> bool:
        """Check if the certificate is expired."""
        return datetime.utcnow() > self.expiry_date

    @property
    def is_usable(self) -> bool:
        """Check if the certificate can be used."""
        return (
            self.is_active
            and self.status
            in [GiftCertificateStatus.ACTIVE, GiftCertificateStatus.PARTIALLY_USED]
            and self.remaining_balance > 0
            and not self.is_expired
        )

    @staticmethod
    def generate_unique_code(length: int = 16) -> str:
        """Generate a unique gift certificate code."""
        # Use uppercase letters and digits for readability
        characters = string.ascii_uppercase + string.digits
        # Remove ambiguous characters
        characters = (
            characters.replace("0", "")
            .replace("O", "")
            .replace("I", "")
            .replace("1", "")
        )

        # Generate code in format: XXXX-XXXX-XXXX-XXXX
        code_parts = []
        for _ in range(4):
            part = "".join(secrets.choice(characters) for _ in range(4))
            code_parts.append(part)

        return "-".join(code_parts)


class GiftCertificateRedemption(Base):
    """Model for tracking gift certificate redemptions."""

    __tablename__ = "gift_certificate_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    gift_certificate_id = Column(
        Integer, ForeignKey("gift_certificates.id"), nullable=False, index=True
    )
    appointment_id = Column(
        Integer, ForeignKey("appointments.id"), nullable=False, index=True
    )

    # Redemption details
    amount_used = Column(Integer, nullable=False)  # Amount used in cents
    balance_before = Column(
        Integer, nullable=False
    )  # Balance before redemption in cents
    balance_after = Column(Integer, nullable=False)  # Balance after redemption in cents

    # User who redeemed
    redeemed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    gift_certificate = relationship("GiftCertificate", back_populates="redemptions")
    appointment = relationship("Appointment", backref="gift_certificate_redemptions")
    redeemed_by = relationship("User", foreign_keys=[redeemed_by_id])

    # Indexes and constraints
    __table_args__ = (
        Index("idx_redemptions_certificate", "gift_certificate_id"),
        Index("idx_redemptions_appointment", "appointment_id"),
        Index("idx_redemptions_user", "redeemed_by_id"),
        CheckConstraint("amount_used > 0", name="check_positive_amount_used"),
        CheckConstraint("balance_after >= 0", name="check_non_negative_balance_after"),
        CheckConstraint(
            "balance_before > balance_after", name="check_balance_decreased"
        ),
    )

    @property
    def amount_used_decimal(self) -> Decimal:
        """Return amount used as decimal dollars."""
        return Decimal(self.amount_used) / 100
