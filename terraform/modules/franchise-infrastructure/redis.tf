# ElastiCache Redis Configuration for Franchise-Aware Caching

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "franchise_redis_subnet_group" {
  name       = "${local.cluster_name}-redis-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id
  
  tags = local.common_tags
}

# ElastiCache Parameter Group for Redis optimization
resource "aws_elasticache_parameter_group" "franchise_redis_params" {
  family = "redis7.x"
  name   = "${local.cluster_name}-redis-params"
  
  # Franchise-optimized Redis parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }
  
  parameter {
    name  = "maxclients"
    value = "65000"
  }
  
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Enable keyspace notifications for expired events
  }
  
  parameter {
    name  = "save"
    value = "900 1 300 10 60 10000"  # RDB persistence configuration
  }
  
  tags = local.common_tags
}

# Primary Redis Replication Group
resource "aws_elasticache_replication_group" "franchise_redis_primary" {
  replication_group_id         = "${local.cluster_name}-redis-primary"
  description                  = "Redis cluster for BookedBarber franchise platform"
  
  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  port                 = 6379
  
  # Node configuration
  node_type            = var.redis_node_type
  num_cache_clusters   = var.redis_num_cache_nodes
  
  # Network and security
  subnet_group_name    = aws_elasticache_subnet_group.franchise_redis_subnet_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]
  
  # Parameter group
  parameter_group_name = aws_elasticache_parameter_group.franchise_redis_params.name
  
  # Encryption and security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  kms_key_id                 = aws_kms_key.redis_encryption.arn
  
  # Backup configuration
  snapshot_retention_limit = var.redis_snapshot_retention_limit
  snapshot_window         = var.redis_snapshot_window
  maintenance_window      = var.redis_maintenance_window
  
  # Multi-AZ and failover
  multi_az_enabled           = true
  automatic_failover_enabled = true
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
  
  # Franchise-specific tags
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-redis-primary"
    ShardId = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id)
    CacheType = "primary"
    FranchiseAware = "true"
  })
}

# Global Datastore for cross-region replication (if primary region)
resource "aws_elasticache_global_replication_group" "franchise_redis_global" {
  count = lookup(local.shard_config, var.aws_region, { primary = false }).primary ? 1 : 0
  
  global_replication_group_id_suffix = "global-franchise-cache"
  primary_replication_group_id       = aws_elasticache_replication_group.franchise_redis_primary.id
  
  global_replication_group_description = "Global Redis cache for BookedBarber franchise platform"
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-redis-global"
    CacheType = "global"
    FranchiseAware = "true"
  })
}

# Secondary Redis cluster for session storage
resource "aws_elasticache_replication_group" "franchise_redis_sessions" {
  replication_group_id         = "${local.cluster_name}-redis-sessions"
  description                  = "Redis cluster for user sessions and auth tokens"
  
  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  port                 = 6379
  
  # Node configuration (smaller for sessions)
  node_type            = var.redis_session_node_type
  num_cache_clusters   = var.redis_session_num_nodes
  
  # Network and security
  subnet_group_name    = aws_elasticache_subnet_group.franchise_redis_subnet_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]
  
  # Parameter group
  parameter_group_name = aws_elasticache_parameter_group.franchise_redis_params.name
  
  # Encryption and security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  kms_key_id                 = aws_kms_key.redis_encryption.arn
  
  # Backup configuration (sessions don't need long retention)
  snapshot_retention_limit = 1
  snapshot_window         = var.redis_snapshot_window
  maintenance_window      = var.redis_maintenance_window
  
  # Multi-AZ and failover
  multi_az_enabled           = true
  automatic_failover_enabled = true
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-redis-sessions"
    ShardId = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id)
    CacheType = "sessions"
    FranchiseAware = "true"
  })
}

# Redis cluster for rate limiting
resource "aws_elasticache_replication_group" "franchise_redis_ratelimit" {
  replication_group_id         = "${local.cluster_name}-redis-ratelimit"
  description                  = "Redis cluster for rate limiting and security"
  
  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  port                 = 6379
  
  # Node configuration (small and fast)
  node_type            = "cache.t4g.micro"
  num_cache_clusters   = 2
  
  # Network and security
  subnet_group_name    = aws_elasticache_subnet_group.franchise_redis_subnet_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]
  
  # Parameter group
  parameter_group_name = aws_elasticache_parameter_group.franchise_redis_params.name
  
  # Encryption and security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  kms_key_id                 = aws_kms_key.redis_encryption.arn
  
  # No backup needed for rate limiting data
  snapshot_retention_limit = 0
  maintenance_window      = var.redis_maintenance_window
  
  # Multi-AZ for high availability
  multi_az_enabled           = true
  automatic_failover_enabled = true
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-redis-ratelimit"
    ShardId = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id)
    CacheType = "ratelimit"
    FranchiseAware = "false"  # Rate limiting is not franchise-specific
  })
}

# KMS Key for Redis encryption
resource "aws_kms_key" "redis_encryption" {
  description             = "KMS key for Redis encryption"
  deletion_window_in_days = 7
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-redis-encryption"
  })
}

resource "aws_kms_alias" "redis_encryption_alias" {
  name          = "alias/${local.cluster_name}-redis-encryption"
  target_key_id = aws_kms_key.redis_encryption.key_id
}

# CloudWatch Log Groups for Redis
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${local.cluster_name}/redis-slow-log"
  retention_in_days = 7
  
  tags = local.common_tags
}

# CloudWatch Alarms for Redis Monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu_utilization" {
  alarm_name          = "${local.cluster_name}-redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.franchise_redis_primary.id}-001"
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory_utilization" {
  alarm_name          = "${local.cluster_name}-redis-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors Redis memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.franchise_redis_primary.id}-001"
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_connection_count" {
  alarm_name          = "${local.cluster_name}-redis-connection-count"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "50000"  # 77% of max connections (65000)
  alarm_description   = "This metric monitors Redis connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.franchise_redis_primary.id}-001"
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${local.cluster_name}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors Redis key evictions"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.franchise_redis_primary.id}-001"
  }
  
  tags = local.common_tags
}

# Redis Secrets in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_credentials" {
  name                    = "${local.cluster_name}-redis-credentials"
  description             = "Redis credentials for BookedBarber franchise platform"
  recovery_window_in_days = var.environment == "production" ? 30 : 0
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  
  secret_string = jsonencode({
    primary_endpoint = aws_elasticache_replication_group.franchise_redis_primary.primary_endpoint_address
    reader_endpoint  = aws_elasticache_replication_group.franchise_redis_primary.reader_endpoint_address
    port            = aws_elasticache_replication_group.franchise_redis_primary.port
    auth_token      = var.redis_auth_token
    
    sessions_endpoint = aws_elasticache_replication_group.franchise_redis_sessions.primary_endpoint_address
    sessions_port     = aws_elasticache_replication_group.franchise_redis_sessions.port
    
    ratelimit_endpoint = aws_elasticache_replication_group.franchise_redis_ratelimit.primary_endpoint_address
    ratelimit_port     = aws_elasticache_replication_group.franchise_redis_ratelimit.port
    
    cluster_config = jsonencode({
      primary = {
        endpoint = aws_elasticache_replication_group.franchise_redis_primary.primary_endpoint_address
        purpose  = "franchise_data_cache"
        ttl_default = 3600
      }
      sessions = {
        endpoint = aws_elasticache_replication_group.franchise_redis_sessions.primary_endpoint_address
        purpose  = "user_sessions_auth"
        ttl_default = 86400
      }
      ratelimit = {
        endpoint = aws_elasticache_replication_group.franchise_redis_ratelimit.primary_endpoint_address
        purpose  = "rate_limiting_security"
        ttl_default = 60
      }
    })
    
    shard_id = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id
    region   = var.aws_region
  })
}