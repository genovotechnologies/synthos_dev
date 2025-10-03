# Environment Setup Guide

This guide provides detailed instructions for setting up the Go backend development and production environments.

---

## Development Environment

### Prerequisites

- **Go**: Version 1.24.0 or higher
- **PostgreSQL**: Version 14 or higher
- **Redis**: Version 7 or higher
- **Docker & Docker Compose**: Latest stable version (optional but recommended)
- **Git**: For version control

### Quick Start with Docker Compose

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
cd backend-go

# Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

### Manual Setup

#### 1. Install Dependencies

```bash
cd backend-go
go mod download
```

#### 2. Setup PostgreSQL

**Option A: Docker**
```bash
docker run --name synthos-postgres \
  -e POSTGRES_USER=synthos_user \
  -e POSTGRES_PASSWORD=synthos_password \
  -e POSTGRES_DB=synthos_db \
  -p 5432:5432 \
  -d postgres:14
```

**Option B: Native Installation**
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14
sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE synthos_db;
CREATE USER synthos_user WITH PASSWORD 'synthos_password';
GRANT ALL PRIVILEGES ON DATABASE synthos_db TO synthos_user;
\q
```

#### 3. Setup Redis

**Option A: Docker**
```bash
docker run --name synthos-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

**Option B: Native Installation**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
```

#### 4. Configure Environment Variables

Copy the example `.env` file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server Configuration
PORT=8080
HOST=0.0.0.0
ENVIRONMENT=development

# Database Configuration
DATABASE_URL=postgresql://synthos_user:synthos_password@localhost:5432/synthos_db?sslmode=disable
DATABASE_MAX_OPEN_CONNS=25
DATABASE_MAX_IDLE_CONNS=5
DATABASE_CONN_MAX_LIFETIME=300s
DATABASE_CONN_MAX_IDLE_TIME=60s

# Redis Configuration
REDIS_HOST=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRY_HOURS=24
API_KEY_SECRET=your-api-key-secret-change-in-production

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@synthos.ai
FROM_NAME=Synthos Platform

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Paddle Payment
PADDLE_VENDOR_ID=your_paddle_vendor_id
PADDLE_API_KEY=your_paddle_api_key
PADDLE_PUBLIC_KEY=your_paddle_public_key

# Storage
STORAGE_PROVIDER=local  # Options: local, gcs, s3
GCS_BUCKET=synthos-datasets
S3_BUCKET=synthos-datasets
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Google Cloud Vertex AI
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_API_KEY=your-vertex-api-key
VERTEX_LOCATION=us-central1

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

#### 5. Run Database Migrations

The application automatically creates tables on startup, but you can also run migrations manually:

```bash
go run main.go
# On first run, it will create all necessary tables
```

#### 6. Generate Test Data (Optional)

```bash
# Run the data seeder
go run scripts/seed.go
```

#### 7. Start the Application

```bash
# Development mode with auto-reload (using air)
go install github.com/cosmtrek/air@latest
air

# Or run directly
go run main.go
```

The API will be available at `http://localhost:8080`

#### 8. Verify Installation

```bash
# Check health endpoint
curl http://localhost:8080/health

# Check metrics
curl http://localhost:8080/metrics

# Check API version
curl http://localhost:8080/api/v1/health
```

---

## Production Environment

### Environment Variables for Production

Create a `.env.production` file with production values:

```env
# Server Configuration
PORT=8080
HOST=0.0.0.0
ENVIRONMENT=production

# Database (use managed database service)
DATABASE_URL=postgresql://user:password@db-host:5432/synthos_prod?sslmode=require
DATABASE_MAX_OPEN_CONNS=50
DATABASE_MAX_IDLE_CONNS=10

# Redis (use managed Redis service)
REDIS_HOST=redis-host:6379
REDIS_PASSWORD=strong-redis-password
REDIS_DB=0
REDIS_TLS=true

# Security (use strong, randomly generated secrets)
JWT_SECRET_KEY=<64-char-random-string>
API_KEY_SECRET=<64-char-random-string>

# Email (use transactional email service)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key

# Payment (production keys)
STRIPE_SECRET_KEY=sk_live_your_production_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook

# Storage (production buckets)
STORAGE_PROVIDER=gcs
GCS_BUCKET=synthos-prod-datasets

# Vertex AI (production project)
VERTEX_PROJECT_ID=your-prod-gcp-project
VERTEX_API_KEY=your-prod-vertex-key
VERTEX_LOCATION=us-central1

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Deployment Options

#### Option 1: Docker

```bash
# Build Docker image
docker build -t synthos-backend:latest .

# Run container
docker run -d \
  --name synthos-backend \
  -p 8080:8080 \
  --env-file .env.production \
  synthos-backend:latest
```

#### Option 2: Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT/synthos-backend
gcloud run deploy synthos-backend \
  --image gcr.io/YOUR_PROJECT/synthos-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "$(cat .env.production | tr '\n' ',' | sed 's/,$//')"
```

#### Option 3: Kubernetes

```bash
# Create ConfigMap from .env
kubectl create configmap synthos-config --from-env-file=.env.production

# Create Secret for sensitive values
kubectl create secret generic synthos-secrets \
  --from-literal=jwt-secret=$JWT_SECRET_KEY \
  --from-literal=database-url=$DATABASE_URL

# Deploy
kubectl apply -f k8s/deployment.yaml
```

#### Option 4: Traditional Server

```bash
# Build binary
go build -o synthos-backend main.go

# Run with systemd
sudo cp synthos-backend /usr/local/bin/
sudo cp deploy/synthos-backend.service /etc/systemd/system/
sudo systemctl enable synthos-backend
sudo systemctl start synthos-backend
```

---

## Database Setup

### Production Database (Cloud SQL / RDS)

#### Google Cloud SQL

```bash
# Create instance
gcloud sql instances create synthos-prod \
  --database-version=POSTGRES_14 \
  --cpu=2 \
  --memory=4GB \
  --region=us-central1 \
  --root-password=strong-password

# Create database
gcloud sql databases create synthos_db --instance=synthos-prod

# Create user
gcloud sql users create synthos_user \
  --instance=synthos-prod \
  --password=strong-user-password
```

#### AWS RDS

```bash
aws rds create-db-instance \
  --db-instance-identifier synthos-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.7 \
  --master-username synthos_admin \
  --master-user-password strong-password \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name synthos-subnet-group
```

### Connection Pooling

For production, use connection pooling:

```go
// Already configured in internal/db/database.go
db.SetMaxOpenConns(50)      // Adjust based on load
db.SetMaxIdleConns(10)      // Keep some idle connections
db.SetConnMaxLifetime(5 * time.Minute)
db.SetConnMaxIdleTime(1 * time.Minute)
```

---

## Redis Setup

### Production Redis (Cloud)

#### Google Cloud Memorystore

```bash
gcloud redis instances create synthos-redis \
  --size=5 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=standard
```

#### AWS ElastiCache

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id synthos-redis \
  --engine redis \
  --cache-node-type cache.t3.medium \
  --num-cache-nodes 1 \
  --engine-version 7.0
```

---

## Monitoring & Logging

### Prometheus Metrics

Add Prometheus to your monitoring stack:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'synthos-backend'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s
```

### Grafana Dashboards

Import the provided dashboard:

```bash
# Install Grafana
docker run -d -p 3000:3000 grafana/grafana

# Import dashboard
curl -X POST http://localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d @grafana/synthos-dashboard.json
```

### Log Aggregation

#### Using Google Cloud Logging

Logs are automatically sent to Cloud Logging when running on Google Cloud.

#### Using ELK Stack

```bash
# Configure filebeat to ship logs
filebeat -c filebeat.yml
```

---

## Security Checklist

### Pre-Production

- [ ] Change all default passwords and secrets
- [ ] Use strong, randomly generated JWT secrets (min 64 chars)
- [ ] Enable SSL/TLS for all connections
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Setup CORS properly
- [ ] Enable security headers
- [ ] Scan dependencies for vulnerabilities
- [ ] Run security audit (gosec)
- [ ] Setup backup strategy

### Runtime Security

```bash
# Run security scan
go install github.com/securego/gosec/v2/cmd/gosec@latest
gosec ./...

# Check for vulnerabilities
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

---

## Testing

### Run All Tests

```bash
# Unit tests
go test ./... -v

# With coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Integration tests
go test ./... -tags=integration -v

# Benchmarks
go test ./... -bench=. -benchmem
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run tests/load/basic-load-test.js
```

---

## Troubleshooting

### Common Issues

#### Database Connection Fails

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql postgresql://user:pass@localhost:5432/synthos_db

# Check logs
docker logs synthos-postgres
```

#### Redis Connection Fails

```bash
# Check if Redis is running
redis-cli ping

# Test connection
redis-cli -h localhost -p 6379
```

#### Port Already in Use

```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>
```

#### Environment Variables Not Loading

```bash
# Verify .env file exists
ls -la .env

# Check file permissions
chmod 600 .env

# Load manually
export $(cat .env | xargs)
go run main.go
```

---

## Support

For additional help:
- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@synthos.ai

---

**Last Updated:** October 3, 2025  
**Version:** 1.0.0
