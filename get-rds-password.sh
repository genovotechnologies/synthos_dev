#!/bin/bash

echo "🔍 Finding your RDS password..."

# Get the secret ARN
echo "1. Getting secret ARN..."
SECRET_ARN=$(aws rds describe-db-instances --db-instance-identifier synthos --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text)

if [ "$SECRET_ARN" = "None" ] || [ -z "$SECRET_ARN" ]; then
    echo "❌ No managed secret found. Let's check manually:"
    echo "Run this command in AWS Console:"
    echo "aws secretsmanager list-secrets --region us-east-1"
    exit 1
fi

echo "✅ Found secret: $SECRET_ARN"

# Get the actual password
echo "2. Getting password..."
SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query 'SecretString' --output text)

if [ -z "$SECRET_VALUE" ]; then
    echo "❌ Could not retrieve secret value"
    exit 1
fi

# Extract password from JSON
PASSWORD=$(echo "$SECRET_VALUE" | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])")

echo ""
echo "🎉 Your RDS password is: $PASSWORD"
echo ""
echo "📝 Update your backend/backend.env file:"
echo "DATABASE_URL=postgresql://genovo:$PASSWORD@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos"
echo ""
echo "💡 Or use the secret ARN directly for better security:"
echo "DATABASE_URL=postgresql://genovo:{{resolve:secretsmanager:$SECRET_ARN:SecretString:password}}@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos" 