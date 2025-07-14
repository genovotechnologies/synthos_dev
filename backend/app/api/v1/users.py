"""
User Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
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