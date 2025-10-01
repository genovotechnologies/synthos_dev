#!/bin/bash

# Synthos Backend Go - Cloud Run Deployment Script
# =================================================

set -e  # Exit on error

# Configuration
PROJECT_ID="genovo-technologies001"
REGION="europe-north2"
SERVICE_NAME="synthos-backend-go"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Synthos Backend (Go) to Cloud Run"
echo "================================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Check if gcloud is authenticated
echo "✓ Checking gcloud authentication..."
gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null 2>&1 || {
    echo "❌ Not authenticated. Run: gcloud auth login"
    exit 1
}

# Set project
echo "✓ Setting project..."
gcloud config set project $PROJECT_ID

# Build and push Docker image
echo "📦 Building Docker image..."
docker build -t $IMAGE_NAME:latest .

echo "📤 Pushing to Container Registry..."
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=$IMAGE_NAME:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --set-env-vars="ENVIRONMENT=production,USE_CLOUD_SQL_CONNECTOR=true" \
  --set-secrets="Synthos_backend=/etc/secrets/Synthos_backend:latest" \
  --vpc-connector=connector-eu-n2 \
  --vpc-egress=all-traffic \
  --service-account="synthos-backend@${PROJECT_ID}.iam.gserviceaccount.com"

# Get service URL
echo ""
echo "✅ Deployment complete!"
echo ""
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "Testing health endpoint..."
curl -s "${SERVICE_URL}/health" | jq '.' || echo "Health check endpoint responded"
echo ""
echo "📝 Next steps:"
echo "  - Test API: ${SERVICE_URL}/api/v1/docs"
echo "  - View logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo "  - Monitor: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}"
