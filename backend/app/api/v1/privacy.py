"""
Privacy API Endpoints
"""

from fastapi import APIRouter, Depends
from app.models.user import User
from app.services.auth import AuthService

router = APIRouter()

@router.get("/settings")
async def get_privacy_settings(
    current_user: User = Depends(AuthService.get_current_user)
):
    """Get privacy settings"""
    return {"privacy_level": "medium", "data_retention": 30} 