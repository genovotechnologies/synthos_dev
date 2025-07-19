#!/bin/bash
# Usage: ./scripts/push-to-ecr.sh <aws_account_id> <region> <repo_name>
set -e

AWS_ACCOUNT_ID=$1
REGION=$2
REPO_NAME=$3

if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$REGION" ] || [ -z "$REPO_NAME" ]; then
  echo "Usage: $0 698777852781 us-east-1 synthos-backend"
  exit 1
fi

# Authenticate Docker to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Create ECR repo if it doesn't exist
aws ecr describe-repositories --repository-names $REPO_NAME --region $REGION || \
  aws ecr create-repository --repository-name $REPO_NAME --region $REGION

# Build and push

docker build -t $REPO_NAME ./backend
docker tag $REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

echo "Image pushed: $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest" 