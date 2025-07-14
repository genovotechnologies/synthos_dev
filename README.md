# 🚀 Synthos - Enterprise Synthetic Data Platform

> **The Best-in-Class AI-Powered Synthetic Data Platform for Enterprise**

Synthos is a cutting-edge enterprise platform that generates high-quality synthetic data using advanced AI (Claude/Anthropic and other Custom Models) with built-in differential privacy protection. Perfect for data scientists, developers, and enterprises who need realistic test data while maintaining strict privacy compliance.

![Synthos Platform](https://via.placeholder.com/1200x600/4F46E5/FFFFFF?text=Synthos+Enterprise+Platform)

## ✨ Key Features

### 🤖 **AI-Powered Generation**
- **Claude 3 Sonnet Integration**: Advanced AI understanding of data patterns
- **Autonomous Microservices**: Self-managing AI agents for schema detection and quality scoring
- **Real-time Generation**: On-demand synthetic data with live progress tracking

### 🔒 **Enterprise Security & Compliance**
- **Differential Privacy**: OpenDP integration for mathematical privacy guarantees
- **GDPR/CCPA Compliance**: Built-in data deletion workflows and audit logs 
- **SOC 2 Type II Ready**: Enterprise-grade security and compliance
- **End-to-End Encryption**: All data encrypted in transit and at rest

### 📊 **Advanced Data Processing**
- **Multiple Formats**: CSV, JSON, Parquet, Excel support
- **Automatic Schema Detection**: AI-powered column type detection
- **Quality Validation**: Real-time quality scoring with Great Expectations
- **Correlation Preservation**: Maintains statistical relationships

### 💰 **Monetization & Scaling**
- **Stripe Integration**: Usage-based billing with subscription tiers
- **Paddle Integration**: Usage-based billing with subscription tiers
- **Auto-scaling**: AWS CloudWatch-based infrastructure scaling
- **API-First**: RESTful API with comprehensive SDKs
- **Multi-tenant**: Enterprise-ready multi-tenancy

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Frontend (Vercel)"
        A[Next.js Dashboard] --> B[React Components]
        B --> C[Tailwind CSS]
    end
    
    subgraph "Backend (AWS)"
        D[FastAPI] --> E[Claude AI Agent]
        D --> F[Privacy Engine]
        D --> G[Celery Workers]
        E --> H[Anthropic API]
        F --> I[OpenDP]
    end
    
    subgraph "Data Layer"
        J[PostgreSQL] --> K[Redis Cache]
        K --> L[AWS S3]
    end
    
    subgraph "Infrastructure"
        M[Docker] --> N[AWS ECS]
        N --> O[CloudFront CDN]
        P[Stripe] --> Q[Monitoring]
    end
    
    A --> D
    D --> J
    G --> L
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm** 8+
- **Python** 3.10+
- **Docker** and **Docker Compose**
- **PostgreSQL** 15+
- **Redis** 7+

### 1. Clone and Setup

```bash
git clone https://github.com/tafolabi009/synthos.git
cd synthos

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit environment variables
nano backend/.env  # Add your API keys and configuration
```

### 2. Environment Configuration

**Required Environment Variables:**

```bash
# Backend (.env)
ANTHROPIC_API_KEY=your-anthropic-api-key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
DATABASE_URL=postgresql://synthos:password@localhost:5432/synthos_db
SECRET_KEY=your-super-secret-key-change-in-production

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
```

### 3. Development Setup

```bash
# Start all services with Docker Compose
docker-compose up -d

# Or run services individually:

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Database migrations
cd backend
alembic upgrade head
```

### 4. Production Deployment

#### 🌟 AWS App Runner (Recommended - Railway Alternative)

Deploy your backend with **zero infrastructure management**:

```bash
# One-command deployment (just like Railway!)
./deploy-aws-apprunner.sh
```

**Perfect for Railway users!** AWS App Runner provides:
- ✅ **No EC2 instances** to manage
- ✅ **Auto-scaling** based on traffic  
- ✅ **Built-in load balancer** and HTTPS
- ✅ **Cost-effective** (~$5-10/month)
- ✅ **Seamless integration** with your AWS services (RDS, ElastiCache)

📖 **[Complete AWS App Runner Guide](AWS_DEPLOYMENT_QUICKSTART.md)**

#### Alternative Deployment Options

```bash
# Railway (classic)
railway login && railway up

# Docker containerized deployment
docker-compose -f docker-compose.prod.yml up -d

# AWS CDK (advanced infrastructure)
cd infrastructure && npm install && cdk deploy --all
```

## 📖 API Documentation

### Authentication
```bash
# Register new user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass123","full_name":"John Doe"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user@example.com","password":"securepass123"}'
```

### Data Generation 
```bash
# Upload dataset
curl -X POST http://localhost:8000/api/v1/datasets/upload \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@your-data.csv"

# Generate synthetic data
curl -X POST http://localhost:8000/api/v1/generation/generate \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": 1,
    "rows": 1000,
    "privacy_level": "high",
    "epsilon": 1.0,
    "delta": 1e-5
  }'
```

## 🔧 Configuration

### Subscription Tiers

| Tier | Monthly Limit | Features | Price |
|------|---------------|----------|--------|    
| **Free** | 10,000 rows | Basic generation, Watermarked data | $0 |
| **Starter** | 50,000 rows| Advanced generation, No watermarks | $99/month |
| **Professional** | 1M rows | Advanced generation, No watermarks, API access | $599/month |
| **Growth** | 5M rows | Advanced generation, No watermarks, API access, Custom models | $1299/month |
| **Enterprise** | Unlimited | Custom models, Dedicated support, On-premise | Contact Sales |

### Privacy Settings

```python
# High Privacy (Recommended for PII)
PRIVACY_BUDGET_EPSILON = 0.1
PRIVACY_BUDGET_DELTA = 1e-6

# Medium Privacy (Balanced)
PRIVACY_BUDGET_EPSILON = 1.0
PRIVACY_BUDGET_DELTA = 1e-5

# Low Privacy (Maximum Utility)
PRIVACY_BUDGET_EPSILON = 10.0
PRIVACY_BUDGET_DELTA = 1e-4
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app --cov-report=html
```

### Frontend Tests
```bash
cd frontend
npm test -- --coverage
npm run e2e  # Playwright end-to-end tests
```

### Load Testing
```bash
# Install k6
brew install k6

# Run load tests
k6 run tests/load/generation-test.js
```

## 📊 Monitoring & Observability

### Built-in Monitoring
- **Prometheus Metrics**: `/metrics` endpoint
- **Health Checks**: `/health` endpoint
- **Structured Logging**: JSON logs with correlation IDs
- **Audit Trails**: GDPR-compliant audit logging

### Grafana Dashboards
Access Grafana at `http://localhost:3001` (admin/admin123)

**Key Metrics:**
- Request latency and throughput
- Generation job success rates
- Privacy budget consumption
- User activity and billing metrics

### Alerts
```bash
# CPU usage > 80%
# Memory usage > 85%
# Generation job failure rate > 5%
# API error rate > 1%
```

## 🔐 Security

### Authentication & Authorization
- **JWT-based authentication** with refresh tokens
- **Role-based access control** (User, Admin, Enterprise)
- **API rate limiting** and DDoS protection
- **Multi-factor authentication** support

### Data Protection
- **AES-256 encryption** for data at rest
- **TLS 1.3** for data in transit
- **Regular security audits** and penetration testing
- **Vulnerability scanning** with automated patching

### Compliance
- **GDPR Article 17** (Right to be forgotten)
- **CCPA compliance** with automated data deletion
- **SOC 2 Type II** controls and audit logs
- **ISO 27001** security management

## 🌍 Deployment Options

### 1. AWS (Recommended)
```bash
# Using AWS CDK
cd infrastructure/aws
cdk deploy --all

# Services deployed:
# - ECS Fargate clusters
# - RDS PostgreSQL
# - ElastiCache Redis
# - S3 buckets
# - CloudFront CDN
# - Application Load Balancer
```

### 2. Google Cloud Platform
```bash
cd infrastructure/gcp
terraform init
terraform apply

# Services deployed:
# - Google Kubernetes Engine
# - Cloud SQL
# - Memorystore Redis
# - Cloud Storage
# - Cloud CDN
```

### 3. Self-Hosted
```bash
# Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.prod.yml synthos

# Kubernetes
kubectl apply -f k8s/
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Synthos CI/CD
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Backend Tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest
      - name: Run Frontend Tests
        run: |
          cd frontend
          npm ci
          npm test
  
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS
        run: cdk deploy --all
```

## 📈 Performance Optimization

### Backend Optimizations
- **Connection pooling** (20-30 connections)
- **Redis caching** with 1-hour TTL
- **Async processing** with Celery workers
- **Database indexing** on frequently queried columns

### Frontend Optimizations
- **Next.js SSR/SSG** for optimal performance
- **Image optimization** with WebP/AVIF formats
- **Code splitting** and lazy loading
- **CDN distribution** via CloudFront

### Expected Performance
- **API Response Time**: < 200ms (95th percentile)
- **Generation Throughput**: 10,000 rows/minute
- **Concurrent Users**: 1,000+ supported
- **Uptime**: 99.9% SLA


### Development Setup
```bash
# Install pre-commit hooks
pre-commit install

# Run code formatting
cd backend && black . && isort .
cd frontend && npm run format

# Run linting
cd backend && flake8 app/
cd frontend && npm run lint
```

## 📞 Support

### Community Support
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Q&A and community support
- **Discord**: Real-time community chat

### Enterprise Support
- **Dedicated Support**: 24/7 enterprise support channel
- **Custom Integration**: Professional services available
- **Training**: On-site and remote training sessions

### Contact
- **Sales**: sales@synthos.ai
- **Support**: support@synthos.ai
- **Security**: security@synthos.ai

## 📄 License
*
**Check the license file for the terms and sevices concerning distibution and usage of this intellectual property.**

---

## 🎯 Roadmap

### Q4 2025
- [ ] **Advanced AI Models**: GPT-4 and custom model support
- [ ] **Real-time Streaming**: Live data generation API
- [ ] **Advanced Privacy**: Federated learning integration

### Q1 2026
- [ ] **Multi-cloud Support**: Azure and GCP deployment
- [ ] **SDK Expansion**: Python, R, and Java SDKs
- [ ] **Advanced Analytics**: ML-powered quality insights

### Q2 2026
- [ ] **Enterprise SSO**: SAML and OAuth integration
- [ ] **Custom Models**: Train your own generation models
- [ ] **Advanced Compliance**: HIPAA and PCI DSS support

---

**Made with ❤️ by the Synthos Team**

*Transforming the way enterprises handle sensitive data with AI-powered synthetic data generation.* 
