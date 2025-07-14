"""
Audit Models for Synthos Platform
GDPR/CCPA compliance and audit trail
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import json

from app.core.database import Base


class AuditEventType(enum.Enum):
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    DATA_UPLOAD = "data_upload"
    DATA_ACCESS = "data_access"
    DATA_DOWNLOAD = "data_download"
    DATA_GENERATION = "data_generation"
    DATA_DELETION = "data_deletion"
    PRIVACY_REQUEST = "privacy_request"
    SUBSCRIPTION_CHANGE = "subscription_change"
    ADMIN_ACTION = "admin_action"


class PrivacyRequestType(enum.Enum):
    ACCESS = "access"  # GDPR Article 15
    RECTIFICATION = "rectification"  # GDPR Article 16
    ERASURE = "erasure"  # GDPR Article 17 (Right to be forgotten)
    PORTABILITY = "portability"  # GDPR Article 20
    RESTRICT_PROCESSING = "restrict_processing"  # GDPR Article 18
    OBJECT_PROCESSING = "object_processing"  # GDPR Article 21


class PrivacyRequestStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class AuditLog(Base):
    """Comprehensive audit logging for compliance"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Can be null for system events
    event_type = Column(Enum(AuditEventType), nullable=False)
    resource_type = Column(String(100), nullable=True)  # dataset, user, subscription, etc.
    resource_id = Column(String(100), nullable=True)
    
    # Event details
    action = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Request context
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(255), nullable=True)
    
    # Additional audit metadata
    audit_metadata = Column(JSON, nullable=True)
    
    # Legal and compliance
    gdpr_lawful_basis = Column(String(100), nullable=True)  # GDPR Article 6 basis
    retention_period = Column(Integer, nullable=True)  # Days to retain this log
    
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(user_id={self.user_id}, event={self.event_type}, action={self.action})>"

    @classmethod
    def log_event(
        cls,
        event_type: AuditEventType,
        action: str,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        description: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        gdpr_lawful_basis: Optional[str] = None,
    ) -> "AuditLog":
        """Create new audit log entry"""
        return cls(
            user_id=user_id,
            event_type=event_type,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            audit_metadata=metadata,
            gdpr_lawful_basis=gdpr_lawful_basis,
        )

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get metadata field"""
        if self.audit_metadata is None:
            return default
        return self.audit_metadata.get(key, default)

    def add_metadata(self, key: str, value: Any):
        """Add metadata field"""
        if self.audit_metadata is None:
            self.audit_metadata = {}
        self.audit_metadata[key] = value


class PrivacyEvent(Base):
    """Privacy-related events and requests for GDPR/CCPA compliance"""
    __tablename__ = "privacy_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_type = Column(Enum(PrivacyRequestType), nullable=False)
    status = Column(Enum(PrivacyRequestStatus), default=PrivacyRequestStatus.PENDING, nullable=False)
    
    # Request details
    request_reason = Column(Text, nullable=True)
    requested_data_types = Column(JSON, nullable=True)  # List of data types requested
    
    # Legal basis and compliance
    legal_basis = Column(String(100), nullable=True)  # GDPR Article 6 basis
    regulation = Column(String(20), default="GDPR", nullable=False)  # GDPR, CCPA, etc.
    
    # Processing details
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin handling request
    processing_notes = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)
    
    # Output and delivery
    output_format = Column(String(20), nullable=True)  # json, csv, pdf
    output_s3_key = Column(String(500), nullable=True)  # For data exports
    delivery_method = Column(String(50), nullable=True)  # email, download, postal
    
    # Timing and deadlines
    requested_at = Column(DateTime, default=func.now(), nullable=False)
    deadline = Column(DateTime, nullable=True)  # Legal deadline (30 days for GDPR)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Verification and identity
    identity_verified = Column(String, default=False, nullable=False)
    verification_method = Column(String(100), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<PrivacyEvent(user_id={self.user_id}, type={self.request_type}, status={self.status})>"

    @property
    def is_overdue(self) -> bool:
        """Check if request is past deadline"""
        if not self.deadline:
            return False
        return datetime.utcnow() > self.deadline and self.status not in [
            PrivacyRequestStatus.COMPLETED,
            PrivacyRequestStatus.REJECTED,
            PrivacyRequestStatus.CANCELLED
        ]

    @property
    def days_remaining(self) -> Optional[int]:
        """Days remaining until deadline"""
        if not self.deadline:
            return None
        delta = self.deadline - datetime.utcnow()
        return max(0, delta.days)

    def start_processing(self, assigned_to_id: int, notes: Optional[str] = None):
        """Start processing the privacy request"""
        self.status = PrivacyRequestStatus.IN_PROGRESS
        self.assigned_to = assigned_to_id
        self.started_at = datetime.utcnow()
        if notes:
            self.processing_notes = notes

    def complete_request(self, completion_notes: Optional[str] = None, output_s3_key: Optional[str] = None):
        """Mark request as completed"""
        self.status = PrivacyRequestStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        if completion_notes:
            self.completion_notes = completion_notes
        if output_s3_key:
            self.output_s3_key = output_s3_key

    def reject_request(self, reason: str):
        """Reject the privacy request"""
        self.status = PrivacyRequestStatus.REJECTED
        self.completed_at = datetime.utcnow()
        self.completion_notes = f"Request rejected: {reason}"

    def get_requested_data_types(self) -> list:
        """Get list of requested data types"""
        if isinstance(self.requested_data_types, list):
            return self.requested_data_types
        return json.loads(self.requested_data_types) if self.requested_data_types else []

    def set_requested_data_types(self, data_types: list):
        """Set requested data types"""
        self.requested_data_types = data_types

    @classmethod
    def create_deletion_request(cls, user_id: int, reason: Optional[str] = None) -> "PrivacyEvent":
        """Create a right to be forgotten request"""
        deadline = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
        deadline = deadline.replace(day=deadline.day + 30)  # 30 days for GDPR
        
        return cls(
            user_id=user_id,
            request_type=PrivacyRequestType.ERASURE,
            request_reason=reason,
            legal_basis="GDPR Article 17",
            regulation="GDPR",
            deadline=deadline,
            requested_data_types=["user_profile", "datasets", "generation_history", "audit_logs"],
        )

    @classmethod
    def create_access_request(cls, user_id: int, data_types: Optional[list] = None) -> "PrivacyEvent":
        """Create a data access request"""
        deadline = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
        deadline = deadline.replace(day=deadline.day + 30)  # 30 days for GDPR
        
        if data_types is None:
            data_types = ["user_profile", "datasets", "generation_history", "subscription_data"]
        
        return cls(
            user_id=user_id,
            request_type=PrivacyRequestType.ACCESS,
            legal_basis="GDPR Article 15",
            regulation="GDPR",
            deadline=deadline,
            requested_data_types=data_types,
            output_format="json",
        ) 