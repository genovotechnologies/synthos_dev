# AWS Lambda Deployment Guide for Synthos Backend

## 🚀 Lambda vs App Runner Comparison

### AWS Lambda (Recommended for your case)
✅ **Pros:**
- **No build issues** - Package dependencies locally
- **Cost effective** - Pay only for requests (~$0.0001 per request)
- **Auto-scaling** - Handles traffic spikes automatically
- **No server management** - Fully serverless
- **Fast deployment** - Upload ZIP file directly

❌ **Cons:**
- **Cold starts** (~1-3 seconds for first request)
- **15-minute timeout** limit per request
- **Stateless** - No persistent connections
- **Learning curve** for serverless patterns

### AWS App Runner (Your current issues)
❌ **Problems:**
- **Build failures** with heavy dependencies (PyTorch, etc.)
- **Build timeouts** during dependency installation
- **Higher cost** for low-traffic applications
- **Complex dependency management**

✅ **Pros:**
- **Persistent connections** to databases
- **Long-running processes** support
- **Traditional deployment** model

## 🛠️ Lambda Deployment Options

### Option 1: Manual Deployment (Quick Start)

1. **Install dependencies:**
```bash
cd backend
chmod +x deploy-lambda.sh
./deploy-lambda.sh
```

This script will:
- Package your application
- Install Lambda-optimized dependencies
- Create/update Lambda function
- Set up function URL
- Configure environment variables

### Option 2: Serverless Framework (Recommended)

1. **Install Serverless Framework:**
```bash
npm install -g serverless
npm install serverless-python-requirements
```

2. **Deploy:**
```bash
cd backend
serverless deploy
```

3. **Update code only:**
```bash
serverless deploy function -f api
```

## 📦 Key Lambda Optimizations Made

### 1. Lambda-Specific Handler (`lambda_handler.py`)
- Uses **Mangum** to adapt FastAPI for Lambda
- Handles ASGI/Lambda event conversion
- Proper error handling and CORS

### 2. Optimized Dependencies (`requirements-lambda.txt`)
- **Removed heavy packages:**
  - ❌ PyTorch (500MB+)
  - ❌ Transformers (200MB+)
  - ❌ Uvicorn (not needed in Lambda)
  - ❌ Celery (use SQS instead)

- **Added Lambda essentials:**
  - ✅ Mangum for ASGI adaptation
  - ✅ Core FastAPI dependencies
  - ✅ Database and AWS packages

### 3. Architecture Changes for Lambda

**Database Connections:**
```python
# Use connection pooling for Lambda
from sqlalchemy.pool import NullPool
engine = create_engine(DATABASE_URL, poolclass=NullPool)
```

**Background Tasks:**
```python
# Instead of Celery, use SQS + separate Lambda functions
import boto3
sqs = boto3.client('sqs')
sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(task_data))
```

## 🔧 Post-Deployment Configuration

### 1. Database Connection Optimization
For better Lambda performance, consider:
- **RDS Proxy** for connection pooling
- **Connection pooling** in SQLAlchemy
- **Shorter connection timeouts**

### 2. Cold Start Optimization
- **Provisioned concurrency** for critical endpoints
- **Smaller package size** (current: ~50MB vs 500MB+)
- **Lambda layers** for common dependencies

### 3. Background Tasks Architecture
Replace Celery with:
- **SQS** for task queues
- **Separate Lambda functions** for workers
- **EventBridge** for scheduled tasks

## 📊 Expected Performance

### Lambda Performance:
- **Cold start:** 1-3 seconds (first request)
- **Warm requests:** 50-200ms
- **Concurrent users:** 1000+ (auto-scaling)
- **Cost:** ~$0.10 per 1000 requests

### App Runner Issues:
- **Build time:** 15-30 minutes (often fails)
- **Cost:** $25+ per month (always running)
- **Deployment:** Complex with heavy dependencies

## 🚦 Deployment Commands

### Quick Deploy (Manual):
```bash
cd backend
./deploy-lambda.sh
```

### Serverless Framework:
```bash
# First deployment
serverless deploy

# Update code only
serverless deploy function -f api

# Remove deployment
serverless remove
```

### Monitor & Debug:
```bash
# View logs
aws logs tail /aws/lambda/synthos-backend --follow

# Test function
curl https://your-lambda-url.amazonaws.com/api/v1/health
```

## 🔄 Migration from App Runner

1. **Stop App Runner service**
2. **Deploy to Lambda** using either method above
3. **Update frontend API URL** to Lambda function URL
4. **Test all endpoints**
5. **Monitor performance and costs**

## 💡 Recommendations

**For Synthos Backend, Lambda is recommended because:**

1. **Build issues solved** - No more dependency timeouts
2. **Cost effective** - Pay per request vs always-on server
3. **Better scalability** - Auto-scaling to handle traffic spikes
4. **Easier deployment** - Simple ZIP upload vs complex builds
5. **Production ready** - Your core features don't need heavy ML packages

**When to consider App Runner again:**
- When you need persistent WebSocket connections
- When you add real-time ML inference features
- When you have consistently high traffic (Lambda might be more expensive)

## 🎯 Next Steps

1. **Deploy to Lambda** using the provided scripts
2. **Update frontend configuration** with new API URL
3. **Test all functionality**
4. **Monitor costs and performance**
5. **Optimize based on usage patterns**

Your backend will be much more stable and cost-effective on Lambda! 🚀 