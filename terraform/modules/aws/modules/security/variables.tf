# Variables for AWS Security Groups Module

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "security_groups_config" {
  description = "Security groups configuration from shared module"
  type        = any
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks for admin access (bastion host)"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Should be restricted in production
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}