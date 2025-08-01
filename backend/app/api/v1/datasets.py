"""
Dataset API Endpoints
File upload and dataset management with enterprise features
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import update
from typing import List, Optional
from app.utils.optional_imports import pd, PANDAS_AVAILABLE
import boto3
from io import BytesIO
import json
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models.dataset import Dataset, DatasetColumn, DatasetStatus, ColumnDataType
from app.models.user import User
from app.services.auth import AuthService, get_current_user
from app.core.logging import audit_logger

router = APIRouter()

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    privacy_level: str = Form("medium"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process a dataset file"""
    
    try:
        # Validate file
        if file.size and file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(400, "File too large")
        
        if not file.filename:
            raise HTTPException(400, "No filename provided")
            
        file_ext = file.filename.split('.')[-1].lower()
        if file_ext not in ['csv', 'json', 'xlsx', 'xls', 'parquet']:
            raise HTTPException(400, "Unsupported file format")
        
        # Read file content
        content = await file.read()
        
        # Process file based on type
        if file_ext == 'csv':
            df = pd.read_csv(BytesIO(content))
        elif file_ext == 'json':
            data = json.loads(content.decode('utf-8'))
            df = pd.json_normalize(data if isinstance(data, list) else [data])
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(BytesIO(content))
        elif file_ext == 'parquet':
            df = pd.read_parquet(BytesIO(content))
        
        # Create dataset record
        dataset = Dataset(
            owner_id=current_user.id,
            name=name or file.filename,
            description=description,
            status=DatasetStatus.PROCESSING,
            original_filename=file.filename,
            file_size=file.size or len(content),
            file_type=file_ext,
            row_count=len(df),
            column_count=len(df.columns),
            privacy_level=privacy_level
        )
        
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        
        # Upload to S3
        s3_key = f"datasets/{current_user.id}/{dataset.id}/{file.filename}"
        s3_client = boto3.client('s3')
        s3_client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=s3_key,
            Body=content,
            ServerSideEncryption='AES256'
        )
        
        # Update dataset with S3 key using update statement
        db.execute(
            update(Dataset)
            .where(Dataset.id == dataset.id)
            .values(
                s3_key=s3_key,
                status=DatasetStatus.READY,
                schema_detected=True
            )
        )
        db.commit()
        db.refresh(dataset)
        
        # Analyze columns
        await analyze_dataset_schema(dataset, df, db)
        
        # Log upload
        audit_logger.log_user_action(
            user_id=str(current_user.id),
            action="dataset_uploaded",
            resource="dataset",
            resource_id=str(dataset.id),
            metadata={
                "filename": file.filename,
                "file_size": file.size or len(content),
                "row_count": len(df),
                "column_count": len(df.columns)
            }
        )
        
        return {
            "dataset_id": dataset.id,
            "name": dataset.name,
            "status": dataset.status.value,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "s3_key": dataset.s3_key,
            "privacy_level": dataset.privacy_level
        }
        
    except Exception as e:
        # Update dataset status to error if it exists
        if 'dataset' in locals() and dataset.id:
            db.execute(
                update(Dataset)
                .where(Dataset.id == dataset.id)
                .values(
                    status=DatasetStatus.ERROR,
                    processing_logs=str(e)
                )
            )
            db.commit()
        
        raise HTTPException(500, f"Upload failed: {str(e)}")

@router.get("/")
async def list_datasets(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's datasets"""
    
    datasets = db.query(Dataset).filter(
        Dataset.owner_id == current_user.id,
        Dataset.status != DatasetStatus.ARCHIVED
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": dataset.id,
            "name": dataset.name,
            "description": dataset.description,
            "status": dataset.status.value,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "privacy_level": dataset.privacy_level,
            "created_at": dataset.created_at,
            "file_size": dataset.file_size,
            "file_type": dataset.file_type
        }
        for dataset in datasets
    ]

@router.get("/{dataset_id}")
async def get_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dataset details"""
    
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.owner_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    
    # Include column schema
    columns = [
        {
            "name": col.name,
            "data_type": col.data_type.value,
            "nullable": col.nullable,
            "unique_values": col.unique_values,
            "null_count": col.null_count,
            "privacy_category": col.privacy_category,
            "sample_values": col.sample_values
        }
        for col in dataset.columns
    ]
    
    return {
        "id": dataset.id,
        "name": dataset.name,
        "description": dataset.description,
        "status": dataset.status.value,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "privacy_level": dataset.privacy_level,
        "quality_score": dataset.quality_score,
        "columns": columns,
        "created_at": dataset.created_at,
        "updated_at": dataset.updated_at
    }

@router.get("/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: int,
    rows: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview dataset content"""
    
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.owner_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    
    # Check if dataset has S3 key using proper null check
    s3_key_value = getattr(dataset, 's3_key', None)
    if not s3_key_value:
        raise HTTPException(404, "Dataset file not found")
    
    try:
        # Load from S3
        s3_client = boto3.client('s3')
        obj = s3_client.get_object(Bucket=settings.AWS_S3_BUCKET, Key=s3_key_value)
        
        file_type = getattr(dataset, 'file_type', None)
        if file_type == 'csv':
            df = pd.read_csv(BytesIO(obj['Body'].read()))
        elif file_type == 'json':
            data = json.loads(obj['Body'].read().decode('utf-8'))
            df = pd.json_normalize(data if isinstance(data, list) else [data])
        elif file_type in ['xlsx', 'xls']:
            df = pd.read_excel(BytesIO(obj['Body'].read()))
        else:
            raise HTTPException(400, f"Unsupported file type: {file_type}")
        
        # Return preview
        preview_data = df.head(rows).to_dict('records')
        
        return {
            "rows_shown": len(preview_data),
            "total_rows": len(df),
            "columns": list(df.columns),
            "data": preview_data
        }
        
    except Exception as e:
        raise HTTPException(500, f"Preview failed: {str(e)}")

@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete dataset"""
    
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.owner_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    
    try:
        # Delete from S3 if exists
        s3_key_value = getattr(dataset, 's3_key', None)
        if s3_key_value:
            s3_client = boto3.client('s3')
            s3_client.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=s3_key_value)
        
        # Mark as archived (for audit trail) using update statement
        db.execute(
            update(Dataset)
            .where(Dataset.id == dataset.id)
            .values(
                status=DatasetStatus.ARCHIVED,
                archived_at=datetime.utcnow()
            )
        )
        db.commit()
        
        # Log deletion
        audit_logger.log_user_action(
            user_id=str(current_user.id),
            action="dataset_deleted",
            resource="dataset",
            resource_id=str(dataset.id)
        )
        
        return {"message": "Dataset deleted successfully"}
        
    except Exception as e:
        raise HTTPException(500, f"Deletion failed: {str(e)}")

async def analyze_dataset_schema(dataset: Dataset, df: pd.DataFrame, db: Session):
    """Analyze dataset schema and create column records"""
    
    for col_name in df.columns:
        col_data = df[col_name]
        
        # Detect data type
        if pd.api.types.is_numeric_dtype(col_data):
            data_type = ColumnDataType.NUMERIC
        elif pd.api.types.is_datetime64_any_dtype(col_data):
            data_type = ColumnDataType.DATETIME
        elif pd.api.types.is_bool_dtype(col_data):
            data_type = ColumnDataType.BOOLEAN
        else:
            data_type = ColumnDataType.TEXT
        
        # Privacy classification
        col_lower = col_name.lower()
        if any(keyword in col_lower for keyword in ['email', 'phone', 'ssn', 'name', 'address']):
            privacy_category = 'PII'
        elif any(keyword in col_lower for keyword in ['salary', 'income', 'age', 'gender']):
            privacy_category = 'sensitive'
        else:
            privacy_category = 'public'
        
        # Prepare statistics
        min_val = None
        max_val = None
        mean_val = None
        std_val = None
        
        # Add statistics for numeric columns
        if data_type == ColumnDataType.NUMERIC:
            try:
                min_val = str(col_data.min()) if not pd.isna(col_data.min()) else None
                max_val = str(col_data.max()) if not pd.isna(col_data.max()) else None
                mean_val = float(col_data.mean()) if not pd.isna(col_data.mean()) else None
                std_val = float(col_data.std()) if not pd.isna(col_data.std()) else None
            except (ValueError, TypeError):
                pass
        
        # Create column record
        column = DatasetColumn(
            dataset_id=dataset.id,
            name=col_name,
            data_type=data_type,
            nullable=bool(col_data.isnull().any()),
            unique_values=int(col_data.nunique()),
            null_count=int(col_data.isnull().sum()),
            sample_values=col_data.dropna().head(5).astype(str).tolist(),
            privacy_category=privacy_category,
            min_value=min_val,
            max_value=max_val,
            mean_value=mean_val,
            std_value=std_val
        )
        
        db.add(column)
    
    db.commit() 