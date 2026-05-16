"""
Database models for the GEO AI Complaint System.
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    """User roles in the system."""
    SUPER_ADMIN = "super_admin"
    MUNICIPALITY_ADMIN = "municipality_admin"
    SUPERVISOR = "supervisor"
    FIELD_INSPECTOR = "field_inspector"
    AUDITOR = "auditor"
    OPERATOR = "operator"
    ADMIN = "admin"
    USER = "user"


class ComplaintStatus(str, enum.Enum):
    """Status of a complaint."""
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    CLOSED = "closed"


class User(Base):
    """User model for authentication and profile management."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    phone = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    
    # Relationships
    complaints = relationship("Complaint", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class Complaint(Base):
    """Complaint model for storing disaster-related complaints."""
    __tablename__ = "complaints"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    disaster_type = Column(String, nullable=False)  # e.g., "Landslide", "Flood", "Earthquake"
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.SUBMITTED, nullable=False)
    
    # Geolocation
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)
    
    # Additional details
    severity = Column(String, nullable=True)  # "Low", "Medium", "High", "Critical"
    affected_people = Column(Integer, nullable=True)
    damage_description = Column(Text, nullable=True)
    
    # Media
    image_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    
    # KoboToolbox integration
    kobo_submission_id = Column(String, unique=True, nullable=True, index=True)
    dynamic_data = Column(Text, nullable=True)  # JSON string for dynamic form data from Kobo
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    incident_date = Column(DateTime, nullable=True)
    
    # Admin notes
    admin_notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="complaints")
    comments = relationship("ComplaintComment", back_populates="complaint")
    
    def __repr__(self):
        return f"<Complaint(id={self.id}, title={self.title}, status={self.status})>"


class ComplaintComment(Base):
    """Model for comments on complaints (for admin responses and updates)."""
    __tablename__ = "complaint_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment_text = Column(Text, nullable=False)
    is_admin_comment = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    complaint = relationship("Complaint", back_populates="comments")
    
    def __repr__(self):
        return f"<ComplaintComment(id={self.id}, complaint_id={self.complaint_id})>"


class DownloadLog(Base):
    """Audit log for data downloads — records who downloaded what data and why."""
    __tablename__ = "download_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String, nullable=False)
    organization = Column(String, nullable=True)
    purpose = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    record_count = Column(Integer, nullable=False, default=0)
    downloaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User")

    def __repr__(self):
        return f"<DownloadLog(id={self.id}, user_id={self.user_id}, purpose={self.purpose})>"


class AppSetting(Base):
    """Key-value store for application-level settings (e.g., active KoboToolbox form UID)."""
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<AppSetting(key={self.key}, value={self.value})>"
