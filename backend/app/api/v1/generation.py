"""
Synthetic Data Generation API Endpoints
Enterprise-grade AI-powered data generation
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import asyncio
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models.dataset import Dataset, GenerationJob, GenerationStatus
from app.models.user import User, UserUsage
from app.services.auth import get_current_user
from app.agents.claude_agent import AdvancedClaudeAgent, GenerationConfig, ModelType, GenerationStrategy
from app.core.logging import audit_logger
from app.services.monitoring import track_generation_metrics
from app.services.privacy_engine import PrivacyEngine

# Import boto3 with proper error handling
try:
    import boto3
except ImportError:
    boto3 = None

router = APIRouter()

@router.post("/generate")
async def start_generation(
    dataset_id: int,
    rows: int,
    privacy_level: str = "medium",
    epsilon: float = 1.0,
    delta: float = 1e-5,
    strategy: str = "hybrid",
    model_type: str = "claude-3-sonnet",
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start synthetic data generation job"""
    
    # Validate dataset ownership
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.owner_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    
    if dataset.status.value != "ready":
        raise HTTPException(400, "Dataset not ready for generation")
    
    # Check usage limits
    usage = db.query(UserUsage).filter(UserUsage.user_id == current_user.id).first()
    if usage and hasattr(current_user, 'subscription_tier') and current_user.subscription_tier == "free":
        current_usage = getattr(usage, 'current_month_usage', 0) or 0
        if current_usage + rows > settings.FREE_TIER_MONTHLY_LIMIT:
            raise HTTPException(403, "Monthly generation limit exceeded")
    
    # Validate parameters
    if rows > settings.MAX_SYNTHETIC_ROWS:
        raise HTTPException(400, f"Maximum {settings.MAX_SYNTHETIC_ROWS} rows allowed")
    
    if privacy_level not in ["low", "medium", "high"]:
        raise HTTPException(400, "Invalid privacy level")
    
    # Create generation job
    job = GenerationJob(
        dataset_id=dataset_id,
        user_id=current_user.id,
        rows_requested=rows,
        privacy_parameters={
            "privacy_level": privacy_level,
            "epsilon": epsilon,
            "delta": delta
        },
        generation_parameters={
            "strategy": strategy,
            "model_type": model_type,
            "temperature": 0.7,
            "max_tokens": 4000
        },
        status=GenerationStatus.PENDING
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Start generation in background
    # Get actual values from SQLAlchemy objects
    job_id_val = getattr(job, 'id')
    dataset_id_val = getattr(dataset, 'id') 
    user_id_val = getattr(current_user, 'id')
    
    background_tasks.add_task(
        run_generation_job,
        job_id_val,
        dataset_id_val, 
        user_id_val
    )
    
    # Log generation start
    audit_logger.log_generation_event(
        user_id=str(current_user.id),
        dataset_id=str(dataset_id),
        rows_generated=0,
        privacy_parameters=job.get_privacy_parameters(),
        generation_time=0,
        metadata={"job_id": job.id, "status": "started"}
    )
    
    return {
        "job_id": job.id,
        "status": job.status.value,
        "rows_requested": rows,
        "estimated_completion": "5-15 minutes",
        "message": "Generation job started successfully"
    }

@router.get("/jobs/{job_id}")
async def get_generation_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get generation job status and results"""
    
    job = db.query(GenerationJob).filter(
        GenerationJob.id == job_id,
        GenerationJob.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(404, "Generation job not found")
    
    response = {
        "job_id": job.id,
        "dataset_id": job.dataset_id,
        "status": job.status.value,
        "progress_percentage": job.progress_percentage,
        "rows_requested": job.rows_requested,
        "rows_generated": job.rows_generated,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "processing_time": job.processing_time,
        "privacy_parameters": job.get_privacy_parameters(),
        "generation_parameters": job.get_generation_parameters()
    }
    
    if job.status == GenerationStatus.COMPLETED:
        response.update({
            "output_s3_key": job.output_s3_key,
            "output_format": job.output_format,
            "output_size": job.output_size,
            "quality_metrics": job.quality_metrics,
            "similarity_score": job.similarity_score,
            "privacy_score": job.privacy_score,
            "download_url": f"/api/v1/generation/download/{job.id}"
        })
    
    if job.status == GenerationStatus.FAILED:
        response["error_message"] = job.error_message
    
    return response

@router.get("/jobs")
async def list_generation_jobs(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's generation jobs"""
    
    query = db.query(GenerationJob).filter(GenerationJob.user_id == current_user.id)
    
    if status:
        try:
            # Validate the status is a valid enum value
            GenerationStatus(status)
            query = query.filter(GenerationJob.status == status)
        except ValueError:
            raise HTTPException(400, "Invalid status value")
    
    jobs = query.order_by(GenerationJob.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "job_id": job.id,
            "dataset_id": job.dataset_id,
            "dataset_name": job.dataset.name if job.dataset else None,
            "status": job.status.value,
            "progress_percentage": job.progress_percentage,
            "rows_requested": job.rows_requested,
            "rows_generated": job.rows_generated,
            "created_at": job.created_at,
            "completed_at": job.completed_at,
            "processing_time": job.processing_time,
            "quality_score": job.quality_metrics.get("overall_quality") if job.quality_metrics and isinstance(job.quality_metrics, dict) else None
        }
        for job in jobs
    ]

@router.get("/download/{job_id}")
async def download_generated_data(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download generated synthetic data"""
    
    job = db.query(GenerationJob).filter(
        GenerationJob.id == job_id,
        GenerationJob.user_id == current_user.id
    ).first()
    
    if not job:
        if job is None:
            raise HTTPException(status_code=404, detail="Generation job not found")

        # Ensure job.status is a value, not a SQLAlchemy column expression
        if str(getattr(job, "status", None)) != GenerationStatus.COMPLETED.value:
            raise HTTPException(status_code=400, detail="Generation not completed")

        output_key = getattr(job, 'output_s3_key', None)
        if not output_key:
            raise HTTPException(status_code=404, detail="Generated data not found")

        if not boto3:
            raise HTTPException(status_code=500, detail="AWS SDK not available")
    try:
        if not boto3:
            raise HTTPException(status_code=500, detail="AWS SDK not available")
        s3_client = boto3.client('s3')
        if s3_client is None:
            raise HTTPException(status_code=500, detail="Failed to initialize S3 client")
        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_S3_BUCKET,
                'Key': output_key
            },
            ExpiresIn=3600  # 1 hour
        )
        
        # Log download
        audit_logger.log_user_action(
            user_id=str(current_user.id),
            action="data_downloaded",
            resource="generation_job",
            resource_id=str(job.id),
            metadata={
                "dataset_id": job.dataset_id,
                "rows_generated": job.rows_generated
            }
        )
        
        return {"download_url": download_url}
        
    except Exception as e:
        raise HTTPException(500, f"Download failed: {str(e)}")

@router.delete("/jobs/{job_id}")
async def cancel_generation_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a running generation job"""
    
    job = db.query(GenerationJob).filter(
        GenerationJob.id == job_id,
        GenerationJob.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(404, "Generation job not found")
    
    if job.status not in [GenerationStatus.PENDING, GenerationStatus.RUNNING]:
        raise HTTPException(400, "Job cannot be cancelled")
    
    job.status = GenerationStatus.CANCELLED
    job.completed_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Generation job cancelled"}

async def run_generation_job(job_id: int, dataset_id: int, user_id: int):
    """Background task to run synthetic data generation"""
    
    from app.core.database import SessionLocal
    db = SessionLocal()
    
    if not boto3:
        return
    
    try:
        # Get job and dataset
        job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        
        if not job or not dataset:
            return
        
        # Start job
        if hasattr(job, 'start_job'):
            job.start_job()
        db.commit()
        
        # Initialize Claude agent
        claude_agent = AdvancedClaudeAgent()
        
        # Initialize privacy engine
        privacy_engine = PrivacyEngine()
        
        # Get actual row count value
        rows_value = getattr(job, 'rows_requested', 1000)
        
        # Configure generation
        config = GenerationConfig(
            rows=rows_value,
            privacy_level=job.get_privacy_parameters().get("privacy_level", "medium"),
            epsilon=job.get_privacy_parameters().get("epsilon", 1.0),
            delta=job.get_privacy_parameters().get("delta", 1e-5),
            model_type=ModelType(job.get_generation_parameters().get("model_type", "claude-3-sonnet")),
            strategy=GenerationStrategy(job.get_generation_parameters().get("strategy", "hybrid")),
            batch_size=1000,
            enable_streaming=True,
            cache_strategy=True
        )
        
        # Generate synthetic data
        synthetic_data, quality_metrics = await claude_agent.generate_synthetic_data(
            dataset, config, job
        )
        
        # Save results
        import pandas as pd
        from io import StringIO
        
        output_key = f"generated/{user_id}/{job_id}/synthetic_data.csv"
        csv_buffer = StringIO()
        synthetic_data.to_csv(csv_buffer, index=False)
        
        s3_client = boto3.client('s3')
        s3_client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=output_key,
            Body=csv_buffer.getvalue(),
            ContentType='text/csv',
            ServerSideEncryption='AES256'
        )
        
        # Complete job
        if hasattr(job, 'complete_job'):
            job.complete_job(
                rows_generated=len(synthetic_data),
                output_s3_key=output_key,
                output_size=len(csv_buffer.getvalue())
            )
        
        # Update quality metrics using setattr to avoid Column assignment issues
        if hasattr(quality_metrics, 'details'):
            setattr(job, 'quality_metrics', quality_metrics.details)
        if hasattr(quality_metrics, 'statistical_similarity'):
            setattr(job, 'similarity_score', quality_metrics.statistical_similarity)
        if hasattr(quality_metrics, 'privacy_protection'):
            setattr(job, 'privacy_score', quality_metrics.privacy_protection)
        
        db.commit()
        
        # Update usage
        usage = db.query(UserUsage).filter(UserUsage.user_id == user_id).first()
        if usage and hasattr(usage, 'add_generation_usage'):
            usage.add_generation_usage(len(synthetic_data))
            db.commit()
        
        # Track metrics (use actual values, not Column objects)
        processing_time_val = getattr(job, 'processing_time', 0.0) or 0.0
        quality_score = getattr(quality_metrics, 'overall_quality', 0.0) if hasattr(quality_metrics, 'overall_quality') else 0.0
        
        track_generation_metrics(
            user_id=user_id,
            dataset_id=dataset_id,
            rows_generated=len(synthetic_data),
            quality_score=quality_score,
            processing_time=processing_time_val
        )
        
        # Log completion
        generation_time_val = getattr(job, 'processing_time', 0.0) or 0.0
        audit_logger.log_generation_event(
            user_id=str(user_id),
            dataset_id=str(dataset_id),
            rows_generated=len(synthetic_data),
            privacy_parameters=job.get_privacy_parameters() if hasattr(job, 'get_privacy_parameters') else {},
            generation_time=generation_time_val,
            metadata={
                "job_id": job_id,
                "quality_score": quality_score,
                "status": "completed"
            }
        )
        
    except Exception as e:
        # Fail job
        if job and hasattr(job, 'fail_job'):
            job.fail_job(str(e))
            db.commit()
        
        # Log failure
        privacy_params = job.get_privacy_parameters() if job and hasattr(job, 'get_privacy_parameters') else {}
        audit_logger.log_generation_event(
            user_id=str(user_id),
            dataset_id=str(dataset_id),
            rows_generated=0,
            privacy_parameters=privacy_params,
            generation_time=0,
            metadata={
                "job_id": job_id,
                "error": str(e),
                "status": "failed"
            }
        )
        
    finally:
        db.close() 