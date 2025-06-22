"""
Security monitoring service for 6FB Booking Platform
Monitors security headers, CSP violations, and security events
"""

import logging
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
from enum import Enum

import sentry_sdk
from fastapi import Request
from fastapi.responses import Response

logger = logging.getLogger(__name__)


class SecurityEventType(Enum):
    """Types of security events"""

    CSP_VIOLATION = "csp_violation"
    SUSPICIOUS_REQUEST = "suspicious_request"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    INVALID_TOKEN = "invalid_token"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    INJECTION_ATTEMPT = "injection_attempt"


@dataclass
class SecurityEvent:
    """Security event record"""

    event_type: SecurityEventType
    severity: str  # low, medium, high, critical
    source_ip: str
    user_agent: Optional[str]
    request_path: str
    details: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None


@dataclass
class SecurityAlert:
    """Security alert"""

    id: str
    severity: str
    title: str
    message: str
    events_count: int
    first_seen: datetime
    last_seen: datetime
    resolved: bool = False


class SecurityMonitoringService:
    """Service for monitoring security events and violations"""

    def __init__(self):
        self.security_events = deque(maxlen=1000)
        self.active_alerts = {}
        self.ip_requests = defaultdict(list)  # IP -> list of request timestamps
        self.csp_violations = deque(maxlen=100)

        # Security thresholds
        self.thresholds = {
            "requests_per_minute": 100,  # Max requests per IP per minute
            "failed_auth_attempts": 5,  # Max failed auth attempts per IP per hour
            "csp_violations_per_hour": 10,  # Max CSP violations per hour
            "suspicious_patterns_threshold": 3,  # Threshold for suspicious patterns
        }

        # Suspicious patterns
        self.suspicious_patterns = [
            "SELECT * FROM",
            "UNION SELECT",
            "<script",
            "javascript:",
            "eval(",
            "document.cookie",
            "../../../",
            "etc/passwd",
            "cmd.exe",
            "powershell",
        ]

    def get_security_headers(self) -> Dict[str, str]:
        """Get recommended security headers"""
        return {
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
                "https://www.googletagmanager.com https://www.google-analytics.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' https://api.stripe.com https://www.google-analytics.com; "
                "frame-src 'self' https://js.stripe.com; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "upgrade-insecure-requests; "
                "report-uri /api/v1/security/csp-report"
            ),
            # Prevent XSS attacks
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            # HTTPS enforcement
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            # Permissions policy
            "Permissions-Policy": (
                "geolocation=(), microphone=(), camera=(), "
                "payment=(self), encrypted-media=()"
            ),
            # Additional security headers
            "X-Permitted-Cross-Domain-Policies": "none",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-origin",
        }

    def apply_security_headers(self, response: Response) -> Response:
        """Apply security headers to response"""
        headers = self.get_security_headers()

        for header_name, header_value in headers.items():
            response.headers[header_name] = header_value

        return response

    def record_security_event(self, event: SecurityEvent):
        """Record a security event"""
        self.security_events.append(event)

        # Check for suspicious patterns
        self._check_suspicious_activity(event)

        # Track IP-based metrics
        self._track_ip_activity(event)

        # Send to Sentry for high/critical severity events
        if event.severity in ["high", "critical"]:
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("event_type", "security")
                scope.set_tag("security_event_type", event.event_type.value)
                scope.set_tag("severity", event.severity)
                scope.set_context(
                    "security_event",
                    {
                        "source_ip": event.source_ip,
                        "user_agent": event.user_agent,
                        "request_path": event.request_path,
                        "details": event.details,
                        "user_id": event.user_id,
                    },
                )

                sentry_sdk.capture_message(
                    f"Security event: {event.event_type.value}",
                    level="warning" if event.severity == "high" else "error",
                )

        logger.warning(
            f"Security event [{event.severity}]: {event.event_type.value} "
            f"from {event.source_ip} on {event.request_path}"
        )

    def _check_suspicious_activity(self, event: SecurityEvent):
        """Check for suspicious activity patterns"""
        # Count events from same IP in last hour
        recent_events = [
            e
            for e in self.security_events
            if (
                e.source_ip == event.source_ip
                and e.timestamp > datetime.utcnow() - timedelta(hours=1)
            )
        ]

        if len(recent_events) >= self.thresholds["suspicious_patterns_threshold"]:
            self._create_alert(
                f"suspicious_activity_{event.source_ip}",
                "high",
                "Suspicious Activity Detected",
                f"Multiple security events from IP {event.source_ip}",
                len(recent_events),
            )

    def _track_ip_activity(self, event: SecurityEvent):
        """Track IP-based activity for rate limiting"""
        now = datetime.utcnow()
        ip = event.source_ip

        # Add current request
        self.ip_requests[ip].append(now)

        # Clean old requests (older than 1 minute)
        cutoff = now - timedelta(minutes=1)
        self.ip_requests[ip] = [
            req_time for req_time in self.ip_requests[ip] if req_time > cutoff
        ]

        # Check rate limits
        if len(self.ip_requests[ip]) > self.thresholds["requests_per_minute"]:
            self.record_security_event(
                SecurityEvent(
                    event_type=SecurityEventType.RATE_LIMIT_EXCEEDED,
                    severity="medium",
                    source_ip=ip,
                    user_agent=event.user_agent,
                    request_path=event.request_path,
                    details={"requests_per_minute": len(self.ip_requests[ip])},
                    timestamp=now,
                )
            )

    def _create_alert(
        self, alert_id: str, severity: str, title: str, message: str, events_count: int
    ):
        """Create or update a security alert"""
        now = datetime.utcnow()

        if alert_id in self.active_alerts and not self.active_alerts[alert_id].resolved:
            # Update existing alert
            alert = self.active_alerts[alert_id]
            alert.events_count += 1
            alert.last_seen = now
        else:
            # Create new alert
            alert = SecurityAlert(
                id=alert_id,
                severity=severity,
                title=title,
                message=message,
                events_count=events_count,
                first_seen=now,
                last_seen=now,
            )
            self.active_alerts[alert_id] = alert

        # Send to Sentry
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("alert_type", "security")
            scope.set_tag("alert_severity", severity)
            scope.set_context(
                "alert",
                {"id": alert_id, "title": title, "events_count": alert.events_count},
            )

            if severity == "critical":
                sentry_sdk.capture_message(
                    f"CRITICAL: {title} - {message}", level="error"
                )
            else:
                sentry_sdk.capture_message(
                    f"{severity.upper()}: {title} - {message}", level="warning"
                )

        logger.warning(f"Security Alert [{severity}]: {title} - {message}")

    def check_request_for_threats(self, request: Request) -> Optional[SecurityEvent]:
        """Check incoming request for security threats"""
        threats_detected = []

        # Get request details
        source_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        request_path = str(request.url.path)

        # Check for SQL injection patterns
        query_params = str(request.url.query).lower()
        request_body = ""

        # Check for suspicious patterns in query params and body
        content_to_check = f"{query_params} {request_body} {request_path}".lower()

        for pattern in self.suspicious_patterns:
            if pattern.lower() in content_to_check:
                threats_detected.append(f"Suspicious pattern: {pattern}")

        # Check for unusual request headers
        suspicious_headers = []
        for header_name, header_value in request.headers.items():
            if any(
                pattern.lower() in header_value.lower()
                for pattern in self.suspicious_patterns
            ):
                suspicious_headers.append(f"{header_name}: {header_value[:100]}")

        if suspicious_headers:
            threats_detected.append(f"Suspicious headers: {suspicious_headers}")

        # Check for path traversal attempts
        if "../" in request_path or "..%2f" in request_path.lower():
            threats_detected.append("Path traversal attempt")

        # If threats detected, create security event
        if threats_detected:
            return SecurityEvent(
                event_type=SecurityEventType.INJECTION_ATTEMPT,
                severity="high" if len(threats_detected) > 1 else "medium",
                source_ip=source_ip,
                user_agent=user_agent,
                request_path=request_path,
                details={"threats": threats_detected},
                timestamp=datetime.utcnow(),
            )

        return None

    def handle_csp_violation(self, violation_report: Dict[str, Any], source_ip: str):
        """Handle CSP violation report"""
        violation = {
            "blocked_uri": violation_report.get("blocked-uri", ""),
            "document_uri": violation_report.get("document-uri", ""),
            "violated_directive": violation_report.get("violated-directive", ""),
            "original_policy": violation_report.get("original-policy", ""),
            "source_file": violation_report.get("source-file", ""),
            "line_number": violation_report.get("line-number", 0),
            "timestamp": datetime.utcnow(),
        }

        self.csp_violations.append(violation)

        # Create security event
        event = SecurityEvent(
            event_type=SecurityEventType.CSP_VIOLATION,
            severity="low",
            source_ip=source_ip,
            user_agent=None,
            request_path=violation["document_uri"],
            details=violation,
            timestamp=datetime.utcnow(),
        )

        self.record_security_event(event)

        # Check for excessive violations
        recent_violations = [
            v
            for v in self.csp_violations
            if v["timestamp"] > datetime.utcnow() - timedelta(hours=1)
        ]

        if len(recent_violations) > self.thresholds["csp_violations_per_hour"]:
            self._create_alert(
                "excessive_csp_violations",
                "medium",
                "Excessive CSP Violations",
                f"{len(recent_violations)} CSP violations in the last hour",
                len(recent_violations),
            )

    def get_security_summary(self) -> Dict[str, Any]:
        """Get comprehensive security summary"""
        now = datetime.utcnow()

        # Events in last 24 hours
        recent_events = [
            e for e in self.security_events if e.timestamp > now - timedelta(hours=24)
        ]

        # Group events by type
        events_by_type = defaultdict(int)
        events_by_severity = defaultdict(int)

        for event in recent_events:
            events_by_type[event.event_type.value] += 1
            events_by_severity[event.severity] += 1

        # Top source IPs
        ip_counts = defaultdict(int)
        for event in recent_events:
            ip_counts[event.source_ip] += 1

        top_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        # CSP violations in last 24 hours
        recent_csp = [
            v for v in self.csp_violations if v["timestamp"] > now - timedelta(hours=24)
        ]

        return {
            "summary": {
                "total_events_24h": len(recent_events),
                "critical_events": events_by_severity.get("critical", 0),
                "high_severity_events": events_by_severity.get("high", 0),
                "active_alerts": len(
                    [a for a in self.active_alerts.values() if not a.resolved]
                ),
                "csp_violations_24h": len(recent_csp),
            },
            "events_by_type": dict(events_by_type),
            "events_by_severity": dict(events_by_severity),
            "top_source_ips": top_ips,
            "recent_csp_violations": len(recent_csp),
            "security_headers_configured": True,
            "timestamp": now.isoformat(),
        }

    def get_active_alerts(self) -> List[SecurityAlert]:
        """Get all active security alerts"""
        return [alert for alert in self.active_alerts.values() if not alert.resolved]

    def resolve_alert(self, alert_id: str):
        """Resolve a security alert"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].resolved = True
            logger.info(f"Security alert resolved: {alert_id}")

    def get_security_headers_status(self) -> Dict[str, Any]:
        """Get status of security headers configuration"""
        headers = self.get_security_headers()

        return {
            "configured_headers": list(headers.keys()),
            "total_headers": len(headers),
            "csp_configured": "Content-Security-Policy" in headers,
            "hsts_configured": "Strict-Transport-Security" in headers,
            "xss_protection": "X-XSS-Protection" in headers,
            "content_type_options": "X-Content-Type-Options" in headers,
            "frame_options": "X-Frame-Options" in headers,
            "timestamp": datetime.utcnow().isoformat(),
        }


# Global instance
security_monitor = SecurityMonitoringService()


def get_security_monitor() -> SecurityMonitoringService:
    """Get the global security monitoring service instance"""
    return security_monitor
