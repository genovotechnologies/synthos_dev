#!/bin/bash

# Update AWS Secrets Manager secrets for Synthos
# Run this script to update existing secrets with correct values

echo "Updating AWS Secrets Manager secrets..."

REGION="us-east-1"

# Update secrets with correct values
aws secretsmanager update-secret \
    --secret-id "synthos/database-url" \
    --secret-string "postgresql://genovo:genovo2025@18.235.10.180:5432/synthos?sslmode=require" \
    --region $REGION

aws secretsmanager update-secret \
    --secret-id "synthos/redis-url" \
    --secret-string "rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379/0" \
    --region $REGION

aws secretsmanager update-secret \
    --secret-id "synthos/cache-url" \
    --secret-string "rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379/0" \
    --region $REGION

aws secretsmanager update-secret \
    --secret-id "synthos/elasticache-endpoint" \
    --secret-string "synthos-33lvyw.serverless.use1.cache.amazonaws.com" \
    --region $REGION

aws secretsmanager update-secret \
    --secret-id "synthos/rds-endpoint" \
    --secret-string "18.235.10.180" \
    --region $REGION

aws secretsmanager update-secret \
    --secret-id "synthos/rds-username" \
    --secret-string "genovo" \
    --region $REGION

echo "Secrets updated successfully!" 