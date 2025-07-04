# PostgreSQL Migration for BookedBarber V2

This directory contains all the tools and documentation needed to migrate BookedBarber V2 from SQLite to PostgreSQL.

## 🚀 Quick Start

For a complete migration, run:

```bash
cd /Users/bossio/6fb-booking/backend-v2
./database/migration_scripts.sh full-migration
```

## 📁 Files Overview

### Core Migration Files

| File | Description |
|------|-------------|
| `POSTGRESQL_MIGRATION_GUIDE.md` | Complete migration guide with detailed instructions |
| `migration_scripts.sh` | Automated migration scripts and utilities |
| `migrate_sqlite_to_postgresql.py` | Main data migration script |
| `validate_migration.py` | Migration validation and testing |

### Setup and Configuration

| File | Description |
|------|-------------|
| `postgresql_setup.sql` | Database and user setup script |
| `connection_pooling.conf` | pgBouncer configuration template |
| `postgresql_config.py` | PostgreSQL-specific configuration helper |
| `.env.postgresql.template` | Environment configuration template |

### Backup and Testing

| File | Description |
|------|-------------|
| `backup_sqlite.py` | SQLite backup utility |
| `test_postgresql_setup.py` | PostgreSQL setup validation |

## 🎯 Migration Overview

### Why Migrate?

- **Scalability**: Support 10,000+ concurrent users (vs 100-200 with SQLite)
- **Performance**: 2-10x faster queries, better concurrency
- **Reliability**: ACID compliance, crash recovery, replication
- **Features**: Advanced data types, full-text search, JSON support

### Migration Process

1. **Backup** - Create safe backup of SQLite database
2. **Setup** - Install and configure PostgreSQL
3. **Schema** - Apply Alembic migrations to PostgreSQL
4. **Data** - Transfer all data with validation
5. **Validate** - Comprehensive testing and verification
6. **Deploy** - Update application configuration

## 📋 Migration Steps

### 1. Prerequisites Check

```bash
./database/migration_scripts.sh check
```

This verifies:
- PostgreSQL is installed and accessible
- Required Python packages are available
- SQLite database exists and is readable

### 2. Backup Current Data

```bash
./database/migration_scripts.sh backup
```

Creates a complete backup including:
- Binary SQLite database copy
- JSON export of all tables
- Schema export
- Backup manifest

### 3. Setup PostgreSQL

```bash
./database/migration_scripts.sh setup-pg
```

This creates:
- Production database (`bookedbarber_v2`)
- Staging database (`bookedbarber_v2_staging`) 
- Test database (`bookedbarber_v2_test`)
- Application users with proper permissions
- Required extensions (uuid-ossp, pgcrypto, etc.)

### 4. Test Setup

```bash
./database/migration_scripts.sh test-pg
```

Validates:
- Database connections
- User permissions
- Required extensions
- Basic performance

### 5. Prepare Schema

```bash
./database/migration_scripts.sh update-alembic
./database/migration_scripts.sh migrate-schema
```

This:
- Updates Alembic configuration for PostgreSQL
- Applies all existing migrations to create schema

### 6. Test Migration (Dry Run)

```bash
./database/migration_scripts.sh dry-run
```

Tests the migration process without actually transferring data.

### 7. Migrate Data

```bash
./database/migration_scripts.sh migrate
```

Transfers all data from SQLite to PostgreSQL with:
- Batch processing for large tables
- Progress tracking
- Data type conversion
- Error handling

### 8. Validate Migration

```bash
./database/migration_scripts.sh validate
```

Comprehensive validation including:
- Row count verification
- Data integrity checks
- Schema validation
- Performance testing
- Application functionality testing

### 9. Update Configuration

```bash
./database/migration_scripts.sh update-config
```

Updates application configuration for PostgreSQL.

## 🔧 Manual Migration Commands

### Individual Python Scripts

**SQLite Backup:**
```bash
python database/backup_sqlite.py --backup-dir backup_20250704
```

**Data Migration:**
```bash
python database/migrate_sqlite_to_postgresql.py \
  --pg-password your_password \
  --batch-size 1000
```

**Migration Validation:**
```bash
python database/validate_migration.py \
  --pg-password your_password \
  --report-file validation_report.json
```

**PostgreSQL Setup Test:**
```bash
python database/test_postgresql_setup.py \
  --pg-password your_password \
  --report-file setup_test.json
```

### Environment Variables

Set these for customized migration:

```bash
export PG_HOST=localhost
export PG_PORT=5432
export PG_USER=bookedbarber_app
export PG_DATABASE=bookedbarber_v2
export PG_PASSWORD=your_secure_password
export BATCH_SIZE=1000
```

## 🔄 Rollback Procedures

### Emergency Rollback

If migration fails or has issues:

```bash
./database/migration_scripts.sh rollback
```

This restores:
- Original Alembic configuration
- Original environment settings
- SQLite database connection

### Manual Rollback

1. Stop application
2. Restore `.env` from backup
3. Restore `alembic.ini` from backup
4. Restart application

## 📊 Monitoring and Maintenance

### Performance Monitoring

After migration, monitor:

```sql
-- Connection usage
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Regular Maintenance

```bash
# Daily backup
pg_dump -U bookedbarber_app bookedbarber_v2 | gzip > backup_$(date +%Y%m%d).sql.gz

# Weekly vacuum
psql -U bookedbarber_app -d bookedbarber_v2 -c "VACUUM ANALYZE;"

# Update statistics
psql -U bookedbarber_app -d bookedbarber_v2 -c "ANALYZE;"
```

## 🚨 Troubleshooting

### Common Issues

**Connection Failures:**
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials: `psql -U bookedbarber_app -d bookedbarber_v2`
- Check network connectivity and firewall settings

**Migration Errors:**
- Review migration logs for specific errors
- Check disk space availability
- Verify data integrity in source SQLite database

**Performance Issues:**
- Update table statistics: `ANALYZE;`
- Check for missing indexes
- Review connection pool settings

### Getting Help

1. Check the troubleshooting section in `POSTGRESQL_MIGRATION_GUIDE.md`
2. Review migration validation report for specific issues
3. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`

## 📈 Expected Benefits

After successful migration:

- **10-100x more concurrent users**
- **2-10x faster complex queries**
- **Better data integrity and consistency**
- **Advanced features** (JSON, full-text search, etc.)
- **Professional database management tools**
- **Better monitoring and debugging capabilities**

## 🔒 Security Considerations

- Use strong, unique passwords for all database users
- Enable SSL/TLS for database connections in production
- Regularly rotate database credentials
- Monitor access logs for unauthorized attempts
- Use connection pooling to prevent connection exhaustion attacks

## 📚 Additional Resources

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy PostgreSQL Dialect](https://docs.sqlalchemy.org/en/14/dialects/postgresql.html)
- [pgBouncer Documentation](https://www.pgbouncer.org/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Need help?** Check the detailed migration guide: `POSTGRESQL_MIGRATION_GUIDE.md`