"""
Advanced Authentication Service
Enterprise-grade authentication with JWT, rate limiting, and security features
"""

import jwt
from passlib.hash import bcrypt
import secrets
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
import redis.asyncio as redis
from email_validator import validate_email, EmailNotValidError
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis import get_redis_client
from app.core.database import get_db
from app.models.user import User, UserRole, UserStatus, UserUsage, UserSubscription, SubscriptionTier

logger = get_logger(__name__)

# OAuth2 scheme for FastAPI
security = HTTPBearer()


class TokenType(Enum):
    """Token types for different authentication purposes"""
    ACCESS = "access"
    REFRESH = "refresh"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    API_KEY = "api_key"


@dataclass
class AuthTokens:
    """Authentication token pair"""
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"


class AuthService:
    """Advanced authentication service"""
    
    def __init__(self):
        self.redis_client = None
        self.password_salt_rounds = 12
        self.max_login_attempts = 5
        self.lockout_duration = 900  # 15 minutes
        
        
    async def warm_up(self):
        """Warm up the auth service"""
        self.redis_client = await get_redis_client()
        logger.info("AuthService warmed up successfully")
    
    async def authenticate_user(
        self, 
        email: str, 
        password: str,
        ip_address: str = None
    ) -> Optional[AuthTokens]:
        """Authenticate user with advanced security checks"""
        
        try:
            # Validate email format
            valid_email = validate_email(email)
            email = valid_email.email
            
        except EmailNotValidError:
            logger.warning("Invalid email format attempted", email=email)
            return None
        
        # Check rate limiting
        if not await self._check_rate_limit(email, ip_address):
            logger.warning("Rate limit exceeded for authentication", email=email, ip=ip_address)
            return None
        
        # Check account lockout
        if await self._is_account_locked(email):
            logger.warning("Account locked due to too many failed attempts", email=email)
            return None
        
        # Get user from database
        user = await self._get_user_by_email(email)
        if not user:
            await self._record_failed_attempt(email, ip_address)
            logger.warning("Authentication failed - user not found", email=email)
            return None
        
        # Check user status
        if user.status != UserStatus.ACTIVE:
            logger.warning("Authentication failed - inactive user", email=email, status=user.status)
            return None
        
        # Verify password
        if not self._verify_password(password, user.hashed_password):
            await self._record_failed_attempt(email, ip_address)
            logger.warning("Authentication failed - invalid password", email=email)
            return None
        
        # Clear failed attempts on successful login
        await self._clear_failed_attempts(email)
        
        # Generate tokens
        tokens = await self._generate_auth_tokens(user)
        
        # Log successful authentication
        logger.info(
            "User authenticated successfully",
            user_id=user.id,
            email=email,
            ip=ip_address,
            role=user.role
        )
        
        # Update last login
        await self._update_last_login(user.id, ip_address)
        
        return tokens
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[AuthTokens]:
        """Refresh access token using refresh token"""
        
        try:
            # Decode refresh token
            payload = jwt.decode(
                refresh_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            if payload.get("type") != TokenType.REFRESH.value:
                return None
            
            user_id = payload.get("user_id")
            if not user_id:
                return None
            
            # Check if refresh token is blacklisted
            if await self._is_token_blacklisted(refresh_token):
                logger.warning("Blacklisted refresh token used", user_id=user_id)
                return None
            
            # Get user
            user = await self._get_user_by_id(user_id)
            if not user or user.status != UserStatus.ACTIVE:
                return None
            
            # Generate new tokens
            new_tokens = await self._generate_auth_tokens(user)
            
            # Blacklist old refresh token
            await self._blacklist_token(refresh_token)
            
            logger.info("Access token refreshed", user_id=user_id)
            return new_tokens
            
        except jwt.ExpiredSignatureError:
            logger.warning("Expired refresh token used")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid refresh token used")
            return None
    
    async def verify_access_token(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode access token"""
        
        try:
            payload = jwt.decode(
                access_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            if payload.get("type") != TokenType.ACCESS.value:
                return None
            
            # Check if token is blacklisted
            if await self._is_token_blacklisted(access_token):
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def logout_user(self, access_token: str, refresh_token: str) -> bool:
        """Logout user by blacklisting tokens"""
        
        try:
            # Blacklist both tokens
            await asyncio.gather(
                self._blacklist_token(access_token),
                self._blacklist_token(refresh_token)
            )
            
            # Get user info for logging
            payload = jwt.decode(
                access_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            logger.info("User logged out", user_id=payload.get("user_id"))
            return True
            
        except Exception as e:
            logger.error("Logout failed", error=str(e))
            return False
    
    async def generate_password_reset_token(self, email: str) -> Optional[str]:
        """Generate password reset token"""
        
        user = await self._get_user_by_email(email)
        if not user:
            return None
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        
        # Store in Redis with expiration (1 hour)
        key = f"password_reset:{reset_token}"
        await self.redis_client.setex(
            key,
            3600,  # 1 hour
            user.id
        )
        
        logger.info("Password reset token generated", user_id=user.id, email=email)
        return reset_token
    
    async def verify_password_reset_token(self, token: str) -> Optional[int]:
        """Verify password reset token and return user ID"""
        
        key = f"password_reset:{token}"
        user_id = await self.redis_client.get(key)
        
        if user_id:
            return int(user_id)
        return None
    
    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user password using reset token"""
        
        user_id = await self.verify_password_reset_token(token)
        if not user_id:
            return False
        
        # Hash new password
        password_hash = self._hash_password(new_password)
        
        # Update password in database
        success = await self._update_user_password(user_id, password_hash)
        
        if success:
            # Delete reset token
            key = f"password_reset:{token}"
            await self.redis_client.delete(key)
            
            # Invalidate all user sessions
            await self._invalidate_user_sessions(user_id)
            
            logger.info("Password reset successfully", user_id=user_id)
            return True
        
        return False
    
    async def generate_api_key(self, user_id: int, name: str) -> str:
        """Generate API key for user"""
        
        api_key = f"sk_{secrets.token_urlsafe(32)}"
        
        # Store API key mapping
        key = f"api_key:{api_key}"
        await self.redis_client.setex(
            key,
            86400 * 365,  # 1 year
            f"{user_id}:{name}"
        )
        
        logger.info("API key generated", user_id=user_id, key_name=name)
        return api_key
    
    async def verify_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Verify API key and return user info"""
        
        if not api_key.startswith("sk_"):
            return None
        
        key = f"api_key:{api_key}"
        value = await self.redis_client.get(key)
        
        if not value:
            return None
        
        try:
            user_id, key_name = value.decode().split(":", 1)
            user = await self._get_user_by_id(int(user_id))
            
            if user and user.status == UserStatus.ACTIVE:
                return {
                    "user_id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "key_name": key_name
                }
        except ValueError:
            pass
        
        return None
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hash(password)
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.verify(password, password_hash)
        except Exception:
            return False
    
    async def _generate_auth_tokens(self, user: User) -> AuthTokens:
        """Generate access and refresh token pair"""
        
        now = datetime.utcnow()
        
        # Access token payload
        access_payload = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role.value,
            "type": TokenType.ACCESS.value,
            "iat": now,
            "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        
        # Refresh token payload
        refresh_payload = {
            "user_id": user.id,
            "type": TokenType.REFRESH.value,
            "iat": now,
            "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        }
        
        # Generate tokens
        access_token = jwt.encode(
            access_payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        
        refresh_token = jwt.encode(
            refresh_payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        
        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def _check_rate_limit(self, email: str, ip_address: str = None) -> bool:
        """Check if request is within rate limits"""
        
        # Email-based rate limiting
        email_key = f"rate_limit:email:{email}"
        email_attempts = await self.redis_client.get(email_key)
        
        if email_attempts and int(email_attempts) >= 10:  # 10 attempts per hour
            return False
        
        # IP-based rate limiting
        if ip_address:
            ip_key = f"rate_limit:ip:{ip_address}"
            ip_attempts = await self.redis_client.get(ip_key)
            
            if ip_attempts and int(ip_attempts) >= 20:  # 20 attempts per hour
                return False
        
        return True
    
    async def _record_failed_attempt(self, email: str, ip_address: str = None):
        """Record failed authentication attempt"""
        
        # Record email-based attempt
        email_key = f"rate_limit:email:{email}"
        await self.redis_client.incr(email_key)
        await self.redis_client.expire(email_key, 3600)  # 1 hour
        
        # Record IP-based attempt
        if ip_address:
            ip_key = f"rate_limit:ip:{ip_address}"
            await self.redis_client.incr(ip_key)
            await self.redis_client.expire(ip_key, 3600)  # 1 hour
        
        # Check for account lockout
        failed_key = f"failed_attempts:{email}"
        attempts = await self.redis_client.incr(failed_key)
        await self.redis_client.expire(failed_key, self.lockout_duration)
        
        if attempts >= self.max_login_attempts:
            # Lock account
            lock_key = f"account_locked:{email}"
            await self.redis_client.setex(lock_key, self.lockout_duration, "locked")
            
            logger.warning(
                "Account locked due to too many failed attempts",
                email=email,
                attempts=attempts
            )
    
    
    async def _is_account_locked(self, email: str) -> bool:
        """Check if account is locked"""
        lock_key = f"account_locked:{email}"
        return bool(await self.redis_client.get(lock_key))
    
    async def _clear_failed_attempts(self, email: str):
        """Clear failed attempt counters"""
        keys = [
            f"failed_attempts:{email}",
            f"account_locked:{email}",
            f"rate_limit:email:{email}"
        ]
        await self.redis_client.delete(*keys)
    
    async def _blacklist_token(self, token: str):
        """Add token to blacklist"""
        try:
            # Decode to get expiration
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_exp": False}  # Don't verify expiration for blacklisting
            )
            
            exp = payload.get("exp")
            if exp:
                exp_datetime = datetime.fromtimestamp(exp)
                if exp_datetime > datetime.utcnow():
                    # Only blacklist if not expired
                    ttl = int((exp_datetime - datetime.utcnow()).total_seconds())
                    key = f"blacklisted_token:{token}"
                    await self.redis_client.setex(key, ttl, "blacklisted")
                    
        except jwt.InvalidTokenError:
            # Still blacklist invalid tokens with default TTL
            key = f"blacklisted_token:{token}"
            await self.redis_client.setex(key, 86400, "blacklisted")  # 24 hours
    
    async def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        key = f"blacklisted_token:{token}"
        return bool(await self.redis_client.get(key))
    
    async def _invalidate_user_sessions(self, user_id: int):
        """Invalidate all sessions for a user"""
        # This would require storing session info in Redis
        # For now, we'll use a simple user-based blacklist timestamp
        key = f"user_sessions_invalidated:{user_id}"
        await self.redis_client.setex(key, 86400 * 7, datetime.utcnow().isoformat())
    
    async def setup_new_user(self, user_id: int, db: Session) -> bool:
        """
        Setup new user with default subscription and usage tracking
        
        Args:
            user_id: User ID
            db: Database session
            
        Returns:
            True if setup successful, False otherwise
        """
        try:
            from app.models.user import UserSubscription, UserUsage, SubscriptionTier
            from datetime import datetime, timedelta
            
            # Create default subscription
            subscription = UserSubscription(
                user_id=user_id,
                tier=SubscriptionTier.FREE,
                status="active",
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=30)
            )
            db.add(subscription)
            
            # Create usage tracking
            usage = UserUsage(
                user_id=user_id,
                current_month_usage=0,
                current_month_start=datetime.utcnow(),
                total_rows_generated=0,
                total_datasets_created=0,
                total_api_calls=0
            )
            db.add(usage)
            
            db.commit()
            logger.info(f"New user setup completed for user_id: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup new user {user_id}: {e}")
            db.rollback()
            return False
    
    def generate_verification_token(self, email: str) -> str:
        """
        Generate email verification token
        
        Args:
            email: User email address
            
        Returns:
            Verification token
        """
        from app.core.security import generate_verification_token
        return generate_verification_token(email)
    
    def verify_verification_token(self, token: str) -> Optional[str]:
        """
        Verify email verification token
        
        Args:
            token: Verification token to verify
            
        Returns:
            Email address if valid, None otherwise
        """
        from app.core.security import verify_verification_token
        return verify_verification_token(token)
    
    async def generate_password_reset_token_async(self, email: str) -> Optional[str]:
        """
        Generate password reset token (async wrapper)
        
        Args:
            email: User email address
            
        Returns:
            Password reset token or None if user not found
        """
        # Check if user exists
        try:
            db = next(get_db())
            user = db.query(User).filter(User.email == email).first()
            if not user:
                return None
            
            from app.core.security import generate_password_reset_token
            return generate_password_reset_token(email)
            
        except Exception as e:
            logger.error(f"Failed to generate password reset token: {e}")
            return None

    # Database interaction methods
    async def _get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email from database"""
        try:
            from app.core.database import get_db
            db = next(get_db())
            return db.query(User).filter(User.email == email).first()
        except Exception as e:
            logger.error(f"Failed to get user by email: {e}")
            return None
    
    async def _get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID from database"""
        try:
            from app.core.database import get_db
            db = next(get_db())
            return db.query(User).filter(User.id == user_id).first()
        except Exception as e:
            logger.error(f"Failed to get user by ID: {e}")
            return None
    
    async def _update_last_login(self, user_id: int, ip_address: str = None):
        """Update user's last login timestamp"""
        try:
            from app.core.database import get_db
            from datetime import datetime
            db = next(get_db())
            db.query(User).filter(User.id == user_id).update({
                User.last_login_at: datetime.utcnow(),
                User.last_login: datetime.utcnow()
            })
            db.commit()
        except Exception as e:
            logger.error(f"Failed to update last login: {e}")
    
    async def _update_user_password(self, user_id: int, password_hash: str) -> bool:
        """Update user password in database"""
        try:
            from app.core.database import get_db
            db = next(get_db())
            db.query(User).filter(User.id == user_id).update({
                User.hashed_password: password_hash
            })
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to update user password: {e}")
            return False

# FastAPI Dependencies
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI dependency to get current authenticated user"""
    
    auth_service = AuthService()
    
    # Verify token
    payload = await auth_service.verify_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """FastAPI dependency to get current admin user"""
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user

# Add these methods to AuthService class for static access
AuthService.get_current_user = get_current_user
AuthService.get_admin_user = get_admin_user 