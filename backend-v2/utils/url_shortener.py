"""
URL Shortener Utility for BookedBarber SMS Links
Creates branded short links and tracks clicks
"""

import string
import random
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from urllib.parse import urljoin
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, desc
from database import Base, engine
import logging

logger = logging.getLogger(__name__)

class ShortUrl(Base):
    """Model for storing shortened URLs"""
    __tablename__ = "short_urls"
    
    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String(10), unique=True, index=True, nullable=False)
    original_url = Column(Text, nullable=False)
    title = Column(String(200), nullable=True)
    description = Column(String(500), nullable=True)
    
    # Tracking fields
    click_count = Column(Integer, default=0)
    last_clicked = Column(DateTime, nullable=True)
    
    # Metadata
    created_by = Column(String(100), nullable=True)  # System, user_id, etc.
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create table if it doesn't exist
ShortUrl.__table__.create(bind=engine, checkfirst=True)

class UrlShortener:
    """Professional URL shortener for BookedBarber SMS links"""
    
    def __init__(self, base_domain: str = "bkdbrbr.com"):
        self.base_domain = base_domain
        self.characters = string.ascii_letters + string.digits
        
    def generate_short_code(self, length: int = 6) -> str:
        """Generate a unique short code"""
        return ''.join(random.choices(self.characters, k=length))
    
    def create_short_url(
        self,
        db: Session,
        original_url: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        custom_code: Optional[str] = None,
        expires_in_days: Optional[int] = None,
        created_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a shortened URL
        
        Args:
            db: Database session
            original_url: The original URL to shorten
            title: Optional title for the link
            description: Optional description
            custom_code: Optional custom short code
            expires_in_days: Optional expiration in days
            created_by: Who created this link
            
        Returns:
            Dict with short_url, short_code, and metadata
        """
        try:
            # Generate or validate short code
            if custom_code:
                short_code = custom_code
                # Check if custom code already exists
                existing = db.query(ShortUrl).filter(
                    ShortUrl.short_code == short_code
                ).first()
                if existing:
                    raise ValueError(f"Custom code '{custom_code}' already exists")
            else:
                # Generate unique short code
                max_attempts = 10
                for _ in range(max_attempts):
                    short_code = self.generate_short_code()
                    existing = db.query(ShortUrl).filter(
                        ShortUrl.short_code == short_code
                    ).first()
                    if not existing:
                        break
                else:
                    raise Exception("Could not generate unique short code")
            
            # Calculate expiration
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            # Create short URL record
            short_url_record = ShortUrl(
                short_code=short_code,
                original_url=original_url,
                title=title,
                description=description,
                expires_at=expires_at,
                created_by=created_by or "system"
            )
            
            db.add(short_url_record)
            db.commit()
            
            # Generate the full short URL
            short_url = f"https://{self.base_domain}/{short_code}"
            
            logger.info(f"Created short URL: {short_url} -> {original_url}")
            
            return {
                "success": True,
                "short_url": short_url,
                "short_code": short_code,
                "original_url": original_url,
                "id": short_url_record.id,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "created_at": short_url_record.created_at.isoformat()
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating short URL: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_original_url(self, db: Session, short_code: str) -> Optional[Dict[str, Any]]:
        """
        Get original URL from short code and track click
        
        Args:
            db: Database session
            short_code: The short code to resolve
            
        Returns:
            Dict with original_url and metadata, or None if not found
        """
        try:
            # Find the short URL record
            short_url_record = db.query(ShortUrl).filter(
                ShortUrl.short_code == short_code,
                ShortUrl.is_active == True
            ).first()
            
            if not short_url_record:
                logger.warning(f"Short code not found: {short_code}")
                return None
            
            # Check expiration
            if short_url_record.expires_at and short_url_record.expires_at < datetime.utcnow():
                logger.warning(f"Short code expired: {short_code}")
                return None
            
            # Track the click
            short_url_record.click_count += 1
            short_url_record.last_clicked = datetime.utcnow()
            db.commit()
            
            logger.info(f"Short URL clicked: {short_code} -> {short_url_record.original_url}")
            
            return {
                "original_url": short_url_record.original_url,
                "title": short_url_record.title,
                "description": short_url_record.description,
                "click_count": short_url_record.click_count,
                "created_at": short_url_record.created_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error resolving short URL {short_code}: {str(e)}")
            return None
    
    def get_stats(self, db: Session, short_code: str) -> Optional[Dict[str, Any]]:
        """Get statistics for a short URL"""
        try:
            short_url_record = db.query(ShortUrl).filter(
                ShortUrl.short_code == short_code
            ).first()
            
            if not short_url_record:
                return None
            
            return {
                "short_code": short_code,
                "original_url": short_url_record.original_url,
                "title": short_url_record.title,
                "click_count": short_url_record.click_count,
                "last_clicked": short_url_record.last_clicked.isoformat() if short_url_record.last_clicked else None,
                "created_at": short_url_record.created_at.isoformat(),
                "expires_at": short_url_record.expires_at.isoformat() if short_url_record.expires_at else None,
                "is_active": short_url_record.is_active
            }
            
        except Exception as e:
            logger.error(f"Error getting stats for {short_code}: {str(e)}")
            return None
    
    def create_appointment_link(
        self,
        db: Session,
        appointment_id: int,
        action: str = "view",
        base_url: str = "https://app.bookedbarber.com"
    ) -> Optional[str]:
        """
        Create a branded short link for appointment-related actions
        
        Args:
            db: Database session
            appointment_id: The appointment ID
            action: The action (view, cancel, reschedule, confirm)
            base_url: Base URL for the application
            
        Returns:
            Short URL string or None if failed
        """
        action_paths = {
            "view": f"/appointments/{appointment_id}",
            "cancel": f"/appointments/{appointment_id}/cancel",
            "reschedule": f"/appointments/{appointment_id}/reschedule",
            "confirm": f"/appointments/{appointment_id}/confirm"
        }
        
        if action not in action_paths:
            logger.error(f"Invalid appointment action: {action}")
            return None
        
        original_url = urljoin(base_url, action_paths[action])
        
        result = self.create_short_url(
            db=db,
            original_url=original_url,
            title=f"Appointment {action.title()}",
            description=f"BookedBarber appointment {action} for appointment #{appointment_id}",
            custom_code=f"appt{appointment_id}{action[0]}",  # e.g., appt123v, appt123c
            expires_in_days=90,  # Appointments expire after 90 days
            created_by="appointment_system"
        )
        
        return result.get("short_url") if result.get("success") else None
    
    def create_booking_link(
        self,
        db: Session,
        barber_id: Optional[int] = None,
        service_id: Optional[int] = None,
        base_url: str = "https://app.bookedbarber.com"
    ) -> Optional[str]:
        """
        Create a branded short link for booking
        
        Args:
            db: Database session
            barber_id: Optional specific barber
            service_id: Optional specific service
            base_url: Base URL for the application
            
        Returns:
            Short URL string or None if failed
        """
        # Build booking URL with parameters
        booking_path = "/book"
        params = []
        
        if barber_id:
            params.append(f"barber={barber_id}")
        if service_id:
            params.append(f"service={service_id}")
        
        if params:
            booking_path += "?" + "&".join(params)
        
        original_url = urljoin(base_url, booking_path)
        
        # Generate custom code
        custom_parts = ["book"]
        if barber_id:
            custom_parts.append(f"b{barber_id}")
        if service_id:
            custom_parts.append(f"s{service_id}")
        
        custom_code = "".join(custom_parts)
        
        result = self.create_short_url(
            db=db,
            original_url=original_url,
            title="Book Appointment",
            description="Book an appointment with BookedBarber",
            custom_code=custom_code if len(custom_code) <= 10 else None,
            expires_in_days=365,  # Booking links are long-lived
            created_by="booking_system"
        )
        
        return result.get("short_url") if result.get("success") else None
    
    def cleanup_expired_urls(self, db: Session) -> int:
        """Remove expired URLs from the database"""
        try:
            expired_count = db.query(ShortUrl).filter(
                ShortUrl.expires_at < datetime.utcnow(),
                ShortUrl.is_active == True
            ).update({
                ShortUrl.is_active: False
            })
            
            db.commit()
            logger.info(f"Deactivated {expired_count} expired short URLs")
            return expired_count
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error cleaning up expired URLs: {str(e)}")
            return 0
    
    def get_top_links(self, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top clicked short URLs"""
        try:
            top_links = db.query(ShortUrl).filter(
                ShortUrl.is_active == True
            ).order_by(desc(ShortUrl.click_count)).limit(limit).all()
            
            return [
                {
                    "short_code": link.short_code,
                    "title": link.title,
                    "click_count": link.click_count,
                    "created_at": link.created_at.isoformat(),
                    "last_clicked": link.last_clicked.isoformat() if link.last_clicked else None
                }
                for link in top_links
            ]
            
        except Exception as e:
            logger.error(f"Error getting top links: {str(e)}")
            return []

# Singleton instance
url_shortener = UrlShortener()

# Utility functions for easy access
def create_appointment_short_url(
    db: Session,
    appointment_id: int,
    action: str = "view"
) -> Optional[str]:
    """Helper function to create appointment short URLs"""
    return url_shortener.create_appointment_link(db, appointment_id, action)

def create_booking_short_url(
    db: Session,
    barber_id: Optional[int] = None,
    service_id: Optional[int] = None
) -> Optional[str]:
    """Helper function to create booking short URLs"""
    return url_shortener.create_booking_link(db, barber_id, service_id)

def resolve_short_url(db: Session, short_code: str) -> Optional[str]:
    """Helper function to resolve short URLs"""
    result = url_shortener.get_original_url(db, short_code)
    return result.get("original_url") if result else None