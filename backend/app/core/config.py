"""
Synthos Configuration Management
Handles all environment variables and application settings
"""

import os
from typing import List, Optional, Union
from pydantic import Field
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings with environment variable support"""
    
    # Application
    APP_NAME: str = "Synthos"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Security Configuration
    FORCE_HTTPS: bool = os.getenv("FORCE_HTTPS", "false").lower() == "true"
    SESSION_DOMAIN: Optional[str] = os.getenv("SESSION_DOMAIN")  # e.g., ".synthos.ai"
    HPKP_PINS: Optional[str] = os.getenv("HPKP_PINS")  # HTTP Public Key Pinning
    ENABLE_SECURITY_SCANNER: bool = os.getenv("ENABLE_SECURITY_SCANNER", "true").lower() == "true"
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    ALLOWED_HOSTS: List[str] = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    
    # CORS Configuration with secure defaults
    _cors_origins = os.getenv("CORS_ORIGINS", "https://localhost:3000,https://127.0.0.1:3000")
    # Only allow HTTP origins in development mode
    if ENVIRONMENT == "development":
        _cors_origins += ",http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGINS: List[str] = _cors_origins.split(",")
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/synthos")
    DATABASE_POOL_SIZE: int = int(os.getenv("DATABASE_POOL_SIZE", "20"))
    DATABASE_MAX_OVERFLOW: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "30"))
    
    # AWS RDS Configuration
    # Set these for managed PostgreSQL instances
    AWS_RDS_ENDPOINT: Optional[str] = os.getenv("AWS_RDS_ENDPOINT")
    AWS_RDS_PORT: int = int(os.getenv("AWS_RDS_PORT", "5432"))
    AWS_RDS_DATABASE: str = os.getenv("AWS_RDS_DATABASE", "synthos_db")
    AWS_RDS_USERNAME: Optional[str] = os.getenv("AWS_RDS_USERNAME")
    AWS_RDS_PASSWORD: Optional[str] = os.getenv("AWS_RDS_PASSWORD")
    AWS_RDS_USE_SSL: bool = os.getenv("AWS_RDS_USE_SSL", "true").lower() == "true"
    
    # RDS Proxy Configuration
    RDS_PROXY_ENDPOINT: Optional[str] = os.getenv("RDS_PROXY_ENDPOINT")
    USE_RDS_PROXY: bool = os.getenv("USE_RDS_PROXY", "false").lower() == "true"
    USE_IAM_AUTH: bool = os.getenv("USE_IAM_AUTH", "false").lower() == "true"
    
    # Database Connection Pool Settings (optimized for RDS)
    DATABASE_POOL_TIMEOUT: int = int(os.getenv("DATABASE_POOL_TIMEOUT", "30"))
    DATABASE_POOL_RECYCLE: int = int(os.getenv("DATABASE_POOL_RECYCLE", "3600"))
    DATABASE_POOL_PRE_PING: bool = os.getenv("DATABASE_POOL_PRE_PING", "true").lower() == "true"
    
    # Database Connection Options
    DATABASE_CONNECT_TIMEOUT: int = int(os.getenv("DATABASE_CONNECT_TIMEOUT", "10"))
    DATABASE_COMMAND_TIMEOUT: int = int(os.getenv("DATABASE_COMMAND_TIMEOUT", "60"))
    DATABASE_APPLICATION_NAME: str = os.getenv("DATABASE_APPLICATION_NAME", "synthos-api")
    
    # Redis/Valkey Configuration
    # Valkey is a Redis-compatible fork recommended by AWS for new deployments
    # Both Redis and Valkey URLs work with the same configuration
    # Format: redis://host:port/db or valkey://host:port/db
    # AWS ElastiCache Valkey: rediss://your-cluster.cache.amazonaws.com:6379
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_CACHE_TTL: int = int(os.getenv("REDIS_CACHE_TTL", "3600"))
    # Feature flag to enable/disable caching entirely
    ENABLE_CACHING: bool = os.getenv("ENABLE_CACHING", "false").lower() == "true"
    
    # Optional: Separate Valkey URL for enhanced performance
    # If VALKEY_URL is set, it takes precedence over REDIS_URL
    VALKEY_URL: Optional[str] = os.getenv("VALKEY_URL")
    
    # Cache backend preference (redis, valkey, auto)
    # 'auto' will prefer Valkey if available, fallback to Redis
    CACHE_BACKEND: str = os.getenv("CACHE_BACKEND", "auto")
    # Back-compat flag used by some modules
    REDIS_ENABLED: bool = ENABLE_CACHING
    
    # Celery Configuration (supports both Redis and Valkey)
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    # AWS ElastiCache Configuration
    # Set these for managed Redis/Valkey instances
    AWS_ELASTICACHE_ENDPOINT: Optional[str] = os.getenv("AWS_ELASTICACHE_ENDPOINT")
    AWS_ELASTICACHE_PORT: int = int(os.getenv("AWS_ELASTICACHE_PORT", "6379"))
    AWS_ELASTICACHE_AUTH_TOKEN: Optional[str] = os.getenv("AWS_ELASTICACHE_AUTH_TOKEN")
    AWS_ELASTICACHE_USE_TLS: bool = os.getenv("AWS_ELASTICACHE_USE_TLS", "true").lower() == "true"
    
    # AWS Configuration
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "synthos-data")
    AWS_CLOUDFRONT_DOMAIN: Optional[str] = os.getenv("AWS_CLOUDFRONT_DOMAIN")
    
    # AI Services
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "your-anthropic-key")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OPENAI_ORGANIZATION: Optional[str] = os.getenv("OPENAI_ORGANIZATION")
    OPENAI_DEFAULT_MODEL: str = os.getenv("OPENAI_DEFAULT_MODEL", "gpt-4-turbo-preview")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-3-sonnet-20240229")
    CLAUDE_MAX_TOKENS: int = int(os.getenv("CLAUDE_MAX_TOKENS", "4000"))
    
    # Differential Privacy
    PRIVACY_BUDGET_EPSILON: float = float(os.getenv("PRIVACY_BUDGET_EPSILON", "1.0"))
    PRIVACY_BUDGET_DELTA: float = float(os.getenv("PRIVACY_BUDGET_DELTA", "1e-5"))
    
    # Payment Processing
    # Stripe Configuration
    STRIPE_PUBLIC_KEY: str = os.getenv("STRIPE_PUBLIC_KEY", "pk_test_your_key")
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "sk_test_your_key")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_your_secret")
    
    # Paddle Configuration (Alternative payment processor)
    PADDLE_VENDOR_ID: Optional[str] = os.getenv("PADDLE_VENDOR_ID")
    PADDLE_VENDOR_AUTH_CODE: Optional[str] = os.getenv("PADDLE_VENDOR_AUTH_CODE")
    PADDLE_PUBLIC_KEY: Optional[str] = os.getenv("PADDLE_PUBLIC_KEY")
    PADDLE_WEBHOOK_SECRET: Optional[str] = os.getenv("PADDLE_WEBHOOK_SECRET")
    PADDLE_ENVIRONMENT: str = os.getenv("PADDLE_ENVIRONMENT", "sandbox")  # sandbox or production
    
    # Payment Provider Selection
    PRIMARY_PAYMENT_PROVIDER: str = os.getenv("PRIMARY_PAYMENT_PROVIDER", "stripe")  # stripe or paddle
    ENABLE_MULTIPLE_PAYMENT_PROVIDERS: bool = os.getenv("ENABLE_MULTIPLE_PAYMENT_PROVIDERS", "false").lower() == "true"
    
    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-jwt-secret")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Email Configuration
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@synthos.dev")
    
    # Monitoring
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")
    PROMETHEUS_ENABLED: bool = os.getenv("PROMETHEUS_ENABLED", "true").lower() == "true"
    ENABLE_PROMETHEUS: bool = os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true"
    ENABLE_SENTRY: bool = os.getenv("ENABLE_SENTRY", "true").lower() == "true"
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
    ENABLE_RATE_LIMITING: bool = os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    
    # File Upload
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(100 * 1024 * 1024)))
    ALLOWED_FILE_TYPES: List[str] = os.getenv("ALLOWED_FILE_TYPES", "csv,json,parquet,xlsx").split(",")
    
    # Synthetic Data Generation
    MAX_SYNTHETIC_ROWS: int = int(os.getenv("MAX_SYNTHETIC_ROWS", "5000000"))
    DEFAULT_SYNTHETIC_ROWS: int = int(os.getenv("DEFAULT_SYNTHETIC_ROWS", "1000"))
    GENERATION_TIMEOUT: int = int(os.getenv("GENERATION_TIMEOUT", "300"))
    
    # Subscription Tiers
    FREE_TIER_MONTHLY_LIMIT: int = int(os.getenv("FREE_TIER_MONTHLY_LIMIT", "10000"))
    PRO_TIER_MONTHLY_LIMIT: int = int(os.getenv("PRO_TIER_MONTHLY_LIMIT", "1000000"))
    ENTERPRISE_TIER_MONTHLY_LIMIT: int = int(os.getenv("ENTERPRISE_TIER_MONTHLY_LIMIT", "-1"))
    
    # Feature Flags
    ENABLE_WATERMARKS: bool = os.getenv("ENABLE_WATERMARKS", "true").lower() == "true"
    ENABLE_AUDIT_LOGS: bool = os.getenv("ENABLE_AUDIT_LOGS", "true").lower() == "true"
    ENABLE_DATA_RETENTION: bool = os.getenv("ENABLE_DATA_RETENTION", "true").lower() == "true"
    ENABLE_GDPR_COMPLIANCE: bool = os.getenv("ENABLE_GDPR_COMPLIANCE", "true").lower() == "true"

    # Enhanced Realism Settings
    ENABLE_ENHANCED_REALISM: bool = os.getenv("ENABLE_ENHANCED_REALISM", "true").lower() == "true"
    REALISM_ACCURACY_THRESHOLD: float = float(os.getenv("REALISM_ACCURACY_THRESHOLD", "0.95"))
    INDUSTRY_DOMAIN_DETECTION: bool = os.getenv("INDUSTRY_DOMAIN_DETECTION", "true").lower() == "true"
    ENFORCE_REGULATORY_COMPLIANCE: bool = os.getenv("ENFORCE_REGULATORY_COMPLIANCE", "true").lower() == "true"

    # Critical Industry Settings
    HEALTHCARE_COMPLIANCE_MODE: bool = os.getenv("HEALTHCARE_COMPLIANCE_MODE", "false").lower() == "true"
    FINANCE_COMPLIANCE_MODE: bool = os.getenv("FINANCE_COMPLIANCE_MODE", "false").lower() == "true"
    MANUFACTURING_COMPLIANCE_MODE: bool = os.getenv("MANUFACTURING_COMPLIANCE_MODE", "false").lower() == "true"

    # Multi-Model Configuration
    ENABLE_MULTI_MODEL_GENERATION: bool = os.getenv("ENABLE_MULTI_MODEL_GENERATION", "true").lower() == "true"
    ENABLE_OPENAI_INTEGRATION: bool = os.getenv("ENABLE_OPENAI_INTEGRATION", "true").lower() == "true"
    ENABLE_MODEL_ENSEMBLE: bool = os.getenv("ENABLE_MODEL_ENSEMBLE", "true").lower() == "true"
    AUTO_MODEL_SELECTION: bool = os.getenv("AUTO_MODEL_SELECTION", "true").lower() == "true"

    # Custom Model Configuration
    CUSTOM_MODEL_MAX_SIZE_MB: int = int(os.getenv("CUSTOM_MODEL_MAX_SIZE_MB", "1024"))
    CUSTOM_MODEL_VALIDATION_TIMEOUT: int = int(os.getenv("CUSTOM_MODEL_VALIDATION_TIMEOUT", "300"))
    ENABLE_GPU_INFERENCE: bool = os.getenv("ENABLE_GPU_INFERENCE", "false").lower() == "true"

    @property
    def DATABASE_CONNECTION_URL(self) -> str:
        """
        Get the appropriate database URL based on configuration
        Supports Railway, AWS RDS, RDS Proxy, and custom configurations
        """
        # If RDS proxy is enabled and configured
        if self.USE_RDS_PROXY and self.RDS_PROXY_ENDPOINT:
            if self.USE_IAM_AUTH:
                # IAM authentication - password will be generated by auth token
                ssl_part = "?sslmode=require" if self.AWS_RDS_USE_SSL else ""
                return f"postgresql://{self.AWS_RDS_USERNAME}@{self.RDS_PROXY_ENDPOINT}:{self.AWS_RDS_PORT}/{self.AWS_RDS_DATABASE}{ssl_part}"
            else:
                # Traditional authentication via proxy
                ssl_part = "?sslmode=require" if self.AWS_RDS_USE_SSL else ""
                return f"postgresql://{self.AWS_RDS_USERNAME}:{self.AWS_RDS_PASSWORD}@{self.RDS_PROXY_ENDPOINT}:{self.AWS_RDS_PORT}/{self.AWS_RDS_DATABASE}{ssl_part}"
        
        # Railway automatically provides DATABASE_URL - use it if available
        railway_db_url = os.getenv("DATABASE_URL")
        if railway_db_url and railway_db_url.startswith("postgresql://"):
            return railway_db_url
        
        # If AWS RDS endpoint is configured, build URL (direct connection)
        if self.AWS_RDS_ENDPOINT and self.AWS_RDS_USERNAME and self.AWS_RDS_PASSWORD:
            ssl_part = "?sslmode=require" if self.AWS_RDS_USE_SSL else ""
            return f"postgresql://{self.AWS_RDS_USERNAME}:{self.AWS_RDS_PASSWORD}@{self.AWS_RDS_ENDPOINT}:{self.AWS_RDS_PORT}/{self.AWS_RDS_DATABASE}{ssl_part}"
        
        # Default to explicit DATABASE_URL
        return self.DATABASE_URL

    @property
    def CACHE_URL(self) -> str:
        """
        Get the appropriate cache URL based on configuration preference
        Supports Railway, Redis, Valkey, and AWS ElastiCache
        """
        # If explicit CACHE_URL is provided, use it directly
        cache_url = os.getenv("CACHE_URL")
        if cache_url:
            return cache_url
            
        # Railway automatically provides REDIS_URL - use it if available
        railway_redis_url = os.getenv("REDIS_URL")
        if railway_redis_url and (railway_redis_url.startswith("redis://") or railway_redis_url.startswith("rediss://")):
            return railway_redis_url
            
        # If explicit Valkey URL is provided, use it
        if self.VALKEY_URL:
            return self.VALKEY_URL
        
        # If AWS ElastiCache endpoint is configured, build URL
        if self.AWS_ELASTICACHE_ENDPOINT:
            protocol = "rediss" if self.AWS_ELASTICACHE_USE_TLS else "redis"
            auth_part = f":{self.AWS_ELASTICACHE_AUTH_TOKEN}@" if self.AWS_ELASTICACHE_AUTH_TOKEN else ""
            return f"{protocol}://{auth_part}{self.AWS_ELASTICACHE_ENDPOINT}:{self.AWS_ELASTICACHE_PORT}/0"
        
        # Default to Redis URL
        return self.REDIS_URL


# Global settings instance
settings = Settings()

# Subscription tier configurations
SUBSCRIPTION_TIERS = {
    "free": {
        "name": "Free",
        "price": 0,
        "monthly_limit": settings.FREE_TIER_MONTHLY_LIMIT,
        "features": [
            "Basic synthetic data generation",
            "Up to 10,000 rows/month",
            "Standard AI models",
            "Community support"
        ],
        "max_datasets": 5,
        "max_custom_models": 0,
        "priority_support": False,
        "api_rate_limit": 100,
        "stripe_price_id": None,
        "paddle_product_id": None
    },
    "pro": {
        "name": "Pro", 
        "price": 29,
        "monthly_limit": 100000,
        "features": [
            "Advanced synthetic data generation",
            "Up to 100,000 rows/month", 
            "All AI models including Claude-3",
            "Priority email support",
            "Advanced privacy controls",
            "Custom data schemas"
        ],
        "max_datasets": 25,
        "max_custom_models": 5,
        "priority_support": True,
        "api_rate_limit": 1000,
        "stripe_price_id": "price_pro_monthly",
        "paddle_product_id": "pro_monthly"
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 299,
        "monthly_limit": 1000000,
        "features": [
            "Unlimited synthetic data generation",
            "Up to 1M rows/month",
            "All AI models + custom models",
            "24/7 phone & email support",
            "Advanced security & compliance",
            "Custom integrations",
            "Dedicated account manager"
        ],
        "max_datasets": 100,
        "max_custom_models": 50,
        "priority_support": True,
        "api_rate_limit": 10000,
        "stripe_price_id": "price_enterprise_monthly",
        "paddle_product_id": "enterprise_monthly"
    }
}

# Support tier configurations
SUPPORT_TIERS = {
    "community": {
        "name": "Community Support",
        "response_time": "48-72 hours",
        "channels": ["email", "community_forum"],
        "features": ["Documentation", "Community forums", "Email support"]
    },
    "priority": {
        "name": "Priority Support", 
        "response_time": "4-8 hours",
        "channels": ["email", "chat"],
        "features": ["Priority email", "Live chat", "Phone support"]
    },
    "enterprise": {
        "name": "Enterprise Support",
        "response_time": "1-2 hours",
        "channels": ["email", "chat", "phone", "dedicated_slack"],
        "features": ["24/7 phone support", "Dedicated account manager", "Custom SLA"]
    }
}

# Multi-region deployment configuration
DEPLOYMENT_REGIONS = {
    "US": {
        "name": "United States",
        "region": "us-east-1",
        "data_residency": "US",
        "compliance": ["CCPA", "SOC2", "HIPAA"],
        "endpoints": {
            "api": "https://api-us.synthos.dev",
            "frontend": "https://us.synthos.dev"
        }
    },
    "EU": {
        "name": "European Union",
        "region": "eu-west-1", 
        "data_residency": "EU",
        "compliance": ["GDPR", "SOC2"],
        "endpoints": {
            "api": "https://api-eu.synthos.dev",
            "frontend": "https://eu.synthos.dev"
        }
    },
    "APAC": {
        "name": "Asia-Pacific",
        "region": "ap-southeast-1",
        "data_residency": "APAC", 
        "compliance": ["SOC2"],
        "endpoints": {
            "api": "https://api-apac.synthos.dev",
            "frontend": "https://apac.synthos.dev"
        }
    }
} 