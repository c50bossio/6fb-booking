# AWS Infrastructure Module for BookedBarber V2
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Get shared configuration
module "shared" {
  source = "../shared"
  
  project_name         = var.project_name
  environment         = var.environment
  region              = var.aws_region
  availability_zones  = var.availability_zones
  tags               = var.tags
  app_config         = var.app_config
  database_config    = var.database_config
  redis_config       = var.redis_config
  network_config     = var.network_config
  security_config    = var.security_config
  monitoring_config  = var.monitoring_config
  app_secrets        = var.app_secrets
  external_services  = var.external_services
  domain_config      = var.domain_config
  cost_optimization  = var.cost_optimization
}

locals {
  common_tags     = module.shared.common_tags
  resource_prefix = module.shared.resource_prefix
  env_config     = module.shared.environment_config
  network_config = module.shared.networking_config
  security_groups = module.shared.security_groups_config
}

# VPC and Networking
module "vpc" {
  source = "./modules/networking"
  
  project_name    = var.project_name
  environment     = var.environment
  vpc_cidr        = local.network_config.vpc_cidr
  public_subnets  = local.network_config.public_subnets
  private_subnets = local.network_config.private_subnets
  database_subnets = local.network_config.database_subnets
  
  enable_nat_gateway   = var.network_config.enable_nat_gateway
  enable_vpn_gateway   = var.network_config.enable_vpn_gateway
  enable_dns_hostnames = var.network_config.enable_dns_hostnames
  enable_dns_support   = var.network_config.enable_dns_support
  
  tags = local.common_tags
}

# Security Groups
module "security_groups" {
  source = "./modules/security"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  
  security_groups_config = local.security_groups
  
  tags = local.common_tags
}

# RDS PostgreSQL Database
module "database" {
  source = "./modules/database"
  
  project_name           = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  database_subnet_ids   = module.vpc.database_subnet_ids
  database_security_group_id = module.security_groups.database_security_group_id
  
  engine_version        = var.database_config.engine_version
  instance_class        = local.env_config.database_instance_class
  allocated_storage     = var.database_config.allocated_storage
  max_allocated_storage = var.database_config.max_allocated_storage
  
  db_name     = "bookedbarber"
  db_username = "bookedbarber_user"
  db_password = var.app_secrets.db_master_password
  
  backup_retention_period = local.env_config.backup_retention
  backup_window          = var.database_config.backup_window
  maintenance_window     = var.database_config.maintenance_window
  
  multi_az               = local.env_config.multi_az_enabled
  storage_encrypted      = var.database_config.encryption_enabled
  deletion_protection    = local.env_config.deletion_protection
  
  performance_insights_enabled = var.monitoring_config.enable_performance_insights
  monitoring_interval         = var.monitoring_config.enable_detailed_monitoring ? 60 : 0
  
  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "./modules/cache"
  
  project_name    = var.project_name
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_group_id = module.security_groups.redis_security_group_id
  
  node_type              = local.env_config.redis_node_type
  num_cache_nodes        = var.redis_config.num_cache_nodes
  parameter_group_name   = var.redis_config.parameter_group_name
  port                   = var.redis_config.port
  
  automatic_failover_enabled = var.redis_config.automatic_failover
  multi_az_enabled          = var.redis_config.multi_az_enabled
  at_rest_encryption_enabled = var.redis_config.encryption_at_rest
  transit_encryption_enabled = var.redis_config.encryption_in_transit
  
  tags = local.common_tags
}

# Application Load Balancer
module "load_balancer" {
  source = "./modules/load_balancer"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  security_group_id  = module.security_groups.alb_security_group_id
  
  ssl_certificate_arn = var.security_config.ssl_certificate_arn != "" ? var.security_config.ssl_certificate_arn : module.ssl_certificate.certificate_arn
  
  enable_access_logs = var.security_config.enable_access_logs
  force_ssl         = var.security_config.force_ssl
  
  tags = local.common_tags
}

# SSL Certificate
module "ssl_certificate" {
  source = "./modules/ssl"
  
  domain_name               = var.domain_config.root_domain
  subject_alternative_names = module.shared.ssl_certificate_config.subject_alternative_names
  validation_method        = module.shared.ssl_certificate_config.validation_method
  
  tags = local.common_tags
}

# ECS Cluster and Services
module "compute" {
  source = "./modules/compute"
  
  project_name  = var.project_name
  environment   = var.environment
  region        = var.aws_region
  
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  backend_security_group_id  = module.security_groups.backend_security_group_id
  frontend_security_group_id = module.security_groups.frontend_security_group_id
  
  backend_target_group_arn  = module.load_balancer.backend_target_group_arn
  frontend_target_group_arn = module.load_balancer.frontend_target_group_arn
  
  # Application configuration
  backend_image  = "${var.ecr_backend_repository}:${var.app_config.version}"
  frontend_image = "${var.ecr_frontend_repository}:${var.app_config.version}"
  
  backend_port   = var.app_config.backend_port
  frontend_port  = var.app_config.frontend_port
  
  min_capacity     = local.env_config.min_capacity
  max_capacity     = local.env_config.max_capacity
  desired_capacity = var.app_config.desired_capacity
  
  # Environment variables for applications
  backend_environment_variables = {
    DATABASE_URL = module.database.connection_string
    REDIS_URL    = module.redis.connection_string
    
    ENVIRONMENT     = var.environment
    AWS_REGION      = var.aws_region
    AWS_DEFAULT_REGION = var.aws_region
    
    # External service configuration
    STRIPE_SECRET_KEY    = var.app_secrets.stripe_secret_key
    SENDGRID_API_KEY     = var.app_secrets.sendgrid_api_key
    TWILIO_AUTH_TOKEN    = var.app_secrets.twilio_auth_token
    GOOGLE_CLIENT_SECRET = var.app_secrets.google_client_secret
    JWT_SECRET_KEY       = var.app_secrets.jwt_secret_key
    SENTRY_DSN          = var.app_secrets.sentry_dsn
    
    SENDGRID_FROM_EMAIL  = var.external_services.sendgrid_from_email
    TWILIO_PHONE_NUMBER  = var.external_services.twilio_phone_number
    GOOGLE_CLIENT_ID     = var.external_services.google_client_id
    SENTRY_ENVIRONMENT   = var.external_services.sentry_environment
  }
  
  frontend_environment_variables = {
    NEXT_PUBLIC_API_URL         = "https://${var.domain_config.api_subdomain}.${var.domain_config.root_domain}"
    NEXT_PUBLIC_ENVIRONMENT     = var.environment
    NEXT_PUBLIC_SENTRY_DSN      = var.app_secrets.sentry_dsn
    NEXT_PUBLIC_GOOGLE_CLIENT_ID = var.external_services.google_client_id
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = var.stripe_publishable_key
    NEXT_PUBLIC_GA_ID           = var.external_services.google_analytics_id
  }
  
  # Resource configuration
  backend_cpu     = var.environment == "production" ? 1024 : 512
  backend_memory  = var.environment == "production" ? 2048 : 1024
  frontend_cpu    = var.environment == "production" ? 512 : 256
  frontend_memory = var.environment == "production" ? 1024 : 512
  
  tags = local.common_tags
}

# S3 Bucket for static assets
module "storage" {
  source = "./modules/storage"
  
  project_name = var.project_name
  environment  = var.environment
  region       = var.aws_region
  
  enable_versioning = var.environment == "production"
  enable_encryption = true
  
  lifecycle_rules = var.environment == "production" ? [
    {
      id     = "transition_to_ia"
      status = "Enabled"
      transition = {
        days          = 30
        storage_class = "STANDARD_IA"
      }
    },
    {
      id     = "transition_to_glacier"
      status = "Enabled"
      transition = {
        days          = 90
        storage_class = "GLACIER"
      }
    }
  ] : []
  
  tags = local.common_tags
}

# CloudFront CDN
module "cdn" {
  source = "./modules/cdn"
  
  project_name = var.project_name
  environment  = var.environment
  
  s3_bucket_domain_name = module.storage.bucket_domain_name
  load_balancer_domain_name = module.load_balancer.dns_name
  
  ssl_certificate_arn = module.ssl_certificate.certificate_arn
  
  domain_aliases = [
    var.domain_config.root_domain,
    "${var.domain_config.app_subdomain}.${var.domain_config.root_domain}",
    "${var.domain_config.cdn_subdomain}.${var.domain_config.root_domain}"
  ]
  
  tags = local.common_tags
}

# CloudWatch Monitoring and Alerts
module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Resource ARNs for monitoring
  ecs_cluster_name     = module.compute.cluster_name
  ecs_service_names    = module.compute.service_names
  rds_instance_id      = module.database.instance_id
  elasticache_cluster_id = module.redis.cluster_id
  load_balancer_arn    = module.load_balancer.arn
  
  # Alert configuration
  alert_email_endpoints = var.monitoring_config.alarm_email_endpoints
  alert_thresholds     = var.monitoring_config.alert_thresholds
  
  log_retention_days = var.monitoring_config.log_retention_days
  
  tags = local.common_tags
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"
  
  project_name = var.project_name
  environment  = var.environment
  
  secrets = {
    database_password = var.app_secrets.db_master_password
    jwt_secret_key    = var.app_secrets.jwt_secret_key
    stripe_secret_key = var.app_secrets.stripe_secret_key
    sendgrid_api_key  = var.app_secrets.sendgrid_api_key
    twilio_auth_token = var.app_secrets.twilio_auth_token
    google_client_secret = var.app_secrets.google_client_secret
    sentry_dsn        = var.app_secrets.sentry_dsn
  }
  
  tags = local.common_tags
}

# WAF (Web Application Firewall)
module "waf" {
  count = var.security_config.enable_waf ? 1 : 0
  
  source = "./modules/waf"
  
  project_name = var.project_name
  environment  = var.environment
  
  load_balancer_arn = module.load_balancer.arn
  cloudfront_arn    = module.cdn.distribution_arn
  
  allowed_countries = ["US", "CA", "GB", "AU"]  # Adjust based on business requirements
  rate_limit       = var.environment == "production" ? 2000 : 1000
  
  tags = local.common_tags
}

# Backup and Disaster Recovery
module "backup" {
  source = "./modules/backup"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Resources to backup
  rds_instance_arn = module.database.instance_arn
  efs_file_system_arn = null  # Add if using EFS
  
  backup_schedule = var.environment == "production" ? "cron(0 2 * * ? *)" : "cron(0 4 * * 0 *)"  # Daily for prod, weekly for others
  backup_retention_days = local.env_config.backup_retention
  
  tags = local.common_tags
}