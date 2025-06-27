"""
Security administration API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from config.database import get_db
from models.user import User
from api.v1.auth import get_current_user
from services.security_monitoring_enhanced import get_security_monitor, SecurityEvent
from utils.secure_logging import get_secure_logger, log_security_event
from utils.rbac import rbac, Permission


router = APIRouter()
logger = get_secure_logger("security.admin")


# Pydantic models
class SecurityDashboardResponse(BaseModel):
    """Security dashboard data response"""

    summary: Dict[str, int]
    event_types: Dict[str, int]
    severities: Dict[str, int]
    top_suspicious_ips: List[tuple]
    recent_critical_events: List[Dict[str, Any]]
    timestamp: str


class SecurityEventResponse(BaseModel):
    """Security event response"""

    event_type: str
    severity: str
    description: str
    user_id: Optional[int]
    ip_address: Optional[str]
    endpoint: Optional[str]
    user_agent: Optional[str]
    timestamp: str
    risk_score: int


class IPBlockRequest(BaseModel):
    """IP blocking request"""

    ip_address: str
    duration_hours: int = 1
    reason: str


class SecurityConfigUpdate(BaseModel):
    """Security configuration update"""

    alert_thresholds: Optional[Dict[str, int]] = None
    enable_auto_blocking: Optional[bool] = None
    rate_limit_strict_mode: Optional[bool] = None


@router.get("/dashboard", response_model=SecurityDashboardResponse)
async def get_security_dashboard(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get security monitoring dashboard data"""

    # Check permissions
    if not rbac.check_permission(current_user, Permission.ADMIN_SECURITY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for security dashboard",
        )

    try:
        security_monitor = get_security_monitor(db)
        dashboard_data = security_monitor.get_security_dashboard_data()

        # Log access to security dashboard
        log_security_event(
            event_type="SECURITY_DASHBOARD_ACCESS",
            description=f"User {current_user.id} accessed security dashboard",
            user_id=current_user.id,
            severity="INFO",
        )

        return SecurityDashboardResponse(**dashboard_data)

    except Exception as e:
        logger.error(f"Error retrieving security dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving security dashboard",
        )


@router.get("/events", response_model=List[SecurityEventResponse])
async def get_security_events(
    hours: int = Query(24, ge=1, le=168, description="Hours to look back"),
    severity: Optional[str] = Query(None, pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$"),
    event_type: Optional[str] = Query(None),
    ip_address: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get security events with filtering"""

    # Check permissions
    if not rbac.check_permission(current_user, Permission.ADMIN_SECURITY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view security events",
        )

    try:
        security_monitor = get_security_monitor(db)

        # Filter events
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        filtered_events = []

        for event in security_monitor.recent_events:
            if event.timestamp < cutoff_time:
                continue

            if severity and event.severity != severity:
                continue

            if event_type and event.event_type != event_type:
                continue

            if ip_address and event.ip_address != ip_address:
                continue

            filtered_events.append(
                SecurityEventResponse(
                    event_type=event.event_type,
                    severity=event.severity,
                    description=event.description,
                    user_id=event.user_id,
                    ip_address=event.ip_address,
                    endpoint=event.endpoint,
                    user_agent=event.user_agent,
                    timestamp=event.timestamp.isoformat(),
                    risk_score=event.risk_score,
                )
            )

            if len(filtered_events) >= limit:
                break

        # Sort by timestamp (newest first)
        filtered_events.sort(key=lambda x: x.timestamp, reverse=True)

        return filtered_events

    except Exception as e:
        logger.error(f"Error retrieving security events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving security events",
        )


@router.get("/ip-analysis/{ip_address}")
async def analyze_ip_address(
    ip_address: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyze specific IP address for security threats"""

    # Check permissions
    if not rbac.check_permission(current_user, Permission.ADMIN_SECURITY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for IP analysis",
        )

    try:
        security_monitor = get_security_monitor(db)

        # Get IP risk score
        risk_score = security_monitor.threat_detector.get_ip_risk_score(ip_address)

        # Get events for this IP
        ip_events = [
            {
                "event_type": event.event_type,
                "severity": event.severity,
                "description": event.description,
                "timestamp": event.timestamp.isoformat(),
                "endpoint": event.endpoint,
            }
            for event in security_monitor.recent_events
            if event.ip_address == ip_address
        ]

        # Get session data
        session_data = security_monitor.threat_detector.user_sessions.get(
            ip_address, {}
        )

        # Convert sets to lists for JSON serialization
        if "endpoints" in session_data:
            session_data["endpoints"] = list(session_data["endpoints"])
        if "user_ids" in session_data:
            session_data["user_ids"] = list(session_data["user_ids"])

        # Convert datetime objects
        if "first_seen" in session_data:
            session_data["first_seen"] = session_data["first_seen"].isoformat()
        if "last_seen" in session_data:
            session_data["last_seen"] = session_data["last_seen"].isoformat()

        analysis = {
            "ip_address": ip_address,
            "risk_score": risk_score,
            "threat_level": (
                "HIGH" if risk_score > 70 else "MEDIUM" if risk_score > 40 else "LOW"
            ),
            "total_events": len(ip_events),
            "recent_events": ip_events[-20:],  # Last 20 events
            "session_data": session_data,
            "analysis_timestamp": datetime.utcnow().isoformat(),
        }

        # Log IP analysis
        log_security_event(
            event_type="IP_ANALYSIS_PERFORMED",
            description=f"IP analysis performed for {ip_address} by user {current_user.id}",
            user_id=current_user.id,
            ip_address=ip_address,
            additional_data={"risk_score": risk_score},
            severity="INFO",
        )

        return analysis

    except Exception as e:
        logger.error(f"Error analyzing IP {ip_address}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error performing IP analysis",
        )


@router.post("/block-ip")
async def block_ip_address(
    block_request: IPBlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Block an IP address (placeholder for firewall integration)"""

    # Check permissions
    if not rbac.check_permission(current_user, Permission.ADMIN_SECURITY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to block IP addresses",
        )

    try:
        # In production, this would integrate with firewall/load balancer
        # For now, we'll log the action and store it for manual implementation

        # Log the IP blocking action
        log_security_event(
            event_type="IP_BLOCK_REQUESTED",
            description=f"IP block requested for {block_request.ip_address}: {block_request.reason}",
            user_id=current_user.id,
            ip_address=block_request.ip_address,
            additional_data={
                "duration_hours": block_request.duration_hours,
                "reason": block_request.reason,
            },
            severity="HIGH",
        )

        # TODO: Integrate with actual firewall/security service
        # Example integrations:
        # - Cloudflare API
        # - AWS WAF
        # - nginx/Apache rules
        # - iptables commands

        return {
            "message": f"IP block request submitted for {block_request.ip_address}",
            "ip_address": block_request.ip_address,
            "duration_hours": block_request.duration_hours,
            "reason": block_request.reason,
            "status": "pending_manual_implementation",
            "requested_by": current_user.id,
            "requested_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error blocking IP {block_request.ip_address}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing IP block request",
        )


@router.get("/threat-intelligence")
async def get_threat_intelligence(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get threat intelligence summary"""

    # Check permissions
    if not rbac.check_permission(current_user, Permission.ADMIN_SECURITY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for threat intelligence",
        )

    try:
        security_monitor = get_security_monitor(db)

        # Calculate threat metrics
        current_time = datetime.utcnow()
        last_24h = current_time - timedelta(hours=24)
        last_7d = current_time - timedelta(days=7)

        # Count events by time period
        events_24h = sum(
            1 for e in security_monitor.recent_events if e.timestamp >= last_24h
        )
        events_7d = sum(
            1 for e in security_monitor.recent_events if e.timestamp >= last_7d
        )

        # Count by severity
        critical_24h = sum(
            1
            for e in security_monitor.recent_events
            if e.timestamp >= last_24h and e.severity == "CRITICAL"
        )
        high_24h = sum(
            1
            for e in security_monitor.recent_events
            if e.timestamp >= last_24h and e.severity == "HIGH"
        )

        # Top attack types
        attack_types = {}
        for event in security_monitor.recent_events:
            if event.timestamp >= last_24h:
                attack_types[event.event_type] = (
                    attack_types.get(event.event_type, 0) + 1
                )

        top_attacks = sorted(attack_types.items(), key=lambda x: x[1], reverse=True)[
            :10
        ]

        # Geographic distribution (placeholder)
        # In production, integrate with IP geolocation service
        geographic_threats = {
            "top_countries": [
                {"country": "Unknown", "count": events_24h, "risk_level": "MEDIUM"}
            ]
        }

        intelligence = {
            "summary": {
                "total_threats_24h": events_24h,
                "total_threats_7d": events_7d,
                "critical_threats_24h": critical_24h,
                "high_threats_24h": high_24h,
                "threat_trend": (
                    "increasing" if events_24h > events_7d / 7 else "stable"
                ),
            },
            "top_attack_types": top_attacks,
            "geographic_distribution": geographic_threats,
            "threat_indicators": {
                "sql_injection_attempts": sum(
                    1
                    for event in security_monitor.recent_events
                    if "SQL_INJECTION" in event.event_type
                    and event.timestamp >= last_24h
                ),
                "xss_attempts": sum(
                    1
                    for event in security_monitor.recent_events
                    if "XSS" in event.event_type and event.timestamp >= last_24h
                ),
                "brute_force_attempts": sum(
                    1
                    for event in security_monitor.recent_events
                    if "BRUTE_FORCE" in event.event_type and event.timestamp >= last_24h
                ),
            },
            "generated_at": current_time.isoformat(),
        }

        return intelligence

    except Exception as e:
        logger.error(f"Error generating threat intelligence: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating threat intelligence",
        )


@router.post("/export-security-report")
async def export_security_report(
    days: int = Query(7, ge=1, le=30),
    format: str = Query("json", pattern="^(json|csv)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export security report"""

    # Check permissions
    if not rbac.check_permission(current_user, Permission.ADMIN_SECURITY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to export security reports",
        )

    try:
        security_monitor = get_security_monitor(db)

        # Get events for the specified period
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        events_data = []

        for event in security_monitor.recent_events:
            if event.timestamp >= cutoff_time:
                events_data.append(
                    {
                        "timestamp": event.timestamp.isoformat(),
                        "event_type": event.event_type,
                        "severity": event.severity,
                        "description": event.description,
                        "ip_address": event.ip_address,
                        "endpoint": event.endpoint,
                        "user_id": event.user_id,
                        "risk_score": event.risk_score,
                    }
                )

        # Log export action
        log_security_event(
            event_type="SECURITY_REPORT_EXPORTED",
            description=f"Security report exported by user {current_user.id} ({len(events_data)} events, {days} days)",
            user_id=current_user.id,
            severity="INFO",
        )

        if format == "csv":
            # Convert to CSV format
            import csv
            import io

            output = io.StringIO()
            if events_data:
                writer = csv.DictWriter(output, fieldnames=events_data[0].keys())
                writer.writeheader()
                writer.writerows(events_data)

            return {
                "format": "csv",
                "data": output.getvalue(),
                "event_count": len(events_data),
                "period_days": days,
                "exported_at": datetime.utcnow().isoformat(),
            }
        else:
            # Return JSON format
            return {
                "format": "json",
                "events": events_data,
                "event_count": len(events_data),
                "period_days": days,
                "exported_at": datetime.utcnow().isoformat(),
            }

    except Exception as e:
        logger.error(f"Error exporting security report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error exporting security report",
        )


@router.get("/health")
async def security_system_health(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get security system health status"""

    # Check permissions
    if not rbac.check_permission(current_user, Permission.ADMIN_SECURITY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for security system health",
        )

    try:
        security_monitor = get_security_monitor(db)

        # Check system health
        health_status = {
            "security_monitoring": "healthy",
            "threat_detection": "healthy",
            "rate_limiting": "healthy",
            "authentication": "healthy",
            "data_protection": "healthy",
            "overall_status": "healthy",
            "last_check": datetime.utcnow().isoformat(),
        }

        # Check if we're getting too many critical events
        current_time = datetime.utcnow()
        last_hour = current_time - timedelta(hours=1)
        critical_events = sum(
            1
            for e in security_monitor.recent_events
            if e.timestamp >= last_hour and e.severity == "CRITICAL"
        )

        if critical_events > 10:
            health_status["threat_detection"] = "warning"
            health_status["overall_status"] = "warning"
            health_status["warnings"] = [
                f"High number of critical security events: {critical_events} in last hour"
            ]

        return health_status

    except Exception as e:
        logger.error(f"Error checking security system health: {str(e)}")
        return {
            "overall_status": "error",
            "error": "Unable to check security system health",
            "last_check": datetime.utcnow().isoformat(),
        }
