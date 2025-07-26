# Outputs for BookedBarber V2 Franchise Infrastructure

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.franchise_vpc.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.franchise_vpc.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public_subnets[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private_subnets[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database_subnets[*].id
}

# EKS Outputs
output "eks_cluster_id" {
  description = "ID of the EKS cluster"
  value       = aws_eks_cluster.franchise_cluster.id
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.franchise_cluster.name
}

output "eks_cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = aws_eks_cluster.franchise_cluster.arn
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = aws_eks_cluster.franchise_cluster.endpoint
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.franchise_cluster.vpc_config[0].cluster_security_group_id
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.franchise_cluster.certificate_authority[0].data
}

output "eks_cluster_version" {
  description = "Version of the EKS cluster"
  value       = aws_eks_cluster.franchise_cluster.version
}

output "eks_node_group_arns" {
  description = "ARNs of the EKS node groups"
  value = {
    general_purpose   = aws_eks_node_group.general_purpose.arn
    compute_optimized = aws_eks_node_group.compute_optimized.arn
  }
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node IAM role"
  value       = aws_iam_role.eks_node_role.arn
}

# Database Outputs
output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.franchise_primary_db.id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.franchise_primary_db.arn
}

output "db_instance_endpoint" {
  description = "RDS instance hostname"
  value       = aws_db_instance.franchise_primary_db.endpoint
  sensitive   = true
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.franchise_primary_db.port
}

output "db_instance_name" {
  description = "RDS instance database name"
  value       = aws_db_instance.franchise_primary_db.db_name
}

output "db_subnet_group_id" {
  description = "ID of the database subnet group"
  value       = aws_db_subnet_group.franchise_db_subnet_group.id
}

output "db_parameter_group_id" {
  description = "ID of the database parameter group"
  value       = aws_db_parameter_group.franchise_postgres_params.id
}

output "db_read_replica_endpoints" {
  description = "Endpoints of the read replicas"
  value       = aws_db_instance.franchise_read_replicas[*].endpoint
  sensitive   = true
}

output "db_secrets_arn" {
  description = "ARN of the database secrets in Secrets Manager"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

# Redis Outputs
output "redis_primary_endpoint" {
  description = "Primary endpoint for Redis cluster"
  value       = aws_elasticache_replication_group.franchise_redis_primary.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Reader endpoint for Redis cluster"
  value       = aws_elasticache_replication_group.franchise_redis_primary.reader_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Port number for Redis cluster"
  value       = aws_elasticache_replication_group.franchise_redis_primary.port
}

output "redis_sessions_endpoint" {
  description = "Endpoint for Redis sessions cluster"
  value       = aws_elasticache_replication_group.franchise_redis_sessions.primary_endpoint_address
  sensitive   = true
}

output "redis_ratelimit_endpoint" {
  description = "Endpoint for Redis rate limiting cluster"
  value       = aws_elasticache_replication_group.franchise_redis_ratelimit.primary_endpoint_address
  sensitive   = true
}

output "redis_parameter_group_id" {
  description = "ID of the Redis parameter group"
  value       = aws_elasticache_parameter_group.franchise_redis_params.id
}

output "redis_subnet_group_id" {
  description = "ID of the Redis subnet group"
  value       = aws_elasticache_subnet_group.franchise_redis_subnet_group.id
}

output "redis_secrets_arn" {
  description = "ARN of the Redis secrets in Secrets Manager"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

# Security Group Outputs
output "eks_cluster_security_group_id" {
  description = "ID of the EKS cluster security group"
  value       = aws_security_group.eks_cluster_sg.id
}

output "eks_node_security_group_id" {
  description = "ID of the EKS node security group"
  value       = aws_security_group.eks_node_sg.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds_sg.id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis_sg.id
}

# KMS Key Outputs
output "eks_kms_key_id" {
  description = "KMS key ID for EKS encryption"
  value       = aws_kms_key.eks_encryption.key_id
}

output "rds_kms_key_id" {
  description = "KMS key ID for RDS encryption"
  value       = aws_kms_key.rds_encryption.key_id
}

output "redis_kms_key_id" {
  description = "KMS key ID for Redis encryption"
  value       = aws_kms_key.redis_encryption.key_id
}

# Franchise-Specific Outputs
output "shard_configuration" {
  description = "Franchise shard configuration for this region"
  value = {
    shard_id              = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id
    franchise_range_start = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).franchise_range_start
    franchise_range_end   = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).franchise_range_end
    is_primary_region     = lookup(local.shard_config, var.aws_region, { primary = false }).primary
    region                = var.aws_region
  }
}

output "franchise_database_connection_string" {
  description = "Connection string for franchise database (use with caution)"
  value = {
    host     = aws_db_instance.franchise_primary_db.endpoint
    port     = aws_db_instance.franchise_primary_db.port
    database = aws_db_instance.franchise_primary_db.db_name
    shard_id = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id
  }
  sensitive = true
}

output "franchise_cache_endpoints" {
  description = "Redis cache endpoints for franchise operations"
  value = {
    primary_cache    = aws_elasticache_replication_group.franchise_redis_primary.primary_endpoint_address
    sessions_cache   = aws_elasticache_replication_group.franchise_redis_sessions.primary_endpoint_address
    ratelimit_cache  = aws_elasticache_replication_group.franchise_redis_ratelimit.primary_endpoint_address
    shard_id         = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id
  }
  sensitive = true
}

# Monitoring Outputs
output "sns_alerts_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_log_groups" {
  description = "CloudWatch log groups created"
  value = {
    eks_cluster  = aws_cloudwatch_log_group.eks_cluster_logs.name
    redis_slow   = aws_cloudwatch_log_group.redis_slow_log.name
  }
}

# Network Configuration for Cross-Region
output "region_network_configuration" {
  description = "Network configuration for cross-region connectivity"
  value = {
    vpc_id                = aws_vpc.franchise_vpc.id
    vpc_cidr             = aws_vpc.franchise_vpc.cidr_block
    availability_zones   = data.aws_availability_zones.available.names
    nat_gateway_ips      = aws_eip.nat_eip[*].public_ip
    internet_gateway_id  = aws_internet_gateway.franchise_igw.id
  }
}

# Kubernetes Configuration
output "kubernetes_config_data" {
  description = "Kubernetes configuration data for kubectl and Helm"
  value = {
    cluster_name                 = aws_eks_cluster.franchise_cluster.name
    cluster_endpoint            = aws_eks_cluster.franchise_cluster.endpoint
    cluster_ca_certificate      = aws_eks_cluster.franchise_cluster.certificate_authority[0].data
    cluster_security_group_id   = aws_eks_cluster.franchise_cluster.vpc_config[0].cluster_security_group_id
    node_security_group_id      = aws_security_group.eks_node_sg.id
    vpc_id                      = aws_vpc.franchise_vpc.id
    private_subnet_ids          = aws_subnet.private_subnets[*].id
    region                      = var.aws_region
  }
  sensitive = true
}

# Cost Management
output "resource_tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
}

output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown (approximate)"
  value = {
    eks_cluster      = "Varies by usage"
    eks_nodes        = "~$2,000-8,000 depending on node count and types"
    rds_primary      = "~$1,500-3,000 for ${var.db_instance_class}"
    rds_replicas     = "~$3,000-6,000 for ${var.db_read_replica_count} replicas"
    redis_clusters   = "~$1,500-4,000 for all Redis clusters"
    data_transfer    = "~$500-2,000 depending on traffic"
    storage          = "~$200-1,000 for database and backups"
    monitoring       = "~$100-500 for CloudWatch and logs"
    total_estimate   = "~$8,800-24,500 per region"
    note             = "Costs vary by usage, region, and reserved instance usage"
  }
}