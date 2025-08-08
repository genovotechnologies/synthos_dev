"""
User Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User, UserRole
from app.services.auth import AuthService

router = APIRouter()

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(AuthService.get_current_user)
):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "subscription_tier": current_user.subscription_tier,
        "created_at": current_user.created_at
    }

class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    company: str | None = None
    role: str | None = None
    bio: str | None = None

@router.put("/profile")
async def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    """Update current user's profile"""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.company is not None:
        current_user.company = payload.company
    if payload.role is not None:
        try:
            current_user.role = UserRole(payload.role)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid role value")
    # Store bio in user_metadata
    metadata = current_user.user_metadata or {}
    if payload.bio is not None:
        metadata["bio"] = payload.bio
        current_user.user_metadata = metadata
    try:
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "company": current_user.company,
        "role": current_user.role,
        "user_metadata": current_user.user_metadata,
    }

@router.get("/usage")
async def get_user_usage(
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user usage statistics"""
    # Mock usage data - replace with actual database queries
    return {
        "current_month_usage": 2500,
        "total_rows_generated": 15000,
        "total_datasets_created": 5,
        "monthly_limit": 10000 if current_user.subscription_tier == "free" else 1000000,
        "storage_limit_mb": 100 if current_user.subscription_tier == "free" else 10000,
        "datasets_storage_mb": 25.7,
        "api_calls_this_month": 150,
        "percentage_used": 25.0
    } 