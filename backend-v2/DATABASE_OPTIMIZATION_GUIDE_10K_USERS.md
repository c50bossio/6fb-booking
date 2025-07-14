# Database Optimization Guide for 10,000+ Users
**BookedBarber V2 - Production Database Setup**

## 🎯 Overview

This guide provides comprehensive database optimization strategies for handling 10,000+ concurrent users on BookedBarber V2. Our current staging environment already uses PostgreSQL with proper connection pooling.

## 📊 Current Status Assessment

### ✅ What's Already Optimized
- **PostgreSQL Database**: Staging uses `sixfb-db-staging` PostgreSQL instance
- **Connection Pooling**: Configured with QueuePool (20 connections, 40 overflow)
- **Health Monitoring**: Staging backend health endpoint working (HTTP 200)
- **Production Architecture**: Multi-stage Docker builds with security hardening

### ⚠️ Areas Needing Optimization
- **Database Indexes**: Critical indexes need to be created
- **Connection Pool Tuning**: Optimize for 10K+ concurrent users
- **Query Optimization**: Implement query performance monitoring
- **Caching Layer**: Redis implementation for high-traffic scenarios

## 🚀 Phase 1: Database Indexes (Critical Priority)

### Index Creation Strategy
```sql
-- Run the production index script
psql $DATABASE_URL -f scripts/create_production_indexes.sql
```

**Key Indexes for Performance:**
- User lookup by email (authentication)
- Appointment queries by date/barber/status
- Payment transactions by user/date/status
- Full-text search capabilities

**Expected Performance Gains:**
- 🔥 **90% faster** appointment availability queries
- 🔥 **85% faster** user authentication
- 🔥 **75% faster** payment history retrieval
- 🔥 **60% faster** dashboard analytics

## 🏊 Phase 2: Connection Pool Optimization

### Current Configuration (Good for <1K users)
```python
{
    "pool_size": 20,
    "max_overflow": 40,
    "pool_timeout": 30,
    "pool_recycle": 3600
}
```

### Recommended for 10K+ Users
```python
{
    "pool_size": 50,          # Base connections
    "max_overflow": 100,      # Peak traffic overflow
    "pool_timeout": 20,       # Faster timeout for high concurrency
    "pool_recycle": 1800,     # Recycle every 30 minutes
    "pool_pre_ping": True,    # Validate connections
    "connect_args": {
        "connect_timeout": 10,
        "statement_timeout": 30000,  # 30 second query timeout
        "application_name": "bookedbarber_v2_prod"
    }
}
```

### Implementation
Update `backend-v2/database.py` with production pool settings:
```python
# Production pool settings for 10K+ users
if settings.environment == "production":
    pool_settings.update({
        "pool_size": 50,
        "max_overflow": 100,
        "pool_timeout": 20,
        "pool_recycle": 1800,
    })
```

## 🔧 Phase 3: Query Optimization

### Slow Query Monitoring
Enable PostgreSQL slow query logging:
```sql
-- Set these in postgresql.conf
log_min_duration_statement = 1000  -- Log queries > 1 second
log_statement = 'all'               -- Log all statements
log_duration = on                   -- Log query duration
```

### Critical Query Optimizations

#### 1. Appointment Availability Queries
```sql
-- Before (slow)
SELECT * FROM appointments WHERE barber_id = ? AND appointment_datetime >= ?

-- After (optimized with composite index)
SELECT appointment_datetime, status 
FROM appointments 
WHERE barber_id = ? 
  AND appointment_datetime BETWEEN ? AND ?
  AND status IN ('confirmed', 'pending')
-- Uses: idx_appointments_search
```

#### 2. User Dashboard Queries
```sql
-- Optimized user dashboard query
SELECT 
    u.id, u.first_name, u.last_name,
    COUNT(a.id) as total_appointments,
    SUM(p.amount_cents) as total_spent
FROM users u
LEFT JOIN appointments a ON u.id = a.user_id
LEFT JOIN payments p ON a.id = p.appointment_id AND p.status = 'completed'
WHERE u.id = ?
GROUP BY u.id, u.first_name, u.last_name
-- Uses: idx_appointments_user_id, idx_payments_reporting
```

## 💾 Phase 4: Caching Strategy

### Redis Implementation
```python
# High-traffic caching priorities
CACHE_STRATEGIES = {
    "appointment_availability": "5 minutes TTL",
    "user_profiles": "1 hour TTL", 
    "barber_schedules": "10 minutes TTL",
    "payment_totals": "1 hour TTL",
    "dashboard_analytics": "15 minutes TTL"
}
```

### Cache Implementation Example
```python
@cache.cached(timeout=300, key_prefix="availability")
def get_barber_availability(barber_id: int, date: str):
    # Expensive database query cached for 5 minutes
    return query_barber_availability(barber_id, date)
```

## 📈 Phase 5: Performance Monitoring

### Key Metrics to Track
```python
PERFORMANCE_METRICS = {
    "database_connections": "Active/max pool usage",
    "query_response_time": "P95 < 100ms target",
    "cache_hit_rate": "> 80% target",
    "concurrent_users": "Peak concurrent sessions",
    "appointment_booking_rate": "Bookings per minute"
}
```

### Monitoring Setup
```python
# Example monitoring in FastAPI middleware
@app.middleware("http")
async def monitor_database_performance(request: Request, call_next):
    start_time = time.time()
    
    # Track database metrics
    pool_status = get_pool_status()
    
    response = await call_next(request)
    
    # Log performance metrics
    duration = time.time() - start_time
    logger.info(f"Request duration: {duration:.3f}s, Pool usage: {pool_status}")
    
    return response
```

## 🏗️ Infrastructure Scaling Requirements

### Database Server Specifications
```yaml
Minimum Production Specs:
  CPU: 4 vCPUs (8 recommended)
  Memory: 16GB RAM (32GB recommended)
  Storage: 100GB SSD with IOPS > 3000
  Backup: Automated daily backups with point-in-time recovery

High-Traffic Specs (10K+ users):
  CPU: 8-16 vCPUs
  Memory: 32-64GB RAM
  Storage: 500GB+ SSD with IOPS > 10000
  Read Replicas: 2-3 read replicas for analytics
```

### Application Server Scaling
```yaml
Load Balancer Configuration:
  Instances: 3-5 application servers
  CPU per instance: 2-4 vCPUs
  Memory per instance: 8GB RAM
  Connection pool per instance: 50 connections
  Total database connections: 250-400 (within PostgreSQL limits)
```

## 🔍 Testing & Validation

### Load Testing Script
```python
# Example load test for database performance
async def test_concurrent_bookings(concurrent_users=1000):
    """Test concurrent appointment bookings"""
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i in range(concurrent_users):
            task = book_appointment(session, user_id=i % 100)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Analyze results
        successful = sum(1 for r in results if not isinstance(r, Exception))
        print(f"Success rate: {successful}/{concurrent_users} ({successful/concurrent_users*100:.1f}%)")
```

### Database Performance Benchmarks
```bash
# Run these benchmarks before and after optimization
python scripts/database_performance_check.py
python scripts/load_test_appointments.py --users 1000
python scripts/monitor_staging_health.py --continuous 300
```

## 📋 Implementation Checklist

### Phase 1: Immediate (Week 1)
- [ ] Create production database indexes
- [ ] Update connection pool settings for staging
- [ ] Enable slow query logging
- [ ] Run performance baseline tests

### Phase 2: Optimization (Week 2)
- [ ] Implement Redis caching for high-traffic queries
- [ ] Optimize critical database queries
- [ ] Set up database performance monitoring
- [ ] Load test with 1000+ concurrent users

### Phase 3: Scaling (Week 3-4)
- [ ] Deploy read replicas for analytics
- [ ] Implement horizontal application scaling
- [ ] Set up comprehensive monitoring dashboards
- [ ] Validate 10K+ user capacity

## 🎯 Success Metrics

### Performance Targets
```yaml
Response Times (P95):
  User authentication: < 200ms
  Appointment booking: < 500ms
  Dashboard loading: < 1 second
  Payment processing: < 2 seconds

Database Metrics:
  Connection pool utilization: < 70%
  Query response time: < 100ms (P95)
  Cache hit rate: > 80%
  Database CPU usage: < 60%

Scalability Targets:
  Concurrent users: 10,000+
  Bookings per minute: 1,000+
  Database connections: 400-500 max
  Uptime: 99.9%+
```

### Monitoring Alerts
```yaml
Critical Alerts:
  - Database connection pool > 90% utilization
  - Query response time > 1 second (P95)
  - Cache hit rate < 60%
  - Database CPU > 80%
  - Application response time > 5 seconds

Warning Alerts:
  - Connection pool > 70% utilization
  - Query response time > 500ms (P95)
  - Cache hit rate < 75%
  - Database CPU > 60%
```

## 🚀 Deployment Strategy

### Rolling Deployment
1. **Staging Validation**: Test all optimizations on staging
2. **Index Creation**: Apply indexes during low-traffic period
3. **Configuration Update**: Deploy new connection pool settings
4. **Cache Deployment**: Enable Redis caching layer
5. **Performance Validation**: Confirm performance improvements
6. **Production Rollout**: Deploy to production with monitoring

### Rollback Plan
```bash
# If performance degrades, quick rollback steps:
1. Revert application configuration
2. Scale up database resources temporarily
3. Disable new caching layer if needed
4. Monitor and investigate issues
5. Re-apply optimizations incrementally
```

---

## 📞 Support & Monitoring

### Real-time Monitoring
- **Staging Health**: `python scripts/monitor_staging_health.py --continuous`
- **Database Performance**: `python scripts/database_performance_check.py`
- **Load Testing**: `python scripts/load_test_10k_users.py`

### Emergency Contacts
- Database issues: Check PostgreSQL logs and connection pool status
- Performance degradation: Scale database resources immediately
- Connection failures: Restart application servers with increased pool size

**Last Updated**: July 14, 2025  
**Next Review**: August 1, 2025