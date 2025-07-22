"""
Admin API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.services.auth import get_current_user
from app.models.user import User, UserRole

router = APIRouter()

@router.get("/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    """Get system statistics"""
    return {"message": "Admin endpoint working"} 