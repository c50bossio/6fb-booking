# AWS RDS PostgreSQL Module for BookedBarber V2

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Random password for database
resource "random_password" "db_password" {
  count   = var.db_password == "" ? 1 : 0
  length  = 32
  special = true
}

locals {
  db_password = var.db_password != "" ? var.db_password : random_password.db_password[0].result
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  count = var.storage_encrypted ? 1 : 0
  
  description             = "KMS key for RDS encryption - ${var.project_name}-${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-kms"
    Type = "KMS Key"
  })
}

resource "aws_kms_alias" "rds" {
  count = var.storage_encrypted ? 1 : 0
  
  name          = "alias/${var.project_name}-${var.environment}-rds"
  target_key_id = aws_kms_key.rds[0].key_id
}

# Enhanced monitoring role
resource "aws_iam_role" "enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-rds-enhanced-monitoring"

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

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0
  
  role       = aws_iam_role.enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.project_name}-${var.environment}-postgres15"

  # Performance optimizations for BookedBarber workload
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  parameter {
    name  = "log_line_prefix"
    value = "%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h "
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
    name  = "log_temp_files"
    value = "0"
  }

  parameter {
    name  = "log_autovacuum_min_duration"
    value = "0"
  }

  # Connection and memory settings
  parameter {
    name  = "max_connections"
    value = var.environment == "production" ? "200" : "100"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "work_mem"
    value = "4096"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "65536"
  }

  # Checkpoint and WAL settings
  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "wal_buffers"
    value = "16384"
  }

  parameter {
    name  = "default_statistics_target"
    value = "100"
  }

  # Autovacuum settings for high-traffic booking system
  parameter {
    name  = "autovacuum_vacuum_threshold"
    value = "50"
  }

  parameter {
    name  = "autovacuum_analyze_threshold"
    value = "50"
  }

  parameter {
    name  = "autovacuum_vacuum_scale_factor"
    value = "0.1"
  }

  parameter {
    name  = "autovacuum_analyze_scale_factor"
    value = "0.05"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-pg-params"
    Type = "DB Parameter Group"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Option Group (if needed for specific PostgreSQL extensions)
resource "aws_db_option_group" "main" {
  count = var.option_group_name == "" ? 1 : 0
  
  name                     = "${var.project_name}-${var.environment}-postgres15"
  option_group_description = "Option group for ${var.project_name} ${var.environment}"
  engine_name             = "postgres"
  major_engine_version    = "15"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-pg-options"
    Type = "DB Option Group"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Main RDS instance
resource "aws_db_instance" "main" {
  # Basic configuration
  identifier     = "${var.project_name}-${var.environment}-postgres"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  # Storage configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = var.storage_encrypted
  kms_key_id          = var.storage_encrypted ? aws_kms_key.rds[0].arn : null

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = local.db_password

  # Network configuration
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [var.database_security_group_id]
  publicly_accessible    = false
  port                   = 5432

  # High availability
  multi_az               = var.multi_az
  availability_zone      = var.multi_az ? null : var.availability_zone

  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  copy_tags_to_snapshot  = true
  delete_automated_backups = false
  deletion_protection    = var.deletion_protection

  # Maintenance
  maintenance_window         = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately         = false

  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.main.name
  option_group_name   = var.option_group_name != "" ? var.option_group_name : aws_db_option_group.main[0].name

  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_interval > 0 ? aws_iam_role.enhanced_monitoring[0].arn : null

  # Performance Insights
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_enabled ? 7 : null

  # Snapshot configuration
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  skip_final_snapshot      = var.skip_final_snapshot
  snapshot_identifier      = var.snapshot_identifier

  # Blue/Green deployment
  blue_green_update {
    enabled = var.enable_blue_green
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres"
    Type = "RDS Instance"
  })

  depends_on = [
    aws_db_parameter_group.main
  ]

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      password,
      snapshot_identifier
    ]
  }
}

# Read replica (optional, for production only)
resource "aws_db_instance" "read_replica" {
  count = var.create_read_replica && var.environment == "production" ? 1 : 0

  identifier             = "${var.project_name}-${var.environment}-postgres-replica"
  replicate_source_db    = aws_db_instance.main.identifier
  instance_class         = var.read_replica_instance_class != "" ? var.read_replica_instance_class : var.instance_class
  
  # Replica-specific settings
  publicly_accessible    = false
  monitoring_interval    = var.monitoring_interval
  monitoring_role_arn    = var.monitoring_interval > 0 ? aws_iam_role.enhanced_monitoring[0].arn : null
  
  performance_insights_enabled = var.performance_insights_enabled
  
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  
  # Place in different AZ for disaster recovery
  availability_zone = var.read_replica_availability_zone

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-replica"
    Type = "RDS Read Replica"
  })

  lifecycle {
    prevent_destroy = true
  }
}

# CloudWatch Log Groups for RDS logs
resource "aws_cloudwatch_log_group" "postgresql" {
  name              = "/aws/rds/instance/${aws_db_instance.main.identifier}/postgresql"
  retention_in_days = var.log_retention_days
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres-logs"
    Type = "CloudWatch Log Group"
  })
}

# Secrets Manager secret for database credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project_name}-${var.environment}-db-credentials"
  description = "Database credentials for ${var.project_name} ${var.environment}"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-credentials"
    Type = "Secrets Manager Secret"
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = local.db_password
    engine   = "postgres"
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    dbname   = var.db_name
    url      = "postgresql://${var.db_username}:${local.db_password}@${aws_db_instance.main.endpoint}:${aws_db_instance.main.port}/${var.db_name}"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Parameter Store entries for easy application access
resource "aws_ssm_parameter" "db_host" {
  name  = "/${var.project_name}/${var.environment}/database/host"
  type  = "String"
  value = aws_db_instance.main.endpoint

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-host"
    Type = "SSM Parameter"
  })
}

resource "aws_ssm_parameter" "db_port" {
  name  = "/${var.project_name}/${var.environment}/database/port"
  type  = "String"
  value = tostring(aws_db_instance.main.port)

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-port"
    Type = "SSM Parameter"
  })
}

resource "aws_ssm_parameter" "db_name" {
  name  = "/${var.project_name}/${var.environment}/database/name"
  type  = "String"
  value = aws_db_instance.main.db_name

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-name"
    Type = "SSM Parameter"
  })
}

resource "aws_ssm_parameter" "db_username" {
  name  = "/${var.project_name}/${var.environment}/database/username"
  type  = "String"
  value = aws_db_instance.main.username

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-username"
    Type = "SSM Parameter"
  })
}