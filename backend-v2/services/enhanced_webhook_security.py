"""
Enhanced Webhook Security Service for BookedBarber V2

Provides enterprise-grade webhook security with:
- IP allowlist validation
- Advanced rate limiting with Redis
- Comprehensive replay attack prevention
- Intelligent threat detection
- Auto-scaling security responses
"""

import hmac
import hashlib
import logging
import redis
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Any, Set
from dataclasses import dataclass
from sqlalchemy.orm import Session
from ipaddress import ip_address, ip_network
import time
from collections import defaultdict

from services.circuit_breaker_service import CircuitBreakerService
from utils.security_logging import get_security_logger, SecurityEventType
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class WebhookValidationResult:
    """Enhanced webhook validation result"""
    is_valid: bool
    event_id: Optional[str] = None
    error_message: Optional[str] = None
    is_duplicate: bool = False
    event_type: Optional[str] = None
    security_score: float = 1.0  # 0.0 (suspicious) to 1.0 (trusted)
    rate_limit_remaining: Optional[int] = None
    ip_reputation: str = "unknown"  # trusted, unknown, suspicious, blocked


class EnhancedWebhookSecurity:
    """Enterprise-grade webhook security service"""
    
    # IP allowlists for webhook providers
    PROVIDER_IP_RANGES = {
        "stripe": [
            "3.18.12.63/32", "3.130.192.231/32", "13.235.14.237/32",
            "13.235.122.149/32", "18.211.135.69/32", "35.154.171.200/32",
            "52.15.183.38/32", "54.88.130.119/32", "54.88.130.237/32",
            "54.187.174.169/32", "54.187.205.235/32", "54.187.216.72/32"
        ],
        "twilio": [
            "54.172.60.0/23", "54.244.51.0/24", "54.171.127.192/27",
            "35.156.191.128/25", "54.65.63.192/26", "54.252.254.64/26",
            "177.71.206.192/26", "18.228.249.224/28"
        ],
        "google": [
            "64.233.160.0/19", "66.102.0.0/20", "66.249.80.0/20",
            "72.14.192.0/18", "74.125.0.0/16", "108.177.8.0/21",
            "173.194.0.0/16", "207.126.144.0/20", "209.85.128.0/17"
        ]
    }
    
    def __init__(self, db: Session, redis_client: Optional[redis.Redis] = None):
        self.db = db
        self.redis = redis_client or self._init_redis()
        self.circuit_breaker = CircuitBreakerService()
        self.security_logger = get_security_logger(db)
        
        # Enhanced security settings
        self.replay_window_seconds = 900  # 15 minutes (increased from 5)
        self.max_webhook_age_seconds = 600  # 10 minutes
        self.suspicious_threshold = 0.3  # Security score threshold
        
        # Rate limiting configuration
        self.rate_limits = {
            "stripe": {"requests_per_minute": 1000, "burst_limit": 100, "window_seconds": 60},
            "twilio": {"requests_per_minute": 500, "burst_limit": 50, "window_seconds": 60},
            "google": {"requests_per_minute": 200, "burst_limit": 20, "window_seconds": 60},
            "default": {"requests_per_minute": 100, "burst_limit": 10, "window_seconds": 60}
        }
        
        # Threat detection patterns
        self.threat_patterns = {
            "rapid_fire": {"requests_per_second": 10, "window": 10},
            "signature_brute_force": {"failed_attempts": 5, "window": 300},
            "payload_anomaly": {"max_size_bytes": 1024 * 1024, "min_size_bytes": 10}
        }
    
    def _init_redis(self) -> redis.Redis:
        """Initialize Redis connection with fallback"""
        try:
            redis_client = redis.Redis(
                host=settings.REDIS_HOST or "localhost",
                port=settings.REDIS_PORT or 6379,
                db=settings.REDIS_DB or 0,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                health_check_interval=30
            )
            redis_client.ping()  # Test connection
            return redis_client
        except Exception as e:
            logger.warning(f"Redis connection failed, using fallback: {e}")
            return None
    
    def validate_webhook_comprehensive(
        self,
        provider: str,
        payload: bytes,
        signature: str,
        source_ip: str,
        webhook_secret: str,
        webhook_url: Optional[str] = None,
        form_data: Optional[Dict] = None
    ) -> WebhookValidationResult:
        """Comprehensive webhook validation with security scoring"""
        
        validation_start = time.time()
        security_score = 1.0
        ip_reputation = "unknown"
        
        try:
            # Step 1: IP allowlist validation
            if not self._validate_source_ip(provider, source_ip):
                self._log_security_threat("ip_not_allowed", {
                    "provider": provider,
                    "source_ip": source_ip,
                    "allowed_ranges": self.PROVIDER_IP_RANGES.get(provider, [])
                })
                return WebhookValidationResult(
                    is_valid=False,
                    error_message=f"Source IP {source_ip} not in allowlist for {provider}",
                    security_score=0.0,
                    ip_reputation="blocked"
                )
            
            # Step 2: Rate limiting check
            rate_limit_result = self._check_advanced_rate_limit(provider, source_ip)
            if not rate_limit_result["allowed"]:
                self._log_security_threat("rate_limit_exceeded", {
                    "provider": provider,
                    "source_ip": source_ip,
                    "current_rate": rate_limit_result["current_rate"],
                    "limit": rate_limit_result["limit"]
                })
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Rate limit exceeded",
                    security_score=0.2,
                    rate_limit_remaining=0,
                    ip_reputation="suspicious"
                )
            
            security_score *= 0.9 if rate_limit_result["current_rate"] > rate_limit_result["limit"] * 0.8 else 1.0
            
            # Step 3: Payload analysis
            payload_analysis = self._analyze_payload_security(payload)
            security_score *= payload_analysis["score_multiplier"]
            
            if payload_analysis["is_suspicious"]:
                self._log_security_threat("suspicious_payload", {
                    "provider": provider,
                    "source_ip": source_ip,
                    "payload_size": len(payload),
                    "analysis": payload_analysis
                })
            
            # Step 4: Provider-specific signature validation
            if provider == "stripe":
                validation_result = self._validate_stripe_enhanced(payload, signature, webhook_secret, source_ip)
            elif provider == "twilio":
                validation_result = self._validate_twilio_enhanced(form_data, signature, webhook_url, webhook_secret, source_ip)
            elif provider == "google":
                validation_result = self._validate_google_enhanced(payload, signature, webhook_secret, source_ip)
            else:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message=f"Unsupported provider: {provider}",
                    security_score=0.0
                )
            
            if not validation_result.is_valid:
                return validation_result
            
            # Step 5: Advanced duplicate detection
            duplicate_result = self._check_advanced_duplicate(
                provider, validation_result.event_id, payload, source_ip
            )
            
            if duplicate_result["is_duplicate"]:
                if duplicate_result["suspicious_pattern"]:
                    security_score *= 0.5
                    self._log_security_threat("suspicious_duplicate_pattern", {
                        "provider": provider,
                        "event_id": validation_result.event_id,
                        "duplicate_count": duplicate_result["duplicate_count"],
                        "time_pattern": duplicate_result["time_pattern"]
                    })
                
                validation_result.is_duplicate = True
                validation_result.security_score = security_score
                return validation_result
            
            # Step 6: Threat pattern detection
            threat_score = self._detect_threat_patterns(provider, source_ip, payload)
            security_score *= threat_score
            
            # Step 7: IP reputation scoring
            ip_reputation = self._get_ip_reputation(source_ip)
            if ip_reputation == "suspicious":
                security_score *= 0.7
            elif ip_reputation == "trusted":
                security_score *= 1.1
            
            # Step 8: Store event with enhanced metadata
            self._store_enhanced_webhook_event(
                provider, validation_result.event_id, validation_result.event_type,
                payload, source_ip, security_score
            )
            
            # Step 9: Update IP reputation based on successful validation
            self._update_ip_reputation(source_ip, "successful_webhook", security_score)
            
            # Final validation result
            validation_result.security_score = security_score
            validation_result.ip_reputation = ip_reputation
            validation_result.rate_limit_remaining = rate_limit_result["remaining"]
            
            # Log performance metrics
            validation_time = time.time() - validation_start
            logger.info(f"Webhook validation completed in {validation_time:.3f}s - "
                       f"Provider: {provider}, Score: {security_score:.2f}, IP: {ip_reputation}")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Comprehensive webhook validation error: {e}")
            self._log_security_threat("validation_error", {
                "provider": provider,
                "source_ip": source_ip,
                "error": str(e)
            })
            return WebhookValidationResult(
                is_valid=False,
                error_message=f"Validation error: {str(e)}",
                security_score=0.0
            )
    
    def _validate_source_ip(self, provider: str, source_ip: str) -> bool:
        """Validate source IP against provider allowlists"""
        try:
            if not source_ip or provider not in self.PROVIDER_IP_RANGES:
                return False
            
            source_addr = ip_address(source_ip)
            allowed_ranges = self.PROVIDER_IP_RANGES[provider]
            
            for ip_range in allowed_ranges:
                if source_addr in ip_network(ip_range, strict=False):
                    return True
            
            return False
        except Exception as e:
            logger.error(f"IP validation error: {e}")
            return False
    
    def _check_advanced_rate_limit(self, provider: str, source_ip: str) -> Dict[str, Any]:
        """Advanced rate limiting with Redis backend"""
        try:
            if not self.redis:
                return {"allowed": True, "current_rate": 0, "limit": 1000, "remaining": 1000}
            
            limits = self.rate_limits.get(provider, self.rate_limits["default"])
            window_seconds = limits["window_seconds"]
            max_requests = limits["requests_per_minute"]
            burst_limit = limits["burst_limit"]
            
            current_time = int(time.time())
            window_start = current_time - window_seconds
            
            # Sliding window rate limiting
            pipe = self.redis.pipeline()
            
            # Remove old entries
            rate_key = f"webhook_rate:{provider}:{source_ip}"
            pipe.zremrangebyscore(rate_key, 0, window_start)
            
            # Count current requests
            pipe.zcard(rate_key)
            
            # Add current request
            pipe.zadd(rate_key, {str(current_time): current_time})
            
            # Set expiry
            pipe.expire(rate_key, window_seconds + 60)
            
            results = pipe.execute()
            current_count = results[1] if len(results) > 1 else 0
            
            # Check burst limit (requests in last 10 seconds)
            burst_key = f"webhook_burst:{provider}:{source_ip}"
            burst_window = 10
            burst_start = current_time - burst_window
            
            pipe = self.redis.pipeline()
            pipe.zremrangebyscore(burst_key, 0, burst_start)
            pipe.zcard(burst_key)
            pipe.zadd(burst_key, {str(current_time): current_time})
            pipe.expire(burst_key, burst_window + 30)
            
            burst_results = pipe.execute()
            burst_count = burst_results[1] if len(burst_results) > 1 else 0
            
            # Determine if request is allowed
            rate_allowed = current_count <= max_requests
            burst_allowed = burst_count <= burst_limit
            
            return {
                "allowed": rate_allowed and burst_allowed,
                "current_rate": current_count,
                "burst_rate": burst_count,
                "limit": max_requests,
                "burst_limit": burst_limit,
                "remaining": max(0, max_requests - current_count),
                "window_seconds": window_seconds
            }
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return {"allowed": True, "current_rate": 0, "limit": 1000, "remaining": 1000}
    
    def _analyze_payload_security(self, payload: bytes) -> Dict[str, Any]:
        """Analyze payload for security threats"""
        try:
            payload_size = len(payload)
            score_multiplier = 1.0
            is_suspicious = False
            
            # Size analysis
            if payload_size > self.threat_patterns["payload_anomaly"]["max_size_bytes"]:
                score_multiplier *= 0.5
                is_suspicious = True
            elif payload_size < self.threat_patterns["payload_anomaly"]["min_size_bytes"]:
                score_multiplier *= 0.7
                is_suspicious = True
            
            # Content analysis (basic patterns)
            try:
                payload_str = payload.decode('utf-8')
                
                # Check for suspicious patterns
                suspicious_patterns = [
                    b'<script', b'javascript:', b'eval(', b'exec(',
                    b'system(', b'shell_exec', b'passthru', b'base64_decode'
                ]
                
                for pattern in suspicious_patterns:
                    if pattern in payload:
                        score_multiplier *= 0.3
                        is_suspicious = True
                        break
                
                # JSON structure validation
                if payload_str.strip().startswith('{'):
                    try:
                        json.loads(payload_str)
                    except json.JSONDecodeError:
                        score_multiplier *= 0.6
                        is_suspicious = True
                        
            except UnicodeDecodeError:
                # Binary payload - less suspicious for webhooks
                score_multiplier *= 0.9
            
            return {
                "score_multiplier": score_multiplier,
                "is_suspicious": is_suspicious,
                "payload_size": payload_size,
                "analysis_performed": True
            }
            
        except Exception as e:
            logger.error(f"Payload security analysis error: {e}")
            return {
                "score_multiplier": 0.5,
                "is_suspicious": True,
                "analysis_performed": False,
                "error": str(e)
            }
    
    def _validate_stripe_enhanced(self, payload: bytes, signature: str, webhook_secret: str, source_ip: str) -> WebhookValidationResult:
        """Enhanced Stripe webhook validation"""
        try:
            # Parse signature header
            timestamp, signatures = self._parse_stripe_signature(signature)
            if not timestamp or not signatures:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid Stripe signature format",
                    security_score=0.0
                )
            
            # Enhanced timestamp validation
            webhook_time = datetime.fromtimestamp(int(timestamp))
            current_time = datetime.utcnow()
            age_seconds = (current_time - webhook_time).total_seconds()
            
            if age_seconds > self.max_webhook_age_seconds:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message=f"Webhook timestamp too old: {age_seconds} seconds",
                    security_score=0.1
                )
            
            if age_seconds < -120:  # Allow 2 minutes clock skew
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Webhook timestamp is in the future",
                    security_score=0.1
                )
            
            # Verify signature with enhanced security
            if not self._verify_stripe_signature_enhanced(payload, timestamp, signatures, webhook_secret):
                self._increment_failed_attempts("stripe", source_ip)
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid Stripe webhook signature",
                    security_score=0.0
                )
            
            # Parse and validate event data
            try:
                event_data = json.loads(payload.decode('utf-8'))
                event_id = event_data.get('id')
                event_type = event_data.get('type')
                
                if not event_id or not event_type:
                    return WebhookValidationResult(
                        is_valid=False,
                        error_message="Missing required Stripe event fields",
                        security_score=0.3
                    )
                
            except json.JSONDecodeError:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid JSON payload",
                    security_score=0.2
                )
            
            return WebhookValidationResult(
                is_valid=True,
                event_id=event_id,
                event_type=event_type,
                security_score=0.9  # Base score for valid Stripe webhook
            )
            
        except Exception as e:
            logger.error(f"Enhanced Stripe validation error: {e}")
            return WebhookValidationResult(
                is_valid=False,
                error_message=f"Stripe validation error: {str(e)}",
                security_score=0.0
            )
    
    def _validate_twilio_enhanced(self, form_data: Dict, signature: str, webhook_url: str, auth_token: str, source_ip: str) -> WebhookValidationResult:
        """Enhanced Twilio webhook validation"""
        try:
            if not self._verify_twilio_signature_enhanced(form_data, signature, webhook_url, auth_token):
                self._increment_failed_attempts("twilio", source_ip)
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid Twilio webhook signature",
                    security_score=0.0
                )
            
            # Extract event identifier
            event_id = form_data.get('MessageSid') or form_data.get('CallSid')
            if not event_id:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Missing Twilio event identifier",
                    security_score=0.3
                )
            
            return WebhookValidationResult(
                is_valid=True,
                event_id=event_id,
                event_type="sms",
                security_score=0.9
            )
            
        except Exception as e:
            logger.error(f"Enhanced Twilio validation error: {e}")
            return WebhookValidationResult(
                is_valid=False, 
                error_message=f"Twilio validation error: {str(e)}",
                security_score=0.0
            )
    
    def _validate_google_enhanced(self, payload: bytes, signature: str, webhook_secret: str, source_ip: str) -> WebhookValidationResult:
        """Enhanced Google webhook validation (Calendar, etc.)"""
        try:
            # Google uses different signature methods depending on service
            # This is a basic implementation - customize per Google service
            
            if not self._verify_google_signature(payload, signature, webhook_secret):
                self._increment_failed_attempts("google", source_ip)
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid Google webhook signature",
                    security_score=0.0
                )
            
            # Parse event data
            try:
                event_data = json.loads(payload.decode('utf-8'))
                event_id = event_data.get('resourceId') or event_data.get('id')
                event_type = event_data.get('eventType', 'google_webhook')
                
            except json.JSONDecodeError:
                return WebhookValidationResult(
                    is_valid=False,
                    error_message="Invalid JSON in Google webhook",
                    security_score=0.2
                )
            
            return WebhookValidationResult(
                is_valid=True,
                event_id=event_id,
                event_type=event_type,
                security_score=0.9
            )
            
        except Exception as e:
            logger.error(f"Enhanced Google validation error: {e}")
            return WebhookValidationResult(
                is_valid=False,
                error_message=f"Google validation error: {str(e)}",
                security_score=0.0
            )
    
    def _verify_stripe_signature_enhanced(self, payload: bytes, timestamp: str, signatures: List[str], secret: str) -> bool:
        """Enhanced Stripe signature verification with timing attack protection"""
        try:
            signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Use constant-time comparison for all signatures
            valid_signatures = []
            for sig in signatures:
                valid_signatures.append(hmac.compare_digest(expected_signature, sig))
            
            return any(valid_signatures)
            
        except Exception as e:
            logger.error(f"Enhanced Stripe signature verification error: {e}")
            return False
    
    def _verify_twilio_signature_enhanced(self, form_data: Dict, signature: str, url: str, auth_token: str) -> bool:
        """Enhanced Twilio signature verification"""
        try:
            # Build the string to sign with URL normalization
            normalized_url = url.lower().rstrip('/')
            data_string = normalized_url
            
            # Sort parameters for consistent signing
            for key in sorted(form_data.keys()):
                data_string += f"{key}{form_data[key]}"
            
            # Generate expected signature
            expected_signature = hmac.new(
                auth_token.encode('utf-8'),
                data_string.encode('utf-8'),
                hashlib.sha1
            ).digest()
            
            # Convert to base64
            import base64
            expected_sig_b64 = base64.b64encode(expected_signature).decode()
            
            return hmac.compare_digest(expected_sig_b64, signature)
            
        except Exception as e:
            logger.error(f"Enhanced Twilio signature verification error: {e}")
            return False
    
    def _verify_google_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        """Google webhook signature verification"""
        try:
            # Google typically uses HMAC-SHA256
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Handle different signature formats
            if signature.startswith('sha256='):
                signature = signature[7:]
            
            return hmac.compare_digest(expected_signature, signature)
            
        except Exception as e:
            logger.error(f"Google signature verification error: {e}")
            return False
    
    def _check_advanced_duplicate(self, provider: str, event_id: str, payload: bytes, source_ip: str) -> Dict[str, Any]:
        """Advanced duplicate detection with pattern analysis"""
        try:
            if not self.redis:
                return {"is_duplicate": False, "suspicious_pattern": False}
            
            duplicate_key = f"webhook_events:{provider}:{event_id}"
            pattern_key = f"webhook_pattern:{provider}:{source_ip}"
            
            # Check for exact duplicate
            existing_event = self.redis.hget(duplicate_key, "payload_hash")
            payload_hash = hashlib.sha256(payload).hexdigest()
            
            current_time = int(time.time())
            
            if existing_event:
                # Duplicate found - analyze pattern
                duplicate_count = self.redis.hincrby(duplicate_key, "duplicate_count", 1)
                
                # Check for suspicious duplication patterns
                recent_duplicates = self.redis.zrangebyscore(
                    pattern_key, current_time - 3600, current_time  # Last hour
                )
                
                suspicious_pattern = (
                    duplicate_count > 3 or  # More than 3 duplicates
                    len(recent_duplicates) > 10  # More than 10 events in last hour
                )
                
                return {
                    "is_duplicate": True,
                    "suspicious_pattern": suspicious_pattern,
                    "duplicate_count": duplicate_count,
                    "time_pattern": len(recent_duplicates)
                }
            
            # Store new event
            pipe = self.redis.pipeline()
            
            # Store event details
            pipe.hset(duplicate_key, mapping={
                "payload_hash": payload_hash,
                "first_seen": current_time,
                "duplicate_count": 1,
                "source_ip": source_ip
            })
            pipe.expire(duplicate_key, self.replay_window_seconds)
            
            # Track pattern
            pipe.zadd(pattern_key, {f"{event_id}:{current_time}": current_time})
            pipe.expire(pattern_key, 3600)  # Keep pattern data for 1 hour
            
            pipe.execute()
            
            return {"is_duplicate": False, "suspicious_pattern": False}
            
        except Exception as e:
            logger.error(f"Advanced duplicate detection error: {e}")
            return {"is_duplicate": False, "suspicious_pattern": False}
    
    def _detect_threat_patterns(self, provider: str, source_ip: str, payload: bytes) -> float:
        """Detect threat patterns and return threat score multiplier"""
        try:
            threat_score = 1.0  # Start with neutral score
            current_time = int(time.time())
            
            if not self.redis:
                return threat_score
            
            # Pattern 1: Rapid fire detection
            rapid_key = f"threat_rapid:{provider}:{source_ip}"
            rapid_window = self.threat_patterns["rapid_fire"]["window"]
            rapid_threshold = self.threat_patterns["rapid_fire"]["requests_per_second"]
            
            pipe = self.redis.pipeline()
            pipe.zremrangebyscore(rapid_key, 0, current_time - rapid_window)
            pipe.zcard(rapid_key)
            pipe.zadd(rapid_key, {str(current_time): current_time})
            pipe.expire(rapid_key, rapid_window + 60)
            
            results = pipe.execute()
            rapid_count = results[1] if len(results) > 1 else 0
            
            if rapid_count > rapid_threshold * rapid_window:
                threat_score *= 0.3  # High threat
                self._log_security_threat("rapid_fire_detected", {
                    "provider": provider,
                    "source_ip": source_ip,
                    "requests_in_window": rapid_count,
                    "threshold": rapid_threshold * rapid_window
                })
            
            # Pattern 2: Failed signature attempts
            failed_key = f"threat_failed:{provider}:{source_ip}"
            failed_count = self.redis.get(failed_key) or 0
            
            if int(failed_count) > self.threat_patterns["signature_brute_force"]["failed_attempts"]:
                threat_score *= 0.2  # Very high threat
                self._log_security_threat("signature_brute_force", {
                    "provider": provider,
                    "source_ip": source_ip,
                    "failed_attempts": failed_count
                })
            
            return threat_score
            
        except Exception as e:
            logger.error(f"Threat pattern detection error: {e}")
            return 0.5  # Conservative score on error
    
    def _get_ip_reputation(self, source_ip: str) -> str:
        """Get IP reputation from Redis cache"""
        try:
            if not self.redis:
                return "unknown"
            
            reputation_key = f"ip_reputation:{source_ip}"
            reputation_data = self.redis.hgetall(reputation_key)
            
            if not reputation_data:
                return "unknown"
            
            successful_webhooks = int(reputation_data.get("successful_webhooks", 0))
            failed_attempts = int(reputation_data.get("failed_attempts", 0))
            security_violations = int(reputation_data.get("security_violations", 0))
            
            # Calculate reputation score
            total_requests = successful_webhooks + failed_attempts
            if total_requests == 0:
                return "unknown"
            
            success_rate = successful_webhooks / total_requests
            
            if security_violations > 5 or success_rate < 0.5:
                return "blocked"
            elif security_violations > 0 or success_rate < 0.8:
                return "suspicious" 
            elif successful_webhooks > 10 and success_rate > 0.95:
                return "trusted"
            else:
                return "unknown"
                
        except Exception as e:
            logger.error(f"IP reputation check error: {e}")
            return "unknown"
    
    def _update_ip_reputation(self, source_ip: str, event_type: str, security_score: float):
        """Update IP reputation based on webhook interaction"""
        try:
            if not self.redis:
                return
            
            reputation_key = f"ip_reputation:{source_ip}"
            
            if event_type == "successful_webhook" and security_score > 0.7:
                self.redis.hincrby(reputation_key, "successful_webhooks", 1)
            elif event_type == "failed_signature":
                self.redis.hincrby(reputation_key, "failed_attempts", 1)
            elif event_type == "security_violation":
                self.redis.hincrby(reputation_key, "security_violations", 1)
            
            # Set reputation data expiry (7 days)
            self.redis.expire(reputation_key, 7 * 24 * 3600)
            
        except Exception as e:
            logger.error(f"IP reputation update error: {e}")
    
    def _increment_failed_attempts(self, provider: str, source_ip: str):
        """Track failed authentication attempts"""
        try:
            if not self.redis:
                return
            
            failed_key = f"threat_failed:{provider}:{source_ip}"
            failed_window = self.threat_patterns["signature_brute_force"]["window"]
            
            self.redis.incr(failed_key)
            self.redis.expire(failed_key, failed_window)
            
            # Update IP reputation
            self._update_ip_reputation(source_ip, "failed_signature", 0.0)
            
        except Exception as e:
            logger.error(f"Failed attempts tracking error: {e}")
    
    def _store_enhanced_webhook_event(self, provider: str, event_id: str, event_type: str, payload: bytes, source_ip: str, security_score: float):
        """Store webhook event with enhanced metadata"""
        try:
            from models.idempotency import IdempotencyKey
            from utils.idempotency import IdempotencyKeyGenerator
            
            key = f"webhook_{provider}_{event_id}"
            expires_at = datetime.utcnow() + timedelta(hours=48)
            
            payload_hash = IdempotencyKeyGenerator.generate_content_hash(payload)
            
            idempotency_record = IdempotencyKey(
                key=key,
                operation_type=f"webhook_{provider}",
                user_id=None,
                request_hash=payload_hash,
                response_data={
                    "processed_at": datetime.utcnow().isoformat(),
                    "security_score": security_score,
                    "source_ip": source_ip
                },
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                operation_metadata={
                    "provider": provider,
                    "event_id": event_id,
                    "event_type": event_type,
                    "payload_size": len(payload),
                    "security_score": security_score,
                    "source_ip": source_ip,
                    "ip_reputation": self._get_ip_reputation(source_ip)
                }
            )
            
            self.db.add(idempotency_record)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error storing enhanced webhook event: {e}")
            self.db.rollback()
    
    def _log_security_threat(self, threat_type: str, details: Dict[str, Any]):
        """Log security threats with structured data"""
        try:
            self.security_logger.log_webhook_security_event(
                event_type=SecurityEventType.WEBHOOK_SECURITY_THREAT,
                webhook_provider=details.get("provider", "unknown"),
                ip_address=details.get("source_ip"),
                details={
                    "threat_type": threat_type,
                    "timestamp": datetime.utcnow().isoformat(),
                    **details
                }
            )
            
            logger.warning(
                f"WEBHOOK_SECURITY_THREAT - Type: {threat_type}, "
                f"Provider: {details.get('provider', 'unknown')}, "
                f"IP: {details.get('source_ip', 'unknown')}, "
                f"Details: {json.dumps(details, default=str)}"
            )
            
        except Exception as e:
            logger.error(f"Security threat logging error: {e}")
    
    def _parse_stripe_signature(self, signature: str) -> tuple[Optional[str], List[str]]:
        """Parse Stripe signature header"""
        try:
            elements = signature.split(',')
            timestamp = None
            signatures = []
            
            for element in elements:
                if element.startswith('t='):
                    timestamp = element[2:]
                elif element.startswith('v1='):
                    signatures.append(element[3:])
            
            return timestamp, signatures
        except Exception:
            return None, []
    
    def get_security_metrics(self) -> Dict[str, Any]:
        """Get comprehensive security metrics"""
        try:
            if not self.redis:
                return {"error": "Redis not available"}
            
            metrics = {
                "total_webhooks_processed": 0,
                "security_violations": 0,
                "blocked_ips": 0,
                "trusted_ips": 0,
                "rate_limited_requests": 0,
                "by_provider": {},
                "threat_patterns": {}
            }
            
            # Get provider-specific metrics
            for provider in self.PROVIDER_IP_RANGES.keys():
                provider_key = f"metrics:{provider}:*"
                provider_keys = self.redis.keys(provider_key)
                
                provider_metrics = {
                    "total_requests": 0,
                    "successful_validations": 0,
                    "failed_signatures": 0,
                    "rate_limited": 0
                }
                
                for key in provider_keys:
                    value = self.redis.get(key) or 0
                    if "successful" in key:
                        provider_metrics["successful_validations"] += int(value)
                    elif "failed" in key:
                        provider_metrics["failed_signatures"] += int(value)
                    elif "rate_limited" in key:
                        provider_metrics["rate_limited"] += int(value)
                    
                    provider_metrics["total_requests"] += int(value)
                
                metrics["by_provider"][provider] = provider_metrics
            
            # Get IP reputation summary
            ip_keys = self.redis.keys("ip_reputation:*")
            for ip_key in ip_keys[:100]:  # Limit to avoid performance issues
                ip_data = self.redis.hgetall(ip_key)
                if ip_data:
                    violations = int(ip_data.get("security_violations", 0))
                    successful = int(ip_data.get("successful_webhooks", 0))
                    
                    if violations > 5:
                        metrics["blocked_ips"] += 1
                    elif successful > 10:
                        metrics["trusted_ips"] += 1
            
            return metrics
            
        except Exception as e:
            logger.error(f"Security metrics error: {e}")
            return {"error": str(e)}


def get_enhanced_webhook_security(db: Session, redis_client: Optional[redis.Redis] = None) -> EnhancedWebhookSecurity:
    """Dependency to get enhanced webhook security service"""
    return EnhancedWebhookSecurity(db, redis_client)
