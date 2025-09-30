"""
Authentication API Endpoints
JWT-based authentication with enterprise features
"""

from datetime import timedelta, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash, generate_password_reset_token, verify_password_reset_token
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.auth import Token, UserCreate, UserLogin, UserResponse
from app.schemas.user import UserProfile, PasswordResetRequest, PasswordResetConfirm, EmailVerificationRequest
from app.services.auth import AuthService, get_current_user
from app.services.email import EmailService
from app.core.logging import audit_logger

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user account"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        company=user_data.company_name,
        role=UserRole.USER,
        is_active=True,
        is_verified=False
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create default subscription and usage tracking
    auth_service = AuthService()
    await auth_service.setup_new_user(db_user.id, db)
    
    # Send verification email
    email_service = EmailService()
    verification_token = auth_service.generate_verification_token(db_user.email)
    await email_service.send_verification_email(db_user.email, verification_token)
    
    # Log registration event
    client_ip = getattr(request.client, 'host', '127.0.0.1') if request.client else '127.0.0.1'
    user_agent = request.headers.get("user-agent", "Unknown") if request else "Unknown"
    
    audit_logger.log_user_action(
        user_id=str(db_user.id),
        action="user_registered",
        resource="user",
        resource_id=str(db_user.id),
        ip_address=client_ip,
        user_agent=user_agent,
        metadata={
            "email": db_user.email,
            "company": db_user.company,
        }
    )
    
    return UserResponse.model_validate(db_user)


@router.post("/login", response_model=Token)
async def login_user(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login user and return JWT token"""
    
    # Authenticate user
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        client_ip = getattr(request.client, 'host', '127.0.0.1') if request.client else '127.0.0.1'
        user_agent = request.headers.get("user-agent", "Unknown")
        
        audit_logger.log_user_action(
            user_id="anonymous",
            action="login_failed",
            resource="user",
            ip_address=client_ip,
            user_agent=user_agent,
            metadata={"email": form_data.username}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    # Update last login using proper SQLAlchemy update
    db.query(User).filter(User.id == user.id).update({
        User.last_login_at: datetime.utcnow()
    })
    db.commit()
    db.refresh(user)
    
    # Set HttpOnly Secure cookie for cross-site (api.synthos.dev -> www.synthos.dev)
    response.set_cookie(
        key="synthos_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        domain=".synthos.dev",
        path="/",
    )

    # Log successful login
    client_ip = getattr(request.client, 'host', '127.0.0.1') if request.client else '127.0.0.1'
    user_agent = request.headers.get("user-agent", "Unknown")
    
    audit_logger.log_user_action(
        user_id=str(user.id),
        action="user_login",
        resource="user",
        resource_id=str(user.id),
        ip_address=client_ip,
        user_agent=user_agent,
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserResponse.model_validate(user)
    }


@router.post("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify user email address"""
    
    auth_service = AuthService()
    email = auth_service.verify_verification_token(token)
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user verification status using proper SQLAlchemy update
    db.query(User).filter(User.id == user.id).update({
        User.is_verified: True,
        User.verification_token: None
    })
    db.commit()
    db.refresh(user)
    
    # Log verification
    audit_logger.log_user_action(
        user_id=str(user.id),
        action="email_verified",
        resource="user",
        resource_id=str(user.id),
    )
    
    return {"message": "Email verified successfully"}


@router.post("/forgot-password")
async def forgot_password(
    email: str,
    db: Session = Depends(get_db)
):
    """Send password reset email"""
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = generate_password_reset_token(email)
    
    # Store token in database using proper SQLAlchemy update
    db.query(User).filter(User.id == user.id).update({
        User.reset_token: reset_token,
        User.reset_token_expires: datetime.utcnow() + timedelta(hours=1)
    })
    db.commit()
    db.refresh(user)
    
    # Send reset email
    email_service = EmailService()
    await email_service.send_password_reset_email(user.email, reset_token)
    
    # Log password reset request
    audit_logger.log_user_action(
        user_id=str(user.id),
        action="password_reset_requested",
        resource="user",
        resource_id=str(user.id),
    )
    
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    """Reset user password with token"""
    
    # Verify token
    email = verify_password_reset_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if token matches stored token and is not expired
    current_time = datetime.utcnow()
    if (user.reset_token is None or 
        user.reset_token != token or 
        user.reset_token_expires is None or 
        user.reset_token_expires < current_time):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password using proper SQLAlchemy update
    new_hashed_password = get_password_hash(new_password)
    db.query(User).filter(User.id == user.id).update({
        User.hashed_password: new_hashed_password,
        User.reset_token: None,
        User.reset_token_expires: None
    })
    db.commit()
    db.refresh(user)
    
    # Log password reset
    audit_logger.log_user_action(
        user_id=str(user.id),
        action="password_reset_completed",
        resource="user",
        resource_id=str(user.id),
    )
    
    return {"message": "Password reset successfully"}


@router.post("/refresh-token", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email, "user_id": current_user.id, "role": current_user.role.value},
        expires_delta=access_token_expires
    )
    
    # Log token refresh
    audit_logger.log_user_action(
        user_id=str(current_user.id),
        action="token_refreshed",
        resource="user",
        resource_id=str(current_user.id),
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserResponse.model_validate(current_user)
    }


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Logout user and invalidate token"""
    
    # Log logout
    client_ip = getattr(request.client, 'host', '127.0.0.1') if request.client else '127.0.0.1'
    user_agent = request.headers.get("user-agent", "Unknown") if request else "Unknown"
    
    audit_logger.log_user_action(
        user_id=str(current_user.id),
        action="user_logout",
        resource="user",
        resource_id=str(current_user.id),
        ip_address=client_ip,
        user_agent=user_agent,
    )
    
    return {"message": "Successfully logged out"} 


# Alias endpoints for frontend compatibility
@router.post("/signup", response_model=UserResponse)
async def signup_user(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user account"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        # Normalize company/company_name from request
        company_value = getattr(user_data, "company_name", None) or getattr(user_data, "company", None)
        db_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            company=company_value,
            role=UserRole.USER,
            is_active=True,
            is_verified=False
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Log successful registration
        audit_logger.info(
            "User registration successful",
            user_id=db_user.id,
            email=db_user.email,
            ip_address=request.client.host if request.client else None
        )
        
        return UserResponse(
            id=db_user.id,
            email=db_user.email,
            full_name=db_user.full_name,
            company_name=getattr(db_user, "company", None),
            is_active=db_user.is_active,
            is_verified=db_user.is_verified,
            subscription_tier=db_user.subscription_tier.value,
            created_at=db_user.created_at,
            last_login=getattr(db_user, "last_login_at", None)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        audit_logger.error(
            "Registration failed",
            email=user_data.email,
            error=str(e),
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error"
        )

@router.post("/signin", response_model=Token)
async def signin_user(
    request: Request,
    response: Response,
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Sign in user with email and password"""
    try:
        # Find user by email
        user = db.query(User).filter(User.email == user_data.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(user_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        # Set HttpOnly Secure cookie for cross-site (api.synthos.dev -> www.synthos.dev)
        response.set_cookie(
            key="synthos_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=int(access_token_expires.total_seconds()),
            domain=".synthos.dev",
            path="/",
        )

        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Log successful login
        audit_logger.info(
            "User login successful",
            user_id=user.id,
            email=user.email,
            ip_address=request.client.host if request.client else None
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": int(access_token_expires.total_seconds()),
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        audit_logger.error(
            "Login failed",
            email=user_data.email,
            error=str(e),
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )

@router.post("/create-admin")
async def create_admin(
    email: str = Body(...),
    password: str = Body(...),
    secret: str = Body(...),
    db: Session = Depends(get_db)
):
    """Create the first admin user. Only allowed if no admin exists and secret matches."""
    from app.core.security import get_password_hash
    from app.models.user import User, UserRole
    ADMIN_CREATION_SECRET = settings.ADMIN_CREATION_SECRET or "changeme"  # Set in env
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(status_code=403, detail="Admin already exists")
    if secret != ADMIN_CREATION_SECRET:
        raise HTTPException(status_code=401, detail="Invalid secret")
    hashed_password = get_password_hash(password)
    admin_user = User(
        email=email,
        hashed_password=hashed_password,
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    return {"status": "admin created", "email": admin_user.email} 