#!/bin/bash

echo "🧪 Testing Synthos Deployment..."
echo ""

# Test 1: Check if ECS service exists
echo "1. Checking ECS Service..."
aws ecs describe-services --cluster synthos-cluster --services synthos-backend-service --region us-east-1 --query 'services[0].status' --output text 2>/dev/null && echo "✅ ECS Service exists" || echo "❌ ECS Service not found"

# Test 2: Check if load balancer exists
echo "2. Checking Load Balancer..."
aws elbv2 describe-load-balancers --names synthos-alb-production --region us-east-1 --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null && echo "✅ Load Balancer exists" || echo "❌ Load Balancer not found"

# Test 3: Check if RDS exists
echo "3. Checking RDS Database..."
aws rds describe-db-instances --db-instance-identifier synthos-db --region us-east-1 --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null && echo "✅ RDS Database exists" || echo "❌ RDS Database not found"

# Test 4: Check if Redis exists
echo "4. Checking Redis Cluster..."
aws elasticache describe-replication-groups --replication-group-id synthos-redis --region us-east-1 --query 'ReplicationGroups[0].Status' --output text 2>/dev/null && echo "✅ Redis Cluster exists" || echo "❌ Redis Cluster not found"

# Test 5: Check if S3 bucket exists
echo "5. Checking S3 Bucket..."
aws s3 ls s3://synthos-data-production-263881c5116fdde7 --region us-east-1 2>/dev/null && echo "✅ S3 Bucket exists" || echo "❌ S3 Bucket not found"

echo ""
echo "🎯 Next Steps:"
echo "1. Wait 5-10 minutes for ECS tasks to fully start"
echo "2. Check AWS Console for any error messages"
echo "3. Test backend health: https://synthos-alb-production-1411529388.us-east-1.elb.amazonaws.com/health"
echo "4. Test frontend: Your Vercel URL" 