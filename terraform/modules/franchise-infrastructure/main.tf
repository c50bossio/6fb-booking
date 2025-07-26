# BookedBarber V2 - Multi-Region Franchise Infrastructure
# Terraform module for deploying enterprise-scale franchise platform

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
}

# Local variables for configuration
locals {
  common_tags = {
    Project     = "BookedBarber-V2"
    Environment = var.environment
    Region      = var.aws_region
    Terraform   = "true"
    Component   = "franchise-infrastructure"
    CostCenter  = "infrastructure"
    Owner       = "devops-team"
  }
  
  cluster_name = "${var.project_name}-${var.environment}-${var.aws_region}"
  
  # Franchise shard configuration
  shard_config = {
    "us-east-1" = {
      shard_id = 1
      franchise_range_start = 1
      franchise_range_end = 25000
      primary = true
    }
    "us-west-2" = {
      shard_id = 2
      franchise_range_start = 25001
      franchise_range_end = 50000
      primary = false
    }
    "eu-west-1" = {
      shard_id = 3
      franchise_range_start = 50001
      franchise_range_end = 75000
      primary = false
    }
    "ap-southeast-1" = {
      shard_id = 4
      franchise_range_start = 75001
      franchise_range_end = 100000
      primary = false
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Configuration
resource "aws_vpc" "franchise_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-vpc"
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "franchise_igw" {
  vpc_id = aws_vpc.franchise_vpc.id
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-igw"
  })
}

# Public Subnets for Load Balancers
resource "aws_subnet" "public_subnets" {
  count = min(length(data.aws_availability_zones.available.names), 3)
  
  vpc_id                  = aws_vpc.franchise_vpc.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-public-${count.index + 1}"
    Type = "public"
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/elb" = "1"
  })
}

# Private Subnets for EKS nodes
resource "aws_subnet" "private_subnets" {
  count = min(length(data.aws_availability_zones.available.names), 3)
  
  vpc_id            = aws_vpc.franchise_vpc.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 8)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-private-${count.index + 1}"
    Type = "private"
    "kubernetes.io/cluster/${local.cluster_name}" = "owned"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

# Database Subnets
resource "aws_subnet" "database_subnets" {
  count = min(length(data.aws_availability_zones.available.names), 3)
  
  vpc_id            = aws_vpc.franchise_vpc.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 12)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-database-${count.index + 1}"
    Type = "database"
  })
}

# NAT Gateways for private subnet internet access
resource "aws_eip" "nat_eip" {
  count = min(length(data.aws_availability_zones.available.names), 3)
  
  domain = "vpc"
  depends_on = [aws_internet_gateway.franchise_igw]
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-nat-eip-${count.index + 1}"
  })
}

resource "aws_nat_gateway" "nat_gw" {
  count = min(length(data.aws_availability_zones.available.names), 3)
  
  allocation_id = aws_eip.nat_eip[count.index].id
  subnet_id     = aws_subnet.public_subnets[count.index].id
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-nat-gw-${count.index + 1}"
  })
  
  depends_on = [aws_internet_gateway.franchise_igw]
}

# Route Tables
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.franchise_vpc.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.franchise_igw.id
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-public-rt"
  })
}

resource "aws_route_table" "private_rt" {
  count = min(length(data.aws_availability_zones.available.names), 3)
  
  vpc_id = aws_vpc.franchise_vpc.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gw[count.index].id
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-private-rt-${count.index + 1}"
  })
}

# Route Table Associations
resource "aws_route_table_association" "public_rta" {
  count = length(aws_subnet.public_subnets)
  
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "private_rta" {
  count = length(aws_subnet.private_subnets)
  
  subnet_id      = aws_subnet.private_subnets[count.index].id
  route_table_id = aws_route_table.private_rt[count.index].id
}

# Security Groups
resource "aws_security_group" "eks_cluster_sg" {
  name_prefix = "${local.cluster_name}-cluster-"
  vpc_id      = aws_vpc.franchise_vpc.id
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-cluster-sg"
  })
}

resource "aws_security_group" "eks_node_sg" {
  name_prefix = "${local.cluster_name}-node-"
  vpc_id      = aws_vpc.franchise_vpc.id
  
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
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
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-node-sg"
  })
}

resource "aws_security_group" "rds_sg" {
  name_prefix = "${local.cluster_name}-rds-"
  vpc_id      = aws_vpc.franchise_vpc.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_node_sg.id]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-rds-sg"
  })
}

resource "aws_security_group" "redis_sg" {
  name_prefix = "${local.cluster_name}-redis-"
  vpc_id      = aws_vpc.franchise_vpc.id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_node_sg.id]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-redis-sg"
  })
}

# IAM Roles for EKS
resource "aws_iam_role" "eks_cluster_role" {
  name = "${local.cluster_name}-cluster-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role" "eks_node_role" {
  name = "${local.cluster_name}-node-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

# Additional IAM policies for franchise operations
resource "aws_iam_policy" "franchise_operations_policy" {
  name        = "${local.cluster_name}-franchise-operations"
  description = "IAM policy for franchise operations"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters",
          "elasticache:DescribeCacheClusters",
          "elasticache:DescribeReplicationGroups",
          "route53:ChangeResourceRecordSets",
          "route53:GetHostedZone",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "franchise_operations_attachment" {
  policy_arn = aws_iam_policy.franchise_operations_policy.arn
  role       = aws_iam_role.eks_node_role.name
}

# EKS Cluster
resource "aws_eks_cluster" "franchise_cluster" {
  name     = local.cluster_name
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = var.kubernetes_version
  
  vpc_config {
    subnet_ids              = concat(aws_subnet.private_subnets[*].id, aws_subnet.public_subnets[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.eks_public_access_cidrs
    security_group_ids      = [aws_security_group.eks_cluster_sg.id]
  }
  
  encryption_config {
    provider {
      key_arn = aws_kms_key.eks_encryption.arn
    }
    resources = ["secrets"]
  }
  
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller,
    aws_cloudwatch_log_group.eks_cluster_logs
  ]
  
  tags = local.common_tags
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks_cluster_logs" {
  name              = "/aws/eks/${local.cluster_name}/cluster"
  retention_in_days = 7
  
  tags = local.common_tags
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks_encryption" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-eks-encryption"
  })
}

resource "aws_kms_alias" "eks_encryption_alias" {
  name          = "alias/${local.cluster_name}-eks-encryption"
  target_key_id = aws_kms_key.eks_encryption.key_id
}

# Launch Template for EKS Node Groups
resource "aws_launch_template" "eks_node_template" {
  name_prefix   = "${local.cluster_name}-node-"
  image_id      = var.eks_node_ami_id
  instance_type = var.eks_node_instance_type
  
  vpc_security_group_ids = [aws_security_group.eks_node_sg.id]
  
  user_data = base64encode(templatefile("${path.module}/templates/userdata.sh", {
    cluster_name = local.cluster_name
    shard_id     = lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id
    region       = var.aws_region
  }))
  
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = var.eks_node_volume_size
      volume_type = "gp3"
      encrypted   = true
      kms_key_id  = aws_kms_key.eks_encryption.arn
    }
  }
  
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
    http_put_response_hop_limit = 2
  }
  
  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "${local.cluster_name}-node"
    })
  }
  
  tags = local.common_tags
}

# EKS Node Groups
resource "aws_eks_node_group" "general_purpose" {
  cluster_name    = aws_eks_cluster.franchise_cluster.name
  node_group_name = "general-purpose"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private_subnets[*].id
  
  launch_template {
    id      = aws_launch_template.eks_node_template.id
    version = aws_launch_template.eks_node_template.latest_version
  }
  
  scaling_config {
    desired_size = var.eks_node_desired_size
    max_size     = var.eks_node_max_size
    min_size     = var.eks_node_min_size
  }
  
  instance_types = [var.eks_node_instance_type]
  capacity_type  = "ON_DEMAND"
  
  update_config {
    max_unavailable_percentage = 25
  }
  
  labels = {
    role = "general-purpose"
    tier = "compute"
    shard = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id)
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
  
  tags = local.common_tags
}

resource "aws_eks_node_group" "compute_optimized" {
  cluster_name    = aws_eks_cluster.franchise_cluster.name
  node_group_name = "compute-optimized"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private_subnets[*].id
  
  launch_template {
    id      = aws_launch_template.eks_node_template.id
    version = aws_launch_template.eks_node_template.latest_version
  }
  
  scaling_config {
    desired_size = max(1, var.eks_node_desired_size / 4)
    max_size     = max(10, var.eks_node_max_size / 2)
    min_size     = 1
  }
  
  instance_types = ["c6i.2xlarge", "c6i.4xlarge"]
  capacity_type  = "SPOT"
  
  update_config {
    max_unavailable_percentage = 25
  }
  
  labels = {
    role = "compute-optimized"
    tier = "compute-intensive"
    shard = tostring(lookup(local.shard_config, var.aws_region, { shard_id = 1 }).shard_id)
  }
  
  taint {
    key    = "compute-optimized"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
  
  tags = local.common_tags
}