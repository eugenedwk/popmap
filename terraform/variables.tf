variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "popmap"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the database (your IP addresses)"
  type        = list(string)
  # Default is empty - YOU MUST SET THIS in terraform.tfvars
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "popmap"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "popmap_admin"
}

variable "db_password" {
  description = "Master password for the database (stored in terraform.tfvars, NOT in version control)"
  type        = string
  sensitive   = true
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.14"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"  # Graviton (ARM) - ~10% cheaper than t3.micro
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = false  # Set to true for production
}

variable "publicly_accessible" {
  description = "Whether the DB should be publicly accessible (set to false for production)"
  type        = bool
  default     = true  # For dev, set to false for prod and use VPN/bastion
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds (0, 1, 5, 10, 15, 30, 60)"
  type        = number
  default     = 0  # Set to 60 for production
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights"
  type        = bool
  default     = false  # Set to true for production
}

# Domain and DNS Configuration
variable "domain_name" {
  description = "Domain name for the application (e.g., popmap.co)"
  type        = string
  default     = "popmap.co"
}

variable "frontend_certificate_arn" {
  description = "ARN of the ACM certificate for frontend (popmap.co and www.popmap.co)"
  type        = string
}

variable "api_certificate_arn" {
  description = "ARN of the ACM certificate for API subdomain (api.popmap.co)"
  type        = string
}

# GitHub Configuration for CI/CD
variable "github_repo" {
  description = "GitHub repository in format: owner/repo (e.g., username/popmap)"
  type        = string
  default     = "eugenedwk/popmap"
}
