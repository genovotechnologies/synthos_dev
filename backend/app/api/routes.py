"""
Synthos API Routes
Main router for all API endpoints
"""

from fastapi import APIRouter

from app.api.v1 import auth, users, datasets, generation, payment, admin, privacy
from app.api.v1 import custom_models
from app.api.v1 import marketing

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(generation.router, prefix="/generation", tags=["generation"])
api_router.include_router(payment.router, prefix="/payment", tags=["payment"])
api_router.include_router(privacy.router, prefix="/privacy", tags=["privacy"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# Include custom models router
api_router.include_router(
    custom_models.router,
    prefix="/custom-models",
    tags=["custom-models"]
)

api_router.include_router(
    marketing.router,
    prefix="",
    tags=["marketing"]
) 