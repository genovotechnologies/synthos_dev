# Synthos Backend Go - Cloud Run Deployment Script (PowerShell)
# ================================================================

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "genovo-technologies001"
$REGION = "europe-north2"
$SERVICE_NAME = "synthos-backend-go"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "🚀 Deploying Synthos Backend (Go) to Cloud Run" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID"
Write-Host "Region: $REGION"
Write-Host "Service: $SERVICE_NAME"
Write-Host ""

# Check if gcloud is authenticated
Write-Host "✓ Checking gcloud authentication..." -ForegroundColor Green
try {
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $account) {
        throw "Not authenticated"
    }
} catch {
    Write-Host "❌ Not authenticated. Run: gcloud auth login" -ForegroundColor Red
    exit 1
}

# Set project
Write-Host "✓ Setting project..." -ForegroundColor Green
gcloud config set project $PROJECT_ID

# Build and push Docker image
Write-Host "📦 Building Docker image..." -ForegroundColor Yellow
docker build -t "${IMAGE_NAME}:latest" .

Write-Host "📤 Pushing to Container Registry..." -ForegroundColor Yellow
docker push "${IMAGE_NAME}:latest"

# Deploy to Cloud Run
Write-Host "🚢 Deploying to Cloud Run..." -ForegroundColor Magenta
gcloud run deploy $SERVICE_NAME `
  --image="${IMAGE_NAME}:latest" `
  --region=$REGION `
  --platform=managed `
  --allow-unauthenticated `
  --port=8080 `
  --memory=2Gi `
  --cpu=2 `
  --min-instances=0 `
  --max-instances=10 `
  --timeout=300 `
  --set-env-vars="ENVIRONMENT=production,USE_CLOUD_SQL_CONNECTOR=true" `
  --set-secrets="Synthos_backend=/etc/secrets/Synthos_backend:latest" `
  --vpc-connector=connector-eu-n2 `
  --vpc-egress=all-traffic `
  --service-account="synthos-backend@${PROJECT_ID}.iam.gserviceaccount.com"

# Get service URL
Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
Write-Host "🌐 Service URL: $SERVICE_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SERVICE_URL/health" -UseBasicParsing
    Write-Host $response.Content
} catch {
    Write-Host "Health check endpoint responded with: $($_.Exception.Message)"
}
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "  - Test API: $SERVICE_URL/api/v1/docs"
Write-Host "  - View logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
Write-Host "  - Monitor: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
