# PostgreSQL Migration Guide for BookedBarber V2

This comprehensive guide covers the complete migration process from SQLite to PostgreSQL for BookedBarber V2, ensuring minimal downtime and data integrity.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Migration Planning](#pre-migration-planning)
4. [Database Setup](#database-setup)
5. [Migration Process](#migration-process)
6. [Post-Migration Validation](#post-migration-validation)
7. [Rollback Procedures](#rollback-procedures)
8. [Production Deployment](#production-deployment)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)

## 🎯 Overview

### Why Migrate to PostgreSQL?

- **Scalability**: Handle 10,000+ concurrent users vs ~100-200 with SQLite
- **Performance**: Advanced query optimization and indexing
- **Reliability**: ACID compliance, better crash recovery
- **Features**: JSON support, full-text search, advanced data types
- **Concurrency**: Multiple simultaneous read/write operations
- **Production Ready**: Battle-tested for high-traffic applications

### Migration Strategy

- **Zero-Downtime**: Use staging environment for parallel testing
- **Data Integrity**: Comprehensive validation at every step
- **Rollback Ready**: Complete backup and recovery procedures
- **Performance Optimized**: Connection pooling and query optimization

## ✅ Prerequisites

### System Requirements

- PostgreSQL 13+ (recommended: PostgreSQL 15+)
- Python 3.9+ with required packages
- At least 4GB RAM for migration process
- 50% free disk space (for backups and temporary files)

### Required Python Packages

```bash
pip install psycopg2-binary sqlalchemy alembic tqdm
```

### Database Access

- PostgreSQL superuser access for initial setup
- Ability to create databases and users
- Network connectivity to PostgreSQL server

### Backup Requirements

- Full SQLite database backup
- Sufficient storage for PostgreSQL backups
- Test restoration procedures

## 📊 Pre-Migration Planning

### 1. Data Analysis

Run the data analysis script to understand your current database:

```bash
cd /Users/bossio/6fb-booking/backend-v2
python -c "
import sqlite3
conn = sqlite3.connect('6fb_booking.db')
cursor = conn.cursor()
cursor.execute('SELECT name FROM sqlite_master WHERE type=\"table\"')
tables = cursor.fetchall()
print(f'Total tables: {len(tables)}')
for table in tables:
    cursor.execute(f'SELECT COUNT(*) FROM {table[0]}')
    count = cursor.fetchone()[0]
    print(f'{table[0]}: {count} rows')
conn.close()
"
```

### 2. Migration Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Planning | 1-2 hours | Analysis and preparation |
| Setup | 30-60 min | PostgreSQL installation and configuration |
| Migration | 1-4 hours | Data migration (depends on data size) |
| Validation | 30-60 min | Testing and verification |
| Deployment | 30 min | Production switch |

### 3. Risk Assessment

**Low Risk:**
- Small datasets (< 1GB)
- Development environments
- Non-critical applications

**Medium Risk:**
- Medium datasets (1-10GB)
- Staging environments
- Some production dependencies

**High Risk:**
- Large datasets (> 10GB)
- Production environments
- Critical business operations

## 🗄️ Database Setup

### 1. PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Docker:**
```bash
docker run --name bookedbarber-postgres \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=bookedbarber_v2 \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Database and User Setup

```bash
# Connect as superuser
sudo -u postgres psql

# Run the setup script
\i /Users/bossio/6fb-booking/backend-v2/database/postgresql_setup.sql
```

Or manually:

```sql
-- Create databases
CREATE DATABASE bookedbarber_v2;
CREATE DATABASE bookedbarber_v2_staging;
CREATE DATABASE bookedbarber_v2_test;

-- Create application user
CREATE USER bookedbarber_app WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bookedbarber_v2 TO bookedbarber_app;
```

### 3. Test Database Setup

```bash
cd /Users/bossio/6fb-booking/backend-v2
python database/test_postgresql_setup.py \
  --pg-password your_secure_password \
  --report-file setup_test_report.json
```

Expected output:
```
✓ Connection successful - PostgreSQL 15.x
✓ All required databases exist
✓ All CRUD operations successful
✓ All required extensions installed
🎉 PostgreSQL setup tests PASSED! ✓
```

## 🔄 Migration Process

### Step 1: Backup Current Data

**Create full backup:**
```bash
cd /Users/bossio/6fb-booking/backend-v2
python database/backup_sqlite.py \
  --backup-dir "backup_$(date +%Y%m%d_%H%M%S)"
```

**Verify backup:**
```bash
# Check backup directory
ls -la backup_*/
# Should contain: 6fb_booking_backup_*.db, schema.sql, *.json files, manifest.json
```

### Step 2: Prepare PostgreSQL Schema

```bash
# Update alembic configuration for PostgreSQL
cp alembic.ini alembic.ini.sqlite.backup

# Edit alembic.ini to use PostgreSQL
sed -i.bak 's|sqlite:///./6fb_booking.db|postgresql://bookedbarber_app:password@localhost/bookedbarber_v2|' alembic.ini

# Run migrations to create schema
alembic upgrade head
```

### Step 3: Data Migration

**Dry run (recommended):**
```bash
python database/migrate_sqlite_to_postgresql.py \
  --pg-password your_secure_password \
  --dry-run
```

**Actual migration:**
```bash
python database/migrate_sqlite_to_postgresql.py \
  --pg-password your_secure_password \
  --batch-size 1000
```

**Monitor progress:**
```
Starting SQLite to PostgreSQL migration...
Connected to SQLite: 6fb_booking.db
Connected to PostgreSQL: localhost:5432
Found 67 tables to migrate
Migrating users: 100%|████████| 27/27 [00:00<00:00, 1234.56it/s]
Migrating appointments: 100%|████████| 156/156 [00:01<00:00, 987.65it/s]
...
Migration completed successfully!
```

### Step 4: Update Application Configuration

**Create PostgreSQL environment file:**
```bash
cp .env .env.sqlite.backup
cp .env.postgresql.template .env.production

# Edit .env.production with your actual values
# Set DATABASE_URL to PostgreSQL connection string
```

**Key settings to update:**
```bash
DATABASE_URL=postgresql://bookedbarber_app:password@localhost:5432/bookedbarber_v2
DB_POOL_SIZE=25
DB_MAX_OVERFLOW=50
ENVIRONMENT=production
DEBUG=false
```

## ✅ Post-Migration Validation

### Step 1: Run Validation Suite

```bash
python database/validate_migration.py \
  --pg-password your_secure_password \
  --report-file migration_validation_report.json
```

**Expected validation results:**
```
✓ Row Count Validation: All 67 tables match
✓ Data Integrity Validation: Sample data verified
✓ Schema Validation: All tables and indexes present
✓ Performance Testing: Queries performing well
✓ Application Functionality Testing: CRUD operations working
🎉 Migration validation PASSED! ✓
```

### Step 2: Application Testing

**Start application with PostgreSQL:**
```bash
# Update DATABASE_URL in your environment
export DATABASE_URL="postgresql://bookedbarber_app:password@localhost:5432/bookedbarber_v2"

# Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start frontend
cd frontend-v2
npm run dev
```

**Test critical functionality:**
- [ ] User registration and login
- [ ] Appointment booking
- [ ] Payment processing
- [ ] Email/SMS notifications
- [ ] Calendar integration
- [ ] Admin dashboard

### Step 3: Performance Benchmarking

```bash
# Run performance tests
python database/benchmark_performance.py \
  --sqlite-path 6fb_booking.db \
  --pg-password your_secure_password
```

**Expected improvements:**
- Concurrent connections: 100+ vs 1 (SQLite)
- Complex queries: 2-10x faster
- Write performance: 5-20x faster under load
- Crash recovery: Automatic vs manual (SQLite)

## 🔙 Rollback Procedures

### Emergency Rollback (if migration fails)

**1. Stop application:**
```bash
# Stop all application processes
pkill -f "uvicorn main:app"
pkill -f "npm run dev"
```

**2. Restore SQLite configuration:**
```bash
# Restore original configuration
cp .env.sqlite.backup .env
cp alembic.ini.sqlite.backup alembic.ini

# Restart application
uvicorn main:app --reload
```

**3. Verify rollback:**
```bash
# Test basic functionality
curl http://localhost:8000/health
curl http://localhost:8000/api/v2/users/me
```

### Planned Rollback (after testing)

**1. Export PostgreSQL data (if needed):**
```bash
pg_dump -U bookedbarber_app -h localhost bookedbarber_v2 > postgresql_backup.sql
```

**2. Analyze what went wrong:**
```bash
# Review validation report
cat migration_validation_report.json | jq '.errors'

# Check application logs
tail -n 100 app.log
```

**3. Fix issues and retry:**
```bash
# Address specific issues found
# Re-run migration with fixes
python database/migrate_sqlite_to_postgresql.py --fix-issues
```

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] All validation tests pass
- [ ] Performance benchmarks acceptable
- [ ] Backup procedures tested
- [ ] Rollback procedures verified
- [ ] Monitoring configured
- [ ] Team notified of deployment

### Deployment Steps

**1. Maintenance mode:**
```bash
# Enable maintenance mode
echo "Application under maintenance" > frontend-v2/public/maintenance.html
```

**2. Final backup:**
```bash
# Backup current SQLite database
cp 6fb_booking.db "6fb_booking_pre_migration_$(date +%Y%m%d_%H%M%S).db"
```

**3. Deploy PostgreSQL configuration:**
```bash
# Update production environment
cp .env.postgresql.template .env.production
# Edit with production values

# Update alembic for production
sed -i 's|localhost|your-production-db-host|' alembic.ini
```

**4. Start application:**
```bash
# Start with PostgreSQL
export DATABASE_URL="postgresql://user:pass@prod-host:5432/bookedbarber_v2"
uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
```

**5. Verify deployment:**
```bash
# Health check
curl https://api.bookedbarber.com/health

# Basic functionality
curl https://api.bookedbarber.com/api/v2/services
```

**6. Disable maintenance mode:**
```bash
rm frontend-v2/public/maintenance.html
```

### Connection Pooling Setup

**Install pgBouncer:**
```bash
sudo apt install pgbouncer
```

**Configure pgBouncer:**
```bash
# Copy configuration
sudo cp database/connection_pooling.conf /etc/pgbouncer/pgbouncer.ini

# Create user list
echo "bookedbarber_app:md5$(echo -n 'passwordusername' | md5sum | awk '{print $1}')" | sudo tee /etc/pgbouncer/userlist.txt

# Start pgBouncer
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer
```

**Update application to use pgBouncer:**
```bash
DATABASE_URL=postgresql://bookedbarber_app:password@localhost:6432/bookedbarber_v2
```

## 📊 Monitoring and Maintenance

### Setup Monitoring

**1. Database statistics:**
```sql
-- Create monitoring views
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor connection usage
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;
```

**2. Application monitoring:**
```python
# Add to main.py
from database.postgresql_config import get_database_stats

@app.get("/monitoring/database")
async def database_stats():
    return get_database_stats()
```

**3. Automated alerts:**
```bash
# Create monitoring script
cat > check_db_health.sh << 'EOF'
#!/bin/bash
PSQL="psql -U bookedbarber_app -h localhost -d bookedbarber_v2"

# Check connection count
CONNECTIONS=$($PSQL -t -c "SELECT count(*) FROM pg_stat_activity;")
if [ $CONNECTIONS -gt 80 ]; then
    echo "WARNING: High connection count: $CONNECTIONS"
fi

# Check for long-running queries
LONG_QUERIES=$($PSQL -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';")
if [ $LONG_QUERIES -gt 0 ]; then
    echo "WARNING: $LONG_QUERIES long-running queries detected"
fi
EOF

# Run every 5 minutes
echo "*/5 * * * * /path/to/check_db_health.sh" | crontab -
```

### Regular Maintenance

**Daily tasks:**
```bash
# Automated backup
pg_dump -U bookedbarber_app bookedbarber_v2 | gzip > backup_$(date +%Y%m%d).sql.gz

# Analyze tables for query planner
psql -U bookedbarber_app -d bookedbarber_v2 -c "ANALYZE;"
```

**Weekly tasks:**
```bash
# Vacuum to reclaim space
psql -U bookedbarber_app -d bookedbarber_v2 -c "VACUUM ANALYZE;"

# Check table sizes
psql -U bookedbarber_app -d bookedbarber_v2 -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**Monthly tasks:**
```bash
# Full vacuum (during maintenance window)
psql -U bookedbarber_app -d bookedbarber_v2 -c "VACUUM FULL;"

# Update table statistics
psql -U bookedbarber_app -d bookedbarber_v2 -c "ANALYZE VERBOSE;"

# Check index usage
psql -U bookedbarber_app -d bookedbarber_v2 -c "
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;
"
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Connection Errors

**Error:** `FATAL: password authentication failed`
```bash
# Solution: Check password and user permissions
sudo -u postgres psql -c "ALTER USER bookedbarber_app PASSWORD 'new_password';"
```

**Error:** `FATAL: database "bookedbarber_v2" does not exist`
```bash
# Solution: Create the database
sudo -u postgres createdb bookedbarber_v2
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bookedbarber_v2 TO bookedbarber_app;"
```

#### 2. Migration Issues

**Error:** `Row count mismatch between databases`
```bash
# Solution: Check for ongoing writes to SQLite during migration
# Stop all applications writing to SQLite and retry
python database/migrate_sqlite_to_postgresql.py --pg-password password
```

**Error:** `Data type conversion errors`
```bash
# Solution: Review the data conversion logic
# Check logs for specific conversion errors
# May need to manually clean data before migration
```

#### 3. Performance Issues

**Slow queries after migration:**
```sql
-- Solution: Update table statistics
ANALYZE;

-- Check if indexes were created
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Create missing indexes if needed
CREATE INDEX CONCURRENTLY idx_appointments_user_id ON appointments(user_id);
```

**High connection usage:**
```bash
# Solution: Implement connection pooling
# Configure pgBouncer as shown in deployment section
# Reduce application connection pool size
```

#### 4. Application Errors

**SQLAlchemy errors:**
```python
# Solution: Update database URL format
# Old: sqlite:///./6fb_booking.db
# New: postgresql://user:pass@host:port/database

# Check for SQLite-specific syntax in queries
# Update any raw SQL to be PostgreSQL compatible
```

**Migration script errors:**
```bash
# Solution: Run with debug mode
python database/migrate_sqlite_to_postgresql.py \
  --pg-password password \
  --batch-size 100 \
  --verbose
```

### Recovery Procedures

#### 1. Corrupted Migration

```bash
# Stop application
pkill -f uvicorn

# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE bookedbarber_v2;"
sudo -u postgres psql -c "CREATE DATABASE bookedbarber_v2;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bookedbarber_v2 TO bookedbarber_app;"

# Re-run schema migration
alembic upgrade head

# Re-run data migration
python database/migrate_sqlite_to_postgresql.py --pg-password password
```

#### 2. Data Corruption

```bash
# Restore from backup
pg_restore -U bookedbarber_app -d bookedbarber_v2 backup_file.sql

# Or restore specific table
pg_restore -U bookedbarber_app -d bookedbarber_v2 -t users backup_file.sql
```

#### 3. Performance Degradation

```sql
-- Identify slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
WHERE mean_time > 1000  -- Queries slower than 1 second
ORDER BY mean_time DESC;

-- Update table statistics
ANALYZE VERBOSE;

-- Rebuild indexes if needed
REINDEX DATABASE bookedbarber_v2;
```

### Support and Resources

**Documentation:**
- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy PostgreSQL Dialect](https://docs.sqlalchemy.org/en/14/dialects/postgresql.html)
- [Alembic Migration Guide](https://alembic.sqlalchemy.org/en/latest/)

**Community Support:**
- [PostgreSQL Mailing Lists](https://www.postgresql.org/list/)
- [Stack Overflow PostgreSQL Tag](https://stackoverflow.com/questions/tagged/postgresql)
- [Reddit r/PostgreSQL](https://www.reddit.com/r/PostgreSQL/)

**Monitoring Tools:**
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL administration
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) - Query statistics
- [pgBouncer](https://www.pgbouncer.org/) - Connection pooling

---

## 📞 Emergency Contacts

For production issues during migration:

1. **Database Administrator**: [Your DBA contact]
2. **DevOps Team**: [Your DevOps contact]  
3. **On-call Developer**: [Your developer contact]

## 📝 Migration Checklist

Copy this checklist and check off items as you complete them:

### Pre-Migration
- [ ] PostgreSQL installed and configured
- [ ] Database setup script executed successfully
- [ ] Test connection to PostgreSQL works
- [ ] SQLite database backed up
- [ ] Migration scripts tested on staging data
- [ ] Team notified of migration schedule
- [ ] Rollback procedures documented and tested

### Migration
- [ ] Application in maintenance mode
- [ ] Final SQLite backup created
- [ ] Alembic migrations applied to PostgreSQL
- [ ] Data migration completed successfully
- [ ] Migration validation passed
- [ ] Application configuration updated
- [ ] Connection pooling configured

### Post-Migration
- [ ] Application started with PostgreSQL
- [ ] Critical functionality tested
- [ ] Performance benchmarks acceptable
- [ ] Monitoring configured
- [ ] Backup procedures scheduled
- [ ] Team trained on new procedures
- [ ] Documentation updated
- [ ] Maintenance mode disabled

---

**Migration completed successfully! 🎉**

Your BookedBarber V2 application is now running on PostgreSQL with improved performance, scalability, and reliability.