"""
Dataset Models for Synthos Platform
Handles data uploads, schema detection, generation jobs, and custom models
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import json

from app.core.database import Base


class DatasetStatus(enum.Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"
    ARCHIVED = "archived"


class ColumnDataType(enum.Enum):
    STRING = "string"
    TEXT = "text"
    INTEGER = "integer"
    NUMERIC = "numeric"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"
    EMAIL = "email"
    PHONE = "phone"
    ADDRESS = "address"
    CATEGORICAL = "categorical"
    CUSTOM = "custom"


class GenerationStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CustomModelType(enum.Enum):
    TENSORFLOW = "tensorflow"
    PYTORCH = "pytorch"
    HUGGINGFACE = "huggingface"
    ONNX = "onnx"
    SCIKIT_LEARN = "scikit_learn"


class CustomModelStatus(enum.Enum):
    UPLOADING = "uploading"
    VALIDATING = "validating"
    READY = "ready"
    ERROR = "error"
    ARCHIVED = "archived"


class CustomModel(Base):
    """Custom user-uploaded models for synthetic data generation"""
    __tablename__ = "custom_models"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    model_type = Column(Enum(CustomModelType), nullable=False)
    status = Column(Enum(CustomModelStatus), default=CustomModelStatus.UPLOADING, nullable=False)
    
    # Model information
    version = Column(String(50), nullable=True)
    framework_version = Column(String(100), nullable=True)
    accuracy_score = Column(Float, nullable=True)  # 0-100
    validation_metrics = Column(JSON, nullable=True)
    
    # File information
    model_s3_key = Column(String(500), nullable=True)  # Main model file
    config_s3_key = Column(String(500), nullable=True)  # Configuration file
    requirements_s3_key = Column(String(500), nullable=True)  # Requirements file
    file_size = Column(Integer, nullable=True)  # bytes
    
    # Model capabilities
    supported_column_types = Column(JSON, nullable=True)  # List of supported data types
    max_columns = Column(Integer, nullable=True)
    max_rows = Column(Integer, nullable=True)
    requires_gpu = Column(Boolean, default=False, nullable=False)
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    
    # Metadata
    tags = Column(JSON, nullable=True)  # List of tags for categorization
    model_metadata = Column(JSON, nullable=True)  # Additional model metadata
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="custom_models")
    generation_jobs = relationship("GenerationJob", back_populates="custom_model")

    def __repr__(self):
        return f"<CustomModel(name={self.name}, type={self.model_type})>"

    @property
    def is_ready(self) -> bool:
        return self.status == CustomModelStatus.READY

    def increment_usage(self):
        """Increment usage counter"""
        self.usage_count += 1
        self.last_used_at = datetime.utcnow()

    def get_validation_metrics(self) -> Dict[str, Any]:
        """Get validation metrics as dictionary"""
        if isinstance(self.validation_metrics, dict):
            return self.validation_metrics
        return json.loads(self.validation_metrics) if self.validation_metrics else {}

    def get_supported_column_types(self) -> List[str]:
        """Get supported column types as list"""
        if isinstance(self.supported_column_types, list):
            return self.supported_column_types
        return json.loads(self.supported_column_types) if self.supported_column_types else []

    def get_tags(self) -> List[str]:
        """Get tags as list"""
        if isinstance(self.tags, list):
            return self.tags
        return json.loads(self.tags) if self.tags else []


class Dataset(Base):
    """Dataset model for uploaded data"""
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(DatasetStatus), default=DatasetStatus.UPLOADING, nullable=False)
    
    # File information
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    file_type = Column(String(20), nullable=False)  # csv, json, parquet, etc.
    s3_key = Column(String(500), nullable=True)  # AWS S3 object key
    
    # Schema information
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    schema_detected = Column(Boolean, default=False, nullable=False)
    quality_score = Column(Float, nullable=True)  # 0-100 data quality score
    
    # Privacy settings
    privacy_level = Column(String(20), default="medium", nullable=False)  # low, medium, high
    epsilon = Column(Float, nullable=True)  # Differential privacy epsilon
    delta = Column(Float, nullable=True)  # Differential privacy delta
    
    # Enhanced metadata
    domain = Column(String(100), nullable=True)  # business domain (finance, healthcare, etc.)
    dataset_metadata = Column(JSON, nullable=True)  # Additional dataset metadata as JSON
    processing_logs = Column(Text, nullable=True)  # Processing logs and errors
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    archived_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="datasets")
    columns = relationship("DatasetColumn", back_populates="dataset", cascade="all, delete-orphan")
    generation_jobs = relationship("GenerationJob", back_populates="dataset")

    def __repr__(self):
        return f"<Dataset(name={self.name}, status={self.status})>"

    @property
    def is_ready(self) -> bool:
        return self.status == DatasetStatus.READY

    @property
    def is_processing(self) -> bool:
        return self.status == DatasetStatus.PROCESSING

    def get_metadata(self) -> Dict[str, Any]:
        """Get metadata as dictionary"""
        if isinstance(self.dataset_metadata, dict):
            return self.dataset_metadata
        return json.loads(self.dataset_metadata) if self.dataset_metadata else {}


class DatasetColumn(Base):
    """Enhanced column schema information for datasets"""
    __tablename__ = "dataset_columns"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    name = Column(String(255), nullable=False)
    data_type = Column(Enum(ColumnDataType), nullable=False)
    nullable = Column(Boolean, default=True, nullable=False)
    
    # Statistics
    unique_values = Column(Integer, nullable=True)
    null_count = Column(Integer, nullable=True)
    min_value = Column(String(255), nullable=True)
    max_value = Column(String(255), nullable=True)
    mean_value = Column(Float, nullable=True)
    std_value = Column(Float, nullable=True)
    
    # Sample data
    sample_values = Column(JSON, nullable=True)  # List of sample values
    value_distribution = Column(JSON, nullable=True)  # Value frequency distribution
    
    # Privacy classification
    privacy_category = Column(String(50), nullable=True)  # PII, sensitive, public
    sensitivity_score = Column(Float, nullable=True)  # 0-1 sensitivity score
    
    # Enhanced generation configuration
    generation_strategy = Column(String(100), nullable=True)  # How to generate this column
    generation_params = Column(JSON, nullable=True)  # Parameters for generation
    constraints = Column(JSON, nullable=True)  # Column constraints (min, max, pattern, etc.)
    business_rules = Column(JSON, nullable=True)  # Business rules for generation
    business_meaning = Column(Text, nullable=True)  # What this column represents
    custom_generation_logic = Column(Text, nullable=True)  # Custom generation description
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="columns")

    def __repr__(self):
        return f"<DatasetColumn(name={self.name}, type={self.data_type})>"

    @property
    def is_pii(self) -> bool:
        """Check if column contains PII data"""
        return self.privacy_category in ["PII", "sensitive"]

    def get_sample_values(self) -> List[str]:
        """Get sample values as list"""
        if isinstance(self.sample_values, list):
            return self.sample_values
        return json.loads(self.sample_values) if self.sample_values else []

    def get_constraints(self) -> Dict[str, Any]:
        """Get constraints as dictionary"""
        if isinstance(self.constraints, dict):
            return self.constraints
        return json.loads(self.constraints) if self.constraints else {}

    def get_business_rules(self) -> List[str]:
        """Get business rules as list"""
        if isinstance(self.business_rules, list):
            return self.business_rules
        return json.loads(self.business_rules) if self.business_rules else []

    def get_generation_params(self) -> Dict[str, Any]:
        """Get generation parameters as dictionary"""
        if isinstance(self.generation_params, dict):
            return self.generation_params
        return json.loads(self.generation_params) if self.generation_params else {}


class GenerationJob(Base):
    """Enhanced synthetic data generation job tracking"""
    __tablename__ = "generation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    custom_model_id = Column(Integer, ForeignKey("custom_models.id"), nullable=True)
    
    # Job configuration
    rows_requested = Column(Integer, nullable=False)
    rows_generated = Column(Integer, nullable=True)
    privacy_parameters = Column(JSON, nullable=False)  # Epsilon, delta, etc.
    generation_parameters = Column(JSON, nullable=True)  # Model settings, etc.
    column_configurations = Column(JSON, nullable=True)  # Column-specific configs
    
    # Model information
    model_type = Column(String(50), nullable=False)  # claude-3-sonnet, custom, etc.
    generation_strategy = Column(String(50), nullable=False)  # hybrid, statistical, etc.
    accuracy_target = Column(Float, default=98.0, nullable=False)  # Target accuracy percentage
    
    # Job status
    status = Column(Enum(GenerationStatus), default=GenerationStatus.PENDING, nullable=False)
    progress_percentage = Column(Float, default=0.0, nullable=False)
    current_stage = Column(String(100), nullable=True)  # Current processing stage
    error_message = Column(Text, nullable=True)
    
    # Output
    output_s3_key = Column(String(500), nullable=True)  # Generated data location
    output_format = Column(String(20), default="csv", nullable=False)
    output_size = Column(Integer, nullable=True)  # bytes
    
    # Timing
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    processing_time = Column(Float, nullable=True)  # seconds
    estimated_completion = Column(DateTime, nullable=True)
    
    # Enhanced quality metrics
    quality_metrics = Column(JSON, nullable=True)  # Detailed quality assessment
    accuracy_achieved = Column(Float, nullable=True)  # Actual accuracy achieved
    similarity_score = Column(Float, nullable=True)  # 0-1 similarity to original
    privacy_score = Column(Float, nullable=True)  # 0-1 privacy preservation score
    correlation_preservation = Column(Float, nullable=True)  # Column relationship preservation
    distribution_fidelity = Column(Float, nullable=True)  # Distribution matching score
    semantic_coherence = Column(Float, nullable=True)  # Semantic consistency score
    
    # Resource usage
    cpu_usage = Column(Float, nullable=True)  # Peak CPU usage percentage
    memory_usage = Column(Float, nullable=True)  # Peak memory usage in MB
    gpu_usage = Column(Float, nullable=True)  # GPU usage if applicable
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="generation_jobs")
    custom_model = relationship("CustomModel", back_populates="generation_jobs")

    def __repr__(self):
        return f"<GenerationJob(id={self.id}, status={self.status})>"

    @property
    def is_completed(self) -> bool:
        return self.status == GenerationStatus.COMPLETED

    @property
    def is_running(self) -> bool:
        return self.status == GenerationStatus.RUNNING

    @property
    def has_output(self) -> bool:
        return self.output_s3_key is not None and self.is_completed

    @property
    def uses_custom_model(self) -> bool:
        return self.custom_model_id is not None

    def start_job(self):
        """Mark job as started"""
        self.status = GenerationStatus.RUNNING
        self.started_at = datetime.utcnow()
        self.progress_percentage = 0.0
        self.current_stage = "Initializing"

    def update_progress(self, percentage: float, stage: str = None):
        """Update job progress and stage"""
        self.progress_percentage = max(0.0, min(100.0, percentage))
        if stage:
            self.current_stage = stage
        
        # Estimate completion time
        if self.started_at and percentage > 0:
            elapsed = (datetime.utcnow() - self.started_at).total_seconds()
            estimated_total = elapsed * (100.0 / percentage)
            self.estimated_completion = self.started_at + timedelta(seconds=estimated_total)

    def complete_job(self, rows_generated: int, output_s3_key: str, output_size: int, 
                    quality_metrics: Dict[str, Any] = None):
        """Mark job as completed with results"""
        self.status = GenerationStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress_percentage = 100.0
        self.current_stage = "Completed"
        self.rows_generated = rows_generated
        self.output_s3_key = output_s3_key
        self.output_size = output_size
        
        if self.started_at:
            self.processing_time = (self.completed_at - self.started_at).total_seconds()
        
        if quality_metrics:
            self.quality_metrics = quality_metrics
            self.accuracy_achieved = quality_metrics.get('accuracy_achieved')
            self.similarity_score = quality_metrics.get('similarity_score')
            self.privacy_score = quality_metrics.get('privacy_score')
            self.correlation_preservation = quality_metrics.get('correlation_preservation')
            self.distribution_fidelity = quality_metrics.get('distribution_fidelity')
            self.semantic_coherence = quality_metrics.get('semantic_coherence')

    def fail_job(self, error_message: str):
        """Mark job as failed"""
        self.status = GenerationStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.current_stage = "Failed"
        self.error_message = error_message

    def get_privacy_parameters(self) -> Dict[str, Any]:
        """Get privacy parameters as dictionary"""
        if isinstance(self.privacy_parameters, dict):
            return self.privacy_parameters
        return json.loads(self.privacy_parameters) if self.privacy_parameters else {}

    def get_generation_parameters(self) -> Dict[str, Any]:
        """Get generation parameters as dictionary"""
        if isinstance(self.generation_parameters, dict):
            return self.generation_parameters
        return json.loads(self.generation_parameters) if self.generation_parameters else {}

    def get_column_configurations(self) -> Dict[str, Any]:
        """Get column configurations as dictionary"""
        if isinstance(self.column_configurations, dict):
            return self.column_configurations
        return json.loads(self.column_configurations) if self.column_configurations else {}

    def get_quality_metrics(self) -> Dict[str, Any]:
        """Get quality metrics as dictionary"""
        if isinstance(self.quality_metrics, dict):
            return self.quality_metrics
        return json.loads(self.quality_metrics) if self.quality_metrics else {} 