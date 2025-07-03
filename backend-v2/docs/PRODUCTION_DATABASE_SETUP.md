# Production Database Setup Guide for BookedBarber V2

## Overview

This guide provides comprehensive recommendations for setting up and optimizing the database for production deployment of BookedBarber V2. The recommendations are based on analysis of actual query patterns and are designed to support 10,000+ concurrent users.

## Table of Contents

1. [Database Configuration](#database-configuration)
2. [Connection Pooling](#connection-pooling)
3. [Index Optimization](#index-optimization)
4. [Monitoring and Alerting](#monitoring-and-alerting)
5. [Backup and Recovery](#backup-and-recovery)
6. [Scaling Strategies](#scaling-strategies)
7. [Security Considerations](#security-considerations)
8. [Performance Tuning](#performance-tuning)

## Database Configuration

### PostgreSQL Configuration (postgresql.conf)

```ini
# Memory Configuration
shared_buffers = 256MB                    # 25% of available RAM for dedicated server
effective_cache_size = 768MB              # 75% of available RAM
work_mem = 4MB                            # Memory for sort operations
maintenance_work_mem = 64MB               # Memory for maintenance operations

# Connection Settings
max_connections = 200                     # Maximum concurrent connections
superuser_reserved_connections = 3       # Reserved for admin connections

# Write-Ahead Logging (WAL)
wal_buffers = 16MB                        # WAL buffer size
checkpoint_completion_target = 0.9        # Spread checkpoint I/O
checkpoint_timeout = 10min                # Maximum time between checkpoints

# Query Planning
default_statistics_target = 100           # Statistics detail level
random_page_cost = 1.1                   # Cost of random page access (SSD optimized)
effective_io_concurrency = 200           # Expected concurrent I/O operations (SSD)

# Logging
log_min_duration_statement = 1000         # Log queries > 1 second
log_checkpoints = on                      # Log checkpoint activity
log_connections = on                      # Log new connections
log_disconnections = on                   # Log disconnections
log_lock_waits = on                       # Log lock waits

# Background Writer
bgwriter_delay = 200ms                    # Background writer delay
bgwriter_lru_maxpages = 100              # Maximum pages per round
```

### Environment Variables

```bash
# Production Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/bookedbarber_prod
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=50
DB_POOL_TIMEOUT=30
DB_ENABLE_MONITORING=true
DB_SLOW_QUERY_THRESHOLD=1.0

# SSL Configuration
PGSSLMODE=require
PGSSLCERT=/path/to/client.crt
PGSSLKEY=/path/to/client.key
PGSSLROOTCERT=/path/to/ca.crt
```

## Connection Pooling

### Application-Level Pooling (SQLAlchemy)

Use the provided `ProductionDatabaseConfig` class with these settings:

```python
# Production Pool Configuration
POOL_SETTINGS = {
    'pool_size': 20,              # Base connections in pool
    'max_overflow': 50,           # Additional connections under load
    'pool_timeout': 30,           # Seconds to wait for connection
    'pool_recycle': 3600,         # Recycle connections every hour
    'pool_pre_ping': True,        # Verify connections before use
}

# Connection Parameters
CONNECT_ARGS = {
    'connect_timeout': 10,
    'statement_timeout': 30000,   # 30 second query timeout
    'idle_in_transaction_session_timeout': 60000,  # 1 minute idle timeout
    'application_name': 'BookedBarber_V2'
}
```

### External Connection Pooler (PgBouncer - Recommended)

```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
bookedbarber_prod = host=localhost port=5432 dbname=bookedbarber_prod

[pgbouncer]
pool_mode = transaction
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool sizes
default_pool_size = 25
max_client_conn = 200
max_db_connections = 50

# Timeouts
server_connect_timeout = 15
server_login_retry = 15
query_timeout = 30
query_wait_timeout = 120
client_idle_timeout = 0
server_idle_timeout = 600
server_lifetime = 3600

# Memory
listen_backlog = 128
tcp_keepalive = 1
tcp_keepcnt = 3
tcp_keepidle = 600
tcp_keepintvl = 30
```

## Index Optimization

### Critical Indexes (Already in Migration)

The migration `optimize_appointments_indexes_20250702.py` creates these essential indexes:

```sql
-- Most critical for slot availability
CREATE INDEX idx_appointments_start_time_status ON appointments (start_time, status);
CREATE INDEX idx_appointments_barber_start_time_status ON appointments (barber_id, start_time, status);

-- User appointment listings
CREATE INDEX idx_appointments_user_start_time_status ON appointments (user_id, start_time, status);

-- Conflict detection
CREATE INDEX idx_appointments_barber_start_duration ON appointments (barber_id, start_time, duration_minutes);

-- Partial indexes for active appointments only
CREATE INDEX idx_appointments_active_start_time ON appointments (start_time, barber_id) 
WHERE status IN ('pending', 'confirmed', 'scheduled');
```

### Additional Production Indexes

```sql
-- For analytics and reporting
CREATE INDEX CONCURRENTLY idx_appointments_monthly_stats 
ON appointments (date_trunc('month', start_time), status, barber_id);

-- For payment reconciliation
CREATE INDEX CONCURRENTLY idx_payments_settlement_batch 
ON payments (created_at, status, barber_id) 
WHERE status IN ('completed', 'refunded');

-- For audit logging
CREATE INDEX CONCURRENTLY idx_audit_logs_entity_timestamp 
ON audit_logs (entity_type, entity_id, timestamp DESC);
```

### Index Maintenance

```sql
-- Weekly index maintenance (run during low-traffic periods)
REINDEX INDEX CONCURRENTLY idx_appointments_start_time_status;
ANALYZE appointments;

-- Monthly statistics update
UPDATE pg_stat_reset_shared('bgwriter');
SELECT pg_stat_reset();
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Connection Pool Metrics**
   - Pool utilization (alert at 80%)
   - Connection wait times (alert at >5 seconds)
   - Connection failures

2. **Query Performance**
   - Slow query count (alert at >10/minute)
   - Average query response time (alert at >1 second)
   - Query timeout errors

3. **Database Health**
   - Cache hit ratio (alert below 95%)
   - Lock waits (alert at >10/minute)
   - Deadlocks (alert at >1/hour)

4. **System Resources**
   - CPU utilization (alert at >70%)
   - Memory usage (alert at >80%)
   - Disk I/O wait (alert at >20%)

### Monitoring Queries

```sql
-- Active connections by state
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE datname = 'bookedbarber_prod' 
GROUP BY state;

-- Top slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC 
LIMIT 10;

-- Index usage efficiency
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND idx_scan = 0;  -- Unused indexes

-- Database size monitoring
SELECT 
    pg_size_pretty(pg_database_size('bookedbarber_prod')) as db_size,
    pg_size_pretty(pg_total_relation_size('appointments')) as appointments_size,
    pg_size_pretty(pg_total_relation_size('payments')) as payments_size;
```

### Alerting Setup

Use the provided monitoring dashboard:

```bash
# Start monitoring dashboard
python scripts/database_monitoring_dashboard.py --interval 30

# With custom thresholds
python scripts/database_monitoring_dashboard.py \
    --connection-threshold 85 \
    --slow-query-threshold 15 \
    --cache-threshold 93 \
    --memory-threshold 1500
```

## Backup and Recovery

### Continuous WAL Archiving

```bash
# postgresql.conf
archive_mode = on
archive_command = 'test ! -f /backup/wal/%f && cp %p /backup/wal/%f'
archive_timeout = 300  # Force WAL switch every 5 minutes

# Backup script (run daily)
#!/bin/bash
BACKUP_DIR="/backup/daily"
DATE=$(date +%Y%m%d_%H%M%S)

# Full database backup
pg_dump -h localhost -U backup_user -d bookedbarber_prod \
    --format=custom --compress=6 \
    --file="${BACKUP_DIR}/bookedbarber_${DATE}.dump"

# Retention policy (keep 30 days)
find ${BACKUP_DIR} -name "bookedbarber_*.dump" -mtime +30 -delete
```

### Point-in-Time Recovery

```bash
# Recovery configuration
restore_command = 'cp /backup/wal/%f %p'
recovery_target_time = '2024-01-15 14:30:00'
recovery_target_action = 'promote'
```

### Backup Verification

```bash
# Weekly backup verification script
#!/bin/bash
TEST_DB="bookedbarber_test_restore"

# Restore latest backup to test database
pg_restore -h localhost -U postgres -d ${TEST_DB} \
    --clean --if-exists \
    /backup/daily/$(ls -t /backup/daily/*.dump | head -1)

# Verify data integrity
psql -h localhost -U postgres -d ${TEST_DB} -c "
    SELECT 
        COUNT(*) as appointment_count,
        MAX(start_time) as latest_appointment
    FROM appointments;
"

# Cleanup
dropdb ${TEST_DB}
```

## Scaling Strategies

### Read Replicas

```yaml
# docker-compose.yml for read replicas
version: '3.8'
services:
  postgres-primary:
    image: postgres:15
    environment:
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: replica_password
    volumes:
      - ./postgresql-primary.conf:/etc/postgresql/postgresql.conf
      
  postgres-replica:
    image: postgres:15
    environment:
      PGUSER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_MASTER_SERVICE: postgres-primary
    command: |
      bash -c "
      until pg_basebackup -h postgres-primary -D /var/lib/postgresql/data -U replicator -v -P -W
      do
        echo 'Waiting for primary to connect...'
        sleep 1s
      done
      echo 'standby_mode = on' >> /var/lib/postgresql/data/recovery.conf
      echo 'primary_conninfo = host=postgres-primary port=5432 user=replicator' >> /var/lib/postgresql/data/recovery.conf
      postgres
      "
```

### Application-Level Read/Write Splitting

```python
# Database routing configuration
class DatabaseRouter:
    """Route read queries to replicas and writes to primary."""
    
    def __init__(self):
        self.primary_engine = create_optimized_engine('production')
        self.replica_engines = [
            create_optimized_engine('production_replica_1'),
            create_optimized_engine('production_replica_2')
        ]
        self.replica_index = 0
        
    def get_session(self, read_only: bool = False):
        if read_only and self.replica_engines:
            # Round-robin load balancing
            engine = self.replica_engines[self.replica_index]
            self.replica_index = (self.replica_index + 1) % len(self.replica_engines)
            return sessionmaker(bind=engine)()
        else:
            return sessionmaker(bind=self.primary_engine)()
```

### Horizontal Partitioning

```sql
-- Partition appointments by date for improved performance
CREATE TABLE appointments_2024 PARTITION OF appointments
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE appointments_2025 PARTITION OF appointments
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Auto-create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    table_name text;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
    end_date := start_date + interval '1 month';
    table_name := 'appointments_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE %I PARTITION OF appointments FOR VALUES FROM (%L) TO (%L)',
                   table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly partition creation
SELECT cron.schedule('create-monthly-partition', '0 0 1 * *', 'SELECT create_monthly_partition();');
```

## Security Considerations

### Database User Roles

```sql
-- Application user with limited privileges
CREATE ROLE bookedbarber_app WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE bookedbarber_prod TO bookedbarber_app;
GRANT USAGE ON SCHEMA public TO bookedbarber_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bookedbarber_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO bookedbarber_app;

-- Read-only analytics user
CREATE ROLE bookedbarber_analytics WITH LOGIN PASSWORD 'analytics_password';
GRANT CONNECT ON DATABASE bookedbarber_prod TO bookedbarber_analytics;
GRANT USAGE ON SCHEMA public TO bookedbarber_analytics;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bookedbarber_analytics;

-- Backup user
CREATE ROLE bookedbarber_backup WITH LOGIN PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE bookedbarber_prod TO bookedbarber_backup;
GRANT USAGE ON SCHEMA public TO bookedbarber_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bookedbarber_backup;
```

### Network Security

```bash
# pg_hba.conf - Allow connections with SSL only
hostssl bookedbarber_prod bookedbarber_app 0.0.0.0/0 md5
hostssl bookedbarber_prod bookedbarber_analytics 10.0.0.0/8 md5
hostssl bookedbarber_prod bookedbarber_backup 10.0.0.0/8 md5

# Reject non-SSL connections
host all all 0.0.0.0/0 reject
```

### Encryption

```sql
-- Enable transparent data encryption (if supported)
ALTER DATABASE bookedbarber_prod SET default_table_access_method = 'heap_encrypted';

-- Row-level security for multi-tenancy
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointment_isolation ON appointments
    FOR ALL TO bookedbarber_app
    USING (location_id = current_setting('app.current_location_id')::int);
```

## Performance Tuning

### Query Optimization

```sql
-- Enable query plan capture
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Auto-explain for slow queries
ALTER SYSTEM SET auto_explain.log_min_duration = 1000;
ALTER SYSTEM SET auto_explain.log_analyze = on;
ALTER SYSTEM SET auto_explain.log_buffers = on;
```

### Memory Optimization

```sql
-- Optimize for appointment queries
ALTER TABLE appointments SET (fillfactor = 85);  -- Leave room for updates
ALTER TABLE payments SET (fillfactor = 95);      -- Mostly insert-only

-- Enable page compression for large tables
ALTER TABLE audit_logs SET (compression = 'lz4');
```

### Maintenance Tasks

```bash
# Daily maintenance script
#!/bin/bash

# Update table statistics
psql -c "ANALYZE;"

# Clean up old connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
         WHERE state = 'idle' AND state_change < now() - interval '1 hour';"

# Log current performance metrics
psql -c "SELECT current_timestamp, 
                count(*) as total_connections,
                count(*) filter(where state = 'active') as active_connections
         FROM pg_stat_activity 
         WHERE datname = 'bookedbarber_prod';"
```

## Implementation Checklist

### Pre-Production Setup

- [ ] Apply the database optimization migration
- [ ] Configure connection pooling with PgBouncer
- [ ] Set up monitoring dashboard
- [ ] Configure backup and WAL archiving
- [ ] Set up SSL certificates
- [ ] Create database users with proper roles
- [ ] Configure network security (pg_hba.conf)
- [ ] Test backup and recovery procedures

### Launch Day

- [ ] Monitor connection pool utilization
- [ ] Watch for slow queries and index usage
- [ ] Verify backup jobs are running
- [ ] Check alert thresholds are appropriate
- [ ] Monitor cache hit ratios
- [ ] Track query performance trends

### Post-Launch Optimization

- [ ] Analyze query patterns after 1 week
- [ ] Adjust connection pool sizes based on usage
- [ ] Review and optimize slow queries
- [ ] Consider additional indexes based on real usage
- [ ] Plan for read replica deployment if needed
- [ ] Implement table partitioning for large tables

## Cost Optimization

### AWS RDS Recommendations

```yaml
# Recommended RDS Configuration
Instance: db.r5.xlarge (4 vCPU, 32 GB RAM)
Storage: gp3, 1000 GB initial, auto-scaling enabled
Backup: 7-day retention, automated backups
Multi-AZ: Enabled for high availability
Read Replicas: 2 instances in different AZs

# Monthly Cost Estimate (US regions)
Primary Instance: $350-400/month
Read Replicas: $200-250/month each
Storage: $100-150/month
Data Transfer: $50-100/month
Total: ~$900-1200/month
```

### Google Cloud SQL Recommendations

```yaml
# Recommended Cloud SQL Configuration
Machine: db-custom-4-16384 (4 vCPU, 16 GB RAM)
Storage: SSD, 1000 GB
Backup: 7-day retention
High Availability: Enabled
Read Replicas: 2 instances

# Monthly Cost Estimate
Primary Instance: $300-350/month
Read Replicas: $150-200/month each
Storage: $170-200/month
Total: ~$770-950/month
```

## Troubleshooting Guide

### Common Issues

1. **High Connection Usage**
   ```sql
   -- Identify connection sources
   SELECT application_name, state, count(*) 
   FROM pg_stat_activity 
   GROUP BY application_name, state 
   ORDER BY count DESC;
   ```

2. **Slow Query Performance**
   ```sql
   -- Find missing indexes
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname = 'public' 
   AND n_distinct > 100;
   ```

3. **Lock Contention**
   ```sql
   -- Monitor lock waits
   SELECT blocked_locks.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          blocking_locks.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocked_activity.query AS blocked_statement
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity 
        ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype;
   ```

This production setup guide ensures your BookedBarber V2 database can handle high-traffic production loads while maintaining performance, reliability, and security.