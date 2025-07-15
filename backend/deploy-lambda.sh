#!/bin/bash

# =============================================================================
# AWS Lambda Deployment Script for Synthos Backend
# Packages and deploys FastAPI application to AWS Lambda
# =============================================================================

set -e  # Exit on any error

# Configuration
FUNCTION_NAME="synthos-backend"
RUNTIME="python3.8"
REGION="us-east-1"
TIMEOUT=300  # 5 minutes
MEMORY=1024  # 1GB
HANDLER="lambda_handler.handler"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Synthos Lambda Deployment${NC}"

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install and configure AWS CLI${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Run 'aws configure'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Create deployment directory
DEPLOY_DIR="lambda_deployment"
echo -e "${YELLOW}📦 Creating deployment package...${NC}"

# Clean up previous deployment
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy application code
echo "Copying application code..."
cp -r app/ $DEPLOY_DIR/
cp lambda_handler.py $DEPLOY_DIR/
cp .env $DEPLOY_DIR/ 2>/dev/null || echo "No .env file found"

# Install dependencies
echo "Installing dependencies..."
cd $DEPLOY_DIR
pip install -r ../requirements-lambda.txt --target .

# Remove unnecessary files to reduce package size
echo "Optimizing package size..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true

# Create ZIP package
echo "Creating ZIP package..."
zip -r ../synthos-lambda.zip . -q

cd ..

# Get package size
PACKAGE_SIZE=$(ls -lh synthos-lambda.zip | awk '{print $5}')
echo -e "${GREEN}📦 Package created: synthos-lambda.zip (${PACKAGE_SIZE})${NC}"

# Check if function exists
echo "Checking if Lambda function exists..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &> /dev/null; then
    echo -e "${YELLOW}🔄 Updating existing Lambda function...${NC}"
    
    # Update function code
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://synthos-lambda.zip \
        --region $REGION
    
    # Update function configuration
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --handler $HANDLER \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --environment Variables="{
            ENVIRONMENT=production,
            SECRET_KEY=IqFjQQ6X1BK8dsjQiWczLp1lDxB6OMHPNsUv7FogQTY,
            JWT_SECRET_KEY=vIDj23sNf6d00NPNjrJpVpB6G9blusc4RviZ6dDQGaE,
            DATABASE_URL=postgresql://genovo:TGU<5<v1o8-Z~::v:9\$V-UNwg~V0@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos,
            REDIS_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379,
            ANTHROPIC_API_KEY=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,
            OPENAI_API_KEY=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,
            PADDLE_PUBLIC_KEY=pdl_sdbx_apikey_01jzp3tskdwzpasb56pxfjy5wc_WjyxfT2Q32Jzp0hAQv4YQt_AKv,
            AWS_REGION=us-east-1,
            CORS_ORIGINS=https://synthos.dev,https://synthos-dev.vercel.app
        }" \
        --region $REGION
        
else
    echo -e "${YELLOW}✨ Creating new Lambda function...${NC}"
    
    # Create IAM role for Lambda (if it doesn't exist)
    ROLE_NAME="synthos-lambda-role"
    ROLE_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/$ROLE_NAME"
    
    if ! aws iam get-role --role-name $ROLE_NAME &> /dev/null; then
        echo "Creating IAM role..."
        aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "lambda.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }'
        
        # Attach basic execution policy
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        # Attach VPC execution policy (if using VPC)
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
        
        echo "Waiting for role to be ready..."
        sleep 10
    fi
    
    # Create Lambda function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://synthos-lambda.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --environment Variables="{
            ENVIRONMENT=production,
            SECRET_KEY=IqFjQQ6X1BK8dsjQiWczLp1lDxB6OMHPNsUv7FogQTY,
            JWT_SECRET_KEY=vIDj23sNf6d00NPNjrJpVpB6G9blusc4RviZ6dDQGaE,
            DATABASE_URL=postgresql://genovo:TGU<5<v1o8-Z~::v:9\$V-UNwg~V0@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos,
            REDIS_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379,
            ANTHROPIC_API_KEY=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,
            OPENAI_API_KEY=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,
            PADDLE_PUBLIC_KEY=pdl_sdbx_apikey_01jzp3tskdwzpasb56pxfjy5wc_WjyxfT2Q32Jzp0hAQv4YQt_AKv,
            AWS_REGION=us-east-1,
            CORS_ORIGINS=https://synthos.dev,https://synthos-dev.vercel.app
        }" \
        --region $REGION
fi

# Get function URL (if exists) or create one
echo "Setting up function URL..."
FUNCTION_URL=$(aws lambda get-function-url-config --function-name $FUNCTION_NAME --region $REGION --query 'FunctionUrl' --output text 2>/dev/null || echo "")

if [ "$FUNCTION_URL" == "" ]; then
    echo "Creating function URL..."
    FUNCTION_URL=$(aws lambda create-function-url-config \
        --function-name $FUNCTION_NAME \
        --cors '{
            "AllowCredentials": false,
            "AllowHeaders": ["*"],
            "AllowMethods": ["*"],
            "AllowOrigins": ["*"],
            "ExposeHeaders": ["*"],
            "MaxAge": 300
        }' \
        --auth-type NONE \
        --region $REGION \
        --query 'FunctionUrl' \
        --output text)
fi

# Clean up
echo "Cleaning up..."
rm -rf $DEPLOY_DIR
rm synthos-lambda.zip

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}📍 Function URL: ${FUNCTION_URL}${NC}"
echo -e "${YELLOW}💡 Test your API: curl ${FUNCTION_URL}${NC}"
echo -e "${YELLOW}📊 Monitor logs: aws logs tail /aws/lambda/${FUNCTION_NAME} --follow${NC}" 