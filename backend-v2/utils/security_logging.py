"""
Enhanced Security Logging for BookedBarber V2

Provides comprehensive security event logging with structured data,
severity levels, and integration with monitoring systems.
"""

import logging
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session


class SecurityEventType(Enum):
    """Types of security events"""
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    
    # Payment security events
    PAYMENT_FRAUD_ATTEMPT = "payment_fraud_attempt"
    PAYMENT_BLOCKED = "payment_blocked"
    PAYMENT_HIGH_RISK = "payment_high_risk"
    PAYMENT_SUSPICIOUS_PATTERN = "payment_suspicious_pattern"
    
    # Webhook security events
    WEBHOOK_SIGNATURE_INVALID = "webhook_signature_invalid"
    WEBHOOK_REPLAY_ATTACK = "webhook_replay_attack"
    WEBHOOK_RATE_LIMIT = "webhook_rate_limit"
    
    # API security events
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    SUSPICIOUS_REQUEST = "suspicious_request"
    
    # System security events
    CONFIGURATION_CHANGE = "configuration_change"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"


class SecuritySeverity(Enum):
    """Security event severity levels"""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SecurityEvent:
    """Structured security event"""
    event_id: str
    event_type: SecurityEventType
    severity: SecuritySeverity
    timestamp: datetime
    user_id: Optional[int]
    session_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    message: str
    details: Dict[str, Any]
    source_component: str
    affected_resources: List[str]
    remediation_actions: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type.value,
            "severity": self.severity.value,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "session_id": self.session_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "message": self.message,
            "details": self.details,
            "source_component": self.source_component,
            "affected_resources": self.affected_resources,
            "remediation_actions": self.remediation_actions
        }


class SecurityLogger:
    """Enhanced security logging service"""
    
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.logger = logging.getLogger("security")
        
        # Configure security logger with specific format
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - SECURITY - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def log_event(
        self,
        event_type: SecurityEventType,
        severity: SecuritySeverity,
        message: str,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        source_component: str = "unknown",
        affected_resources: Optional[List[str]] = None,
        remediation_actions: Optional[List[str]] = None
    ) -> str:
        """Log a security event and return event ID"""
        
        event_id = str(uuid.uuid4())
        
        event = SecurityEvent(
            event_id=event_id,
            event_type=event_type,
            severity=severity,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            message=message,
            details=details or {},
            source_component=source_component,
            affected_resources=affected_resources or [],
            remediation_actions=remediation_actions or []
        )
        
        # Log to standard logger with structured data
        log_data = event.to_dict()
        log_message = f"{event_type.value.upper()} - {message} - Event ID: {event_id}"
        
        if severity in [SecuritySeverity.CRITICAL, SecuritySeverity.HIGH]:
            self.logger.error(f"{log_message} - Data: {json.dumps(log_data)}")
        elif severity == SecuritySeverity.MEDIUM:
            self.logger.warning(f"{log_message} - Data: {json.dumps(log_data)}")
        else:
            self.logger.info(f"{log_message} - Data: {json.dumps(log_data)}")
        
        # Store in database if available
        if self.db:
            try:
                self._store_security_event(event)
            except Exception as e:
                self.logger.error(f"Failed to store security event in database: {e}")
        
        # Send alerts for critical events
        if severity == SecuritySeverity.CRITICAL:
            self._send_critical_alert(event)
        
        return event_id
    
    def log_payment_security_event(
        self,
        event_type: SecurityEventType,
        user_id: int,
        amount: float,
        payment_id: Optional[int] = None,
        risk_factors: Optional[List[str]] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log payment-specific security events"""
        
        severity = self._determine_payment_severity(event_type, amount, risk_factors)
        
        message = f"Payment security event for user {user_id}, amount ${amount:.2f}"
        if payment_id:
            message += f", payment ID {payment_id}"
        
        event_details = {
            "amount": amount,
            "payment_id": payment_id,
            "risk_factors": risk_factors or [],
            **(details or {})
        }
        
        affected_resources = []
        if payment_id:
            affected_resources.append(f"payment:{payment_id}")
        affected_resources.append(f"user:{user_id}")
        
        remediation_actions = self._get_payment_remediation_actions(event_type, severity)
        
        return self.log_event(
            event_type=event_type,
            severity=severity,
            message=message,
            user_id=user_id,
            ip_address=ip_address,
            details=event_details,
            source_component="payment_service",
            affected_resources=affected_resources,
            remediation_actions=remediation_actions
        )
    
    def log_webhook_security_event(
        self,
        event_type: SecurityEventType,
        webhook_provider: str,
        event_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log webhook-specific security events"""
        
        severity = self._determine_webhook_severity(event_type)
        
        message = f"Webhook security event from {webhook_provider}"
        if event_id:
            message += f", event ID {event_id}"
        
        event_details = {
            "webhook_provider": webhook_provider,
            "webhook_event_id": event_id,
            **(details or {})
        }
        
        affected_resources = [f"webhook:{webhook_provider}"]
        if event_id:
            affected_resources.append(f"webhook_event:{event_id}")
        
        remediation_actions = self._get_webhook_remediation_actions(event_type)
        
        return self.log_event(
            event_type=event_type,
            severity=severity,
            message=message,
            ip_address=ip_address,
            details=event_details,
            source_component="webhook_service",
            affected_resources=affected_resources,
            remediation_actions=remediation_actions
        )
    
    def log_api_security_event(
        self,
        event_type: SecurityEventType,
        endpoint: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log API-specific security events"""
        
        severity = self._determine_api_severity(event_type)
        
        message = f"API security event on {endpoint}"
        if user_id:
            message += f" by user {user_id}"
        
        event_details = {
            "endpoint": endpoint,
            "method": details.get("method") if details else None,
            **(details or {})
        }
        
        affected_resources = [f"endpoint:{endpoint}"]
        if user_id:
            affected_resources.append(f"user:{user_id}")
        
        remediation_actions = self._get_api_remediation_actions(event_type)
        
        return self.log_event(
            event_type=event_type,
            severity=severity,
            message=message,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=event_details,
            source_component="api_service",
            affected_resources=affected_resources,
            remediation_actions=remediation_actions
        )
    
    def _determine_payment_severity(
        self, 
        event_type: SecurityEventType, 
        amount: float, 
        risk_factors: Optional[List[str]]
    ) -> SecuritySeverity:
        """Determine severity for payment events"""
        if event_type == SecurityEventType.PAYMENT_BLOCKED:
            return SecuritySeverity.HIGH
        elif event_type == SecurityEventType.PAYMENT_FRAUD_ATTEMPT:
            return SecuritySeverity.CRITICAL
        elif amount > 5000 or (risk_factors and len(risk_factors) >= 3):
            return SecuritySeverity.HIGH
        elif amount > 1000 or (risk_factors and len(risk_factors) >= 2):
            return SecuritySeverity.MEDIUM
        else:
            return SecuritySeverity.LOW
    
    def _determine_webhook_severity(self, event_type: SecurityEventType) -> SecuritySeverity:
        """Determine severity for webhook events"""
        if event_type == SecurityEventType.WEBHOOK_SIGNATURE_INVALID:
            return SecuritySeverity.HIGH
        elif event_type == SecurityEventType.WEBHOOK_REPLAY_ATTACK:
            return SecuritySeverity.MEDIUM
        else:
            return SecuritySeverity.LOW
    
    def _determine_api_severity(self, event_type: SecurityEventType) -> SecuritySeverity:
        """Determine severity for API events"""
        if event_type == SecurityEventType.UNAUTHORIZED_ACCESS:
            return SecuritySeverity.HIGH
        elif event_type == SecurityEventType.RATE_LIMIT_EXCEEDED:
            return SecuritySeverity.MEDIUM
        else:
            return SecuritySeverity.LOW
    
    def _get_payment_remediation_actions(
        self, 
        event_type: SecurityEventType, 
        severity: SecuritySeverity
    ) -> List[str]:
        """Get remediation actions for payment events"""
        actions = []
        
        if event_type == SecurityEventType.PAYMENT_BLOCKED:
            actions.extend([
                "Review user payment history",
                "Verify user identity if needed",
                "Consider manual approval for legitimate users"
            ])
        elif event_type == SecurityEventType.PAYMENT_FRAUD_ATTEMPT:
            actions.extend([
                "Block user account temporarily",
                "Escalate to fraud investigation team",
                "Review all recent transactions from user"
            ])
        elif severity in [SecuritySeverity.HIGH, SecuritySeverity.CRITICAL]:
            actions.extend([
                "Monitor user for additional suspicious activity",
                "Consider enhanced verification requirements"
            ])
        
        return actions
    
    def _get_webhook_remediation_actions(self, event_type: SecurityEventType) -> List[str]:
        """Get remediation actions for webhook events"""
        if event_type == SecurityEventType.WEBHOOK_SIGNATURE_INVALID:
            return [
                "Verify webhook endpoint configuration",
                "Check webhook secret rotation",
                "Monitor for additional invalid requests"
            ]
        elif event_type == SecurityEventType.WEBHOOK_REPLAY_ATTACK:
            return [
                "Check webhook timestamp validation",
                "Review webhook deduplication logic",
                "Monitor source IP for additional attacks"
            ]
        else:
            return ["Monitor webhook endpoint for unusual activity"]
    
    def _get_api_remediation_actions(self, event_type: SecurityEventType) -> List[str]:
        """Get remediation actions for API events"""
        if event_type == SecurityEventType.UNAUTHORIZED_ACCESS:
            return [
                "Review authentication logs",
                "Check for credential compromise",
                "Consider IP-based blocking if necessary"
            ]
        elif event_type == SecurityEventType.RATE_LIMIT_EXCEEDED:
            return [
                "Monitor for sustained abuse",
                "Consider temporary IP blocking",
                "Review rate limit configuration"
            ]
        else:
            return ["Continue monitoring API endpoint"]
    
    def _store_security_event(self, event: SecurityEvent):
        """Store security event in database"""
        # In a real implementation, would store in a security_events table
        # For now, just log that we would store it
        self.logger.debug(f"Would store security event {event.event_id} in database")
    
    def _send_critical_alert(self, event: SecurityEvent):
        """Send alert for critical security events"""
        # In a real implementation, would send alerts via:
        # - Email to security team
        # - Slack/Teams notification
        # - PagerDuty/monitoring system
        # - SMS for critical events
        
        self.logger.critical(
            f"CRITICAL SECURITY ALERT - {event.event_type.value} - {event.message} - "
            f"Event ID: {event.event_id}"
        )


# Global security logger instance
security_logger = SecurityLogger()


def get_security_logger(db: Optional[Session] = None) -> SecurityLogger:
    """Get security logger instance"""
    if db:
        return SecurityLogger(db)
    return security_logger