"""
Authentication Schemas
Pydantic models for authentication endpoints
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    """JWT token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    """JWT token payload schema"""
    sub: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class UserLogin(BaseModel):
    """User login request schema"""
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserCreate(BaseModel):
    """User registration request schema"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1, max_length=100)
    company_name: Optional[str] = Field(None, max_length=100)


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    email: str
    full_name: str
    company_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    subscription_tier: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    """Password reset request schema"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema"""
    token: str
    new_password: str = Field(..., min_length=8)


class PasswordChange(BaseModel):
    """Password change schema"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class EmailVerificationRequest(BaseModel):
    """Email verification request schema"""
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    """Email verification confirmation schema"""
    token: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str 