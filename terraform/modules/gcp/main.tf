# Google Cloud Infrastructure Module for BookedBarber V2

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# Get shared configuration
module "shared" {
  source = "../shared"
  
  project_name         = var.project_name
  environment         = var.environment
  region              = var.gcp_region
  availability_zones  = var.zones
  tags               = var.labels
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
  common_labels   = module.shared.common_tags
  resource_prefix = module.shared.resource_prefix
  env_config     = module.shared.environment_config
  network_config = module.shared.networking_config
}

# VPC Network
module "network" {
  source = "./modules/networking"
  
  project_id      = var.project_id
  project_name    = var.project_name
  environment     = var.environment
  region          = var.gcp_region
  zones           = var.zones
  
  network_config = local.network_config
  
  labels = local.common_labels
}

# Cloud SQL PostgreSQL Database
module "database" {
  source = "./modules/database"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  region       = var.gcp_region
  
  network_id = module.network.network_id
  
  database_config = var.database_config
  instance_tier   = local.env_config.database_instance_class
  
  db_name     = "bookedbarber"
  db_username = "bookedbarber_user"
  db_password = var.app_secrets.db_master_password
  
  backup_enabled      = true
  backup_start_time   = "03:00"
  backup_location     = var.gcp_region
  retention_policy    = local.env_config.backup_retention
  
  high_availability = local.env_config.multi_az_enabled
  deletion_protection = local.env_config.deletion_protection
  
  labels = local.common_labels
}

# Cloud Memorystore Redis
module "redis" {
  source = "./modules/cache"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  region       = var.gcp_region
  
  network_id = module.network.network_id
  
  memory_size_gb = var.environment == "production" ? 4 : 1
  redis_version  = "REDIS_7_0"
  
  auth_enabled           = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"
  
  high_availability = var.redis_config.automatic_failover
  
  labels = local.common_labels
}

# Cloud Run Services
module "compute" {
  source = "./modules/compute"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  region       = var.gcp_region
  
  # Container images
  backend_image  = "${var.gcp_region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository}/backend:${var.app_config.version}"
  frontend_image = "${var.gcp_region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository}/frontend:${var.app_config.version}"
  
  # Environment variables
  backend_environment_variables = {
    DATABASE_URL = module.database.connection_string
    REDIS_URL    = module.redis.connection_string
    
    ENVIRONMENT     = var.environment
    GCP_PROJECT_ID  = var.project_id
    GCP_REGION      = var.gcp_region
    
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
  
  # Auto-scaling configuration
  min_instances = local.env_config.min_capacity
  max_instances = local.env_config.max_capacity
  
  # Resource limits
  cpu_limit    = var.environment == "production" ? "2000m" : "1000m"
  memory_limit = var.environment == "production" ? "4Gi" : "2Gi"
  
  labels = local.common_labels
}

# Cloud Load Balancer
module "load_balancer" {
  source = "./modules/load_balancer"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  
  backend_service_url  = module.compute.backend_service_url
  frontend_service_url = module.compute.frontend_service_url
  
  ssl_certificate_domains = [
    var.domain_config.root_domain,
    "*.${var.domain_config.root_domain}"
  ]
  
  labels = local.common_labels
}

# Cloud Storage Bucket
module "storage" {
  source = "./modules/storage"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  region       = var.gcp_region
  
  enable_versioning = var.environment == "production"
  
  lifecycle_rules = var.environment == "production" ? [
    {
      action = {
        type = "SetStorageClass"
        storage_class = "NEARLINE"
      }
      condition = {
        age = 30
      }
    },
    {
      action = {
        type = "SetStorageClass"
        storage_class = "COLDLINE"
      }
      condition = {
        age = 90
      }
    }
  ] : []
  
  labels = local.common_labels
}

# Cloud CDN
module "cdn" {
  source = "./modules/cdn"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  
  bucket_name           = module.storage.bucket_name
  load_balancer_backend = module.load_balancer.backend_service_name
  
  labels = local.common_labels
}

# Cloud Monitoring and Alerting
module "monitoring" {
  source = "./modules/monitoring"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  
  # Resource names for monitoring
  cloud_run_services = module.compute.service_names
  cloud_sql_instance = module.database.instance_name
  redis_instance     = module.redis.instance_name
  load_balancer_name = module.load_balancer.load_balancer_name
  
  # Alert configuration
  notification_channels = var.monitoring_config.alarm_email_endpoints
  alert_thresholds     = var.monitoring_config.alert_thresholds
  
  labels = local.common_labels
}

# Secret Manager
module "secrets" {
  source = "./modules/secrets"
  
  project_id   = var.project_id
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
  
  labels = local.common_labels
}

# Cloud Armor (Web Application Firewall)
module "security" {
  count = var.security_config.enable_waf ? 1 : 0
  
  source = "./modules/security"
  
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  
  backend_service = module.load_balancer.backend_service_name
  
  allowed_countries = ["US", "CA", "GB", "AU"]
  rate_limit       = var.environment == "production" ? 1000 : 500
  
  labels = local.common_labels
}

# Artifact Registry
resource "google_artifact_registry_repository" "main" {
  location      = var.gcp_region
  repository_id = "${var.project_name}-${var.environment}"
  description   = "Container repository for ${var.project_name} ${var.environment}"
  format        = "DOCKER"

  labels = local.common_labels
}

# Cloud Build for CI/CD
resource "google_cloudbuild_trigger" "backend" {
  name        = "${var.project_name}-${var.environment}-backend"
  description = "Build and deploy backend for ${var.project_name} ${var.environment}"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = var.environment == "production" ? "main" : var.environment
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${var.gcp_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}/backend:$COMMIT_SHA",
        "-f", "backend-v2/Dockerfile",
        "backend-v2/"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.gcp_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}/backend:$COMMIT_SHA"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", module.compute.backend_service_name,
        "--image", "${var.gcp_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}/backend:$COMMIT_SHA",
        "--region", var.gcp_region,
        "--platform", "managed"
      ]
    }
  }

  tags = ["backend", var.environment]
}

resource "google_cloudbuild_trigger" "frontend" {
  name        = "${var.project_name}-${var.environment}-frontend"
  description = "Build and deploy frontend for ${var.project_name} ${var.environment}"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = var.environment == "production" ? "main" : var.environment
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${var.gcp_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}/frontend:$COMMIT_SHA",
        "-f", "backend-v2/frontend-v2/Dockerfile",
        "backend-v2/frontend-v2/"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.gcp_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}/frontend:$COMMIT_SHA"
      ]
    }

    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", module.compute.frontend_service_name,
        "--image", "${var.gcp_region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}/frontend:$COMMIT_SHA",
        "--region", var.gcp_region,
        "--platform", "managed"
      ]
    }
  }

  tags = ["frontend", var.environment]
}