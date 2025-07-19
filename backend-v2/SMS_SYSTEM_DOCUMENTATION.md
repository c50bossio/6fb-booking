# BookedBarber Professional SMS System

## Overview

BookedBarber now features a comprehensive, professional SMS system that enables two-way communication for appointment management. The system includes:

1. **Professional SMS Templates** - Clean, concise messages without excessive emojis
2. **Two-Way SMS Response Handler** - Automated responses to customer keywords
3. **URL Shortener Service** - Branded short links for tracking and efficiency
4. **Webhook Integration** - Handles incoming SMS via Twilio webhooks

## Professional SMS Templates

### Key Improvements

- **Removed excessive emojis** for professional appearance
- **Concise messaging** that fits within SMS character limits
- **Clear call-to-actions** with response keywords
- **Branded short URLs** for appointment management
- **Professional tone** consistent with premium brand

### Template Examples

#### Appointment Confirmation
```
APPOINTMENT CONFIRMED

John Doe, your appointment is confirmed:

December 15 at 2:00 PM
Service: Haircut ($45.00)
With: Mike

https://bkdbrbr.com/appt123v

Reply CANCEL to cancel or call (555) 123-4567

BookedBarber
```

#### Appointment Reminder
```
REMINDER: 2HR

John Doe, your appointment is in 2 hours:

2:00 PM - Haircut
With: Mike
Location: 123 Main St

https://bkdbrbr.com/appt123v

Reply RESCHEDULE to change or call (555) 123-4567

BookedBarber
```

#### Appointment Cancellation
```
APPOINTMENT CANCELLED

John Doe, cancellation confirmed:

December 15 at 2:00 PM
Service: Haircut

Refund: $45.00 (3-5 days)

https://bkdbrbr.com/book

Questions? Call (555) 123-4567

BookedBarber
```

## Two-Way SMS Response Handler

### Supported Keywords

The system recognizes these keywords and variations:

#### CONFIRM / CONFIRMATION
- `CONFIRM`, `CONFIRMED`, `YES`, `Y`, `OK`, `OKAY`, `1`, `ACCEPT`
- **Action**: Confirms the appointment
- **Response**: Confirmation with appointment details

#### CANCEL / CANCELLATION  
- `CANCEL`, `CANCELLED`, `NO`, `N`, `STOP`, `2`, `DELETE`, `REMOVE`
- **Action**: Cancels the appointment with appropriate refund handling
- **Response**: Cancellation confirmation with refund details

#### RESCHEDULE
- `RESCHEDULE`, `RESCHED`, `CHANGE`, `MOVE`, `SWITCH`, `3`, `UPDATE`, `MODIFY`
- **Action**: Provides reschedule link
- **Response**: Instructions to reschedule with link

#### HELP
- `HELP`, `INFO`, `SUPPORT`, `OPTIONS`, `COMMANDS`, `4`, `?`
- **Action**: Provides available options
- **Response**: List of available commands

#### STATUS
- `STATUS`, `CHECK`, `WHEN`, `TIME`, `DETAILS`, `5`, `INFO`
- **Action**: Provides appointment details
- **Response**: Current appointment information

### Smart Appointment Lookup

The system automatically finds appointments by:
1. **Phone number matching** in User and Client tables
2. **Recent appointments** within the last 7 days or future appointments
3. **Active status filtering** (confirmed, pending appointments only)

### Example Interactions

```
Customer: "CANCEL"
System: "Your appointment on December 15 has been cancelled. Refund: $45.00 will be processed within 3-5 days. Book again: https://bkdbrbr.com/book - BookedBarber"

Customer: "HELP"
System: "Reply: CONFIRM to confirm, CANCEL to cancel, RESCHEDULE to change time, STATUS for details, or call (555) 123-4567 - BookedBarber"

Customer: "STATUS"
System: "Your appointment: December 15 at 2:00 PM for Haircut. With: Mike. Questions? Call (555) 123-4567 - BookedBarber"
```

## URL Shortener Service

### Features

- **Branded URLs**: `bkdbrbr.com/{code}` format
- **Click tracking**: Monitors engagement metrics
- **Expiration support**: Automatic cleanup of expired links
- **Custom codes**: Appointment-specific codes like `appt123v`
- **Categorization**: Different types for bookings, appointments, etc.

### URL Types

#### Appointment URLs
- **View**: `bkdbrbr.com/appt123v` → `/appointments/123`
- **Cancel**: `bkdbrbr.com/appt123c` → `/appointments/123/cancel`
- **Reschedule**: `bkdbrbr.com/appt123r` → `/appointments/123/reschedule`
- **Confirm**: `bkdbrbr.com/appt123n` → `/appointments/123/confirm`

#### Booking URLs
- **General**: `bkdbrbr.com/book` → `/book`
- **Barber-specific**: `bkdbrbr.com/bookb5` → `/book?barber=5`
- **Service-specific**: `bkdbrbr.com/books3` → `/book?service=3`

### Usage Example

```python
from utils.url_shortener import create_appointment_short_url

# Create short URL for appointment
short_url = create_appointment_short_url(db, appointment_id=123, action="view")
# Returns: "https://bkdbrbr.com/appt123v"

# Use in SMS template
context = {
    "short_url": short_url,
    "client_name": "John Doe",
    # ... other variables
}
```

## Webhook Integration

### SMS Webhook Endpoint

**URL**: `POST /api/v2/webhooks/sms`

Handles incoming SMS messages from Twilio with automatic response processing.

#### Request Format (Twilio)
```
From: +1234567890
Body: CANCEL
MessageSid: SM1234567890abcdef
AccountSid: AC1234567890abcdef
```

#### Response Format
```json
{
  "status": "processed",
  "action": "cancelled",
  "success": true
}
```

### SMS Status Webhook

**URL**: `POST /api/v2/webhooks/sms/status`

Tracks delivery status of outbound SMS messages.

## Configuration

### Required Environment Variables

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# URL Shortener Configuration
URL_SHORTENER_DOMAIN=bkdbrbr.com

# Application URLs
APP_URL=https://app.bookedbarber.com
BUSINESS_PHONE=+1234567890
APP_NAME=BookedBarber
```

### Twilio Webhook Setup

1. **SMS Webhook URL**: `https://your-domain.com/api/v2/webhooks/sms`
2. **Status Webhook URL**: `https://your-domain.com/api/v2/webhooks/sms/status`
3. **HTTP Method**: POST
4. **Content Type**: application/x-www-form-urlencoded

## Database Schema

### Short URLs Table
```sql
CREATE TABLE short_urls (
    id INTEGER PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    title VARCHAR(200),
    description VARCHAR(500),
    click_count INTEGER DEFAULT 0,
    last_clicked DATETIME,
    created_by VARCHAR(100),
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Short URL Management

#### Redirect Short URL
```
GET /{short_code}
```
Redirects to original URL and tracks click.

#### Get URL Statistics
```
GET /stats/{short_code}
```
Returns click statistics for a short URL.

#### Create Short URL
```
POST /create
```
Creates a new short URL (admin use).

#### Get Top Links
```
GET /admin/top-links?limit=10
```
Returns most clicked short URLs.

#### Cleanup Expired URLs
```
POST /admin/cleanup
```
Removes expired short URLs.

## Integration with Notification Service

### Enhanced Template Rendering

The notification service now automatically:
1. **Generates short URLs** for SMS templates
2. **Includes appointment IDs** in context
3. **Adds business URLs** as fallbacks
4. **Tracks URL generation** for analytics

### Example Usage

```python
from services.notification_service import notification_service

# Queue SMS notification with automatic URL generation
notification_service.queue_notification(
    db=db,
    user=user,
    template_name="appointment_confirmation",
    context={
        "client_name": "John Doe",
        "appointment_date": "December 15",
        "appointment_time": "2:00 PM",
        "service_name": "Haircut",
        "price": 45.00,
        "barber_name": "Mike"
    },
    appointment_id=123  # Automatically generates short URL
)
```

## Testing

### Test Script

Run the comprehensive test suite:

```bash
python test_sms_features.py
```

This tests:
- URL shortener functionality
- SMS keyword detection
- Template rendering with short URLs
- Response handler logic

### Manual Testing

1. **Send test SMS** to your Twilio number with keywords
2. **Check webhook logs** for processing details
3. **Verify short URLs** redirect correctly
4. **Test template rendering** with sample data

## Security Considerations

### SMS Security
- **Account validation**: Verifies Twilio account SID
- **Phone number formatting**: Standardizes number formats
- **Rate limiting**: Prevents abuse of SMS responses
- **Error handling**: Graceful failure with helpful messages

### URL Security
- **Short code uniqueness**: Prevents collision attacks
- **Expiration dates**: Automatic cleanup of old links
- **Click tracking**: Monitors for suspicious activity
- **Domain validation**: Uses branded domain only

## Monitoring and Analytics

### Key Metrics

1. **SMS Response Rate**: Percentage of SMS messages that receive replies
2. **Keyword Usage**: Most common customer responses
3. **Short URL Clicks**: Engagement with appointment links
4. **Response Time**: Speed of automated responses
5. **Error Rate**: Failed SMS processing attempts

### Logging

All SMS interactions are logged with:
- **Timestamp**: When the interaction occurred
- **Phone Number**: Customer identifier (anonymized in production)
- **Keyword**: Detected keyword or "None"
- **Action**: Resulting action taken
- **Success Status**: Whether processing succeeded

## Troubleshooting

### Common Issues

#### SMS Not Sending
1. Check Twilio credentials in environment variables
2. Verify phone number format (+1 prefix for US numbers)
3. Check Twilio account balance and limits

#### Keywords Not Recognized
1. Review keyword patterns in SMS response handler
2. Check for typos in customer messages
3. Verify case-insensitive matching

#### Short URLs Not Working
1. Confirm domain DNS configuration
2. Check database connection for URL storage
3. Verify redirect endpoint is accessible

#### Webhook Not Receiving Messages
1. Verify webhook URL in Twilio console
2. Check firewall/security group settings
3. Test webhook endpoint manually

### Debug Mode

Enable detailed logging:

```python
import logging
logging.getLogger('services.sms_response_handler').setLevel(logging.DEBUG)
logging.getLogger('utils.url_shortener').setLevel(logging.DEBUG)
```

## Future Enhancements

### Planned Features

1. **Rich SMS Templates**: Support for MMS with images
2. **Multi-language Support**: Localized SMS responses
3. **Advanced Analytics**: Detailed engagement metrics
4. **A/B Testing**: Template optimization
5. **Customer Preferences**: Opt-in/opt-out management
6. **Scheduled Messages**: Future appointment reminders
7. **Integration APIs**: Third-party calendar sync via SMS

### Performance Optimizations

1. **Caching Layer**: Redis for frequent URL lookups
2. **Batch Processing**: Bulk SMS operations
3. **Queue Management**: Async message processing
4. **Load Balancing**: Multiple webhook endpoints

## Conclusion

The BookedBarber SMS system provides a professional, efficient communication channel that enhances customer experience while maintaining brand consistency. The combination of clean templates, smart response handling, and branded short URLs creates a premium service that competitors cannot easily replicate.

Key benefits:
- **Reduced call volume** through automated responses
- **Improved customer satisfaction** with instant feedback
- **Enhanced brand perception** through professional messaging
- **Valuable analytics** for business optimization
- **Scalable architecture** supporting growth

The system is designed to be maintenance-free while providing comprehensive tracking and analytics for continuous improvement.