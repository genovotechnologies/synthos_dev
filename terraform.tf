# Root Terraform configuration for Terraform Cloud
# This file points to the actual configuration in infrastructure/aws/

terraform {
  required_version = ">= 1.0"
  
  # Terraform Cloud backend configuration
  backend "remote" {
    organization = "genovo-technologies"
    workspaces {
      name = "synthos-aws"
    }
  }
}

# Variables - These need to be declared in the root module for Terraform Cloud
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "synthos.ai"
}

# This file exists to help Terraform Cloud find the configuration
# The actual infrastructure is defined in infrastructure/aws/main.tf 