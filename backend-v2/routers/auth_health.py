"""
Authentication Health Check Router
Comprehensive health monitoring for authentication system components
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, List, Any, Optional
import asyncio
import time
import os
from datetime import datetime, timedelta
import jwt
import redis

from db import get_db
from services.auth_monitoring_service import get_auth_monitoring_service, SecurityEvent
from utils.auth import get_current_admin_user
import models

router = APIRouter(
    prefix="/auth/health",
    tags=["Authentication Health"],
    dependencies=[]  # Add admin auth when needed
)

@router.get("/status", response_model=Dict[str, Any])
async def get_auth_health_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Comprehensive authentication system health check
    Monitors all auth components for security and performance
    """
    start_time = time.time()
    
    try:
        monitoring_service = get_auth_monitoring_service()
        
        # Get overall monitoring service health
        monitoring_health = monitoring_service.get_health_status()
        
        # Check individual auth components
        component_health = await _check_auth_components(db)
        
        # Check security status
        security_status = await _check_security_status(monitoring_service)
        
        # Check performance metrics
        performance_metrics = await _check_performance_metrics(monitoring_service)
        
        # Check dependencies
        dependency_health = await _check_auth_dependencies()
        
        # Calculate overall health
        all_healthy = (
            monitoring_health["is_healthy"] and
            component_health["all_healthy"] and
            security_status["security_ok"] and
            performance_metrics["performance_ok"] and
            dependency_health["dependencies_ok"]
        )
        
        response_time_ms = (time.time() - start_time) * 1000
        
        health_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": "healthy" if all_healthy else "degraded",
            "is_healthy": all_healthy,
            "response_time_ms": round(response_time_ms, 2),
            "monitoring_service": monitoring_health,
            "components": component_health,
            "security": security_status,
            "performance": performance_metrics,
            "dependencies": dependency_health,
            "uptime_info": {
                "check_time": datetime.utcnow().isoformat(),
                "system_uptime": _get_system_uptime(),
                "last_restart": _get_last_restart_time()
            }
        }
        
        # Record this health check
        monitoring_service.record_auth_event(SecurityEvent(
            event_type="health_check",
            severity="low",
            description="Authentication health check performed",
            ip_address=request.client.host if request.client else "system",
            metadata={
                "overall_status": health_data["overall_status"],
                "response_time_ms": response_time_ms,
                "components_checked": len(component_health["component_status"])
            }
        ))
        
        return health_data
        
    except Exception as e:
        # Record health check failure
        monitoring_service = get_auth_monitoring_service()
        monitoring_service.record_auth_event(SecurityEvent(
            event_type="health_check_failed",
            severity="high",
            description=f"Authentication health check failed: {str(e)}",
            ip_address=request.client.host if request.client else "system",
            metadata={"error": str(e)}
        ))
        
        raise HTTPException(
            status_code=500, 
            detail=f"Health check failed: {str(e)}"
        )

@router.get("/components", response_model=Dict[str, Any])
async def get_component_health(db: Session = Depends(get_db)):
    """Get detailed health status of individual auth components"""
    
    component_health = await _check_auth_components(db)
    
    # Add detailed component diagnostics
    diagnostics = await _run_component_diagnostics(db)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "components": component_health,
        "diagnostics": diagnostics
    }

@router.get("/security", response_model=Dict[str, Any])
async def get_security_status():
    """Get detailed security monitoring status"""
    
    monitoring_service = get_auth_monitoring_service()
    
    # Get security metrics for last 24 hours
    security_metrics = monitoring_service.get_security_metrics(24)
    
    # Get current security status
    security_status = await _check_security_status(monitoring_service)
    
    # Add threat assessment
    threat_assessment = _assess_current_threats(monitoring_service)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "security_status": security_status,
        "metrics_24h": security_metrics,
        "threat_assessment": threat_assessment,
        "recommendations": _get_security_recommendations(security_metrics, threat_assessment)
    }

@router.get("/performance", response_model=Dict[str, Any])
async def get_performance_metrics():
    """Get detailed authentication performance metrics"""
    
    monitoring_service = get_auth_monitoring_service()
    
    performance_metrics = await _check_performance_metrics(monitoring_service)
    
    # Add detailed performance analysis
    performance_analysis = await _analyze_performance_trends(monitoring_service)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "current_metrics": performance_metrics,
        "trend_analysis": performance_analysis,
        "performance_recommendations": _get_performance_recommendations(performance_metrics)
    }

@router.get("/dependencies", response_model=Dict[str, Any])
async def get_dependency_health():
    """Check health of authentication system dependencies"""
    
    dependency_health = await _check_auth_dependencies()
    
    # Add detailed dependency analysis
    dependency_analysis = await _analyze_dependency_issues(dependency_health)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": dependency_health,
        "analysis": dependency_analysis,
        "recommendations": _get_dependency_recommendations(dependency_health)
    }

@router.post("/test-alert", response_model=Dict[str, Any])
async def test_security_alert(
    alert_type: str = "test",
    severity: str = "medium",
    current_user: models.User = Depends(get_current_admin_user)
):
    """Test security alerting system (admin only)"""
    
    monitoring_service = get_auth_monitoring_service()
    
    # Create test security event
    test_event = SecurityEvent(
        event_type=f"test_alert_{alert_type}",
        severity=severity,
        description=f"Test security alert of type {alert_type}",
        user_id=str(current_user.id),
        metadata={
            "test": True,
            "triggered_by": current_user.email,
            "test_type": alert_type
        }
    )
    
    # Record the event (this will trigger alerts if configured)
    result = monitoring_service.record_auth_event(test_event)
    
    return {
        "message": "Test alert sent successfully",
        "event_id": test_event.timestamp.isoformat(),
        "alert_type": alert_type,
        "severity": severity,
        "analysis": result
    }

# Helper functions

async def _check_auth_components(db: Session) -> Dict[str, Any]:
    """Check health of individual authentication components"""
    
    component_status = {}
    all_healthy = True
    
    # Check database connectivity for auth tables
    try:
        # Test user table access
        db.execute(text("SELECT COUNT(*) FROM users LIMIT 1"))
        component_status["user_database"] = {
            "status": "healthy",
            "message": "User database accessible"
        }
    except Exception as e:
        component_status["user_database"] = {
            "status": "unhealthy",
            "message": f"User database error: {str(e)}"
        }
        all_healthy = False
    
    # Check JWT functionality
    try:
        # Test JWT encoding/decoding
        test_payload = {"test": "jwt_health_check", "exp": datetime.utcnow() + timedelta(minutes=1)}
        secret = os.getenv("SECRET_KEY", "test-secret-key")
        token = jwt.encode(test_payload, secret, algorithm="HS256")
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        
        component_status["jwt_system"] = {
            "status": "healthy",
            "message": "JWT encoding/decoding working"
        }
    except Exception as e:
        component_status["jwt_system"] = {
            "status": "unhealthy",
            "message": f"JWT system error: {str(e)}"
        }
        all_healthy = False
    
    # Check password hashing
    try:
        from utils.auth import get_password_hash, verify_password
        test_password = "test_password_123"
        hashed = get_password_hash(test_password)
        verified = verify_password(test_password, hashed)
        
        if verified:
            component_status["password_hashing"] = {
                "status": "healthy",
                "message": "Password hashing working correctly"
            }
        else:
            component_status["password_hashing"] = {
                "status": "unhealthy",
                "message": "Password verification failed"
            }
            all_healthy = False
    except Exception as e:
        component_status["password_hashing"] = {
            "status": "unhealthy",
            "message": f"Password hashing error: {str(e)}"
        }
        all_healthy = False
    
    # Check MFA table access
    try:
        db.execute(text("SELECT COUNT(*) FROM user_mfa_secrets LIMIT 1"))
        component_status["mfa_system"] = {
            "status": "healthy",
            "message": "MFA system accessible"
        }
    except Exception as e:
        component_status["mfa_system"] = {
            "status": "unhealthy",
            "message": f"MFA system error: {str(e)}"
        }
        all_healthy = False
    
    # Check audit logging
    try:
        from utils.audit_logger_bypass import get_audit_logger
        audit_logger = get_audit_logger()
        # Test audit logging
        component_status["audit_logging"] = {
            "status": "healthy",
            "message": "Audit logging system accessible"
        }
    except Exception as e:
        component_status["audit_logging"] = {
            "status": "unhealthy",
            "message": f"Audit logging error: {str(e)}"
        }
        all_healthy = False
    
    return {
        "all_healthy": all_healthy,
        "component_status": component_status,
        "total_components": len(component_status),
        "healthy_components": len([c for c in component_status.values() if c["status"] == "healthy"])
    }

async def _check_security_status(monitoring_service) -> Dict[str, Any]:
    """Check current security status"""
    
    # Get recent security events
    recent_events = [
        e for e in monitoring_service.events_buffer 
        if datetime.utcnow() - e.timestamp <= timedelta(hours=1)
    ]
    
    critical_events = [e for e in recent_events if e.severity == "critical"]
    high_events = [e for e in recent_events if e.severity == "high"]
    
    # Check for active threats
    active_threats = []
    if len(critical_events) > 0:
        active_threats.append("Critical security events detected")
    
    if len(monitoring_service.brute_force_detector.blacklisted_ips) > 0:
        active_threats.append(f"{len(monitoring_service.brute_force_detector.blacklisted_ips)} IPs blacklisted")
    
    # Check for security anomalies
    security_anomalies = []
    if len(high_events) > 5:  # More than 5 high severity events in 1 hour
        security_anomalies.append("High number of security events")
    
    # Calculate security score (0-100, higher is better)
    security_score = 100
    security_score -= len(critical_events) * 20
    security_score -= len(high_events) * 5
    security_score -= len(monitoring_service.brute_force_detector.blacklisted_ips) * 2
    security_score = max(0, security_score)
    
    security_ok = len(active_threats) == 0 and security_score >= 80
    
    return {
        "security_ok": security_ok,
        "security_score": security_score,
        "active_threats": active_threats,
        "security_anomalies": security_anomalies,
        "recent_events": {
            "total": len(recent_events),
            "critical": len(critical_events),
            "high": len(high_events)
        },
        "blacklisted_ips": len(monitoring_service.brute_force_detector.blacklisted_ips)
    }

async def _check_performance_metrics(monitoring_service) -> Dict[str, Any]:
    """Check authentication performance metrics"""
    
    # Get current metrics
    avg_response_time = monitoring_service.metrics.avg_response_time_ms
    error_rate = monitoring_service.metrics.error_rate
    
    # Performance thresholds
    response_time_threshold = 2000  # 2 seconds
    error_rate_threshold = 5       # 5%
    
    performance_issues = []
    if avg_response_time > response_time_threshold:
        performance_issues.append(f"High response time: {avg_response_time:.2f}ms")
    
    if error_rate > error_rate_threshold:
        performance_issues.append(f"High error rate: {error_rate:.2f}%")
    
    performance_ok = len(performance_issues) == 0
    
    # Calculate performance score
    response_score = max(0, 100 - (avg_response_time / response_time_threshold * 50))
    error_score = max(0, 100 - (error_rate / error_rate_threshold * 50))
    performance_score = (response_score + error_score) / 2
    
    return {
        "performance_ok": performance_ok,
        "performance_score": round(performance_score, 2),
        "performance_issues": performance_issues,
        "metrics": {
            "avg_response_time_ms": round(avg_response_time, 2),
            "error_rate_percent": round(error_rate, 2),
            "successful_logins": monitoring_service.metrics.successful_logins,
            "failed_logins": monitoring_service.metrics.failed_logins,
            "mfa_verifications": monitoring_service.metrics.mfa_verifications,
            "token_refreshes": monitoring_service.metrics.token_refreshes
        },
        "thresholds": {
            "response_time_ms": response_time_threshold,
            "error_rate_percent": error_rate_threshold
        }
    }

async def _check_auth_dependencies() -> Dict[str, Any]:
    """Check health of authentication system dependencies"""
    
    dependency_status = {}
    dependencies_ok = True
    
    # Check Redis (for rate limiting and sessions)
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis.from_url(redis_url)
        r.ping()
        dependency_status["redis"] = {
            "status": "healthy",
            "message": "Redis connection successful"
        }
    except Exception as e:
        dependency_status["redis"] = {
            "status": "unhealthy",
            "message": f"Redis connection failed: {str(e)}"
        }
        dependencies_ok = False
    
    # Check environment variables
    required_env_vars = [
        "SECRET_KEY",
        "ALGORITHM",
        "ACCESS_TOKEN_EXPIRE_MINUTES"
    ]
    
    missing_env_vars = []
    for var in required_env_vars:
        if not os.getenv(var):
            missing_env_vars.append(var)
    
    if missing_env_vars:
        dependency_status["environment"] = {
            "status": "unhealthy",
            "message": f"Missing environment variables: {', '.join(missing_env_vars)}"
        }
        dependencies_ok = False
    else:
        dependency_status["environment"] = {
            "status": "healthy",
            "message": "All required environment variables present"
        }
    
    # Check email service (for password resets, etc.)
    try:
        smtp_server = os.getenv("SMTP_SERVER")
        if smtp_server:
            dependency_status["email_service"] = {
                "status": "configured",
                "message": "Email service configured"
            }
        else:
            dependency_status["email_service"] = {
                "status": "not_configured",
                "message": "Email service not configured"
            }
    except Exception as e:
        dependency_status["email_service"] = {
            "status": "unhealthy",
            "message": f"Email service error: {str(e)}"
        }
    
    return {
        "dependencies_ok": dependencies_ok,
        "dependency_status": dependency_status,
        "total_dependencies": len(dependency_status),
        "healthy_dependencies": len([d for d in dependency_status.values() if d["status"] == "healthy"])
    }

async def _run_component_diagnostics(db: Session) -> Dict[str, Any]:
    """Run detailed diagnostics on auth components"""
    
    diagnostics = {}
    
    # Database diagnostics
    try:
        # Check user table statistics
        result = db.execute(text("SELECT COUNT(*) as total_users FROM users")).fetchone()
        total_users = result.total_users if result else 0
        
        # Check recent user activity
        recent_logins = db.execute(text("""
            SELECT COUNT(*) as recent_logins 
            FROM users 
            WHERE last_login > NOW() - INTERVAL '24 hours'
        """)).fetchone()
        
        diagnostics["database"] = {
            "total_users": total_users,
            "recent_logins_24h": recent_logins.recent_logins if recent_logins else 0,
            "table_accessible": True
        }
    except Exception as e:
        diagnostics["database"] = {
            "error": str(e),
            "table_accessible": False
        }
    
    # MFA diagnostics
    try:
        mfa_stats = db.execute(text("""
            SELECT 
                COUNT(*) as total_mfa_users,
                COUNT(CASE WHEN is_enabled = true THEN 1 END) as enabled_mfa_users
            FROM user_mfa_secrets
        """)).fetchone()
        
        diagnostics["mfa"] = {
            "total_mfa_users": mfa_stats.total_mfa_users if mfa_stats else 0,
            "enabled_mfa_users": mfa_stats.enabled_mfa_users if mfa_stats else 0,
            "mfa_adoption_rate": (mfa_stats.enabled_mfa_users / max(mfa_stats.total_mfa_users, 1)) * 100 if mfa_stats else 0
        }
    except Exception as e:
        diagnostics["mfa"] = {
            "error": str(e)
        }
    
    return diagnostics

def _assess_current_threats(monitoring_service) -> Dict[str, Any]:
    """Assess current security threats"""
    
    # Get recent critical and high severity events
    recent_events = [
        e for e in monitoring_service.events_buffer 
        if datetime.utcnow() - e.timestamp <= timedelta(hours=24)
    ]
    
    threat_indicators = []
    threat_level = "low"
    
    # Count different types of threats
    brute_force_events = [e for e in recent_events if "brute_force" in e.event_type]
    token_anomalies = [e for e in recent_events if "token" in e.event_type and e.severity in ["high", "critical"]]
    suspicious_logins = [e for e in recent_events if "suspicious" in e.event_type]
    
    # Assess threat level
    if len(brute_force_events) > 5:
        threat_indicators.append("Multiple brute force attempts detected")
        threat_level = "high"
    
    if len(token_anomalies) > 3:
        threat_indicators.append("Token security anomalies detected")
        threat_level = "medium" if threat_level == "low" else threat_level
    
    if len(suspicious_logins) > 10:
        threat_indicators.append("High number of suspicious login attempts")
        threat_level = "medium" if threat_level == "low" else threat_level
    
    if len(monitoring_service.brute_force_detector.blacklisted_ips) > 10:
        threat_indicators.append("Many IPs blacklisted for attacks")
        threat_level = "high"
    
    return {
        "threat_level": threat_level,
        "threat_indicators": threat_indicators,
        "event_summary": {
            "brute_force_events": len(brute_force_events),
            "token_anomalies": len(token_anomalies),
            "suspicious_logins": len(suspicious_logins)
        },
        "blacklisted_ips": len(monitoring_service.brute_force_detector.blacklisted_ips)
    }

def _get_security_recommendations(security_metrics: Dict, threat_assessment: Dict) -> List[str]:
    """Get security recommendations based on current metrics"""
    
    recommendations = []
    
    if threat_assessment["threat_level"] == "high":
        recommendations.append("🚨 URGENT: Investigate and respond to high-threat security events")
        recommendations.append("Consider temporarily increasing rate limiting")
        recommendations.append("Review and potentially expand IP blacklist")
    
    if security_metrics["security_stats"]["brute_force_attempts"] > 10:
        recommendations.append("Implement stronger brute force protection")
        recommendations.append("Consider implementing CAPTCHA for repeated failures")
    
    if security_metrics["security_stats"]["token_anomalies"] > 5:
        recommendations.append("Review token security policies")
        recommendations.append("Consider shorter token expiration times")
    
    if security_metrics["security_stats"]["suspicious_logins"] > 20:
        recommendations.append("Enhance login anomaly detection")
        recommendations.append("Consider implementing device fingerprinting")
    
    mfa_ratio = security_metrics.get("mfa_adoption_rate", 0)
    if mfa_ratio < 50:
        recommendations.append("Encourage higher MFA adoption rate")
        recommendations.append("Consider making MFA mandatory for admin users")
    
    return recommendations

def _get_performance_recommendations(performance_metrics: Dict) -> List[str]:
    """Get performance recommendations"""
    
    recommendations = []
    
    if performance_metrics["metrics"]["avg_response_time_ms"] > 2000:
        recommendations.append("Optimize authentication endpoint performance")
        recommendations.append("Consider database query optimization")
        recommendations.append("Review password hashing complexity")
    
    if performance_metrics["metrics"]["error_rate_percent"] > 5:
        recommendations.append("Investigate and fix authentication errors")
        recommendations.append("Review error handling and retry logic")
    
    failed_ratio = performance_metrics["metrics"]["failed_logins"] / max(
        performance_metrics["metrics"]["successful_logins"] + performance_metrics["metrics"]["failed_logins"], 1
    )
    
    if failed_ratio > 0.1:  # More than 10% failure rate
        recommendations.append("High authentication failure rate detected")
        recommendations.append("Review user experience and error messages")
    
    return recommendations

def _get_dependency_recommendations(dependency_health: Dict) -> List[str]:
    """Get dependency recommendations"""
    
    recommendations = []
    
    for dep_name, dep_status in dependency_health["dependency_status"].items():
        if dep_status["status"] == "unhealthy":
            recommendations.append(f"Fix {dep_name} dependency issue: {dep_status['message']}")
        elif dep_status["status"] == "not_configured":
            recommendations.append(f"Consider configuring {dep_name} for better functionality")
    
    return recommendations

async def _analyze_performance_trends(monitoring_service) -> Dict[str, Any]:
    """Analyze performance trends"""
    
    # This would typically analyze historical data
    # For now, return current snapshot with trend indicators
    
    current_response_times = list(monitoring_service.response_times)
    
    if len(current_response_times) > 10:
        recent_avg = sum(current_response_times[-10:]) / 10
        older_avg = sum(current_response_times[-20:-10]) / 10 if len(current_response_times) >= 20 else recent_avg
        
        trend = "improving" if recent_avg < older_avg else "degrading" if recent_avg > older_avg else "stable"
    else:
        trend = "insufficient_data"
    
    return {
        "response_time_trend": trend,
        "sample_size": len(current_response_times),
        "trend_analysis": f"Performance is {trend}" if trend != "insufficient_data" else "Need more data for trend analysis"
    }

async def _analyze_dependency_issues(dependency_health: Dict) -> Dict[str, Any]:
    """Analyze dependency issues"""
    
    issues = []
    critical_issues = []
    
    for dep_name, dep_status in dependency_health["dependency_status"].items():
        if dep_status["status"] == "unhealthy":
            if dep_name in ["redis", "database"]:
                critical_issues.append(f"{dep_name}: {dep_status['message']}")
            else:
                issues.append(f"{dep_name}: {dep_status['message']}")
    
    return {
        "total_issues": len(issues) + len(critical_issues),
        "critical_issues": critical_issues,
        "non_critical_issues": issues,
        "impact_assessment": "High" if critical_issues else "Low" if issues else "None"
    }

def _get_system_uptime() -> str:
    """Get system uptime (simplified)"""
    # This would typically check actual system uptime
    return "Available when system monitoring is configured"

def _get_last_restart_time() -> str:
    """Get last system restart time"""
    # This would typically track application restart times
    return "Available when restart tracking is configured"