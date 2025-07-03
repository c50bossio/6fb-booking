# Shared variables used across all cloud providers and environments

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "bookedbarber-v2"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "region" {
  description = "Primary region for deployment"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Application Configuration
variable "app_config" {
  description = "Application configuration"
  type = object({
    name                = string
    version            = string
    backend_port       = number
    frontend_port      = number
    health_check_path  = string
    min_capacity       = number
    max_capacity       = number
    desired_capacity   = number
  })
  default = {
    name                = "bookedbarber-v2"
    version            = "latest"
    backend_port       = 8000
    frontend_port      = 3000
    health_check_path  = "/health"
    min_capacity       = 2
    max_capacity       = 20
    desired_capacity   = 2
  }
}

# Database Configuration
variable "database_config" {
  description = "Database configuration"
  type = object({
    engine_version          = string
    instance_class         = string
    allocated_storage      = number
    max_allocated_storage  = number
    backup_retention_days  = number
    backup_window         = string
    maintenance_window    = string
    multi_az              = bool
    encryption_enabled    = bool
    deletion_protection   = bool
  })
  default = {
    engine_version          = "15.4"
    instance_class         = "db.t3.medium"
    allocated_storage      = 100
    max_allocated_storage  = 1000
    backup_retention_days  = 7
    backup_window         = "03:00-04:00"
    maintenance_window    = "sun:04:00-sun:05:00"
    multi_az              = true
    encryption_enabled    = true
    deletion_protection   = true
  }
}

# Redis Configuration
variable "redis_config" {
  description = "Redis cache configuration"
  type = object({
    node_type                = string
    num_cache_nodes         = number
    parameter_group_name    = string
    port                    = number
    automatic_failover      = bool
    multi_az_enabled       = bool
    encryption_at_rest     = bool
    encryption_in_transit  = bool
  })
  default = {
    node_type                = "cache.t3.medium"
    num_cache_nodes         = 2
    parameter_group_name    = "default.redis7"
    port                    = 6379
    automatic_failover      = true
    multi_az_enabled       = true
    encryption_at_rest     = true
    encryption_in_transit  = true
  }
}

# Networking Configuration
variable "network_config" {
  description = "Network configuration"
  type = object({
    vpc_cidr                = string
    public_subnet_cidrs     = list(string)
    private_subnet_cidrs    = list(string)
    database_subnet_cidrs   = list(string)
    enable_nat_gateway      = bool
    enable_vpn_gateway      = bool
    enable_dns_hostnames    = bool
    enable_dns_support      = bool
  })
  default = {
    vpc_cidr                = "10.0.0.0/16"
    public_subnet_cidrs     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
    private_subnet_cidrs    = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
    database_subnet_cidrs   = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
    enable_nat_gateway      = true
    enable_vpn_gateway      = false
    enable_dns_hostnames    = true
    enable_dns_support      = true
  }
}

# Security Configuration
variable "security_config" {
  description = "Security configuration"
  type = object({
    enable_waf                    = bool
    enable_shield_advanced       = bool
    allowed_cidr_blocks          = list(string)
    ssl_certificate_arn          = string
    force_ssl                    = bool
    enable_access_logs           = bool
  })
  default = {
    enable_waf                    = true
    enable_shield_advanced       = false
    allowed_cidr_blocks          = ["0.0.0.0/0"]
    ssl_certificate_arn          = ""
    force_ssl                    = true
    enable_access_logs           = true
  }
}

# Monitoring Configuration
variable "monitoring_config" {
  description = "Monitoring and alerting configuration"
  type = object({
    enable_detailed_monitoring = bool
    log_retention_days        = number
    enable_performance_insights = bool
    alarm_email_endpoints     = list(string)
    alert_thresholds = object({
      cpu_utilization_threshold    = number
      memory_utilization_threshold = number
      database_cpu_threshold       = number
      error_rate_threshold         = number
      response_time_threshold      = number
    })
  })
  default = {
    enable_detailed_monitoring = true
    log_retention_days        = 30
    enable_performance_insights = true
    alarm_email_endpoints     = []
    alert_thresholds = {
      cpu_utilization_threshold    = 80
      memory_utilization_threshold = 80
      database_cpu_threshold       = 70
      error_rate_threshold         = 5
      response_time_threshold      = 2000
    }
  }
}

# Application Secrets (sensitive)
variable "app_secrets" {
  description = "Application secrets (sensitive)"
  type = object({
    db_master_password    = string
    jwt_secret_key       = string
    stripe_secret_key    = string
    sendgrid_api_key     = string
    twilio_auth_token    = string
    google_client_secret = string
    sentry_dsn           = string
  })
  sensitive = true
}

# External Service Configuration
variable "external_services" {
  description = "External service configuration"
  type = object({
    stripe_webhook_endpoint     = string
    sendgrid_from_email        = string
    twilio_phone_number        = string
    google_client_id           = string
    sentry_environment         = string
    google_analytics_id        = string
  })
  default = {
    stripe_webhook_endpoint     = ""
    sendgrid_from_email        = "support@bookedbarber.com"
    twilio_phone_number        = ""
    google_client_id           = ""
    sentry_environment         = "production"
    google_analytics_id        = ""
  }
}

# Domain Configuration
variable "domain_config" {
  description = "Domain and DNS configuration"
  type = object({
    root_domain        = string
    api_subdomain      = string
    app_subdomain      = string
    cdn_subdomain      = string
    enable_apex_redirect = bool
  })
  default = {
    root_domain        = "bookedbarber.com"
    api_subdomain      = "api"
    app_subdomain      = "app"
    cdn_subdomain      = "cdn"
    enable_apex_redirect = true
  }
}

# Cost Optimization
variable "cost_optimization" {
  description = "Cost optimization settings"
  type = object({
    enable_scheduled_scaling = bool
    scale_down_schedule     = string
    scale_up_schedule       = string
    use_spot_instances      = bool
    spot_instance_types     = list(string)
  })
  default = {
    enable_scheduled_scaling = false
    scale_down_schedule     = "0 22 * * MON-FRI"  # Scale down at 10 PM weekdays
    scale_up_schedule       = "0 6 * * MON-FRI"   # Scale up at 6 AM weekdays
    use_spot_instances      = false
    spot_instance_types     = ["t3.medium", "t3.large"]
  }
}