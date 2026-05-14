"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles."""
    ADMIN = "admin"
    USER = "user"


class ComplaintStatus(str, Enum):
    """Complaint status values."""
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    CLOSED = "closed"


# ============= User Schemas =============

class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """User update schema."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None


class UserResponse(UserBase):
    """User response schema."""
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserDetailResponse(UserResponse):
    """Detailed user response with complaints count."""
    complaints_count: int = 0


# ============= Complaint Schemas =============

class ComplaintBase(BaseModel):
    """Base complaint schema."""
    title: str
    description: str
    disaster_type: str
    severity: Optional[str] = None
    affected_people: Optional[int] = None


class GeoLocationData(BaseModel):
    """Geolocation data for complaints."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_name: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    """Complaint creation schema."""
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    location_name: Optional[str] = None
    damage_description: Optional[str] = None
    incident_date: Optional[datetime] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class ComplaintUpdate(BaseModel):
    """Complaint update schema."""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ComplaintStatus] = None
    severity: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    location_name: Optional[str] = None
    affected_people: Optional[int] = None
    damage_description: Optional[str] = None
    admin_notes: Optional[str] = None


class ComplaintResponse(ComplaintBase):
    """Complaint response schema."""
    id: int
    user_id: int
    status: ComplaintStatus
    latitude: Optional[float]
    longitude: Optional[float]
    location_name: Optional[str]
    affected_people: Optional[int]
    damage_description: Optional[str]
    image_url: Optional[str]
    video_url: Optional[str]
    kobo_submission_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    incident_date: Optional[datetime]
    admin_notes: Optional[str]
    user: UserResponse
    
    class Config:
        from_attributes = True


class ComplaintListResponse(BaseModel):
    """Paginated complaint list response."""
    items: List[ComplaintResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============= Comment Schemas =============

class ComplaintCommentBase(BaseModel):
    """Base comment schema."""
    comment_text: str


class ComplaintCommentCreate(ComplaintCommentBase):
    """Comment creation schema."""
    pass


class ComplaintCommentResponse(ComplaintCommentBase):
    """Comment response schema."""
    id: int
    complaint_id: int
    user_id: int
    is_admin_comment: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Authentication Schemas =============

class TokenData(BaseModel):
    """Token data schema."""
    sub: str
    user_id: int
    role: UserRole


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


# ============= Statistics/Analytics Schemas =============

class ComplaintStatistics(BaseModel):
    """Complaint statistics schema."""
    total_complaints: int
    submitted: int
    under_review: int
    acknowledged: int
    resolved: int
    closed: int
    by_disaster_type: dict
    by_severity: dict


class MapDataPoint(BaseModel):
    """Map data point for geospatial visualization."""
    id: int
    latitude: float
    longitude: float
    title: str
    disaster_type: str
    status: ComplaintStatus
    severity: Optional[str]
    created_at: datetime


# ============= Download Log Schemas =============

class DownloadLogCreate(BaseModel):
    """Request schema for logging a data download."""
    full_name: str = Field(..., min_length=1)
    organization: Optional[str] = None
    purpose: str = Field(..., min_length=1)
    notes: Optional[str] = None
    record_count: int = Field(..., ge=0)


class DownloadLogResponse(BaseModel):
    """Response schema for a download log entry."""
    id: int
    user_id: int
    full_name: str
    organization: Optional[str]
    purpose: str
    notes: Optional[str]
    record_count: int
    downloaded_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True
