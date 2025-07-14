#!/bin/bash

# Synthos Railway Deployment Script
# This script helps deploy Synthos to Railway quickly

set -e

echo "🚂 Deploying Synthos to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "Please login to Railway..."
railway login

# Create new project
echo "Creating new Railway project..."
railway new synthos-mvp

# Deploy backend
echo "Deploying backend..."
cd backend
railway up

# Add PostgreSQL service
echo "Adding PostgreSQL service..."
railway add postgresql

# Add Redis service
echo "Adding Redis service..."
railway add redis

# Set environment variables
echo "Setting environment variables..."
railway variables set ENVIRONMENT=production
railway variables set DEBUG=false
railway variables set SECRET_KEY=IqFjQQ6X1BK8dsjQiWczLp1lDxB6OMHPNsUv7FogQTY
railway variables set JWT_SECRET_KEY=vIDj23sNf6d00NPNjrJpVpB6G9blusc4RviZ6dDQGaE
railway variables set ANTHROPIC_API_KEY=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
railway variables set OPENAI_API_KEY=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
railway variables set PADDLE_PUBLIC_KEY=pdl_sdbx_apikey_01jzp3tskdwzpasb56pxfjy5wc_WjyxfT2Q32Jzp0hAQv4YQt_AKv
railway variables set PRIMARY_PAYMENT_PROVIDER=paddle
railway variables set CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
railway variables set API_V1_STR=/api/v1
railway variables set FREE_TIER_MONTHLY_LIMIT=10000
railway variables set MAX_SYNTHETIC_ROWS=5000000

# Deploy again with environment variables
echo "Redeploying with environment variables..."
railway up

# Get the deployment URL
echo "Getting deployment URL..."
RAILWAY_URL=$(railway url)

echo "🎉 Backend deployed successfully!"
echo "🔗 Backend URL: $RAILWAY_URL"
echo "📖 API Docs: $RAILWAY_URL/docs"

cd ..

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Deploy frontend to Vercel"
echo "2. Update CORS_ORIGINS in Railway with your Vercel URL"
echo "3. Test the API endpoints"
echo "4. Set up monitoring"
echo ""
echo "Backend URL: $RAILWAY_URL"
echo "Frontend: Deploy to Vercel with NEXT_PUBLIC_API_URL=$RAILWAY_URL" 