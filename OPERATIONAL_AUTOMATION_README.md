# BookedBarber V2 - Operational Automation System

## Overview

This comprehensive operational automation system provides production-grade backup, disaster recovery, monitoring, and maintenance automation for BookedBarber V2. It includes automated backup management, cross-region replication, comprehensive monitoring with Prometheus and Grafana, centralized logging with ELK stack, security auditing, and maintenance automation.

## 🎯 Features

### Backup & Recovery
- **Automated PostgreSQL Backups**: Daily full backups, hourly incremental backups
- **Cross-Region Replication**: Automated backup sync to multiple AWS regions
- **Backup Validation**: Integrity testing and automated restore verification
- **Point-in-Time Recovery**: Granular recovery capabilities with WAL replay
- **One-Click Disaster Recovery**: Complete system restoration procedures

### Monitoring & Alerting
- **Prometheus Metrics Collection**: Application, infrastructure, and business metrics
- **Grafana Dashboards**: Visual monitoring with customizable dashboards
- **Multi-Channel Alerting**: Email, Slack, PagerDuty integration
- **Real-Time Health Checks**: Continuous application and service monitoring
- **Performance Monitoring**: Response times, error rates, resource utilization

### Log Management
- **ELK Stack Integration**: Elasticsearch, Logstash, Kibana for centralized logging
- **Automated Log Processing**: Parsing, enrichment, and indexing
- **Log Retention Policies**: Automated cleanup and archival
- **Security Event Correlation**: Automated threat detection and alerting

### Maintenance Automation
- **Database Optimization**: Automated VACUUM, ANALYZE, and reindexing
- **System Cleanup**: Log rotation, temporary file cleanup, package management
- **Performance Tuning**: Automated optimization recommendations
- **SSL Certificate Monitoring**: Expiry tracking and renewal alerts

### Security & Compliance
- **Automated Security Audits**: Comprehensive security scanning
- **Vulnerability Assessment**: Dependency and infrastructure scanning
- **Compliance Checking**: GDPR, PCI DSS requirement validation
- **File Integrity Monitoring**: Permission and configuration validation

## 📁 Directory Structure

```
BookedBarber V2 Operational Automation/
├── scripts/
│   ├── backup/                    # Backup automation
│   │   ├── postgres_backup.sh     # Main backup script
│   │   └── ...
│   ├── restore/                   # Disaster recovery
│   │   ├── disaster_recovery.sh   # Main recovery script
│   │   └── ...
│   ├── backup-validation/         # Backup testing
│   │   ├── validate_backup.sh     # Backup validation
│   │   └── ...
│   ├── cross-region-sync/         # Multi-region backup
│   │   ├── sync_backups.sh        # Cross-region sync
│   │   └── ...
│   ├── health-monitoring/         # Health checks
│   │   ├── application_health_check.sh
│   │   └── ...
│   ├── maintenance/               # Automated maintenance
│   │   ├── automated_maintenance.sh
│   │   └── ...
│   ├── security/                  # Security auditing
│   │   ├── security_audit.sh      # Security scanner
│   │   └── ...
│   └── deploy-monitoring.sh       # One-click deployment
├── monitoring/
│   ├── prometheus/                # Metrics collection
│   │   ├── prometheus.yml         # Main configuration
│   │   └── rules/                 # Alerting rules
│   ├── grafana/                   # Visualization
│   │   └── dashboards/            # Pre-built dashboards
│   └── alertmanager/              # Alert routing
│       └── alertmanager.yml       # Alert configuration
├── logging/
│   ├── elasticsearch/             # Log storage
│   ├── logstash/                  # Log processing
│   │   ├── logstash.yml           # Main configuration
│   │   └── pipeline.conf          # Processing pipeline
│   └── kibana/                    # Log visualization
├── config/
│   └── backup/                    # Backup configuration
│       └── backup.conf            # Backup settings
├── docs/
│   └── operations/                # Documentation
│       └── OPERATIONAL_RUNBOOK.md # Complete runbook
└── docker-compose.monitoring.yml  # Monitoring stack
```

## 🚀 Quick Start

### 1. Deploy the Complete System
```bash
# One-click deployment of entire operational automation system
./scripts/deploy-monitoring.sh full
```

### 2. Access Monitoring Interfaces
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **AlertManager**: http://localhost:9093
- **Kibana**: http://localhost:5601

### 3. Verify System Health
```bash
# Run comprehensive health check
./scripts/health-monitoring/application_health_check.sh

# Check backup status
./scripts/backup/postgres_backup.sh --status

# Run security audit
./scripts/security/security_audit.sh full
```

## 📋 Installation & Configuration

### Prerequisites
- Docker and Docker Compose
- PostgreSQL database access
- Redis access (optional)
- AWS CLI configured (for cloud backups)
- At least 10GB available disk space

### Environment Configuration
Create `.env.monitoring` file:
```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/bookedbarber
REDIS_URL=redis://localhost:6379

# Cloud Backup Configuration
AWS_S3_BACKUP_BUCKET=bookedbarber-backups
AWS_S3_CROSS_REGION_BUCKET=bookedbarber-backups-dr
AWS_DEFAULT_REGION=us-east-1
AWS_BACKUP_REGION=us-west-2

# Notification Configuration
ALERT_EMAIL=ops@bookedbarber.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_SERVICE_KEY=your-pagerduty-key

# Application URLs
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### Deployment Options

#### Full Deployment (Recommended)
```bash
# Deploy everything: monitoring, logging, backup automation
./scripts/deploy-monitoring.sh full
```

#### Monitoring Only
```bash
# Deploy just the monitoring stack
./scripts/deploy-monitoring.sh monitoring-only
```

#### Automation Scripts Only
```bash
# Set up just the automation scripts and cron jobs
./scripts/deploy-monitoring.sh automation-only
```

## 🔧 Operational Procedures

### Backup Management

#### Manual Backup Creation
```bash
# Create full database backup
./scripts/backup/postgres_backup.sh full

# Create incremental backup (WAL-based)
./scripts/backup/postgres_backup.sh incremental

# Create schema-only backup
./scripts/backup/postgres_backup.sh schema
```

#### Backup Validation
```bash
# Validate latest backup with test restore
./scripts/backup-validation/validate_backup.sh /path/to/backup.sql.gz

# Quick integrity check
./scripts/backup-validation/validate_backup.sh --integrity-only
```

#### Cross-Region Sync
```bash
# Sync recent backups to disaster recovery region
./scripts/cross-region-sync/sync_backups.sh incremental

# Full sync (initial setup)
./scripts/cross-region-sync/sync_backups.sh full
```

### Disaster Recovery

#### Complete System Recovery
```bash
# Interactive recovery with backup selection
./scripts/restore/disaster_recovery.sh interactive

# Restore from specific backup
./scripts/restore/disaster_recovery.sh full /path/to/backup.sql.gz

# Restore from cloud backup
./scripts/restore/disaster_recovery.sh full s3://bucket/backup.sql.gz
```

#### Point-in-Time Recovery
```bash
# Restore to specific timestamp
./scripts/restore/disaster_recovery.sh point-in-time '' '2024-01-01 12:00:00'
```

### Maintenance Operations

#### Scheduled Maintenance
```bash
# Full system maintenance (runs weekly via cron)
./scripts/maintenance/automated_maintenance.sh full

# Database-only maintenance
./scripts/maintenance/automated_maintenance.sh database

# Log cleanup and rotation
./scripts/maintenance/automated_maintenance.sh logs

# System cleanup (temporary files, package cache)
./scripts/maintenance/automated_maintenance.sh system
```

### Health Monitoring

#### Application Health Checks
```bash
# Comprehensive health check of all components
./scripts/health-monitoring/application_health_check.sh

# View health status
cat /tmp/bookedbarber-health-status.json | jq
```

#### Prometheus Metrics
```bash
# Check if metrics are being collected
curl http://localhost:8000/metrics

# View application health metrics
curl http://localhost:8080/metrics | grep bookedbarber_health
```

### Security Operations

#### Security Auditing
```bash
# Complete security audit
./scripts/security/security_audit.sh full

# Specific security checks
./scripts/security/security_audit.sh ssl           # SSL/TLS configuration
./scripts/security/security_audit.sh permissions  # File permissions
./scripts/security/security_audit.sh network      # Network security
./scripts/security/security_audit.sh dependencies # Vulnerability scan
./scripts/security/security_audit.sh compliance   # GDPR/PCI compliance
```

#### View Security Reports
```bash
# View latest security audit results
ls -la /var/log/bookedbarber/security/reports/

# Check security status
cat /tmp/bookedbarber-security-status.json | jq
```

## 📊 Monitoring & Alerting

### Key Metrics Monitored
- **Application Performance**: Response times, error rates, throughput
- **Business Metrics**: Bookings per hour, payment success rate, revenue
- **Infrastructure**: CPU, memory, disk usage, network performance
- **Database**: Connection count, query performance, replication lag
- **Cache**: Redis hit rates, memory usage, connection count
- **Security**: Failed login attempts, suspicious activities

### Alert Thresholds
- **Critical (P0)**: System down, high error rate (>5%), payment failures
- **High (P1)**: Slow response times (>2s), database issues, security events
- **Medium (P2)**: Resource warnings (>80% usage), SSL expiry warnings
- **Low (P3)**: Maintenance reminders, optimization recommendations

### Notification Channels
- **Email**: Detailed reports and summaries
- **Slack**: Real-time notifications with context
- **PagerDuty**: Critical alerts requiring immediate response
- **Webhook**: Custom integrations

## 🔒 Security & Compliance

### Security Features
- **Automated Vulnerability Scanning**: Dependencies and infrastructure
- **File Integrity Monitoring**: Configuration and permission changes
- **SSL/TLS Monitoring**: Certificate expiry and configuration validation
- **Network Security**: Port scanning and firewall configuration checks
- **Access Control**: User permission and authentication auditing

### Compliance Support
- **GDPR**: Data retention policies, privacy policy monitoring
- **PCI DSS**: Payment processing security validation
- **Audit Logging**: Comprehensive activity tracking
- **Data Backup**: Secure backup encryption and retention

## 📈 Performance Optimization

### Automated Optimizations
- **Database**: VACUUM, ANALYZE, reindexing on schedule
- **Cache**: Memory optimization and eviction policy tuning
- **System**: Automatic cleanup of temporary files and logs
- **Application**: Performance monitoring and bottleneck identification

### Performance Monitoring
- **Response Time Tracking**: API endpoint performance analysis
- **Database Query Analysis**: Slow query identification and optimization
- **Resource Utilization**: CPU, memory, and disk usage trending
- **Business Impact Analysis**: Performance correlation with business metrics

## 🔧 Troubleshooting

### Common Issues

#### High Response Times
```bash
# Check application health
./scripts/health-monitoring/application_health_check.sh

# Monitor database performance
psql -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check Redis performance
redis-cli --latency-history -i 1
```

#### Backup Failures
```bash
# Check backup logs
tail -f /var/log/bookedbarber/backup/backup.log

# Validate backup integrity
./scripts/backup-validation/validate_backup.sh /path/to/backup.sql.gz

# Test database connectivity
psql -c "SELECT 1;"
```

#### High Resource Usage
```bash
# Run system maintenance
./scripts/maintenance/automated_maintenance.sh system

# Check for resource leaks
./scripts/health-monitoring/application_health_check.sh

# Review Grafana dashboards for trending
```

### Log Analysis
```bash
# Application logs
tail -f /var/log/bookedbarber/api/error.log

# Database logs
tail -f /var/log/postgresql/postgresql-*.log | grep ERROR

# Security logs
tail -f /var/log/bookedbarber/security/security-audit.log
```

## 📅 Maintenance Schedule

### Automated (via Cron)
- **Every 5 minutes**: Application health checks
- **Hourly**: Incremental backups, log analysis
- **Daily**: Full backups, log cleanup, security scans
- **Weekly**: Full system maintenance, dependency scans
- **Monthly**: Comprehensive security audit, performance review

### Manual (Recommended)
- **Monthly**: Disaster recovery test, documentation review
- **Quarterly**: Full DR drill, security penetration test
- **Annually**: Complete system architecture review

## 🆘 Emergency Procedures

### System Down
1. Check application health: `./scripts/health-monitoring/application_health_check.sh`
2. Restart services: `systemctl restart bookedbarber-*`
3. If persistent, initiate disaster recovery: `./scripts/restore/disaster_recovery.sh`

### Data Corruption
1. Stop write operations immediately
2. Assess corruption scope
3. Restore from latest clean backup: `./scripts/restore/disaster_recovery.sh`

### Security Breach
1. Isolate affected systems
2. Run security audit: `./scripts/security/security_audit.sh full`
3. Reset credentials and apply patches
4. File incident report

## 📞 Support & Contact

### Internal Teams
- **Operations**: ops@bookedbarber.com
- **Security**: security@bookedbarber.com
- **Database**: dba@bookedbarber.com

### External Support
- **AWS Support**: Infrastructure issues
- **Stripe Support**: Payment processing
- **SendGrid Support**: Email delivery

## 📚 Additional Resources

- [Operational Runbook](docs/operations/OPERATIONAL_RUNBOOK.md) - Detailed procedures
- [Monitoring Configuration](monitoring/) - Prometheus and Grafana setup
- [Backup Documentation](scripts/backup/) - Backup automation details
- [Security Procedures](scripts/security/) - Security audit processes

---

**Version**: 1.0  
**Last Updated**: $(date)  
**Maintained By**: DevOps Team  
**Support**: ops@bookedbarber.com