# Production Environment Variables for BookedBarber V2

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "bookedbarber-v2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "app_version" {
  description = "Application version to deploy"
  type        = string
  default     = "latest"
}

# Domain and DNS Configuration
variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for bookedbarber.com"
  type        = string
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate in ACM"
  type        = string
  default     = ""
}

# External Service Configuration
variable "stripe_publishable_key" {
  description = "Stripe publishable key for frontend"
  type        = string
}

variable "twilio_phone_number" {
  description = "Twilio phone number for SMS notifications"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
}

variable "google_analytics_id" {
  description = "Google Analytics tracking ID"
  type        = string
  default     = ""
}

# Monitoring and Alerting
variable "alert_email_addresses" {
  description = "List of email addresses for critical alerts"
  type        = list(string)
  default     = ["devops@bookedbarber.com", "alerts@bookedbarber.com"]
}

variable "pagerduty_integration_key" {
  description = "PagerDuty integration key for critical alerts"
  type        = string
  default     = ""
  sensitive   = true
}

# Feature Flags
variable "enable_blue_green_deployment" {
  description = "Enable blue/green deployments for zero-downtime updates"
  type        = bool
  default     = true
}

variable "enable_read_replica" {
  description = "Enable read replica for database"
  type        = bool
  default     = true
}

variable "enable_multi_region" {
  description = "Enable multi-region deployment"
  type        = bool
  default     = false
}

variable "enable_waf_advanced_rules" {
  description = "Enable advanced WAF rules for enhanced security"
  type        = bool
  default     = true
}

# Backup and Disaster Recovery
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "cross_region_backup_enabled" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = true
}

variable "disaster_recovery_region" {
  description = "AWS region for disaster recovery"
  type        = string
  default     = "us-west-2"
}

# Performance Configuration
variable "database_performance_insights_retention" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
  validation {
    condition     = contains([7, 731], var.database_performance_insights_retention)
    error_message = "Performance Insights retention must be either 7 or 731 days."
  }
}

variable "enable_database_proxy" {
  description = "Enable RDS Proxy for connection pooling"
  type        = bool
  default     = true
}

variable "cloudfront_price_class" {
  description = "CloudFront price class for global distribution"
  type        = string
  default     = "PriceClass_All"
  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "CloudFront price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

# Security Configuration
variable "enable_guardduty" {
  description = "Enable GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_security_hub" {
  description = "Enable Security Hub for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Enable AWS Config for configuration compliance"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for API logging"
  type        = bool
  default     = true
}

variable "vpc_flow_logs_retention" {
  description = "VPC Flow Logs retention period in days"
  type        = number
  default     = 30
}

# Cost Management
variable "enable_cost_anomaly_detection" {
  description = "Enable cost anomaly detection"
  type        = bool
  default     = true
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 5000
}

variable "budget_alert_threshold" {
  description = "Budget alert threshold percentage"
  type        = number
  default     = 80
  validation {
    condition     = var.budget_alert_threshold > 0 && var.budget_alert_threshold <= 100
    error_message = "Budget alert threshold must be between 1 and 100."
  }
}

# Auto Scaling Configuration
variable "auto_scaling_target_cpu" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 60
  validation {
    condition     = var.auto_scaling_target_cpu > 0 && var.auto_scaling_target_cpu <= 100
    error_message = "Auto scaling target CPU must be between 1 and 100."
  }
}

variable "auto_scaling_target_memory" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 70
  validation {
    condition     = var.auto_scaling_target_memory > 0 && var.auto_scaling_target_memory <= 100
    error_message = "Auto scaling target memory must be between 1 and 100."
  }
}

# Container Configuration
variable "backend_cpu" {
  description = "CPU units for backend containers (1024 = 1 vCPU)"
  type        = number
  default     = 2048
}

variable "backend_memory" {
  description = "Memory for backend containers in MB"
  type        = number
  default     = 4096
}

variable "frontend_cpu" {
  description = "CPU units for frontend containers (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "frontend_memory" {
  description = "Memory for frontend containers in MB"
  type        = number
  default     = 2048
}

# Redis Configuration
variable "redis_num_cache_clusters" {
  description = "Number of cache clusters in Redis replication group"
  type        = number
  default     = 3
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover for Redis"
  type        = bool
  default     = true
}

# Database Configuration
variable "database_instance_class" {
  description = "RDS instance class for production"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "database_allocated_storage" {
  description = "Initial database storage in GB"
  type        = number
  default     = 500
}

variable "database_max_allocated_storage" {
  description = "Maximum database storage in GB"
  type        = number
  default     = 10000
}

variable "database_iops" {
  description = "IOPS for database storage"
  type        = number
  default     = 3000
}

# Logging Configuration
variable "application_log_retention_days" {
  description = "Application log retention in days"
  type        = number
  default     = 90
}

variable "access_log_retention_days" {
  description = "Access log retention in days"
  type        = number
  default     = 30
}

# Maintenance Configuration
variable "database_maintenance_window" {
  description = "Database maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "database_backup_window" {
  description = "Database backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}