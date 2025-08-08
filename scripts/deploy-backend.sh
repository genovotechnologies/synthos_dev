#!/bin/bash

# Deploy Synthos Backend to ECS
# Run this after creating secrets and updating the task definition

echo "🚀 Deploying Synthos Backend to ECS..."

# Configuration
CLUSTER_NAME="synthos-cluster"
SERVICE_NAME="synthos-backend-service"
TASK_DEFINITION="synthos-backend-task"
REGION="us-east-1"

# Register the task definition
echo "📋 Registering task definition..."
aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definition.json \
    --region $REGION

# Get the latest task definition revision
TASK_DEFINITION_REVISION=$(aws ecs describe-task-definition \
    --task-definition $TASK_DEFINITION \
    --region $REGION \
    --query 'taskDefinition.revision' \
    --output text)

echo "✅ Task definition registered: $TASK_DEFINITION:$TASK_DEFINITION_REVISION"

# Check if service exists
SERVICE_EXISTS=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION \
    --query 'services[0].status' \
    --output text 2>/dev/null)

if [ "$SERVICE_EXISTS" = "ACTIVE" ]; then
    echo "🔄 Updating existing service..."
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --task-definition $TASK_DEFINITION:$TASK_DEFINITION_REVISION \
        --region $REGION
else
    echo "🆕 Creating new service..."
    
    # Get subnet IDs from Terraform outputs
    SUBNET_IDS="subnet-071e27a4c7f8dd864,subnet-01733fa3b18c6e182"
    
    # Get security group IDs
    SECURITY_GROUPS="sg-04b76b8e3c4e78896"
    
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name $SERVICE_NAME \
        --task-definition $TASK_DEFINITION:$TASK_DEFINITION_REVISION \
        --desired-count 2 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUPS],assignPublicIp=DISABLED}" \
        --region $REGION
fi

echo "✅ Service deployment initiated!"
echo ""
echo "📊 Monitor deployment:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
echo ""
echo "🌐 Load Balancer DNS:"
echo "   aws elbv2 describe-load-balancers --names synthos-alb-production --region $REGION --query 'LoadBalancers[0].DNSName' --output text" 