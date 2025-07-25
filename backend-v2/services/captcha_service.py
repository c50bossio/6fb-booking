"""
CAPTCHA service for guest booking protection.

This service manages CAPTCHA requirements for guest bookings,
tracking failed attempts and requiring CAPTCHA verification
after a configured number of failures.
"""

import os
import redis
from typing import Optional, Dict, Tuple
from datetime import datetime, timedelta
import httpx
from config import settings
import logging

logger = logging.getLogger(__name__)

class CaptchaService:
    """Service for managing CAPTCHA requirements and verification."""
    
    def __init__(self):
        """Initialize CAPTCHA service with Redis connection."""
        # Use Redis for tracking failed attempts
        redis_url = getattr(settings, 'redis_url', None) or os.environ.get('REDIS_URL')
        if redis_url:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
        else:
            # Fallback to in-memory storage for development
            self.redis_client = None
            self._memory_storage = {}
            logger.warning("Redis not available, using in-memory storage for CAPTCHA tracking")
        
        # Configuration
        self.max_failed_attempts = 2  # Require CAPTCHA after 2 failed attempts
        self.attempt_window = 3600  # 1 hour window for tracking attempts
        self.captcha_duration = 86400  # Require CAPTCHA for 24 hours after triggering
        
        # reCAPTCHA configuration
        self.recaptcha_secret = os.environ.get('RECAPTCHA_SECRET_KEY', '')
        self.recaptcha_verify_url = 'https://www.google.com/recaptcha/api/siteverify'
        self.recaptcha_enabled = bool(self.recaptcha_secret)
    
    def _get_guest_key(self, identifier: str) -> str:
        """Generate Redis key for guest tracking."""
        return f"guest_booking:attempts:{identifier}"
    
    def _get_captcha_key(self, identifier: str) -> str:
        """Generate Redis key for CAPTCHA requirement tracking."""
        return f"guest_booking:captcha_required:{identifier}"
    
    def track_failed_attempt(self, identifier: str) -> Tuple[int, bool]:
        """
        Track a failed booking attempt for a guest.
        
        Args:
            identifier: Unique identifier (IP address or email)
            
        Returns:
            Tuple of (attempt_count, captcha_required)
        """
        attempt_key = self._get_guest_key(identifier)
        captcha_key = self._get_captcha_key(identifier)
        
        if self.redis_client:
            # Increment attempt counter
            pipe = self.redis_client.pipeline()
            pipe.incr(attempt_key)
            pipe.expire(attempt_key, self.attempt_window)
            results = pipe.execute()
            attempt_count = results[0]
            
            # Check if CAPTCHA should be required
            if attempt_count >= self.max_failed_attempts:
                self.redis_client.setex(captcha_key, self.captcha_duration, "1")
                return attempt_count, True
            
            # Check if CAPTCHA is already required
            captcha_required = bool(self.redis_client.get(captcha_key))
            return attempt_count, captcha_required
        else:
            # In-memory fallback
            now = datetime.utcnow()
            
            # Clean up old entries
            self._cleanup_memory_storage()
            
            # Track attempt
            if identifier not in self._memory_storage:
                self._memory_storage[identifier] = {
                    'attempts': [],
                    'captcha_required_until': None
                }
            
            entry = self._memory_storage[identifier]
            entry['attempts'].append(now)
            
            # Count recent attempts
            recent_attempts = [
                attempt for attempt in entry['attempts']
                if now - attempt < timedelta(seconds=self.attempt_window)
            ]
            entry['attempts'] = recent_attempts
            attempt_count = len(recent_attempts)
            
            # Check if CAPTCHA should be required
            if attempt_count >= self.max_failed_attempts:
                entry['captcha_required_until'] = now + timedelta(seconds=self.captcha_duration)
            
            # Check if CAPTCHA is required
            captcha_required = (
                entry['captcha_required_until'] is not None and
                now < entry['captcha_required_until']
            )
            
            return attempt_count, captcha_required
    
    def clear_failed_attempts(self, identifier: str) -> None:
        """Clear failed attempts for a guest after successful booking."""
        if self.redis_client:
            attempt_key = self._get_guest_key(identifier)
            self.redis_client.delete(attempt_key)
        else:
            if identifier in self._memory_storage:
                self._memory_storage[identifier]['attempts'] = []
    
    def is_captcha_required(self, identifier: str) -> bool:
        """Check if CAPTCHA is required for a guest."""
        if self.redis_client:
            captcha_key = self._get_captcha_key(identifier)
            return bool(self.redis_client.get(captcha_key))
        else:
            if identifier not in self._memory_storage:
                return False
            
            entry = self._memory_storage[identifier]
            now = datetime.utcnow()
            return (
                entry.get('captcha_required_until') is not None and
                now < entry['captcha_required_until']
            )
    
    async def verify_captcha(self, token: str, remote_ip: Optional[str] = None) -> bool:
        """
        Verify reCAPTCHA token with Google.
        
        Args:
            token: reCAPTCHA token from client
            remote_ip: Client IP address (optional)
            
        Returns:
            True if verification succeeds, False otherwise
        """
        if not self.recaptcha_enabled:
            logger.warning("reCAPTCHA verification requested but no secret key configured")
            return True  # Allow in development without configuration
        
        if not token:
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                data = {
                    'secret': self.recaptcha_secret,
                    'response': token
                }
                if remote_ip:
                    data['remoteip'] = remote_ip
                
                response = await client.post(
                    self.recaptcha_verify_url,
                    data=data,
                    timeout=10.0
                )
                
                result = response.json()
                success = result.get('success', False)
                
                if not success:
                    error_codes = result.get('error-codes', [])
                    logger.warning(f"reCAPTCHA verification failed: {error_codes}")
                
                return success
        except Exception as e:
            logger.error(f"reCAPTCHA verification error: {e}")
            # Fail open in case of network issues to not block legitimate users
            return True
    
    def clear_captcha_requirement(self, identifier: str) -> None:
        """Clear CAPTCHA requirement for a guest after successful verification."""
        if self.redis_client:
            captcha_key = self._get_captcha_key(identifier)
            self.redis_client.delete(captcha_key)
        else:
            if identifier in self._memory_storage:
                self._memory_storage[identifier]['captcha_required_until'] = None
    
    def _cleanup_memory_storage(self) -> None:
        """Clean up expired entries from in-memory storage."""
        if not self.redis_client:
            now = datetime.utcnow()
            expired_keys = []
            
            for identifier, entry in self._memory_storage.items():
                # Remove entries with no recent attempts and no active CAPTCHA requirement
                recent_attempts = [
                    attempt for attempt in entry.get('attempts', [])
                    if now - attempt < timedelta(seconds=self.attempt_window)
                ]
                
                captcha_active = (
                    entry.get('captcha_required_until') is not None and
                    now < entry['captcha_required_until']
                )
                
                if not recent_attempts and not captcha_active:
                    expired_keys.append(identifier)
            
            for key in expired_keys:
                del self._memory_storage[key]
    
    def get_guest_identifier(self, request_data: Dict) -> str:
        """
        Generate a unique identifier for a guest from request data.
        
        Uses a combination of IP address and email when available.
        """
        parts = []
        
        # Use IP address if available
        if 'remote_ip' in request_data:
            parts.append(request_data['remote_ip'])
        
        # Use email if available
        if 'email' in request_data:
            parts.append(request_data['email'].lower())
        elif 'guest_info' in request_data and isinstance(request_data['guest_info'], dict):
            email = request_data['guest_info'].get('email')
            if email:
                parts.append(email.lower())
        
        # Fallback to a generic identifier if nothing else is available
        if not parts:
            parts.append('guest_unknown')
        
        return ':'.join(parts)


# Global instance
captcha_service = CaptchaService()