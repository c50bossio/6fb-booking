# Variables for AWS RDS PostgreSQL Module

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "database_subnet_ids" {
  description = "List of subnet IDs for database"
  type        = list(string)
}

variable "database_security_group_id" {
  description = "Security group ID for database"
  type        = string
}

variable "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  type        = string
  default     = ""
}

# Database Engine Configuration
variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

# Storage Configuration
variable "allocated_storage" {
  description = "Initial storage allocation in GB"
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "Maximum storage allocation in GB (for autoscaling)"
  type        = number
  default     = 1000
}

variable "storage_encrypted" {
  description = "Enable storage encryption"
  type        = bool
  default     = true
}

# Database Configuration
variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "bookedbarber"
}

variable "db_username" {
  description = "Username for the database"
  type        = string
  default     = "bookedbarber_user"
}

variable "db_password" {
  description = "Password for the database (leave empty for auto-generated)"
  type        = string
  default     = ""
  sensitive   = true
}

# High Availability Configuration
variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "availability_zone" {
  description = "Availability zone for single-AZ deployment"
  type        = string
  default     = null
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "delete_automated_backups" {
  description = "Delete automated backups when instance is deleted"
  type        = bool
  default     = false
}

# Maintenance Configuration
variable "maintenance_window" {
  description = "Maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

# Monitoring Configuration
variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds (0 to disable)"
  type        = number
  default     = 60
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60."
  }
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Snapshot Configuration
variable "snapshot_identifier" {
  description = "Snapshot identifier to restore from"
  type        = string
  default     = ""
}

variable "final_snapshot_identifier" {
  description = "Final snapshot identifier"
  type        = string
  default     = ""
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when deleting"
  type        = bool
  default     = false
}

# Parameter and Option Groups
variable "parameter_group_name" {
  description = "Name of custom parameter group"
  type        = string
  default     = ""
}

variable "option_group_name" {
  description = "Name of custom option group"
  type        = string
  default     = ""
}

# Read Replica Configuration
variable "create_read_replica" {
  description = "Create a read replica"
  type        = bool
  default     = false
}

variable "read_replica_instance_class" {
  description = "Instance class for read replica"
  type        = string
  default     = ""
}

variable "read_replica_availability_zone" {
  description = "Availability zone for read replica"
  type        = string
  default     = null
}

# Blue/Green Deployment
variable "enable_blue_green" {
  description = "Enable blue/green deployments"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}