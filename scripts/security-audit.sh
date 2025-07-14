 #!/bin/bash

# 🔒 Security Audit Script for Synthos
# Validates HTTPS enforcement and security configurations

set -e

echo "🔒 Starting Security Audit for Synthos..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ISSUES=0
WARNINGS=0
PASSED=0

# Function to log results
log_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARNINGS++))
}

log_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((ISSUES++))
}

log_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

# Check if running in the correct directory
if [ ! -f "docker-compose.yml" ]; then
    log_fail "Please run this script from the project root directory"
    exit 1
fi

echo "🔍 1. Checking Environment Configuration..."
echo "----------------------------------------"

# Check backend environment
if [ -f "backend/backend.env" ]; then
    log_info "Checking backend environment variables..."
    
    # Check FORCE_HTTPS
    if grep -q "FORCE_HTTPS=true" backend/backend.env; then
        log_pass "FORCE_HTTPS is enabled"
    else
        log_fail "FORCE_HTTPS is not enabled - MITM attacks possible"
    fi
    
    # Check CORS origins
    if grep -q "CORS_ORIGINS.*https://" backend/backend.env; then
        log_pass "CORS origins use HTTPS"
        
        # Check for HTTP origins in production
        if grep -q "CORS_ORIGINS.*http://" backend/backend.env && grep -q "ENVIRONMENT=production" backend/backend.env; then
            log_fail "HTTP origins found in production CORS configuration"
        fi
    else
        log_warning "No HTTPS CORS origins found"
    fi
    
    # Check secrets
    if grep -q "SECRET_KEY=your-" backend/backend.env; then
        log_fail "Default SECRET_KEY detected - change immediately"
    else
        log_pass "SECRET_KEY appears to be customized"
    fi
    
    if grep -q "JWT_SECRET_KEY=your-" backend/backend.env; then
        log_fail "Default JWT_SECRET_KEY detected - change immediately"
    else
        log_pass "JWT_SECRET_KEY appears to be customized"
    fi
    
else
    log_warning "Backend environment file not found"
fi

# Check frontend environment
if [ -f "frontend/frontend.env" ]; then
    log_info "Checking frontend environment variables..."
    
    # Check API URL
    if grep -q "NEXT_PUBLIC_API_URL=https://" frontend/frontend.env; then
        log_pass "Frontend API URL uses HTTPS"
    elif grep -q "NEXT_PUBLIC_API_URL=http://localhost" frontend/frontend.env; then
        log_warning "Frontend uses HTTP for localhost (OK for development)"
    else
        log_fail "Frontend API URL does not use HTTPS"
    fi
    
    # Check FORCE_HTTPS
    if grep -q "NEXT_PUBLIC_FORCE_HTTPS=true" frontend/frontend.env; then
        log_pass "Frontend HTTPS enforcement enabled"
    else
        log_warning "Frontend HTTPS enforcement not explicitly enabled"
    fi
    
else
    log_warning "Frontend environment file not found"
fi

echo ""
echo "🔍 2. Checking Source Code Security..."
echo "------------------------------------"

# Check backend main.py for HTTPS middleware
if [ -f "backend/app/main.py" ]; then
    if grep -q "HTTPSRedirectMiddleware" backend/app/main.py; then
        log_pass "HTTPS redirect middleware found"
    else
        log_fail "HTTPS redirect middleware not implemented"
    fi
    
    if grep -q "Strict-Transport-Security" backend/app/main.py; then
        log_pass "HSTS headers implemented"
    else
        log_warning "HSTS headers not found in main application"
    fi
    
    if grep -q "Content-Security-Policy" backend/app/main.py; then
        log_pass "Content Security Policy implemented"
    else
        log_warning "Content Security Policy not found"
    fi
else
    log_fail "Backend main.py not found"
fi

# Check frontend API client
if [ -f "frontend/src/lib/api.ts" ]; then
    if grep -q "https://" frontend/src/lib/api.ts; then
        log_pass "Frontend API client uses HTTPS"
    else
        log_warning "HTTPS usage not explicit in API client"
    fi
    
    if grep -q "validateApiUrl\|validateSecureConnection" frontend/src/lib/api.ts; then
        log_pass "Frontend has URL validation"
    else
        log_warning "Frontend URL validation not found"
    fi
else
    log_fail "Frontend API client not found"
fi

echo ""
echo "🔍 3. Checking Docker Configuration..."
echo "------------------------------------"

if [ -f "docker-compose.yml" ]; then
    # Check for HTTP health checks
    if grep -q "http://localhost:8000/health" docker-compose.yml; then
        log_warning "Docker health checks use HTTP (internal only, acceptable)"
    fi
    
    # Check environment variables
    if grep -q "FORCE_HTTPS" docker-compose.yml; then
        log_pass "FORCE_HTTPS configuration found in Docker"
    else
        log_warning "FORCE_HTTPS not configured in Docker"
    fi
    
    # Check CORS configuration
    if grep -q "https://localhost:3000" docker-compose.yml; then
        log_pass "Docker CORS uses HTTPS for frontend"
    else
        log_warning "HTTPS CORS not found in Docker configuration"
    fi
else
    log_fail "docker-compose.yml not found"
fi

echo ""
echo "🔍 4. Checking Network Security..."
echo "--------------------------------"

# Check if services are running
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if command -v curl >/dev/null 2>&1; then
    # Test backend HTTPS enforcement (if running)
    if curl -s --connect-timeout 5 http://localhost:8000/health >/dev/null 2>&1; then
        BACKEND_RUNNING=true
        
        # Test HTTPS enforcement
        HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
        
        if [ "$HTTP_RESPONSE" = "426" ]; then
            log_pass "Backend returns 426 (Upgrade Required) for HTTP requests"
        elif [ "$HTTP_RESPONSE" = "200" ]; then
            log_warning "Backend accepts HTTP requests (check if development mode)"
        else
            log_info "Backend HTTP response code: $HTTP_RESPONSE"
        fi
        
        # Test HTTPS if available
        if curl -s -k --connect-timeout 5 https://localhost:8000/health >/dev/null 2>&1; then
            log_pass "Backend HTTPS endpoint is accessible"
            
            # Check security headers
            HEADERS=$(curl -s -k -I https://localhost:8000/health 2>/dev/null)
            
            if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
                log_pass "HSTS header present in HTTPS response"
            else
                log_warning "HSTS header not found in HTTPS response"
            fi
            
            if echo "$HEADERS" | grep -q "Content-Security-Policy"; then
                log_pass "CSP header present in HTTPS response"
            else
                log_warning "CSP header not found in HTTPS response"
            fi
        else
            log_info "Backend HTTPS not accessible (may need SSL certificate)"
        fi
    else
        log_info "Backend not running - skipping network tests"
    fi
    
    # Test frontend
    if curl -s --connect-timeout 5 http://localhost:3000/ >/dev/null 2>&1; then
        FRONTEND_RUNNING=true
        log_info "Frontend is running"
    else
        log_info "Frontend not running - skipping network tests"
    fi
else
    log_info "curl not available - skipping network tests"
fi

echo ""
echo "🔍 5. Security Recommendations..."
echo "--------------------------------"

# General recommendations
if [ "$ISSUES" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    log_pass "All security checks passed!"
else
    echo "Security improvements needed:"
    
    if [ "$ISSUES" -gt 0 ]; then
        echo -e "${RED}Critical Issues ($ISSUES):${NC}"
        echo "  • Fix all FAIL items immediately"
        echo "  • These expose the application to MITM attacks"
    fi
    
    if [ "$WARNINGS" -gt 0 ]; then
        echo -e "${YELLOW}Warnings ($WARNINGS):${NC}"
        echo "  • Address WARN items for enhanced security"
        echo "  • Consider implementing all security best practices"
    fi
fi

echo ""
echo "💡 Additional Recommendations:"
echo "  • Use a proper SSL certificate in production"
echo "  • Enable HSTS preload list submission"
echo "  • Implement Certificate Transparency monitoring"
echo "  • Regular security audits and penetration testing"
echo "  • Monitor for mixed content warnings"
echo "  • Use security scanning tools (OWASP ZAP, etc.)"

echo ""
echo "🚀 Quick Fixes:"
echo "  1. Set FORCE_HTTPS=true in all environments"
echo "  2. Update CORS_ORIGINS to use only HTTPS URLs"
echo "  3. Change default secret keys"
echo "  4. Add HTTPS redirect middleware"
echo "  5. Configure security headers"

echo ""
echo "=================================="
echo "📊 Security Audit Summary"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Issues: $ISSUES${NC}"

if [ "$ISSUES" -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Security audit completed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}🚨 Security issues found - please address immediately!${NC}"
    exit 1
fi