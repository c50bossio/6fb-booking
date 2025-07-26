# Variables for BookedBarber V2 Franchise Infrastructure

# General Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "bookedbarber-v2"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# EKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_public_access_cidrs" {
  description = "CIDR blocks that can access the Amazon EKS public API server endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "eks_node_ami_id" {
  description = "AMI ID for EKS worker nodes"
  type        = string
  default     = ""  # Will use latest EKS-optimized AMI if not specified
}

variable "eks_node_instance_type" {
  description = "Instance type for EKS worker nodes"
  type        = string
  default     = "m6i.2xlarge"
}

variable "eks_node_desired_size" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 50
}

variable "eks_node_max_size" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 1000
}

variable "eks_node_min_size" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 50
}

variable "eks_node_volume_size" {
  description = "Size of the EBS volume for EKS worker nodes (in GB)"
  type        = number
  default     = 100
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "RDS instance class for primary database"
  type        = string
  default     = "db.r6g.8xlarge"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS instance (in GB)"
  type        = number
  default     = 1000
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance (in GB)"
  type        = number
  default     = 10000
}

variable "db_username" {
  description = "Username for the RDS instance"
  type        = string
  default     = "bookedbarber"
  sensitive   = true
}

variable "db_password" {
  description = "Password for the RDS instance"
  type        = string
  sensitive   = true
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "db_backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "db_read_replica_count" {
  description = "Number of read replicas to create"
  type        = number
  default     = 3
}

variable "db_replica_instance_class" {
  description = "RDS instance class for read replicas"
  type        = string
  default     = "db.r6g.4xlarge"
}

variable "enable_cross_region_replica" {
  description = "Enable cross-region read replica for disaster recovery"
  type        = bool
  default     = true
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache node type for primary Redis cluster"
  type        = string
  default     = "cache.r6g.2xlarge"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 6
}

variable "redis_auth_token" {
  description = "Auth token for Redis cluster"
  type        = string
  sensitive   = true
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 7
}

variable "redis_snapshot_window" {
  description = "Daily time range for Redis snapshots"
  type        = string
  default     = "03:00-05:00"
}

variable "redis_maintenance_window" {
  description = "Weekly time range for Redis maintenance"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "redis_session_node_type" {
  description = "ElastiCache node type for session Redis cluster"
  type        = string
  default     = "cache.r6g.xlarge"
}

variable "redis_session_num_nodes" {
  description = "Number of nodes in the session Redis cluster"
  type        = number
  default     = 3
}

# Franchise Configuration
variable "franchise_sharding_enabled" {
  description = "Enable franchise-based database sharding"
  type        = bool
  default     = true
}

variable "franchise_cache_strategy" {
  description = "Caching strategy for franchise data (regional, global, hybrid)"
  type        = string
  default     = "hybrid"
  validation {
    condition     = contains(["regional", "global", "hybrid"], var.franchise_cache_strategy)
    error_message = "Franchise cache strategy must be regional, global, or hybrid."
  }
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

# Security Configuration
variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest for all resources"
  type        = bool
  default     = true
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit for all resources"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for non-critical workloads"
  type        = bool
  default     = true
}

variable "auto_scaling_enabled" {
  description = "Enable auto-scaling for cost optimization"
  type        = bool
  default     = true
}

# Disaster Recovery
variable "disaster_recovery_region" {
  description = "AWS region for disaster recovery"
  type        = string
  default     = ""
}

variable "cross_region_backup_enabled" {
  description = "Enable cross-region backups"
  type        = bool
  default     = true
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Feature Flags
variable "enable_istio_service_mesh" {
  description = "Enable Istio service mesh"
  type        = bool
  default     = true
}

variable "enable_horizontal_pod_autoscaler" {
  description = "Enable Horizontal Pod Autoscaler"
  type        = bool
  default     = true
}

variable "enable_vertical_pod_autoscaler" {
  description = "Enable Vertical Pod Autoscaler"
  type        = bool
  default     = true
}

variable "enable_cluster_autoscaler" {
  description = "Enable Cluster Autoscaler"
  type        = bool
  default     = true
}

# Performance Configuration
variable "performance_mode" {
  description = "Performance mode (standard, optimized, maximum)"
  type        = string
  default     = "optimized"
  validation {
    condition     = contains(["standard", "optimized", "maximum"], var.performance_mode)
    error_message = "Performance mode must be standard, optimized, or maximum."
  }
}

# Compliance and Governance
variable "compliance_mode" {
  description = "Compliance mode (basic, gdpr, hipaa, pci)"
  type        = string
  default     = "gdpr"
  validation {
    condition     = contains(["basic", "gdpr", "hipaa", "pci"], var.compliance_mode)
    error_message = "Compliance mode must be basic, gdpr, hipaa, or pci."
  }
}

variable "data_residency_requirements" {
  description = "Data residency requirements by region"
  type        = map(string)
  default     = {}
}