"""
Notification model for storing user notifications
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    JSON,
    ForeignKey,
    Enum,
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from models.base import Base


class NotificationType(str, enum.Enum):
    """Types of notifications"""

    APPOINTMENT = "appointment"
    PERFORMANCE_ALERT = "performance_alert"
    TEAM_UPDATE = "team_update"
    TRAINING = "training"
    ACHIEVEMENT = "achievement"
    SYSTEM = "system"
    REVENUE = "revenue"
    CLIENT = "client"


class NotificationPriority(str, enum.Enum):
    """Notification priority levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    """Notification model"""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False, index=True)
    priority = Column(
        Enum(NotificationPriority), default=NotificationPriority.MEDIUM, nullable=False
    )

    title = Column(String(200), nullable=False)
    message = Column(String(1000), nullable=False)
    data = Column(JSON, default={})

    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)

    # Action URL if clicking should navigate somewhere
    action_url = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Auto-delete after this time

    # Relationships
    # user = relationship("User", back_populates="notifications")  # Temporarily disabled

    def to_dict(self):
        """Convert notification to dictionary"""
        return {
            "id": self.id,
            "type": self.type.value,
            "priority": self.priority.value,
            "title": self.title,
            "message": self.message,
            "data": self.data,
            "is_read": self.is_read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "action_url": self.action_url,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
