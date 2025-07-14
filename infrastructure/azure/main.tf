# Synthos Azure Infrastructure  
# Enterprise-grade deployment with Container Instances and managed services

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "synthos-terraform-state"
    storage_account_name = "synthostfstate"
    container_name       = "tfstate"
    key                  = "synthos.terraform.tfstate"
  }
}

# Variables
variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
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

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "synthos-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "Synthos"
    ManagedBy   = "Terraform"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "synthos-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = azurerm_resource_group.main.tags
}

# Subnet for services
resource "azurerm_subnet" "services" {
  name                 = "synthos-services-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "container-instances"
    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# Subnet for database
resource "azurerm_subnet" "database" {
  name                 = "synthos-database-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]

  service_endpoints = ["Microsoft.Sql"]
}

# Network Security Group
resource "azurerm_network_security_group" "main" {
  name                = "synthos-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "HTTP"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "HTTPS"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = azurerm_resource_group.main.tags
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "synthos-postgres-${var.environment}"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "15"
  delegated_subnet_id    = azurerm_subnet.database.id
  private_dns_zone_id    = azurerm_private_dns_zone.postgres.id
  administrator_login    = "synthos"
  administrator_password = random_password.db_password.result
  zone                   = "1"

  storage_mb   = 32768
  storage_tier = "P30"

  sku_name = "GP_Standard_D4s_v3"

  backup_retention_days        = 30
  geo_redundant_backup_enabled = true

  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]

  tags = azurerm_resource_group.main.tags
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "synthos"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgres" {
  name                = "synthos.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name

  tags = azurerm_resource_group.main.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "synthos-postgres-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id
  resource_group_name   = azurerm_resource_group.main.name

  tags = azurerm_resource_group.main.tags
}

# Azure Cache for Redis
resource "azurerm_redis_cache" "main" {
  name                = "synthos-redis-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 2
  family              = "C"
  sku_name            = "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_reserved = 125
    maxmemory_delta    = 125
    maxmemory_policy   = "allkeys-lru"
  }

  tags = azurerm_resource_group.main.tags
}

# Storage Account for blob storage
resource "azurerm_storage_account" "main" {
  name                     = "synthosstorage${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind            = "StorageV2"

  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 30
    }
  }

  tags = azurerm_resource_group.main.tags
}

resource "random_string" "storage_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Storage Container
resource "azurerm_storage_container" "data" {
  name                  = "synthos-data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Container Registry
resource "azurerm_container_registry" "main" {
  name                = "synthosregistry${random_string.registry_suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Premium"
  admin_enabled       = true

  georeplications {
    location                = "West US"
    zone_redundancy_enabled = true
    tags                    = azurerm_resource_group.main.tags
  }

  tags = azurerm_resource_group.main.tags
}

resource "random_string" "registry_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Key Vault for secrets
resource "azurerm_key_vault" "main" {
  name                       = "synthos-kv-${random_string.kv_suffix.result}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  purge_protection_enabled   = true
  soft_delete_retention_days = 90

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get", "List", "Update", "Create", "Import", "Delete", "Recover",
      "Backup", "Restore", "Decrypt", "Encrypt", "UnwrapKey", "WrapKey",
      "Verify", "Sign", "Purge"
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]

    certificate_permissions = [
      "Get", "List", "Update", "Create", "Import", "Delete", "Recover",
      "Backup", "Restore", "ManageContacts", "ManageIssuers", "GetIssuers",
      "ListIssuers", "SetIssuers", "DeleteIssuers", "Purge"
    ]
  }

  tags = azurerm_resource_group.main.tags
}

resource "random_string" "kv_suffix" {
  length  = 8
  special = false
  upper   = false
}

data "azurerm_client_config" "current" {}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "synthos-insights-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  retention_in_days   = 90

  tags = azurerm_resource_group.main.tags
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "synthos-logs-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = azurerm_resource_group.main.tags
}

# Container Group for Backend
resource "azurerm_container_group" "backend" {
  name                = "synthos-backend-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ip_address_type     = "Public"
  dns_name_label      = "synthos-backend-${var.environment}"
  os_type             = "Linux"
  subnet_ids          = [azurerm_subnet.services.id]

  container {
    name   = "backend"
    image  = "synthos/backend:latest"
    cpu    = "2"
    memory = "4"

    ports {
      port     = 8000
      protocol = "TCP"
    }

    environment_variables = {
      ENVIRONMENT = var.environment
      DEBUG       = "false"
    }

    secure_environment_variables = {
      DATABASE_URL     = "postgresql://synthos:${random_password.db_password.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/synthos"
      REDIS_URL        = "redis://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:6380"
      ANTHROPIC_API_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/anthropic-api-key/)"
    }
  }

  tags = azurerm_resource_group.main.tags
}

# Container Group for Frontend
resource "azurerm_container_group" "frontend" {
  name                = "synthos-frontend-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ip_address_type     = "Public"
  dns_name_label      = "synthos-frontend-${var.environment}"
  os_type             = "Linux"
  subnet_ids          = [azurerm_subnet.services.id]

  container {
    name   = "frontend"
    image  = "synthos/frontend:latest"
    cpu    = "1"
    memory = "2"

    ports {
      port     = 3000
      protocol = "TCP"
    }

    environment_variables = {
      NODE_ENV                  = "production"
      NEXT_PUBLIC_API_URL      = "https://${azurerm_container_group.backend.fqdn}:8000"
      NEXT_PUBLIC_ENVIRONMENT  = var.environment
    }
  }

  tags = azurerm_resource_group.main.tags
}

# Azure CDN Profile
resource "azurerm_cdn_profile" "main" {
  name                = "synthos-cdn-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard_Microsoft"

  tags = azurerm_resource_group.main.tags
}

resource "azurerm_cdn_endpoint" "frontend" {
  name                = "synthos-frontend-cdn"
  profile_name        = azurerm_cdn_profile.main.name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  origin {
    name      = "frontend"
    host_name = azurerm_container_group.frontend.fqdn
  }

  tags = azurerm_resource_group.main.tags
}

# Monitor Action Group
resource "azurerm_monitor_action_group" "main" {
  name                = "synthos-alerts-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "synthosalrt"

  email_receiver {
    name          = "admin"
    email_address = "alerts@synthos.ai"
  }

  tags = azurerm_resource_group.main.tags
}

# Metric Alerts
resource "azurerm_monitor_metric_alert" "cpu_usage" {
  name                = "synthos-high-cpu"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_container_group.backend.id]
  description         = "Alert when CPU usage is high"

  criteria {
    metric_namespace = "Microsoft.ContainerInstance/containerGroups"
    metric_name      = "CpuUsage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = azurerm_resource_group.main.tags
}

# Outputs
output "backend_fqdn" {
  description = "Backend container FQDN"
  value       = azurerm_container_group.backend.fqdn
}

output "frontend_fqdn" {
  description = "Frontend container FQDN"
  value       = azurerm_container_group.frontend.fqdn
}

output "database_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = azurerm_postgresql_flexible_server.main.fqdn
  sensitive   = true
}

output "redis_hostname" {
  description = "Redis cache hostname"
  value       = azurerm_redis_cache.main.hostname
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.name
}

output "cdn_endpoint" {
  description = "CDN endpoint URL"
  value       = azurerm_cdn_endpoint.frontend.fqdn
} 