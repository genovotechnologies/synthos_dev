"""
User Schemas
Pydantic models for user-related endpoints
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = "admin"
    USER = "user"
    ENTERPRISE = "enterprise"


class SubscriptionTier(str, Enum):
    """Subscription tier enumeration"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class UserProfile(BaseModel):
    """User profile schema"""
    id: int
    email: str
    full_name: str
    company_name: Optional[str] = None
    role: UserRole
    subscription_tier: SubscriptionTier
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    avatar_url: Optional[str] = None
    phone_number: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """User profile update schema"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)
    avatar_url: Optional[str] = Field(None, max_length=500)


class UserStats(BaseModel):
    """User statistics schema"""
    total_rows_generated: int
    total_datasets_created: int
    total_api_calls: int
    current_month_usage: int
    monthly_limit: int
    usage_percentage: float
    subscription_tier: SubscriptionTier


class APIKeyCreate(BaseModel):
    """API key creation schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class APIKeyResponse(BaseModel):
    """API key response schema"""
    id: int
    name: str
    key: str
    description: Optional[str] = None
    created_at: datetime
    last_used: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True


class APIKeyList(BaseModel):
    """API key list item schema"""
    id: int
    name: str
    key_preview: str  # Only show last 4 characters
    description: Optional[str] = None
    created_at: datetime
    last_used: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    """Password reset request schema"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema"""
    token: str
    new_password: str = Field(..., min_length=8)

    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class EmailVerificationRequest(BaseModel):
    """Email verification request schema"""
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    """Email verification confirmation schema"""
    token: str


class UserPreferences(BaseModel):
    """User preferences schema"""
    email_notifications: bool = True
    marketing_emails: bool = False
    data_retention_days: int = 90
    default_privacy_level: str = "medium"
    preferred_file_format: str = "csv"

    class Config:
        from_attributes = True


class UserPreferencesUpdate(BaseModel):
    """User preferences update schema"""
    email_notifications: Optional[bool] = None
    marketing_emails: Optional[bool] = None
    data_retention_days: Optional[int] = Field(None, ge=30, le=365)
    default_privacy_level: Optional[str] = Field(None, regex="^(low|medium|high|maximum)$")
    preferred_file_format: Optional[str] = Field(None, regex="^(csv|json|parquet|xlsx)$") 