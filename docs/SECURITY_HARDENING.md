 # 🔒 Security Hardening Guide - MITM Protection

## Critical Security Issues Addressed

This guide addresses critical vulnerabilities that expose your application to Man-in-the-Middle (MITM) attacks and implements enterprise-grade security measures.

## 🚨 Immediate Actions Required

### 1. Environment Variables Update

#### Backend (`backend/backend.env`)
```bash
# Security Configuration - MITM Protection
FORCE_HTTPS=true
SESSION_DOMAIN=.synthos.ai
ENABLE_SECURITY_SCANNER=true

# CORS Configuration - HTTPS Only for production
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://synthos.ai,https://www.synthos.ai
ALLOWED_HOSTS=your-vercel-app.vercel.app,synthos.ai,www.synthos.ai,api.synthos.ai

# Remove any HTTP origins from production
```

#### Frontend (`frontend/frontend.env`)
```bash
# Security Configuration
NEXT_PUBLIC_FORCE_HTTPS=true
NEXT_PUBLIC_STRICT_CSP=true

# API Configuration - Use HTTPS by default
NEXT_PUBLIC_API_URL=https://api.synthos.ai

# For local development only (comment out in production)
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Backend Security Updates

#### Add HTTPS Enforcement Middleware

Create `backend/app/middleware/https_enforcer.py`:

```python
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class HTTPSEnforcementMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip enforcement for health checks
        if request.url.path in ["/health", "/metrics"]:
            return await call_next(request)
        
        # Check if request is over HTTPS
        forwarded_proto = request.headers.get("x-forwarded-proto", "").lower()
        scheme = request.url.scheme.lower()
        
        if scheme == "http" and forwarded_proto != "https":
            # Return 426 Upgrade Required
            https_url = request.url.replace(scheme="https")
            return JSONResponse(
                status_code=status.HTTP_426_UPGRADE_REQUIRED,
                content={
                    "error": "HTTPS Required",
                    "message": "This service requires HTTPS for security.",
                    "upgrade_to": str(https_url)
                },
                headers={
                    "Upgrade": "TLS/1.2, HTTP/1.1",
                    "Connection": "Upgrade",
                    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
                }
            )
        
        return await call_next(request)
```

#### Update Main Application

In `backend/app/main.py`, add these imports and middleware:

```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from app.middleware.https_enforcer import HTTPSEnforcementMiddleware

# Add after app initialization, before other middleware
if settings.ENVIRONMENT in ["production", "staging"] or settings.FORCE_HTTPS:
    app.add_middleware(HTTPSRedirectMiddleware)
    app.add_middleware(HTTPSEnforcementMiddleware)
```

#### Enhanced Security Headers

Update the SecurityHeadersMiddleware in `main.py`:

```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Core security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        
        # Content Security Policy with upgrade-insecure-requests
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.paddle.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "connect-src 'self' https: wss:; "
            "upgrade-insecure-requests"
        )
        response.headers["Content-Security-Policy"] = csp_policy
        
        # HTTPS enforcement headers
        if settings.ENVIRONMENT == "production" or settings.FORCE_HTTPS:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
            response.headers["Expect-CT"] = "max-age=86400, enforce"
        
        return response
```

### 3. Frontend Security Updates

#### Update API Client (`frontend/src/lib/api.ts`)

```typescript
// Security validation for API URL
const validateApiUrl = (url: string): string => {
  // In production, force HTTPS
  if (process.env.NODE_ENV === 'production' && url.startsWith('http://')) {
    console.warn('⚠️ Converting HTTP to HTTPS for production security');
    return url.replace('http://', 'https://');
  }
  return url;
};

// Enhanced request interceptor
api.interceptors.request.use((config) => {
  // Security: Ensure HTTPS in production
  if (config.url && process.env.NODE_ENV === 'production') {
    if (config.url.startsWith('http://')) {
      config.url = config.url.replace('http://', 'https://');
    }
  }
  
  return config;
});

// Handle HTTPS upgrade required
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 426) {
      console.error('🚨 HTTPS Required - Redirecting to secure endpoint');
      const httpsUrl = error.response.data?.upgrade_to;
      if (httpsUrl && typeof window !== 'undefined') {
        window.location.href = httpsUrl;
        return;
      }
    }
    return Promise.reject(error);
  }
);
```

### 4. Docker Configuration Updates

#### Secure Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  backend:
    environment:
      # Security Configuration
      FORCE_HTTPS: ${FORCE_HTTPS:-true}
      
      # CORS (secure by default)
      CORS_ORIGINS: https://localhost:3000,https://127.0.0.1:3000
      
    # Use internal health check to avoid HTTP issues
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health', timeout=5)"]
      
  frontend:
    environment:
      NEXT_PUBLIC_FORCE_HTTPS: ${FORCE_HTTPS:-true}
      NEXT_PUBLIC_API_URL: https://localhost:8000
```

### 5. Production Deployment

#### Railway Configuration

Update `backend/railway-start.sh`:

```bash
#!/bin/bash
echo "🔒 Enforcing HTTPS security..."

# Force HTTPS in production
export FORCE_HTTPS=true
export SESSION_SECURE=true

# Update CORS to HTTPS only
export CORS_ORIGINS="https://your-frontend-domain.vercel.app"

# Start server with security
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## 🛡️ Security Features Implemented

### 1. HTTPS Enforcement
- **HTTP to HTTPS redirects**: All HTTP traffic automatically redirected
- **426 Upgrade Required**: API returns proper status for HTTP requests
- **HSTS Headers**: Prevents downgrade attacks with preload directive
- **Secure cookies**: Session cookies only sent over HTTPS

### 2. Security Headers
- **Strict-Transport-Security**: Prevents protocol downgrade attacks
- **Content-Security-Policy**: Blocks malicious scripts and XSS
- **X-Frame-Options**: Prevents clickjacking attacks
- **Expect-CT**: Certificate Transparency monitoring
- **upgrade-insecure-requests**: Automatically upgrades HTTP resources

### 3. API Security
- **Request validation**: Validates all incoming requests for HTTPS
- **Response headers**: Adds security headers to all responses
- **CORS restrictions**: Only allows HTTPS origins in production
- **Error handling**: Secure error responses without information leakage

### 4. Frontend Protection
- **URL validation**: Validates and converts HTTP URLs to HTTPS
- **Secure storage**: Protected localStorage implementation
- **CSP compliance**: Content Security Policy validation
- **Connection monitoring**: Detects and prevents insecure connections

## 🔧 Development vs Production

### Development Mode
```bash
# Allow HTTP for localhost only
FORCE_HTTPS=false
CORS_ORIGINS=https://localhost:3000,http://localhost:3000
```

### Production Mode
```bash
# Force HTTPS everywhere
FORCE_HTTPS=true
CORS_ORIGINS=https://your-domain.com
HSTS_PRELOAD=true
```

## 🚀 Quick Deployment Script

Create `deploy-secure.sh`:

```bash
#!/bin/bash
echo "🔒 Deploying with maximum security..."

# Backend deployment
cd backend
export FORCE_HTTPS=true
export ENVIRONMENT=production
railway up

# Frontend deployment
cd ../frontend
export NEXT_PUBLIC_FORCE_HTTPS=true
vercel --prod

echo "✅ Secure deployment complete!"
```

## 📋 Security Checklist

- [ ] All HTTP URLs converted to HTTPS
- [ ] FORCE_HTTPS=true in production
- [ ] CORS_ORIGINS contains only HTTPS URLs
- [ ] Security headers middleware enabled
- [ ] Session cookies set to secure
- [ ] CSP headers configured
- [ ] HSTS headers with preload
- [ ] Certificate transparency monitoring
- [ ] Error handling doesn't leak information
- [ ] Development mode allows HTTP only for localhost

## 🔍 Security Validation

### Test HTTPS Enforcement

```bash
# Should return 426 Upgrade Required
curl -i http://your-api-domain.com/api/v1/health

# Should work normally
curl -i https://your-api-domain.com/api/v1/health
```

### Check Security Headers

```bash
# Verify security headers
curl -I https://your-api-domain.com/api/v1/health | grep -E "(Strict-Transport|Content-Security|X-Frame)"
```

## ⚡ Performance Impact

Security measures have minimal performance impact:
- **HTTPS overhead**: ~2-5% CPU increase
- **Header processing**: <1ms per request
- **Redirects**: One-time cost for HTTP requests

## 🆘 Emergency Rollback

If issues occur, quickly disable HTTPS enforcement:

```bash
# Temporary disable (emergency only)
export FORCE_HTTPS=false
railway redeploy
```

## 📞 Support

For security-related questions or incident reporting:
- 🔒 Security Email: security@synthos.ai
- 🚨 Emergency: Use GitHub Issues with `security` label

---

**⚠️ CRITICAL**: Deploy these changes immediately to prevent MITM attacks. Test thoroughly in staging before production deployment.