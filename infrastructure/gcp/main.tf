# Synthos GCP Infrastructure
# Enterprise-grade deployment with Kubernetes and managed services

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
  backend "gcs" {
    bucket = "synthos-terraform-state-gcp"
    prefix = "terraform/state"
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
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

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "storage.googleapis.com",
    "cloudkms.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com"
  ])

  service = each.value
  project = var.project_id

  disable_on_destroy = false
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "synthos-vpc"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"

  depends_on = [google_project_service.required_apis]
}

# Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "synthos-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
}

# Google Kubernetes Engine Cluster
resource "google_container_cluster" "primary" {
  name     = "synthos-gke-${var.environment}"
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
  }

  network_policy {
    enabled = true
  }

  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  depends_on = [google_project_service.required_apis]
}

# Node Pool
resource "google_container_node_pool" "primary_nodes" {
  name       = "synthos-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 3

  node_config {
    preemptible  = false
    machine_type = "e2-standard-4"

    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      environment = var.environment
      app         = "synthos"
    }

    tags = ["synthos-node"]
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Service Account for GKE nodes
resource "google_service_account" "gke_nodes" {
  account_id   = "synthos-gke-nodes"
  display_name = "Synthos GKE Nodes"
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "synthos-postgres-${var.environment}"
  database_version = "POSTGRES_15"
  region          = var.region

  settings {
    tier = "db-standard-2"

    availability_type = "REGIONAL"
    
    backup_configuration {
      enabled                        = true
      start_time                    = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = true
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }

    database_flags {
      name  = "log_statement"
      value = "all"
    }
  }

  depends_on = [google_project_service.required_apis]
}

# Cloud SQL Database
resource "google_sql_database" "database" {
  name     = "synthos"
  instance = google_sql_database_instance.postgres.name
}

# Cloud SQL User
resource "google_sql_user" "users" {
  name     = "synthos"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Memorystore Redis
resource "google_redis_instance" "cache" {
  name           = "synthos-redis-${var.environment}"
  tier           = "STANDARD_HA"
  memory_size_gb = 4
  region         = var.region

  authorized_network = google_compute_network.vpc.id

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  depends_on = [google_project_service.required_apis]
}

# Cloud Storage bucket for data
resource "google_storage_bucket" "data" {
  name          = "synthos-data-${var.environment}-${random_id.bucket_suffix.hex}"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# Cloud KMS for encryption
resource "google_kms_key_ring" "synthos" {
  name     = "synthos-keyring-${var.environment}"
  location = var.region

  depends_on = [google_project_service.required_apis]
}

resource "google_kms_crypto_key" "storage_key" {
  name     = "synthos-storage-key"
  key_ring = google_kms_key_ring.synthos.id

  lifecycle {
    prevent_destroy = true
  }
}

# Container Registry
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "synthos"
  description   = "Synthos Docker repository"
  format        = "DOCKER"

  depends_on = [google_project_service.required_apis]
}

# Cloud CDN
resource "google_compute_global_address" "frontend_ip" {
  name = "synthos-frontend-ip"
}

resource "google_compute_managed_ssl_certificate" "frontend_ssl" {
  name = "synthos-frontend-ssl"

  managed {
    domains = [var.domain_name, "www.${var.domain_name}"]
  }
}

# IAM Service Account for applications
resource "google_service_account" "app_service_account" {
  account_id   = "synthos-app"
  display_name = "Synthos Application Service Account"
}

resource "google_service_account_key" "app_service_account_key" {
  service_account_id = google_service_account.app_service_account.name
}

# IAM bindings
resource "google_project_iam_member" "app_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.app_service_account.email}"
}

resource "google_project_iam_member" "app_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app_service_account.email}"
}

# Secret Manager for sensitive configuration
resource "google_secret_manager_secret" "app_secrets" {
  for_each = toset([
    "database-url",
    "redis-url", 
    "anthropic-api-key",
    "stripe-secret-key",
    "jwt-secret"
  ])

  secret_id = each.value

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.required_apis]
}

# Cloud Monitoring and Logging
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU Usage"
  combiner     = "OR"
  
  conditions {
    display_name = "CPU usage above 80%"
    
    condition_threshold {
      filter         = "resource.type=\"k8s_container\""
      duration       = "300s"
      comparison     = "COMPARISON_GT"
      threshold_value = 0.8
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  depends_on = [google_project_service.required_apis]
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Email Notifications"
  type         = "email"
  
  labels = {
    email_address = "alerts@synthos.ai"
  }

  depends_on = [google_project_service.required_apis]
}

# Outputs
output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  description = "Redis instance host"
  value       = google_redis_instance.cache.host
}

output "storage_bucket" {
  description = "Storage bucket name"
  value       = google_storage_bucket.data.name
}

output "frontend_ip" {
  description = "Frontend load balancer IP"
  value       = google_compute_global_address.frontend_ip.address
} 