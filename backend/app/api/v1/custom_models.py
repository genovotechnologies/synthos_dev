"""
Custom Models API Endpoints
Enterprise custom model management with tier-based access control
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import asyncio
import boto3
import json
import os
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, SubscriptionTier
from app.models.dataset import CustomModel, CustomModelType, CustomModelStatus
from app.services.auth import get_current_user
from app.core.logging import get_logger
from app.services.custom_model_service import CustomModelService

router = APIRouter()
logger = get_logger(__name__)

# Initialize custom model service
custom_model_service = CustomModelService()

@router.get("/")
async def list_custom_models(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's custom models with tier-based filtering"""
    
    # Check if user can access custom models
    if not current_user.can_create_custom_models():
        raise HTTPException(
            status_code=403,
            detail="Custom models require Professional or Enterprise subscription"
        )
    
    models = db.query(CustomModel).filter(
        CustomModel.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "model_type": model.model_type.value,
            "status": model.status.value,
            "accuracy_score": model.accuracy_score,
            "version": model.version,
            "framework_version": model.framework_version,
            "supported_column_types": model.get_supported_column_types(),
            "max_columns": model.max_columns,
            "max_rows": model.max_rows,
            "requires_gpu": model.requires_gpu,
            "usage_count": model.usage_count,
            "last_used_at": model.last_used_at,
            "tags": model.get_tags(),
            "created_at": model.created_at,
            "updated_at": model.updated_at
        }
        for model in models
    ]

@router.post("/upload")
async def upload_custom_model(
    name: str = Form(...),
    description: str = Form(None),
    model_type: CustomModelType = Form(...),
    version: str = Form("1.0.0"),
    framework_version: str = Form(None),
    supported_column_types: str = Form("[]"),  # JSON string
    max_columns: int = Form(50),
    max_rows: int = Form(1000000),
    requires_gpu: bool = Form(False),
    tags: str = Form("[]"),  # JSON string
    model_file: UploadFile = File(...),
    config_file: Optional[UploadFile] = File(None),
    requirements_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a new custom model"""
    
    # Check tier access
    if not current_user.can_create_custom_models():
        raise HTTPException(
            status_code=403,
            detail="Custom models require Professional or Enterprise subscription"
        )
    
    # Check model limit
    current_count = db.query(CustomModel).filter(
        CustomModel.owner_id == current_user.id
    ).count()
    
    max_models = current_user.get_custom_model_limit()
    if current_count >= max_models:
        raise HTTPException(
            status_code=403,
            detail=f"Custom model limit reached ({max_models}). Upgrade for more models."
        )
    
    # Validate file sizes
    max_file_size = 1024 * 1024 * 1024  # 1GB for Enterprise, 100MB for Professional
    if current_user.subscription_tier == SubscriptionTier.PROFESSIONAL:
        max_file_size = 100 * 1024 * 1024  # 100MB
    
    if model_file.size > max_file_size:
        raise HTTPException(
            status_code=413,
            detail=f"Model file too large. Maximum size: {max_file_size // (1024*1024)}MB"
        )
    
    try:
        # Parse JSON fields
        supported_types = json.loads(supported_column_types)
        tag_list = json.loads(tags)
        
        # Create model record
        custom_model = CustomModel(
            owner_id=current_user.id,
            name=name,
            description=description,
            model_type=model_type,
            status=CustomModelStatus.UPLOADING,
            version=version,
            framework_version=framework_version,
            supported_column_types=supported_types,
            max_columns=max_columns,
            max_rows=max_rows,
            requires_gpu=requires_gpu,
            tags=tag_list,
            file_size=model_file.size
        )
        
        db.add(custom_model)
        db.commit()
        db.refresh(custom_model)
        
        # Upload files to S3 in background
        asyncio.create_task(
            custom_model_service.upload_model_files(
                custom_model, model_file, config_file, requirements_file
            )
        )
        
        return {
            "id": custom_model.id,
            "status": "uploading",
            "message": "Model upload started. You'll be notified when validation is complete."
        }
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON in supported_column_types or tags fields"
        )
    except Exception as e:
        logger.error(f"Model upload failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Model upload failed. Please try again."
        )

@router.get("/{model_id}")
async def get_custom_model(
    model_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific custom model"""
    
    model = db.query(CustomModel).filter(
        CustomModel.id == model_id,
        CustomModel.owner_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Custom model not found")
    
    return {
        "id": model.id,
        "name": model.name,
        "description": model.description,
        "model_type": model.model_type.value,
        "status": model.status.value,
        "version": model.version,
        "framework_version": model.framework_version,
        "accuracy_score": model.accuracy_score,
        "validation_metrics": model.get_validation_metrics(),
        "supported_column_types": model.get_supported_column_types(),
        "max_columns": model.max_columns,
        "max_rows": model.max_rows,
        "requires_gpu": model.requires_gpu,
        "usage_count": model.usage_count,
        "last_used_at": model.last_used_at,
        "file_size": model.file_size,
        "tags": model.get_tags(),
        "created_at": model.created_at,
        "updated_at": model.updated_at,
        "model_s3_key": model.model_s3_key,
        "config_s3_key": model.config_s3_key,
        "requirements_s3_key": model.requirements_s3_key
    }

@router.put("/{model_id}")
async def update_custom_model(
    model_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update custom model metadata"""
    
    model = db.query(CustomModel).filter(
        CustomModel.id == model_id,
        CustomModel.owner_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Custom model not found")
    
    # Update fields
    if name is not None:
        model.name = name
    if description is not None:
        model.description = description
    if tags is not None:
        try:
            model.tags = json.loads(tags)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in tags field")
    
    model.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Model updated successfully"}

@router.delete("/{model_id}")
async def delete_custom_model(
    model_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a custom model"""
    
    model = db.query(CustomModel).filter(
        CustomModel.id == model_id,
        CustomModel.owner_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Custom model not found")
    
    # Delete files from S3
    try:
        await custom_model_service.delete_model_files(model)
    except Exception as e:
        logger.warning(f"Failed to delete S3 files for model {model_id}: {e}")
    
    # Delete from database
    db.delete(model)
    db.commit()
    
    return {"message": "Model deleted successfully"}

@router.post("/{model_id}/validate")
async def validate_custom_model(
    model_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger validation of a custom model"""
    
    model = db.query(CustomModel).filter(
        CustomModel.id == model_id,
        CustomModel.owner_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Custom model not found")
    
    if model.status != CustomModelStatus.READY:
        raise HTTPException(
            status_code=400,
            detail="Model must be in READY status to trigger validation"
        )
    
    # Start validation process
    try:
        validation_result = await custom_model_service.validate_model(model)
        
        model.validation_metrics = validation_result
        model.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "Validation completed",
            "metrics": validation_result
        }
        
    except Exception as e:
        logger.error(f"Model validation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Model validation failed. Please check your model format."
        )

@router.post("/{model_id}/test")
async def test_custom_model(
    model_id: int,
    test_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test a custom model with sample data"""
    
    model = db.query(CustomModel).filter(
        CustomModel.id == model_id,
        CustomModel.owner_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Custom model not found")
    
    if not model.is_ready:
        raise HTTPException(
            status_code=400,
            detail="Model is not ready for testing"
        )
    
    try:
        # Run test inference
        test_result = await custom_model_service.test_model_inference(
            model, test_data
        )
        
        return {
            "test_successful": True,
            "sample_output": test_result.get("sample_output"),
            "performance_metrics": test_result.get("performance_metrics"),
            "inference_time_ms": test_result.get("inference_time_ms")
        }
        
    except Exception as e:
        logger.error(f"Model test failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Model test failed: {str(e)}"
        )

@router.get("/supported-frameworks")
async def get_supported_frameworks():
    """Get list of supported ML frameworks and their requirements"""
    
    return {
        "frameworks": [
            {
                "name": "TensorFlow",
                "type": "tensorflow",
                "versions": ["2.10+", "2.11+", "2.12+", "2.13+"],
                "file_formats": [".pb", ".h5", ".tf", ".savedmodel"],
                "requirements": [
                    "Model should be SavedModel format or .h5",
                    "Include model signature for input/output",
                    "Provide requirements.txt with dependencies"
                ]
            },
            {
                "name": "PyTorch",
                "type": "pytorch",
                "versions": ["1.13+", "2.0+", "2.1+"],
                "file_formats": [".pt", ".pth", ".pkl"],
                "requirements": [
                    "Model should be saved with torch.save()",
                    "Include model definition in config file",
                    "Provide requirements.txt with torch version"
                ]
            },
            {
                "name": "HuggingFace",
                "type": "huggingface",
                "versions": ["transformers 4.20+"],
                "file_formats": [".json", ".bin", ".safetensors"],
                "requirements": [
                    "Include config.json and tokenizer files",
                    "Model should be compatible with transformers library",
                    "Specify model architecture in config"
                ]
            },
            {
                "name": "ONNX",
                "type": "onnx",
                "versions": ["1.12+", "1.13+", "1.14+"],
                "file_formats": [".onnx"],
                "requirements": [
                    "Model should be in ONNX format",
                    "Include input/output specifications",
                    "Provide ONNX runtime requirements"
                ]
            },
            {
                "name": "Scikit-Learn",
                "type": "scikit_learn",
                "versions": ["1.2+", "1.3+"],
                "file_formats": [".pkl", ".joblib"],
                "requirements": [
                    "Model saved with joblib or pickle",
                    "Include feature names and preprocessing",
                    "Specify scikit-learn version"
                ]
            }
        ],
        "upload_limits": {
            "professional": "100 MB",
            "enterprise": "1 GB"
        },
        "supported_column_types": [
            "string", "text", "integer", "float", "boolean", 
            "date", "datetime", "categorical", "email", "phone"
        ]
    }

@router.get("/tier-limits")
async def get_tier_limits(
    current_user: User = Depends(get_current_user)
):
    """Get custom model limits for user's subscription tier"""
    
    tier = current_user.subscription_tier
    
    limits = {
        SubscriptionTier.FREE: {
            "max_models": 0,
            "max_file_size_mb": 0,
            "gpu_support": False,
            "features": []
        },
        SubscriptionTier.STARTER: {
            "max_models": 2,
            "max_file_size_mb": 50,
            "gpu_support": False,
            "features": ["Basic model upload", "CPU inference only"]
        },
        SubscriptionTier.PROFESSIONAL: {
            "max_models": 10,
            "max_file_size_mb": 100,
            "gpu_support": True,
            "features": [
                "Advanced model upload", "GPU inference", 
                "Model versioning", "Performance metrics"
            ]
        },
        SubscriptionTier.ENTERPRISE: {
            "max_models": 100,
            "max_file_size_mb": 1024,
            "gpu_support": True,
            "features": [
                "Unlimited model features", "Custom frameworks",
                "Dedicated GPU instances", "Model ensemble",
                "Priority support", "Custom integrations"
            ]
        }
    }
    
    current_limits = limits.get(tier, limits[SubscriptionTier.FREE])
    
    # Get current usage
    current_count = db.query(CustomModel).filter(
        CustomModel.owner_id == current_user.id
    ).count()
    
    return {
        "subscription_tier": tier.value,
        "limits": current_limits,
        "current_usage": {
            "models_used": current_count,
            "models_remaining": max(0, current_limits["max_models"] - current_count)
        },
        "upgrade_benefits": {
            "next_tier": "enterprise" if tier != SubscriptionTier.ENTERPRISE else None,
            "additional_models": 90 if tier == SubscriptionTier.PROFESSIONAL else None,
            "additional_features": ["Ensemble generation", "24/7 support"]
        }
    } 