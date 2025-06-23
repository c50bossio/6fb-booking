"""
Enhanced security monitoring service for the 6FB Platform
"""

import time
import json
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session

from utils.secure_logging import get_secure_logger, log_security_event
from config.settings import settings


@dataclass
class SecurityEvent:
    """Security event data structure"""

    event_type: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    description: str
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    endpoint: Optional[str] = None
    user_agent: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    risk_score: Optional[int] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.risk_score is None:
            self.risk_score = self._calculate_risk_score()

    def _calculate_risk_score(self) -> int:
        """Calculate risk score based on event type and severity"""
        severity_scores = {"CRITICAL": 90, "HIGH": 70, "MEDIUM": 50, "LOW": 20}

        event_type_multipliers = {
            "SQL_INJECTION_ATTEMPT": 1.5,
            "XSS_ATTEMPT": 1.3,
            "BRUTE_FORCE_ATTACK": 1.4,
            "UNAUTHORIZED_ACCESS": 1.2,
            "SUSPICIOUS_FILE_UPLOAD": 1.1,
            "RATE_LIMIT_EXCEEDED": 0.8,
            "AUTHENTICATION_FAILURE": 0.9,
        }

        base_score = severity_scores.get(self.severity, 20)
        multiplier = event_type_multipliers.get(self.event_type, 1.0)

        return min(100, int(base_score * multiplier))


class ThreatDetector:
    """Advanced threat detection system"""

    def __init__(self):
        self.logger = get_secure_logger("security.threat_detector")

        # Track failed attempts by IP
        self.failed_attempts = defaultdict(list)

        # Track suspicious patterns
        self.suspicious_patterns = defaultdict(list)

        # Track user behavior
        self.user_sessions = defaultdict(dict)

        # Known attack patterns
        self.attack_patterns = {
            "sql_injection": [
                r"(\bunion\s+select\b)",
                r"(\'\s*(or|and)\s+\'\w+\'\s*=\s*\'\w+\')",
                r"(--|#|/\*|\*/)",
                r"(\bdrop\s+table\b)",
                r"(\bdelete\s+from\b)",
                r"(\binsert\s+into\b)",
                r"(\bupdate\s+\w+\s+set\b)",
            ],
            "xss": [
                r"(<script[^>]*>)",
                r"(javascript\s*:)",
                r"(on\w+\s*=)",
                r"(<iframe[^>]*>)",
                r"(<object[^>]*>)",
                r"(<embed[^>]*>)",
            ],
            "path_traversal": [
                r"(\.\.\/){2,}",
                r"(\.\.\\){2,}",
                r"(%2e%2e%2f){2,}",
                r"(%2e%2e%5c){2,}",
            ],
            "command_injection": [
                r"(\|\s*\w+)",
                r"(;\s*\w+)",
                r"(`[^`]*`)",
                r"(\$\([^)]*\))",
            ],
        }

    def analyze_request(
        self,
        ip_address: str,
        endpoint: str,
        method: str,
        headers: Dict[str, str],
        query_params: Dict[str, Any],
        body_data: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
    ) -> List[SecurityEvent]:
        """Analyze incoming request for security threats"""
        events = []

        # Check for injection attacks
        injection_events = self._check_injection_attacks(
            ip_address, endpoint, query_params, body_data
        )
        events.extend(injection_events)

        # Check for suspicious user agent
        user_agent = headers.get("User-Agent", "")
        if self._is_suspicious_user_agent(user_agent):
            events.append(
                SecurityEvent(
                    event_type="SUSPICIOUS_USER_AGENT",
                    severity="MEDIUM",
                    description=f"Suspicious user agent detected: {user_agent[:100]}",
                    ip_address=ip_address,
                    endpoint=endpoint,
                    user_agent=user_agent,
                )
            )

        # Check for rapid requests (potential DoS)
        if self._check_rapid_requests(ip_address):
            events.append(
                SecurityEvent(
                    event_type="RAPID_REQUESTS",
                    severity="HIGH",
                    description="Rapid requests detected - potential DoS attack",
                    ip_address=ip_address,
                    endpoint=endpoint,
                )
            )

        # Check for suspicious headers
        header_events = self._check_suspicious_headers(ip_address, headers)
        events.extend(header_events)

        # Update tracking data
        self._update_tracking_data(ip_address, endpoint, user_id)

        return events

    def _check_injection_attacks(
        self,
        ip_address: str,
        endpoint: str,
        query_params: Dict[str, Any],
        body_data: Optional[Dict[str, Any]],
    ) -> List[SecurityEvent]:
        """Check for SQL injection and other injection attacks"""
        events = []

        # Combine all input data
        all_data = {}
        if query_params:
            all_data.update(query_params)
        if body_data:
            all_data.update(body_data)

        # Convert all values to strings for pattern matching
        text_data = []
        for key, value in all_data.items():
            if isinstance(value, (str, int, float)):
                text_data.append(str(value))
            elif isinstance(value, dict):
                text_data.append(json.dumps(value))

        combined_text = " ".join(text_data).lower()

        # Check each attack pattern type
        for attack_type, patterns in self.attack_patterns.items():
            for pattern in patterns:
                import re

                if re.search(pattern, combined_text, re.IGNORECASE):
                    severity = (
                        "CRITICAL"
                        if attack_type in ["sql_injection", "command_injection"]
                        else "HIGH"
                    )
                    events.append(
                        SecurityEvent(
                            event_type=f"{attack_type.upper()}_ATTEMPT",
                            severity=severity,
                            description=f'{attack_type.replace("_", " ").title()} attempt detected',
                            ip_address=ip_address,
                            endpoint=endpoint,
                            request_data={"pattern_matched": pattern},
                        )
                    )
                    break  # Only log once per attack type

        return events

    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if user agent is suspicious"""
        if not user_agent:
            return True

        suspicious_patterns = [
            "sqlmap",
            "nikto",
            "nmap",
            "masscan",
            "burp",
            "owasp",
            "python-requests",
            "curl",
            "wget",
            "scanner",
            "bot",
            "crawler",
            "spider",
        ]

        user_agent_lower = user_agent.lower()
        return any(pattern in user_agent_lower for pattern in suspicious_patterns)

    def _check_rapid_requests(
        self, ip_address: str, window_seconds: int = 60, max_requests: int = 50
    ) -> bool:
        """Check for rapid requests indicating potential DoS"""
        current_time = time.time()

        # Clean old entries
        if ip_address in self.suspicious_patterns:
            self.suspicious_patterns[ip_address] = [
                timestamp
                for timestamp in self.suspicious_patterns[ip_address]
                if current_time - timestamp < window_seconds
            ]

        # Add current request
        self.suspicious_patterns[ip_address].append(current_time)

        # Check if threshold exceeded
        return len(self.suspicious_patterns[ip_address]) > max_requests

    def _check_suspicious_headers(
        self, ip_address: str, headers: Dict[str, str]
    ) -> List[SecurityEvent]:
        """Check for suspicious HTTP headers"""
        events = []

        # Check for missing security headers in response (should be added by middleware)
        required_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
        ]

        # Check for suspicious request headers
        suspicious_headers = {
            "X-Forwarded-For": "Potential proxy/VPN usage",
            "X-Real-IP": "Potential IP spoofing",
            "X-Originating-IP": "Suspicious header present",
        }

        for header, description in suspicious_headers.items():
            if header in headers:
                events.append(
                    SecurityEvent(
                        event_type="SUSPICIOUS_HEADER",
                        severity="LOW",
                        description=f"{description}: {header}",
                        ip_address=ip_address,
                        request_data={"header": header, "value": headers[header][:100]},
                    )
                )

        return events

    def _update_tracking_data(
        self, ip_address: str, endpoint: str, user_id: Optional[int]
    ):
        """Update tracking data for behavioral analysis"""
        current_time = datetime.utcnow()

        # Update IP tracking
        if ip_address not in self.user_sessions:
            self.user_sessions[ip_address] = {
                "first_seen": current_time,
                "last_seen": current_time,
                "endpoints": set(),
                "request_count": 0,
                "user_ids": set(),
            }

        session = self.user_sessions[ip_address]
        session["last_seen"] = current_time
        session["endpoints"].add(endpoint)
        session["request_count"] += 1

        if user_id:
            session["user_ids"].add(user_id)

    def get_ip_risk_score(self, ip_address: str) -> int:
        """Calculate risk score for an IP address"""
        if ip_address not in self.user_sessions:
            return 0

        session = self.user_sessions[ip_address]
        risk_score = 0

        # Factor in request volume
        if session["request_count"] > 1000:
            risk_score += 30
        elif session["request_count"] > 500:
            risk_score += 20
        elif session["request_count"] > 100:
            risk_score += 10

        # Factor in endpoint diversity (too many different endpoints is suspicious)
        if len(session["endpoints"]) > 50:
            risk_score += 25
        elif len(session["endpoints"]) > 20:
            risk_score += 15

        # Factor in multiple user IDs from same IP
        if len(session["user_ids"]) > 5:
            risk_score += 20
        elif len(session["user_ids"]) > 3:
            risk_score += 10

        # Factor in failed attempts
        if ip_address in self.failed_attempts:
            recent_failures = len(
                [
                    timestamp
                    for timestamp in self.failed_attempts[ip_address]
                    if time.time() - timestamp < 3600  # Last hour
                ]
            )
            risk_score += min(40, recent_failures * 5)

        return min(100, risk_score)


class SecurityMonitoringService:
    """Main security monitoring service"""

    def __init__(self, db: Session):
        self.db = db
        self.logger = get_secure_logger("security.monitoring")
        self.threat_detector = ThreatDetector()

        # Event storage (in production, use database or external service)
        self.recent_events = deque(maxlen=1000)
        self.event_counts = defaultdict(int)

        # Alert thresholds
        self.alert_thresholds = {
            "CRITICAL_EVENTS_PER_HOUR": 5,
            "HIGH_EVENTS_PER_HOUR": 20,
            "FAILED_LOGINS_PER_IP_PER_HOUR": 10,
            "SUSPICIOUS_IPS_PER_HOUR": 50,
        }

        # Start background monitoring
        self._start_monitoring()

    def process_request(
        self,
        ip_address: str,
        endpoint: str,
        method: str,
        headers: Dict[str, str],
        query_params: Dict[str, Any],
        body_data: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
    ):
        """Process incoming request for security monitoring"""
        try:
            # Analyze request for threats
            events = self.threat_detector.analyze_request(
                ip_address, endpoint, method, headers, query_params, body_data, user_id
            )

            # Process each detected event
            for event in events:
                self._process_security_event(event)

        except Exception as e:
            self.logger.error(f"Error processing security request: {str(e)}")

    def _process_security_event(self, event: SecurityEvent):
        """Process a security event"""
        # Add to recent events
        self.recent_events.append(event)

        # Update event counts
        self.event_counts[event.event_type] += 1

        # Log the event
        log_security_event(
            event_type=event.event_type,
            description=event.description,
            user_id=event.user_id,
            ip_address=event.ip_address,
            additional_data=asdict(event),
            severity=event.severity,
        )

        # Check if we need to send alerts
        self._check_alert_conditions(event)

        # Take automatic actions if needed
        self._take_automatic_actions(event)

    def _check_alert_conditions(self, event: SecurityEvent):
        """Check if alert conditions are met"""
        current_time = datetime.utcnow()
        hour_ago = current_time - timedelta(hours=1)

        # Count recent events by severity
        recent_critical = sum(
            1
            for e in self.recent_events
            if e.timestamp >= hour_ago and e.severity == "CRITICAL"
        )

        recent_high = sum(
            1
            for e in self.recent_events
            if e.timestamp >= hour_ago and e.severity == "HIGH"
        )

        # Send alerts if thresholds exceeded
        if recent_critical >= self.alert_thresholds["CRITICAL_EVENTS_PER_HOUR"]:
            self._send_security_alert(
                f"Critical security events threshold exceeded: {recent_critical} events in last hour"
            )

        if recent_high >= self.alert_thresholds["HIGH_EVENTS_PER_HOUR"]:
            self._send_security_alert(
                f"High severity security events threshold exceeded: {recent_high} events in last hour"
            )

    def _take_automatic_actions(self, event: SecurityEvent):
        """Take automatic actions based on event type and severity"""
        if event.severity == "CRITICAL":
            # For critical events, consider blocking the IP temporarily
            if event.ip_address:
                self._temporary_ip_block(event.ip_address, duration_minutes=15)

        # For multiple failed attempts, increase monitoring
        if event.event_type == "AUTHENTICATION_FAILURE" and event.ip_address:
            self.threat_detector.failed_attempts[event.ip_address].append(time.time())

    def _temporary_ip_block(self, ip_address: str, duration_minutes: int = 15):
        """Implement temporary IP blocking (placeholder)"""
        # In production, integrate with firewall or load balancer
        self.logger.warning(
            f"Temporary IP block recommended for {ip_address} (duration: {duration_minutes} minutes)"
        )

    def _send_security_alert(self, message: str):
        """Send security alert to administrators"""
        # In production, integrate with Slack, email, or other notification systems
        self.logger.critical(f"SECURITY ALERT: {message}")

    def _start_monitoring(self):
        """Start background monitoring tasks"""
        # In production, this would run in a separate thread or process
        pass

    def get_security_dashboard_data(self) -> Dict[str, Any]:
        """Get data for security monitoring dashboard"""
        current_time = datetime.utcnow()
        hour_ago = current_time - timedelta(hours=1)
        day_ago = current_time - timedelta(days=1)

        # Count events by time period
        last_hour_events = [e for e in self.recent_events if e.timestamp >= hour_ago]
        last_day_events = [e for e in self.recent_events if e.timestamp >= day_ago]

        # Group events by type and severity
        event_types = defaultdict(int)
        severities = defaultdict(int)

        for event in last_day_events:
            event_types[event.event_type] += 1
            severities[event.severity] += 1

        # Get top suspicious IPs
        ip_risk_scores = {}
        for event in last_day_events:
            if event.ip_address:
                if event.ip_address not in ip_risk_scores:
                    ip_risk_scores[event.ip_address] = (
                        self.threat_detector.get_ip_risk_score(event.ip_address)
                    )

        top_suspicious_ips = sorted(
            ip_risk_scores.items(), key=lambda x: x[1], reverse=True
        )[:10]

        return {
            "summary": {
                "total_events_last_hour": len(last_hour_events),
                "total_events_last_day": len(last_day_events),
                "critical_events_last_day": severities.get("CRITICAL", 0),
                "high_events_last_day": severities.get("HIGH", 0),
            },
            "event_types": dict(event_types),
            "severities": dict(severities),
            "top_suspicious_ips": top_suspicious_ips,
            "recent_critical_events": [
                asdict(e) for e in last_hour_events if e.severity == "CRITICAL"
            ][
                -10:
            ],  # Last 10 critical events
            "timestamp": current_time.isoformat(),
        }


# Global instance
_security_monitor = None


def get_security_monitor(db: Session) -> SecurityMonitoringService:
    """Get or create security monitoring service instance"""
    global _security_monitor
    if _security_monitor is None:
        _security_monitor = SecurityMonitoringService(db)
    return _security_monitor


def reset_security_monitor():
    """Reset security monitor (for testing)"""
    global _security_monitor
    _security_monitor = None
