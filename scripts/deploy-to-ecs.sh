#!/bin/bash

# Deploy Synthos Backend to AWS ECS Fargate
# Usage: ./scripts/deploy-to-ecs.sh

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="698777852781"
CLUSTER_NAME="synthos-cluster"
SERVICE_NAME="synthos-backend-service"
TASK_DEFINITION_FILE="infrastructure/aws/ecs-task-definition.json"
ECR_REPOSITORY="synthos-backend"

echo "🚀 Deploying Synthos Backend to AWS ECS Fargate..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured and authenticated"

# Create ECS Cluster if it doesn't exist
echo "📦 Creating ECS cluster..."
aws ecs create-cluster \
    --cluster-name $CLUSTER_NAME \
    --region $AWS_REGION \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
    --tags key=Project,value=Synthos key=Environment,value=Production

echo "✅ ECS cluster created/verified"

# Create IAM roles for ECS
echo "🔐 Creating IAM roles..."

# Task Execution Role (for pulling images and writing logs)
EXECUTION_ROLE_NAME="ecsTaskExecutionRole"
aws iam create-role \
    --role-name $EXECUTION_ROLE_NAME \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ecs-tasks.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }' || echo "Role already exists"

aws iam attach-role-policy \
    --role-name $EXECUTION_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Task Role (for application permissions)
TASK_ROLE_NAME="ecsTaskRole"
aws iam create-role \
    --role-name $TASK_ROLE_NAME \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ecs-tasks.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }' || echo "Role already exists"

# Attach policies for S3, RDS, ElastiCache, Secrets Manager
aws iam attach-role-policy \
    --role-name $TASK_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
    --role-name $TASK_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

echo "✅ IAM roles created/verified"

# Get role ARNs
EXECUTION_ROLE_ARN=$(aws iam get-role --role-name $EXECUTION_ROLE_NAME --query 'Role.Arn' --output text)
TASK_ROLE_ARN=$(aws iam get-role --role-name $TASK_ROLE_NAME --query 'Role.Arn' --output text)

echo "📋 Execution Role ARN: $EXECUTION_ROLE_ARN"
echo "📋 Task Role ARN: $TASK_ROLE_ARN"

# Update task definition with role ARNs
echo "📝 Updating task definition..."
sed -i "s|<your-ecs-task-execution-role-arn>|$EXECUTION_ROLE_ARN|g" $TASK_DEFINITION_FILE
sed -i "s|<your-ecs-task-role-arn>|$TASK_ROLE_ARN|g" $TASK_DEFINITION_FILE

# Register task definition
echo "📋 Registering task definition..."
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://$TASK_DEFINITION_FILE \
    --region $AWS_REGION \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "✅ Task definition registered: $TASK_DEFINITION_ARN"

# Create Application Load Balancer (if needed)
echo "🌐 Setting up load balancer..."

# Check if ALB exists
ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names synthos-alb \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || echo "")

if [ "$ALB_ARN" == "None" ] || [ -z "$ALB_ARN" ]; then
    echo "Creating Application Load Balancer..."
    
    # Get default VPC and subnets
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')
    
    # Create ALB
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name synthos-alb \
        --subnets $(echo $SUBNET_IDS | tr ',' ' ') \
        --security-groups $(aws ec2 describe-security-groups --filters "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text) \
        --region $AWS_REGION \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)
    
    echo "✅ ALB created: $ALB_ARN"
else
    echo "✅ ALB already exists: $ALB_ARN"
    # Retrieve VPC and SUBNET_IDS for later use
    VPC_ID=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].VpcId' --output text)
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')
fi

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo "🌐 ALB DNS: $ALB_DNS"

# Create target group
echo "🎯 Creating target group..."
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name synthos-targets \
    --protocol HTTP \
    --port 8000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || \
    aws elbv2 describe-target-groups \
        --names synthos-targets \
        --region $AWS_REGION \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)

echo "✅ Target group: $TARGET_GROUP_ARN"

# Ensure target group health check path is correct
aws elbv2 modify-target-group \
    --target-group-arn $TARGET_GROUP_ARN \
    --health-check-path /health \
    --region $AWS_REGION >/dev/null

# Create listener
echo "🔊 Creating listener..."
LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region $AWS_REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text 2>/dev/null || \
    aws elbv2 describe-listeners \
        --load-balancer-arn $ALB_ARN \
        --region $AWS_REGION \
        --query 'Listeners[0].ListenerArn' \
        --output text)

echo "✅ Listener created: $LISTENER_ARN"

# Create ECS Service
echo "🚀 Creating ECS service..."
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_DEFINITION_ARN \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$(aws ec2 describe-security-groups --filters \"Name=group-name,Values=default\" --query 'SecurityGroups[0].GroupId' --output text)],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=synthos-backend,containerPort=8000" \
    --deployment-configuration "maximumPercent=200,minimumHealthyPercent=50,alarms={rollback=false},deploymentCircuitBreaker={enable=true,rollback=true}" \
    --health-check-grace-period-seconds 120 \
    --region $AWS_REGION || echo "Service already exists"

echo "✅ ECS service created/updated"

# Wait for service to be stable
echo "⏳ Waiting for service to be stable..."
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $AWS_REGION

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   Cluster: $CLUSTER_NAME"
echo "   Service: $SERVICE_NAME"
echo "   Task Definition: $TASK_DEFINITION_ARN"
echo "   Load Balancer: $ALB_DNS"
echo "   Health Check: http://$ALB_DNS/health"
echo ""
echo "🔗 Your API is now available at: http://$ALB_DNS"
echo "📊 Monitor your service at: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$CLUSTER_NAME/services/$SERVICE_NAME" 