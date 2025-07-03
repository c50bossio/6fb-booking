# AWS-specific variables

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "bookedbarber-v2"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
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

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Pass-through variables from shared module
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
}

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
}

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
}

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
}

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
}

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
}

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
}

variable "domain_config" {
  description = "Domain and DNS configuration"
  type = object({
    root_domain        = string
    api_subdomain      = string
    app_subdomain      = string
    cdn_subdomain      = string
    enable_apex_redirect = bool
  })
}

variable "cost_optimization" {
  description = "Cost optimization settings"
  type = object({
    enable_scheduled_scaling = bool
    scale_down_schedule     = string
    scale_up_schedule       = string
    use_spot_instances      = bool
    spot_instance_types     = list(string)
  })
}

# AWS-specific variables
variable "ecr_backend_repository" {
  description = "ECR repository URL for backend container"
  type        = string
  default     = "bookedbarber-v2-backend"
}

variable "ecr_frontend_repository" {
  description = "ECR repository URL for frontend container"
  type        = string
  default     = "bookedbarber-v2-frontend"
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key for frontend"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for domain management"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "Existing ACM certificate ARN (optional)"
  type        = string
  default     = ""
}

# AWS-specific configuration options
variable "aws_config" {
  description = "AWS-specific configuration options"
  type = object({
    enable_enhanced_monitoring = bool
    enable_rds_proxy          = bool
    enable_aurora_serverless  = bool
    enable_fargate_spot       = bool
    enable_cloudtrail         = bool
    enable_config_rules       = bool
    enable_guardduty          = bool
  })
  default = {
    enable_enhanced_monitoring = true
    enable_rds_proxy          = false
    enable_aurora_serverless  = false
    enable_fargate_spot       = false
    enable_cloudtrail         = true
    enable_config_rules       = true
    enable_guardduty          = true
  }
}

# ECS Configuration
variable "ecs_config" {
  description = "ECS-specific configuration"
  type = object({
    cluster_capacity_providers   = list(string)
    service_platform_version    = string
    enable_container_insights   = bool
    enable_execute_command      = bool
    deployment_configuration = object({
      maximum_percent         = number
      minimum_healthy_percent = number
      deployment_circuit_breaker = object({
        enable   = bool
        rollback = bool
      })
    })
  })
  default = {
    cluster_capacity_providers = ["FARGATE", "FARGATE_SPOT"]
    service_platform_version   = "LATEST"
    enable_container_insights  = true
    enable_execute_command     = true
    deployment_configuration = {
      maximum_percent         = 200
      minimum_healthy_percent = 100
      deployment_circuit_breaker = {
        enable   = true
        rollback = true
      }
    }
  }
}

# RDS Configuration
variable "rds_config" {
  description = "RDS-specific configuration"
  type = object({
    parameter_group_family  = string
    option_group_name      = string
    enable_blue_green      = bool
    snapshot_identifier    = string
    final_snapshot_identifier = string
    skip_final_snapshot    = bool
    copy_tags_to_snapshot  = bool
  })
  default = {
    parameter_group_family     = "postgres15"
    option_group_name         = ""
    enable_blue_green         = false
    snapshot_identifier       = ""
    final_snapshot_identifier = ""
    skip_final_snapshot       = false
    copy_tags_to_snapshot     = true
  }
}

# Auto Scaling Configuration
variable "autoscaling_config" {
  description = "Auto scaling configuration"
  type = object({
    target_cpu_utilization    = number
    target_memory_utilization = number
    scale_in_cooldown         = number
    scale_out_cooldown        = number
    
    scheduled_scaling = object({
      scale_up_recurrence   = string
      scale_down_recurrence = string
      scale_up_min_capacity = number
      scale_up_max_capacity = number
    })
  })
  default = {
    target_cpu_utilization    = 70
    target_memory_utilization = 80
    scale_in_cooldown         = 300
    scale_out_cooldown        = 300
    
    scheduled_scaling = {
      scale_up_recurrence   = "0 6 * * MON-FRI"
      scale_down_recurrence = "0 22 * * MON-FRI"
      scale_up_min_capacity = 2
      scale_up_max_capacity = 10
    }
  }
}