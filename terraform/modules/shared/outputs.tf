# Shared outputs used across all modules

output "common_tags" {
  description = "Common tags applied to all resources"
  value = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Application = "bookedbarber-v2"
    CreatedAt   = timestamp()
  })
}

output "resource_prefix" {
  description = "Standardized resource naming prefix"
  value       = "${var.project_name}-${var.environment}"
}

output "environment_config" {
  description = "Environment-specific configuration"
  value = {
    is_production = var.environment == "production"
    is_staging   = var.environment == "staging"
    is_dev       = var.environment == "dev"
    
    # Environment-specific resource sizing
    database_instance_class = var.environment == "production" ? var.database_config.instance_class : (
      var.environment == "staging" ? "db.t3.small" : "db.t3.micro"
    )
    
    redis_node_type = var.environment == "production" ? var.redis_config.node_type : (
      var.environment == "staging" ? "cache.t3.small" : "cache.t3.micro"
    )
    
    min_capacity = var.environment == "production" ? var.app_config.min_capacity : 1
    max_capacity = var.environment == "production" ? var.app_config.max_capacity : (
      var.environment == "staging" ? 5 : 2
    )
    
    backup_retention = var.environment == "production" ? var.database_config.backup_retention_days : (
      var.environment == "staging" ? 3 : 1
    )
    
    multi_az_enabled = var.environment == "production" ? var.database_config.multi_az : false
    deletion_protection = var.environment == "production" ? var.database_config.deletion_protection : false
  }
}

output "networking_config" {
  description = "Standardized networking configuration"
  value = {
    vpc_cidr = var.network_config.vpc_cidr
    
    # Subnet configurations with AZ mapping
    public_subnets = [
      for i, cidr in var.network_config.public_subnet_cidrs : {
        cidr = cidr
        az   = length(var.availability_zones) > i ? var.availability_zones[i] : "${var.region}${substr("abc", i, 1)}"
        name = "${var.project_name}-${var.environment}-public-${i + 1}"
      }
    ]
    
    private_subnets = [
      for i, cidr in var.network_config.private_subnet_cidrs : {
        cidr = cidr
        az   = length(var.availability_zones) > i ? var.availability_zones[i] : "${var.region}${substr("abc", i, 1)}"
        name = "${var.project_name}-${var.environment}-private-${i + 1}"
      }
    ]
    
    database_subnets = [
      for i, cidr in var.network_config.database_subnet_cidrs : {
        cidr = cidr
        az   = length(var.availability_zones) > i ? var.availability_zones[i] : "${var.region}${substr("abc", i, 1)}"
        name = "${var.project_name}-${var.environment}-db-${i + 1}"
      }
    ]
  }
}

output "security_groups_config" {
  description = "Security group configurations"
  value = {
    # Application Load Balancer security group
    alb = {
      name        = "${var.project_name}-${var.environment}-alb"
      description = "Security group for Application Load Balancer"
      ingress_rules = [
        {
          from_port   = 80
          to_port     = 80
          protocol    = "tcp"
          cidr_blocks = var.security_config.allowed_cidr_blocks
          description = "HTTP traffic"
        },
        {
          from_port   = 443
          to_port     = 443
          protocol    = "tcp"
          cidr_blocks = var.security_config.allowed_cidr_blocks
          description = "HTTPS traffic"
        }
      ]
      egress_rules = [
        {
          from_port   = 0
          to_port     = 0
          protocol    = "-1"
          cidr_blocks = ["0.0.0.0/0"]
          description = "All outbound traffic"
        }
      ]
    }
    
    # Backend application security group
    backend = {
      name        = "${var.project_name}-${var.environment}-backend"
      description = "Security group for backend application"
      ingress_rules = [
        {
          from_port                = var.app_config.backend_port
          to_port                  = var.app_config.backend_port
          protocol                 = "tcp"
          source_security_group_id = "alb"  # Reference to ALB security group
          description              = "Backend API traffic from ALB"
        }
      ]
      egress_rules = [
        {
          from_port   = 0
          to_port     = 0
          protocol    = "-1"
          cidr_blocks = ["0.0.0.0/0"]
          description = "All outbound traffic"
        }
      ]
    }
    
    # Frontend application security group
    frontend = {
      name        = "${var.project_name}-${var.environment}-frontend"
      description = "Security group for frontend application"
      ingress_rules = [
        {
          from_port                = var.app_config.frontend_port
          to_port                  = var.app_config.frontend_port
          protocol                 = "tcp"
          source_security_group_id = "alb"  # Reference to ALB security group
          description              = "Frontend traffic from ALB"
        }
      ]
      egress_rules = [
        {
          from_port   = 0
          to_port     = 0
          protocol    = "-1"
          cidr_blocks = ["0.0.0.0/0"]
          description = "All outbound traffic"
        }
      ]
    }
    
    # Database security group
    database = {
      name        = "${var.project_name}-${var.environment}-database"
      description = "Security group for database"
      ingress_rules = [
        {
          from_port                = 5432
          to_port                  = 5432
          protocol                 = "tcp"
          source_security_group_id = "backend"  # Reference to backend security group
          description              = "PostgreSQL access from backend"
        }
      ]
      egress_rules = []  # No outbound rules needed for database
    }
    
    # Redis security group
    redis = {
      name        = "${var.project_name}-${var.environment}-redis"
      description = "Security group for Redis cache"
      ingress_rules = [
        {
          from_port                = var.redis_config.port
          to_port                  = var.redis_config.port
          protocol                 = "tcp"
          source_security_group_id = "backend"  # Reference to backend security group
          description              = "Redis access from backend"
        }
      ]
      egress_rules = []  # No outbound rules needed for Redis
    }
  }
}

output "monitoring_config_output" {
  description = "Monitoring configuration for alerts and dashboards"
  value = {
    # CloudWatch/Stackdriver metric filters
    log_groups = [
      "${var.project_name}-${var.environment}-backend",
      "${var.project_name}-${var.environment}-frontend",
      "${var.project_name}-${var.environment}-database",
      "${var.project_name}-${var.environment}-redis"
    ]
    
    # Alert configurations
    alerts = {
      high_cpu = {
        name        = "${var.project_name}-${var.environment}-high-cpu"
        description = "High CPU utilization alert"
        threshold   = var.monitoring_config.alert_thresholds.cpu_utilization_threshold
        period      = 300
        statistic   = "Average"
      }
      
      high_memory = {
        name        = "${var.project_name}-${var.environment}-high-memory"
        description = "High memory utilization alert"
        threshold   = var.monitoring_config.alert_thresholds.memory_utilization_threshold
        period      = 300
        statistic   = "Average"
      }
      
      database_cpu = {
        name        = "${var.project_name}-${var.environment}-db-high-cpu"
        description = "Database high CPU utilization alert"
        threshold   = var.monitoring_config.alert_thresholds.database_cpu_threshold
        period      = 300
        statistic   = "Average"
      }
      
      high_error_rate = {
        name        = "${var.project_name}-${var.environment}-high-error-rate"
        description = "High application error rate alert"
        threshold   = var.monitoring_config.alert_thresholds.error_rate_threshold
        period      = 300
        statistic   = "Sum"
      }
      
      slow_response_time = {
        name        = "${var.project_name}-${var.environment}-slow-response"
        description = "Slow response time alert"
        threshold   = var.monitoring_config.alert_thresholds.response_time_threshold
        period      = 300
        statistic   = "Average"
      }
    }
    
    # Dashboard configuration
    dashboard_widgets = [
      "application_performance",
      "infrastructure_health",
      "database_metrics",
      "cache_metrics",
      "error_tracking",
      "business_metrics"
    ]
  }
}

output "ssl_certificate_config" {
  description = "SSL certificate configuration"
  value = {
    domain_name = var.domain_config.root_domain
    subject_alternative_names = [
      "*.${var.domain_config.root_domain}",
      "${var.domain_config.api_subdomain}.${var.domain_config.root_domain}",
      "${var.domain_config.app_subdomain}.${var.domain_config.root_domain}",
      "${var.domain_config.cdn_subdomain}.${var.domain_config.root_domain}"
    ]
    validation_method = "DNS"
  }
}

output "cost_optimization_config" {
  description = "Cost optimization settings for the environment"
  value = {
    enable_scheduled_scaling = var.cost_optimization.enable_scheduled_scaling && var.environment != "production"
    scale_down_schedule     = var.cost_optimization.scale_down_schedule
    scale_up_schedule       = var.cost_optimization.scale_up_schedule
    use_spot_instances      = var.cost_optimization.use_spot_instances && var.environment != "production"
    spot_instance_types     = var.cost_optimization.spot_instance_types
    
    # Environment-specific cost optimizations
    delete_unused_resources = var.environment == "dev"
    stop_instances_overnight = var.environment == "dev"
    use_burstable_instances = var.environment != "production"
  }
}