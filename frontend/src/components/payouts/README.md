# Payout Management Components

This directory contains all the components for managing barber payouts in the 6FB booking platform.

## Components Overview

### 1. PayoutScheduleConfig
- Configure automatic payout schedules (daily, weekly, biweekly, monthly)
- Set payout thresholds and processing times
- Configure payment methods and automation settings
- Enable/disable notifications for different events

### 2. PayoutAnalyticsDashboard
- View comprehensive payout analytics and trends
- Track total payouts, pending amounts, and barber earnings
- Visualize payment method distribution
- Export payout data for accounting purposes

### 3. PayoutStatusTracker
- Real-time tracking of payout processing status
- View pending, processing, completed, and failed payouts
- Auto-refresh capability for live updates
- Quick retry functionality for failed payouts

### 4. ManualPayoutTrigger
- Process payouts outside of regular schedule
- Bulk select barbers for immediate payout
- Add reasons for manual payouts
- Emergency payout capabilities

### 5. PayoutNotificationSettings
- Configure notification channels (Email, SMS, Push, In-App)
- Set triggers for different payout events
- Manage recipient groups (Barbers, Admins, Accounting)
- Configure quiet hours and digest mode

### 6. PayoutCalendarView
- Calendar view of scheduled and completed payouts
- Timeline view for chronological payout history
- Visual status indicators for different payout states
- Monthly overview of payout schedule

### 7. BarberPayoutDashboard
- Individual barber payout dashboard
- Track personal earnings and payout history
- View commission rates and payment methods
- Download earning statements

## Usage Examples

### Basic Implementation

```tsx
import { PayoutAnalyticsDashboard } from '@/components/payouts'

export default function PayoutsPage() {
  return (
    <div className="p-6">
      <PayoutAnalyticsDashboard />
    </div>
  )
}
```

### Complete Management Page

```tsx
import {
  PayoutScheduleConfig,
  PayoutAnalyticsDashboard,
  PayoutStatusTracker,
  ManualPayoutTrigger,
  PayoutNotificationSettings,
  PayoutCalendarView,
  BarberPayoutDashboard
} from '@/components/payouts'

// See /app/app/payouts/management/page.tsx for full implementation
```

### Barber-Specific View

```tsx
import { BarberPayoutDashboard } from '@/components/payouts'

export default function BarberDashboard({ barberId }) {
  return <BarberPayoutDashboard barberId={barberId} />
}
```

## API Integration

These components are currently using mock data. To integrate with your backend API:

1. Replace mock data with API calls in component state
2. Add error handling and loading states
3. Implement actual payout processing logic
4. Connect notification settings to your notification service

Example API integration:

```tsx
// In PayoutStatusTracker.tsx
useEffect(() => {
  const fetchPayoutStatus = async () => {
    try {
      const response = await fetch('/api/v1/payouts/status')
      const data = await response.json()
      setPayouts(data.payouts)
    } catch (error) {
      console.error('Error fetching payout status:', error)
    }
  }

  fetchPayoutStatus()

  if (autoRefresh) {
    const interval = setInterval(fetchPayoutStatus, 5000)
    return () => clearInterval(interval)
  }
}, [autoRefresh])
```

## Styling

All components use:
- Tailwind CSS for styling
- Consistent color scheme (violet/purple for primary actions)
- Heroicons for icons
- Responsive design patterns
- Accessible form controls

## Dependencies

- React 18+
- Tailwind CSS
- @heroicons/react
- recharts (for charts and analytics)

## Future Enhancements

1. Add WebSocket support for real-time status updates
2. Implement batch payout processing
3. Add PDF statement generation
4. Include tax reporting features
5. Add multi-currency support
6. Implement payout approval workflows
