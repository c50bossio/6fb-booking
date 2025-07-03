# AWS Security Groups Module for BookedBarber V2

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  security_groups = var.security_groups_config
}

# Application Load Balancer Security Group
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-${var.environment}-alb-"
  vpc_id      = var.vpc_id
  description = local.security_groups.alb.description

  dynamic "ingress" {
    for_each = local.security_groups.alb.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  dynamic "egress" {
    for_each = local.security_groups.alb.egress_rules
    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }

  tags = merge(var.tags, {
    Name = local.security_groups.alb.name
    Type = "Security Group"
    Tier = "Load Balancer"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Backend Application Security Group
resource "aws_security_group" "backend" {
  name_prefix = "${var.project_name}-${var.environment}-backend-"
  vpc_id      = var.vpc_id
  description = local.security_groups.backend.description

  # Dynamic ingress rules
  dynamic "ingress" {
    for_each = [
      for rule in local.security_groups.backend.ingress_rules : rule
      if lookup(rule, "source_security_group_id", "") == ""
    ]
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = lookup(ingress.value, "cidr_blocks", null)
      description = ingress.value.description
    }
  }

  dynamic "egress" {
    for_each = local.security_groups.backend.egress_rules
    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }

  tags = merge(var.tags, {
    Name = local.security_groups.backend.name
    Type = "Security Group"
    Tier = "Application"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Backend Security Group Rule for ALB access
resource "aws_security_group_rule" "backend_from_alb" {
  type                     = "ingress"
  from_port                = 8000
  to_port                  = 8000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.backend.id
  source_security_group_id = aws_security_group.alb.id
  description              = "Backend API traffic from ALB"
}

# Frontend Application Security Group
resource "aws_security_group" "frontend" {
  name_prefix = "${var.project_name}-${var.environment}-frontend-"
  vpc_id      = var.vpc_id
  description = local.security_groups.frontend.description

  dynamic "egress" {
    for_each = local.security_groups.frontend.egress_rules
    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }

  tags = merge(var.tags, {
    Name = local.security_groups.frontend.name
    Type = "Security Group"
    Tier = "Frontend"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Frontend Security Group Rule for ALB access
resource "aws_security_group_rule" "frontend_from_alb" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.frontend.id
  source_security_group_id = aws_security_group.alb.id
  description              = "Frontend traffic from ALB"
}

# Database Security Group
resource "aws_security_group" "database" {
  name_prefix = "${var.project_name}-${var.environment}-database-"
  vpc_id      = var.vpc_id
  description = local.security_groups.database.description

  tags = merge(var.tags, {
    Name = local.security_groups.database.name
    Type = "Security Group"
    Tier = "Database"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Database Security Group Rule for Backend access
resource "aws_security_group_rule" "database_from_backend" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.database.id
  source_security_group_id = aws_security_group.backend.id
  description              = "PostgreSQL access from backend"
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-${var.environment}-redis-"
  vpc_id      = var.vpc_id
  description = local.security_groups.redis.description

  tags = merge(var.tags, {
    Name = local.security_groups.redis.name
    Type = "Security Group"
    Tier = "Cache"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Redis Security Group Rule for Backend access
resource "aws_security_group_rule" "redis_from_backend" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = aws_security_group.backend.id
  description              = "Redis access from backend"
}

# EFS Security Group (if using EFS for shared storage)
resource "aws_security_group" "efs" {
  name_prefix = "${var.project_name}-${var.environment}-efs-"
  vpc_id      = var.vpc_id
  description = "Security group for EFS file system"

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id, aws_security_group.frontend.id]
    description     = "NFS access from application servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-efs-sg"
    Type = "Security Group"
    Tier = "Storage"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Bastion Host Security Group (for emergency access)
resource "aws_security_group" "bastion" {
  name_prefix = "${var.project_name}-${var.environment}-bastion-"
  vpc_id      = var.vpc_id
  description = "Security group for bastion host"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
    description = "SSH access from admin networks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-bastion-sg"
    Type = "Security Group"
    Tier = "Management"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Lambda Security Group (for serverless functions)
resource "aws_security_group" "lambda" {
  name_prefix = "${var.project_name}-${var.environment}-lambda-"
  vpc_id      = var.vpc_id
  description = "Security group for Lambda functions"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-lambda-sg"
    Type = "Security Group"
    Tier = "Serverless"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Additional rule to allow Lambda to access database
resource "aws_security_group_rule" "database_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.database.id
  source_security_group_id = aws_security_group.lambda.id
  description              = "PostgreSQL access from Lambda functions"
}

# Additional rule to allow Lambda to access Redis
resource "aws_security_group_rule" "redis_from_lambda" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = aws_security_group.lambda.id
  description              = "Redis access from Lambda functions"
}

# Security Group for VPC Endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "${var.project_name}-${var.environment}-vpc-endpoints-"
  vpc_id      = var.vpc_id
  description = "Security group for VPC endpoints"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "HTTPS from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-vpc-endpoints-sg"
    Type = "Security Group"
    Tier = "VPC Endpoints"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Security group for monitoring and logging services
resource "aws_security_group" "monitoring" {
  name_prefix = "${var.project_name}-${var.environment}-monitoring-"
  vpc_id      = var.vpc_id
  description = "Security group for monitoring services"

  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Prometheus metrics"
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Grafana dashboard"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-monitoring-sg"
    Type = "Security Group"
    Tier = "Monitoring"
  })

  lifecycle {
    create_before_destroy = true
  }
}