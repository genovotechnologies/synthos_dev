#!/bin/bash

# =============================================================================
# SYNTHOS BACKEND LOCAL TEST SCRIPT
# Tests the backend with CI-compatible dependencies
# =============================================================================

set -e

echo "🧪 Testing Synthos Backend Locally..."

# Install CI dependencies
echo "📦 Installing CI dependencies..."
pip install -r requirements-ci.txt

# Set up environment
echo "⚙️ Setting up environment..."
cp .env.example .env
echo "DATABASE_URL=postgresql://synthos:testpass@localhost:5432/synthos_test" >> .env
echo "REDIS_URL=redis://localhost:6379/0" >> .env
echo "ANTHROPIC_API_KEY=test-key" >> .env
echo "SECRET_KEY=test-secret-key-for-local-testing" >> .env

# Run tests
echo "🔍 Running tests..."
PYTHONPATH=$PYTHONPATH:. pytest tests/ -v --tb=short

echo "✅ Local testing completed successfully!" 