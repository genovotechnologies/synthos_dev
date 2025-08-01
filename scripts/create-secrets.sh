#!/bin/bash

# Create AWS Secrets Manager secrets for Synthos
# Run this script after getting the endpoints from Terraform Cloud

echo "Creating AWS Secrets Manager secrets..."

# Get the account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

# Create secrets (replace with actual values from Terraform Cloud)
aws secretsmanager create-secret \
    --name "synthos/database-url" \
    --description "Synthos database URL" \
    --secret-string "postgresql://synthos:synthos2025@[RDS_ENDPOINT]:5432/synthos" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/redis-url" \
    --description "Synthos Redis URL" \
    --secret-string "redis://[REDIS_ENDPOINT]:6379/0" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/cache-url" \
    --description "Synthos cache URL" \
    --secret-string "redis://[REDIS_ENDPOINT]:6379/0" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/elasticache-endpoint" \
    --description "Synthos ElastiCache endpoint" \
    --secret-string "[REDIS_ENDPOINT]" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/rds-endpoint" \
    --description "Synthos RDS endpoint" \
    --secret-string "[RDS_ENDPOINT]" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/rds-username" \
    --description "Synthos RDS username" \
    --secret-string "synthos" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/secret-key" \
    --description "Synthos secret key" \
    --secret-string "IqFjQQ6X1BK8dsjQiWczLp1lDxB6OMHPNsUv7FogQTY" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/jwt-secret-key" \
    --description "Synthos JWT secret key" \
    --secret-string "vIDj23sNf6d00NPNjrJpVpB6G9blusc4RviZ6dDQGaE" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/paddle-vendor-id" \
    --description "Paddle vendor ID" \
    --secret-string "your-paddle-vendor-id" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/paddle-vendor-auth-code" \
    --description "Paddle vendor auth code" \
    --secret-string "your-vendor-auth-code" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/paddle-public-key" \
    --description "Paddle public key" \
    --secret-string "pdl_sdbx_apikey_01jzp3tskdwzpasb56pxfjy5wc_WjyxfT2Q32Jzp0hAQv4YQt_AKv" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/paddle-webhook-secret" \
    --description "Paddle webhook secret" \
    --secret-string "your-webhook-secret" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/anthropic-api-key" \
    --description "Anthropic API key" \
    --secret-string "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" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/openai-api-key" \
    --description "OpenAI API key" \
    --secret-string "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" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/stripe-secret-key" \
    --description "Stripe secret key" \
    --secret-string "your_stripe_secret_key_here" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/aws-access-key-id" \
    --description "AWS access key ID" \
    --secret-string "AKIA2FMTH3NWTGQXI6CA" \
    --region $REGION

aws secretsmanager create-secret \
    --name "synthos/aws-secret-access-key" \
    --description "AWS secret access key" \
    --secret-string "gaTzNVeSt3bFzhpuYNbUVX4IVE+Cp75UGE9Fzaez" \
    --region $REGION

echo "Secrets created successfully!"
echo "Remember to update the placeholders [RDS_ENDPOINT] and [REDIS_ENDPOINT] with actual values from Terraform Cloud" 