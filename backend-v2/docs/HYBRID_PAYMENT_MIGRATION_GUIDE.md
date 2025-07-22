# 🔄 Hybrid Payment System Migration Guide

## 🎯 Migration Overview

This guide provides step-by-step instructions for migrating from the traditional centralized payment system to the new hybrid payment system. The migration supports both automated and manual approaches, ensuring zero downtime and complete data integrity.

## 📋 Pre-Migration Checklist

### System Requirements
- [ ] BookedBarber V2 backend running latest version
- [ ] Database backup completed and verified
- [ ] All Alembic migrations up to date
- [ ] Test environment validated with hybrid payment system
- [ ] External payment processor accounts ready (if using decentralized mode)
- [ ] Stripe Connect account configured and active

### Environment Setup
- [ ] Environment variables configured for hybrid payments
- [ ] API keys for external processors securely stored
- [ ] Webhook endpoints configured and accessible
- [ ] SSL certificates valid and current
- [ ] Load balancer configuration updated (if applicable)

### Data Backup
- [ ] Complete database backup
- [ ] Configuration files backup
- [ ] API keys and secrets backup (securely)
- [ ] Transaction history export
- [ ] Analytics data export

## 🗄️ Database Migration

### Automatic Migration (Recommended)

The hybrid payment system includes Alembic migrations that automatically create the required tables and relationships.

```bash
# 1. Backup current database
pg_dump bookedbarber_prod > backup_pre_hybrid_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply hybrid payment migrations
cd backend-v2
alembic upgrade head

# 3. Verify migration success
python -c "from database import engine; from models.hybrid_payment import PaymentProcessorConnection; print('Migration successful')"
```

### Manual Migration (If Required)

If automatic migration fails or custom modifications are needed:

```sql
-- Create payment processor connections table
CREATE TABLE payment_processor_connections (
    id SERIAL PRIMARY KEY,
    barber_id INTEGER REFERENCES users(id) NOT NULL,
    processor_type VARCHAR(50) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Connection data (will be encrypted)
    connection_data JSONB,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    
    -- Capabilities
    supports_payments BOOLEAN DEFAULT true,
    supports_refunds BOOLEAN DEFAULT true,
    supports_recurring BOOLEAN DEFAULT false,
    default_currency VARCHAR(3) DEFAULT 'USD',
    processing_fees JSONB,
    
    -- Operational data
    last_sync_at TIMESTAMP,
    last_transaction_at TIMESTAMP,
    total_transactions INTEGER DEFAULT 0,
    total_volume DECIMAL(12,2) DEFAULT 0.00,
    
    -- Audit fields
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(barber_id, processor_type, account_id)
);

-- Create external transactions table
CREATE TABLE external_transactions (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES payment_processor_connections(id),
    processor_type VARCHAR(50) NOT NULL,
    external_transaction_id VARCHAR(255) NOT NULL,
    
    -- Transaction details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    
    -- BookedBarber context
    barber_id INTEGER REFERENCES users(id),
    appointment_id INTEGER REFERENCES appointments(id),
    client_id INTEGER REFERENCES clients(id),
    
    -- External processor data
    external_customer_id VARCHAR(255),
    external_metadata JSONB,
    processor_fees DECIMAL(10,2),
    
    -- Reconciliation
    reconciled_at TIMESTAMP,
    reconciliation_status VARCHAR(50),
    
    -- Audit fields
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(processor_type, external_transaction_id)
);

-- Create platform collections table
CREATE TABLE platform_collections (
    id SERIAL PRIMARY KEY,
    barber_id INTEGER REFERENCES users(id) NOT NULL,
    
    -- Collection details
    amount DECIMAL(10,2) NOT NULL,
    collection_type VARCHAR(50) DEFAULT 'commission',
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Related transactions
    external_transaction_ids JSONB NOT NULL,
    commission_rate DECIMAL(5,2),
    
    -- Collection metadata
    due_date TIMESTAMP,
    collection_method VARCHAR(50),
    
    -- Processing details
    stripe_invoice_id VARCHAR(255),
    payment_intent_id VARCHAR(255),
    collected_at TIMESTAMP,
    failed_reason TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create hybrid payment configs table
CREATE TABLE hybrid_payment_configs (
    id SERIAL PRIMARY KEY,
    barber_id INTEGER REFERENCES users(id) UNIQUE,
    
    -- Payment mode configuration
    payment_mode VARCHAR(50) DEFAULT 'centralized',
    preferred_processor VARCHAR(50),
    fallback_enabled BOOLEAN DEFAULT true,
    
    -- Business rules
    min_external_amount DECIMAL(10,2),
    max_platform_amount DECIMAL(10,2),
    split_threshold DECIMAL(10,2),
    
    -- Commission settings
    commission_rate DECIMAL(5,2),
    commission_collection_frequency VARCHAR(50),
    auto_collection_enabled BOOLEAN DEFAULT true,
    
    -- Operational settings
    webhook_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    analytics_enabled BOOLEAN DEFAULT true,
    
    -- Audit fields
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_external_transactions_barber_id ON external_transactions(barber_id);
CREATE INDEX idx_external_transactions_status ON external_transactions(status);
CREATE INDEX idx_external_transactions_created_at ON external_transactions(created_at);
CREATE INDEX idx_platform_collections_barber_id ON platform_collections(barber_id);
CREATE INDEX idx_platform_collections_status ON platform_collections(status);
CREATE INDEX idx_payment_processor_connections_barber_id ON payment_processor_connections(barber_id);
```

### User Table Updates

Add hybrid payment fields to the existing users table:

```sql
-- Add payment mode columns to users table
ALTER TABLE users 
ADD COLUMN payment_mode VARCHAR(50) DEFAULT 'centralized',
ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.20,
ADD COLUMN external_payment_processor VARCHAR(50),
ADD COLUMN external_account_config JSONB;

-- Update existing barbers with default configuration
UPDATE users 
SET payment_mode = 'centralized',
    commission_rate = 0.20
WHERE role = 'barber';
```

## 🔧 Configuration Migration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Hybrid Payment Configuration
HYBRID_PAYMENTS_ENABLED=true
DEFAULT_PAYMENT_MODE=centralized
DEFAULT_COMMISSION_RATE=0.20

# External Payment Processors
EXTERNAL_STRIPE_ENABLED=true
EXTERNAL_SQUARE_ENABLED=true
EXTERNAL_PAYPAL_ENABLED=true

# Square Configuration (if using Square)
SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_SANDBOX=true  # Set to false for production

# PayPal Configuration (if using PayPal)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SANDBOX=true  # Set to false for production

# Webhook Configuration
WEBHOOK_BASE_URL=https://your-domain.com
WEBHOOK_SECRET_KEY=your_secure_webhook_secret

# Collection Settings
COMMISSION_COLLECTION_FREQUENCY=weekly
AUTO_COLLECTION_ENABLED=true
MINIMUM_COLLECTION_AMOUNT=25.00

# Analytics
UNIFIED_ANALYTICS_ENABLED=true
SIX_FIGURE_INSIGHTS_ENABLED=true
```

### Application Configuration

Update your application configuration to enable hybrid payments:

```python
# config.py updates
class Settings:
    # ... existing settings ...
    
    # Hybrid Payment Settings
    hybrid_payments_enabled: bool = True
    default_payment_mode: str = "centralized"
    default_commission_rate: float = 0.20
    
    # External Processors
    external_stripe_enabled: bool = True
    external_square_enabled: bool = True
    external_paypal_enabled: bool = True
    
    # Collection Settings
    commission_collection_frequency: str = "weekly"
    auto_collection_enabled: bool = True
    minimum_collection_amount: float = 25.00
    
    # Analytics
    unified_analytics_enabled: bool = True
    six_figure_insights_enabled: bool = True
```

## 🚀 Service Deployment

### Backend Service Updates

1. **Deploy New Services**:
```bash
# Ensure all new services are available
python -c "
from services.hybrid_payment_router import HybridPaymentRouter
from services.external_payment_service import ExternalPaymentService
from services.platform_collection_service import PlatformCollectionService
from services.unified_payment_analytics_service import UnifiedPaymentAnalyticsService
print('All hybrid payment services loaded successfully')
"
```

2. **Update API Routes**:
```bash
# Verify new API endpoints are accessible
curl -X GET http://localhost:8000/api/v1/hybrid-payments/my-options \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

3. **Configure Webhooks**:
```bash
# Set up webhook endpoints for external processors
# Example for Square:
curl -X POST https://connect.squareup.com/v2/webhooks \
  -H "Authorization: Bearer YOUR_SQUARE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "name": "BookedBarber Payment Notifications",
      "event_types": ["payment.created", "payment.updated"],
      "notification_url": "https://your-domain.com/api/v1/webhooks/square"
    }
  }'
```

### Frontend Integration

Update frontend components to support hybrid payments:

```typescript
// Add to your payment component
import { HybridPaymentService } from '@/lib/api/hybrid-payments';

const processPayment = async (appointmentId: number, amount: number) => {
  try {
    // Get payment options for the barber
    const options = await HybridPaymentService.getPaymentOptions(barberId);
    
    // Route and process payment
    const result = await HybridPaymentService.processPayment({
      appointment_id: appointmentId,
      amount: amount,
      currency: 'USD'
    });
    
    console.log('Payment processed:', result);
  } catch (error) {
    console.error('Payment failed:', error);
  }
};
```

## 📊 Data Migration

### Historical Data Migration

Migrate existing payment data to maintain analytics continuity:

```python
# Migration script: migrate_payment_history.py
from sqlalchemy.orm import Session
from database import get_db
from models import Payment
from models.hybrid_payment import ExternalTransaction
from datetime import datetime

def migrate_payment_history():
    """Migrate existing payments to external transactions for analytics."""
    db = next(get_db())
    
    # Get all completed payments
    payments = db.query(Payment).filter(Payment.status == 'completed').all()
    
    migrated_count = 0
    for payment in payments:
        # Create corresponding external transaction record for analytics
        # This maintains historical continuity in unified analytics
        external_tx = ExternalTransaction(
            connection_id=None,  # Legacy data
            processor_type='stripe',  # Existing platform processor
            external_transaction_id=f"legacy_{payment.stripe_payment_intent_id}",
            amount=payment.amount,
            currency='USD',
            status='completed',
            barber_id=payment.barber_id,
            appointment_id=payment.appointment_id,
            processed_at=payment.created_at,
            created_at=payment.created_at
        )
        
        db.add(external_tx)
        migrated_count += 1
        
        if migrated_count % 100 == 0:
            db.commit()
            print(f"Migrated {migrated_count} payment records...")
    
    db.commit()
    print(f"Migration complete. Migrated {migrated_count} payment records.")

if __name__ == "__main__":
    migrate_payment_history()
```

### Configuration Data Migration

Migrate existing barber configurations:

```python
# Migration script: migrate_barber_configs.py
from sqlalchemy.orm import Session
from database import get_db
from models import User
from models.hybrid_payment import HybridPaymentConfig

def migrate_barber_configs():
    """Create default hybrid payment configs for existing barbers."""
    db = next(get_db())
    
    # Get all barbers
    barbers = db.query(User).filter(User.role == 'barber').all()
    
    for barber in barbers:
        # Check if config already exists
        existing_config = db.query(HybridPaymentConfig).filter(
            HybridPaymentConfig.barber_id == barber.id
        ).first()
        
        if not existing_config:
            # Create default configuration
            config = HybridPaymentConfig(
                barber_id=barber.id,
                payment_mode='centralized',  # Start with centralized
                fallback_enabled=True,
                commission_rate=barber.commission_rate or 0.20,
                commission_collection_frequency='weekly',
                auto_collection_enabled=True,
                webhook_notifications=True,
                email_notifications=True,
                analytics_enabled=True
            )
            
            db.add(config)
    
    db.commit()
    print(f"Created hybrid payment configs for {len(barbers)} barbers.")

if __name__ == "__main__":
    migrate_barber_configs()
```

## 🧪 Testing Migration

### Pre-Production Testing

1. **Database Migration Test**:
```bash
# Test migration on staging database
pg_dump production_db > staging_backup.sql
createdb staging_hybrid_test
psql staging_hybrid_test < staging_backup.sql

# Apply migrations
cd backend-v2
ENV=staging alembic upgrade head

# Verify migration
python verify_migration.py
```

2. **Service Integration Test**:
```bash
# Run comprehensive test suite
pytest tests/integration/test_hybrid_payment_system_comprehensive.py -v

# Test specific migration scenarios
python test_migration_scenarios.py
```

3. **API Endpoint Test**:
```bash
# Test all new endpoints
curl -X GET http://localhost:8001/api/v1/hybrid-payments/my-options \
  -H "Authorization: Bearer STAGING_JWT_TOKEN"

curl -X POST http://localhost:8001/api/v1/hybrid-payments/route \
  -H "Authorization: Bearer STAGING_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appointment_id": 1, "amount": 50.00}'
```

### Load Testing

Test the system under production-like load:

```python
# load_test_hybrid_payments.py
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

async def test_payment_routing(session, appointment_id, amount):
    """Test payment routing endpoint."""
    url = "http://localhost:8001/api/v1/hybrid-payments/route"
    headers = {"Authorization": "Bearer TEST_TOKEN"}
    data = {"appointment_id": appointment_id, "amount": amount}
    
    async with session.post(url, json=data, headers=headers) as response:
        return await response.json()

async def run_load_test():
    """Run load test with multiple concurrent requests."""
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i in range(100):
            task = test_payment_routing(session, i % 10 + 1, 50.00)
            tasks.append(task)
        
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()
        
        successful = sum(1 for r in results if not isinstance(r, Exception))
        print(f"Completed {successful}/100 requests in {end_time - start_time:.2f}s")

if __name__ == "__main__":
    asyncio.run(run_load_test())
```

## 📈 Migration Monitoring

### Key Metrics to Monitor

1. **Payment Success Rates**:
   - Overall payment success rate
   - Success rate by processor type
   - Success rate by payment mode

2. **System Performance**:
   - API response times
   - Database query performance
   - External processor response times

3. **Business Metrics**:
   - Commission collection rates
   - Revenue by payment method
   - Barber adoption of new payment modes

### Monitoring Setup

```python
# monitoring/hybrid_payment_monitor.py
from datadog import initialize, statsd
from sqlalchemy.orm import Session
from database import get_db
from models.hybrid_payment import ExternalTransaction, PlatformCollection

class HybridPaymentMonitor:
    """Monitor hybrid payment system health and performance."""
    
    def __init__(self):
        initialize()
        self.db = next(get_db())
    
    def check_payment_success_rates(self):
        """Monitor payment success rates."""
        # Get recent payment success rates
        success_rate = self.db.query(ExternalTransaction).filter(
            ExternalTransaction.status == 'completed'
        ).count() / max(self.db.query(ExternalTransaction).count(), 1)
        
        statsd.gauge('hybrid_payments.success_rate', success_rate)
    
    def check_commission_collection_health(self):
        """Monitor commission collection system."""
        # Get pending collections
        pending_collections = self.db.query(PlatformCollection).filter(
            PlatformCollection.status == 'pending'
        ).count()
        
        statsd.gauge('hybrid_payments.pending_collections', pending_collections)
    
    def run_health_check(self):
        """Run complete health check."""
        self.check_payment_success_rates()
        self.check_commission_collection_health()
        
        print("Health check completed")

if __name__ == "__main__":
    monitor = HybridPaymentMonitor()
    monitor.run_health_check()
```

## ⚠️ Rollback Procedures

### Emergency Rollback

If critical issues are discovered after migration:

1. **Immediate Actions**:
```bash
# 1. Stop processing new payments through hybrid system
export HYBRID_PAYMENTS_ENABLED=false

# 2. Switch all barbers back to centralized mode
psql -d production_db -c "UPDATE users SET payment_mode = 'centralized' WHERE role = 'barber';"

# 3. Restart application servers
sudo systemctl restart bookedbarber-backend
```

2. **Database Rollback**:
```bash
# Restore from backup if necessary
pg_restore --clean --no-acl --no-owner -d production_db backup_pre_hybrid_YYYYMMDD_HHMMSS.sql
```

3. **Configuration Rollback**:
```bash
# Revert configuration changes
git checkout HEAD~1 -- backend-v2/.env
git checkout HEAD~1 -- backend-v2/config.py
```

### Partial Rollback

For non-critical issues, implement gradual rollback:

```python
# Gradual rollback script
def rollback_barber_to_centralized(barber_id: int):
    """Roll back specific barber to centralized mode."""
    db = next(get_db())
    
    # Update barber configuration
    barber = db.query(User).filter(User.id == barber_id).first()
    if barber:
        barber.payment_mode = 'centralized'
        
        # Update hybrid config
        config = db.query(HybridPaymentConfig).filter(
            HybridPaymentConfig.barber_id == barber_id
        ).first()
        if config:
            config.payment_mode = 'centralized'
            config.fallback_enabled = True
    
    db.commit()
    print(f"Rolled back barber {barber_id} to centralized mode")
```

## ✅ Post-Migration Validation

### Validation Checklist

1. **Database Integrity**:
   - [ ] All tables created successfully
   - [ ] Indexes applied correctly
   - [ ] Foreign key constraints working
   - [ ] Data migration completed without errors

2. **Service Functionality**:
   - [ ] All hybrid payment services operational
   - [ ] External processor connections working
   - [ ] Commission collection system functional
   - [ ] Analytics aggregation working correctly

3. **API Endpoints**:
   - [ ] All new endpoints accessible
   - [ ] Authentication working correctly
   - [ ] Rate limiting functional
   - [ ] Error handling working properly

4. **Business Logic**:
   - [ ] Payment routing working correctly
   - [ ] Commission calculations accurate
   - [ ] Analytics data consistent
   - [ ] Six Figure Barber insights functional

### Automated Validation

```python
# validation/post_migration_validation.py
import requests
from sqlalchemy.orm import Session
from database import get_db
from models.hybrid_payment import *

class PostMigrationValidator:
    """Validate hybrid payment system after migration."""
    
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {auth_token}"}
        self.db = next(get_db())
    
    def validate_database_schema(self):
        """Validate database schema is correct."""
        try:
            # Test that all tables exist and are accessible
            self.db.query(PaymentProcessorConnection).count()
            self.db.query(ExternalTransaction).count()
            self.db.query(PlatformCollection).count()
            self.db.query(HybridPaymentConfig).count()
            print("✅ Database schema validation passed")
            return True
        except Exception as e:
            print(f"❌ Database schema validation failed: {e}")
            return False
    
    def validate_api_endpoints(self):
        """Validate all API endpoints are functional."""
        endpoints = [
            "/api/v1/hybrid-payments/my-options",
            "/api/v1/external-payments/connections",
            "/api/v1/platform-collections/my-collections",
            "/api/v1/unified-payment-analytics/dashboard"
        ]
        
        all_passed = True
        for endpoint in endpoints:
            try:
                response = requests.get(
                    f"{self.base_url}{endpoint}",
                    headers=self.headers,
                    timeout=10
                )
                if response.status_code in [200, 401, 403]:  # 401/403 are ok for auth
                    print(f"✅ Endpoint {endpoint} accessible")
                else:
                    print(f"❌ Endpoint {endpoint} returned {response.status_code}")
                    all_passed = False
            except Exception as e:
                print(f"❌ Endpoint {endpoint} failed: {e}")
                all_passed = False
        
        return all_passed
    
    def validate_business_logic(self):
        """Validate core business logic is working."""
        try:
            # Test payment routing logic
            from services.hybrid_payment_router import HybridPaymentRouter
            router = HybridPaymentRouter(self.db)
            
            # This should not crash
            router._get_payment_configuration(1)
            print("✅ Business logic validation passed")
            return True
        except Exception as e:
            print(f"❌ Business logic validation failed: {e}")
            return False
    
    def run_complete_validation(self):
        """Run complete post-migration validation."""
        print("🔍 Running post-migration validation...")
        
        results = {
            "database_schema": self.validate_database_schema(),
            "api_endpoints": self.validate_api_endpoints(),
            "business_logic": self.validate_business_logic()
        }
        
        all_passed = all(results.values())
        
        if all_passed:
            print("🎉 All validation checks passed! Migration successful.")
        else:
            print("⚠️ Some validation checks failed. Review and fix issues.")
            
        return results

if __name__ == "__main__":
    validator = PostMigrationValidator(
        base_url="http://localhost:8000",
        auth_token="YOUR_TEST_TOKEN"
    )
    validator.run_complete_validation()
```

## 🎯 Migration Success Criteria

### Technical Success Criteria
- [ ] Zero data loss during migration
- [ ] All new tables and indexes created successfully
- [ ] All API endpoints responding correctly
- [ ] Payment processing working in all modes
- [ ] Commission collection system operational
- [ ] Analytics data aggregating correctly

### Business Success Criteria
- [ ] Existing barbers can continue accepting payments
- [ ] New payment modes available for configuration
- [ ] Commission collection automated and accurate
- [ ] Analytics showing unified data across payment methods
- [ ] Six Figure Barber insights functional

### Performance Success Criteria
- [ ] API response times under 500ms for 95th percentile
- [ ] Payment processing success rate > 99%
- [ ] Database query performance within acceptable limits
- [ ] External processor response times within SLA

## 📚 Additional Resources

- [Hybrid Payment System Documentation](./HYBRID_PAYMENT_SYSTEM.md)
- [API Reference Guide](./HYBRID_PAYMENT_API_REFERENCE.md)
- [Troubleshooting Guide](./HYBRID_PAYMENT_TROUBLESHOOTING.md)
- [Integration Examples](./examples/)

## 🆘 Migration Support

If you encounter issues during migration:

1. **Check Prerequisites**: Ensure all prerequisites are met
2. **Review Logs**: Check application and database logs for errors
3. **Validate Environment**: Ensure all environment variables are set correctly
4. **Test Components**: Test individual components before full integration
5. **Rollback if Necessary**: Use rollback procedures if critical issues occur

---

**Migration Version**: 1.0.0  
**Last Updated**: 2025-07-22  
**Compatibility**: BookedBarber V2.1.0+