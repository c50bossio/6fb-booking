"""
Notification API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from config.database import get_db
from models.user import User
from models.notification import Notification, NotificationType, NotificationPriority
from api.v1.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


class NotificationResponse(BaseModel):
    id: int
    type: str
    priority: str
    title: str
    message: str
    data: dict
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    action_url: Optional[str]

    class Config:
        from_attributes = True


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's notifications"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    # Filter out expired notifications
    query = query.filter(
        (Notification.expires_at == None)
        | (Notification.expires_at > datetime.utcnow())
    )

    notifications = (
        query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    )

    return notifications


@router.get("/unread", response_model=List[NotificationResponse])
async def get_unread_notifications(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get unread notifications"""
    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
            (Notification.expires_at == None)
            | (Notification.expires_at > datetime.utcnow()),
        )
        .order_by(Notification.created_at.desc())
        .all()
    )

    return notifications


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
            (Notification.expires_at == None)
            | (Notification.expires_at > datetime.utcnow()),
        )
        .count()
    )

    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read"""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id, Notification.user_id == current_user.id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()

    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()

    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a notification"""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id, Notification.user_id == current_user.id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted"}


@router.delete("/")
async def clear_all_notifications(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Clear all notifications for the user"""
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.commit()

    return {"message": "All notifications cleared"}
