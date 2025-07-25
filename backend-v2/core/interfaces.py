"""
Interface definitions for BookedBarber V2 services

This module defines abstract base classes and protocols that establish
contracts for service implementations, enabling dependency injection
and easier testing through mock implementations.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Protocol, TypeVar, Generic
from datetime import datetime, date, time
from enum import Enum
import uuid

# Type variables for generic interfaces
T = TypeVar('T')
ID = TypeVar('ID')


class UserRole(str, Enum):
    """User roles in the system"""
    CLIENT = "CLIENT"
    BARBER = "BARBER"
    SHOP_OWNER = "SHOP_OWNER"
    ENTERPRISE_OWNER = "ENTERPRISE_OWNER"


class AppointmentStatus(str, Enum):
    """Appointment status enumeration"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PaymentStatus(str, Enum):
    """Payment status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


# Domain Models (Data Transfer Objects)
class UserDTO:
    """User data transfer object"""
    id: str
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class AppointmentDTO:
    """Appointment data transfer object"""
    id: str
    barber_id: str
    client_id: Optional[str]
    service_id: str
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    notes: Optional[str] = None
    price: float
    created_at: datetime
    updated_at: datetime


class PaymentDTO:
    """Payment data transfer object"""
    id: str
    appointment_id: str
    amount: float
    currency: str = "USD"
    status: PaymentStatus
    stripe_payment_intent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Repository Interfaces
class IRepository(Protocol, Generic[T, ID]):
    """Generic repository interface"""
    
    async def get_by_id(self, entity_id: ID) -> Optional[T]:
        """Get entity by ID"""
        ...
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination"""
        ...
    
    async def create(self, entity: T) -> T:
        """Create new entity"""
        ...
    
    async def update(self, entity_id: ID, updates: Dict[str, Any]) -> Optional[T]:
        """Update entity"""
        ...
    
    async def delete(self, entity_id: ID) -> bool:
        """Delete entity"""
        ...


class IUserRepository(IRepository[UserDTO, str]):
    """User repository interface"""
    
    async def get_by_email(self, email: str) -> Optional[UserDTO]:
        """Get user by email address"""
        ...
    
    async def get_by_role(self, role: UserRole) -> List[UserDTO]:
        """Get users by role"""
        ...


class IAppointmentRepository(IRepository[AppointmentDTO, str]):
    """Appointment repository interface"""
    
    async def get_by_barber(self, barber_id: str, start_date: date, end_date: date) -> List[AppointmentDTO]:
        """Get appointments for a barber within date range"""
        ...
    
    async def get_by_client(self, client_id: str) -> List[AppointmentDTO]:
        """Get appointments for a client"""
        ...
    
    async def get_available_slots(self, barber_id: str, date: date) -> List[time]:
        """Get available time slots for a barber on a specific date"""
        ...


class IPaymentRepository(IRepository[PaymentDTO, str]):
    """Payment repository interface"""
    
    async def get_by_appointment(self, appointment_id: str) -> List[PaymentDTO]:
        """Get payments for an appointment"""
        ...
    
    async def get_by_status(self, status: PaymentStatus) -> List[PaymentDTO]:
        """Get payments by status"""
        ...


# Service Interfaces
class IEmailService(ABC):
    """Email service interface"""
    
    @abstractmethod
    async def send_appointment_confirmation(self, appointment: AppointmentDTO, user: UserDTO) -> bool:
        """Send appointment confirmation email"""
        pass
    
    @abstractmethod
    async def send_appointment_reminder(self, appointment: AppointmentDTO, user: UserDTO) -> bool:
        """Send appointment reminder email"""
        pass
    
    @abstractmethod
    async def send_password_reset(self, user: UserDTO, reset_token: str) -> bool:
        """Send password reset email"""
        pass


class ISMSService(ABC):
    """SMS service interface"""
    
    @abstractmethod
    async def send_appointment_reminder(self, appointment: AppointmentDTO, phone: str) -> bool:
        """Send appointment reminder SMS"""
        pass
    
    @abstractmethod
    async def send_verification_code(self, phone: str, code: str) -> bool:
        """Send phone verification code"""
        pass


class IPaymentService(ABC):
    """Payment service interface"""
    
    @abstractmethod
    async def create_payment_intent(self, amount: float, currency: str = "USD", 
                                  metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create Stripe payment intent"""
        pass
    
    @abstractmethod
    async def confirm_payment(self, payment_intent_id: str) -> Dict[str, Any]:
        """Confirm payment intent"""
        pass
    
    @abstractmethod
    async def refund_payment(self, payment_intent_id: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """Refund payment"""
        pass
    
    @abstractmethod
    async def process_webhook(self, payload: str, signature: str) -> bool:
        """Process Stripe webhook"""
        pass


class ICalendarService(ABC):
    """Calendar service interface"""
    
    @abstractmethod
    async def create_event(self, appointment: AppointmentDTO) -> Optional[str]:
        """Create calendar event, returns event ID"""
        pass
    
    @abstractmethod
    async def update_event(self, event_id: str, appointment: AppointmentDTO) -> bool:
        """Update calendar event"""
        pass
    
    @abstractmethod
    async def delete_event(self, event_id: str) -> bool:
        """Delete calendar event"""
        pass
    
    @abstractmethod
    async def get_busy_times(self, calendar_id: str, start_date: date, end_date: date) -> List[Dict[str, datetime]]:
        """Get busy times from external calendar"""
        pass


class IAuthService(ABC):
    """Authentication service interface"""
    
    @abstractmethod
    async def authenticate_user(self, email: str, password: str) -> Optional[UserDTO]:
        """Authenticate user with email and password"""
        pass
    
    @abstractmethod
    async def create_access_token(self, user: UserDTO) -> str:
        """Create JWT access token"""
        pass
    
    @abstractmethod
    async def create_refresh_token(self, user: UserDTO) -> str:
        """Create JWT refresh token"""
        pass
    
    @abstractmethod
    async def verify_token(self, token: str) -> Optional[UserDTO]:
        """Verify JWT token and return user"""
        pass
    
    @abstractmethod
    async def hash_password(self, password: str) -> str:
        """Hash password"""
        pass
    
    @abstractmethod
    async def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        pass


class IBookingService(ABC):
    """Booking service interface"""
    
    @abstractmethod
    async def get_available_slots(self, barber_id: str, date: date) -> List[time]:
        """Get available booking slots"""
        pass
    
    @abstractmethod
    async def create_appointment(self, appointment_data: Dict[str, Any]) -> AppointmentDTO:
        """Create new appointment"""
        pass
    
    @abstractmethod
    async def update_appointment(self, appointment_id: str, updates: Dict[str, Any]) -> Optional[AppointmentDTO]:
        """Update existing appointment"""
        pass
    
    @abstractmethod
    async def cancel_appointment(self, appointment_id: str, reason: Optional[str] = None) -> bool:
        """Cancel appointment"""
        pass
    
    @abstractmethod
    async def confirm_appointment(self, appointment_id: str) -> bool:
        """Confirm appointment"""
        pass


class IAnalyticsService(ABC):
    """Analytics service interface"""
    
    @abstractmethod
    async def get_revenue_metrics(self, user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get revenue analytics"""
        pass
    
    @abstractmethod
    async def get_appointment_metrics(self, user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get appointment analytics"""
        pass
    
    @abstractmethod
    async def get_client_metrics(self, user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get client analytics"""
        pass
    
    @abstractmethod
    async def track_event(self, event_name: str, user_id: str, properties: Dict[str, Any]) -> None:
        """Track analytics event"""
        pass


class ICacheService(ABC):
    """Cache service interface"""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        pass
    
    @abstractmethod
    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set value in cache with optional expiration"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        pass
    
    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        pass


class IFileStorageService(ABC):
    """File storage service interface"""
    
    @abstractmethod
    async def upload_file(self, file_data: bytes, filename: str, content_type: str) -> str:
        """Upload file and return URL"""
        pass
    
    @abstractmethod
    async def delete_file(self, file_url: str) -> bool:
        """Delete file"""
        pass
    
    @abstractmethod
    async def get_file_url(self, filename: str) -> str:
        """Get file URL"""
        pass


class ILoggerService(ABC):
    """Logger service interface"""
    
    @abstractmethod
    def info(self, message: str, **kwargs) -> None:
        """Log info message"""
        pass
    
    @abstractmethod
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message"""
        pass
    
    @abstractmethod
    def error(self, message: str, **kwargs) -> None:
        """Log error message"""
        pass
    
    @abstractmethod
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message"""
        pass


# Event Interfaces for Event-Driven Architecture
class IDomainEvent(ABC):
    """Base domain event interface"""
    
    @property
    @abstractmethod
    def event_id(self) -> str:
        """Unique event identifier"""
        pass
    
    @property
    @abstractmethod
    def occurred_at(self) -> datetime:
        """When the event occurred"""
        pass
    
    @property
    @abstractmethod
    def event_type(self) -> str:
        """Type of event"""
        pass


class IEventPublisher(ABC):
    """Event publisher interface"""
    
    @abstractmethod
    async def publish(self, event: IDomainEvent) -> None:
        """Publish domain event"""
        pass


class IEventHandler(ABC, Generic[T]):
    """Event handler interface"""
    
    @abstractmethod
    async def handle(self, event: T) -> None:
        """Handle domain event"""
        pass


# Configuration Interfaces
class IConfiguration(ABC):
    """Configuration interface"""
    
    @abstractmethod
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        pass
    
    @abstractmethod
    def get_database_url(self) -> str:
        """Get database connection URL"""
        pass
    
    @abstractmethod
    def get_redis_url(self) -> str:
        """Get Redis connection URL"""
        pass
    
    @abstractmethod
    def is_production(self) -> bool:
        """Check if running in production"""
        pass