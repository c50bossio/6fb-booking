# BookedBarber V2 - Staging Environment Infrastructure
# This configuration creates a staging environment that mirrors production
# but with reduced resources and relaxed security for testing purposes.

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
  
  # Backend configuration for state management
  backend "s3" {
    bucket = "bookedbarber-terraform-state-staging"
    key    = "staging/terraform.tfstate"
    region = "us-east-1"
    
    # DynamoDB table for state locking
    dynamodb_table = "bookedbarber-terraform-locks-staging"
    encrypt        = true
  }
}

# =============================================================================
# PROVIDERS CONFIGURATION
# =============================================================================

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = "staging"
      Project     = "BookedBarber"
      ManagedBy   = "Terraform"
      Owner       = "DevOps"
      CostCenter  = "Engineering"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# =============================================================================
# VARIABLES
# =============================================================================

variable "aws_region" {
  description = "AWS region for staging environment"
  type        = string
  default     = "us-east-1"
}

variable "gcp_project_id" {
  description = "GCP project ID for staging environment"
  type        = string
  default     = "bookedbarber-staging"
}

variable "gcp_region" {
  description = "GCP region for staging environment"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "bookedbarber"
}

variable "domain_name" {
  description = "Domain name for staging environment"
  type        = string
  default     = "staging.bookedbarber.com"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# =============================================================================
# VPC AND NETWORKING
# =============================================================================

resource "aws_vpc" "main" {
  cidr_block           = "10.1.0.0/16"  # Different CIDR from production
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "${var.app_name}-vpc-${var.environment}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "${var.app_name}-igw-${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count = 2
  
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.1.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.app_name}-public-subnet-${count.index + 1}-${var.environment}"
    Type = "Public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count = 2
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.1.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "${var.app_name}-private-subnet-${count.index + 1}-${var.environment}"
    Type = "Private"
  }
}

# NAT Gateway (single for staging to save costs)
resource "aws_eip" "nat" {
  domain = "vpc"
  
  tags = {
    Name = "${var.app_name}-nat-eip-${var.environment}"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  
  tags = {
    Name = "${var.app_name}-nat-${var.environment}"
  }
  
  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = {
    Name = "${var.app_name}-public-rt-${var.environment}"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  
  tags = {
    Name = "${var.app_name}-private-rt-${var.environment}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count = 2
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = 2
  
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# =============================================================================
# SECURITY GROUPS
# =============================================================================

# Application Load Balancer Security Group
resource "aws_security_group" "alb" {
  name_prefix = "${var.app_name}-alb-${var.environment}"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.app_name}-alb-sg-${var.environment}"
  }
}

# ECS Service Security Group
resource "aws_security_group" "ecs" {
  name_prefix = "${var.app_name}-ecs-${var.environment}"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.app_name}-ecs-sg-${var.environment}"
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${var.app_name}-rds-${var.environment}"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  
  tags = {
    Name = "${var.app_name}-rds-sg-${var.environment}"
  }
}

# ElastiCache Security Group
resource "aws_security_group" "redis" {
  name_prefix = "${var.app_name}-redis-${var.environment}"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  
  tags = {
    Name = "${var.app_name}-redis-sg-${var.environment}"
  }
}

# =============================================================================
# RDS DATABASE (SMALLER INSTANCE FOR STAGING)
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
  
  tags = {
    Name = "${var.app_name}-db-subnet-group-${var.environment}"
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.app_name}-db-${var.environment}"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"  # Smaller than production
  
  allocated_storage     = 20   # Much smaller than production
  max_allocated_storage = 50   # Lower limit than production
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = "bookedbarber_staging"
  username = "staging_admin"
  password = var.db_password  # Password from environment variable or secrets manager
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7  # Shorter than production
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true  # For staging environment
  deletion_protection = false # For staging environment
  
  performance_insights_enabled = false  # Save costs in staging
  
  tags = {
    Name = "${var.app_name}-database-${var.environment}"
  }
}

# =============================================================================
# ELASTICACHE REDIS (SINGLE NODE FOR STAGING)
# =============================================================================

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.app_name}-cache-subnet-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.app_name}-redis-${var.environment}"
  engine               = "redis"
  node_type           = "cache.t3.micro"  # Smaller than production
  num_cache_nodes     = 1                 # Single node for staging
  parameter_group_name = "default.redis7"
  port                = 6379
  
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  tags = {
    Name = "${var.app_name}-redis-${var.environment}"
  }
}

# =============================================================================
# ECS CLUSTER AND SERVICES
# =============================================================================

resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster-${var.environment}"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Name = "${var.app_name}-cluster-${var.environment}"
  }
}

# =============================================================================
# APPLICATION LOAD BALANCER
# =============================================================================

resource "aws_lb" "main" {
  name               = "${var.app_name}-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id
  
  enable_deletion_protection = false  # For staging environment
  
  tags = {
    Name = "${var.app_name}-alb-${var.environment}"
  }
}

# =============================================================================
# S3 BUCKETS
# =============================================================================

# Static Assets Bucket
resource "aws_s3_bucket" "assets" {
  bucket = "${var.app_name}-assets-${var.environment}-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "${var.app_name}-assets-${var.environment}"
    Environment = var.environment
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# =============================================================================
# CLOUDFRONT DISTRIBUTION
# =============================================================================

resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "${var.app_name}-alb-${var.environment}"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  enabled = true
  
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "${var.app_name}-alb-${var.environment}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    min_ttl     = 0
    default_ttl = 300   # 5 minutes for staging
    max_ttl     = 3600  # 1 hour for staging
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  tags = {
    Name = "${var.app_name}-cdn-${var.environment}"
  }
}

# =============================================================================
# IAM ROLES AND POLICIES
# =============================================================================

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.app_name}-ecs-task-execution-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# =============================================================================
# OUTPUTS
# =============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  sensitive   = true
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "s3_assets_bucket" {
  description = "Name of the S3 assets bucket"
  value       = aws_s3_bucket.assets.bucket
}