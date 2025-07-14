# 🚀 AWS App Runner Deployment Guide

## Overview

AWS App Runner is the perfect Railway alternative on AWS - it's a fully managed service that makes it easy to deploy containerized applications without managing infrastructure. No EC2 instances required!

## ✅ Why AWS App Runner?

- **Similar to Railway**: Just push your code and it deploys
- **No EC2 Management**: Fully managed, serverless containers  
- **Auto Scaling**: Scales up/down based on traffic
- **Built-in Load Balancer**: Automatic HTTPS and load balancing
- **Cost Effective**: Pay only for what you use (starts ~$2/month)
- **Integrates with your AWS services**: RDS, ElastiCache, S3

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │───▶│  AWS App Runner │───▶│  AWS Services   │
│   (Frontend)    │    │  (Backend API)  │    │                 │
│                 │    │                 │    │ • RDS (PostgreSQL)
│ your-app.vercel │    │ synthos-api     │    │ • ElastiCache   │
│     .app        │    │ .region.awsappr │    │ • S3 Storage    │
└─────────────────┘    │ unner.com       │    │                 │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Deployment (Railway-Style)

### 1. Prerequisites
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI with your credentials
aws configure
# Enter your AWS Access Key ID, Secret Key, and region (us-east-1)
```

### 2. One-Command Deployment
```bash
# Make the deployment script executable
chmod +x deploy-aws-apprunner.sh

# Deploy (similar to railway up)
./deploy-aws-apprunner.sh
```

That's it! 🎉 Your backend will be deployed to AWS App Runner automatically.

## 📋 Manual Deployment Steps

If you prefer manual control, here's the step-by-step process:

### Step 1: Update Environment Variables
```bash
# Copy the AWS environment template
cp backend/aws-apprunner.env backend/.env

# Edit the file with your actual values:
# - RDS password
# - Your Vercel domain for CORS
# - Any missing API keys
nano backend/.env
```

### Step 2: Build and Push to ECR
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name synthos-backend --region us-east-1

# Build and push Docker image
cd backend
docker build -f Dockerfile.apprunner -t synthos-backend .
docker tag synthos-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/synthos-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/synthos-backend:latest
```

### Step 3: Create App Runner Service

**Option A: Using AWS Console (Recommended)**
1. Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner)
2. Click "Create an App Runner service"
3. Choose "Container registry" → "Amazon ECR"
4. Select your `synthos-backend` repository
5. Configure:
   - **Service name**: `synthos-api`
   - **Port**: `8000`
   - **CPU**: 1 vCPU
   - **Memory**: 2 GB
6. Add environment variables from `aws-apprunner.env`
7. Click "Create & deploy"

**Option B: Using AWS CLI**
```bash
# Use the provided apprunner.yaml configuration
aws apprunner create-service --cli-input-json file://backend/apprunner-config.json
```

## 🔧 Configuration Details

### Environment Variables Setup

In the AWS App Runner console, add these environment variables:

```bash
# Database
DATABASE_URL=postgresql://genovo:YOUR_PASSWORD@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos

# Redis
REDIS_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379

# Security
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret

# API Keys (your existing ones)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# CORS (update with your Vercel domain)
CORS_ORIGINS=https://your-app.vercel.app

# App Runner
PORT=8000
ENVIRONMENT=production
```

### Health Check Configuration
- **Path**: `/health`
- **Interval**: 20 seconds
- **Timeout**: 5 seconds
- **Healthy threshold**: 2
- **Unhealthy threshold**: 5

## 💰 Cost Optimization

### App Runner Pricing
- **Provisioned container**: ~$0.007/hour (~$5/month for basic setup)
- **Active requests**: $0.000009 per request
- **Build time**: $0.005 per build minute

### Cost-Saving Tips
1. **Start small**: 0.25 vCPU, 0.5 GB RAM for testing
2. **Scale up**: Only when you need more performance
3. **Monitor usage**: Use AWS CloudWatch to track costs

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit secrets to Git
- Use AWS Secrets Manager for sensitive data
- Rotate keys regularly

### 2. Network Security
- App Runner provides automatic HTTPS
- Uses AWS security groups
- Built-in DDoS protection

### 3. Access Control
- Use IAM roles for AWS service access
- Enable VPC connectivity for database access
- Monitor with CloudTrail

## 🚀 Frontend Integration

### Update Vercel Environment
```bash
# In your Vercel dashboard, set:
NEXT_PUBLIC_API_URL=https://your-service-id.us-east-1.awsapprunner.com
```

### Test the Connection
```bash
# Test your API endpoint
curl https://your-service-id.us-east-1.awsapprunner.com/health

# Check if your frontend can connect
# Your Vercel app should now connect to the AWS backend
```

## 📊 Monitoring & Debugging

### CloudWatch Logs
- App Runner automatically sends logs to CloudWatch
- View real-time logs in the AWS Console
- Set up alerts for errors

### Health Monitoring
```bash
# Check service status
aws apprunner describe-service --service-arn YOUR_SERVICE_ARN

# View deployment history
aws apprunner list-operations --service-arn YOUR_SERVICE_ARN
```

### Common Issues

#### 1. Container Won't Start
- Check CloudWatch logs for startup errors
- Verify PORT environment variable is set to 8000
- Ensure all required environment variables are set

#### 2. Database Connection Issues
- Verify RDS security group allows App Runner access
- Check DATABASE_URL format
- Ensure RDS is in the same region

#### 3. CORS Issues
- Update CORS_ORIGINS with your Vercel domain
- Check frontend is using HTTPS

## 🔄 CI/CD Pipeline

### Automatic Deployments
```bash
# Enable auto-deploy from ECR
aws apprunner update-service --service-arn YOUR_SERVICE_ARN \
  --source-configuration AutoDeploymentsEnabled=true
```

### GitHub Actions Integration
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS App Runner
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to App Runner
        run: ./deploy-aws-apprunner.sh
```

## 🎯 Performance Optimization

### Resource Allocation
- **Development**: 0.25 vCPU, 0.5 GB RAM
- **Production**: 1 vCPU, 2 GB RAM
- **High Traffic**: 2 vCPU, 4 GB RAM

### Auto Scaling
App Runner automatically scales based on:
- CPU utilization
- Memory usage  
- Request volume

## 🆚 App Runner vs Railway Comparison

| Feature | Railway | AWS App Runner |
|---------|---------|----------------|
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Pricing** | $5-20/month | $2-15/month |
| **Scaling** | Auto | Auto |
| **Integrations** | Limited | Full AWS ecosystem |
| **Free Tier** | Yes (limited) | No |
| **Global CDN** | Yes | With CloudFront |
| **Custom Domains** | Yes | Yes |

## 🎉 Deployment Checklist

- [ ] AWS CLI installed and configured
- [ ] RDS PostgreSQL database created
- [ ] ElastiCache Redis cluster created
- [ ] S3 bucket for file storage (optional)
- [ ] Environment variables configured
- [ ] Docker image built and pushed to ECR
- [ ] App Runner service created
- [ ] Health checks passing
- [ ] Frontend updated with new API URL
- [ ] CORS configured for Vercel domain
- [ ] SSL/HTTPS working

## 📞 Support & Troubleshooting

### AWS Support Resources
- [App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [AWS Support Forums](https://repost.aws/)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/)

### Quick Debugging
```bash
# Check service status
aws apprunner describe-service --service-arn YOUR_ARN

# View recent logs
aws logs tail /aws/apprunner/synthos-api --follow

# Test API health
curl https://YOUR_SERVICE_URL/health
```

Your backend is now running on AWS App Runner - just like Railway but with the full power of AWS! 🎉 