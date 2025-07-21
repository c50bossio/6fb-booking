"""
Advanced Payment Rate Limiter

Provides enhanced rate limiting specifically designed for payment security:
- Multi-dimensional rate limiting (amount, frequency, user patterns)
- Fraud detection and pattern analysis
- Environment-aware security configurations
- Integration with payment alerting system
"""

import asyncio
import json
import time
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
import redis
from collections import defaultdict, deque

from config.payment_config import get_payment_config
from services.redis_service import get_redis_client
try:
    from services.payment_alerting_service import PaymentAlertingService
except ImportError:
    # Mock payment alerting service if not available
    class PaymentAlertingService:
        def __init__(self, db):
            self.db = db
        
        async def send_alert(self, alert_type: str, severity: str, message: str, details: Dict[str, Any]):
            """Mock alert sending - logs the alert instead"""
            logger.warning(f"Payment Alert [{severity.upper()}] {alert_type}: {message}")
from utils.logging_config import get_audit_logger
from models import User, Payment, Appointment

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class RateLimitViolationType(Enum):
    """Types of rate limit violations for payment security"""
    FREQUENCY_EXCEEDED = "frequency_exceeded"
    AMOUNT_EXCEEDED = "amount_exceeded"
    VELOCITY_ANOMALY = "velocity_anomaly"
    PATTERN_SUSPICIOUS = "pattern_suspicious"
    GEOGRAPHIC_ANOMALY = "geographic_anomaly"
    PAYMENT_METHOD_ABUSE = "payment_method_abuse"


@dataclass
class PaymentRateLimit:
    """Configuration for payment rate limiting"""
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    max_amount_per_hour: Decimal
    max_amount_per_day: Decimal
    max_transactions_per_card: int  # Per payment method per day
    cooldown_after_failure: int  # Seconds to wait after failed attempts
    suspicious_pattern_threshold: int  # Failed attempts before triggering review


@dataclass
class PaymentAttempt:
    """Record of a payment attempt for analysis"""
    timestamp: datetime
    user_id: Optional[int]
    ip_address: str
    amount: Decimal
    payment_method_fingerprint: str
    appointment_id: Optional[int]
    status: str  # 'success', 'failed', 'pending'
    failure_reason: Optional[str] = None
    geographic_location: Optional[str] = None


class AdvancedPaymentRateLimiter:
    """
    Advanced rate limiter specifically designed for payment security.
    
    Features:
    - Multi-dimensional rate limiting (frequency, amount, patterns)
    - Real-time fraud detection
    - Environment-aware security configurations
    - Integration with alerting system
    """
    
    def __init__(self, db: Session, redis_client: Optional[redis.Redis] = None):
        self.db = db
        self.redis_client = redis_client or get_redis_client()
        self.config = get_payment_config()
        self.alerting_service = PaymentAlertingService(db)
        
        # Initialize rate limit configurations based on environment
        self._initialize_rate_limits()
        
        # In-memory fallback for when Redis is unavailable
        self.memory_cache: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.blocked_ips: Dict[str, datetime] = {}
        self.suspicious_users: Dict[int, datetime] = {}
        
        logger.info(f"Advanced Payment Rate Limiter initialized for {self.config.environment}")

    def _initialize_rate_limits(self):
        """Initialize rate limits based on environment configuration"""
        if self.config.environment == "production":
            self.rate_limits = PaymentRateLimit(
                requests_per_minute=10,
                requests_per_hour=50,
                requests_per_day=200,
                max_amount_per_hour=Decimal("2000.00"),
                max_amount_per_day=Decimal("10000.00"),
                max_transactions_per_card=20,
                cooldown_after_failure=300,  # 5 minutes
                suspicious_pattern_threshold=5
            )
        elif self.config.environment == "staging":
            self.rate_limits = PaymentRateLimit(
                requests_per_minute=20,
                requests_per_hour=100,
                requests_per_day=500,
                max_amount_per_hour=Decimal("5000.00"),
                max_amount_per_day=Decimal("20000.00"),
                max_transactions_per_card=50,
                cooldown_after_failure=60,  # 1 minute
                suspicious_pattern_threshold=10
            )
        else:  # development
            self.rate_limits = PaymentRateLimit(
                requests_per_minute=100,
                requests_per_hour=500,
                requests_per_day=2000,
                max_amount_per_hour=Decimal("50000.00"),
                max_amount_per_day=Decimal("100000.00"),
                max_transactions_per_card=200,
                cooldown_after_failure=5,  # 5 seconds
                suspicious_pattern_threshold=50
            )

    async def check_payment_rate_limit(
        self,
        request: Request,
        user: Optional[User],
        amount: Decimal,
        payment_method_info: Dict[str, Any],
        appointment_id: Optional[int] = None
    ) -> Tuple[bool, Optional[RateLimitViolationType], Optional[str]]:
        """
        Comprehensive payment rate limit check.
        
        Returns:
            Tuple of (allowed, violation_type, message)
        """
        try:
            # Extract user and request information
            user_id = user.id if user else None
            ip_address = self._get_client_ip(request)
            payment_fingerprint = self._generate_payment_fingerprint(payment_method_info)
            
            # Create payment attempt record
            attempt = PaymentAttempt(
                timestamp=datetime.utcnow(),
                user_id=user_id,
                ip_address=ip_address,
                amount=amount,
                payment_method_fingerprint=payment_fingerprint,
                appointment_id=appointment_id,
                status='pending'
            )
            
            # Run all rate limit checks
            checks = [
                self._check_frequency_limits(attempt),
                self._check_amount_limits(attempt),
                self._check_velocity_patterns(attempt),
                self._check_payment_method_abuse(attempt),
                self._check_suspicious_patterns(attempt),
                self._check_geographic_anomalies(attempt)
            ]
            
            # Execute all checks concurrently
            results = await asyncio.gather(*checks, return_exceptions=True)
            
            # Analyze results
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Rate limit check failed: {result}")
                    continue
                
                allowed, violation_type, message = result
                if not allowed:
                    # Record the violation
                    await self._record_violation(attempt, violation_type, message)
                    return False, violation_type, message
            
            # All checks passed - record successful attempt
            await self._record_successful_attempt(attempt)
            return True, None, None
            
        except Exception as e:
            logger.error(f"Payment rate limit check failed: {e}")
            # Fail open in case of errors (but log them)
            return True, None, None

    async def _check_frequency_limits(self, attempt: PaymentAttempt) -> Tuple[bool, Optional[RateLimitViolationType], Optional[str]]:
        """Check frequency-based rate limits"""
        identifier = f"freq:{attempt.user_id or attempt.ip_address}"
        
        try:
            if self.redis_client:
                current_time = int(time.time())
                
                # Check per-minute limit
                minute_key = f"payment_freq_min:{identifier}:{current_time // 60}"
                minute_count = await self._redis_increment_with_expiry(minute_key, 60)
                
                if minute_count > self.rate_limits.requests_per_minute:
                    return False, RateLimitViolationType.FREQUENCY_EXCEEDED, \
                           f"Exceeded {self.rate_limits.requests_per_minute} payments per minute"
                
                # Check per-hour limit
                hour_key = f"payment_freq_hour:{identifier}:{current_time // 3600}"
                hour_count = await self._redis_increment_with_expiry(hour_key, 3600)
                
                if hour_count > self.rate_limits.requests_per_hour:
                    return False, RateLimitViolationType.FREQUENCY_EXCEEDED, \
                           f"Exceeded {self.rate_limits.requests_per_hour} payments per hour"
                
                # Check per-day limit
                day_key = f"payment_freq_day:{identifier}:{current_time // 86400}"
                day_count = await self._redis_increment_with_expiry(day_key, 86400)
                
                if day_count > self.rate_limits.requests_per_day:
                    return False, RateLimitViolationType.FREQUENCY_EXCEEDED, \
                           f"Exceeded {self.rate_limits.requests_per_day} payments per day"
                
            else:
                # Fallback to memory-based rate limiting
                return await self._memory_frequency_check(attempt)
            
            return True, None, None
            
        except Exception as e:
            logger.error(f"Frequency limit check failed: {e}")
            return True, None, None

    async def _check_amount_limits(self, attempt: PaymentAttempt) -> Tuple[bool, Optional[RateLimitViolationType], Optional[str]]:
        """Check amount-based rate limits"""
        identifier = f"amount:{attempt.user_id or attempt.ip_address}"
        
        try:
            if self.redis_client:
                current_time = int(time.time())
                
                # Check hourly amount limit
                hour_key = f"payment_amount_hour:{identifier}:{current_time // 3600}"
                hour_amount = await self._redis_get_amount_total(hour_key)
                
                if hour_amount + attempt.amount > self.rate_limits.max_amount_per_hour:
                    return False, RateLimitViolationType.AMOUNT_EXCEEDED, \
                           f"Exceeded ${self.rate_limits.max_amount_per_hour} per hour limit"
                
                # Check daily amount limit
                day_key = f"payment_amount_day:{identifier}:{current_time // 86400}"
                day_amount = await self._redis_get_amount_total(day_key)
                
                if day_amount + attempt.amount > self.rate_limits.max_amount_per_day:
                    return False, RateLimitViolationType.AMOUNT_EXCEEDED, \
                           f"Exceeded ${self.rate_limits.max_amount_per_day} per day limit"
                
                # Record the amount if checks pass
                await self._redis_add_amount(hour_key, attempt.amount, 3600)
                await self._redis_add_amount(day_key, attempt.amount, 86400)
                
            return True, None, None
            
        except Exception as e:
            logger.error(f"Amount limit check failed: {e}")
            return True, None, None

    async def _check_velocity_patterns(self, attempt: PaymentAttempt) -> Tuple[bool, Optional[RateLimitViolationType], Optional[str]]:
        """Check for suspicious velocity patterns"""
        if not attempt.user_id:
            return True, None, None  # Skip for anonymous users
        
        try:
            # Get recent payment history
            recent_payments = await self._get_recent_payment_history(attempt.user_id, hours=24)
            
            if len(recent_payments) < 3:
                return True, None, None  # Not enough data for pattern analysis
            
            # Check for rapid-fire payments (suspicious pattern)
            rapid_fire_threshold = 5  # payments within 5 minutes
            recent_window = [p for p in recent_payments 
                           if (attempt.timestamp - p.timestamp).total_seconds() < 300]
            
            if len(recent_window) >= rapid_fire_threshold:
                return False, RateLimitViolationType.VELOCITY_ANOMALY, \
                       f"Suspicious rapid payment pattern detected"
            
            # Check for amount escalation pattern
            amounts = [float(p.amount) for p in recent_payments[-5:]]  # Last 5 payments
            if len(amounts) >= 3:
                # Check if amounts are escalating suspiciously
                escalation_factor = 2.0  # Each payment 2x the previous
                escalating = all(amounts[i] >= amounts[i-1] * escalation_factor 
                               for i in range(1, len(amounts)))
                
                if escalating and float(attempt.amount) >= amounts[-1] * escalation_factor:
                    return False, RateLimitViolationType.VELOCITY_ANOMALY, \
                           f"Suspicious amount escalation pattern detected"
            
            return True, None, None
            
        except Exception as e:
            logger.error(f"Velocity pattern check failed: {e}")
            return True, None, None

    async def _check_payment_method_abuse(self, attempt: PaymentAttempt) -> Tuple[bool, Optional[RateLimitViolationType], Optional[str]]:
        """Check for payment method abuse"""
        try:
            if self.redis_client:
                current_time = int(time.time())
                day_key = f"payment_method_day:{attempt.payment_method_fingerprint}:{current_time // 86400}"
                
                method_count = await self._redis_increment_with_expiry(day_key, 86400)
                
                if method_count > self.rate_limits.max_transactions_per_card:
                    return False, RateLimitViolationType.PAYMENT_METHOD_ABUSE, \
                           f"Exceeded {self.rate_limits.max_transactions_per_card} transactions per payment method per day"
            
            return True, None, None
            
        except Exception as e:
            logger.error(f"Payment method abuse check failed: {e}")
            return True, None, None

    async def _check_suspicious_patterns(self, attempt: PaymentAttempt) -> Tuple[bool, Optional[RateLimitViolationType], Optional[str]]:
        """Check for suspicious patterns and behaviors"""
        try:
            identifier = f"suspicious:{attempt.user_id or attempt.ip_address}"
            
            # Check if user/IP is temporarily blocked due to suspicious activity
            if attempt.user_id and attempt.user_id in self.suspicious_users:
                block_time = self.suspicious_users[attempt.user_id]
                if datetime.utcnow() < block_time:
                    return False, RateLimitViolationType.PATTERN_SUSPICIOUS, \
                           "Temporarily blocked due to suspicious activity"
            
            if attempt.ip_address in self.blocked_ips:
                block_time = self.blocked_ips[attempt.ip_address]
                if datetime.utcnow() < block_time:
                    return False, RateLimitViolationType.PATTERN_SUSPICIOUS, \
                           "IP temporarily blocked due to suspicious activity"
            
            # Get failed payment attempts in recent history
            if self.redis_client:
                failure_key = f"payment_failures:{identifier}"
                failure_count = int(await self.redis_client.get(failure_key) or 0)
                
                if failure_count >= self.rate_limits.suspicious_pattern_threshold:
                    # Block for cooldown period
                    block_until = datetime.utcnow() + timedelta(seconds=self.rate_limits.cooldown_after_failure)
                    
                    if attempt.user_id:
                        self.suspicious_users[attempt.user_id] = block_until
                    else:
                        self.blocked_ips[attempt.ip_address] = block_until
                    
                    return False, RateLimitViolationType.PATTERN_SUSPICIOUS, \
                           f"Too many failed attempts. Blocked for {self.rate_limits.cooldown_after_failure} seconds"
            
            return True, None, None
            
        except Exception as e:
            logger.error(f"Suspicious pattern check failed: {e}")
            return True, None, None

    async def _check_geographic_anomalies(self, attempt: PaymentAttempt) -> Tuple[bool, Optional[RateLimitViolationType], Optional[str]]:
        """Check for geographic anomalies (basic implementation)"""
        # This is a basic implementation - in production, you'd want to use
        # a proper geolocation service and more sophisticated analysis
        try:
            if not attempt.user_id:
                return True, None, None  # Skip for anonymous users
            
            # Get user's typical geographic locations from recent history
            # For now, this is a placeholder - implement with actual geolocation
            # when geographic tracking is required
            
            return True, None, None
            
        except Exception as e:
            logger.error(f"Geographic anomaly check failed: {e}")
            return True, None, None

    async def record_payment_result(
        self,
        request: Request,
        user: Optional[User],
        amount: Decimal,
        status: str,
        failure_reason: Optional[str] = None
    ):
        """Record the result of a payment attempt for future analysis"""
        try:
            user_id = user.id if user else None
            ip_address = self._get_client_ip(request)
            identifier = f"result:{user_id or ip_address}"
            
            if status == 'failed' and self.redis_client:
                # Increment failure count
                failure_key = f"payment_failures:{identifier}"
                failure_count = await self._redis_increment_with_expiry(failure_key, 3600)  # 1 hour expiry
                
                # Log the failure
                audit_logger.log_security_event(
                    event_type="payment_failure",
                    user_id=user_id,
                    details={
                        "ip_address": ip_address,
                        "amount": float(amount),
                        "failure_reason": failure_reason,
                        "failure_count": failure_count
                    }
                )
                
                # Alert if failure count is high
                if failure_count >= self.rate_limits.suspicious_pattern_threshold // 2:
                    await self.alerting_service.send_alert(
                        alert_type="payment_failure_pattern",
                        severity="warning",
                        message=f"High payment failure rate detected for user {user_id}",
                        details={
                            "user_id": user_id,
                            "ip_address": ip_address,
                            "failure_count": failure_count,
                            "amount": float(amount)
                        }
                    )
            
            elif status == 'success' and self.redis_client:
                # Clear failure count on successful payment
                failure_key = f"payment_failures:{identifier}"
                await self.redis_client.delete(failure_key)
                
        except Exception as e:
            logger.error(f"Failed to record payment result: {e}")

    # Helper methods
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded IP first (common in production behind proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection IP
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"
    
    def _generate_payment_fingerprint(self, payment_method_info: Dict[str, Any]) -> str:
        """Generate a fingerprint for the payment method"""
        # Create a hash of relevant payment method details
        # (without storing sensitive information)
        import hashlib
        
        fingerprint_data = {
            'type': payment_method_info.get('type', 'unknown'),
            'last4': payment_method_info.get('last4', ''),
            'brand': payment_method_info.get('brand', ''),
            'exp_month': payment_method_info.get('exp_month', ''),
            'exp_year': payment_method_info.get('exp_year', '')
        }
        
        fingerprint_str = json.dumps(fingerprint_data, sort_keys=True)
        return hashlib.sha256(fingerprint_str.encode()).hexdigest()[:16]

    async def _redis_increment_with_expiry(self, key: str, expiry_seconds: int) -> int:
        """Increment a Redis key with expiry"""
        pipe = self.redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, expiry_seconds)
        results = await pipe.execute()
        return results[0]

    async def _redis_get_amount_total(self, key: str) -> Decimal:
        """Get total amount from Redis key"""
        value = await self.redis_client.get(key)
        return Decimal(value.decode()) if value else Decimal('0.00')

    async def _redis_add_amount(self, key: str, amount: Decimal, expiry_seconds: int):
        """Add amount to Redis key with expiry"""
        pipe = self.redis_client.pipeline()
        current = await self._redis_get_amount_total(key)
        new_total = current + amount
        pipe.set(key, str(new_total), ex=expiry_seconds)
        await pipe.execute()

    async def _get_recent_payment_history(self, user_id: int, hours: int = 24) -> List[PaymentAttempt]:
        """Get recent payment history for a user"""
        # Query the database for recent payments
        since = datetime.utcnow() - timedelta(hours=hours)
        
        payments = self.db.query(Payment).filter(
            Payment.user_id == user_id,
            Payment.created_at >= since
        ).order_by(Payment.created_at.desc()).limit(50).all()
        
        # Convert to PaymentAttempt objects
        attempts = []
        for payment in payments:
            attempts.append(PaymentAttempt(
                timestamp=payment.created_at,
                user_id=payment.user_id,
                ip_address="unknown",  # Not stored in Payment model
                amount=Decimal(str(payment.amount)),
                payment_method_fingerprint="unknown",  # Would need to be calculated
                appointment_id=payment.appointment_id,
                status='success' if payment.status == 'completed' else 'failed'
            ))
        
        return attempts

    async def _memory_frequency_check(self, attempt: PaymentAttempt) -> Tuple[bool, Optional[RateLimitViolationType], Optional[str]]:
        """Fallback memory-based frequency checking"""
        identifier = f"freq:{attempt.user_id or attempt.ip_address}"
        now = datetime.utcnow()
        
        # Clean old entries
        cutoff = now - timedelta(days=1)
        self.memory_cache[identifier] = deque([
            ts for ts in self.memory_cache[identifier] if ts > cutoff
        ], maxlen=1000)
        
        # Check limits
        minute_ago = now - timedelta(minutes=1)
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        recent_minute = sum(1 for ts in self.memory_cache[identifier] if ts > minute_ago)
        recent_hour = sum(1 for ts in self.memory_cache[identifier] if ts > hour_ago)
        recent_day = sum(1 for ts in self.memory_cache[identifier] if ts > day_ago)
        
        if recent_minute >= self.rate_limits.requests_per_minute:
            return False, RateLimitViolationType.FREQUENCY_EXCEEDED, \
                   f"Exceeded {self.rate_limits.requests_per_minute} payments per minute"
        
        if recent_hour >= self.rate_limits.requests_per_hour:
            return False, RateLimitViolationType.FREQUENCY_EXCEEDED, \
                   f"Exceeded {self.rate_limits.requests_per_hour} payments per hour"
        
        if recent_day >= self.rate_limits.requests_per_day:
            return False, RateLimitViolationType.FREQUENCY_EXCEEDED, \
                   f"Exceeded {self.rate_limits.requests_per_day} payments per day"
        
        # Add current attempt
        self.memory_cache[identifier].append(now)
        return True, None, None

    async def _record_violation(self, attempt: PaymentAttempt, violation_type: RateLimitViolationType, message: str):
        """Record a rate limit violation"""
        audit_logger.log_security_event(
            event_type="payment_rate_limit_violation",
            user_id=attempt.user_id,
            details={
                "violation_type": violation_type.value,
                "ip_address": attempt.ip_address,
                "amount": float(attempt.amount),
                "message": message,
                "payment_method": attempt.payment_method_fingerprint
            }
        )
        
        # Send alert for serious violations
        if violation_type in [RateLimitViolationType.VELOCITY_ANOMALY, 
                             RateLimitViolationType.PATTERN_SUSPICIOUS]:
            await self.alerting_service.send_alert(
                alert_type="payment_security_violation",
                severity="high",
                message=f"Payment security violation: {message}",
                details={
                    "user_id": attempt.user_id,
                    "violation_type": violation_type.value,
                    "ip_address": attempt.ip_address,
                    "amount": float(attempt.amount)
                }
            )

    async def _record_successful_attempt(self, attempt: PaymentAttempt):
        """Record a successful payment attempt"""
        # This could be used for analytics and pattern learning
        pass

    async def get_rate_limit_status(self, request: Request, user: Optional[User]) -> Dict[str, Any]:
        """Get current rate limit status for debugging/monitoring"""
        user_id = user.id if user else None
        ip_address = self._get_client_ip(request)
        identifier = f"status:{user_id or ip_address}"
        
        try:
            if self.redis_client:
                current_time = int(time.time())
                
                # Get current counts
                minute_key = f"payment_freq_min:{identifier}:{current_time // 60}"
                hour_key = f"payment_freq_hour:{identifier}:{current_time // 3600}"
                day_key = f"payment_freq_day:{identifier}:{current_time // 86400}"
                
                minute_count = int(await self.redis_client.get(minute_key) or 0)
                hour_count = int(await self.redis_client.get(hour_key) or 0)
                day_count = int(await self.redis_client.get(day_key) or 0)
                
                return {
                    "environment": self.config.environment,
                    "current_usage": {
                        "requests_this_minute": minute_count,
                        "requests_this_hour": hour_count,
                        "requests_this_day": day_count
                    },
                    "limits": {
                        "requests_per_minute": self.rate_limits.requests_per_minute,
                        "requests_per_hour": self.rate_limits.requests_per_hour,
                        "requests_per_day": self.rate_limits.requests_per_day,
                        "max_amount_per_hour": float(self.rate_limits.max_amount_per_hour),
                        "max_amount_per_day": float(self.rate_limits.max_amount_per_day)
                    },
                    "remaining": {
                        "requests_this_minute": max(0, self.rate_limits.requests_per_minute - minute_count),
                        "requests_this_hour": max(0, self.rate_limits.requests_per_hour - hour_count),
                        "requests_this_day": max(0, self.rate_limits.requests_per_day - day_count)
                    }
                }
            else:
                return {
                    "environment": self.config.environment,
                    "message": "Rate limiting status unavailable (Redis not connected)",
                    "limits": asdict(self.rate_limits)
                }
        
        except Exception as e:
            logger.error(f"Failed to get rate limit status: {e}")
            return {"error": f"Failed to get rate limit status: {str(e)}"}