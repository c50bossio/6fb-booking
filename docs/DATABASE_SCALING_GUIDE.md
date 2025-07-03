# 🗄️ Database Scaling Guide for BookedBarber V2

This guide covers database optimization and connection pooling setup for production deployment.

## 📊 Current vs Target Performance

| Metric | Current | Target | Solution |
|--------|---------|--------|----------|
| Concurrent Connections | 20-50 | 1000+ | Connection Pooling |
| Query Response Time | Unknown | < 50ms | Indexes + Caching |
| Read Throughput | Single DB | 10K QPS | Read Replicas |
| Write Throughput | Limited | 1K TPS | Write Optimization |

## 🔧 Connection Pooling Architecture

### Two-Layer Pooling Strategy
1. **Application Layer**: SQLAlchemy connection pool (implemented)
2. **Database Layer**: PgBouncer connection pooler (recommended)

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   FastAPI   │────▶│  PgBouncer  │────▶│  PostgreSQL  │
│  (Pool: 20) │     │ (Pool: 100) │     │   Primary    │
└─────────────┘     └─────────────┘     └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │ Read Replica │
                    └──────────────┘
```

## 🚀 Implementation Steps

### Step 1: Update Application Connection Pooling ✅
Already implemented in `database.py`:
- Pool size: 20 connections
- Max overflow: 40 connections
- Connection recycling: 1 hour
- Pre-ping enabled for health checks

### Step 2: Install PgBouncer
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install pgbouncer

# Amazon Linux/RHEL
sudo yum install pgbouncer

# Docker
docker run -d \
  --name pgbouncer \
  -p 6432:6432 \
  -v /path/to/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini \
  -v /path/to/userlist.txt:/etc/pgbouncer/userlist.txt \
  bitnami/pgbouncer:latest
```

### Step 3: Configure PgBouncer
Use the provided `backend-v2/config/pgbouncer.ini` configuration.

Create user authentication file:
```bash
# Generate MD5 password
echo -n "md5"; echo -n "passwordbookedbarber_app" | md5sum | cut -d' ' -f1

# Create userlist.txt
echo '"bookedbarber_app" "md5<hash>"' > /etc/pgbouncer/userlist.txt
```

### Step 4: Update Application Connection
```python
# .env file
# Change from direct PostgreSQL connection
DATABASE_URL=postgresql://user:pass@localhost:5432/bookedbarber

# To PgBouncer connection
DATABASE_URL=postgresql://user:pass@localhost:6432/bookedbarber
```

### Step 5: Database Indexes
Create these indexes for optimal performance:

```sql
-- Core performance indexes
CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, appointment_date);
CREATE INDEX idx_appointments_client_date ON appointments(client_id, appointment_date);
CREATE INDEX idx_appointments_status_date ON appointments(status, appointment_date);
CREATE INDEX idx_appointments_location ON appointments(location_id);

-- Payment indexes
CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_user_date ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);

-- User/auth indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users(location_id);

-- Analytics indexes
CREATE INDEX idx_analytics_barber_date ON analytics_events(barber_id, event_date);
CREATE INDEX idx_analytics_type_date ON analytics_events(event_type, event_date);

-- Review management indexes
CREATE INDEX idx_reviews_location_date ON reviews(location_id, created_at DESC);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

### Step 6: Query Optimization
Monitor and optimize slow queries:

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = '1000'; -- Log queries > 1 second

-- Check for missing indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

## 📈 Monitoring Setup

### PgBouncer Statistics
```sql
-- Connect to PgBouncer admin
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer

-- Show pool statistics
SHOW POOLS;

-- Show client connections
SHOW CLIENTS;

-- Show server connections
SHOW SERVERS;
```

### PostgreSQL Monitoring
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Connection states
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;

-- Long running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

## 🔄 Read Replica Setup

### Step 1: Create Read Replica
```bash
# AWS RDS
aws rds create-db-instance-read-replica \
  --db-instance-identifier bookedbarber-read-replica \
  --source-db-instance-identifier bookedbarber-prod

# Manual PostgreSQL
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -v -P -W
```

### Step 2: Configure Application for Read/Write Split
```python
# services/database_service.py
class DatabaseService:
    def __init__(self):
        self.write_engine = create_engine(settings.database_url, **pool_settings)
        self.read_engine = create_engine(settings.read_replica_url, **pool_settings)
    
    def get_read_session(self):
        return sessionmaker(bind=self.read_engine)()
    
    def get_write_session(self):
        return sessionmaker(bind=self.write_engine)()
```

## 🎯 Performance Benchmarks

### Expected Results After Implementation
- **Connection Pool Efficiency**: 95%+ connection reuse
- **Query Response Time**: < 50ms for indexed queries
- **Concurrent Users**: Support 10,000+ active sessions
- **Database CPU**: < 70% under normal load
- **Connection Overhead**: < 5ms with PgBouncer

### Load Testing Commands
```bash
# Test connection pooling
pgbench -h localhost -p 6432 -U bookedbarber_app -d bookedbarber \
  -c 100 -j 10 -t 1000 -f custom_script.sql

# Monitor during test
watch -n 1 'psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW POOLS;"'
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Pool Exhaustion**
   - Symptom: "QueuePool limit exceeded"
   - Solution: Increase pool_size or investigate connection leaks

2. **PgBouncer Authentication Failed**
   - Symptom: "no such user"
   - Solution: Check userlist.txt MD5 hashes

3. **Slow Queries After Pooling**
   - Symptom: Increased latency
   - Solution: Check for missing indexes, enable query plan caching

4. **Connection Timeouts**
   - Symptom: "timeout expired"
   - Solution: Adjust pool_timeout and server_connect_timeout

## 📚 Additional Resources

- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [SQLAlchemy Pool Documentation](https://docs.sqlalchemy.org/en/14/core/pooling.html)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Last Updated**: 2025-07-02
**Version**: 1.0