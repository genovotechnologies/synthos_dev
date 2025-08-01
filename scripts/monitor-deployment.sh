#!/bin/bash

# Monitor Synthos Deployment
# This script checks the status of all deployed components

echo "🔍 Monitoring Synthos Deployment..."
echo ""

# Configuration
CLUSTER_NAME="synthos-cluster"
SERVICE_NAME="synthos-backend-service"
REGION="us-east-1"
LOAD_BALANCER_DNS="synthos-alb-production-1411529388.us-east-1.elb.amazonaws.com"

echo "📊 ECS Service Status:"
aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION \
    --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,PendingCount:pendingCount}' \
    --output table

echo ""
echo "🐳 ECS Tasks:"
aws ecs list-tasks \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --region $REGION \
    --query 'taskArns' \
    --output table

echo ""
echo "🌐 Load Balancer Status:"
aws elbv2 describe-load-balancers \
    --names synthos-alb-production \
    --region $REGION \
    --query 'LoadBalancers[0].{DNSName:DNSName,State:State.Code,Scheme:Scheme}' \
    --output table

echo ""
echo "🗄️ RDS Database Status:"
aws rds describe-db-instances \
    --db-instance-identifier synthos-db \
    --region $REGION \
    --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address}' \
    --output table

echo ""
echo "🔴 Redis Status:"
aws elasticache describe-replication-groups \
    --replication-group-id synthos-redis \
    --region $REGION \
    --query 'ReplicationGroups[0].{Status:Status,PrimaryEndpoint:NodeGroups[0].PrimaryEndpoint.Address}' \
    --output table

echo ""
echo "📦 S3 Bucket Status:"
aws s3 ls s3://synthos-data-production-263881c5116fdde7 --region $REGION

echo ""
echo "🔗 Backend Health Check:"
echo "Testing: https://$LOAD_BALANCER_DNS/health"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://$LOAD_BALANCER_DNS/health || echo "Connection failed"

echo ""
echo "✅ Monitoring complete!" 