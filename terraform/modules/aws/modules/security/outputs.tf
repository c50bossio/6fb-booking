# Outputs for AWS Security Groups Module

# Primary security group IDs
output "alb_security_group_id" {
  description = "ID of the Application Load Balancer security group"
  value       = aws_security_group.alb.id
}

output "backend_security_group_id" {
  description = "ID of the backend application security group"
  value       = aws_security_group.backend.id
}

output "frontend_security_group_id" {
  description = "ID of the frontend application security group"
  value       = aws_security_group.frontend.id
}

output "database_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.database.id
}

output "redis_security_group_id" {
  description = "ID of the Redis cache security group"
  value       = aws_security_group.redis.id
}

# Additional security group IDs
output "efs_security_group_id" {
  description = "ID of the EFS security group"
  value       = aws_security_group.efs.id
}

output "bastion_security_group_id" {
  description = "ID of the bastion host security group"
  value       = aws_security_group.bastion.id
}

output "lambda_security_group_id" {
  description = "ID of the Lambda functions security group"
  value       = aws_security_group.lambda.id
}

output "vpc_endpoints_security_group_id" {
  description = "ID of the VPC endpoints security group"
  value       = aws_security_group.vpc_endpoints.id
}

output "monitoring_security_group_id" {
  description = "ID of the monitoring services security group"
  value       = aws_security_group.monitoring.id
}

# Security group ARNs
output "security_group_arns" {
  description = "Map of security group ARNs"
  value = {
    alb           = aws_security_group.alb.arn
    backend       = aws_security_group.backend.arn
    frontend      = aws_security_group.frontend.arn
    database      = aws_security_group.database.arn
    redis         = aws_security_group.redis.arn
    efs           = aws_security_group.efs.arn
    bastion       = aws_security_group.bastion.arn
    lambda        = aws_security_group.lambda.arn
    vpc_endpoints = aws_security_group.vpc_endpoints.arn
    monitoring    = aws_security_group.monitoring.arn
  }
}

# Security group names
output "security_group_names" {
  description = "Map of security group names"
  value = {
    alb           = aws_security_group.alb.name
    backend       = aws_security_group.backend.name
    frontend      = aws_security_group.frontend.name
    database      = aws_security_group.database.name
    redis         = aws_security_group.redis.name
    efs           = aws_security_group.efs.name
    bastion       = aws_security_group.bastion.name
    lambda        = aws_security_group.lambda.name
    vpc_endpoints = aws_security_group.vpc_endpoints.name
    monitoring    = aws_security_group.monitoring.name
  }
}

# All security group IDs as a list
output "all_security_group_ids" {
  description = "List of all security group IDs"
  value = [
    aws_security_group.alb.id,
    aws_security_group.backend.id,
    aws_security_group.frontend.id,
    aws_security_group.database.id,
    aws_security_group.redis.id,
    aws_security_group.efs.id,
    aws_security_group.bastion.id,
    aws_security_group.lambda.id,
    aws_security_group.vpc_endpoints.id,
    aws_security_group.monitoring.id
  ]
}

# Security group details for documentation
output "security_group_details" {
  description = "Detailed information about security groups"
  value = {
    alb = {
      id          = aws_security_group.alb.id
      arn         = aws_security_group.alb.arn
      name        = aws_security_group.alb.name
      description = aws_security_group.alb.description
      vpc_id      = aws_security_group.alb.vpc_id
    }
    backend = {
      id          = aws_security_group.backend.id
      arn         = aws_security_group.backend.arn
      name        = aws_security_group.backend.name
      description = aws_security_group.backend.description
      vpc_id      = aws_security_group.backend.vpc_id
    }
    frontend = {
      id          = aws_security_group.frontend.id
      arn         = aws_security_group.frontend.arn
      name        = aws_security_group.frontend.name
      description = aws_security_group.frontend.description
      vpc_id      = aws_security_group.frontend.vpc_id
    }
    database = {
      id          = aws_security_group.database.id
      arn         = aws_security_group.database.arn
      name        = aws_security_group.database.name
      description = aws_security_group.database.description
      vpc_id      = aws_security_group.database.vpc_id
    }
    redis = {
      id          = aws_security_group.redis.id
      arn         = aws_security_group.redis.arn
      name        = aws_security_group.redis.name
      description = aws_security_group.redis.description
      vpc_id      = aws_security_group.redis.vpc_id
    }
  }
}

# For terraform state references
output "security_group_map" {
  description = "Map of security group IDs for easy reference"
  value = {
    "alb"           = aws_security_group.alb.id
    "backend"       = aws_security_group.backend.id
    "frontend"      = aws_security_group.frontend.id
    "database"      = aws_security_group.database.id
    "redis"         = aws_security_group.redis.id
    "efs"           = aws_security_group.efs.id
    "bastion"       = aws_security_group.bastion.id
    "lambda"        = aws_security_group.lambda.id
    "vpc_endpoints" = aws_security_group.vpc_endpoints.id
    "monitoring"    = aws_security_group.monitoring.id
  }
}