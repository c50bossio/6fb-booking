# Notification System Documentation

## Overview

The Six FB Booking notification system provides comprehensive email, SMS, and push notification capabilities for appointment confirmations, reminders, cancellations, and payment receipts. This system is designed to be modular, scalable, and easy to integrate with existing booking flows.

## Features

### 🚀 Core Features
- **Multi-channel notifications** (Email, SMS, Push)
- **Automated appointment reminders** (24h, 2h before)
- **Real-time delivery tracking** with webhook support
- **Customizable notification preferences** per user
- **Template management** with dynamic content
- **Analytics and reporting** dashboard
- **Failed notification retry logic** with exponential backoff
- **Unsubscribe handling** and compliance

### 📧 Email Notifications
- HTML and text templates
- SendGrid integration
- Open and click tracking
- Unsubscribe management
- Template customization

### 📱 SMS Notifications
- Twilio integration
- Character limit optimization
- Delivery confirmations
- Auto-formatting for phone numbers

### 🔔 Push Notifications
- Browser push notifications
- Real-time updates
- Cross-platform support

## Architecture

```
src/
├── components/notifications/
│   ├── NotificationCenter.tsx      # History and status view
│   ├── NotificationSettings.tsx    # User preferences
│   ├── NotificationTesting.tsx     # Admin testing interface
│   ├── NotificationAnalytics.tsx   # Performance metrics
│   └── index.ts                    # Exports
├── lib/notifications/
│   ├── email-templates.ts          # Email template definitions
│   ├── sms-templates.ts            # SMS template definitions
│   ├── notification-service.ts     # Core service logic
│   └── webhook-handler.ts          # Delivery status handling
└── app/dashboard/notifications/
    └── page.tsx                    # Main dashboard page
```

## Components

### NotificationCenter
Central hub for viewing notification history and status.

**Features:**
- Real-time status updates
- Filter by notification type
- Delivery analytics
- Error handling and retry information

**Usage:**
```tsx
import { NotificationCenter } from '@/components/notifications';

<NotificationCenter className="w-full" />
```

### NotificationSettings
User preferences management interface.

**Features:**
- Email/SMS/Push preferences
- Reminder timing configuration
- Quiet hours settings
- Test notification sending

**Usage:**
```tsx
import { NotificationSettings } from '@/components/notifications';

<NotificationSettings className="max-w-4xl" />
```

### NotificationTesting
Admin interface for testing notification templates.

**Features:**
- Template preview (HTML/Text/SMS)
- Test notification sending
- Sample data generation
- Delivery status tracking

**Usage:**
```tsx
import { NotificationTesting } from '@/components/notifications';

<NotificationTesting className="admin-only" />
```

### NotificationAnalytics
Performance metrics and analytics dashboard.

**Features:**
- Delivery rate tracking
- Open/click analytics
- Time-series charts
- Template performance comparison

**Usage:**
```tsx
import { NotificationAnalytics } from '@/components/notifications';

<NotificationAnalytics dateRange="week" />
```

## Services

### NotificationService
Core service for sending and managing notifications.

**Key Methods:**
```typescript
// Send appointment confirmation
await notificationService.sendAppointmentConfirmation(booking, preferences);

// Send reminder
await notificationService.sendAppointmentReminder(booking, hoursUntil, preferences);

// Send cancellation
await notificationService.sendAppointmentCancellation(booking, preferences);

// Send payment receipt
await notificationService.sendPaymentReceipt(booking, paymentDetails, preferences);
```

### WebhookHandler
Processes delivery status updates from email and SMS providers.

**Key Methods:**
```typescript
// Process SendGrid webhooks
webhookHandler.processSendGridWebhook(events);

// Process Twilio webhooks
webhookHandler.processTwilioWebhook(event);

// Subscribe to status updates
webhookHandler.addEventListener('delivered', (payload) => {
  console.log('Notification delivered:', payload);
});
```

## Templates

### Email Templates
Rich HTML templates with fallback text versions.

**Available Templates:**
- `appointment_confirmation` - Booking confirmation with details
- `appointment_reminder` - Pre-appointment reminders
- `appointment_cancellation` - Cancellation notifications
- `payment_receipt` - Payment confirmation receipts

**Template Data Structure:**
```typescript
interface TemplateData {
  clientName: string;
  clientEmail: string;
  barberName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  price: number;
  locationName: string;
  locationAddress: string;
  confirmationNumber: string;
  // ... additional fields
}
```

### SMS Templates
Optimized for 160-character limit with automatic truncation.

**Features:**
- Character count optimization
- URL shortening support
- Phone number validation
- Automatic formatting

## Integration

### Booking Flow Integration
Automatically send notifications when bookings are created:

```tsx
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';

<BookingConfirmation
  booking={bookingDetails}
  sendNotifications={true}
  userId={user.id}
  onNewBooking={handleNewBooking}
/>
```

### API Integration
Connect to backend notification services:

```typescript
import { notificationsService } from '@/lib/api/notifications';

// Get user preferences
const preferences = await notificationsService.getPreferences(userId);

// Send test notification
const result = await notificationsService.testNotification('email', 'test@example.com', 'appointment_confirmation');
```

## Configuration

### Environment Variables
```env
# Email Provider (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Webhook URLs
SENDGRID_WEBHOOK_URL=https://yourdomain.com/api/webhooks/sendgrid
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/webhooks/twilio
```

### Default Settings
```typescript
const defaultPreferences = {
  email: {
    appointment_confirmation: true,
    appointment_reminder: true,
    appointment_cancellation: true,
    payment_receipt: true,
    marketing: false
  },
  sms: {
    appointment_confirmation: true,
    appointment_reminder: true,
    appointment_cancellation: true,
    payment_confirmation: true,
    marketing: false
  },
  reminders: {
    hours_before: 24,
    second_reminder_hours: 2
  },
  quiet_hours: {
    enabled: true,
    start: 22, // 10 PM
    end: 8     // 8 AM
  }
};
```

## Analytics & Monitoring

### Key Metrics
- **Delivery Rate**: Percentage of notifications successfully delivered
- **Open Rate**: Percentage of emails opened by recipients
- **Click Rate**: Percentage of recipients who clicked links
- **Failure Rate**: Percentage of failed deliveries
- **Response Time**: Average time from send to delivery

### Dashboard Features
- Real-time metrics
- Time-series charts
- Template performance comparison
- Provider-specific analytics
- Export capabilities

## Error Handling

### Retry Logic
Failed notifications are automatically retried with exponential backoff:
- **1st retry**: After 1 second
- **2nd retry**: After 2 seconds
- **3rd retry**: After 4 seconds
- **Max retries**: 3 attempts

### Failure Scenarios
- **Email bounces**: Automatically marked as failed
- **SMS failures**: Error codes processed and logged
- **Network timeouts**: Automatic retry with backoff
- **Rate limiting**: Queued and retried after cooldown

## Security & Compliance

### Data Protection
- **PII encryption**: Personal data encrypted at rest
- **Secure transmission**: HTTPS/TLS for all communications
- **Access control**: Role-based permissions
- **Audit logging**: All notification events logged

### Compliance Features
- **Unsubscribe handling**: One-click unsubscribe
- **Consent management**: Opt-in tracking
- **Data retention**: Automatic cleanup of old notifications
- **GDPR compliance**: Data deletion on request

## Testing

### Unit Tests
```bash
# Run notification tests
npm test src/components/notifications/
npm test src/lib/notifications/
```

### Integration Tests
```bash
# Test with mock providers
npm run test:integration notifications
```

### Manual Testing
Use the NotificationTesting component to:
- Preview templates
- Send test notifications
- Verify delivery status
- Test webhook handling

## Deployment

### Production Checklist
- [ ] Configure email/SMS provider credentials
- [ ] Set up webhook endpoints
- [ ] Configure domain authentication
- [ ] Test notification delivery
- [ ] Monitor initial metrics
- [ ] Set up alerting for failures

### Monitoring
- **Delivery rates** below 95%
- **Failed notifications** exceeding threshold
- **Webhook processing** errors
- **Template rendering** failures

## Troubleshooting

### Common Issues

**Notifications not sending:**
1. Check provider credentials
2. Verify API rate limits
3. Check webhook configuration
4. Review error logs

**Poor delivery rates:**
1. Check sender reputation
2. Review template content
3. Verify recipient addresses
4. Monitor spam reports

**Webhook failures:**
1. Verify endpoint accessibility
2. Check SSL certificate
3. Review payload format
4. Monitor processing logs

### Debug Tools
- **Test interface**: Send test notifications
- **Analytics dashboard**: Monitor delivery metrics
- **Error logs**: Review failure details
- **Webhook inspector**: Debug delivery status updates

## Future Enhancements

### Planned Features
- **A/B testing** for templates
- **Machine learning** for send time optimization
- **Advanced segmentation** for targeted campaigns
- **Multi-language** template support
- **Rich media** support in notifications

### Integration Roadmap
- **Calendar integration** for automatic reminders
- **CRM synchronization** for customer data
- **Social media** notifications
- **Voice call** notifications for urgent updates

## Support

For technical support or feature requests:
- **Documentation**: See inline code comments
- **Issues**: Create GitHub issues for bugs
- **Features**: Submit enhancement requests
- **Contact**: Reach out to the development team

---

*Last updated: June 2024*
