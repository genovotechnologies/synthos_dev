# Synthos Docker Setup - MVP Mode

This guide helps you run Synthos in Docker with minimal configuration for MVP testing.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Anthropic API key (required for AI generation)
- OpenAI API key (optional)

### 1. Set API Keys

**Option A: Environment Variables**
```bash
# Linux/Mac
export ANTHROPIC_API_KEY="your-anthropic-key-here"
export OPENAI_API_KEY="your-openai-key-here"  # optional

# Windows
set ANTHROPIC_API_KEY=your-anthropic-key-here
set OPENAI_API_KEY=your-openai-key-here
```

**Option B: Create .env file**
```bash
cp .env.docker .env
# Edit .env with your API keys
```

### 2. Run the Application

**Linux/Mac:**
```bash
chmod +x run-docker.sh
./run-docker.sh
```

**Windows:**
```cmd
run-docker.bat
```

**Manual:**
```bash
docker-compose -f docker-compose.mvp.yml up -d
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/health

## MVP Mode Features

When `MVP_MODE=true`, the following features are **DISABLED**:

- ❌ Advanced security scanning
- ❌ Rate limiting
- ❌ Prometheus metrics
- ❌ Sentry error tracking
- ❌ Multiple payment providers
- ❌ Advanced AI features
- ❌ Watermarks and audit logs
- ❌ Celery background tasks
- ❌ Monitoring (Grafana/Prometheus)
- ❌ Load balancer (Nginx)

**ENABLED** features:
- ✅ Basic authentication
- ✅ Database (PostgreSQL)
- ✅ Caching (Redis)
- ✅ AI generation (Anthropic/OpenAI)
- ✅ File uploads
- ✅ Health checks

## Troubleshooting

### App Not Starting

1. **Check Docker logs:**
   ```bash
   docker-compose -f docker-compose.mvp.yml logs backend
   ```

2. **Database connection issues:**
   ```bash
   # Check if PostgreSQL is running
   docker-compose -f docker-compose.mvp.yml ps postgres
   
   # Check PostgreSQL logs
   docker-compose -f docker-compose.mvp.yml logs postgres
   ```

3. **Redis connection issues:**
   ```bash
   # Check if Redis is running
   docker-compose -f docker-compose.mvp.yml ps redis
   
   # Test Redis connection
   docker-compose -f docker-compose.mvp.yml exec redis redis-cli ping
   ```

### Common Issues

1. **Port conflicts:**
   - PostgreSQL (5432), Redis (6379), Backend (8000), Frontend (3000)
   - Stop conflicting services or change ports in docker-compose.mvp.yml

2. **API keys not working:**
   - Verify keys are correctly set in environment or .env.docker
   - Check backend logs for authentication errors

3. **Frontend can't connect to backend:**
   - Ensure backend is healthy: `curl http://localhost:8000/health`
   - Check CORS settings in .env.docker

## Enable Advanced Features

To enable specific features, modify `.env.docker`:

```bash
# Enable monitoring
ENABLE_PROMETHEUS=true
ENABLE_SENTRY=true

# Enable rate limiting
ENABLE_RATE_LIMITING=true

# Enable payment processing
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

Then uncomment the corresponding services in `docker-compose.yml`.

## Development

### Enable Development Tools

```bash
# Start with PgAdmin
docker-compose -f docker-compose.mvp.yml --profile dev-tools up -d

# Access PgAdmin at http://localhost:5050
# Email: admin@synthos.local
# Password: admin123
```

### Watch Logs

```bash
# All services
docker-compose -f docker-compose.mvp.yml logs -f

# Specific service
docker-compose -f docker-compose.mvp.yml logs -f backend
```

### Rebuild After Changes

```bash
# Rebuild and restart
docker-compose -f docker-compose.mvp.yml down
docker-compose -f docker-compose.mvp.yml build
docker-compose -f docker-compose.mvp.yml up -d
```

## Clean Up

```bash
# Stop services
docker-compose -f docker-compose.mvp.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.mvp.yml down -v

# Remove images
docker-compose -f docker-compose.mvp.yml down --rmi all
```

## Next Steps

1. **Production Deployment**: Use the full `docker-compose.yml` with proper secrets
2. **Enable Features**: Gradually enable advanced features as needed
3. **Scale**: Add Celery workers, monitoring, and load balancing
4. **Security**: Enable HTTPS, rate limiting, and security scanning
