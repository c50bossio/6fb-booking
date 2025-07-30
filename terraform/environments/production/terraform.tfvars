# BookedBarber V2 Production Configuration
aws_region  = "us-east-1"
environment = "production"

domain_name = "bookedbarber.com"

# Database Configuration
database_password = "BookedBarberV2Prod2025!SecurePwd789"
database_instance_class = "db.t3.large"
database_allocated_storage = 100
database_max_allocated_storage = 1000
database_backup_retention = 7

# Redis Configuration
redis_node_type = "cache.t3.medium"
redis_num_cache_nodes = 3

# Kubernetes Configuration
kubernetes_version = "1.28"

# Production Tags
tags = {
  Project     = "BookedBarber-V2"
  Owner       = "DevOps"
  Environment = "production"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
  Application = "six-figure-barber-platform"
  Team        = "platform-engineering"
}