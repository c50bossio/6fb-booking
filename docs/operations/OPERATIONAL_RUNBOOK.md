# BookedBarber V2 - Operational Runbook

## Overview

This runbook provides comprehensive operational procedures for BookedBarber V2 production environment, including backup management, disaster recovery, monitoring, and maintenance procedures.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Backup & Recovery](#backup--recovery)
3. [Monitoring & Alerting](#monitoring--alerting)
4. [Maintenance Procedures](#maintenance-procedures)
5. [Security Operations](#security-operations)
6. [Troubleshooting](#troubleshooting)
7. [Emergency Procedures](#emergency-procedures)

## Quick Reference

### Emergency Contacts
- **Primary On-Call**: ops@bookedbarber.com
- **Security Team**: security@bookedbarber.com
- **Database Team**: dba@bookedbarber.com
- **Business Owner**: business@bookedbarber.com

### Key Servers
- **API Server**: api.bookedbarber.com
- **Frontend**: app.bookedbarber.com
- **Database**: Primary + Read Replicas
- **Cache**: Redis Cluster
- **Monitoring**: Prometheus + Grafana

### Critical Thresholds
- **Response Time**: >2s (95th percentile)
- **Error Rate**: >5%
- **Disk Space**: >85%
- **Memory Usage**: >90%
- **Database Connections**: >80% of max

## Backup & Recovery

### Daily Operations

#### Automated Backup Status
```bash
# Check last backup status
./scripts/backup/postgres_backup.sh --status

# View backup logs
tail -f /var/log/bookedbarber/backup/backup.log

# List recent backups
ls -la /var/backups/bookedbarber/full/$(date +%Y/%m/%d)/
```

#### Manual Backup Creation
```bash
# Create full backup
./scripts/backup/postgres_backup.sh full

# Create incremental backup
./scripts/backup/postgres_backup.sh incremental

# Create schema-only backup
./scripts/backup/postgres_backup.sh schema
```

#### Backup Validation
```bash
# Validate latest backup
./scripts/backup-validation/validate_backup.sh /var/backups/bookedbarber/full/latest.sql.gz

# Run comprehensive validation
./scripts/backup-validation/validate_backup.sh --full-test
```

### Disaster Recovery Procedures

#### Complete System Recovery
```bash
# DANGER: This will destroy current database!
./scripts/restore/disaster_recovery.sh interactive

# Or specify backup file directly
./scripts/restore/disaster_recovery.sh full s3://backup-bucket/backup.sql.gz
```

#### Point-in-Time Recovery
```bash
# Restore to specific timestamp
./scripts/restore/disaster_recovery.sh point-in-time '' '2024-01-01 12:00:00'
```

#### Cross-Region Backup Sync
```bash
# Sync recent backups to DR region
./scripts/cross-region-sync/sync_backups.sh incremental

# Full sync (use for initial setup)
./scripts/cross-region-sync/sync_backups.sh full
```

## Monitoring & Alerting

### Prometheus & Grafana

#### Access Points
- **Prometheus**: http://monitoring.bookedbarber.com:9090
- **Grafana**: http://monitoring.bookedbarber.com:3000
- **AlertManager**: http://monitoring.bookedbarber.com:9093

#### Key Dashboards
1. **BookedBarber Overview**: System health and performance
2. **Database Performance**: PostgreSQL metrics
3. **Application Metrics**: Business KPIs
4. **Infrastructure**: Server resources

#### Alert Management
```bash
# Silence alerts during maintenance
curl -X POST http://alertmanager:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": ".*", "isRegex": true}],
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-01-01T02:00:00Z",
    "createdBy": "ops-team",
    "comment": "Scheduled maintenance window"
  }'
```

### Health Monitoring

#### Application Health Check
```bash
# Run comprehensive health check
./scripts/health-monitoring/application_health_check.sh

# Check specific component
curl -f http://api.bookedbarber.com/health

# View health status
cat /tmp/bookedbarber-health-status.json | jq
```

#### Prometheus Metrics
```bash
# Check if metrics are being collected
curl http://api.bookedbarber.com/metrics

# View health metrics
curl http://localhost:8080/metrics | grep bookedbarber_health
```

## Maintenance Procedures

### Scheduled Maintenance

#### Weekly Full Maintenance
```bash
# Run complete maintenance (recommended Sunday 2 AM)
./scripts/maintenance/automated_maintenance.sh full
```

#### Database-Only Maintenance
```bash
# Database vacuum and reindex
./scripts/maintenance/automated_maintenance.sh database
```

#### Log Cleanup
```bash
# Clean and rotate logs
./scripts/maintenance/automated_maintenance.sh logs
```

#### System Cleanup
```bash
# Clean temporary files and cache
./scripts/maintenance/automated_maintenance.sh system
```

### Application Deployment

#### Pre-Deployment Checklist
- [ ] Create backup of current version
- [ ] Run security audit
- [ ] Check system resources
- [ ] Notify stakeholders
- [ ] Prepare rollback plan

#### Deployment Process
```bash
# 1. Create emergency backup
./scripts/backup/postgres_backup.sh full

# 2. Put application in maintenance mode
echo "maintenance" > /var/www/bookedbarber/maintenance.flag

# 3. Deploy new version
# (Your deployment process here)

# 4. Run database migrations
cd backend-v2 && alembic upgrade head

# 5. Remove maintenance mode
rm -f /var/www/bookedbarber/maintenance.flag

# 6. Verify deployment
./scripts/health-monitoring/application_health_check.sh
```

#### Post-Deployment Verification
```bash
# Check application status
curl -f http://api.bookedbarber.com/health

# Monitor error rates
curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])"

# Check business metrics
curl -s "http://prometheus:9090/api/v1/query?query=booking_attempts_total"
```

## Security Operations

### Security Auditing

#### Regular Security Audit
```bash
# Run comprehensive security audit
./scripts/security/security_audit.sh full

# Check specific security areas
./scripts/security/security_audit.sh ssl
./scripts/security/security_audit.sh permissions
./scripts/security/security_audit.sh dependencies
```

#### Security Incident Response
1. **Immediate Actions**:
   - Isolate affected systems
   - Preserve evidence
   - Notify security team

2. **Investigation**:
   ```bash
   # Check recent security events
   grep -i "unauthorized\|failed\|security" /var/log/bookedbarber/security/*.log
   
   # Review access logs
   tail -f /var/log/nginx/access.log | grep -E "(4[0-9]{2}|5[0-9]{2})"
   ```

3. **Containment & Recovery**:
   - Apply security patches
   - Reset compromised credentials
   - Update firewall rules

### SSL Certificate Management
```bash
# Check certificate expiry
./scripts/security/security_audit.sh ssl

# Renew Let's Encrypt certificates (if using certbot)
certbot renew --dry-run
```

## Troubleshooting

### Common Issues

#### High Response Times
```bash
# Check database performance
./scripts/health-monitoring/application_health_check.sh

# Monitor slow queries
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check Redis performance
redis-cli --latency-history -i 1
```

#### High Error Rates
```bash
# Check application logs
tail -f /var/log/bookedbarber/api/error.log

# Monitor error metrics
curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])"

# Check external service status
curl -f https://api.stripe.com/v1/account
```

#### Database Connection Issues
```bash
# Check active connections
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT count(*) as active_connections,
       (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections;"

# Kill long-running queries
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND now() - query_start > interval '10 minutes';"
```

#### Disk Space Issues
```bash
# Check disk usage
df -h

# Clean old logs
./scripts/maintenance/automated_maintenance.sh logs

# Clean old backups (careful!)
find /var/backups/bookedbarber -name "*.gz" -mtime +7 -delete
```

### Log Analysis

#### Application Logs
```bash
# API errors
tail -f /var/log/bookedbarber/api/error.log

# Database queries
tail -f /var/log/postgresql/postgresql-*.log | grep -E "(ERROR|WARN)"

# Nginx access logs
tail -f /var/log/nginx/access.log
```

#### Elasticsearch Queries (if ELK stack is deployed)
```bash
# Search for errors in last hour
curl -X GET "elasticsearch:9200/bookedbarber-logs-*/_search" -H 'Content-Type: application/json' -d'{
  "query": {
    "bool": {
      "must": [
        {"match": {"level": "ERROR"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}'
```

## Emergency Procedures

### System Down

1. **Immediate Assessment**:
   ```bash
   # Check system status
   ./scripts/health-monitoring/application_health_check.sh
   
   # Check service status
   systemctl status bookedbarber-api
   systemctl status nginx
   systemctl status postgresql
   ```

2. **Quick Recovery**:
   ```bash
   # Restart services
   systemctl restart bookedbarber-api
   systemctl restart nginx
   
   # Check database connectivity
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
   ```

3. **If Quick Recovery Fails**:
   - Initiate disaster recovery procedures
   - Notify stakeholders
   - Switch to backup systems if available

### Data Corruption

1. **Stop Write Operations**:
   - Put application in read-only mode
   - Stop background workers

2. **Assess Damage**:
   ```bash
   # Check database integrity
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
   SELECT schemaname, tablename, n_dead_tup, n_live_tup 
   FROM pg_stat_user_tables 
   ORDER BY n_dead_tup DESC;"
   ```

3. **Recovery Options**:
   - Point-in-time recovery to before corruption
   - Restore from latest clean backup
   - Manual data repair if corruption is limited

### Security Breach

1. **Immediate Response**:
   - Isolate affected systems
   - Change all credentials
   - Enable additional logging

2. **Investigation**:
   ```bash
   # Check for unauthorized access
   grep -E "(unauthorized|failed login|security)" /var/log/bookedbarber/security/*.log
   
   # Review recent user activities
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
   SELECT user_id, action, created_at 
   FROM audit_log 
   WHERE created_at > NOW() - INTERVAL '24 hours' 
   ORDER BY created_at DESC;"
   ```

3. **Recovery**:
   - Apply security patches
   - Reset all user sessions
   - Notify affected users
   - File incident report

## Maintenance Schedules

### Daily (Automated)
- Health checks every 15 minutes
- Incremental backups every hour
- Log rotation

### Weekly (Automated)
- Full database backup
- Security audit
- Dependency vulnerability scan
- Performance optimization

### Monthly (Manual)
- Comprehensive system review
- SSL certificate check
- Disaster recovery test
- Security patch review

### Quarterly (Manual)
- Full disaster recovery drill
- Security penetration test
- Performance benchmarking
- Documentation review

## Contact Information

### Escalation Matrix

| Issue Severity | Response Time | Contact |
|----------------|---------------|---------|
| Critical (P0) | 15 minutes | Primary on-call + Manager |
| High (P1) | 1 hour | Primary on-call |
| Medium (P2) | 4 hours | Assigned team member |
| Low (P3) | Next business day | Ticket queue |

### External Vendors

| Service | Contact | Purpose |
|---------|---------|---------|
| Stripe | support@stripe.com | Payment processing |
| AWS | aws-support | Infrastructure |
| Render | support@render.com | Hosting platform |
| SendGrid | support@sendgrid.com | Email delivery |

---

**Last Updated**: $(date)
**Version**: 1.0
**Owner**: DevOps Team