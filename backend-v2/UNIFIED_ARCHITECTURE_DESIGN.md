# Unified Architecture Design - BookedBarber V2

## 1. Unified Booking Service Architecture

### Core Design Principles
- **Single Source of Truth**: One comprehensive booking service
- **Feature Flags**: Enable/disable advanced features dynamically
- **Strategy Pattern**: Pluggable components for different booking strategies
- **Decorator Pattern**: Non-intrusive caching and enhancement layers
- **Backward Compatibility**: Maintain existing API contracts during transition

### Unified BookingService Structure

```python
# services/unified_booking_service.py

from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from dataclasses import dataclass
from sqlalchemy.orm import Session

class BookingFeature(Enum):
    """Feature flags for booking service capabilities."""
    DOUBLE_BOOKING_PREVENTION = "double_booking_prevention"
    CACHING = "caching"
    NOTIFICATIONS = "notifications"
    CALENDAR_SYNC = "calendar_sync"
    CONFLICT_RESOLUTION = "conflict_resolution"

@dataclass
class BookingConfig:
    """Configuration for booking service behavior."""
    enabled_features: List[BookingFeature]
    cache_ttl: int = 300  # 5 minutes
    max_booking_days_ahead: int = 30
    concurrency_timeout: int = 5
    retry_attempts: int = 3

class BookingStrategy:
    """Base class for booking strategies."""
    def create_booking(self, db: Session, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError
    
    def validate_booking(self, db: Session, booking_data: Dict[str, Any]) -> bool:
        raise NotImplementedError

class StandardBookingStrategy(BookingStrategy):
    """Standard booking creation strategy."""
    # Implementation from original booking_service.py
    pass

class ConflictPreventionStrategy(BookingStrategy):
    """Enhanced booking strategy with conflict prevention."""
    # Implementation from booking_service_enhanced.py
    pass

class UnifiedBookingService:
    """
    Unified booking service consolidating all booking implementations.
    
    Combines functionality from:
    - booking_service.py (core operations)
    - booking_service_enhanced.py (conflict prevention)
    - enhanced_booking_service.py (alternative implementation)
    - booking_service_wrapper.py (configuration layer)
    """
    
    def __init__(self, config: BookingConfig):
        self.config = config
        self.strategy = self._create_strategy()
        self.cache_service = self._create_cache_service() if BookingFeature.CACHING in config.enabled_features else None
    
    def _create_strategy(self) -> BookingStrategy:
        """Create appropriate booking strategy based on configuration."""
        if BookingFeature.DOUBLE_BOOKING_PREVENTION in self.config.enabled_features:
            return ConflictPreventionStrategy()
        return StandardBookingStrategy()
    
    # Core booking operations (from booking_service.py)
    def get_available_slots(self, db: Session, target_date: date, **kwargs) -> Dict[str, Any]:
        """Get available time slots with caching if enabled."""
        cache_key = f"slots:{target_date}:{hash(str(kwargs))}"
        
        if self.cache_service:
            cached_result = self.cache_service.get(cache_key)
            if cached_result:
                return cached_result
        
        # Core slot calculation logic
        result = self._calculate_available_slots(db, target_date, **kwargs)
        
        if self.cache_service:
            self.cache_service.set(cache_key, result, ttl=self.config.cache_ttl)
        
        return result
    
    def create_booking(self, db: Session, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create booking using configured strategy."""
        # Validation
        if not self.strategy.validate_booking(db, booking_data):
            raise ValueError("Booking validation failed")
        
        # Create booking using strategy
        result = self.strategy.create_booking(db, booking_data)
        
        # Post-creation hooks
        if BookingFeature.NOTIFICATIONS in self.config.enabled_features:
            self._send_notifications(result)
        
        if BookingFeature.CALENDAR_SYNC in self.config.enabled_features:
            self._sync_with_calendar(result)
        
        # Invalidate related cache entries
        if self.cache_service:
            self._invalidate_cache(booking_data)
        
        return result
    
    # All other methods consolidated from existing services...
    
    def get_user_bookings(self, db: Session, user_id: int, **kwargs) -> List[Any]:
        """Get user bookings with caching."""
        # Implementation from booking_service.py
        pass
    
    def cancel_booking(self, db: Session, booking_id: int, **kwargs) -> Dict[str, Any]:
        """Cancel booking with all enhancements."""
        # Implementation combining all services
        pass
    
    def update_booking(self, db: Session, booking_id: int, **kwargs) -> Dict[str, Any]:
        """Update booking with conflict checking if enabled."""
        # Implementation combining all services
        pass

# Factory function for creating configured service
def create_booking_service(
    enable_caching: bool = True,
    enable_conflict_prevention: bool = True,
    enable_notifications: bool = True
) -> UnifiedBookingService:
    """Factory function to create pre-configured booking service."""
    features = []
    
    if enable_caching:
        features.append(BookingFeature.CACHING)
    if enable_conflict_prevention:
        features.append(BookingFeature.DOUBLE_BOOKING_PREVENTION)
    if enable_notifications:
        features.append(BookingFeature.NOTIFICATIONS)
    
    config = BookingConfig(enabled_features=features)
    return UnifiedBookingService(config)

# Backward compatibility wrappers
def get_available_slots(db: Session, target_date: date, **kwargs):
    """Backward compatibility wrapper."""
    service = create_booking_service()
    return service.get_available_slots(db, target_date, **kwargs)

def create_booking(db: Session, **kwargs):
    """Backward compatibility wrapper."""
    service = create_booking_service()
    return service.create_booking(db, kwargs)
```

## 2. Unified Calendar Service Architecture

### Design Goals
- **Single OAuth Flow**: Unified Google Calendar authentication
- **Flexible Sync**: Support both one-way and two-way synchronization
- **Webhook Consolidation**: Single webhook handler for all calendar events
- **Conflict Resolution**: Built-in conflict detection and resolution

### Unified Calendar Service Structure

```python
# services/unified_calendar_service.py

from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime

class SyncMode(Enum):
    """Calendar synchronization modes."""
    ONE_WAY_TO_GOOGLE = "one_way_to_google"
    ONE_WAY_FROM_GOOGLE = "one_way_from_google"
    TWO_WAY = "two_way"
    DISABLED = "disabled"

class ConflictResolution(Enum):
    """Conflict resolution strategies."""
    KEEP_LOCAL = "keep_local"
    KEEP_REMOTE = "keep_remote"
    MERGE = "merge"
    PROMPT_USER = "prompt_user"

@dataclass
class CalendarConfig:
    """Configuration for calendar service."""
    sync_mode: SyncMode = SyncMode.TWO_WAY
    conflict_resolution: ConflictResolution = ConflictResolution.PROMPT_USER
    sync_interval_minutes: int = 15
    max_sync_days_ahead: int = 30
    max_sync_days_behind: int = 7

class UnifiedCalendarService:
    """
    Unified calendar service consolidating all calendar implementations.
    
    Combines functionality from:
    - google_calendar_service.py (basic Google Calendar)
    - enhanced_google_calendar_service.py (enhanced features)
    - calendar_sync_service.py (one-way sync)
    - calendar_twoway_sync_service.py (two-way sync)
    - google_calendar_integration_service.py (integration layer)
    """
    
    def __init__(self, db: Session, config: CalendarConfig):
        self.db = db
        self.config = config
        self.google_service = self._initialize_google_service()
        self.sync_engine = self._create_sync_engine()
    
    # Core Google Calendar operations (from google_calendar_service.py)
    def get_user_credentials(self, user: User) -> Optional[Credentials]:
        """Unified credential management."""
        pass
    
    def create_event(self, user: User, event: CalendarEvent, **kwargs) -> str:
        """Create calendar event with enhanced error handling."""
        pass
    
    def sync_user_calendar(self, user: User) -> SyncResult:
        """Perform calendar sync based on configured mode."""
        if self.config.sync_mode == SyncMode.DISABLED:
            return SyncResult(status="disabled")
        
        return self.sync_engine.sync(user, self.config.sync_mode)
    
    def detect_conflicts(self, user: User, start_date: datetime, end_date: datetime) -> List[Conflict]:
        """Detect calendar conflicts using enhanced algorithm."""
        pass
    
    def resolve_conflict(self, conflict: Conflict, resolution: ConflictResolution) -> bool:
        """Resolve calendar conflicts based on strategy."""
        pass

class CalendarWebhookService:
    """Specialized service for handling calendar webhooks."""
    # Keep separate as it's specialized functionality
    pass
```

## 3. Unified Component System Architecture

### Component Hierarchy Design

```typescript
// components/calendar/unified/CalendarSystem.tsx

interface CalendarSystemProps {
  view: 'day' | 'week' | 'month' | 'agenda'
  mobile?: boolean
  features?: CalendarFeature[]
  theme?: CalendarTheme
}

enum CalendarFeature {
  ACCESSIBILITY = 'accessibility',
  ERROR_BOUNDARY = 'error_boundary',
  LOADING_STATES = 'loading_states',
  NETWORK_STATUS = 'network_status',
  SYNC_STATUS = 'sync_status',
  CONFLICT_RESOLUTION = 'conflict_resolution'
}

// Main calendar system component
export function CalendarSystem({ view, mobile = false, features = [], theme }: CalendarSystemProps) {
  // Dynamically compose calendar based on props
  const CalendarComponent = useMemo(() => {
    const BaseCalendar = mobile ? MobileCalendar : DesktopCalendar
    
    // Wrap with feature components
    let WrappedCalendar = BaseCalendar
    
    if (features.includes(CalendarFeature.ERROR_BOUNDARY)) {
      WrappedCalendar = withErrorBoundary(WrappedCalendar)
    }
    
    if (features.includes(CalendarFeature.LOADING_STATES)) {
      WrappedCalendar = withLoadingStates(WrappedCalendar)
    }
    
    // Add other feature wrappers...
    
    return WrappedCalendar
  }, [mobile, features])
  
  return <CalendarComponent view={view} theme={theme} />
}

// Consolidated view components
const CalendarViews = {
  day: CalendarDayView,
  week: CalendarWeekView,
  month: CalendarMonthView,
  agenda: CalendarAgendaView
}

// Higher-order components for features
function withErrorBoundary<T>(Component: React.ComponentType<T>) {
  return function WithErrorBoundary(props: T) {
    return (
      <CalendarErrorBoundary>
        <Component {...props} />
      </CalendarErrorBoundary>
    )
  }
}

function withLoadingStates<T>(Component: React.ComponentType<T>) {
  return function WithLoadingStates(props: T) {
    const { isLoading } = useCalendarState()
    
    if (isLoading) {
      return <CalendarLoadingStates />
    }
    
    return <Component {...props} />
  }
}
```

### Component Consolidation Strategy

**Keep (Core Components)**:
- `CalendarSystem` (new unified component)
- `CalendarDayView`, `CalendarWeekView`, `CalendarMonthView`, `CalendarAgendaView`
- `CalendarSync`, `CalendarConflictResolver`

**Consolidate (Mobile Components)**:
- Merge mobile-specific components into responsive variants
- Use CSS-in-JS or Tailwind responsive classes instead of separate components

**Remove (Unused/Demo Components)**:
- `MobileCalendarDemo.tsx` (demo only)
- `CalendarWithErrorHandling.tsx` (unused)
- `AccessibilityTester.tsx` (test component)
- `MobileBookingOverlay.tsx` (unused)
- `MobileTimeSlot.tsx` (unused)
- `ResponsiveCalendarLayout.tsx` (unused)

## 4. Unified Cache Service Architecture

### Cache Service Design

```python
# services/unified_cache_service.py

from enum import Enum
from typing import Optional, Any, Dict, List
import redis
import json
from datetime import datetime, timedelta

class CacheNamespace(Enum):
    """Cache key namespaces for different data types."""
    BOOKINGS = "bookings"
    CALENDAR = "calendar"
    USERS = "users"
    AVAILABILITY = "availability"
    ANALYTICS = "analytics"

class CacheInvalidationTrigger(Enum):
    """Events that trigger cache invalidation."""
    BOOKING_CREATED = "booking_created"
    BOOKING_UPDATED = "booking_updated"
    BOOKING_DELETED = "booking_deleted"
    CALENDAR_SYNCED = "calendar_synced"

class UnifiedCacheService:
    """
    Unified cache service consolidating all cache implementations.
    
    Combines functionality from:
    - redis_service.py (connection management)
    - cached_booking_service.py (booking cache)
    - booking_cache_service.py (alternative booking cache)
    - cache_health_service.py (health monitoring)
    - cache_invalidation_service.py (invalidation logic)
    """
    
    def __init__(self):
        self.redis_client = self._create_redis_client()
        self.health_checker = CacheHealthChecker(self.redis_client)
        self.invalidation_manager = CacheInvalidationManager(self.redis_client)
    
    def get(self, namespace: CacheNamespace, key: str) -> Optional[Any]:
        """Get cached value with namespace."""
        cache_key = self._build_key(namespace, key)
        try:
            value = self.redis_client.get(cache_key)
            return json.loads(value) if value else None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None
    
    def set(self, namespace: CacheNamespace, key: str, value: Any, ttl: int = 300) -> bool:
        """Set cached value with TTL."""
        cache_key = self._build_key(namespace, key)
        try:
            serialized_value = json.dumps(value, default=str)
            self.redis_client.setex(cache_key, ttl, serialized_value)
            return True
        except Exception as e:
            logger.warning(f"Cache set failed: {e}")
            return False
    
    def invalidate(self, trigger: CacheInvalidationTrigger, context: Dict[str, Any]) -> None:
        """Invalidate cache based on trigger and context."""
        self.invalidation_manager.invalidate(trigger, context)
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get cache health status."""
        return self.health_checker.check_health()

# Decorator for automatic caching
def cache_result(namespace: CacheNamespace, key_generator: callable, ttl: int = 300):
    def decorator(func):
        def wrapper(*args, **kwargs):
            cache_service = get_cache_service()
            cache_key = key_generator(*args, **kwargs)
            
            # Try to get from cache
            cached_result = cache_service.get(namespace, cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_service.set(namespace, cache_key, result, ttl)
            return result
        return wrapper
    return decorator
```

## 5. Router Consolidation Strategy

### Unified Router Architecture

```python
# routers/unified_appointments.py

from fastapi import APIRouter, Depends
from typing import Optional

router = APIRouter(prefix="/appointments", tags=["appointments"])

# Consolidate endpoints from both appointments.py and appointments_enhanced.py
@router.post("/", response_model=schemas.AppointmentResponse)
async def create_appointment(
    appointment_data: schemas.AppointmentCreate,
    enhanced_validation: bool = False,  # Feature flag
    db: Session = Depends(get_db)
):
    """
    Create appointment with optional enhanced validation.
    
    Combines functionality from:
    - appointments.py::/appointments/ (standard creation)
    - appointments_enhanced.py::/appointments/ (enhanced creation)
    """
    booking_service = create_booking_service(
        enable_conflict_prevention=enhanced_validation
    )
    
    return booking_service.create_booking(db, appointment_data.dict())

@router.put("/{appointment_id}", response_model=schemas.AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_data: schemas.AppointmentUpdate,
    enhanced_validation: bool = False,
    db: Session = Depends(get_db)
):
    """
    Update appointment with optional enhanced validation.
    
    Combines functionality from both routers.
    """
    # Implementation consolidating both approaches
    pass

# Feature-specific endpoints with clear naming
@router.post("/validate", response_model=schemas.ValidationResponse)
async def validate_appointment_advanced(
    appointment_data: schemas.AppointmentCreate,
    db: Session = Depends(get_db)
):
    """Advanced appointment validation (from enhanced router)."""
    pass

@router.post("/check-availability", response_model=schemas.AvailabilityResponse)
async def check_availability_advanced(
    availability_check: schemas.AvailabilityCheck,
    db: Session = Depends(get_db)
):
    """Advanced availability checking (from enhanced router)."""
    pass
```

## Migration Strategy

### Phase 1: Implementation (Days 3-5)
1. **Create unified services** alongside existing ones
2. **Add feature flags** to enable gradual rollout
3. **Maintain backward compatibility** with wrapper functions
4. **Comprehensive testing** at each step

### Phase 2: Migration (Days 6-7)
1. **Update imports** gradually across the codebase
2. **Enable unified services** with feature flags
3. **Monitor performance** and error rates
4. **Create migration scripts** for any data changes

### Phase 3: Cleanup (Day 8)
1. **Remove deprecated services** after migration is complete
2. **Update documentation** and API specs
3. **Performance optimization** of unified services
4. **Final testing** and validation

## Expected Outcomes

### Code Metrics
- **70% reduction** in booking service code (4,230 → 1,300 lines)
- **60% reduction** in calendar service code (2,769 → 1,100 lines)
- **50% reduction** in calendar components (24 → 12 components)
- **80% reduction** in cache services (5 → 1 service)

### Performance Benefits
- **Faster cold starts** (reduced import overhead)
- **Better caching efficiency** (unified cache strategy)
- **Reduced memory footprint** (no duplicate service instances)
- **Improved bundle size** (fewer duplicate components)

### Maintenance Benefits
- **Single source of truth** for each service type
- **Consistent error handling** across all services
- **Unified logging and monitoring**
- **Easier feature development** (clear extension points)
- **Reduced testing complexity** (fewer service combinations)

This unified architecture will significantly reduce the complexity of the BookedBarber V2 codebase while maintaining all existing functionality and providing clear paths for future enhancements.