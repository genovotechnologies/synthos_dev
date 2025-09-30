"""
User Models for Synthos Platform
Handles user authentication, subscriptions, and usage tracking
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import json

from app.core.database import Base


class UserRole(enum.Enum):
    USER = "user"
    ADMIN = "admin"
    ENTERPRISE = "enterprise"


class UserStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class SubscriptionTier(enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    GROWTH = "growth"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"
    TRIAL = "trial"


class User(Base):
    """User model for authentication and profile management"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    
    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    email_verified_at = Column(DateTime, nullable=True)
    
    # Subscription information
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE, nullable=False)
    subscription_status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL, nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)
    
    # Profile information
    avatar_url = Column(String(500), nullable=True)
    timezone = Column(String(100), default="UTC", nullable=False)
    preferences = Column(JSON, nullable=True)  # User preferences as JSON
    
    # Security
    api_key_hash = Column(String(255), nullable=True)  # Hashed API key
    last_login_at = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)  # Alias for compatibility
    login_count = Column(Integer, default=0, nullable=False)
    

    # Email verification
    verification_token = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # Password reset fields
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    verification_token = Column(String(255), nullable=True)

    
    # User metadata
    user_metadata = Column(JSON, nullable=True)  # Additional user metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    custom_models = relationship("CustomModel", back_populates="owner", cascade="all, delete-orphan")
    usage = relationship("UserUsage", back_populates="user", uselist=False, cascade="all, delete-orphan")
    subscription = relationship("UserSubscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    stripe_customer = relationship("StripeCustomer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    paddle_customer = relationship("PaddleCustomer", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(email={self.email}, role={self.role})>"

    @property
    def is_admin(self) -> bool:
        return getattr(self, 'role') == UserRole.ADMIN

    @property
    def is_enterprise(self) -> bool:
        user_role = getattr(self, 'role', None)
        user_tier = getattr(self, 'subscription_tier', None)
        return user_role == UserRole.ENTERPRISE or user_tier == SubscriptionTier.ENTERPRISE

    @property
    def is_trial_expired(self) -> bool:
        trial_end = getattr(self, 'trial_ends_at', None)
        if trial_end is None:
            return False
        return datetime.utcnow() > trial_end

    @property
    def days_until_trial_expires(self) -> int:
        trial_end = getattr(self, 'trial_ends_at', None)
        if trial_end is None:
            return 0
        delta = trial_end - datetime.utcnow()
        return max(0, delta.days)

    def update_last_login(self):
        """Update last login timestamp and increment login count"""
        self.last_login_at = datetime.utcnow()
        current_count = getattr(self, 'login_count', 0) or 0
        self.login_count = current_count + 1

    def get_preferences(self, key: str, default=None):
        """Get user preference value"""
        prefs = getattr(self, 'preferences', None)
        if not prefs:
            return default
        if isinstance(prefs, dict):
            return prefs.get(key, default)
        return default

    def set_preference(self, key: str, value):
        """Set user preference value"""
        current_prefs = getattr(self, 'preferences', None)
        if not current_prefs or not isinstance(current_prefs, dict):
            self.preferences = {}
        
        # Ensure we're working with a dict
        if isinstance(self.preferences, dict):
            self.preferences[key] = value

    def can_create_custom_models(self) -> bool:
        """Check if user can create custom models"""
        tier = getattr(self, 'subscription_tier', SubscriptionTier.FREE)
        return tier in [SubscriptionTier.GROWTH, SubscriptionTier.ENTERPRISE]

    def get_custom_model_limit(self) -> int:
        """Get the maximum number of custom models user can have"""
        tier = getattr(self, 'subscription_tier', SubscriptionTier.FREE)
        if tier == SubscriptionTier.FREE:
            return 0
        elif tier == SubscriptionTier.STARTER:
            return 0  # No custom models for starter
        elif tier == SubscriptionTier.PROFESSIONAL:
            return 0  # No custom models for professional
        elif tier in [SubscriptionTier.GROWTH]:
            return 10  # Growth tier gets custom models
        elif tier == SubscriptionTier.ENTERPRISE:
            return 100  # Enterprise gets unlimited
        return 0


class UserSubscription(Base):
    """User subscription details"""
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Subscription details
    tier = Column(Enum(SubscriptionTier), nullable=False)
    status = Column(Enum(SubscriptionStatus), nullable=False)
    
    # Billing information
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    
    # Trial information
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    
    # Pricing
    monthly_price = Column(Float, nullable=True)
    yearly_price = Column(Float, nullable=True)
    currency = Column(String(3), default="USD", nullable=False)
    
    # Subscription metadata
    subscription_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="subscription")

    def __repr__(self):
        return f"<UserSubscription(user_id={self.user_id}, tier={self.tier})>"

    @property
    def is_active(self) -> bool:
        status = getattr(self, 'status', None)
        return status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]

    @property
    def is_trial(self) -> bool:
        status = getattr(self, 'status', None)
        return status == SubscriptionStatus.TRIAL

    @property
    def days_remaining(self) -> int:
        period_end = getattr(self, 'current_period_end', None)
        if not period_end:
            return 0
        delta = period_end - datetime.utcnow()
        return max(0, delta.days)


class UserUsage(Base):
    """Track user usage for billing and limits"""
    __tablename__ = "user_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Current month usage
    current_month_usage = Column(Integer, default=0, nullable=False)
    current_month_start = Column(DateTime, default=func.now(), nullable=False)
    
    # All-time usage
    total_rows_generated = Column(Integer, default=0, nullable=False)
    total_datasets_created = Column(Integer, default=0, nullable=False)
    total_custom_models = Column(Integer, default=0, nullable=False)
    total_api_calls = Column(Integer, default=0, nullable=False)
    
    # Storage usage
    datasets_storage_mb = Column(Float, default=0.0, nullable=False)
    models_storage_mb = Column(Float, default=0.0, nullable=False)
    
    # Last usage tracking
    last_generation_at = Column(DateTime, nullable=True)
    last_api_call_at = Column(DateTime, nullable=True)
    last_model_upload_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="usage")

    def __repr__(self):
        return f"<UserUsage(user_id={self.user_id}, current_month={self.current_month_usage})>"

    def reset_monthly_usage(self):
        """Reset monthly usage counter"""
        self.current_month_usage = 0
        self.current_month_start = datetime.utcnow()

    def add_generation_usage(self, rows: int):
        """Add generation usage"""
        # Check if we need to reset monthly counter
        month_start = getattr(self, 'current_month_start', datetime.utcnow())
        if month_start.month != datetime.utcnow().month:
            self.reset_monthly_usage()
        
        current_usage = getattr(self, 'current_month_usage', 0) or 0
        total_rows = getattr(self, 'total_rows_generated', 0) or 0
        
        self.current_month_usage = current_usage + rows
        self.total_rows_generated = total_rows + rows
        self.last_generation_at = datetime.utcnow()

    def add_dataset_usage(self, size_mb: float):
        """Add dataset storage usage"""
        current_count = getattr(self, 'total_datasets_created', 0) or 0
        current_storage = getattr(self, 'datasets_storage_mb', 0.0) or 0.0
        
        self.total_datasets_created = current_count + 1
        self.datasets_storage_mb = current_storage + size_mb

    def add_custom_model_usage(self, size_mb: float):
        """Add custom model storage usage"""
        current_count = getattr(self, 'total_custom_models', 0) or 0
        current_storage = getattr(self, 'models_storage_mb', 0.0) or 0.0
        
        self.total_custom_models = current_count + 1
        self.models_storage_mb = current_storage + size_mb
        self.last_model_upload_at = datetime.utcnow()

    def remove_custom_model_usage(self, size_mb: float):
        """Remove custom model storage usage"""
        current_count = getattr(self, 'total_custom_models', 0) or 0
        current_storage = getattr(self, 'models_storage_mb', 0.0) or 0.0
        
        self.total_custom_models = max(0, current_count - 1)
        self.models_storage_mb = max(0.0, current_storage - size_mb)

    def add_api_usage(self):
        """Add API call usage"""
        current_count = getattr(self, 'total_api_calls', 0) or 0
        self.total_api_calls = current_count + 1
        self.last_api_call_at = datetime.utcnow()

    def get_monthly_limit(self, tier: SubscriptionTier) -> int:
        """Get monthly generation limit based on subscription tier"""
        limits = {
            SubscriptionTier.FREE: 10000,
            SubscriptionTier.STARTER: 100000,
            SubscriptionTier.PROFESSIONAL: 1000000,
            SubscriptionTier.ENTERPRISE: 10000000
        }
        return limits.get(tier, 10000)

    def get_storage_limit_mb(self, tier: SubscriptionTier) -> float:
        """Get storage limit in MB based on subscription tier"""
        limits = {
            SubscriptionTier.FREE: 100.0,     # 100 MB
            SubscriptionTier.STARTER: 1024.0,  # 1 GB
            SubscriptionTier.PROFESSIONAL: 10240.0,  # 10 GB
            SubscriptionTier.ENTERPRISE: 102400.0    # 100 GB
        }
        return limits.get(tier, 100.0)

    def is_over_monthly_limit(self, tier: SubscriptionTier) -> bool:
        """Check if user is over monthly generation limit"""
        current_usage = getattr(self, 'current_month_usage', 0) or 0
        return current_usage >= self.get_monthly_limit(tier)

    def is_over_storage_limit(self, tier: SubscriptionTier) -> bool:
        """Check if user is over storage limit"""
        dataset_storage = getattr(self, 'datasets_storage_mb', 0.0) or 0.0
        model_storage = getattr(self, 'models_storage_mb', 0.0) or 0.0
        total_storage = dataset_storage + model_storage
        return total_storage >= self.get_storage_limit_mb(tier) 