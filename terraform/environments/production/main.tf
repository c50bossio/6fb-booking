# BookedBarber V2 - Production Environment
# This configuration deploys the complete production infrastructure

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }

  # Backend configuration for state management
  backend "s3" {
    bucket         = "bookedbarber-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "bookedbarber-terraform-locks"
    encrypt        = true
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "bookedbarber-v2"
      Environment = "production"
      ManagedBy   = "terraform"
      Owner       = "devops-team"
      CostCenter  = "engineering"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  
  common_tags = {
    Project      = var.project_name
    Environment  = var.environment
    Region       = local.region
    AccountId    = local.account_id
    ManagedBy    = "terraform"
    Owner        = "devops-team"
    CostCenter   = "engineering"
    Application  = "bookedbarber-v2"
    CreatedDate  = formatdate("YYYY-MM-DD", timestamp())
  }
}

# Load sensitive variables from AWS Parameter Store or environment
data "aws_ssm_parameter" "db_master_password" {
  name = "/bookedbarber/production/secrets/db_master_password"
}

data "aws_ssm_parameter" "jwt_secret_key" {
  name = "/bookedbarber/production/secrets/jwt_secret_key"
}

data "aws_ssm_parameter" "stripe_secret_key" {
  name = "/bookedbarber/production/secrets/stripe_secret_key"
}

data "aws_ssm_parameter" "sendgrid_api_key" {
  name = "/bookedbarber/production/secrets/sendgrid_api_key"
}

data "aws_ssm_parameter" "twilio_auth_token" {
  name = "/bookedbarber/production/secrets/twilio_auth_token"
}

data "aws_ssm_parameter" "google_client_secret" {
  name = "/bookedbarber/production/secrets/google_client_secret"
}

data "aws_ssm_parameter" "sentry_dsn" {
  name = "/bookedbarber/production/secrets/sentry_dsn"
}

# Deploy AWS infrastructure
module "aws_infrastructure" {
  source = "../../modules/aws"

  # Basic configuration
  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  availability_zones = var.availability_zones
  tags              = local.common_tags

  # Application configuration - Production sizing
  app_config = {
    name                = "bookedbarber-v2"
    version            = var.app_version
    backend_port       = 8000
    frontend_port      = 3000
    health_check_path  = "/health"
    min_capacity       = 3    # Higher for production
    max_capacity       = 50   # Scale up significantly under load
    desired_capacity   = 5    # Start with 5 instances
  }

  # Database configuration - Production optimized
  database_config = {
    engine_version          = "15.4"
    instance_class         = "db.r6g.xlarge"  # Memory optimized for production
    allocated_storage      = 500             # Start with 500GB
    max_allocated_storage  = 10000           # Allow growth to 10TB
    backup_retention_days  = 30              # Extended backup retention
    backup_window         = "03:00-04:00"
    maintenance_window    = "sun:04:00-sun:05:00"
    multi_az              = true              # High availability
    encryption_enabled    = true
    deletion_protection   = true              # Protect production data
  }

  # Redis configuration - Production cluster
  redis_config = {
    node_type                = "cache.r6g.large"  # Memory optimized
    num_cache_nodes         = 3                   # 3-node cluster
    parameter_group_name    = "default.redis7.cluster.on"
    port                    = 6379
    automatic_failover      = true
    multi_az_enabled       = true
    encryption_at_rest     = true
    encryption_in_transit  = true
  }

  # Network configuration - Production VPC
  network_config = {
    vpc_cidr                = "10.0.0.0/16"
    public_subnet_cidrs     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
    private_subnet_cidrs    = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
    database_subnet_cidrs   = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
    enable_nat_gateway      = true
    enable_vpn_gateway      = false
    enable_dns_hostnames    = true
    enable_dns_support      = true
  }

  # Security configuration - Production hardened
  security_config = {
    enable_waf                    = true
    enable_shield_advanced       = true  # DDoS protection for production
    allowed_cidr_blocks          = ["0.0.0.0/0"]  # Adjust based on requirements
    ssl_certificate_arn          = var.ssl_certificate_arn
    force_ssl                    = true
    enable_access_logs           = true
  }

  # Monitoring configuration - Comprehensive
  monitoring_config = {
    enable_detailed_monitoring = true
    log_retention_days        = 90  # Extended log retention
    enable_performance_insights = true
    alarm_email_endpoints     = var.alert_email_addresses
    alert_thresholds = {
      cpu_utilization_threshold    = 70  # Conservative for production
      memory_utilization_threshold = 75
      database_cpu_threshold       = 60
      error_rate_threshold         = 1   # Low tolerance for errors
      response_time_threshold      = 1000 # 1 second response time SLA
    }
  }

  # Application secrets
  app_secrets = {
    db_master_password    = data.aws_ssm_parameter.db_master_password.value
    jwt_secret_key       = data.aws_ssm_parameter.jwt_secret_key.value
    stripe_secret_key    = data.aws_ssm_parameter.stripe_secret_key.value
    sendgrid_api_key     = data.aws_ssm_parameter.sendgrid_api_key.value
    twilio_auth_token    = data.aws_ssm_parameter.twilio_auth_token.value
    google_client_secret = data.aws_ssm_parameter.google_client_secret.value
    sentry_dsn           = data.aws_ssm_parameter.sentry_dsn.value
  }

  # External services configuration
  external_services = {
    stripe_webhook_endpoint     = "https://api.bookedbarber.com/webhooks/stripe"
    sendgrid_from_email        = "support@bookedbarber.com"
    twilio_phone_number        = var.twilio_phone_number
    google_client_id           = var.google_client_id
    sentry_environment         = "production"
    google_analytics_id        = var.google_analytics_id
  }

  # Domain configuration
  domain_config = {
    root_domain        = "bookedbarber.com"
    api_subdomain      = "api"
    app_subdomain      = "app"
    cdn_subdomain      = "cdn"
    enable_apex_redirect = true
  }

  # Cost optimization - Production focused on performance over cost
  cost_optimization = {
    enable_scheduled_scaling = false  # Always available for production
    scale_down_schedule     = ""
    scale_up_schedule       = ""
    use_spot_instances      = false   # Consistent performance needed
    spot_instance_types     = []
  }

  # AWS-specific configuration
  ecr_backend_repository  = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com/bookedbarber-v2-backend"
  ecr_frontend_repository = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com/bookedbarber-v2-frontend"
  stripe_publishable_key  = var.stripe_publishable_key
  route53_zone_id        = var.route53_zone_id
  acm_certificate_arn    = var.ssl_certificate_arn

  aws_config = {
    enable_enhanced_monitoring = true
    enable_rds_proxy          = true   # Connection pooling for high traffic
    enable_aurora_serverless  = false  # Use dedicated instances for production
    enable_fargate_spot       = false  # Consistent performance
    enable_cloudtrail         = true   # Audit logging
    enable_config_rules       = true   # Compliance monitoring
    enable_guardduty          = true   # Threat detection
  }

  ecs_config = {
    cluster_capacity_providers = ["FARGATE"]  # No spot for production
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

  rds_config = {
    parameter_group_family     = "postgres15"
    option_group_name         = ""
    enable_blue_green         = true   # Zero-downtime deployments
    snapshot_identifier       = ""
    final_snapshot_identifier = ""
    skip_final_snapshot       = false
    copy_tags_to_snapshot     = true
  }

  autoscaling_config = {
    target_cpu_utilization    = 60  # Conservative for production
    target_memory_utilization = 70
    scale_in_cooldown         = 300
    scale_out_cooldown        = 180  # Faster scale out for traffic spikes
    
    scheduled_scaling = {
      scale_up_recurrence   = ""  # No scheduled scaling for production
      scale_down_recurrence = ""
      scale_up_min_capacity = 0
      scale_up_max_capacity = 0
    }
  }
}

# Route 53 DNS records
resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = "api.bookedbarber.com"
  type    = "A"

  alias {
    name                   = module.aws_infrastructure.load_balancer_dns_name
    zone_id               = module.aws_infrastructure.load_balancer_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "app" {
  zone_id = var.route53_zone_id
  name    = "app.bookedbarber.com"
  type    = "A"

  alias {
    name                   = module.aws_infrastructure.cloudfront_domain_name
    zone_id               = module.aws_infrastructure.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = var.route53_zone_id
  name    = "www.bookedbarber.com"
  type    = "A"

  alias {
    name                   = module.aws_infrastructure.cloudfront_domain_name
    zone_id               = module.aws_infrastructure.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "root" {
  zone_id = var.route53_zone_id
  name    = "bookedbarber.com"
  type    = "A"

  alias {
    name                   = module.aws_infrastructure.cloudfront_domain_name
    zone_id               = module.aws_infrastructure.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# CloudWatch Dashboard for production monitoring
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "BookedBarber-Production-Overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", module.aws_infrastructure.backend_service_name, "ClusterName", module.aws_infrastructure.cluster_name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", module.aws_infrastructure.load_balancer_full_name],
            [".", "RequestCount", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", module.aws_infrastructure.database_instance_id],
            [".", "DatabaseConnections", ".", "."],
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", module.aws_infrastructure.redis_cluster_id],
            [".", "CurrConnections", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Database & Cache Performance"
          period  = 300
        }
      }
    ]
  })
}

# SNS Topic for critical alerts
resource "aws_sns_topic" "critical_alerts" {
  name = "bookedbarber-production-critical-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count = length(var.alert_email_addresses)
  
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# CloudWatch Alarms for critical production metrics
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "bookedbarber-production-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors high error rate"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]

  dimensions = {
    LoadBalancer = module.aws_infrastructure.load_balancer_full_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_cpu_high" {
  alarm_name          = "bookedbarber-production-database-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors database CPU utilization"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = module.aws_infrastructure.database_instance_id
  }

  tags = local.common_tags
}