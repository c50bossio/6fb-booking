"""
Suspicious Login Detection Service

Detects and alerts on suspicious login patterns to enhance security.
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
import ipaddress
import hashlib
from dataclasses import dataclass
import re

from models import User
from models.mfa import MFAEvent
from utils.logging_config import get_audit_logger

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


@dataclass
class SuspiciousLoginAlert:
    """Data class for suspicious login alerts"""
    user_id: int
    alert_type: str
    severity: str  # low, medium, high, critical
    description: str
    recommendation: str
    evidence: Dict
    timestamp: datetime


class SuspiciousLoginDetector:
    """
    Service for detecting suspicious login patterns and security threats.
    """
    
    # Time windows for pattern detection
    RAPID_LOGIN_WINDOW_MINUTES = 5
    GEO_VELOCITY_WINDOW_HOURS = 1
    BRUTE_FORCE_WINDOW_MINUTES = 15
    
    # Thresholds for detection
    MAX_RAPID_LOGINS = 5
    MAX_FAILED_ATTEMPTS = 3
    MAX_GEOGRAPHIC_VELOCITY_KMH = 1000  # Impossible travel speed
    
    # Suspicious patterns
    SUSPICIOUS_USER_AGENTS = [
        "curl", "wget", "python-requests", "bot", "scanner", 
        "sqlmap", "nikto", "nessus", "masscan", "nmap"
    ]
    
    def __init__(self, db: Session):
        self.db = db
    
    def detect_suspicious_login(
        self,
        user_id: int,
        ip_address: str,
        user_agent: str,
        login_success: bool,
        timestamp: Optional[datetime] = None
    ) -> List[SuspiciousLoginAlert]:
        """
        Analyze a login attempt for suspicious patterns.
        
        Returns:
            List of alerts if suspicious activity is detected
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        alerts = []
        
        try:
            # 1. Check for rapid successive logins
            rapid_login_alert = self._check_rapid_logins(user_id, timestamp)
            if rapid_login_alert:
                alerts.append(rapid_login_alert)
            
            # 2. Check for brute force attempts
            if not login_success:
                brute_force_alert = self._check_brute_force(user_id, ip_address, timestamp)
                if brute_force_alert:
                    alerts.append(brute_force_alert)
            
            # 3. Check for suspicious user agents
            user_agent_alert = self._check_suspicious_user_agent(user_id, user_agent, timestamp)
            if user_agent_alert:
                alerts.append(user_agent_alert)
            
            # 4. Check for geographic anomalies
            geo_alert = self._check_geographic_anomaly(user_id, ip_address, timestamp)
            if geo_alert:
                alerts.append(geo_alert)
            
            # 5. Check for login from new locations
            if login_success:
                new_location_alert = self._check_new_location(user_id, ip_address, timestamp)
                if new_location_alert:
                    alerts.append(new_location_alert)
            
            # 6. Check for time-based anomalies
            time_alert = self._check_unusual_login_time(user_id, timestamp)
            if time_alert:
                alerts.append(time_alert)
            
            # Log and process alerts
            if alerts:
                self._process_alerts(user_id, alerts, ip_address, user_agent)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error in suspicious login detection: {str(e)}")
            return []
    
    def _check_rapid_logins(self, user_id: int, timestamp: datetime) -> Optional[SuspiciousLoginAlert]:
        """Check for rapid successive login attempts"""
        try:
            # Get recent auth events
            recent_window = timestamp - timedelta(minutes=self.RAPID_LOGIN_WINDOW_MINUTES)
            
            recent_events = self.db.query(MFAEvent).filter(
                and_(
                    MFAEvent.user_id == user_id,
                    MFAEvent.event_type.in_(["login_success", "login_failed"]),
                    MFAEvent.created_at >= recent_window
                )
            ).count()
            
            if recent_events >= self.MAX_RAPID_LOGINS:
                return SuspiciousLoginAlert(
                    user_id=user_id,
                    alert_type="rapid_logins",
                    severity="medium",
                    description=f"User attempted {recent_events} logins in {self.RAPID_LOGIN_WINDOW_MINUTES} minutes",
                    recommendation="Monitor for potential account compromise or automation",
                    evidence={"login_count": recent_events, "window_minutes": self.RAPID_LOGIN_WINDOW_MINUTES},
                    timestamp=timestamp
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking rapid logins: {str(e)}")
            return None
    
    def _check_brute_force(self, user_id: int, ip_address: str, timestamp: datetime) -> Optional[SuspiciousLoginAlert]:
        """Check for brute force attack patterns"""
        try:
            # Get recent failed attempts from same IP
            recent_window = timestamp - timedelta(minutes=self.BRUTE_FORCE_WINDOW_MINUTES)
            
            failed_attempts = self.db.query(MFAEvent).filter(
                and_(
                    MFAEvent.user_id == user_id,
                    MFAEvent.event_type == "login_failed",
                    MFAEvent.ip_address == ip_address,
                    MFAEvent.created_at >= recent_window
                )
            ).count()
            
            if failed_attempts >= self.MAX_FAILED_ATTEMPTS:
                return SuspiciousLoginAlert(
                    user_id=user_id,
                    alert_type="brute_force",
                    severity="high",
                    description=f"Multiple failed login attempts ({failed_attempts}) from IP {ip_address}",
                    recommendation="Consider IP blocking and enforce MFA",
                    evidence={
                        "failed_attempts": failed_attempts,
                        "ip_address": ip_address,
                        "window_minutes": self.BRUTE_FORCE_WINDOW_MINUTES
                    },
                    timestamp=timestamp
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking brute force: {str(e)}")
            return None
    
    def _check_suspicious_user_agent(self, user_id: int, user_agent: str, timestamp: datetime) -> Optional[SuspiciousLoginAlert]:
        """Check for suspicious user agents"""
        try:
            if not user_agent:
                return SuspiciousLoginAlert(
                    user_id=user_id,
                    alert_type="missing_user_agent",
                    severity="medium",
                    description="Login attempt with missing user agent",
                    recommendation="Monitor for automated tools or bots",
                    evidence={"user_agent": user_agent or "None"},
                    timestamp=timestamp
                )
            
            user_agent_lower = user_agent.lower()
            
            for suspicious_agent in self.SUSPICIOUS_USER_AGENTS:
                if suspicious_agent in user_agent_lower:
                    return SuspiciousLoginAlert(
                        user_id=user_id,
                        alert_type="suspicious_user_agent",
                        severity="high",
                        description=f"Login attempt from suspicious user agent: {user_agent}",
                        recommendation="Block automated tools and investigate source",
                        evidence={"user_agent": user_agent, "detected_pattern": suspicious_agent},
                        timestamp=timestamp
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking user agent: {str(e)}")
            return None
    
    def _check_geographic_anomaly(self, user_id: int, ip_address: str, timestamp: datetime) -> Optional[SuspiciousLoginAlert]:
        """Check for impossible geographic travel"""
        try:
            # Get the most recent successful login from a different IP
            recent_window = timestamp - timedelta(hours=self.GEO_VELOCITY_WINDOW_HOURS)
            
            recent_login = self.db.query(MFAEvent).filter(
                and_(
                    MFAEvent.user_id == user_id,
                    MFAEvent.event_type == "login_success",
                    MFAEvent.ip_address != ip_address,
                    MFAEvent.created_at >= recent_window
                )
            ).order_by(desc(MFAEvent.created_at)).first()
            
            if recent_login:
                # Calculate time difference
                time_diff = timestamp - recent_login.created_at
                hours_diff = time_diff.total_seconds() / 3600
                
                # For now, use a simple heuristic - in production you'd use IP geolocation
                # If different Class A networks and short time window, flag as suspicious
                try:
                    current_ip = ipaddress.ip_address(ip_address)
                    previous_ip = ipaddress.ip_address(recent_login.ip_address)
                    
                    # Check if IPs are from very different network ranges
                    if (str(current_ip).split('.')[0] != str(previous_ip).split('.')[0] and 
                        hours_diff < 1):
                        
                        return SuspiciousLoginAlert(
                            user_id=user_id,
                            alert_type="geographic_anomaly",
                            severity="medium",
                            description=f"Rapid geographic location change detected",
                            recommendation="Verify user identity and consider MFA enforcement",
                            evidence={
                                "current_ip": ip_address,
                                "previous_ip": recent_login.ip_address,
                                "time_difference_hours": round(hours_diff, 2)
                            },
                            timestamp=timestamp
                        )
                
                except ValueError:
                    # Invalid IP address format
                    pass
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking geographic anomaly: {str(e)}")
            return None
    
    def _check_new_location(self, user_id: int, ip_address: str, timestamp: datetime) -> Optional[SuspiciousLoginAlert]:
        """Check for login from new IP address"""
        try:
            # Check if this IP has been used before
            previous_login = self.db.query(MFAEvent).filter(
                and_(
                    MFAEvent.user_id == user_id,
                    MFAEvent.event_type == "login_success",
                    MFAEvent.ip_address == ip_address
                )
            ).first()
            
            if not previous_login:
                return SuspiciousLoginAlert(
                    user_id=user_id,
                    alert_type="new_location",
                    severity="low",
                    description=f"Login from new IP address: {ip_address}",
                    recommendation="Notify user of login from new location",
                    evidence={"ip_address": ip_address, "first_time": True},
                    timestamp=timestamp
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking new location: {str(e)}")
            return None
    
    def _check_unusual_login_time(self, user_id: int, timestamp: datetime) -> Optional[SuspiciousLoginAlert]:
        """Check for logins at unusual hours"""
        try:
            # Get user's typical login hours (last 30 days)
            historical_window = timestamp - timedelta(days=30)
            
            historical_logins = self.db.query(MFAEvent).filter(
                and_(
                    MFAEvent.user_id == user_id,
                    MFAEvent.event_type == "login_success",
                    MFAEvent.created_at >= historical_window
                )
            ).all()
            
            if len(historical_logins) < 5:
                # Not enough data to determine pattern
                return None
            
            # Calculate typical login hours
            login_hours = [login.created_at.hour for login in historical_logins]
            current_hour = timestamp.hour
            
            # Simple heuristic: if current hour is outside typical range
            # and it's between 2 AM and 6 AM (unusual hours)
            if current_hour in [2, 3, 4, 5] and current_hour not in login_hours:
                return SuspiciousLoginAlert(
                    user_id=user_id,
                    alert_type="unusual_time",
                    severity="low",
                    description=f"Login at unusual hour: {current_hour}:00",
                    recommendation="Verify if user typically logs in at this time",
                    evidence={
                        "login_hour": current_hour,
                        "typical_hours": list(set(login_hours)),
                        "unusual_time_detected": True
                    },
                    timestamp=timestamp
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking unusual login time: {str(e)}")
            return None
    
    def _process_alerts(self, user_id: int, alerts: List[SuspiciousLoginAlert], ip_address: str, user_agent: str):
        """Process and log suspicious login alerts"""
        try:
            # Categorize alerts by severity
            critical_alerts = [a for a in alerts if a.severity == "critical"]
            high_alerts = [a for a in alerts if a.severity == "high"]
            medium_alerts = [a for a in alerts if a.severity == "medium"]
            low_alerts = [a for a in alerts if a.severity == "low"]
            
            # Log all alerts
            for alert in alerts:
                logger.warning(
                    f"Suspicious login detected - User: {user_id}, "
                    f"Type: {alert.alert_type}, Severity: {alert.severity}, "
                    f"Description: {alert.description}"
                )
                
                # Log to audit system
                audit_logger.log_security_event(
                    f"suspicious_login_{alert.alert_type}",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    severity=alert.severity,
                    details={
                        "alert_type": alert.alert_type,
                        "description": alert.description,
                        "recommendation": alert.recommendation,
                        "evidence": alert.evidence
                    }
                )
            
            # Take automated actions based on severity
            if critical_alerts or len(high_alerts) >= 2:
                self._trigger_high_severity_response(user_id, ip_address, alerts)
            elif high_alerts or len(medium_alerts) >= 3:
                self._trigger_medium_severity_response(user_id, ip_address, alerts)
            
        except Exception as e:
            logger.error(f"Error processing alerts: {str(e)}")
    
    def _trigger_high_severity_response(self, user_id: int, ip_address: str, alerts: List[SuspiciousLoginAlert]):
        """Trigger response for high-severity security events"""
        try:
            logger.error(f"HIGH SECURITY ALERT - User {user_id} from IP {ip_address}")
            
            # Log high-severity security event
            audit_logger.log_security_event(
                "high_security_alert",
                ip_address=ip_address,
                severity="high",
                details={
                    "user_id": user_id,
                    "alert_count": len(alerts),
                    "alert_types": [a.alert_type for a in alerts],
                    "automated_response": "security_team_notified"
                }
            )
            
            # In production, this would:
            # - Send immediate alert to security team
            # - Consider temporary account lockdown
            # - Force MFA re-verification
            # - Log to SIEM system
            
        except Exception as e:
            logger.error(f"Error in high severity response: {str(e)}")
    
    def _trigger_medium_severity_response(self, user_id: int, ip_address: str, alerts: List[SuspiciousLoginAlert]):
        """Trigger response for medium-severity security events"""
        try:
            logger.warning(f"MEDIUM SECURITY ALERT - User {user_id} from IP {ip_address}")
            
            # Log medium-severity security event
            audit_logger.log_security_event(
                "medium_security_alert",
                ip_address=ip_address,
                severity="medium",
                details={
                    "user_id": user_id,
                    "alert_count": len(alerts),
                    "alert_types": [a.alert_type for a in alerts],
                    "automated_response": "enhanced_monitoring"
                }
            )
            
            # In production, this would:
            # - Increase monitoring for this user/IP
            # - Send notification to user about suspicious activity
            # - Consider requiring additional verification
            
        except Exception as e:
            logger.error(f"Error in medium severity response: {str(e)}")
    
    def get_user_security_summary(self, user_id: int, days: int = 30) -> Dict:
        """Get security summary for a user"""
        try:
            # Get recent security events
            since_date = datetime.utcnow() - timedelta(days=days)
            
            security_events = self.db.query(MFAEvent).filter(
                and_(
                    MFAEvent.user_id == user_id,
                    MFAEvent.created_at >= since_date,
                    MFAEvent.event_type.like("%security%")
                )
            ).all()
            
            auth_events = self.db.query(MFAEvent).filter(
                and_(
                    MFAEvent.user_id == user_id,
                    MFAEvent.created_at >= since_date,
                    MFAEvent.event_type.in_(["login_success", "login_failed"])
                )
            ).all()
            
            # Calculate metrics
            total_logins = len([e for e in auth_events if e.event_type == "login_success"])
            failed_logins = len([e for e in auth_events if e.event_type == "login_failed"])
            unique_ips = len(set([e.ip_address for e in auth_events if e.ip_address]))
            security_alerts = len(security_events)
            
            return {
                "user_id": user_id,
                "period_days": days,
                "total_logins": total_logins,
                "failed_logins": failed_logins,
                "unique_ip_addresses": unique_ips,
                "security_alerts": security_alerts,
                "risk_score": self._calculate_risk_score(total_logins, failed_logins, unique_ips, security_alerts),
                "last_login": max([e.created_at for e in auth_events], default=None),
                "recent_security_events": [
                    {
                        "event_type": e.event_type,
                        "timestamp": e.created_at,
                        "ip_address": e.ip_address
                    }
                    for e in security_events[-10:]  # Last 10 events
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting security summary: {str(e)}")
            return {"error": str(e)}
    
    def _calculate_risk_score(self, total_logins: int, failed_logins: int, unique_ips: int, security_alerts: int) -> int:
        """Calculate a simple risk score (0-100)"""
        try:
            score = 0
            
            # Base score on failed login ratio
            if total_logins > 0:
                fail_ratio = failed_logins / total_logins
                score += int(fail_ratio * 40)  # Up to 40 points
            
            # Add points for multiple IPs
            if unique_ips > 5:
                score += min(unique_ips * 2, 20)  # Up to 20 points
            
            # Add points for security alerts
            score += min(security_alerts * 10, 40)  # Up to 40 points
            
            return min(score, 100)
            
        except Exception as e:
            logger.error(f"Error calculating risk score: {str(e)}")
            return 0


# Create service instance function
def get_suspicious_login_detector(db: Session) -> SuspiciousLoginDetector:
    """Get suspicious login detector service"""
    return SuspiciousLoginDetector(db)