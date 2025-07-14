#!/bin/bash
# Setup Environment Configuration for Synthos
# This script sets up the correct environment variables for seamless frontend-backend connection

echo "🚀 Setting up Synthos environment configuration..."

# Create frontend .env.local if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    echo "📄 Creating frontend/.env.local..."
    cat > frontend/.env.local << EOF
# ===================================================================
# Synthos Frontend Environment Configuration (Local)
# ===================================================================
# Development API URL - points to local backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Application Configuration
NEXT_PUBLIC_APP_NAME=Synthos
NEXT_PUBLIC_APP_VERSION=1.0.0

# Security Configuration for Development
NEXT_PUBLIC_FORCE_HTTPS=false

# Debug Mode
NEXT_PUBLIC_DEBUG=true

# Environment
NODE_ENV=development
EOF
    echo "✅ Frontend environment file created"
else
    echo "⚠️  Frontend .env.local already exists, skipping..."
fi

# Check if backend environment exists
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/backend.env" ]; then
        echo "📄 Copying backend environment configuration..."
        cp backend/backend.env backend/.env
        echo "✅ Backend environment file created"
    else
        echo "⚠️  Backend environment template not found"
    fi
else
    echo "✅ Backend .env file already exists"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review and update backend/.env with your actual values"
echo "2. Start the backend: cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "3. Start the frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Your frontend will connect to the backend at http://localhost:8000"
echo "🎯 Frontend will be available at http://localhost:3000"
echo ""
echo "💡 Tip: Both frontend and backend will now communicate seamlessly!" 