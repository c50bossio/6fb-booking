# BookedBarber V2 - Global Database Sharding Infrastructure
# Terraform module for PostgreSQL sharding across multiple regions

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.15"
    }
  }
}

# Variables for database sharding configuration
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "regions" {
  description = "List of AWS regions for database deployment"
  type = list(object({
    name     = string
    primary  = bool
    shards   = list(number)
  }))
  default = [
    {
      name     = "us-east-1"
      primary  = true
      shards   = [1, 2]
    },
    {
      name     = "us-west-2"
      primary  = false
      shards   = [1, 2]  # Read replicas
    },
    {
      name     = "eu-west-1"
      primary  = true
      shards   = [3]
    },
    {
      name     = "ap-southeast-1"
      primary  = true
      shards   = [4]
    }
  ]
}

variable "db_instance_class" {
  description = "RDS instance class for primary databases"
  type        = string
  default     = "r6g.16xlarge"
}

variable "replica_instance_class" {
  description = "RDS instance class for read replicas"
  type        = string
  default     = "r6g.8xlarge"
}

variable "allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 2000
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage for auto-scaling"
  type        = number
  default     = 20000
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}

# Local variables for resource naming
locals {
  name_prefix = "bookedbarber-v2-${var.environment}"
  
  # Database sharding configuration
  shard_configs = {
    1 = {
      name_suffix      = "us-east"
      franchise_range  = "1-25000"
      backup_window    = "03:00-04:00"
      maintenance_window = "sun:04:00-sun:05:00"
    }
    2 = {
      name_suffix      = "us-west"
      franchise_range  = "25001-50000"
      backup_window    = "06:00-07:00"
      maintenance_window = "sun:07:00-sun:08:00"
    }
    3 = {
      name_suffix      = "eu"
      franchise_range  = "50001-75000"
      backup_window    = "01:00-02:00"
      maintenance_window = "sun:02:00-sun:03:00"
    }
    4 = {
      name_suffix      = "apac"
      franchise_range  = "75001-100000"
      backup_window    = "10:00-11:00"
      maintenance_window = "sun:11:00-sun:12:00"
    }
  }
}

# KMS key for database encryption
resource "aws_kms_key" "database" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  description             = "KMS key for BookedBarber V2 database encryption in ${each.value.name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = {
    Name        = "${local.name_prefix}-db-key-${each.value.name}"
    Environment = var.environment
    Service     = "database"
    Region      = each.value.name
  }
}

resource "aws_kms_alias" "database" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  name          = "alias/${local.name_prefix}-db-${each.value.name}"
  target_key_id = aws_kms_key.database[each.key].key_id
}

# Database subnet groups for each region
resource "aws_db_subnet_group" "main" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  name       = "${local.name_prefix}-db-subnet-group-${each.value.name}"
  subnet_ids = data.aws_subnets.database[each.key].ids
  
  tags = {
    Name        = "${local.name_prefix}-db-subnet-group-${each.value.name}"
    Environment = var.environment
    Service     = "database"
    Region      = each.value.name
  }
}

# Security group for database access
resource "aws_security_group" "database" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  name_prefix = "${local.name_prefix}-db-sg-${each.value.name}-"
  vpc_id      = data.aws_vpc.main[each.key].id
  description = "Security group for BookedBarber V2 database in ${each.value.name}"
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [data.aws_security_group.application[each.key].id]
    description     = "PostgreSQL access from application servers"
  }
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "PostgreSQL access from VPC"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }
  
  tags = {
    Name        = "${local.name_prefix}-db-sg-${each.value.name}"
    Environment = var.environment
    Service     = "database"
    Region      = each.value.name
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Parameter group for PostgreSQL optimization
resource "aws_db_parameter_group" "main" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  family = "postgres15"
  name   = "${local.name_prefix}-db-params-${each.value.name}"
  
  # Optimizations for high-performance booking workload
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pg_hint_plan,auto_explain"
  }
  
  parameter {
    name  = "max_connections"
    value = "10000"
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
    name  = "maintenance_work_mem"
    value = "2048000"
  }
  
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
    value = "1000"
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
    value = "52428"
  }
  
  parameter {
    name  = "min_wal_size"
    value = "2048"
  }
  
  parameter {
    name  = "max_wal_size"
    value = "8192"
  }
  
  parameter {
    name  = "max_worker_processes"
    value = "16"
  }
  
  parameter {
    name  = "max_parallel_workers_per_gather"
    value = "8"
  }
  
  parameter {
    name  = "max_parallel_workers"
    value = "16"
  }
  
  parameter {
    name  = "max_parallel_maintenance_workers"
    value = "4"
  }
  
  # Query logging and monitoring
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
    name  = "log_statement"
    value = "ddl"
  }
  
  parameter {
    name  = "auto_explain.log_min_duration"
    value = "5000"
  }
  
  parameter {
    name  = "auto_explain.log_analyze"
    value = "1"
  }
  
  parameter {
    name  = "auto_explain.log_buffers"
    value = "1"
  }
  
  tags = {
    Name        = "${local.name_prefix}-db-params-${each.value.name}"
    Environment = var.environment
    Service     = "database"
    Region      = each.value.name
  }
}

# Primary database instances (one per shard per region)
resource "aws_db_instance" "primary" {
  for_each = {
    for combination in flatten([
      for region in var.regions : [
        for shard in region.shards : {
          key            = "${region.name}-shard-${shard}"
          region_name    = region.name
          shard_id       = shard
          is_primary     = region.primary
        } if region.primary
      ]
    ]) : combination.key => combination
  }
  
  provider = aws.${replace(each.value.region_name, "-", "_")}
  
  identifier = "${local.name_prefix}-primary-shard-${each.value.shard_id}-${each.value.region_name}"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class
  
  # Storage configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "io2"
  iops                  = 50000
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.database[each.value.region_name].arn
  
  # Database configuration
  db_name  = "bookedbarber_shard_${each.value.shard_id}"
  username = "postgres"
  password = random_password.db_password[each.value.shard_id].result
  port     = 5432
  
  # Network and security
  db_subnet_group_name   = aws_db_subnet_group.main[each.value.region_name].name
  vpc_security_group_ids = [aws_security_group.database[each.value.region_name].id]
  publicly_accessible    = false
  
  # Backup and maintenance
  backup_retention_period = var.backup_retention_period
  backup_window          = local.shard_configs[each.value.shard_id].backup_window
  maintenance_window     = local.shard_configs[each.value.shard_id].maintenance_window
  copy_tags_to_snapshot  = true
  delete_automated_backups = false
  deletion_protection    = var.environment == "production"
  
  # High availability
  multi_az = true
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.main[each.value.region_name].name
  
  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring[each.value.region_name].arn
  
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id      = aws_kms_key.database[each.value.region_name].arn
  
  # Logging
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  # Upgrades
  auto_minor_version_upgrade = false
  allow_major_version_upgrade = false
  
  tags = {
    Name         = "${local.name_prefix}-primary-shard-${each.value.shard_id}-${each.value.region_name}"
    Environment  = var.environment
    Service      = "database"
    Role         = "primary"
    Shard        = each.value.shard_id
    Region       = each.value.region_name
    FranchiseRange = local.shard_configs[each.value.shard_id].franchise_range
  }
  
  depends_on = [aws_db_parameter_group.main]
}

# Read replica instances
resource "aws_db_instance" "replica" {
  for_each = {
    for combination in flatten([
      for region in var.regions : [
        for shard in region.shards : [
          for i in range(3) : {  # 3 read replicas per shard
            key              = "${region.name}-shard-${shard}-replica-${i}"
            region_name      = region.name
            shard_id         = shard
            replica_index    = i
            source_identifier = "${local.name_prefix}-primary-shard-${shard}-${region.name}"
          }
        ] if region.primary
      ]
    ]) : combination.key => combination
  }
  
  provider = aws.${replace(each.value.region_name, "-", "_")}
  
  identifier = "${local.name_prefix}-replica-shard-${each.value.shard_id}-${each.value.replica_index}-${each.value.region_name}"
  
  # Replica configuration
  replicate_source_db = aws_db_instance.primary["${each.value.region_name}-shard-${each.value.shard_id}"].identifier
  instance_class      = var.replica_instance_class
  
  # Storage (inherited from source)
  storage_encrypted = true
  
  # Network and security
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.database[each.value.region_name].id]
  
  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring[each.value.region_name].arn
  
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  
  # Logging
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  # Upgrades
  auto_minor_version_upgrade = false
  
  tags = {
    Name         = "${local.name_prefix}-replica-shard-${each.value.shard_id}-${each.value.replica_index}-${each.value.region_name}"
    Environment  = var.environment
    Service      = "database"
    Role         = "replica"
    Shard        = each.value.shard_id
    ReplicaIndex = each.value.replica_index
    Region       = each.value.region_name
    FranchiseRange = local.shard_configs[each.value.shard_id].franchise_range
  }
  
  depends_on = [aws_db_instance.primary]
}

# Cross-region read replicas for disaster recovery
resource "aws_db_instance" "cross_region_replica" {
  for_each = {
    for combination in flatten([
      for source_region in var.regions : [
        for target_region in var.regions : [
          for shard in source_region.shards : {
            key               = "${target_region.name}-from-${source_region.name}-shard-${shard}"
            source_region     = source_region.name
            target_region     = target_region.name
            shard_id          = shard
            source_identifier = "${local.name_prefix}-primary-shard-${shard}-${source_region.name}"
          } if source_region.primary && target_region.name != source_region.name && !target_region.primary
        ]
      ]
    ]) : combination.key => combination
  }
  
  provider = aws.${replace(each.value.target_region, "-", "_")}
  
  identifier = "${local.name_prefix}-dr-replica-shard-${each.value.shard_id}-${each.value.target_region}"
  
  # Cross-region replica configuration
  replicate_source_db = aws_db_instance.primary["${each.value.source_region}-shard-${each.value.shard_id}"].identifier
  instance_class      = var.replica_instance_class
  
  # Storage
  storage_encrypted = true
  kms_key_id       = aws_kms_key.database[each.value.target_region].arn
  
  # Network and security
  db_subnet_group_name   = aws_db_subnet_group.main[each.value.target_region].name
  vpc_security_group_ids = [aws_security_group.database[each.value.target_region].id]
  publicly_accessible    = false
  
  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring[each.value.target_region].arn
  
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id      = aws_kms_key.database[each.value.target_region].arn
  
  tags = {
    Name         = "${local.name_prefix}-dr-replica-shard-${each.value.shard_id}-${each.value.target_region}"
    Environment  = var.environment
    Service      = "database"
    Role         = "disaster-recovery"
    Shard        = each.value.shard_id
    SourceRegion = each.value.source_region
    Region       = each.value.target_region
    FranchiseRange = local.shard_configs[each.value.shard_id].franchise_range
  }
  
  depends_on = [aws_db_instance.primary]
}

# Random passwords for database authentication
resource "random_password" "db_password" {
  for_each = { for i in [1, 2, 3, 4] : i => i }
  
  length  = 32
  special = true
}

# Store database passwords in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  for_each = { 
    for combination in flatten([
      for region in var.regions : [
        for shard in [1, 2, 3, 4] : {
          key         = "${region.name}-shard-${shard}"
          region_name = region.name
          shard_id    = shard
        }
      ]
    ]) : combination.key => combination
  }
  
  provider = aws.${replace(each.value.region_name, "-", "_")}
  
  name        = "${local.name_prefix}/database/shard-${each.value.shard_id}/password"
  description = "Database password for shard ${each.value.shard_id} in ${each.value.region_name}"
  
  kms_key_id = aws_kms_key.database[each.value.region_name].arn
  
  tags = {
    Name        = "${local.name_prefix}-db-password-shard-${each.value.shard_id}"
    Environment = var.environment
    Service     = "database"
    Shard       = each.value.shard_id
    Region      = each.value.region_name
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  for_each = aws_secretsmanager_secret.db_password
  
  provider = aws.${replace(split("-", each.value.name)[3], "_", "-")}
  
  secret_id = each.value.id
  secret_string = jsonencode({
    username = "postgres"
    password = random_password.db_password[split("-", each.key)[2]].result
    endpoint = aws_db_instance.primary["${split("-", each.key)[0]}-${split("-", each.key)[1]}-shard-${split("-", each.key)[2]}"].endpoint
    port     = 5432
    database = "bookedbarber_shard_${split("-", each.key)[2]}"
  })
}

# IAM role for RDS enhanced monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  name = "${local.name_prefix}-rds-monitoring-role-${each.value.name}"
  
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
  
  tags = {
    Name        = "${local.name_prefix}-rds-monitoring-role-${each.value.name}"
    Environment = var.environment
    Service     = "database"
    Region      = each.value.name
  }
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  role       = aws_iam_role.rds_enhanced_monitoring[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch alarms for database monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  for_each = aws_db_instance.primary
  
  provider = aws.${replace(split("-", each.key)[0], "_", "-")}
  
  alarm_name          = "${each.value.identifier}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.database_alerts[split("-", each.key)[0]].arn]
  
  dimensions = {
    DBInstanceIdentifier = each.value.identifier
  }
  
  tags = {
    Name        = "${each.value.identifier}-cpu-alarm"
    Environment = var.environment
    Service     = "database"
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  for_each = aws_db_instance.primary
  
  provider = aws.${replace(split("-", each.key)[0], "_", "-")}
  
  alarm_name          = "${each.value.identifier}-database-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "8000"
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.database_alerts[split("-", each.key)[0]].arn]
  
  dimensions = {
    DBInstanceIdentifier = each.value.identifier
  }
  
  tags = {
    Name        = "${each.value.identifier}-connections-alarm"
    Environment = var.environment
    Service     = "database"
  }
}

# SNS topics for database alerts
resource "aws_sns_topic" "database_alerts" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  name = "${local.name_prefix}-database-alerts-${each.value.name}"
  
  tags = {
    Name        = "${local.name_prefix}-database-alerts-${each.value.name}"
    Environment = var.environment
    Service     = "database"
    Region      = each.value.name
  }
}

# Data sources for existing infrastructure
data "aws_vpc" "main" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  filter {
    name   = "tag:Name"
    values = ["${local.name_prefix}-vpc-${each.value.name}"]
  }
}

data "aws_subnets" "database" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main[each.key].id]
  }
  
  filter {
    name   = "tag:Type"
    values = ["database"]
  }
}

data "aws_security_group" "application" {
  for_each = { for region in var.regions : region.name => region }
  
  provider = aws.${replace(each.value.name, "-", "_")}
  
  filter {
    name   = "tag:Name"
    values = ["${local.name_prefix}-app-sg-${each.value.name}"]
  }
}

# Outputs
output "primary_endpoints" {
  description = "Endpoints for primary database instances"
  value = {
    for k, v in aws_db_instance.primary : k => {
      endpoint = v.endpoint
      port     = v.port
      database = v.db_name
    }
  }
}

output "replica_endpoints" {
  description = "Endpoints for read replica instances"
  value = {
    for k, v in aws_db_instance.replica : k => {
      endpoint = v.endpoint
      port     = v.port
    }
  }
}

output "cross_region_replica_endpoints" {
  description = "Endpoints for cross-region replica instances"
  value = {
    for k, v in aws_db_instance.cross_region_replica : k => {
      endpoint = v.endpoint
      port     = v.port
    }
  }
}

output "secret_arns" {
  description = "ARNs of database password secrets"
  value = {
    for k, v in aws_secretsmanager_secret.db_password : k => v.arn
  }
}

output "shard_configuration" {
  description = "Database shard configuration"
  value = local.shard_configs
}