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

# This file exists to help Terraform Cloud find the configuration
# The actual infrastructure is defined in infrastructure/aws/main.tf 