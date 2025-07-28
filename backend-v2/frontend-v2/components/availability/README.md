# Comprehensive Barber Availability Management System

A complete availability management system designed to support the Six Figure Barber methodology for efficient business operations and revenue optimization.

## System Overview

This system provides barbers and shop owners with professional tools to manage schedules, track utilization, handle time off requests, and optimize revenue through intelligent availability management.

## Core Components

### 1. BarberAvailabilityManager
The main component providing a complete availability management interface.

**Features:**
- Visual weekly schedule management
- Real-time availability updates
- Time off request submission
- Special hours configuration
- Analytics integration
- Calendar view (coming soon)

**Usage:**
```tsx
import { BarberAvailabilityManager } from '@/components/availability';

<BarberAvailabilityManager
  barberId={1}
  isManager={true}
  canEditOthers={true}
  onScheduleChange={(barberId, schedule) => {
    console.log('Schedule updated for barber', barberId);
  }}
/>
```

### 2. BulkAvailabilityManager
Bulk operations for managing multiple barber schedules efficiently.

**Features:**
- Multi-barber schedule updates
- Copy schedules between barbers
- Apply schedule templates
- Batch operations with progress tracking
- Error handling and rollback

**Usage:**
```tsx
import { BulkAvailabilityManager } from '@/components/availability';

<BulkAvailabilityManager
  barbers={barbers}
  onBulkUpdate={(updates) => {
    console.log('Bulk update completed', updates);
  }}
/>
```

### 3. TimeOffApprovalWorkflow
Manager interface for handling time off requests with approval workflow.

**Features:**
- Pending request management
- Approval/denial workflow
- Notification system
- Urgency tracking
- Bulk actions
- Filter and search capabilities

**Usage:**
```tsx
import { TimeOffApprovalWorkflow } from '@/components/availability';

<TimeOffApprovalWorkflow
  managerId={managerId}
  barbers={barbers}
  onRequestAction={(requestId, action, reason) => {
    console.log(`Request ${requestId} ${action}`, reason);
  }}
/>
```

### 4. AvailabilityAnalytics
Comprehensive analytics for utilization tracking and revenue optimization.

**Features:**
- Six Figure Barber progress tracking
- Utilization rate monitoring
- Revenue per hour analytics
- Performance insights
- Optimization recommendations
- Peak hour analysis

**Usage:**
```tsx
import { AvailabilityAnalytics } from '@/components/availability';

<AvailabilityAnalytics
  barberId={barberId}
  barbers={barbers}
  showComparison={true}
  period="month"
/>
```

### 5. ConflictDetection
Real-time conflict detection and resolution system.

**Features:**
- Appointment overlap detection
- Availability gap identification
- Time off conflict checking
- Auto-resolution capabilities
- Manual resolution workflows
- Real-time monitoring

**Usage:**
```tsx
import { ConflictDetection } from '@/components/availability';

<ConflictDetection
  barberId={barberId}
  proposedSchedule={schedule}
  onConflictResolved={(conflicts) => {
    console.log('Conflicts resolved', conflicts);
  }}
  realTimeMode={true}
/>
```

## Service Layer

### BarberAvailabilityService
Comprehensive service class handling all API interactions.

**Key Methods:**
- `getBarberAvailability(barberId, dayOfWeek?)`
- `createBarberAvailability(barberId, data)`
- `bulkUpdateAvailability(updates)`
- `createTimeOffRequest(barberId, data)`
- `checkBarberAvailability(barberId, date, startTime, endTime)`
- `getUtilizationAnalytics(barberId, period)`
- `detectScheduleConflicts(barberId, schedule)`

## Custom Hooks

### useBarberAvailability
Main hook for availability management.

```tsx
const {
  availability,
  timeOffRequests,
  specialAvailability,
  weeklySchedule,
  loading,
  error,
  updateAvailability,
  createAvailability,
  bulkUpdateAvailability
} = useBarberAvailability(barberId);
```

### useTimeOffRequests
Specialized hook for time off management.

```tsx
const {
  requests,
  pendingRequests,
  upcomingTimeOff,
  createRequest,
  approveRequest,
  denyRequest
} = useTimeOffRequests(barberId);
```

### useAvailabilityAnalytics
Analytics and insights hook.

```tsx
const {
  analytics,
  insights,
  refetch
} = useAvailabilityAnalytics(barberId, 'month');
```

### useConflictDetection
Conflict detection and resolution.

```tsx
const {
  conflicts,
  hasConflicts,
  criticalConflicts,
  detectConflicts,
  clearConflicts
} = useConflictDetection();
```

## API Integration

The system integrates with existing backend APIs:

### Existing Endpoints
- `GET /api/v2/barber-availability/availability/{barberId}`
- `POST /api/v2/barber-availability/availability/{barberId}`
- `PUT /api/v2/barber-availability/availability/{availabilityId}`
- `DELETE /api/v2/barber-availability/availability/{availabilityId}`
- `GET /api/v2/barber-availability/schedule/{barberId}`
- `POST /api/v2/barber-availability/time-off/{barberId}`
- `GET /api/v2/barber-availability/check/{barberId}`

### Future Endpoints (to be implemented)
- `GET /api/v2/analytics/barber-utilization/{barberId}`
- `POST /api/v2/availability-conflicts/{barberId}`
- `POST /api/v2/revenue-optimization/schedule/{barberId}`
- `GET /api/v2/schedule-templates`
- `POST /api/v2/schedule-templates/{templateId}/apply`

## Six Figure Barber Methodology Integration

The system is designed around the Six Figure Barber methodology principles:

### 1. Revenue Optimization
- Target $125,000 annual revenue tracking
- Revenue per hour monitoring ($75+ target)
- Premium pricing recommendations
- Peak hour identification

### 2. Client Value Creation
- Optimal scheduling for client convenience
- Conflict-free appointment experiences
- Professional availability management
- Consistent service delivery

### 3. Business Efficiency
- Automated conflict detection
- Bulk operations for time savings
- Intelligent recommendations
- Streamlined approval workflows

### 4. Professional Growth
- Performance analytics and insights
- Utilization optimization
- Capacity management
- Revenue growth tracking

### 5. Scalability
- Multi-barber management
- Template-based scaling
- Manager oversight tools
- Enterprise-ready architecture

## Installation and Setup

1. **Import the components:**
```tsx
import {
  BarberAvailabilityManager,
  BulkAvailabilityManager,
  TimeOffApprovalWorkflow,
  AvailabilityAnalytics,
  ConflictDetection
} from '@/components/availability';
```

2. **Configure the service:**
Ensure your API endpoints are properly configured in `/lib/api.ts`.

3. **Add to your application:**
```tsx
// For individual barber management
<BarberAvailabilityManager barberId={barberId} />

// For manager dashboard
<BulkAvailabilityManager barbers={barbers} />
<TimeOffApprovalWorkflow managerId={managerId} barbers={barbers} />

// For analytics
<AvailabilityAnalytics barberId={barberId} period="month" />
```

## Customization Options

### Theme Integration
The system uses shadcn/ui components and follows the existing design system. All components accept standard className props for customization.

### Callback Integration
Each component provides callback props for integration with your application's state management:

- `onScheduleChange`
- `onBulkUpdate`
- `onRequestAction`
- `onConflictResolved`

### Real-time Updates
Enable real-time monitoring by setting `realTimeMode={true}` on supported components.

## Performance Considerations

### Optimization Features
- Lazy loading of analytics data
- Debounced search and filters
- Batch API operations
- Intelligent caching
- Progressive loading

### Database Performance
The system integrates with optimized database queries:
- Indexed availability lookups
- Efficient conflict detection
- Cached analytics calculations
- Connection pooling

## Security

### Authorization
- Role-based access control (RBAC)
- Barber-specific data isolation
- Manager permission validation
- Secure API endpoints

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF token validation

## Testing

### Component Testing
```bash
npm test -- --testPathPattern=availability
```

### E2E Testing
```bash
npm run test:e2e -- availability
```

### API Testing
```bash
pytest backend-v2/tests/test_barber_availability.py
```

## Future Enhancements

### Planned Features
- Mobile app integration
- Calendar synchronization (Google Calendar, Outlook)
- SMS notifications
- Advanced reporting
- Machine learning recommendations
- Multi-location support

### API Extensions
- Webhook integrations
- Third-party calendar sync
- Payment integration
- Marketing automation
- Client communication

## Support and Documentation

For additional support:
- Component documentation: `/docs/availability-components.md`
- API documentation: `http://localhost:8000/docs#barber-availability`
- Testing guide: `/docs/testing-availability.md`
- Deployment guide: `/docs/deployment.md`

## Version History

### v1.0.0 (Current)
- Initial comprehensive availability management system
- Full Six Figure Barber methodology integration
- Real-time conflict detection
- Advanced analytics and insights
- Manager approval workflows
- Bulk operations support

---

**Built with the Six Figure Barber methodology for professional barbershops focused on premium service delivery and revenue optimization.**