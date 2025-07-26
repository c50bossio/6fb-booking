# PostgreSQL RDS Configuration for Franchise Sharding

# DB Subnet Group
resource "aws_db_subnet_group" "franchise_db_subnet_group" {
  name       = "${local.cluster_name}-db-subnet-group"
  subnet_ids = aws_subnet.database_subnets[*].id
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-db-subnet-group"
  })
}

# DB Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "franchise_postgres_params" {
  family = "postgres15"
  name   = "${local.cluster_name}-postgres-params"
  
  # Franchise-optimized PostgreSQL parameters
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }
  
  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }
  
  parameter {
    name  = "maintenance_work_mem"
    value = "1048576"  # 1GB
  }
  
  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }
  
  parameter {
    name  = "wal_buffers"
    value = "16384"  # 64MB
  }
  
  parameter {
    name  = "default_statistics_target"
    value = "100"
  }
  
  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }
  
  parameter {
    name  = "effective_io_concurrency"
    value = "200"
  }
  
  parameter {
    name  = "work_mem"
    value = "65536"  # 64MB
  }
  
  parameter {
    name  = "max_connections"
    value = "500"
  }
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
  }
  
  parameter {
    name  = "track_activity_query_size"
    value = "2048"
  }
  
  parameter {
    name  = "log_statement"
    value = "mod"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  
  parameter {
    name  = "log_checkpoints"
    value = "1"
  }
  
  parameter {
    name  = "log_connections"
    value = "1"
  }
  
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  
  parameter {
    name  = "log_lock_waits"
    value = "1"
  }
  
  parameter {
    name  = "autovacuum_max_workers"
    value = "6"
  }
  
  parameter {
    name  = "autovacuum_naptime"
    value = "30"
  }
  
  tags = local.common_tags
}

# Primary Database Instance (Shard Master)
resource "aws_db_instance" "franchise_primary_db" {
  identifier = "${local.cluster_name}-primary-shard-${lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id}"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class
  
  # Storage configuration
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true
  kms_key_id            = aws_kms_key.rds_encryption.arn
  
  # Database configuration
  db_name  = "bookedbarber_shard_${lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id}"
  username = var.db_username
  password = var.db_password
  port     = 5432
  
  # Network and security
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.franchise_db_subnet_group.name
  publicly_accessible    = false
  
  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.franchise_postgres_params.name
  
  # Backup configuration
  backup_retention_period   = var.db_backup_retention_period
  backup_window            = var.db_backup_window
  maintenance_window       = var.db_maintenance_window
  delete_automated_backups = false
  
  # Monitoring and performance
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring_role.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # High availability
  multi_az = var.db_multi_az
  
  # Deletion protection
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.cluster_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  
  # Franchise-specific tags
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-primary-db"
    ShardId = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id)
    FranchiseRangeStart = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).franchise_range_start)
    FranchiseRangeEnd = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).franchise_range_end)
    Role = "primary"
  })
}

# Read Replica Instances for load distribution
resource "aws_db_instance" "franchise_read_replicas" {
  count = var.db_read_replica_count
  
  identifier = "${local.cluster_name}-replica-${count.index + 1}-shard-${lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id}"
  
  # Replica configuration
  replicate_source_db = aws_db_instance.franchise_primary_db.identifier
  instance_class      = var.db_replica_instance_class
  
  # Storage (inherited from source)
  storage_encrypted = true
  
  # Network and security
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring_role.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Availability zone distribution
  availability_zone = data.aws_availability_zones.available.names[count.index % length(data.aws_availability_zones.available.names)]
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-replica-${count.index + 1}"
    ShardId = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id)
    Role = "replica"
    ReplicaIndex = tostring(count.index + 1)
  })
}

# Cross-region read replica (for disaster recovery)
resource "aws_db_instance" "franchise_cross_region_replica" {
  count = var.enable_cross_region_replica && lookup(local.shard_config, var.aws_region, { primary = false }).primary ? 1 : 0
  
  provider = aws.disaster_recovery
  
  identifier = "${local.cluster_name}-dr-replica-shard-${lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id}"
  
  # Cross-region replica configuration
  replicate_source_db = aws_db_instance.franchise_primary_db.arn
  instance_class      = var.db_replica_instance_class
  
  # Storage
  storage_encrypted = true
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-dr-replica"
    ShardId = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id)
    Role = "disaster-recovery"
    SourceRegion = var.aws_region
  })
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds_encryption" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 7
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-rds-encryption"
  })
}

resource "aws_kms_alias" "rds_encryption_alias" {
  name          = "alias/${local.cluster_name}-rds-encryption"
  target_key_id = aws_kms_key.rds_encryption.key_id
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring_role" {
  name = "${local.cluster_name}-rds-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_policy" {
  role       = aws_iam_role.rds_monitoring_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Alarms for Database Monitoring
resource "aws_cloudwatch_metric_alarm" "db_cpu_utilization" {
  alarm_name          = "${local.cluster_name}-db-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.franchise_primary_db.id
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "db_connection_count" {
  alarm_name          = "${local.cluster_name}-db-connection-count"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "400"  # 80% of max_connections (500)
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.franchise_primary_db.id
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "db_free_storage_space" {
  alarm_name          = "${local.cluster_name}-db-free-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240"  # 10GB in bytes
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.franchise_primary_db.id
  }
  
  tags = local.common_tags
}

# Database Secrets in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${local.cluster_name}-db-credentials"
  description             = "Database credentials for BookedBarber franchise platform"
  recovery_window_in_days = var.environment == "production" ? 30 : 0
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  
  secret_string = jsonencode({
    username            = var.db_username
    password           = var.db_password
    engine             = "postgres"
    host               = aws_db_instance.franchise_primary_db.endpoint
    port               = aws_db_instance.franchise_primary_db.port
    dbname             = aws_db_instance.franchise_primary_db.db_name
    dbInstanceIdentifier = aws_db_instance.franchise_primary_db.id
    shard_id           = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id
    franchise_range_start = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).franchise_range_start
    franchise_range_end   = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).franchise_range_end
  })
}

# SNS Topic for database alerts
resource "aws_sns_topic" "alerts" {
  name = "${local.cluster_name}-db-alerts"
  
  tags = local.common_tags
}