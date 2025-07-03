# Outputs for AWS Networking Module

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

output "public_subnet_cidrs" {
  description = "List of CIDR blocks of the public subnets"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "List of CIDR blocks of the private subnets"
  value       = aws_subnet.private[*].cidr_block
}

output "database_subnet_cidrs" {
  description = "List of CIDR blocks of the database subnets"
  value       = aws_subnet.database[*].cidr_block
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = local.availability_zones
}

output "nat_gateway_ids" {
  description = "List of IDs of the NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

output "nat_gateway_public_ips" {
  description = "List of public Elastic IPs of NAT Gateways"
  value       = aws_eip.nat[*].public_ip
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "List of IDs of the private route tables"
  value       = aws_route_table.private[*].id
}

output "database_route_table_id" {
  description = "ID of the database route table"
  value       = aws_route_table.database.id
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "elasticache_subnet_group_name" {
  description = "Name of the ElastiCache subnet group"
  value       = aws_elasticache_subnet_group.main.name
}

output "vpc_endpoints" {
  description = "Map of VPC endpoint IDs"
  value = {
    s3        = aws_vpc_endpoint.s3.id
    dynamodb  = aws_vpc_endpoint.dynamodb.id
    ecr_dkr   = aws_vpc_endpoint.ecr_dkr.id
    ecr_api   = aws_vpc_endpoint.ecr_api.id
    logs      = aws_vpc_endpoint.logs.id
  }
}

output "vpc_endpoint_security_group_id" {
  description = "ID of the security group for VPC endpoints"
  value       = aws_security_group.vpc_endpoints.id
}

output "network_acl_ids" {
  description = "Map of Network ACL IDs"
  value = {
    public   = aws_network_acl.public.id
    private  = aws_network_acl.private.id
    database = aws_network_acl.database.id
  }
}

output "vpn_gateway_id" {
  description = "ID of the VPN Gateway"
  value       = var.enable_vpn_gateway ? aws_vpn_gateway.main[0].id : null
}

# Output subnet details for advanced use cases
output "public_subnets_details" {
  description = "Detailed information about public subnets"
  value = [
    for i, subnet in aws_subnet.public : {
      id                = subnet.id
      cidr_block        = subnet.cidr_block
      availability_zone = subnet.availability_zone
      name              = subnet.tags["Name"]
    }
  ]
}

output "private_subnets_details" {
  description = "Detailed information about private subnets"
  value = [
    for i, subnet in aws_subnet.private : {
      id                = subnet.id
      cidr_block        = subnet.cidr_block
      availability_zone = subnet.availability_zone
      name              = subnet.tags["Name"]
    }
  ]
}

output "database_subnets_details" {
  description = "Detailed information about database subnets"
  value = [
    for i, subnet in aws_subnet.database : {
      id                = subnet.id
      cidr_block        = subnet.cidr_block
      availability_zone = subnet.availability_zone
      name              = subnet.tags["Name"]
    }
  ]
}