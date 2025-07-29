
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import requests
import threading

# Configure security logger
security_logger = logging.getLogger("security")
security_handler = logging.FileHandler("/var/log/bookedbarber-security.log")
security_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
security_handler.setFormatter(security_formatter)
security_logger.addHandler(security_handler)
security_logger.setLevel(logging.INFO)

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_type: str
    severity: str
    description: str
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict] = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow()

class SecurityMonitoring:
    """Comprehensive security monitoring system"""
    
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url
        self.events_buffer = []
        self.anomaly_baseline = {}
        
        # Start background monitoring thread
        self.monitoring_thread = threading.Thread(target=self._background_monitoring, daemon=True)
        self.monitoring_thread.start()
    
    def log_security_event(self, event: SecurityEvent) -> None:
        """Log security event"""
        event_data = {
            "event_type": event.event_type,
            "severity": event.severity,
            "description": event.description,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "endpoint": event.endpoint,
            "timestamp": event.timestamp.isoformat(),
            "metadata": event.metadata or {}
        }
        
        # Log to security log
        security_logger.info(json.dumps(event_data))
        
        # Add to events buffer for analysis
        self.events_buffer.append(event)
        
        # Send immediate alert for critical events
        if event.severity == "critical":
            self._send_alert(event_data)
    
    def detect_suspicious_login(self, user_id: str, ip_address: str, success: bool) -> None:
        """Detect suspicious login attempts"""
        
        # Multiple failed logins
        if not success:
            recent_failures = [
                e for e in self.events_buffer
                if e.user_id == user_id and 
                   e.event_type == "failed_login" and
                   e.timestamp > datetime.utcnow() - timedelta(minutes=15)
            ]
            
            if len(recent_failures) >= 3:
                self.log_security_event(SecurityEvent(
                    event_type="suspicious_login_attempts",
                    severity="high",
                    description=f"Multiple failed login attempts for user {user_id}",
                    user_id=user_id,
                    ip_address=ip_address,
                    metadata={"failed_attempts": len(recent_failures)}
                ))
        
        # Login from new location
        user_ips = [
            e.ip_address for e in self.events_buffer
            if e.user_id == user_id and 
               e.event_type == "successful_login" and
               e.timestamp > datetime.utcnow() - timedelta(days=30)
        ]
        
        if ip_address not in user_ips and success:
            self.log_security_event(SecurityEvent(
                event_type="login_new_location",
                severity="medium",
                description=f"Login from new IP address for user {user_id}",
                user_id=user_id,
                ip_address=ip_address
            ))
    
    def detect_payment_anomalies(self, user_id: str, amount: float, frequency: int) -> None:
        """Detect suspicious payment activity"""
        
        # High-value transaction
        if amount > 5000:  # $5000 threshold
            self.log_security_event(SecurityEvent(
                event_type="high_value_payment",
                severity="medium",
                description=f"High-value payment attempt: ${amount}",
                user_id=user_id,
                metadata={"amount": amount}
            ))
        
        # High frequency payments
        if frequency > 10:  # More than 10 payments per hour
            self.log_security_event(SecurityEvent(
                event_type="high_frequency_payments",
                severity="high",
                description=f"Unusual payment frequency: {frequency} payments",
                user_id=user_id,
                metadata={"frequency": frequency, "amount": amount}
            ))
    
    def detect_admin_access_anomalies(self, user_id: str, action: str, ip_address: str) -> None:
        """Detect suspicious admin access"""
        
        current_hour = datetime.utcnow().hour
        
        # Admin access outside business hours (9 AM - 6 PM)
        if current_hour < 9 or current_hour > 18:
            self.log_security_event(SecurityEvent(
                event_type="admin_access_outside_hours",
                severity="medium",
                description=f"Admin access outside business hours: {action}",
                user_id=user_id,
                ip_address=ip_address,
                metadata={"action": action, "hour": current_hour}
            ))
        
        # Bulk data access
        if "export" in action.lower() or "download" in action.lower():
            self.log_security_event(SecurityEvent(
                event_type="bulk_data_access",
                severity="high",
                description=f"Bulk data access attempt: {action}",
                user_id=user_id,
                ip_address=ip_address,
                metadata={"action": action}
            ))
    
    def _background_monitoring(self) -> None:
        """Background monitoring process"""
        while True:
            try:
                self._analyze_events()
                self._cleanup_old_events()
                time.sleep(300)  # Run every 5 minutes
            
            except Exception as e:
                security_logger.error(f"Background monitoring error: {e}")
                time.sleep(300)
    
    def _analyze_events(self) -> None:
        """Analyze events for patterns"""
        
        # Analyze last hour of events
        recent_events = [
            e for e in self.events_buffer
            if e.timestamp > datetime.utcnow() - timedelta(hours=1)
        ]
        
        # Count events by type
        event_counts = {}
        for event in recent_events:
            event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1
        
        # Check for anomalies
        for event_type, count in event_counts.items():
            baseline = self.anomaly_baseline.get(event_type, 0)
            
            # Alert if count is 3x higher than baseline
            if count > baseline * 3 and count > 5:
                self.log_security_event(SecurityEvent(
                    event_type="anomaly_detected",
                    severity="medium",
                    description=f"Anomalous spike in {event_type}: {count} events",
                    metadata={"event_type": event_type, "count": count, "baseline": baseline}
                ))
        
        # Update baseline
        for event_type, count in event_counts.items():
            if event_type not in self.anomaly_baseline:
                self.anomaly_baseline[event_type] = count
            else:
                # Exponential moving average
                self.anomaly_baseline[event_type] = (
                    0.9 * self.anomaly_baseline[event_type] + 0.1 * count
                )
    
    def _cleanup_old_events(self) -> None:
        """Clean up old events from buffer"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        self.events_buffer = [
            e for e in self.events_buffer
            if e.timestamp > cutoff_time
        ]
    
    def _send_alert(self, event_data: Dict) -> None:
        """Send alert to external systems"""
        if not self.webhook_url:
            return
        
        try:
            alert_payload = {
                "text": f"🚨 Security Alert: {event_data['description']}",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Security Event*\n*Type*: {event_data['event_type']}\n*Severity*: {event_data['severity']}\n*Description*: {event_data['description']}\n*Time*: {event_data['timestamp']}"
                        }
                    }
                ]
            }
            
            requests.post(self.webhook_url, json=alert_payload, timeout=10)
            
        except Exception as e:
            security_logger.error(f"Failed to send alert: {e}")
    
    def get_security_dashboard_data(self) -> Dict:
        """Get security dashboard data"""
        recent_events = [
            e for e in self.events_buffer
            if e.timestamp > datetime.utcnow() - timedelta(hours=24)
        ]
        
        # Count events by severity
        severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for event in recent_events:
            severity_counts[event.severity] = severity_counts.get(event.severity, 0) + 1
        
        # Count events by type
        event_type_counts = {}
        for event in recent_events:
            event_type_counts[event.event_type] = event_type_counts.get(event.event_type, 0) + 1
        
        return {
            "total_events": len(recent_events),
            "severity_breakdown": severity_counts,
            "event_types": event_type_counts,
            "last_updated": datetime.utcnow().isoformat()
        }

def main():
    """Main function to implement security hardening"""
    
    print(f"""{COLORS['blue']}
🔒 BookedBarber V2 Security Hardening Implementation
=================================================={COLORS['reset']}""")
    
    log("Starting comprehensive security hardening implementation...")
    
    # Create security directory structure
    os.makedirs("/Users/bossio/6fb-booking/6fb-infrastructure-polish/backend-v2/middleware", exist_ok=True)
    os.makedirs("/Users/bossio/6fb-booking/6fb-infrastructure-polish/backend-v2/services", exist_ok=True)
    os.makedirs("/Users/bossio/6fb-booking/6fb-infrastructure-polish/security", exist_ok=True)
    
    # Create security middleware components
    create_security_headers_middleware()
    create_rate_limiting_middleware()
    create_input_validation_middleware()
    create_authentication_security()
    create_data_protection_utils()
    create_security_monitoring()
    create_integration_guide()
    
    success("Security hardening implementation completed successfully!")
    
    log("💡 Next Steps:")
    print("1. Update backend-v2/main.py to import and use these middleware components")
    print("2. Configure Redis connection for rate limiting and session management")
    print("3. Set up encryption keys in environment variables")
    print("4. Enable security monitoring and alerting")
    print("5. Test all security features in staging environment")
    print("")
    print("📚 Documentation: See security/production-security-config.yaml for detailed configuration")

def create_integration_guide():
    """Create integration guide for implementing security middleware"""
    log("Creating security integration guide...")
    
    integration_guide = """# Security Hardening Integration Guide
# How to integrate the security middleware into BookedBarber V2

## 1. Backend Integration (backend-v2/main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import security middleware
from middleware.security_middleware import (
    SecurityHeadersMiddleware,
    RateLimitingMiddleware, 
    InputValidationMiddleware,
    SecurityMonitoringMiddleware
)
from services.security_service import SecurityService

app = FastAPI(title="BookedBarber V2 API")

# Initialize security service
security_service = SecurityService()

# Add security middleware (ORDER MATTERS!)
app.add_middleware(SecurityMonitoringMiddleware, security_service=security_service)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitingMiddleware, redis_url=os.getenv("REDIS_URL"))
app.add_middleware(InputValidationMiddleware)

# Existing CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://bookedbarber.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## 2. Environment Variables (.env.production)

```bash
# Security Configuration
SECURITY_HEADERS_ENABLED=true
RATE_LIMITING_ENABLED=true
INPUT_VALIDATION_ENABLED=true
SECURITY_MONITORING_ENABLED=true

# Encryption Keys (Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
ENCRYPTION_KEY=your_32_byte_encryption_key_here
DATA_ENCRYPTION_KEY=your_data_encryption_key_here

# Rate Limiting
REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST_SIZE=10

# Authentication Security
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRY=900
JWT_REFRESH_TOKEN_EXPIRY=604800
MFA_ENABLED=true

# Monitoring
SECURITY_ALERT_WEBHOOK=https://hooks.slack.com/your-security-webhook
SECURITY_LOG_LEVEL=INFO
```

## 3. Database Migrations

Create migration for security-related tables:

```sql
-- Add security audit log table
CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add MFA table
CREATE TABLE user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    secret_key VARCHAR(32) NOT NULL,
    backup_codes TEXT[],
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Add account lockout table
CREATE TABLE account_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    ip_address INET,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX idx_account_lockouts_user_id ON account_lockouts(user_id);
CREATE INDEX idx_account_lockouts_ip_address ON account_lockouts(ip_address);
```

## 4. Testing Security Features

```python
# tests/test_security.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_security_headers():
    response = client.get("/")
    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "Strict-Transport-Security" in response.headers

def test_rate_limiting():
    # Test normal usage
    for i in range(50):  # Within limit
        response = client.get("/api/v2/health")
        assert response.status_code == 200
    
    # Test rate limit exceeded
    for i in range(20):  # Exceed limit
        response = client.get("/api/v2/health")
    
    assert response.status_code == 429  # Too Many Requests

def test_input_validation():
    # Test SQL injection attempt
    malicious_payload = {"email": "test'; DROP TABLE users; --"}
    response = client.post("/api/v2/auth/login", json=malicious_payload)
    assert response.status_code == 400  # Bad Request

def test_authentication_security():
    # Test multiple failed login attempts
    for i in range(6):  # Exceed failed attempt limit
        response = client.post("/api/v2/auth/login", json={
            "email": "test@example.com",
            "password": "wrong_password"
        })
    
    # Account should be locked
    response = client.post("/api/v2/auth/login", json={
        "email": "test@example.com", 
        "password": "correct_password"
    })
    assert response.status_code == 423  # Locked
```

## 5. Monitoring Setup

```python
# Add to your monitoring configuration
import logging
from security.security_monitoring import SecurityMonitor

# Configure security monitoring
security_monitor = SecurityMonitor()

# Log security events
@app.middleware("http")
async def security_event_logger(request, call_next):
    # Monitor for suspicious activity
    if security_monitor.is_suspicious_request(request):
        security_monitor.alert("Suspicious request detected", {
            "ip": request.client.host,
            "path": request.url.path,
            "user_agent": request.headers.get("user-agent")
        })
    
    response = await call_next(request)
    return response
```

## 6. Production Deployment Checklist

- [ ] All security environment variables configured
- [ ] Redis server running and accessible
- [ ] Database migrations applied
- [ ] Security headers tested with security scanner
- [ ] Rate limiting tested with load testing
- [ ] Input validation tested with security tests
- [ ] MFA setup tested with test users
- [ ] Security monitoring alerts tested
- [ ] Incident response procedures documented
- [ ] Security audit log rotation configured

## 7. Security Testing Commands

```bash
# Test security headers
curl -I https://bookedbarber.com

# Test rate limiting
for i in {1..100}; do curl https://api.bookedbarber.com/health; done

# Test input validation
curl -X POST https://api.bookedbarber.com/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test\"; DROP TABLE users; --", "password": "test"}'

# Test CORS policy
curl -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS https://api.bookedbarber.com/api/v2/health
```

## 8. Maintenance Tasks

### Weekly:
- Review security audit logs
- Check for failed authentication attempts
- Update security dependencies
- Review rate limiting metrics

### Monthly:
- Rotate encryption keys
- Review and update security policies
- Conduct security vulnerability scan
- Review access controls and permissions

### Quarterly:
- Penetration testing
- Security architecture review
- Incident response drill
- Compliance audit
"""

    with open("/Users/bossio/6fb-booking/6fb-infrastructure-polish/security/SECURITY_INTEGRATION_GUIDE.md", "w") as f:
        f.write(integration_guide)
    
    success("Security integration guide created")

if __name__ == "__main__":
    main()

# Global security monitoring instance
security_monitor = SecurityMonitoring(webhook_url=os.getenv("SLACK_WEBHOOK_URL"))
