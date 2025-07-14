"""
Admin API Endpoints
"""

from fastapi import APIRouter, Depends
from app.models.user import User
from app.services.auth import AuthService

router = APIRouter()

@router.get("/stats")
async def get_admin_stats(
    current_user: User = Depends(AuthService.get_admin_user)
):
    """Get system statistics"""
    return {"message": "Admin endpoint working"} 