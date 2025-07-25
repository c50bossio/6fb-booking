"""
Upselling Conversion Detection Service
Automatically detects when clients book suggested services and records conversions.
Monitors appointment creation and matches against active upselling attempts.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from models import User, Appointment
from models.upselling import UpsellAttempt, UpsellConversion, UpsellStatus, UpsellChannel
from db import get_db

logger = logging.getLogger(__name__)


class ServiceMatcher:
    """Utility class for matching booked services to suggested services"""
    
    # Service similarity mapping - handles different ways to refer to the same service
    SERVICE_ALIASES = {
        'basic cut': ['haircut', 'cut', 'basic haircut', 'simple cut'],
        'premium cut': ['premium haircut', 'deluxe cut', 'signature cut'],
        'beard trim': ['beard', 'trim', 'beard trimming', 'facial hair'],
        'beard maintenance': ['beard care', 'beard service', 'beard treatment'],
        'premium cut + beard trim': [
            'full service', 'complete package', 'cut and beard', 
            'haircut and beard', 'premium service', 'deluxe package'
        ],
        'styling': ['hair styling', 'style', 'finish', 'blow dry'],
        'shampoo': ['wash', 'hair wash', 'cleanse'],
        'hot towel': ['towel service', 'hot towel treatment'],
        'straight razor': ['razor shave', 'traditional shave', 'wet shave']
    }
    
    @classmethod
    def normalize_service_name(cls, service_name: str) -> str:
        """Normalize service name for comparison"""
        return service_name.lower().strip()
    
    @classmethod
    def services_match(cls, suggested_service: str, booked_service: str, threshold: float = 0.8) -> bool:
        """
        Check if a booked service matches the suggested service.
        Uses fuzzy matching and service aliases.
        """
        suggested = cls.normalize_service_name(suggested_service)
        booked = cls.normalize_service_name(booked_service)
        
        # Exact match
        if suggested == booked:
            return True
        
        # Check if booked service contains the suggested service (or vice versa)
        if suggested in booked or booked in suggested:
            return True
        
        # Check aliases
        for canonical_service, aliases in cls.SERVICE_ALIASES.items():
            if suggested == canonical_service or suggested in aliases:
                if booked == canonical_service or booked in aliases:
                    return True
        
        # Check for partial matches with common words
        suggested_words = set(suggested.split())
        booked_words = set(booked.split())
        
        # If they share significant words, consider it a match
        common_words = suggested_words & booked_words
        if common_words:
            # Calculate similarity score
            total_words = len(suggested_words | booked_words)
            similarity = len(common_words) / total_words if total_words > 0 else 0
            
            return similarity >= threshold
        
        return False
    
    @classmethod
    def calculate_revenue_match(cls, suggested_revenue: float, actual_price: float) -> Dict[str, Any]:
        """Calculate how well the actual revenue matches the suggestion"""
        if actual_price <= 0:
            return {
                'revenue_difference': -suggested_revenue,
                'revenue_ratio': 0.0,
                'upgrade_successful': False
            }
        
        revenue_difference = actual_price - suggested_revenue
        revenue_ratio = actual_price / suggested_revenue if suggested_revenue > 0 else 1.0
        
        # Consider it successful if within 20% of suggested revenue or higher
        upgrade_successful = revenue_ratio >= 0.8
        
        return {
            'revenue_difference': revenue_difference,
            'revenue_ratio': revenue_ratio,
            'upgrade_successful': upgrade_successful
        }


class UpsellConversionDetector:
    """Service for detecting upselling conversions from appointment bookings"""
    
    def __init__(self):
        self.service_matcher = ServiceMatcher()
    
    async def check_for_conversions(
        self, 
        appointment: Appointment, 
        db: Session,
        detection_window_hours: int = 168  # 7 days default
    ) -> List[Dict[str, Any]]:
        """
        Check if a new appointment represents an upselling conversion.
        
        Args:
            appointment: The newly created appointment
            db: Database session
            detection_window_hours: How far back to look for upselling attempts
            
        Returns:
            List of conversion records created
        """
        conversions_created = []
        
        try:
            # Find recent upselling attempts for this client and barber
            cutoff_time = datetime.utcnow() - timedelta(hours=detection_window_hours)
            
            potential_attempts = db.query(UpsellAttempt).filter(
                and_(
                    UpsellAttempt.client_id == appointment.user_id,
                    UpsellAttempt.barber_id == appointment.barber_id,
                    UpsellAttempt.implemented_at >= cutoff_time,
                    UpsellAttempt.status.in_([
                        UpsellStatus.IMPLEMENTED,
                        UpsellStatus.AUTOMATION_SENT,
                        UpsellStatus.CLIENT_CONTACTED
                    ])
                )
            ).order_by(desc(UpsellAttempt.implemented_at)).all()
            
            logger.info(f"Found {len(potential_attempts)} potential upselling attempts for appointment {appointment.id}")
            
            # Check each attempt for service matches
            for attempt in potential_attempts:
                conversion_result = await self._check_single_conversion(
                    attempt, appointment, db
                )
                
                if conversion_result:
                    conversions_created.append(conversion_result)
            
            return conversions_created
            
        except Exception as e:
            logger.error(f"Error detecting conversions for appointment {appointment.id}: {str(e)}")
            return []
    
    async def _check_single_conversion(
        self, 
        attempt: UpsellAttempt, 
        appointment: Appointment, 
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Check if a single upselling attempt matches the appointment"""
        
        try:
            # Check if we already recorded a conversion for this attempt
            existing_conversion = db.query(UpsellConversion).filter(
                UpsellConversion.attempt_id == attempt.id
            ).first()
            
            if existing_conversion:
                logger.info(f"Conversion already exists for attempt {attempt.id}")
                return None
            
            # Check if services match
            service_match = self.service_matcher.services_match(
                attempt.suggested_service,
                appointment.service_name or ""
            )
            
            if not service_match:
                logger.debug(f"Service mismatch: '{attempt.suggested_service}' vs '{appointment.service_name}'")
                return None
            
            # Calculate revenue metrics
            actual_price = float(appointment.price) if appointment.price else 0.0
            revenue_analysis = self.service_matcher.calculate_revenue_match(
                float(attempt.potential_revenue), actual_price
            )
            
            # Calculate time to conversion
            time_to_conversion = int(
                (appointment.created_at - attempt.implemented_at).total_seconds() / 3600
            ) if appointment.created_at and attempt.implemented_at else None
            
            # Create conversion record
            conversion = UpsellConversion(
                attempt_id=attempt.id,
                converted=True,
                conversion_channel=self._determine_conversion_channel(attempt, appointment),
                actual_service_booked=appointment.service_name,
                actual_revenue=actual_price,
                revenue_difference=revenue_analysis['revenue_difference'],
                appointment_id=appointment.id,
                booking_date=appointment.created_at,
                service_date=appointment.start_time,
                time_to_conversion=time_to_conversion,
                converted_at=datetime.utcnow(),
                conversion_notes=f"Auto-detected conversion via service match: {attempt.suggested_service} -> {appointment.service_name}"
            )
            
            db.add(conversion)
            
            # Update attempt status
            attempt.status = UpsellStatus.CONVERTED
            
            db.commit()
            db.refresh(conversion)
            
            logger.info(f"✅ Conversion detected! Attempt {attempt.id} -> Appointment {appointment.id}")
            logger.info(f"   Service: {attempt.suggested_service} -> {appointment.service_name}")
            logger.info(f"   Revenue: ${attempt.potential_revenue} -> ${actual_price}")
            logger.info(f"   Time to conversion: {time_to_conversion} hours")
            
            return {
                'conversion_id': conversion.id,
                'attempt_id': attempt.id,
                'appointment_id': appointment.id,
                'service_match': True,
                'revenue_analysis': revenue_analysis,
                'time_to_conversion_hours': time_to_conversion,
                'detection_method': 'automatic_service_match'
            }
            
        except Exception as e:
            logger.error(f"Error checking conversion for attempt {attempt.id}: {str(e)}")
            db.rollback()
            return None
    
    def _determine_conversion_channel(
        self, 
        attempt: UpsellAttempt, 
        appointment: Appointment
    ) -> UpsellChannel:
        """Determine which channel likely led to the conversion"""
        
        # If automation was sent, assume that channel was effective
        if attempt.automation_triggered:
            return attempt.channel
        
        # For in-person attempts, check timing
        if attempt.channel == UpsellChannel.IN_PERSON:
            return UpsellChannel.IN_PERSON
        
        # Default to the original attempt channel
        return attempt.channel
    
    async def check_missed_conversions(
        self, 
        db: Session, 
        lookback_days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Check for conversions that might have been missed.
        Useful for periodic cleanup or after system updates.
        """
        conversions_found = []
        
        try:
            # Find attempts without conversions in the lookback period
            cutoff_time = datetime.utcnow() - timedelta(days=lookback_days)
            
            orphaned_attempts = db.query(UpsellAttempt).filter(
                and_(
                    UpsellAttempt.implemented_at >= cutoff_time,
                    UpsellAttempt.status != UpsellStatus.CONVERTED,
                    ~UpsellAttempt.conversions.any()  # No existing conversions
                )
            ).all()
            
            logger.info(f"Checking {len(orphaned_attempts)} attempts for missed conversions")
            
            for attempt in orphaned_attempts:
                # Find appointments by this client and barber after the attempt
                appointments = db.query(Appointment).filter(
                    and_(
                        Appointment.user_id == attempt.client_id,
                        Appointment.barber_id == attempt.barber_id,
                        Appointment.created_at >= attempt.implemented_at,
                        Appointment.created_at <= attempt.expires_at if attempt.expires_at else True
                    )
                ).all()
                
                for appointment in appointments:
                    conversion_result = await self._check_single_conversion(
                        attempt, appointment, db
                    )
                    
                    if conversion_result:
                        conversions_found.append(conversion_result)
                        break  # One conversion per attempt
            
            logger.info(f"Found {len(conversions_found)} missed conversions")
            
            return conversions_found
            
        except Exception as e:
            logger.error(f"Error checking missed conversions: {str(e)}")
            return []
    
    async def manual_conversion_check(
        self, 
        attempt_id: int, 
        appointment_id: int, 
        db: Session
    ) -> Dict[str, Any]:
        """
        Manually check if an appointment represents a conversion for an attempt.
        Useful for edge cases or manual verification.
        """
        try:
            attempt = db.query(UpsellAttempt).filter(UpsellAttempt.id == attempt_id).first()
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            
            if not attempt or not appointment:
                return {
                    'success': False,
                    'error': 'Attempt or appointment not found'
                }
            
            conversion_result = await self._check_single_conversion(attempt, appointment, db)
            
            if conversion_result:
                return {
                    'success': True,
                    'message': 'Conversion detected and recorded',
                    'conversion': conversion_result
                }
            else:
                return {
                    'success': False,
                    'message': 'No conversion match found',
                    'details': {
                        'suggested_service': attempt.suggested_service,
                        'actual_service': appointment.service_name,
                        'service_match': self.service_matcher.services_match(
                            attempt.suggested_service, appointment.service_name or ""
                        )
                    }
                }
                
        except Exception as e:
            logger.error(f"Error in manual conversion check: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_conversion_statistics(self, db: Session, days: int = 30) -> Dict[str, Any]:
        """Get statistics about conversion detection"""
        
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            # Total attempts in period
            total_attempts = db.query(UpsellAttempt).filter(
                UpsellAttempt.implemented_at >= cutoff_time
            ).count()
            
            # Converted attempts
            converted_attempts = db.query(UpsellAttempt).filter(
                and_(
                    UpsellAttempt.implemented_at >= cutoff_time,
                    UpsellAttempt.status == UpsellStatus.CONVERTED
                )
            ).count()
            
            # Auto-detected conversions
            auto_conversions = db.query(UpsellConversion).join(UpsellAttempt).filter(
                and_(
                    UpsellAttempt.implemented_at >= cutoff_time,
                    UpsellConversion.conversion_notes.like('%Auto-detected%')
                )
            ).count()
            
            conversion_rate = (converted_attempts / total_attempts * 100) if total_attempts > 0 else 0
            auto_detection_rate = (auto_conversions / converted_attempts * 100) if converted_attempts > 0 else 0
            
            return {
                'period_days': days,
                'total_attempts': total_attempts,
                'converted_attempts': converted_attempts,
                'auto_detected': auto_conversions,
                'conversion_rate_percent': round(conversion_rate, 1),
                'auto_detection_rate_percent': round(auto_detection_rate, 1),
                'manual_conversions': converted_attempts - auto_conversions
            }
            
        except Exception as e:
            logger.error(f"Error getting conversion statistics: {str(e)}")
            return {
                'error': str(e)
            }