# GitHub to AWS App Runner Deployment Guide

## Overview
Deploy your Synthos backend to AWS App Runner using GitHub integration. App Runner will provide a free default domain that you can use with your Vercel frontend.

## Step 1: AWS App Runner Setup

### 1.1 Create App Runner Service
1. Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
2. Click **"Create service"**
3. Choose **"Source code repository"**

### 1.2 Connect GitHub Repository
1. Select **"GitHub"** as source
2. Click **"Add new"** to connect your GitHub account
3. Select your repository: `your-username/synthos`
4. Choose branch: `main`

### 1.3 Configure Build Settings
1. **Source directory**: `backend`
2. **Build configuration**: Automatic (will detect `apprunner.yaml`)
3. Or manually set:
   - **Runtime**: Python 3
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Step 2: Environment Variables

In the App Runner console, add these environment variables from your `backend/backend.env`:

```env
# Core Settings
DEBUG=false
ENVIRONMENT=production
SECRET_KEY=your-secret-key
CORS_ORIGINS=["https://synthos.dev","https://synthos-dev.vercel.app"]

# Database - AWS RDS
DATABASE_URL=postgresql://genovo:YOUR_RDS_PASSWORD@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos

# Redis - AWS ElastiCache  
REDIS_URL=redis://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379

# API Keys
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Payment
PADDLE_API_KEY=your-paddle-key
PADDLE_WEBHOOK_SECRET=your-webhook-secret
```

## Step 3: Deploy

1. Click **"Create and deploy"**
2. Wait for deployment (5-10 minutes)
3. App Runner will provide your service URL

## Step 4: Your Backend Domain

After deployment, you'll get a URL like:
```
https://synthos-backend.us-east-1.awsapprunner.com
```

**This is your backend API URL!** ✅

## Step 5: Update Vercel Frontend

### 5.1 Update Environment Variables
In your Vercel dashboard, update:
```env
NEXT_PUBLIC_API_URL=https://your-service-name.us-east-1.awsapprunner.com
```

### 5.2 Add Backend Domain to CORS
Update your backend `CORS_ORIGINS` to include your App Runner domain:
```env
CORS_ORIGINS=["https://synthos.dev","https://synthos-dev.vercel.app","https://your-apprunner-domain.awsapprunner.com"]
```

## Step 6: Custom Domain (Optional)

If you want a custom domain later:

1. **Purchase domain** (Route 53, Namecheap, etc.)
2. **Add custom domain** in App Runner console
3. **Update DNS** with provided CNAME record
4. **Update Vercel** environment variables with new domain

## Common Issues

### Build Fails
- Ensure `apprunner.yaml` is in `/backend` directory
- Check Python version compatibility
- Verify `requirements.txt` is complete

### Connection Issues
- Verify RDS security groups allow App Runner access
- Check ElastiCache VPC configuration
- Ensure environment variables are set correctly

### CORS Errors
- Add App Runner domain to `CORS_ORIGINS`
- Redeploy backend after CORS changes

## Benefits of This Approach

✅ **Free default domain** - No need to purchase domain immediately  
✅ **Auto-scaling** - Handles traffic spikes automatically  
✅ **Zero server management** - Fully managed service  
✅ **GitHub integration** - Auto-deploys on code changes  
✅ **SSL included** - HTTPS by default  
✅ **Cost-effective** - Pay only for usage  

## Next Steps

1. Deploy backend to App Runner
2. Get your `*.awsapprunner.com` domain
3. Update Vercel frontend with backend URL
4. Test the integration
5. Optionally purchase custom domain later

Your app will be fully functional with the free App Runner domain! 