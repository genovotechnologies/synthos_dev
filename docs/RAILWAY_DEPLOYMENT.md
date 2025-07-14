# 🚂 Railway Deployment Guide for Synthos

Get your Synthos MVP deployed to Railway in minutes! This guide walks you through deploying the complete stack.

## 📋 Prerequisites

- **Railway Account**: Sign up at [railway.app](https://railway.app)
- **GitHub Repository**: Your code pushed to GitHub
- **API Keys**: 
  - Anthropic API Key: `sk-ant-api03-aFywJ...` ✅
  - OpenAI API Key: `sk-proj-wStAdCsm...` ✅
  - Paddle API Key: `pdl_sdbx_apikey_...` ✅

## 🚀 Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login to Railway
railway login
```

### 1.2 Deploy Backend
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `synthos` repository
5. Railway will auto-detect the Dockerfile in `/backend`

### 1.3 Add Database & Cache Services
1. In your Railway project, click "New Service"
2. Add **PostgreSQL** service
3. Add **Redis** service
4. Railway will auto-generate connection URLs

### 1.4 Configure Environment Variables
In your Railway backend service, add these environment variables:

```env
# Application
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=IqFjQQ6X1BK8dsjQiWczLp1lDxB6OMHPNsUv7FogQTY
JWT_SECRET_KEY=vIDj23sNf6d00NPNjrJpVpB6G9blusc4RviZ6dDQGaE

# Database & Cache (Railway auto-provides these)
# DATABASE_URL=postgresql://... (auto-generated)
# REDIS_URL=redis://... (auto-generated)

# AI API Keys
ANTHROPIC_API_KEY=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
OPENAI_API_KEY=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

# Paddle Payment
PADDLE_PUBLIC_KEY=pdl_sdbx_apikey_01jzp3tskdwzpasb56pxfjy5wc_WjyxfT2Q32Jzp0hAQv4YQt_AKv
PADDLE_ENVIRONMENT=production
PRIMARY_PAYMENT_PROVIDER=paddle

# CORS (update with your Vercel domain)
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
ALLOWED_HOSTS=*

# API Configuration
API_V1_STR=/api/v1
FREE_TIER_MONTHLY_LIMIT=10000
MAX_SYNTHETIC_ROWS=5000000
```

### 1.5 Deploy
1. Railway will automatically build and deploy your backend
2. You'll get a URL like: `https://your-backend.railway.app`
3. Test the API: `https://your-backend.railway.app/health`

## 🎨 Step 2: Deploy Frontend to Vercel

### 2.1 Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `frontend` folder as root directory

### 2.2 Configure Environment Variables
In Vercel, add these environment variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_ENVIRONMENT=production

# Stripe (for backup payments)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

# Paddle (primary payment)
NEXT_PUBLIC_PADDLE_VENDOR_ID=your-paddle-vendor-id
NEXT_PUBLIC_PADDLE_ENVIRONMENT=production
```

### 2.3 Deploy
1. Vercel will automatically build and deploy
2. You'll get a URL like: `https://your-app.vercel.app`
3. Update the CORS_ORIGINS in Railway with your Vercel URL

## 🔧 Step 3: Configure Domain Connection

### 3.1 Update Backend CORS
In Railway backend, update the CORS_ORIGINS environment variable:
```env
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

### 3.2 Update Frontend API URL
In Vercel, update the API URL:
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## 🔄 Step 4: Add Celery Worker (Optional)

For background task processing:

1. In Railway, add a new service
2. Use the same GitHub repo
3. Set custom start command: `bash railway-celery.sh`
4. Add the same environment variables as backend

## 📊 Step 5: Monitor & Scale

### Railway Monitoring
- Check logs in Railway dashboard
- Monitor resource usage
- Set up alerts for errors

### Vercel Monitoring  
- Check deployment logs
- Monitor performance metrics
- Set up error tracking

## 🎯 Final URLs

After deployment, you'll have:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-backend.railway.app`
- **API Docs**: `https://your-backend.railway.app/docs`

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Issues**
```bash
# Check Railway logs
railway logs

# Verify DATABASE_URL is set
railway variables
```

**2. Redis Connection Issues**
```bash
# Verify REDIS_URL is set
# Check Redis service is running in Railway
```

**3. CORS Issues**
```bash
# Update CORS_ORIGINS in Railway
# Clear browser cache
# Check network tab in browser
```

**4. API Key Issues**
```bash
# Verify API keys are set in Railway
# Check API key format and quotas
```

## 💡 Production Optimizations

### Railway
- Enable automatic deployments
- Set up health checks
- Configure resource limits
- Add monitoring alerts

### Vercel
- Enable analytics
- Set up custom domains
- Configure preview deployments
- Add performance monitoring

## 🎉 You're Live!

Your Synthos MVP is now deployed and ready for users! 

**Next Steps:**
1. Test all functionality
2. Set up monitoring
3. Configure custom domains
4. Add error tracking
5. Scale as needed

**Free Tier Limits:**
- Railway: $5 credit (enough for MVP)
- Vercel: 100GB bandwidth
- PostgreSQL: 1GB database
- Redis: 100MB cache

**Scaling Path:**
- Railway Pro: $20/month
- Vercel Pro: $20/month
- Total: $40/month vs $200+ on AWS

Ready to get those first users! 🚀 