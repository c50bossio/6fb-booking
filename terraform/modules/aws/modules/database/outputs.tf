# Outputs for AWS RDS PostgreSQL Module

output "instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "username" {
  description = "Database username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "connection_string" {
  description = "Database connection string"
  value       = "postgresql://${aws_db_instance.main.username}:${local.db_password}@${aws_db_instance.main.endpoint}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

output "connection_string_no_password" {
  description = "Database connection string without password (for non-sensitive contexts)"
  value       = "postgresql://${aws_db_instance.main.username}:***@${aws_db_instance.main.endpoint}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
}

# Read Replica Outputs
output "read_replica_id" {
  description = "Read replica instance ID"
  value       = var.create_read_replica && var.environment == "production" ? aws_db_instance.read_replica[0].id : null
}

output "read_replica_endpoint" {
  description = "Read replica endpoint"
  value       = var.create_read_replica && var.environment == "production" ? aws_db_instance.read_replica[0].endpoint : null
}

output "read_replica_connection_string" {
  description = "Read replica connection string"
  value       = var.create_read_replica && var.environment == "production" ? "postgresql://${aws_db_instance.main.username}:${local.db_password}@${aws_db_instance.read_replica[0].endpoint}:${aws_db_instance.read_replica[0].port}/${aws_db_instance.main.db_name}" : null
  sensitive   = true
}

# Security and Secrets
output "secrets_manager_secret_arn" {
  description = "ARN of Secrets Manager secret containing database credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secrets_manager_secret_name" {
  description = "Name of Secrets Manager secret containing database credentials"
  value       = aws_secretsmanager_secret.db_credentials.name
}

output "kms_key_id" {
  description = "KMS key ID used for encryption"
  value       = var.storage_encrypted ? aws_kms_key.rds[0].key_id : null
}

output "kms_key_arn" {
  description = "KMS key ARN used for encryption"
  value       = var.storage_encrypted ? aws_kms_key.rds[0].arn : null
}

# Parameter and Option Groups
output "parameter_group_name" {
  description = "Name of the parameter group"
  value       = aws_db_parameter_group.main.name
}

output "parameter_group_arn" {
  description = "ARN of the parameter group"
  value       = aws_db_parameter_group.main.arn
}

output "option_group_name" {
  description = "Name of the option group"
  value       = var.option_group_name != "" ? var.option_group_name : aws_db_option_group.main[0].name
}

output "option_group_arn" {
  description = "ARN of the option group"
  value       = var.option_group_name != "" ? null : aws_db_option_group.main[0].arn
}

# Monitoring
output "enhanced_monitoring_role_arn" {
  description = "ARN of enhanced monitoring IAM role"
  value       = var.monitoring_interval > 0 ? aws_iam_role.enhanced_monitoring[0].arn : null
}

output "cloudwatch_log_group_name" {
  description = "Name of CloudWatch log group for PostgreSQL logs"
  value       = aws_cloudwatch_log_group.postgresql.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of CloudWatch log group for PostgreSQL logs"
  value       = aws_cloudwatch_log_group.postgresql.arn
}

# SSM Parameters
output "ssm_parameter_arns" {
  description = "ARNs of SSM parameters"
  value = {
    host     = aws_ssm_parameter.db_host.arn
    port     = aws_ssm_parameter.db_port.arn
    name     = aws_ssm_parameter.db_name.arn
    username = aws_ssm_parameter.db_username.arn
  }
}

output "ssm_parameter_names" {
  description = "Names of SSM parameters"
  value = {
    host     = aws_ssm_parameter.db_host.name
    port     = aws_ssm_parameter.db_port.name
    name     = aws_ssm_parameter.db_name.name
    username = aws_ssm_parameter.db_username.name
  }
}

# Instance Details
output "instance_status" {
  description = "RDS instance status"
  value       = aws_db_instance.main.status
}

output "instance_class" {
  description = "RDS instance class"
  value       = aws_db_instance.main.instance_class
}

output "engine_version" {
  description = "RDS engine version"
  value       = aws_db_instance.main.engine_version
}

output "allocated_storage" {
  description = "Allocated storage in GB"
  value       = aws_db_instance.main.allocated_storage
}

output "availability_zone" {
  description = "Availability zone"
  value       = aws_db_instance.main.availability_zone
}

output "backup_retention_period" {
  description = "Backup retention period"
  value       = aws_db_instance.main.backup_retention_period
}

output "backup_window" {
  description = "Backup window"
  value       = aws_db_instance.main.backup_window
}

output "maintenance_window" {
  description = "Maintenance window"
  value       = aws_db_instance.main.maintenance_window
}

output "multi_az" {
  description = "Multi-AZ deployment status"
  value       = aws_db_instance.main.multi_az
}

output "storage_encrypted" {
  description = "Storage encryption status"
  value       = aws_db_instance.main.storage_encrypted
}

output "performance_insights_enabled" {
  description = "Performance Insights status"
  value       = aws_db_instance.main.performance_insights_enabled
}

# For monitoring and alerting
output "monitoring_targets" {
  description = "Monitoring targets for CloudWatch alarms"
  value = {
    instance_id = aws_db_instance.main.id
    instance_class = aws_db_instance.main.instance_class
    engine = aws_db_instance.main.engine
    multi_az = aws_db_instance.main.multi_az
    read_replica_id = var.create_read_replica && var.environment == "production" ? aws_db_instance.read_replica[0].id : null
  }
}