"""
Complaint management routes.
"""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
from src.database import get_db
from src.models import User, Complaint, ComplaintStatus, ComplaintComment, UserRole, DownloadLog
from src.schemas import (
    ComplaintCreate,
    ComplaintResponse,
    ComplaintUpdate,
    ComplaintListResponse,
    ComplaintCommentCreate,
    ComplaintCommentResponse,
    ComplaintStatistics,
    MapDataPoint,
    DownloadLogCreate,
    DownloadLogResponse,
)
from src.security import get_current_user, get_current_admin_user

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


# ============= Complaint CRUD Operations =============

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(
    complaint_data: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new complaint.
    
    Args:
        complaint_data: Complaint data
        current_user: The current authenticated user
        db: Database session
        
    Returns:
        Created complaint
    """
    db_complaint = Complaint(
        user_id=current_user.id,
        title=complaint_data.title,
        description=complaint_data.description,
        disaster_type=complaint_data.disaster_type,
        severity=complaint_data.severity,
        latitude=complaint_data.latitude,
        longitude=complaint_data.longitude,
        location_name=complaint_data.location_name,
        affected_people=complaint_data.affected_people,
        damage_description=complaint_data.damage_description,
        incident_date=complaint_data.incident_date,
        image_url=complaint_data.image_url,
        video_url=complaint_data.video_url,
        status=ComplaintStatus.SUBMITTED
    )
    
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    
    return db_complaint


@router.get("", response_model=ComplaintListResponse)
def list_complaints(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: str = Query(None),
    disaster_type: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List complaints with filtering.
    - Regular users see only their complaints
    - Admins see all complaints
    
    Args:
        skip: Number of complaints to skip
        limit: Maximum number of complaints to return
        status: Filter by status
        disaster_type: Filter by disaster type
        current_user: The current authenticated user
        db: Database session
        
    Returns:
        Paginated list of complaints
    """
    query = db.query(Complaint)
    
    # Filter by user if not admin
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        query = query.filter(Complaint.user_id == current_user.id)
    
    # Apply filters
    if status:
        query = query.filter(Complaint.status == status)
    if disaster_type:
        query = query.filter(Complaint.disaster_type == disaster_type)
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    complaints = query.offset(skip).limit(limit).all()
    
    return ComplaintListResponse(
        items=complaints,
        total=total,
        page=skip // limit,
        page_size=limit,
        total_pages=(total + limit - 1) // limit
    )


# ============= Map Data (all users) =============
# Must be declared BEFORE /{complaint_id} to avoid route collision.

@router.get("/map-data", response_model=list[MapDataPoint])
def get_user_map_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complaint data for map visualization — accessible to all authenticated users.
    Returns ALL geo-tagged complaints regardless of role.
    """
    complaints = db.query(Complaint).filter(
        and_(
            Complaint.latitude != None,
            Complaint.longitude != None
        )
    ).all()

    return [
        MapDataPoint(
            id=c.id,
            latitude=c.latitude,
            longitude=c.longitude,
            title=c.title,
            disaster_type=c.disaster_type,
            status=c.status,
            severity=c.severity,
            created_at=c.created_at,
            image_url=c.image_url,
            location_name=c.location_name,
            collector_name=c.user.full_name if c.user else "System",
            collector_role=c.user.role.value if (c.user and c.user.role) else "user",
        )
        for c in complaints
    ]


# ============= Admin Features =============
# IMPORTANT: These routes MUST be declared BEFORE /{complaint_id} to avoid
# FastAPI treating "admin" as the complaint_id path parameter.

@router.get("/admin/statistics", response_model=ComplaintStatistics)
def get_complaint_statistics(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get complaint statistics (admin only).
    
    Args:
        current_user: Must be admin
        db: Database session
        
    Returns:
        Complaint statistics
    """
    total = db.query(Complaint).count()
    submitted = db.query(Complaint).filter(Complaint.status == ComplaintStatus.SUBMITTED).count()
    under_review = db.query(Complaint).filter(Complaint.status == ComplaintStatus.UNDER_REVIEW).count()
    acknowledged = db.query(Complaint).filter(Complaint.status == ComplaintStatus.ACKNOWLEDGED).count()
    resolved = db.query(Complaint).filter(Complaint.status == ComplaintStatus.RESOLVED).count()
    closed = db.query(Complaint).filter(Complaint.status == ComplaintStatus.CLOSED).count()
    
    # Group by disaster type
    disaster_types = db.query(
        Complaint.disaster_type,
        Complaint.disaster_type
    ).distinct().all()
    by_disaster_type = {}
    for dt, _ in disaster_types:
        by_disaster_type[dt] = db.query(Complaint).filter(
            Complaint.disaster_type == dt
        ).count()
    
    # Group by severity
    severities = db.query(Complaint.severity).distinct().all()
    by_severity = {}
    for (sev,) in severities:
        if sev:
            by_severity[sev] = db.query(Complaint).filter(
                Complaint.severity == sev
            ).count()
    
    return ComplaintStatistics(
        total_complaints=total,
        submitted=submitted,
        under_review=under_review,
        acknowledged=acknowledged,
        resolved=resolved,
        closed=closed,
        by_disaster_type=by_disaster_type,
        by_severity=by_severity
    )


@router.get("/admin/map-data", response_model=list[MapDataPoint])
def get_map_data(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get complaint data for map visualization (admin only).
    
    Args:
        current_user: Must be admin
        db: Database session
        
    Returns:
        List of map data points
    """
    complaints = db.query(Complaint).filter(
        and_(
            Complaint.latitude != None,
            Complaint.longitude != None
        )
    ).all()
    
    return [
        MapDataPoint(
            id=c.id,
            latitude=c.latitude,
            longitude=c.longitude,
            title=c.title,
            disaster_type=c.disaster_type,
            status=c.status,
            severity=c.severity,
            created_at=c.created_at,
            image_url=c.image_url,
            location_name=c.location_name,
            collector_name=c.user.full_name if c.user else "System",
            collector_role=c.user.role.value if (c.user and c.user.role) else "user",
        )
        for c in complaints
    ]


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific complaint by ID.
    
    Args:
        complaint_id: Complaint ID
        current_user: The current authenticated user
        db: Database session
        
    Returns:
        Complaint data
        
    Raises:
        HTTPException: If complaint not found or unauthorized
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Check authorization
    if complaint.user_id != current_user.id and current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this complaint"
        )
    
    return complaint


@router.put("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    complaint_id: int,
    complaint_update: ComplaintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a complaint.
    - Users can update their own complaints
    - Admins can update any complaint
    
    Args:
        complaint_id: Complaint ID
        complaint_update: Updated complaint data
        current_user: The current authenticated user
        db: Database session
        
    Returns:
        Updated complaint
        
    Raises:
        HTTPException: If complaint not found or unauthorized
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Check authorization
    if complaint.user_id != current_user.id and current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this complaint"
        )
    
    # Update fields
    update_data = complaint_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(complaint, field, value)
    
    complaint.updated_at = datetime.utcnow()
    
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    
    return complaint


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a complaint (admin only).
    
    Args:
        complaint_id: Complaint ID
        current_user: Must be admin
        db: Database session
        
    Raises:
        HTTPException: If complaint not found
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    db.delete(complaint)
    db.commit()


# ============= Complaint Comments =============

@router.post("/{complaint_id}/comments", response_model=ComplaintCommentResponse)
def add_comment(
    complaint_id: int,
    comment_data: ComplaintCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a comment to a complaint.
    
    Args:
        complaint_id: Complaint ID
        comment_data: Comment data
        current_user: The current authenticated user
        db: Database session
        
    Returns:
        Created comment
        
    Raises:
        HTTPException: If complaint not found
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    db_comment = ComplaintComment(
        complaint_id=complaint_id,
        user_id=current_user.id,
        comment_text=comment_data.comment_text,
        is_admin_comment=current_user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return db_comment


@router.get("/{complaint_id}/comments", response_model=list[ComplaintCommentResponse])
def get_comments(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comments for a complaint.
    
    Args:
        complaint_id: Complaint ID
        current_user: The current authenticated user
        db: Database session
        
    Returns:
        List of comments
        
    Raises:
        HTTPException: If complaint not found or unauthorized
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Check authorization
    if complaint.user_id != current_user.id and current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view comments"
        )
    
    comments = db.query(ComplaintComment).filter(
        ComplaintComment.complaint_id == complaint_id
    ).all()
    
    return comments


# (Admin routes have been moved above /{complaint_id} to fix route ordering.)
# See the /admin/statistics and /admin/map-data routes defined earlier in this file.


# ============= Download Log =============

@router.post("/download-log", response_model=DownloadLogResponse, status_code=status.HTTP_201_CREATED)
def log_download(
    log_data: DownloadLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record a data download event for auditing.
    Called automatically by the frontend when a user downloads map data.
    Accessible to all authenticated users.
    """
    entry = DownloadLog(
        user_id=current_user.id,
        full_name=log_data.full_name,
        organization=log_data.organization,
        purpose=log_data.purpose,
        notes=log_data.notes,
        record_count=log_data.record_count,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/admin/download-logs", response_model=list[DownloadLogResponse])
def list_download_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all recorded data download events (admin only).
    Returns entries in reverse chronological order.
    """
    logs = (
        db.query(DownloadLog)
        .order_by(DownloadLog.downloaded_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs
