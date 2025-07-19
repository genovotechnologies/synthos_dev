#!/bin/bash

# Create AWS Secrets Manager secrets for Synthos Backend
# Usage: ./scripts/create-secrets.sh

set -e

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="698777852781"

echo "🔐 Creating AWS Secrets Manager secrets..."

# Function to create secret if it doesn't exist
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    echo "Creating secret: $secret_name"
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id $secret_name --region $AWS_REGION &>/dev/null; then
        echo "✅ Secret $secret_name already exists"
        return 0
    fi
    
    # Create secret
    aws secretsmanager create-secret \
        --name $secret_name \
        --description "Synthos Backend - $secret_name" \
        --secret-string "$secret_value" \
        --region $AWS_REGION
    
    echo "✅ Created secret: $secret_name"
}

# Create secrets with placeholder values (you should update these with real values)
create_secret "synthos/database-url" "postgresql://username:password@your-rds-endpoint:5432/synthos"
create_secret "synthos/redis-url" "redis://your-elasticache-endpoint:6379/0"
create_secret "synthos/cache-url" "redis://your-elasticache-endpoint:6379/1"
create_secret "synthos/elasticache-endpoint" "your-elasticache-endpoint"
create_secret "synthos/rds-endpoint" "your-rds-endpoint"
create_secret "synthos/rds-username" "your-rds-username"
create_secret "synthos/secret-key" "your-super-secret-key-change-this-in-production"
create_secret "synthos/jwt-secret-key" "your-jwt-secret-key-change-this-in-production"
create_secret "synthos/paddle-vendor-id" "your-paddle-vendor-id"
create_secret "synthos/paddle-vendor-auth-code" "your-paddle-vendor-auth-code"
create_secret "synthos/paddle-public-key" "your-paddle-public-key"
create_secret "synthos/paddle-webhook-secret" "your-paddle-webhook-secret"
create_secret "synthos/anthropic-api-key" "your-anthropic-api-key"
create_secret "synthos/openai-api-key" "your-openai-api-key"
create_secret "synthos/stripe-secret-key" "your-stripe-secret-key"
create_secret "synthos/aws-access-key-id" "AKIA2FMTH3NWTGQXI6CA"
create_secret "synthos/aws-secret-access-key" "gaTzNVeSt3bFzhpuYNbUVX4IVE+Cp75UGE9Fzaez"

echo ""
echo "🎉 All secrets created successfully!"
echo ""
echo "⚠️  IMPORTANT: Update the secret values with your actual credentials:"
echo "   - Database connection string"
echo "   - Redis connection string"
echo "   - API keys (Anthropic, OpenAI, etc.)"
echo "   - Payment provider credentials"
echo ""
echo "📋 To update a secret:"
echo "   aws secretsmanager update-secret --secret-id synthos/secret-name --secret-string 'new-value' --region $AWS_REGION" 