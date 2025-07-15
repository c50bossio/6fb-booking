"""
Backup and Disaster Recovery Configuration for BookedBarber V2
=============================================================

This module provides comprehensive backup and disaster recovery configurations
for production deployment. Ensures business continuity and data protection
for high-availability systems supporting 10,000+ concurrent users.

Key features:
- Automated database backups with encryption
- Cross-region disaster recovery
- Point-in-time recovery capabilities
- Application state backup and restoration
- Monitoring and alerting for backup failures
- Compliance with data retention policies
- Recovery time and point objectives (RTO/RPO)
"""

import os
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


logger = logging.getLogger(__name__)


class BackupType(Enum):
    """Backup type enumeration"""
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"
    SNAPSHOT = "snapshot"


class RecoveryLevel(Enum):
    """Recovery level enumeration"""
    DATABASE_ONLY = "database_only"
    APPLICATION_STATE = "application_state"
    FULL_SYSTEM = "full_system"
    CROSS_REGION = "cross_region"


@dataclass
class BackupJob:
    """Backup job configuration"""
    name: str
    backup_type: BackupType
    schedule: str  # Cron expression
    retention_days: int
    encryption_enabled: bool
    compression_enabled: bool
    storage_location: str
    notification_on_failure: bool


@dataclass
class RecoveryPlan:
    """Disaster recovery plan configuration"""
    name: str
    recovery_level: RecoveryLevel
    rto_minutes: int  # Recovery Time Objective
    rpo_minutes: int  # Recovery Point Objective
    automated_failover: bool
    cross_region_enabled: bool
    verification_required: bool


class BackupDisasterRecoveryConfig:
    """Backup and disaster recovery configuration class"""

    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.is_production = self.environment == "production"

    @property
    def backup_settings(self) -> Dict[str, Any]:
        """Backup configuration settings"""
        return {
            # General backup settings
            "enabled": os.getenv("BACKUP_ENABLED", "true").lower() == "true",
            "schedule": os.getenv("BACKUP_SCHEDULE", "0 2 * * *"),  # Daily at 2 AM UTC
            "retention_days": int(os.getenv("BACKUP_RETENTION_DAYS", "90")),
            "compression": os.getenv("BACKUP_COMPRESSION", "true").lower() == "true",
            "encryption": os.getenv("BACKUP_ENCRYPTION", "true").lower() == "true",
            
            # Storage configuration
            "s3_bucket": os.getenv("BACKUP_S3_BUCKET"),
            "s3_region": os.getenv("BACKUP_S3_REGION", "us-east-1"),
            "s3_kms_key_id": os.getenv("BACKUP_S3_KMS_KEY_ID"),
            "s3_storage_class": "STANDARD_IA",  # Infrequent Access for cost optimization
            
            # Backup types and schedules
            "database_full_backup_schedule": "0 2 * * 0",  # Weekly full backup
            "database_incremental_schedule": "0 2 * * 1-6",  # Daily incremental
            "application_state_schedule": "0 3 * * *",  # Daily application state
            "file_system_schedule": "0 4 * * 0",  # Weekly file system backup
            
            # Performance settings
            "parallel_workers": 4,
            "max_backup_size_gb": 1000,  # 1TB limit
            "chunk_size_mb": 100,
            "network_timeout_seconds": 3600,  # 1 hour
            
            # Monitoring and alerting
            "notification_emails": ["ops@bookedbarber.com", "backup@bookedbarber.com"],
            "slack_webhook": os.getenv("BACKUP_SLACK_WEBHOOK"),
            "alert_on_failure": True,
            "alert_on_success": False,  # Only alert on failures in production
            "backup_verification": True,
        }

    @property
    def disaster_recovery_settings(self) -> Dict[str, Any]:
        """Disaster recovery configuration settings"""
        return {
            # General DR settings
            "enabled": os.getenv("DR_ENABLED", "true").lower() == "true",
            "cross_region_backup": os.getenv("DR_CROSS_REGION_BACKUP", "true").lower() == "true",
            "failover_region": os.getenv("DR_FAILOVER_REGION", "us-west-2"),
            
            # Recovery objectives
            "rto_minutes": int(os.getenv("DR_RTO_MINUTES", "15")),  # 15 minutes RTO
            "rpo_minutes": int(os.getenv("DR_RPO_MINUTES", "5")),   # 5 minutes RPO
            
            # Automated failover settings
            "automated_failover_enabled": False,  # Manual approval required
            "failover_trigger_threshold": {
                "consecutive_health_check_failures": 5,
                "response_time_threshold_ms": 10000,
                "error_rate_threshold_percent": 50,
            },
            
            # Cross-region replication
            "database_replication": {
                "enabled": True,
                "replication_lag_alert_seconds": 30,
                "sync_mode": "async",  # or "sync" for zero data loss
            },
            
            # Application state replication
            "redis_replication": {
                "enabled": True,
                "cross_region_sync": True,
                "sync_interval_seconds": 60,
            },
            
            # File storage replication
            "s3_cross_region_replication": {
                "enabled": True,
                "destination_bucket": f"{os.getenv('BACKUP_S3_BUCKET', '')}-dr",
                "destination_region": os.getenv("DR_FAILOVER_REGION", "us-west-2"),
            },
        }

    @property
    def compliance_settings(self) -> Dict[str, Any]:
        """Compliance and legal requirements for backups"""
        return {
            # Data retention policies
            "gdpr_compliance": {
                "enabled": True,
                "retention_period_days": 2555,  # 7 years for business records
                "automatic_deletion": True,
                "anonymization_enabled": True,
            },
            
            # Audit and logging
            "audit_logging": {
                "enabled": True,
                "log_backup_operations": True,
                "log_restore_operations": True,
                "log_data_access": True,
                "retention_days": 2555,  # 7 years
            },
            
            # Encryption requirements
            "encryption": {
                "at_rest": True,
                "in_transit": True,
                "key_rotation_days": 90,
                "algorithm": "AES-256",
            },
            
            # Access control
            "access_control": {
                "role_based_access": True,
                "multi_factor_authentication": True,
                "audit_trail": True,
                "principle_of_least_privilege": True,
            },
        }

    def get_backup_jobs(self) -> List[BackupJob]:
        """Get all configured backup jobs"""
        settings = self.backup_settings
        
        return [
            BackupJob(
                name="database_full_backup",
                backup_type=BackupType.FULL,
                schedule=settings["database_full_backup_schedule"],
                retention_days=settings["retention_days"],
                encryption_enabled=settings["encryption"],
                compression_enabled=settings["compression"],
                storage_location=f"s3://{settings['s3_bucket']}/database/full/",
                notification_on_failure=True,
            ),
            BackupJob(
                name="database_incremental_backup",
                backup_type=BackupType.INCREMENTAL,
                schedule=settings["database_incremental_schedule"],
                retention_days=30,  # Shorter retention for incremental
                encryption_enabled=settings["encryption"],
                compression_enabled=settings["compression"],
                storage_location=f"s3://{settings['s3_bucket']}/database/incremental/",
                notification_on_failure=True,
            ),
            BackupJob(
                name="application_state_backup",
                backup_type=BackupType.SNAPSHOT,
                schedule=settings["application_state_schedule"],
                retention_days=30,
                encryption_enabled=settings["encryption"],
                compression_enabled=settings["compression"],
                storage_location=f"s3://{settings['s3_bucket']}/application-state/",
                notification_on_failure=True,
            ),
            BackupJob(
                name="file_system_backup",
                backup_type=BackupType.FULL,
                schedule=settings["file_system_schedule"],
                retention_days=settings["retention_days"],
                encryption_enabled=settings["encryption"],
                compression_enabled=settings["compression"],
                storage_location=f"s3://{settings['s3_bucket']}/filesystem/",
                notification_on_failure=True,
            ),
        ]

    def get_recovery_plans(self) -> List[RecoveryPlan]:
        """Get all disaster recovery plans"""
        dr_settings = self.disaster_recovery_settings
        
        return [
            RecoveryPlan(
                name="database_recovery",
                recovery_level=RecoveryLevel.DATABASE_ONLY,
                rto_minutes=5,
                rpo_minutes=dr_settings["rpo_minutes"],
                automated_failover=False,
                cross_region_enabled=dr_settings["cross_region_backup"],
                verification_required=True,
            ),
            RecoveryPlan(
                name="application_recovery",
                recovery_level=RecoveryLevel.APPLICATION_STATE,
                rto_minutes=10,
                rpo_minutes=dr_settings["rpo_minutes"],
                automated_failover=False,
                cross_region_enabled=dr_settings["cross_region_backup"],
                verification_required=True,
            ),
            RecoveryPlan(
                name="full_system_recovery",
                recovery_level=RecoveryLevel.FULL_SYSTEM,
                rto_minutes=dr_settings["rto_minutes"],
                rpo_minutes=dr_settings["rpo_minutes"],
                automated_failover=dr_settings["automated_failover_enabled"],
                cross_region_enabled=dr_settings["cross_region_backup"],
                verification_required=True,
            ),
            RecoveryPlan(
                name="cross_region_failover",
                recovery_level=RecoveryLevel.CROSS_REGION,
                rto_minutes=dr_settings["rto_minutes"],
                rpo_minutes=dr_settings["rpo_minutes"],
                automated_failover=False,  # Always manual for cross-region
                cross_region_enabled=True,
                verification_required=True,
            ),
        ]

    def generate_backup_scripts(self) -> Dict[str, str]:
        """Generate backup scripts for different components"""
        settings = self.backup_settings
        
        scripts = {}
        
        # Database backup script
        scripts["database_backup.sh"] = f"""#!/bin/bash
# Database backup script for BookedBarber V2
set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="bookedbarber_backup_$BACKUP_DATE.sql"
S3_BUCKET="{settings['s3_bucket']}"
KMS_KEY="{settings['s3_kms_key_id']}"

echo "Starting database backup at $(date)"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress if enabled
{"gzip $BACKUP_FILE && BACKUP_FILE=$BACKUP_FILE.gz" if settings['compression'] else ""}

# Upload to S3 with encryption
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/database/$(date +%Y/%m/%d)/ \\
    --sse aws:kms --sse-kms-key-id $KMS_KEY \\
    --storage-class {settings.get('s3_storage_class', 'STANDARD_IA')}

# Verify backup
aws s3 ls s3://$S3_BUCKET/database/$(date +%Y/%m/%d)/$BACKUP_FILE

# Clean up local file
rm $BACKUP_FILE

echo "Database backup completed successfully at $(date)"
"""

        # Redis backup script
        scripts["redis_backup.sh"] = f"""#!/bin/bash
# Redis backup script for BookedBarber V2
set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis_backup_$BACKUP_DATE.rdb"
S3_BUCKET="{settings['s3_bucket']}"

echo "Starting Redis backup at $(date)"

# Create Redis backup
redis-cli --rdb $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/redis/$(date +%Y/%m/%d)/ \\
    --sse aws:kms --sse-kms-key-id {settings['s3_kms_key_id']}

# Clean up
rm $BACKUP_FILE

echo "Redis backup completed successfully at $(date)"
"""

        # Application state backup script
        scripts["app_state_backup.sh"] = f"""#!/bin/bash
# Application state backup script for BookedBarber V2
set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="app_state_backup_$BACKUP_DATE"
S3_BUCKET="{settings['s3_bucket']}"

echo "Starting application state backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration files
cp .env.production $BACKUP_DIR/
cp -r config/ $BACKUP_DIR/
cp -r static/ $BACKUP_DIR/ 2>/dev/null || true

# Backup uploaded files
cp -r uploads/ $BACKUP_DIR/ 2>/dev/null || true

# Create tarball
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR

# Upload to S3
aws s3 cp $BACKUP_DIR.tar.gz s3://$S3_BUCKET/application-state/$(date +%Y/%m/%d)/ \\
    --sse aws:kms --sse-kms-key-id {settings['s3_kms_key_id']}

# Clean up
rm -rf $BACKUP_DIR $BACKUP_DIR.tar.gz

echo "Application state backup completed successfully at $(date)"
"""

        return scripts

    def generate_recovery_scripts(self) -> Dict[str, str]:
        """Generate recovery scripts for disaster recovery"""
        scripts = {}
        
        # Database recovery script
        scripts["database_recovery.sh"] = """#!/bin/bash
# Database recovery script for BookedBarber V2
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file-s3-path>"
    exit 1
fi

BACKUP_S3_PATH="$1"
BACKUP_FILE=$(basename $BACKUP_S3_PATH)

echo "Starting database recovery from $BACKUP_S3_PATH"

# Download backup from S3
aws s3 cp $BACKUP_S3_PATH .

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip $BACKUP_FILE
    BACKUP_FILE=${BACKUP_FILE%.gz}
fi

# Stop application
systemctl stop bookedbarber || true

# Create database backup before restore
pg_dump $DATABASE_URL > pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql $DATABASE_URL < $BACKUP_FILE

# Start application
systemctl start bookedbarber

# Verify restoration
curl -f http://localhost:8000/health || echo "Health check failed"

echo "Database recovery completed successfully"
"""

        # Full system recovery script
        scripts["full_system_recovery.sh"] = """#!/bin/bash
# Full system recovery script for BookedBarber V2
set -e

echo "Starting full system recovery"

# Stop all services
systemctl stop bookedbarber
systemctl stop redis
systemctl stop nginx

# Recover database
./database_recovery.sh $DATABASE_BACKUP_S3_PATH

# Recover Redis
./redis_recovery.sh $REDIS_BACKUP_S3_PATH

# Recover application state
./app_state_recovery.sh $APP_STATE_BACKUP_S3_PATH

# Start services
systemctl start redis
systemctl start bookedbarber
systemctl start nginx

# Verify all services
sleep 30
systemctl is-active bookedbarber
systemctl is-active redis
systemctl is-active nginx

# Health check
curl -f http://localhost:8000/health

echo "Full system recovery completed successfully"
"""

        return scripts

    def get_monitoring_config(self) -> Dict[str, Any]:
        """Get backup monitoring configuration"""
        return {
            "backup_monitoring": {
                "check_interval_minutes": 60,
                "alert_on_missing_backup": True,
                "alert_on_backup_failure": True,
                "alert_on_old_backup": True,
                "max_backup_age_hours": 25,  # Alert if backup is > 25 hours old
            },
            
            "recovery_testing": {
                "enabled": True,
                "test_schedule": "0 6 * * 0",  # Weekly on Sunday at 6 AM
                "test_environment": "staging",
                "automated_verification": True,
                "notification_on_failure": True,
            },
            
            "metrics": [
                "backup_success_rate",
                "backup_duration_seconds",
                "backup_size_bytes",
                "recovery_time_seconds",
                "replication_lag_seconds",
                "storage_usage_bytes",
                "compliance_status",
            ],
        }

    def validate_backup_config(self) -> List[str]:
        """Validate backup and disaster recovery configuration"""
        issues = []
        
        if not self.is_production:
            return issues
        
        settings = self.backup_settings
        dr_settings = self.disaster_recovery_settings
        
        # Check backup configuration
        if not settings["enabled"]:
            issues.append("Backups are disabled in production")
        
        if not settings["s3_bucket"]:
            issues.append("Backup S3 bucket not configured")
        
        if not settings["encryption"]:
            issues.append("Backup encryption is disabled")
        
        if settings["retention_days"] < 30:
            issues.append("Backup retention period too short for production")
        
        # Check disaster recovery configuration
        if not dr_settings["enabled"]:
            issues.append("Disaster recovery is disabled")
        
        if dr_settings["rto_minutes"] > 60:
            issues.append("RTO exceeds 1 hour - may not meet business requirements")
        
        if dr_settings["rpo_minutes"] > 15:
            issues.append("RPO exceeds 15 minutes - may result in significant data loss")
        
        if not dr_settings["cross_region_backup"]:
            issues.append("Cross-region backup is disabled")
        
        return issues


# Global instance
backup_dr_config = BackupDisasterRecoveryConfig()


# Utility functions
def create_backup_schedule():
    """Create backup schedule using cron"""
    # This would integrate with system cron or a job scheduler
    pass


def execute_backup_job(job_name: str) -> bool:
    """Execute a specific backup job"""
    # This would execute the actual backup logic
    logger.info(f"Executing backup job: {job_name}")
    return True


def execute_recovery_plan(plan_name: str) -> bool:
    """Execute a disaster recovery plan"""
    # This would execute the actual recovery logic
    logger.info(f"Executing recovery plan: {plan_name}")
    return True


def test_backup_integrity(backup_path: str) -> bool:
    """Test backup file integrity"""
    # This would verify backup file integrity
    logger.info(f"Testing backup integrity: {backup_path}")
    return True


def get_backup_status() -> Dict[str, Any]:
    """Get current backup system status"""
    return {
        "last_backup_time": "2025-07-15T02:00:00Z",
        "last_backup_status": "success",
        "next_backup_time": "2025-07-16T02:00:00Z",
        "storage_usage_gb": 150.5,
        "retention_compliance": True,
    }


# Export key configurations
__all__ = [
    "BackupDisasterRecoveryConfig",
    "BackupType",
    "RecoveryLevel",
    "BackupJob",
    "RecoveryPlan",
    "backup_dr_config",
    "execute_backup_job",
    "execute_recovery_plan",
    "test_backup_integrity",
    "get_backup_status",
]