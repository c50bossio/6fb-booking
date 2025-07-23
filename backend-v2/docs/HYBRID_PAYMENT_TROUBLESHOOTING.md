# 🔧 Hybrid Payment System Troubleshooting Guide

## 🎯 Troubleshooting Overview

This guide provides comprehensive troubleshooting procedures for the hybrid payment system, covering common issues, diagnostic steps, and resolution procedures. Use this guide when experiencing problems with payment processing, external processor connections, commission collection, or analytics.

## 🚨 Emergency Procedures

### Critical Payment Processing Failure

If payment processing is completely down:

1. **Immediate Actions**:
```bash
# Check system health
curl -f http://localhost:8000/health || echo "Backend down"
curl -f http://localhost:3000 || echo "Frontend down"

# Switch all barbers to centralized mode temporarily
psql -d production_db -c "UPDATE users SET payment_mode = 'centralized' WHERE role = 'barber';"

# Restart application servers
sudo systemctl restart bookedbarber-backend
sudo systemctl restart bookedbarber-frontend
```

2. **Verify Recovery**:
```bash
# Test basic payment routing
curl -X POST http://localhost:8000/api/v1/hybrid-payments/route \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appointment_id": 1, "amount": 50.00}'
```

### External Processor Connection Issues

If external processors are failing:

1. **Quick Diagnosis**:
```bash
# Check external processor connections
python -c "
from database import get_db
from models.hybrid_payment import PaymentProcessorConnection
db = next(get_db())
failed_connections = db.query(PaymentProcessorConnection).filter(
    PaymentProcessorConnection.status.in_(['error', 'expired'])
).all()
for conn in failed_connections:
    print(f'Failed: {conn.processor_type} - {conn.account_name}')
"
```

2. **Enable Fallback Mode**:
```bash
# Enable fallback for all barbers
psql -d production_db -c "UPDATE hybrid_payment_configs SET fallback_enabled = true;"
```

## 🔍 Diagnostic Tools

### System Health Check

Use the comprehensive health check script:

```python
#!/usr/bin/env python3
"""
Hybrid Payment System Health Check
Comprehensive diagnostic tool for the hybrid payment system.
"""

import requests
import psycopg2
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import get_db
from models.hybrid_payment import *
from services.hybrid_payment_router import HybridPaymentRouter

class HybridPaymentHealthCheck:
    """Comprehensive health check for hybrid payment system."""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.db = next(get_db())
        self.issues = []
        self.warnings = []
    
    def check_database_connectivity(self):
        """Check database connectivity and table accessibility."""
        try:
            # Test each hybrid payment table
            tables = [
                PaymentProcessorConnection,
                ExternalTransaction,
                PlatformCollection,
                HybridPaymentConfig
            ]
            
            for table in tables:
                count = self.db.query(table).count()
                print(f"✅ {table.__tablename__}: {count} records")
            
            return True
        except Exception as e:
            self.issues.append(f"Database connectivity failed: {e}")
            return False
    
    def check_external_processor_health(self):
        """Check health of external processor connections."""
        connections = self.db.query(PaymentProcessorConnection).all()
        
        if not connections:
            self.warnings.append("No external processor connections configured")
            return True
        
        healthy_connections = 0
        for conn in connections:
            if conn.status == ConnectionStatus.CONNECTED:
                # Check last activity
                if conn.last_transaction_at:
                    hours_since_activity = (
                        datetime.now() - conn.last_transaction_at
                    ).total_seconds() / 3600
                    
                    if hours_since_activity > 24:
                        self.warnings.append(
                            f"{conn.processor_type} connection inactive for {hours_since_activity:.1f} hours"
                        )
                
                healthy_connections += 1
            else:
                self.issues.append(
                    f"{conn.processor_type} connection status: {conn.status}"
                )
        
        print(f"✅ External processors: {healthy_connections}/{len(connections)} healthy")
        return len(self.issues) == 0
    
    def check_payment_routing_logic(self):
        """Test payment routing logic with sample data."""
        try:
            router = HybridPaymentRouter(self.db)
            
            # Test with sample barber
            sample_barber = self.db.query(User).filter(User.role == 'barber').first()
            if not sample_barber:
                self.warnings.append("No barber users found for routing test")
                return True
            
            # Test routing logic
            config = router._get_payment_configuration(sample_barber.id)
            print(f"✅ Payment routing logic functional for barber {sample_barber.id}")
            return True
            
        except Exception as e:
            self.issues.append(f"Payment routing test failed: {e}")
            return False
    
    def check_commission_collection_system(self):
        """Check commission collection system health."""
        try:
            # Check for stuck collections
            stuck_collections = self.db.query(PlatformCollection).filter(
                PlatformCollection.status == 'processing',
                PlatformCollection.created_at < datetime.now() - timedelta(hours=2)
            ).count()
            
            if stuck_collections > 0:
                self.warnings.append(f"{stuck_collections} collections stuck in processing")
            
            # Check failed collections
            failed_collections = self.db.query(PlatformCollection).filter(
                PlatformCollection.status == 'failed',
                PlatformCollection.created_at > datetime.now() - timedelta(days=7)
            ).count()
            
            if failed_collections > 5:
                self.issues.append(f"{failed_collections} failed collections in past week")
            
            print(f"✅ Commission collection system operational")
            return True
            
        except Exception as e:
            self.issues.append(f"Commission collection check failed: {e}")
            return False
    
    def check_api_endpoints(self):
        """Check API endpoint accessibility."""
        endpoints = [
            "/api/v1/hybrid-payments/test-routing",
            "/api/v1/external-payments/connections",
            "/api/v1/platform-collections/summary",
            "/api/v1/unified-payment-analytics/dashboard"
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(
                    f"{self.base_url}{endpoint}",
                    timeout=5,
                    # Note: This will return 401 without auth, which is expected
                )
                if response.status_code in [200, 401, 403]:
                    print(f"✅ {endpoint} accessible")
                else:
                    self.issues.append(f"{endpoint} returned {response.status_code}")
            except Exception as e:
                self.issues.append(f"{endpoint} request failed: {e}")
    
    def check_webhook_configuration(self):
        """Check webhook configuration for external processors."""
        connections = self.db.query(PaymentProcessorConnection).filter(
            PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
        ).all()
        
        for conn in connections:
            if not conn.webhook_url:
                self.warnings.append(
                    f"{conn.processor_type} connection missing webhook URL"
                )
            if not conn.webhook_secret:
                self.warnings.append(
                    f"{conn.processor_type} connection missing webhook secret"
                )
    
    def run_complete_health_check(self):
        """Run complete health check and report results."""
        print("🔍 HYBRID PAYMENT SYSTEM HEALTH CHECK")
        print("=" * 50)
        
        checks = [
            ("Database Connectivity", self.check_database_connectivity),
            ("External Processor Health", self.check_external_processor_health),
            ("Payment Routing Logic", self.check_payment_routing_logic),
            ("Commission Collection", self.check_commission_collection_system),
            ("API Endpoints", self.check_api_endpoints),
            ("Webhook Configuration", self.check_webhook_configuration)
        ]
        
        passed_checks = 0
        for check_name, check_func in checks:
            print(f"\n🧪 {check_name}...")
            try:
                if check_func():
                    passed_checks += 1
                else:
                    print(f"❌ {check_name} failed")
            except Exception as e:
                self.issues.append(f"{check_name} crashed: {e}")
                print(f"💥 {check_name} crashed: {e}")
        
        # Summary
        print(f"\n📊 HEALTH CHECK SUMMARY")
        print(f"Checks passed: {passed_checks}/{len(checks)}")
        print(f"Issues found: {len(self.issues)}")
        print(f"Warnings: {len(self.warnings)}")
        
        if self.issues:
            print(f"\n❌ CRITICAL ISSUES:")
            for issue in self.issues:
                print(f"  • {issue}")
        
        if self.warnings:
            print(f"\n⚠️ WARNINGS:")
            for warning in self.warnings:
                print(f"  • {warning}")
        
        if not self.issues and not self.warnings:
            print(f"\n🎉 All systems healthy!")
        
        return len(self.issues) == 0

if __name__ == "__main__":
    health_check = HybridPaymentHealthCheck()
    success = health_check.run_complete_health_check()
    exit(0 if success else 1)
```

### Payment Flow Tracer

Debug payment flows with detailed tracing:

```python
#!/usr/bin/env python3
"""
Payment Flow Tracer
Traces payment processing through the hybrid system for debugging.
"""

import json
from datetime import datetime
from sqlalchemy.orm import Session
from database import get_db
from services.hybrid_payment_router import HybridPaymentRouter
from services.external_payment_service import ExternalPaymentService

class PaymentFlowTracer:
    """Traces payment flows for debugging purposes."""
    
    def __init__(self):
        self.db = next(get_db())
        self.trace_log = []
    
    def log_trace(self, step, data):
        """Add trace entry."""
        self.trace_log.append({
            "timestamp": datetime.now().isoformat(),
            "step": step,
            "data": data
        })
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {step}: {data}")
    
    def trace_payment_routing(self, appointment_id, amount):
        """Trace payment routing decision process."""
        self.log_trace("START", f"Tracing payment for appointment {appointment_id}, amount ${amount}")
        
        try:
            router = HybridPaymentRouter(self.db)
            
            # Get appointment and barber
            appointment = router._get_appointment_with_barber(appointment_id)
            if not appointment:
                self.log_trace("ERROR", f"Appointment {appointment_id} not found")
                return False
            
            self.log_trace("APPOINTMENT", {
                "id": appointment.id,
                "barber_id": appointment.barber_id,
                "price": str(appointment.price)
            })
            
            # Get payment configuration
            config = router._get_payment_configuration(appointment.barber_id)
            self.log_trace("CONFIGURATION", {
                "payment_mode": config.get("payment_mode"),
                "commission_rate": config.get("commission_rate"),
                "external_connections": len(config.get("external_connections", []))
            })
            
            # Determine routing
            routing_decision, routing_details = router.route_payment(
                appointment_id=appointment_id,
                amount=amount,
                currency="USD"
            )
            
            self.log_trace("ROUTING_DECISION", {
                "decision": routing_decision.value,
                "processor": routing_details.get("processor"),
                "estimated_fees": routing_details.get("estimated_fees", {})
            })
            
            self.log_trace("SUCCESS", "Payment routing completed successfully")
            return True
            
        except Exception as e:
            self.log_trace("ERROR", f"Payment routing failed: {str(e)}")
            return False
    
    def trace_external_connection(self, connection_id):
        """Trace external processor connection health."""
        self.log_trace("START", f"Tracing external connection {connection_id}")
        
        try:
            connection = self.db.query(PaymentProcessorConnection).filter(
                PaymentProcessorConnection.id == connection_id
            ).first()
            
            if not connection:
                self.log_trace("ERROR", f"Connection {connection_id} not found")
                return False
            
            self.log_trace("CONNECTION_INFO", {
                "processor_type": connection.processor_type,
                "status": connection.status,
                "account_id": connection.account_id,
                "last_sync": connection.last_sync_at.isoformat() if connection.last_sync_at else None
            })
            
            # Test connection health
            external_service = ExternalPaymentService(self.db)
            is_healthy = external_service.validate_connection(connection_id)
            
            self.log_trace("CONNECTION_HEALTH", {
                "healthy": is_healthy,
                "supports_payments": connection.supports_payments,
                "supports_refunds": connection.supports_refunds
            })
            
            return is_healthy
            
        except Exception as e:
            self.log_trace("ERROR", f"Connection tracing failed: {str(e)}")
            return False
    
    def save_trace_log(self, filename=None):
        """Save trace log to file."""
        if not filename:
            filename = f"payment_trace_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.trace_log, f, indent=2)
        
        print(f"Trace log saved to {filename}")

# Usage example
if __name__ == "__main__":
    tracer = PaymentFlowTracer()
    
    # Trace payment routing for appointment 1
    tracer.trace_payment_routing(appointment_id=1, amount=75.00)
    
    # Trace external connection health
    tracer.trace_external_connection(connection_id=1)
    
    # Save trace log
    tracer.save_trace_log()
```

## 🔧 Common Issues & Solutions

### 1. Payment Routing Failures

#### Symptoms
- API returns 400 error: "Payment routing failed"
- Payments defaulting to centralized mode unexpectedly
- External processors not being selected

#### Diagnosis
```bash
# Check barber payment configuration
python -c "
from database import get_db
from models.hybrid_payment import HybridPaymentConfig
db = next(get_db())
config = db.query(HybridPaymentConfig).filter(HybridPaymentConfig.barber_id == 123).first()
print(f'Payment mode: {config.payment_mode if config else \"Not configured\"}')
"

# Check external processor connections
python -c "
from database import get_db
from models.hybrid_payment import PaymentProcessorConnection
db = next(get_db())
connections = db.query(PaymentProcessorConnection).filter(
    PaymentProcessorConnection.barber_id == 123
).all()
for conn in connections:
    print(f'{conn.processor_type}: {conn.status}')
"
```

#### Solutions
1. **Missing Configuration**:
```python
# Create default configuration for barber
from models.hybrid_payment import HybridPaymentConfig
config = HybridPaymentConfig(
    barber_id=123,
    payment_mode='centralized',  # Start with centralized
    fallback_enabled=True,
    commission_rate=0.20
)
db.add(config)
db.commit()
```

2. **Failed External Connections**:
```python
# Reset failed connections
from models.hybrid_payment import PaymentProcessorConnection, ConnectionStatus
failed_connections = db.query(PaymentProcessorConnection).filter(
    PaymentProcessorConnection.status == ConnectionStatus.ERROR
).all()

for conn in failed_connections:
    conn.status = ConnectionStatus.PENDING
    print(f"Reset {conn.processor_type} connection")

db.commit()
```

3. **Invalid Business Rules**:
```python
# Check and fix business rules
config = db.query(HybridPaymentConfig).filter(
    HybridPaymentConfig.barber_id == 123
).first()

if config:
    # Ensure sensible thresholds
    if config.min_external_amount and config.min_external_amount > 1000:
        config.min_external_amount = 50.00
    
    if config.max_platform_amount and config.max_platform_amount < 10:
        config.max_platform_amount = 200.00
    
    db.commit()
```

### 2. External Processor Connection Issues

#### Symptoms
- Connection status stuck in "pending" or "error"
- Webhook notifications not being received
- Transaction synchronization failing

#### Diagnosis
```bash
# Test external processor API connectivity
curl -X GET "https://connect.squareup.com/v2/locations" \
  -H "Authorization: Bearer YOUR_SQUARE_ACCESS_TOKEN"

# Check webhook endpoints
curl -X GET "http://localhost:8000/api/v1/webhooks/square/1" \
  -H "X-Square-Signature: test"
```

#### Solutions
1. **Invalid Credentials**:
```python
# Update connection credentials
connection = db.query(PaymentProcessorConnection).filter(
    PaymentProcessorConnection.id == connection_id
).first()

# Update with new credentials
connection.connection_data = {
    "access_token": "new_valid_token",
    "refresh_token": "new_refresh_token",
    # ... other credentials
}
connection.status = ConnectionStatus.CONNECTED
db.commit()
```

2. **Webhook Configuration Issues**:
```python
# Reconfigure webhooks
from services.external_payment_service import ExternalPaymentService
external_service = ExternalPaymentService(db)

# Recreate webhook for connection
webhook_url = external_service._create_webhook_url(connection_id)
success = external_service._configure_processor_webhook(connection, webhook_url)

if success:
    connection.webhook_url = webhook_url
    db.commit()
```

3. **Network/Firewall Issues**:
```bash
# Test network connectivity
ping connect.squareup.com
nslookup connect.squareup.com

# Test HTTPS connectivity
curl -I https://connect.squareup.com

# Check firewall rules
sudo iptables -L | grep -E "(80|443|8000)"
```

### 3. Commission Collection Failures

#### Symptoms
- Collections stuck in "processing" status
- Failed collections with unclear error messages
- Commission amounts not matching expectations

#### Diagnosis
```bash
# Check failed collections
python -c "
from database import get_db
from models.hybrid_payment import PlatformCollection
from datetime import datetime, timedelta
db = next(get_db())

# Recent failed collections
failed = db.query(PlatformCollection).filter(
    PlatformCollection.status == 'failed',
    PlatformCollection.created_at > datetime.now() - timedelta(days=7)
).all()

for collection in failed:
    print(f'Failed collection {collection.id}: {collection.failed_reason}')
"
```

#### Solutions
1. **Stripe Connect Issues**:
```python
# Check Stripe Connect account status
import stripe
stripe.api_key = "your_stripe_secret_key"

account = stripe.Account.retrieve("acct_barber_connect_account")
print(f"Account status: {account.charges_enabled}")
print(f"Details submitted: {account.details_submitted}")
```

2. **Insufficient Transaction Data**:
```python
# Verify external transactions exist for collection
collection = db.query(PlatformCollection).filter(
    PlatformCollection.id == collection_id
).first()

# Check that all referenced transactions exist
for tx_id in collection.external_transaction_ids:
    tx = db.query(ExternalTransaction).filter(
        ExternalTransaction.external_transaction_id == tx_id
    ).first()
    if not tx:
        print(f"Missing transaction: {tx_id}")
```

3. **Commission Rate Calculation**:
```python
# Recalculate and verify commission amount
from services.platform_collection_service import PlatformCollectionService
collection_service = PlatformCollectionService(db)

transactions = db.query(ExternalTransaction).filter(
    ExternalTransaction.external_transaction_id.in_(collection.external_transaction_ids)
).all()

correct_amount = collection_service.calculate_commission(
    transactions, 
    collection.commission_rate / 100
)

if correct_amount != collection.amount:
    print(f"Commission mismatch: calculated {correct_amount}, stored {collection.amount}")
    collection.amount = correct_amount
    db.commit()
```

### 4. Analytics Data Inconsistencies

#### Symptoms
- Missing transactions in analytics
- Inconsistent revenue totals
- Analytics dashboard showing zero data

#### Diagnosis
```bash
# Compare payment totals across systems
python -c "
from database import get_db
from models import Payment
from models.hybrid_payment import ExternalTransaction
from sqlalchemy import func
from datetime import datetime, timedelta

db = next(get_db())
last_30_days = datetime.now() - timedelta(days=30)

# Platform payments
platform_total = db.query(func.sum(Payment.amount)).filter(
    Payment.status == 'completed',
    Payment.created_at > last_30_days
).scalar() or 0

# External transactions
external_total = db.query(func.sum(ExternalTransaction.amount)).filter(
    ExternalTransaction.status == 'completed',
    ExternalTransaction.created_at > last_30_days
).scalar() or 0

print(f'Platform payments (30d): \${platform_total}')
print(f'External transactions (30d): \${external_total}')
print(f'Total revenue (30d): \${platform_total + external_total}')
"
```

#### Solutions
1. **Missing External Transaction Data**:
```python
# Trigger transaction sync for all connections
from services.external_payment_service import ExternalPaymentService
external_service = ExternalPaymentService(db)

connections = db.query(PaymentProcessorConnection).filter(
    PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
).all()

for conn in connections:
    try:
        synced = external_service.sync_transactions(conn.id)
        print(f"Synced {len(synced)} transactions for {conn.processor_type}")
    except Exception as e:
        print(f"Sync failed for {conn.processor_type}: {e}")
```

2. **Stale Analytics Cache**:
```python
# Clear analytics cache
from services.redis_service import RedisService
redis_service = RedisService()

# Clear analytics cache keys
cache_keys = redis_service.get_keys("analytics:*")
for key in cache_keys:
    redis_service.delete(key)
    
print(f"Cleared {len(cache_keys)} analytics cache keys")
```

3. **Database Synchronization Issues**:
```python
# Reconcile payment data
from services.payment_reconciliation import PaymentReconciliationService
reconciliation_service = PaymentReconciliationService(db)

# Run reconciliation for all barbers
barbers = db.query(User).filter(User.role == 'barber').all()
for barber in barbers:
    result = reconciliation_service.reconcile_barber_payments(barber.id)
    if result['discrepancies']:
        print(f"Discrepancies found for barber {barber.id}: {result['discrepancies']}")
```

### 5. Frontend Integration Issues

#### Symptoms
- Payment buttons not responding
- Error messages not displaying correctly
- Payment method selection not working

#### Diagnosis
```bash
# Check frontend API calls
# Open browser developer tools and check for:
# - 401/403 authentication errors
# - 404 API endpoint errors
# - Network timeout errors
# - CORS errors

# Test API endpoints directly
curl -X GET "http://localhost:8000/api/v1/hybrid-payments/my-options" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### Solutions
1. **Authentication Issues**:
```typescript
// Check JWT token validity
const token = localStorage.getItem('auth_token');
if (!token) {
  // Redirect to login
  window.location.href = '/login';
}

// Verify token hasn't expired
const payload = JSON.parse(atob(token.split('.')[1]));
if (payload.exp * 1000 < Date.now()) {
  // Token expired, refresh or redirect to login
  await refreshToken();
}
```

2. **API Endpoint Issues**:
```typescript
// Update API base URL if needed
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.bookedbarber.com/api/v1'
  : 'http://localhost:8000/api/v1';

// Add proper error handling
try {
  const response = await fetch(`${API_BASE_URL}/hybrid-payments/my-options`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('Payment options fetch failed:', error);
  // Show user-friendly error message
}
```

3. **State Management Issues**:
```typescript
// Ensure proper state updates
const [paymentOptions, setPaymentOptions] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchPaymentOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const options = await getPaymentOptions();
      setPaymentOptions(options);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  fetchPaymentOptions();
}, []);
```

## 📊 Performance Issues

### 1. Slow Payment Processing

#### Symptoms
- Payment processing taking >5 seconds
- API timeouts
- High CPU/memory usage

#### Diagnosis
```bash
# Check API response times
time curl -X POST "http://localhost:8000/api/v1/hybrid-payments/route" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appointment_id": 1, "amount": 50.00}'

# Check database query performance
psql -d production_db -c "\timing on" -c "
SELECT COUNT(*) FROM external_transactions 
WHERE status = 'completed' 
AND created_at > NOW() - INTERVAL '30 days';
"
```

#### Solutions
1. **Database Optimization**:
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_external_transactions_status_date 
ON external_transactions(status, created_at);

CREATE INDEX CONCURRENTLY idx_platform_collections_barber_status 
ON platform_collections(barber_id, status);

-- Update table statistics
ANALYZE external_transactions;
ANALYZE platform_collections;
ANALYZE payment_processor_connections;
```

2. **Caching Implementation**:
```python
# Cache payment configurations
from services.redis_service import RedisService
redis_service = RedisService()

def get_cached_payment_config(barber_id):
    cache_key = f"payment_config:{barber_id}"
    cached = redis_service.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Fetch from database
    config = get_payment_configuration(barber_id)
    
    # Cache for 1 hour
    redis_service.setex(cache_key, 3600, json.dumps(config))
    return config
```

3. **Connection Pooling**:
```python
# Optimize database connections
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_recycle=3600,
    pool_pre_ping=True
)
```

### 2. High Memory Usage

#### Symptoms
- Application memory usage growing over time
- Out of memory errors
- Slow garbage collection

#### Diagnosis
```bash
# Monitor memory usage
ps aux | grep "python.*main:app"
top -p $(pgrep -f "main:app")

# Check for memory leaks
python -c "
import psutil
import os
process = psutil.Process(os.getpid())
print(f'Memory usage: {process.memory_info().rss / 1024 / 1024:.1f} MB')
"
```

#### Solutions
1. **Database Session Management**:
```python
# Ensure proper session cleanup
from contextlib import contextmanager

@contextmanager
def get_db_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Use context manager
with get_db_session() as db:
    # Database operations
    pass
```

2. **Object Lifecycle Management**:
```python
# Clear large objects when done
def process_large_transaction_batch(transactions):
    results = []
    for batch in chunk_list(transactions, 100):
        batch_results = process_batch(batch)
        results.extend(batch_results)
        
        # Clear processed batch from memory
        del batch
        del batch_results
        
    return results
```

## 🔐 Security Issues

### 1. External Processor Credential Exposure

#### Symptoms
- Credentials visible in logs
- Credentials stored in plain text
- Unauthorized access to processor accounts

#### Solutions
1. **Credential Encryption**:
```python
# Encrypt sensitive connection data
from cryptography.fernet import Fernet
import os

def encrypt_connection_data(data):
    key = os.environ.get('ENCRYPTION_KEY').encode()
    fernet = Fernet(key)
    encrypted_data = fernet.encrypt(json.dumps(data).encode())
    return encrypted_data

def decrypt_connection_data(encrypted_data):
    key = os.environ.get('ENCRYPTION_KEY').encode()
    fernet = Fernet(key)
    decrypted_data = fernet.decrypt(encrypted_data)
    return json.loads(decrypted_data.decode())
```

2. **Secure Logging**:
```python
# Remove sensitive data from logs
import logging
import re

class SensitiveDataFilter(logging.Filter):
    def filter(self, record):
        # Remove access tokens from log messages
        if hasattr(record, 'msg'):
            record.msg = re.sub(
                r'(access_token|api_key|secret)["\s]*[:=]["\s]*[a-zA-Z0-9_-]+',
                r'\1": "[REDACTED]"',
                str(record.msg)
            )
        return True

# Add filter to all loggers
for logger_name in logging.Logger.manager.loggerDict:
    logger = logging.getLogger(logger_name)
    logger.addFilter(SensitiveDataFilter())
```

### 2. Webhook Security Issues

#### Symptoms
- Webhook signature verification failing
- Unauthorized webhook calls
- Webhook replay attacks

#### Solutions
1. **Signature Verification**:
```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    """Verify webhook signature to ensure authenticity."""
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Use constant-time comparison to prevent timing attacks
    return hmac.compare_digest(f"sha256={expected_signature}", signature)
```

2. **Webhook Replay Protection**:
```python
from datetime import datetime, timedelta

def check_webhook_timestamp(timestamp_header, tolerance_seconds=300):
    """Check webhook timestamp to prevent replay attacks."""
    try:
        webhook_time = datetime.fromtimestamp(int(timestamp_header))
        current_time = datetime.now()
        
        if abs((current_time - webhook_time).total_seconds()) > tolerance_seconds:
            return False
        return True
    except (ValueError, TypeError):
        return False
```

## 📋 Maintenance Procedures

### Daily Maintenance

```bash
#!/bin/bash
# Daily hybrid payment system maintenance

echo "🔍 Daily Hybrid Payment System Maintenance - $(date)"

# 1. Check system health
python hybrid_payment_health_check.py

# 2. Sync external transactions
python -c "
from services.external_payment_service import ExternalPaymentService
from database import get_db
service = ExternalPaymentService(next(get_db()))
service.sync_all_connections()
"

# 3. Process pending collections
python -c "
from services.platform_collection_service import PlatformCollectionService
from database import get_db
service = PlatformCollectionService(next(get_db()))
service.process_pending_collections()
"

# 4. Update analytics cache
python -c "
from services.unified_payment_analytics_service import UnifiedPaymentAnalyticsService
from database import get_db
service = UnifiedPaymentAnalyticsService(next(get_db()))
service.refresh_analytics_cache()
"

# 5. Clean up old logs
find /var/log/bookedbarber/ -name "*.log" -mtime +30 -delete

echo "✅ Daily maintenance completed"
```

### Weekly Maintenance

```bash
#!/bin/bash
# Weekly hybrid payment system maintenance

echo "🔧 Weekly Hybrid Payment System Maintenance - $(date)"

# 1. Reconcile all payment data
python reconcile_payment_data.py --period=7days

# 2. Update external processor connection health
python update_connection_health.py

# 3. Archive old transaction data
python archive_old_transactions.py --days=90

# 4. Generate weekly analytics report
python generate_weekly_report.py

# 5. Check for stuck collections
python check_stuck_collections.py

# 6. Validate webhook configurations
python validate_webhook_configs.py

echo "✅ Weekly maintenance completed"
```

### Monthly Maintenance

```bash
#!/bin/bash
# Monthly hybrid payment system maintenance

echo "📊 Monthly Hybrid Payment System Maintenance - $(date)"

# 1. Performance analysis
python analyze_payment_performance.py --period=30days

# 2. Security audit
python security_audit.py

# 3. Capacity planning review
python capacity_planning.py

# 4. Update processor fee structures
python update_processor_fees.py

# 5. Commission rate optimization analysis
python analyze_commission_rates.py

# 6. Database maintenance
psql -d production_db -c "VACUUM ANALYZE;"
psql -d production_db -c "REINDEX DATABASE production_db;"

echo "✅ Monthly maintenance completed"
```

## 📚 Additional Resources

- [System Documentation](./HYBRID_PAYMENT_SYSTEM.md)
- [Migration Guide](./HYBRID_PAYMENT_MIGRATION_GUIDE.md)
- [API Reference](./HYBRID_PAYMENT_API_REFERENCE.md)
- [Integration Examples](./examples/)

## 🆘 Support Escalation

### Level 1: Self-Service
1. Check this troubleshooting guide
2. Run health check scripts
3. Review system logs
4. Check API documentation

### Level 2: System Administrator
1. Database access required
2. Server configuration changes
3. External processor account issues
4. Performance optimization

### Level 3: Development Team
1. Code-level debugging required
2. Architecture changes needed
3. External processor integration issues
4. Security vulnerabilities

### Emergency Contacts
- **Payment Processing Down**: Immediate escalation to Level 3
- **Security Issues**: Immediate escalation to Level 3
- **Data Integrity Issues**: Immediate escalation to Level 2

---

**Troubleshooting Guide Version**: 1.0.0  
**Last Updated**: 2025-07-22  
**Compatible with**: BookedBarber V2.1.0+