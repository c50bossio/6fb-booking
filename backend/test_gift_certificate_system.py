"""Test script for the gift certificate system."""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from config.database import SessionLocal, engine
from models import (
    User,
    GiftCertificate,
    GiftCertificateRedemption,
    GiftCertificateStatus,
)
from services.gift_certificate_service import GiftCertificateService
from utils.logging import get_logger

logger = get_logger(__name__)


async def test_gift_certificate_creation():
    """Test creating a gift certificate."""
    db = SessionLocal()
    try:
        service = GiftCertificateService(db)

        # Create a test gift certificate
        logger.info("Creating test gift certificate...")
        gift_cert = await service.create_gift_certificate(
            sender_name="John Doe",
            sender_email="john@example.com",
            recipient_name="Jane Smith",
            recipient_email="jane@example.com",
            amount=5000,  # $50.00
            message="Happy Birthday! Enjoy your haircut.",
            expiry_months=12,
        )

        logger.info(f"Created gift certificate: {gift_cert.code}")
        logger.info(f"Amount: ${gift_cert.original_amount_decimal}")
        logger.info(f"Expires: {gift_cert.expiry_date}")

        # Test validation
        logger.info("\nValidating gift certificate...")
        validation = await service.validate_gift_certificate(gift_cert.code)
        logger.info(f"Validation result: {validation}")

        db.commit()
        return gift_cert

    except Exception as e:
        logger.error(f"Error in test: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


async def test_gift_certificate_statistics():
    """Test gift certificate statistics."""
    db = SessionLocal()
    try:
        # Get statistics
        total_active = (
            db.query(GiftCertificate)
            .filter(GiftCertificate.status == GiftCertificateStatus.ACTIVE)
            .count()
        )

        total_value = db.query(GiftCertificate).all()
        total_issued = sum(cert.original_amount for cert in total_value) / 100
        total_remaining = sum(cert.remaining_balance for cert in total_value) / 100

        logger.info("\nGift Certificate Statistics:")
        logger.info(f"Total certificates: {len(total_value)}")
        logger.info(f"Active certificates: {total_active}")
        logger.info(f"Total value issued: ${total_issued:.2f}")
        logger.info(f"Total remaining balance: ${total_remaining:.2f}")

    finally:
        db.close()


async def test_full_system():
    """Test the full gift certificate system."""
    logger.info("Starting gift certificate system test...")

    # Test creation
    gift_cert = await test_gift_certificate_creation()

    # Test statistics
    await test_gift_certificate_statistics()

    logger.info("\nGift certificate system test completed successfully!")


if __name__ == "__main__":
    asyncio.run(test_full_system())
