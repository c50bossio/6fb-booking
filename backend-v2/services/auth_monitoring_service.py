"""
Authentication Monitoring Service
Comprehensive monitoring and alerting for authentication system security
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import hashlib
import os
from sqlalchemy.orm import Session
from sqlalchemy import text

from db import get_db
import models

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_type: str
    severity: str  # low, medium, high, critical
    description: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict] = None
    session_id: Optional[str] = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow()
        if not self.metadata:
            self.metadata = {}

@dataclass
class AuthMetrics:
    """Authentication metrics tracking"""
    successful_logins: int = 0
    failed_logins: int = 0
    mfa_verifications: int = 0
    token_refreshes: int = 0
    password_resets: int = 0
    account_lockouts: int = 0
    suspicious_activities: int = 0
    avg_response_time_ms: float = 0.0
    error_rate: float = 0.0
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow()

class BruteForceDetector:
    """Detects brute force attacks and suspicious login patterns"""
    
    def __init__(self):
        self.failed_attempts = defaultdict(lambda: deque(maxlen=100))  # IP -> failed attempts
        self.user_attempts = defaultdict(lambda: deque(maxlen=50))     # User -> failed attempts
        self.blacklisted_ips = set()
        
        # Thresholds
        self.max_attempts_per_ip = 10        # Per 15 minutes
        self.max_attempts_per_user = 5       # Per 15 minutes
        self.time_window = timedelta(minutes=15)
    
    def record_failed_attempt(self, ip_address: str, email: str = None) -> Dict[str, Any]:
        """Record a failed authentication attempt and check for patterns"""
        now = datetime.utcnow()
        
        # Record IP attempt
        self.failed_attempts[ip_address].append(now)
        
        # Record user attempt if email provided
        if email:
            self.user_attempts[email].append(now)
        
        # Check for brute force patterns
        alerts = []
        
        # Check IP-based attacks
        recent_ip_attempts = [
            t for t in self.failed_attempts[ip_address]
            if now - t <= self.time_window
        ]
        
        if len(recent_ip_attempts) >= self.max_attempts_per_ip:
            self.blacklisted_ips.add(ip_address)
            alerts.append({
                "type": "brute_force_ip",
                "severity": "critical",
                "description": f"Brute force attack detected from IP {ip_address}",
                "attempts": len(recent_ip_attempts),
                "action": "ip_blacklisted"
            })
        
        # Check user-based attacks
        if email:
            recent_user_attempts = [
                t for t in self.user_attempts[email]
                if now - t <= self.time_window
            ]
            
            if len(recent_user_attempts) >= self.max_attempts_per_user:
                alerts.append({
                    "type": "brute_force_user",
                    "severity": "high",
                    "description": f"Multiple failed login attempts for user {email}",
                    "attempts": len(recent_user_attempts),
                    "action": "account_lockout_recommended"
                })
        
        return {
            "is_suspicious": len(alerts) > 0,
            "alerts": alerts,
            "ip_attempts": len(recent_ip_attempts),
            "user_attempts": len(recent_user_attempts) if email else 0
        }
    
    def is_ip_blacklisted(self, ip_address: str) -> bool:
        """Check if IP is blacklisted"""
        return ip_address in self.blacklisted_ips
    
    def cleanup_old_attempts(self):
        """Clean up old attempts data"""
        cutoff = datetime.utcnow() - self.time_window
        
        for ip_queue in self.failed_attempts.values():
            while ip_queue and ip_queue[0] < cutoff:
                ip_queue.popleft()
        
        for user_queue in self.user_attempts.values():
            while user_queue and user_queue[0] < cutoff:
                user_queue.popleft()

class TokenSecurityMonitor:
    """Monitors JWT token security and detects token-related attacks"""
    
    def __init__(self):
        self.token_usage = defaultdict(list)  # token_hash -> usage timestamps
        self.user_tokens = defaultdict(set)   # user_id -> active token hashes
        self.suspicious_patterns = []
    
    def record_token_usage(self, token: str, user_id: str, ip_address: str, user_agent: str) -> Dict[str, Any]:
        """Record token usage and detect suspicious patterns"""
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
        now = datetime.utcnow()
        
        usage_info = {
            "timestamp": now,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "user_id": user_id
        }
        
        self.token_usage[token_hash].append(usage_info)
        self.user_tokens[user_id].add(token_hash)
        
        # Detect suspicious patterns
        alerts = []
        
        # Check for token reuse from different IPs
        recent_usages = [
            u for u in self.token_usage[token_hash]
            if now - u["timestamp"] <= timedelta(minutes=30)
        ]
        
        unique_ips = set(u["ip_address"] for u in recent_usages)
        if len(unique_ips) > 3:  # Same token from >3 IPs in 30 minutes
            alerts.append({
                "type": "token_ip_anomaly",
                "severity": "high",
                "description": f"Token used from {len(unique_ips)} different IPs",
                "ips": list(unique_ips),
                "usage_count": len(recent_usages)
            })
        
        # Check for rapid token usage (potential replay attack)
        if len(recent_usages) > 100:  # >100 uses in 30 minutes
            alerts.append({
                "type": "token_replay_attack",
                "severity": "critical",
                "description": "Potential token replay attack detected",
                "usage_count": len(recent_usages)
            })
        
        # Check for user with too many active tokens
        if len(self.user_tokens[user_id]) > 10:
            alerts.append({
                "type": "excessive_tokens",
                "severity": "medium",
                "description": f"User has {len(self.user_tokens[user_id])} active tokens",
                "token_count": len(self.user_tokens[user_id])
            })
        
        return {
            "is_suspicious": len(alerts) > 0,
            "alerts": alerts,
            "token_hash": token_hash,
            "unique_ips": len(unique_ips),
            "usage_count": len(recent_usages)
        }
    
    def revoke_user_tokens(self, user_id: str):
        """Mark all user tokens as revoked"""
        if user_id in self.user_tokens:
            for token_hash in self.user_tokens[user_id]:
                if token_hash in self.token_usage:
                    del self.token_usage[token_hash]
            del self.user_tokens[user_id]

class SessionAnomalyDetector:
    """Detects anomalous session behavior"""
    
    def __init__(self):
        self.user_sessions = defaultdict(list)  # user_id -> session info
        self.ip_locations = {}  # Cache for IP geolocation
    
    def analyze_session(self, user_id: str, ip_address: str, user_agent: str, session_duration: int = None) -> Dict[str, Any]:
        """Analyze session for anomalies"""
        now = datetime.utcnow()
        alerts = []
        
        # Get recent sessions for this user
        recent_sessions = [
            s for s in self.user_sessions[user_id]
            if now - s["timestamp"] <= timedelta(days=30)
        ]
        
        # Check for new device/browser
        recent_user_agents = [s["user_agent"] for s in recent_sessions[-10:]]  # Last 10 sessions
        if user_agent not in recent_user_agents and len(recent_sessions) > 0:
            alerts.append({
                "type": "new_device_login",
                "severity": "medium",
                "description": "Login from new device/browser",
                "new_user_agent": user_agent
            })
        
        # Check for new IP/location
        recent_ips = [s["ip_address"] for s in recent_sessions[-5:]]  # Last 5 sessions
        if ip_address not in recent_ips and len(recent_sessions) > 0:
            alerts.append({
                "type": "new_location_login",
                "severity": "medium",
                "description": "Login from new IP address",
                "new_ip": ip_address
            })
        
        # Check for impossible travel (if we had geolocation)
        # This would require IP geolocation service integration
        
        # Check for session timing anomalies
        if recent_sessions:
            # Unusual login times
            current_hour = now.hour
            typical_hours = [s["timestamp"].hour for s in recent_sessions[-20:]]
            if typical_hours and abs(current_hour - sum(typical_hours) / len(typical_hours)) > 6:
                alerts.append({
                    "type": "unusual_login_time",
                    "severity": "low",
                    "description": f"Login at unusual time: {current_hour}:00",
                    "typical_hours": list(set(typical_hours))
                })
        
        # Record this session
        session_info = {
            "timestamp": now,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "duration": session_duration
        }
        self.user_sessions[user_id].append(session_info)
        
        # Keep only recent sessions (last 50)
        self.user_sessions[user_id] = self.user_sessions[user_id][-50:]
        
        return {
            "is_suspicious": len(alerts) > 0,
            "alerts": alerts,
            "session_count": len(recent_sessions) + 1,
            "risk_score": self._calculate_risk_score(alerts)
        }
    
    def _calculate_risk_score(self, alerts: List[Dict]) -> int:
        """Calculate risk score based on alerts"""
        score = 0
        for alert in alerts:
            if alert["severity"] == "critical":
                score += 10
            elif alert["severity"] == "high":
                score += 7
            elif alert["severity"] == "medium":
                score += 4
            elif alert["severity"] == "low":
                score += 2
        return min(score, 100)  # Cap at 100

class AuthMonitoringService:
    """Main authentication monitoring service"""
    
    def __init__(self):
        self.events_buffer = deque(maxlen=10000)  # Keep last 10k events
        self.metrics = AuthMetrics()
        self.brute_force_detector = BruteForceDetector()
        self.token_monitor = TokenSecurityMonitor()
        self.session_detector = SessionAnomalyDetector()
        
        # Performance tracking
        self.response_times = deque(maxlen=1000)  # Last 1000 response times
        self.error_count = 0
        self.total_requests = 0
        
        # Health status
        self.last_health_check = datetime.utcnow()
        self.is_healthy = True
        self.health_issues = []
        
        # Start background tasks
        self._start_background_tasks()
    
    def record_auth_event(self, event: SecurityEvent) -> Dict[str, Any]:
        """Record authentication event and perform real-time analysis"""
        # Add to events buffer
        self.events_buffer.append(event)
        
        # Update metrics
        self._update_metrics(event)
        
        # Perform security analysis
        analysis_results = self._analyze_event(event)
        
        # Log the event
        self._log_event(event, analysis_results)
        
        # Check for immediate alerts
        if analysis_results.get("requires_alert", False):
            self._send_alert(event, analysis_results)
        
        return analysis_results
    
    def _analyze_event(self, event: SecurityEvent) -> Dict[str, Any]:
        """Analyze event for security implications"""
        analysis = {
            "risk_score": 0,
            "alerts": [],
            "requires_alert": False,
            "recommended_actions": []
        }
        
        # Analyze based on event type
        if event.event_type == "login_failed":
            brute_force_analysis = self.brute_force_detector.record_failed_attempt(
                event.ip_address or "unknown", 
                event.email
            )
            analysis["alerts"].extend(brute_force_analysis["alerts"])
            analysis["risk_score"] += 3
            
            if brute_force_analysis["is_suspicious"]:
                analysis["requires_alert"] = True
                analysis["recommended_actions"].append("Consider IP blocking")
        
        elif event.event_type == "login_success":
            # Check for session anomalies
            if event.user_id and event.ip_address and event.user_agent:
                session_analysis = self.session_detector.analyze_session(
                    event.user_id, 
                    event.ip_address, 
                    event.user_agent
                )
                analysis["alerts"].extend(session_analysis["alerts"])
                analysis["risk_score"] += session_analysis["risk_score"] // 10
        
        elif event.event_type == "token_used":
            if event.metadata and "token" in event.metadata:
                token_analysis = self.token_monitor.record_token_usage(
                    event.metadata["token"],
                    event.user_id or "unknown",
                    event.ip_address or "unknown",
                    event.user_agent or "unknown"
                )
                analysis["alerts"].extend(token_analysis["alerts"])
                if token_analysis["is_suspicious"]:
                    analysis["requires_alert"] = True
                    analysis["recommended_actions"].append("Investigate token usage")
        
        # Add general risk factors
        if event.severity in ["high", "critical"]:
            analysis["risk_score"] += 5
            analysis["requires_alert"] = True
        
        # Check for blacklisted IPs
        if event.ip_address and self.brute_force_detector.is_ip_blacklisted(event.ip_address):
            analysis["alerts"].append({
                "type": "blacklisted_ip_access",
                "severity": "critical",
                "description": f"Access attempt from blacklisted IP {event.ip_address}"
            })
            analysis["requires_alert"] = True
            analysis["recommended_actions"].append("Block IP immediately")
        
        return analysis
    
    def _update_metrics(self, event: SecurityEvent):
        """Update authentication metrics"""
        if event.event_type == "login_success":
            self.metrics.successful_logins += 1
        elif event.event_type == "login_failed":
            self.metrics.failed_logins += 1
        elif event.event_type == "mfa_verified":
            self.metrics.mfa_verifications += 1
        elif event.event_type == "token_refreshed":
            self.metrics.token_refreshes += 1
        elif event.event_type == "password_reset":
            self.metrics.password_resets += 1
        elif event.event_type == "account_locked":
            self.metrics.account_lockouts += 1
        elif "suspicious" in event.event_type:
            self.metrics.suspicious_activities += 1
        
        # Track errors
        self.total_requests += 1
        if event.event_type.endswith("_failed") or event.event_type.endswith("_error"):
            self.error_count += 1
            self.metrics.error_rate = (self.error_count / self.total_requests) * 100
    
    def _log_event(self, event: SecurityEvent, analysis: Dict[str, Any]):
        """Log security event with analysis"""
        log_data = {
            "event": asdict(event),
            "analysis": analysis,
            "timestamp": event.timestamp.isoformat()
        }
        
        # Use appropriate log level based on severity
        if event.severity == "critical":
            logger.critical(f"CRITICAL AUTH EVENT: {json.dumps(log_data)}")
        elif event.severity == "high":
            logger.error(f"HIGH SEVERITY AUTH EVENT: {json.dumps(log_data)}")
        elif event.severity == "medium":
            logger.warning(f"MEDIUM SEVERITY AUTH EVENT: {json.dumps(log_data)}")
        else:
            logger.info(f"AUTH EVENT: {json.dumps(log_data)}")
    
    def _send_alert(self, event: SecurityEvent, analysis: Dict[str, Any]):
        """Send alert for critical security events"""
        alert_data = {
            "title": f"🚨 Authentication Security Alert",
            "event_type": event.event_type,
            "severity": event.severity,
            "description": event.description,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "timestamp": event.timestamp.isoformat(),
            "risk_score": analysis["risk_score"],
            "alerts": analysis["alerts"],
            "recommended_actions": analysis["recommended_actions"]
        }
        
        # Here you would integrate with your alerting system
        # Examples: Slack webhook, PagerDuty, email, SMS
        self._send_webhook_alert(alert_data)
    
    def _send_webhook_alert(self, alert_data: Dict[str, Any]):
        """Send webhook alert (implement based on your alerting system)"""
        webhook_url = os.getenv("SECURITY_ALERT_WEBHOOK")
        if not webhook_url:
            logger.warning("No webhook URL configured for security alerts")
            return
        
        try:
            import requests
            response = requests.post(
                webhook_url,
                json={
                    "text": f"🚨 {alert_data['title']}",
                    "attachments": [{
                        "color": "danger" if alert_data["severity"] in ["high", "critical"] else "warning",
                        "fields": [
                            {"title": "Event Type", "value": alert_data["event_type"], "short": True},
                            {"title": "Severity", "value": alert_data["severity"], "short": True},
                            {"title": "Risk Score", "value": str(alert_data["risk_score"]), "short": True},
                            {"title": "IP Address", "value": alert_data["ip_address"] or "Unknown", "short": True},
                            {"title": "Description", "value": alert_data["description"], "short": False},
                            {"title": "Actions", "value": "\n".join(alert_data["recommended_actions"]), "short": False}
                        ],
                        "timestamp": alert_data["timestamp"]
                    }]
                },
                timeout=10
            )
            logger.info(f"Alert sent successfully: {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {str(e)}")
    
    def record_performance_metric(self, response_time_ms: float):
        """Record authentication endpoint performance"""
        self.response_times.append(response_time_ms)
        if self.response_times:
            self.metrics.avg_response_time_ms = sum(self.response_times) / len(self.response_times)
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get current health status of authentication system"""
        now = datetime.utcnow()
        
        # Calculate various health metrics
        recent_events = [
            e for e in self.events_buffer 
            if now - e.timestamp <= timedelta(minutes=5)
        ]
        
        recent_errors = [
            e for e in recent_events 
            if e.event_type.endswith("_failed") or e.event_type.endswith("_error")
        ]
        
        error_rate_5min = (len(recent_errors) / max(len(recent_events), 1)) * 100
        
        # Check health conditions
        health_issues = []
        is_healthy = True
        
        if error_rate_5min > 10:  # >10% error rate in last 5 minutes
            health_issues.append("High error rate detected")
            is_healthy = False
        
        if self.metrics.avg_response_time_ms > 5000:  # >5 second average response time
            health_issues.append("High response time detected")
            is_healthy = False
        
        if len([e for e in recent_events if e.severity == "critical"]) > 0:
            health_issues.append("Critical security events detected")
            is_healthy = False
        
        # Check if monitoring is running
        if now - self.last_health_check > timedelta(minutes=10):
            health_issues.append("Health check overdue")
            is_healthy = False
        
        return {
            "is_healthy": is_healthy,
            "status": "healthy" if is_healthy else "degraded",
            "health_issues": health_issues,
            "last_check": now.isoformat(),
            "metrics": {
                "total_events_5min": len(recent_events),
                "error_rate_5min": round(error_rate_5min, 2),
                "avg_response_time_ms": round(self.metrics.avg_response_time_ms, 2),
                "critical_events_5min": len([e for e in recent_events if e.severity == "critical"]),
                "active_tokens": sum(len(tokens) for tokens in self.token_monitor.user_tokens.values()),
                "blacklisted_ips": len(self.brute_force_detector.blacklisted_ips)
            },
            "uptime_checks": {
                "brute_force_detector": self.brute_force_detector is not None,
                "token_monitor": self.token_monitor is not None,
                "session_detector": self.session_detector is not None,
                "events_buffer": len(self.events_buffer) < 10000  # Not full
            }
        }
    
    def get_security_metrics(self, timeframe_hours: int = 24) -> Dict[str, Any]:
        """Get security metrics for specified timeframe"""
        cutoff = datetime.utcnow() - timedelta(hours=timeframe_hours)
        recent_events = [e for e in self.events_buffer if e.timestamp >= cutoff]
        
        # Count events by type
        event_counts = defaultdict(int)
        severity_counts = defaultdict(int)
        
        for event in recent_events:
            event_counts[event.event_type] += 1
            severity_counts[event.severity] += 1
        
        # Top IPs by activity
        ip_activity = defaultdict(int)
        for event in recent_events:
            if event.ip_address:
                ip_activity[event.ip_address] += 1
        
        top_ips = sorted(ip_activity.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # User activity
        user_activity = defaultdict(int)
        for event in recent_events:
            if event.user_id:
                user_activity[event.user_id] += 1
        
        return {
            "timeframe_hours": timeframe_hours,
            "total_events": len(recent_events),
            "event_breakdown": dict(event_counts),
            "severity_breakdown": dict(severity_counts),
            "top_active_ips": top_ips,
            "unique_users": len(user_activity),
            "metrics": asdict(self.metrics),
            "security_stats": {
                "brute_force_attempts": len([e for e in recent_events if "brute_force" in e.event_type]),
                "suspicious_logins": len([e for e in recent_events if "suspicious" in e.event_type]),
                "token_anomalies": len([e for e in recent_events if "token" in e.event_type and e.severity in ["high", "critical"]]),
                "new_device_logins": len([e for e in recent_events if e.event_type == "new_device_login"]),
                "blacklisted_ip_attempts": len(self.brute_force_detector.blacklisted_ips)
            }
        }
    
    def _start_background_tasks(self):
        """Start background monitoring tasks"""
        def background_cleanup():
            while True:
                try:
                    # Cleanup old data
                    self.brute_force_detector.cleanup_old_attempts()
                    
                    # Update health check timestamp
                    self.last_health_check = datetime.utcnow()
                    
                    # Sleep for 5 minutes
                    time.sleep(300)
                except Exception as e:
                    logger.error(f"Background cleanup error: {str(e)}")
                    time.sleep(300)
        
        import threading
        cleanup_thread = threading.Thread(target=background_cleanup, daemon=True)
        cleanup_thread.start()

# Global instance
auth_monitoring_service = AuthMonitoringService()

def get_auth_monitoring_service() -> AuthMonitoringService:
    """Get the global auth monitoring service instance"""
    return auth_monitoring_service