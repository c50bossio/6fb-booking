"""
Advanced Threat Detection Service for BookedBarber V2

Implements real-time threat monitoring, behavioral analytics, and automated response
for achieving security excellence beyond OWASP compliance.
"""

import json
import time
import logging
import hashlib
import ipaddress
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from collections import defaultdict, deque
from enum import Enum
import redis
import asyncio
from sqlalchemy.orm import Session

from utils.encryption import encrypt_data, decrypt_data
from utils.logging_config import get_audit_logger
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


class ThreatLevel(Enum):
    """Threat severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AttackType(Enum):
    """Types of detected attacks"""
    BRUTE_FORCE = "brute_force"
    CREDENTIAL_STUFFING = "credential_stuffing"
    ACCOUNT_TAKEOVER = "account_takeover"
    PAYMENT_FRAUD = "payment_fraud"
    API_ABUSE = "api_abuse"
    DATA_EXFILTRATION = "data_exfiltration"
    SQL_INJECTION = "sql_injection"
    XSS_ATTEMPT = "xss_attempt"
    DDOS = "ddos"
    SUSPICIOUS_GEOGRAPHY = "suspicious_geography"
    VELOCITY_ABUSE = "velocity_abuse"
    DEVICE_SPOOFING = "device_spoofing"


@dataclass
class SecurityEvent:
    """Security event data structure"""
    timestamp: datetime
    event_type: AttackType
    threat_level: ThreatLevel
    source_ip: str
    user_id: Optional[int]
    session_id: Optional[str]
    details: Dict[str, Any]
    confidence: float  # 0.0 - 1.0
    mitigated: bool = False
    false_positive: bool = False


@dataclass
class ThreatIndicator:
    """Threat indicator for pattern detection"""
    indicator_type: str
    value: str
    threat_level: ThreatLevel
    expiry: datetime
    source: str


class AdvancedThreatDetectionService:
    """
    Advanced threat detection service with ML-based behavioral analytics
    and real-time response capabilities
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.local_cache = defaultdict(lambda: defaultdict(list))
        
        # Detection windows and thresholds
        self.config = {
            # Brute force detection
            "brute_force_window": 300,  # 5 minutes
            "brute_force_threshold": 10,
            
            # Velocity limits
            "api_velocity_window": 60,  # 1 minute
            "api_velocity_threshold": 100,
            
            # Geographic anomaly
            "geo_velocity_threshold": 3600,  # 1 hour between locations
            
            # Payment velocity
            "payment_velocity_window": 3600,  # 1 hour
            "payment_velocity_threshold": 50000,  # $500
            "payment_count_threshold": 10,
            
            # Session anomalies
            "session_duration_threshold": 14400,  # 4 hours
            "simultaneous_session_threshold": 5,
            
            # Data access patterns
            "data_access_velocity": 1000,  # requests per minute
            "bulk_data_threshold": 100,  # records per request
        }
        
        # Machine learning models (simplified for demo)
        self.ml_models = {
            "user_behavior": self._init_user_behavior_model(),
            "payment_fraud": self._init_payment_fraud_model(),
            "api_usage": self._init_api_usage_model()
        }
        
        # Threat intelligence feeds (would integrate with external sources)
        self.threat_indicators = []
        
        # Response automation
        self.automated_responses = {
            ThreatLevel.LOW: ["log_only"],
            ThreatLevel.MEDIUM: ["log_only", "increase_monitoring"],
            ThreatLevel.HIGH: ["rate_limit", "require_mfa", "alert_admins"],
            ThreatLevel.CRITICAL: ["block_ip", "suspend_account", "alert_soc"]
        }
        
    async def analyze_request(
        self,
        request_data: Dict[str, Any],
        user_id: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> List[SecurityEvent]:
        """
        Analyze incoming request for security threats
        
        Returns:
            List of detected security events
        """
        events = []
        
        try:
            # Extract request metadata
            source_ip = request_data.get("ip_address", "unknown")
            endpoint = request_data.get("endpoint", "")
            method = request_data.get("method", "")
            user_agent = request_data.get("user_agent", "")
            timestamp = datetime.utcnow()
            
            # Run detection algorithms
            events.extend(await self._detect_brute_force(source_ip, endpoint, timestamp))
            events.extend(await self._detect_velocity_abuse(source_ip, user_id, timestamp))
            events.extend(await self._detect_geographic_anomalies(source_ip, user_id, timestamp))
            events.extend(await self._detect_session_anomalies(user_id, session_id, timestamp))
            events.extend(await self._detect_api_abuse(source_ip, endpoint, method, timestamp))
            events.extend(await self._detect_behavioral_anomalies(user_id, request_data, timestamp))
            
            # Check against threat intelligence
            events.extend(await self._check_threat_indicators(source_ip, user_agent, timestamp))
            
            # ML-based analysis
            events.extend(await self._ml_threat_analysis(request_data, user_id, timestamp))
            
            # Process events for automated response
            for event in events:
                if event.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
                    await self._trigger_automated_response(event)
                
                # Log all events
                await self._log_security_event(event)
            
            return events
            
        except Exception as e:
            logger.error(f"Error in threat analysis: {e}")
            return []
    
    async def _detect_brute_force(
        self,
        source_ip: str,
        endpoint: str,
        timestamp: datetime
    ) -> List[SecurityEvent]:
        """Detect brute force attacks"""
        events = []
        
        # Focus on authentication endpoints
        auth_endpoints = ["/api/v2/auth/login", "/api/v2/auth/register", "/api/v2/mfa/verify"]
        
        if not any(endpoint.startswith(ep) for ep in auth_endpoints):
            return events
        
        key = f"brute_force:{source_ip}:{endpoint}"
        window_start = timestamp - timedelta(seconds=self.config["brute_force_window"])
        
        # Track attempts
        if self.redis_client:
            try:
                # Remove old attempts
                self.redis_client.zremrangebyscore(key, 0, window_start.timestamp())
                
                # Count current attempts
                attempt_count = self.redis_client.zcard(key)
                
                # Add current attempt
                self.redis_client.zadd(key, {str(timestamp.timestamp()): timestamp.timestamp()})
                self.redis_client.expire(key, self.config["brute_force_window"])
                
                if attempt_count >= self.config["brute_force_threshold"]:
                    events.append(SecurityEvent(
                        timestamp=timestamp,
                        event_type=AttackType.BRUTE_FORCE,
                        threat_level=ThreatLevel.HIGH,
                        source_ip=source_ip,
                        user_id=None,
                        session_id=None,
                        details={
                            "endpoint": endpoint,
                            "attempt_count": attempt_count,
                            "window_seconds": self.config["brute_force_window"]
                        },
                        confidence=0.9
                    ))
                    
            except Exception as e:
                logger.error(f"Redis error in brute force detection: {e}")
        
        return events
    
    async def _detect_velocity_abuse(
        self,
        source_ip: str,
        user_id: Optional[int],
        timestamp: datetime
    ) -> List[SecurityEvent]:
        """Detect velocity-based abuse patterns"""
        events = []
        
        # API velocity check
        api_key = f"velocity:api:{source_ip}"
        window_start = timestamp - timedelta(seconds=self.config["api_velocity_window"])
        
        if self.redis_client:
            try:
                # Clean old entries
                self.redis_client.zremrangebyscore(api_key, 0, window_start.timestamp())
                
                # Count requests
                request_count = self.redis_client.zcard(api_key)
                
                # Add current request
                self.redis_client.zadd(api_key, {str(timestamp.timestamp()): timestamp.timestamp()})
                self.redis_client.expire(api_key, self.config["api_velocity_window"])
                
                if request_count >= self.config["api_velocity_threshold"]:
                    events.append(SecurityEvent(
                        timestamp=timestamp,
                        event_type=AttackType.VELOCITY_ABUSE,
                        threat_level=ThreatLevel.MEDIUM,
                        source_ip=source_ip,
                        user_id=user_id,
                        session_id=None,
                        details={
                            "request_count": request_count,
                            "window_seconds": self.config["api_velocity_window"]
                        },
                        confidence=0.8
                    ))
                    
            except Exception as e:
                logger.error(f"Redis error in velocity detection: {e}")
        
        return events
    
    async def _detect_geographic_anomalies(
        self,
        source_ip: str,
        user_id: Optional[int],
        timestamp: datetime
    ) -> List[SecurityEvent]:
        """Detect suspicious geographic patterns"""
        events = []
        
        if not user_id:
            return events
        
        geo_key = f"geo:user:{user_id}"
        
        if self.redis_client:
            try:
                # Get last known location
                last_location_data = self.redis_client.get(geo_key)
                
                if last_location_data:
                    last_data = json.loads(last_location_data)
                    last_ip = last_data.get("ip")
                    last_timestamp = datetime.fromisoformat(last_data.get("timestamp"))
                    
                    # Check if IPs are different and time gap is suspicious
                    if (last_ip != source_ip and 
                        (timestamp - last_timestamp).total_seconds() < self.config["geo_velocity_threshold"]):
                        
                        # In production, would use GeoIP to calculate actual distance
                        events.append(SecurityEvent(
                            timestamp=timestamp,
                            event_type=AttackType.SUSPICIOUS_GEOGRAPHY,
                            threat_level=ThreatLevel.MEDIUM,
                            source_ip=source_ip,
                            user_id=user_id,
                            session_id=None,
                            details={
                                "previous_ip": last_ip,
                                "time_gap_minutes": (timestamp - last_timestamp).total_seconds() / 60,
                                "geographic_velocity": "high"
                            },
                            confidence=0.7
                        ))
                
                # Update location
                location_data = {
                    "ip": source_ip,
                    "timestamp": timestamp.isoformat()
                }
                self.redis_client.setex(geo_key, 86400, json.dumps(location_data))  # 24 hours
                
            except Exception as e:
                logger.error(f"Error in geographic anomaly detection: {e}")
        
        return events
    
    async def _detect_session_anomalies(
        self,
        user_id: Optional[int],
        session_id: Optional[str],
        timestamp: datetime
    ) -> List[SecurityEvent]:
        """Detect session-based anomalies"""
        events = []
        
        if not user_id or not session_id:
            return events
        
        # Check for multiple simultaneous sessions
        session_key = f"sessions:user:{user_id}"
        
        if self.redis_client:
            try:
                # Track active sessions
                self.redis_client.sadd(session_key, session_id)
                self.redis_client.expire(session_key, 3600)  # 1 hour
                
                session_count = self.redis_client.scard(session_key)
                
                if session_count > self.config["simultaneous_session_threshold"]:
                    events.append(SecurityEvent(
                        timestamp=timestamp,
                        event_type=AttackType.ACCOUNT_TAKEOVER,
                        threat_level=ThreatLevel.HIGH,
                        source_ip="",
                        user_id=user_id,
                        session_id=session_id,
                        details={
                            "simultaneous_sessions": session_count,
                            "threshold": self.config["simultaneous_session_threshold"]
                        },
                        confidence=0.8
                    ))
                    
            except Exception as e:
                logger.error(f"Error in session anomaly detection: {e}")
        
        return events
    
    async def _detect_api_abuse(
        self,
        source_ip: str,
        endpoint: str,
        method: str,
        timestamp: datetime
    ) -> List[SecurityEvent]:
        """Detect API abuse patterns"""
        events = []
        
        # Check for endpoint-specific abuse
        sensitive_endpoints = [
            "/api/v2/payments/",
            "/api/v2/admin/",
            "/api/v2/users/",
            "/api/v2/exports/"
        ]
        
        for sensitive_endpoint in sensitive_endpoints:
            if endpoint.startswith(sensitive_endpoint):
                abuse_key = f"api_abuse:{source_ip}:{sensitive_endpoint}"
                
                if self.redis_client:
                    try:
                        count = self.redis_client.incr(abuse_key)
                        self.redis_client.expire(abuse_key, 300)  # 5 minutes
                        
                        # Lower threshold for sensitive endpoints
                        if count > 20:
                            events.append(SecurityEvent(
                                timestamp=timestamp,
                                event_type=AttackType.API_ABUSE,
                                threat_level=ThreatLevel.MEDIUM,
                                source_ip=source_ip,
                                user_id=None,
                                session_id=None,
                                details={
                                    "endpoint": endpoint,
                                    "method": method,
                                    "request_count": count
                                },
                                confidence=0.8
                            ))
                            
                    except Exception as e:
                        logger.error(f"Error in API abuse detection: {e}")
        
        return events
    
    async def _detect_behavioral_anomalies(
        self,
        user_id: Optional[int],
        request_data: Dict[str, Any],
        timestamp: datetime
    ) -> List[SecurityEvent]:
        """Detect behavioral anomalies using ML models"""
        events = []
        
        if not user_id:
            return events
        
        try:
            # Analyze user behavior patterns
            behavior_score = await self._analyze_user_behavior(user_id, request_data, timestamp)
            
            if behavior_score > 0.8:  # High anomaly score
                events.append(SecurityEvent(
                    timestamp=timestamp,
                    event_type=AttackType.ACCOUNT_TAKEOVER,
                    threat_level=ThreatLevel.MEDIUM,
                    source_ip=request_data.get("ip_address", ""),
                    user_id=user_id,
                    session_id=request_data.get("session_id"),
                    details={
                        "anomaly_score": behavior_score,
                        "behavioral_indicators": ["unusual_access_pattern", "atypical_endpoint_usage"]
                    },
                    confidence=behavior_score
                ))
                
        except Exception as e:
            logger.error(f"Error in behavioral analysis: {e}")
        
        return events
    
    async def _check_threat_indicators(
        self,
        source_ip: str,
        user_agent: str,
        timestamp: datetime
    ) -> List[SecurityEvent]:
        """Check against threat intelligence feeds"""
        events = []
        
        try:
            # Check IP against known threat lists
            for indicator in self.threat_indicators:
                if indicator.expiry > timestamp:
                    if (indicator.indicator_type == "ip" and indicator.value == source_ip) or \
                       (indicator.indicator_type == "user_agent" and indicator.value in user_agent):
                        
                        events.append(SecurityEvent(
                            timestamp=timestamp,
                            event_type=AttackType.API_ABUSE,
                            threat_level=indicator.threat_level,
                            source_ip=source_ip,
                            user_id=None,
                            session_id=None,
                            details={
                                "threat_indicator": indicator.value,
                                "indicator_type": indicator.indicator_type,
                                "source": indicator.source
                            },
                            confidence=0.9
                        ))
                        
        except Exception as e:
            logger.error(f"Error checking threat indicators: {e}")
        
        return events
    
    async def _ml_threat_analysis(
        self,
        request_data: Dict[str, Any],
        user_id: Optional[int],
        timestamp: datetime
    ) -> List[SecurityEvent]:
        """Machine learning-based threat analysis"""
        events = []
        
        try:
            # Payment fraud detection
            if "/payments/" in request_data.get("endpoint", ""):
                fraud_score = await self._detect_payment_fraud(request_data, user_id)
                
                if fraud_score > 0.7:
                    events.append(SecurityEvent(
                        timestamp=timestamp,
                        event_type=AttackType.PAYMENT_FRAUD,
                        threat_level=ThreatLevel.HIGH if fraud_score > 0.9 else ThreatLevel.MEDIUM,
                        source_ip=request_data.get("ip_address", ""),
                        user_id=user_id,
                        session_id=request_data.get("session_id"),
                        details={
                            "fraud_score": fraud_score,
                            "ml_model": "payment_fraud_detector"
                        },
                        confidence=fraud_score
                    ))
                    
        except Exception as e:
            logger.error(f"Error in ML threat analysis: {e}")
        
        return events
    
    async def _trigger_automated_response(self, event: SecurityEvent):
        """Trigger automated response based on threat level"""
        try:
            responses = self.automated_responses.get(event.threat_level, [])
            
            for response in responses:
                if response == "block_ip":
                    await self._block_ip_address(event.source_ip, event.threat_level)
                elif response == "rate_limit":
                    await self._apply_rate_limit(event.source_ip, event.user_id)
                elif response == "require_mfa":
                    await self._require_additional_mfa(event.user_id)
                elif response == "suspend_account":
                    await self._suspend_account(event.user_id, event)
                elif response == "alert_admins":
                    await self._alert_administrators(event)
                elif response == "alert_soc":
                    await self._alert_security_team(event)
                elif response == "increase_monitoring":
                    await self._increase_monitoring(event.source_ip, event.user_id)
                    
        except Exception as e:
            logger.error(f"Error in automated response: {e}")
    
    async def _block_ip_address(self, ip_address: str, threat_level: ThreatLevel):
        """Block IP address temporarily"""
        if self.redis_client:
            try:
                duration = 3600 if threat_level == ThreatLevel.HIGH else 7200  # 1-2 hours
                self.redis_client.setex(f"blocked_ip:{ip_address}", duration, "automated_block")
                
                audit_logger.log_security_event(
                    "ip_address_blocked",
                    severity="high",
                    details={
                        "ip_address": ip_address,
                        "threat_level": threat_level.value,
                        "duration_seconds": duration,
                        "automated": True
                    }
                )
                
            except Exception as e:
                logger.error(f"Error blocking IP address: {e}")
    
    async def _apply_rate_limit(self, ip_address: str, user_id: Optional[int]):
        """Apply enhanced rate limiting"""
        if self.redis_client:
            try:
                # Reduce rate limits for this IP/user
                limit_key = f"enhanced_rate_limit:{ip_address}"
                self.redis_client.setex(limit_key, 3600, "10")  # 10 requests per hour
                
                if user_id:
                    user_limit_key = f"enhanced_rate_limit:user:{user_id}"
                    self.redis_client.setex(user_limit_key, 3600, "20")  # 20 requests per hour
                    
            except Exception as e:
                logger.error(f"Error applying rate limit: {e}")
    
    async def _require_additional_mfa(self, user_id: Optional[int]):
        """Require additional MFA verification"""
        if user_id and self.redis_client:
            try:
                # Flag account for enhanced authentication
                self.redis_client.setex(f"require_enhanced_auth:{user_id}", 3600, "true")
                
                audit_logger.log_security_event(
                    "enhanced_auth_required",
                    details={
                        "user_id": user_id,
                        "automated": True
                    }
                )
                
            except Exception as e:
                logger.error(f"Error requiring additional MFA: {e}")
    
    async def _suspend_account(self, user_id: Optional[int], event: SecurityEvent):
        """Temporarily suspend user account"""
        if user_id and self.redis_client:
            try:
                # Suspend account for security review
                self.redis_client.setex(f"suspended_account:{user_id}", 7200, "security_review")
                
                audit_logger.log_security_event(
                    "account_suspended",
                    severity="critical",
                    details={
                        "user_id": user_id,
                        "reason": event.event_type.value,
                        "threat_level": event.threat_level.value,
                        "automated": True
                    }
                )
                
                # Send notification to user
                await NotificationService.send_security_notification(
                    user_id=user_id,
                    notification_type="account_suspended",
                    details={"reason": "Security review", "contact_support": True}
                )
                
            except Exception as e:
                logger.error(f"Error suspending account: {e}")
    
    async def _alert_administrators(self, event: SecurityEvent):
        """Alert system administrators"""
        try:
            alert_data = {
                "event_type": event.event_type.value,
                "threat_level": event.threat_level.value,
                "source_ip": event.source_ip,
                "user_id": event.user_id,
                "confidence": event.confidence,
                "timestamp": event.timestamp.isoformat(),
                "details": event.details
            }
            
            # Send to notification service
            await NotificationService.send_admin_alert(
                alert_type="security_threat",
                data=alert_data,
                priority="high" if event.threat_level == ThreatLevel.HIGH else "medium"
            )
            
        except Exception as e:
            logger.error(f"Error alerting administrators: {e}")
    
    async def _alert_security_team(self, event: SecurityEvent):
        """Alert security operations center"""
        try:
            # In production, would integrate with SIEM/SOC tools
            alert_data = {
                "severity": "critical",
                "event_type": event.event_type.value,
                "threat_level": event.threat_level.value,
                "source_ip": event.source_ip,
                "user_id": event.user_id,
                "confidence": event.confidence,
                "timestamp": event.timestamp.isoformat(),
                "details": event.details,
                "requires_immediate_attention": True
            }
            
            # Log for SOC integration
            audit_logger.log_security_event(
                "soc_alert_triggered",
                severity="critical",
                details=alert_data
            )
            
        except Exception as e:
            logger.error(f"Error alerting security team: {e}")
    
    async def _increase_monitoring(self, ip_address: str, user_id: Optional[int]):
        """Increase monitoring for suspicious entities"""
        if self.redis_client:
            try:
                # Flag for enhanced monitoring
                self.redis_client.setex(f"enhanced_monitoring:{ip_address}", 7200, "true")
                
                if user_id:
                    self.redis_client.setex(f"enhanced_monitoring:user:{user_id}", 7200, "true")
                    
            except Exception as e:
                logger.error(f"Error increasing monitoring: {e}")
    
    async def _log_security_event(self, event: SecurityEvent):
        """Log security event for analysis and reporting"""
        try:
            audit_logger.log_security_event(
                event.event_type.value,
                ip_address=event.source_ip,
                severity=event.threat_level.value,
                details={
                    "user_id": event.user_id,
                    "session_id": event.session_id,
                    "confidence": event.confidence,
                    "mitigated": event.mitigated,
                    "event_details": event.details
                }
            )
            
            # Store for dashboard and reporting
            if self.redis_client:
                event_data = {
                    "timestamp": event.timestamp.isoformat(),
                    "event_type": event.event_type.value,
                    "threat_level": event.threat_level.value,
                    "source_ip": event.source_ip,
                    "user_id": event.user_id,
                    "confidence": event.confidence,
                    "details": event.details
                }
                
                # Add to time-series data for dashboard
                self.redis_client.lpush("security_events", json.dumps(event_data))
                self.redis_client.ltrim("security_events", 0, 10000)  # Keep last 10k events
                
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    # ML Model placeholder implementations
    def _init_user_behavior_model(self):
        """Initialize user behavior analysis model"""
        # In production, would load trained ML model
        return {"model_type": "behavioral_analysis", "version": "1.0"}
    
    def _init_payment_fraud_model(self):
        """Initialize payment fraud detection model"""
        # In production, would load trained ML model
        return {"model_type": "fraud_detection", "version": "1.0"}
    
    def _init_api_usage_model(self):
        """Initialize API usage pattern model"""
        # In production, would load trained ML model
        return {"model_type": "api_pattern_analysis", "version": "1.0"}
    
    async def _analyze_user_behavior(
        self, 
        user_id: int, 
        request_data: Dict[str, Any], 
        timestamp: datetime
    ) -> float:
        """Analyze user behavior for anomalies"""
        # Simplified behavioral analysis
        # In production, would use sophisticated ML models
        
        anomaly_score = 0.0
        
        # Check time-based patterns
        hour = timestamp.hour
        if hour < 6 or hour > 23:  # Unusual hours
            anomaly_score += 0.2
        
        # Check endpoint patterns
        endpoint = request_data.get("endpoint", "")
        if "/admin/" in endpoint or "/api/v2/exports/" in endpoint:
            anomaly_score += 0.3
        
        # Check request frequency
        if self.redis_client:
            try:
                freq_key = f"user_frequency:{user_id}"
                request_count = self.redis_client.incr(freq_key)
                self.redis_client.expire(freq_key, 3600)
                
                if request_count > 100:  # High frequency
                    anomaly_score += 0.4
                    
            except Exception:
                pass
        
        return min(anomaly_score, 1.0)
    
    async def _detect_payment_fraud(
        self, 
        request_data: Dict[str, Any], 
        user_id: Optional[int]
    ) -> float:
        """Detect payment fraud patterns"""
        # Simplified fraud detection
        # In production, would use sophisticated ML models
        
        fraud_score = 0.0
        
        # Check for rapid payment attempts
        if user_id and self.redis_client:
            try:
                payment_key = f"payment_attempts:{user_id}"
                attempts = self.redis_client.incr(payment_key)
                self.redis_client.expire(payment_key, 3600)
                
                if attempts > 5:
                    fraud_score += 0.4
                    
            except Exception:
                pass
        
        # Check for suspicious amounts (testing patterns)
        amount = request_data.get("amount", 0)
        if amount in [1, 10, 100]:  # Common test amounts
            fraud_score += 0.3
        
        return min(fraud_score, 1.0)
    
    async def get_threat_metrics(self) -> Dict[str, Any]:
        """Get current threat detection metrics"""
        metrics = {
            "events_last_24h": 0,
            "blocked_ips": 0,
            "suspended_accounts": 0,
            "threat_level_distribution": {
                "low": 0,
                "medium": 0,
                "high": 0,
                "critical": 0
            },
            "attack_type_distribution": {},
            "response_metrics": {
                "automated_responses": 0,
                "false_positives": 0,
                "mitigation_success_rate": 0.0
            }
        }
        
        if self.redis_client:
            try:
                # Get recent events
                events_data = self.redis_client.lrange("security_events", 0, -1)
                
                cutoff_time = datetime.utcnow() - timedelta(hours=24)
                
                for event_json in events_data:
                    try:
                        event_data = json.loads(event_json)
                        event_time = datetime.fromisoformat(event_data["timestamp"])
                        
                        if event_time > cutoff_time:
                            metrics["events_last_24h"] += 1
                            
                            # Update distributions
                            threat_level = event_data.get("threat_level", "low")
                            metrics["threat_level_distribution"][threat_level] += 1
                            
                            attack_type = event_data.get("event_type", "unknown")
                            metrics["attack_type_distribution"][attack_type] = \
                                metrics["attack_type_distribution"].get(attack_type, 0) + 1
                                
                    except Exception:
                        continue
                
                # Get blocked IPs count
                blocked_ip_keys = self.redis_client.keys("blocked_ip:*")
                metrics["blocked_ips"] = len(blocked_ip_keys)
                
                # Get suspended accounts count
                suspended_keys = self.redis_client.keys("suspended_account:*")
                metrics["suspended_accounts"] = len(suspended_keys)
                
            except Exception as e:
                logger.error(f"Error getting threat metrics: {e}")
        
        return metrics


# Create singleton instance
advanced_threat_detector = AdvancedThreatDetectionService()