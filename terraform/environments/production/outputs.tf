# Production Environment Outputs

# Application URLs
output "application_urls" {
  description = "Application URLs for production environment"
  value = {
    frontend_url = "https://app.bookedbarber.com"
    api_url      = "https://api.bookedbarber.com"
    admin_url    = "https://admin.bookedbarber.com"
    docs_url     = "https://api.bookedbarber.com/docs"
  }
}

# Infrastructure Details
output "infrastructure_details" {
  description = "Key infrastructure component details"
  value = {
    vpc_id                    = module.aws_infrastructure.vpc_id
    load_balancer_dns_name    = module.aws_infrastructure.load_balancer_dns_name
    cloudfront_domain_name    = module.aws_infrastructure.cloudfront_domain_name
    database_endpoint         = module.aws_infrastructure.database_endpoint
    redis_endpoint           = module.aws_infrastructure.redis_endpoint
    ecs_cluster_name         = module.aws_infrastructure.cluster_name
  }
}

# Security Information
output "security_details" {
  description = "Security-related information"
  value = {
    waf_web_acl_arn           = module.aws_infrastructure.waf_web_acl_arn
    kms_key_id               = module.aws_infrastructure.database_kms_key_id
    secrets_manager_arns     = module.aws_infrastructure.secrets_manager_arns
    ssl_certificate_arn      = module.aws_infrastructure.ssl_certificate_arn
    security_group_ids       = module.aws_infrastructure.security_group_ids
  }
}

# Monitoring and Logging
output "monitoring_details" {
  description = "Monitoring and logging endpoints"
  value = {
    cloudwatch_dashboard_url = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=BookedBarber-Production-Overview"
    log_groups = {
      backend_logs   = module.aws_infrastructure.backend_log_group_name
      frontend_logs  = module.aws_infrastructure.frontend_log_group_name
      database_logs  = module.aws_infrastructure.database_log_group_name
      load_balancer_logs = module.aws_infrastructure.load_balancer_log_group_name
    }
    sns_topic_arn = aws_sns_topic.critical_alerts.arn
  }
}

# Database Connection Information
output "database_connection" {
  description = "Database connection information (sensitive data excluded)"
  value = {
    endpoint                = module.aws_infrastructure.database_endpoint
    port                   = module.aws_infrastructure.database_port
    database_name          = module.aws_infrastructure.database_name
    secrets_manager_secret = module.aws_infrastructure.database_secrets_manager_secret_name
    parameter_store_prefix = "/bookedbarber/production/database/"
  }
  sensitive = false
}

# Cache Connection Information
output "cache_connection" {
  description = "Redis cache connection information"
  value = {
    primary_endpoint   = module.aws_infrastructure.redis_primary_endpoint
    reader_endpoint    = module.aws_infrastructure.redis_reader_endpoint
    port              = module.aws_infrastructure.redis_port
    parameter_group   = module.aws_infrastructure.redis_parameter_group_name
  }
}

# Auto Scaling Information
output "autoscaling_details" {
  description = "Auto scaling configuration details"
  value = {
    backend_service_name     = module.aws_infrastructure.backend_service_name
    frontend_service_name    = module.aws_infrastructure.frontend_service_name
    min_capacity            = 3
    max_capacity            = 50
    current_desired_capacity = 5
    scaling_policies        = module.aws_infrastructure.autoscaling_policy_arns
  }
}

# Cost Management
output "cost_management" {
  description = "Cost management and budgeting information"
  value = {
    monthly_budget_limit    = var.monthly_budget_limit
    budget_alert_threshold  = var.budget_alert_threshold
    cost_allocation_tags = {
      Project     = var.project_name
      Environment = var.environment
      CostCenter  = "engineering"
    }
  }
}

# Backup and Disaster Recovery
output "backup_details" {
  description = "Backup and disaster recovery information"
  value = {
    database_backup_retention_days = var.backup_retention_days
    database_backup_window         = var.database_backup_window
    cross_region_backup_enabled    = var.cross_region_backup_enabled
    disaster_recovery_region       = var.disaster_recovery_region
    backup_vault_arn              = module.aws_infrastructure.backup_vault_arn
  }
}

# Networking Details
output "networking_details" {
  description = "Network configuration details"
  value = {
    vpc_cidr_block          = module.aws_infrastructure.vpc_cidr_block
    public_subnet_ids       = module.aws_infrastructure.public_subnet_ids
    private_subnet_ids      = module.aws_infrastructure.private_subnet_ids
    database_subnet_ids     = module.aws_infrastructure.database_subnet_ids
    nat_gateway_ips         = module.aws_infrastructure.nat_gateway_public_ips
    internet_gateway_id     = module.aws_infrastructure.internet_gateway_id
  }
}

# Container Registry Information
output "container_registry" {
  description = "ECR container registry information"
  value = {
    backend_repository_url  = module.aws_infrastructure.ecr_backend_repository_url
    frontend_repository_url = module.aws_infrastructure.ecr_frontend_repository_url
    registry_login_command  = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
  }
}

# SSL/TLS Certificate Information
output "ssl_certificate_details" {
  description = "SSL certificate information"
  value = {
    certificate_arn    = module.aws_infrastructure.ssl_certificate_arn
    domain_name        = "bookedbarber.com"
    subject_alternative_names = [
      "*.bookedbarber.com",
      "api.bookedbarber.com",
      "app.bookedbarber.com",
      "admin.bookedbarber.com"
    ]
    validation_method = "DNS"
  }
}

# Performance Insights
output "performance_insights" {
  description = "Performance monitoring details"
  value = {
    database_performance_insights_enabled = true
    application_insights_enabled          = true
    x_ray_tracing_enabled                 = module.aws_infrastructure.xray_tracing_enabled
    enhanced_monitoring_enabled           = true
  }
}

# Compliance and Governance
output "compliance_details" {
  description = "Compliance and governance information"
  value = {
    guardduty_enabled    = var.enable_guardduty
    security_hub_enabled = var.enable_security_hub
    config_enabled       = var.enable_config
    cloudtrail_enabled   = var.enable_cloudtrail
    encryption_at_rest   = {
      database = true
      cache    = true
      storage  = true
      logs     = true
    }
    encryption_in_transit = {
      application_traffic = true
      database_traffic   = true
      cache_traffic      = true
    }
  }
}

# DNS Records
output "dns_records" {
  description = "DNS records created"
  value = {
    api_record  = aws_route53_record.api.fqdn
    app_record  = aws_route53_record.app.fqdn
    www_record  = aws_route53_record.www.fqdn
    root_record = aws_route53_record.root.fqdn
  }
}

# Health Check Endpoints
output "health_check_endpoints" {
  description = "Health check endpoints for monitoring"
  value = {
    backend_health_check  = "https://api.bookedbarber.com/health"
    frontend_health_check = "https://app.bookedbarber.com/api/health"
    database_health_check = "Internal monitoring only"
    cache_health_check    = "Internal monitoring only"
  }
}

# Deployment Information
output "deployment_details" {
  description = "Deployment-related information"
  value = {
    terraform_state_bucket = "bookedbarber-terraform-state-prod"
    terraform_lock_table   = "bookedbarber-terraform-locks"
    deployment_region      = var.aws_region
    environment           = var.environment
    app_version           = var.app_version
    last_deployed         = timestamp()
  }
}

# Critical Alert Configuration
output "alerting_configuration" {
  description = "Alerting and notification configuration"
  value = {
    sns_topic_arn           = aws_sns_topic.critical_alerts.arn
    alert_email_addresses   = var.alert_email_addresses
    pagerduty_integration   = var.pagerduty_integration_key != "" ? "Configured" : "Not configured"
    critical_alarms = [
      aws_cloudwatch_metric_alarm.high_error_rate.alarm_name,
      aws_cloudwatch_metric_alarm.database_cpu_high.alarm_name
    ]
  }
}

# Resource ARNs (for integration with other systems)
output "resource_arns" {
  description = "ARNs of key resources for integration"
  value = {
    load_balancer_arn           = module.aws_infrastructure.load_balancer_arn
    ecs_cluster_arn            = module.aws_infrastructure.ecs_cluster_arn
    database_instance_arn      = module.aws_infrastructure.database_instance_arn
    cloudfront_distribution_arn = module.aws_infrastructure.cloudfront_distribution_arn
    s3_bucket_arn              = module.aws_infrastructure.s3_bucket_arn
    waf_web_acl_arn           = module.aws_infrastructure.waf_web_acl_arn
  }
}

# Summary for operations team
output "operations_summary" {
  description = "High-level summary for operations team"
  value = {
    environment           = "production"
    region               = var.aws_region
    high_availability    = "Multi-AZ deployment with auto-scaling"
    disaster_recovery    = var.cross_region_backup_enabled ? "Cross-region backups enabled" : "Single region"
    monitoring          = "CloudWatch + SNS alerts configured"
    security            = "WAF + GuardDuty + Security Hub enabled"
    backup_retention    = "${var.backup_retention_days} days"
    estimated_monthly_cost = "$${var.monthly_budget_limit}"
    scaling_capacity    = "3-50 instances with auto-scaling"
    ssl_certificate     = "ACM certificate with auto-renewal"
    cdn                 = "CloudFront global distribution"
    database_engine     = "PostgreSQL 15.4 with Performance Insights"
    cache_engine        = "Redis 7 with cluster mode"
  }
}