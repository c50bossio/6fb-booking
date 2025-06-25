# Payout Management API Documentation

## Overview

The Payout Management API provides comprehensive endpoints for managing automated and manual payouts to barbers. This includes scheduling regular payouts, viewing payout history, processing manual payouts, and accessing detailed analytics.

## Base URL

```
https://api.sixfigurebarber.com/api/v1/payout-schedules
```

## Authentication

All endpoints require authentication using a Bearer token:

```
Authorization: Bearer <access_token>
```

## Permissions

- **VIEW_ALL_ANALYTICS**: Required for viewing all barbers' payout data
- **MANAGE_PAYMENTS**: Required for creating, updating, and processing payouts
- Barbers can view and manage their own payout schedules without special permissions

## Endpoints

### 1. Payout Schedules

#### Create Payout Schedule

```http
POST /schedules
```

Create a new automated payout schedule for a barber.

**Request Body:**
```json
{
  "barber_id": 1,
  "frequency": "weekly",
  "day_of_week": 4,
  "minimum_payout_amount": 50.00,
  "auto_payout_enabled": true,
  "email_notifications": true,
  "sms_notifications": false,
  "advance_notice_days": 2,
  "preferred_payment_method": "stripe",
  "backup_payment_method": "bank_transfer"
}
```

**Frequency Options:**
- `daily`: Payouts every day
- `weekly`: Payouts on a specific day of week (0=Monday, 6=Sunday)
- `biweekly`: Payouts every two weeks
- `monthly`: Payouts on a specific day of month (1-31)
- `custom`: Custom interval in days

**Response (201 Created):**
```json
{
  "id": 1,
  "barber_id": 1,
  "barber_name": "John Doe",
  "frequency": "weekly",
  "day_of_week": 4,
  "minimum_payout_amount": 50.00,
  "auto_payout_enabled": true,
  "email_notifications": true,
  "sms_notifications": false,
  "advance_notice_days": 2,
  "preferred_payment_method": "stripe",
  "backup_payment_method": "bank_transfer",
  "is_active": true,
  "last_payout_date": null,
  "next_payout_date": "2025-06-27T00:00:00",
  "total_payouts_sent": 0,
  "total_amount_paid": 0.00,
  "created_at": "2025-06-25T10:00:00",
  "updated_at": "2025-06-25T10:00:00"
}
```

#### Get Payout Schedules

```http
GET /schedules
```

Get all payout schedules with optional filters.

**Query Parameters:**
- `barber_id` (optional): Filter by barber ID
- `is_active` (optional): Filter by active status
- `frequency` (optional): Filter by frequency type
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 100)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "barber_id": 1,
    "barber_name": "John Doe",
    "frequency": "weekly",
    "day_of_week": 4,
    "minimum_payout_amount": 50.00,
    "auto_payout_enabled": true,
    "is_active": true,
    "next_payout_date": "2025-06-27T00:00:00",
    "total_payouts_sent": 5,
    "total_amount_paid": 2500.00
  }
]
```

#### Get Specific Payout Schedule

```http
GET /schedules/{schedule_id}
```

Get details of a specific payout schedule.

**Response (200 OK):**
Returns a single payout schedule object.

#### Update Payout Schedule

```http
PUT /schedules/{schedule_id}
```

Update an existing payout schedule.

**Request Body:**
```json
{
  "frequency": "biweekly",
  "minimum_payout_amount": 100.00,
  "auto_payout_enabled": false
}
```

**Response (200 OK):**
Returns the updated payout schedule object.

#### Delete Payout Schedule

```http
DELETE /schedules/{schedule_id}
```

Soft delete (deactivate) a payout schedule.

**Response (204 No Content)**

### 2. Payout History

#### Get Payout History

```http
GET /history
```

Get historical payout records with filtering options.

**Query Parameters:**
- `barber_id` (optional): Filter by barber
- `start_date` (optional): Filter by start date (YYYY-MM-DD)
- `end_date` (optional): Filter by end date (YYYY-MM-DD)
- `status` (optional): Filter by status (pending, processing, completed, failed, cancelled)
- `payment_method` (optional): Filter by payment method
- `skip` (optional): Pagination offset
- `limit` (optional): Page size (max 100)

**Response (200 OK):**
```json
{
  "total_count": 150,
  "total_amount": 75000.00,
  "payouts": [
    {
      "id": 123,
      "date": "2025-06-20T14:00:00",
      "amount": 500.00,
      "net_amount": 485.50,
      "fee": 14.50,
      "status": "completed",
      "payment_method": "stripe",
      "period_start": "2025-06-13T00:00:00",
      "period_end": "2025-06-19T23:59:59",
      "earnings_count": 25,
      "failure_reason": null
    }
  ]
}
```

#### Get Payout Details

```http
GET /history/{payout_id}
```

Get detailed information about a specific payout.

**Response (200 OK):**
```json
{
  "id": 123,
  "barber_id": 1,
  "barber_name": "John Doe",
  "payout_type": "commission",
  "amount": 500.00,
  "currency": "USD",
  "period_start": "2025-06-13T00:00:00",
  "period_end": "2025-06-19T23:59:59",
  "status": "completed",
  "scheduled_date": "2025-06-20T14:00:00",
  "processed_date": "2025-06-20T14:05:00",
  "payment_method": "stripe",
  "platform_payout_id": "tr_1234567890",
  "platform_fee": 14.50,
  "net_amount": 485.50,
  "failure_reason": null,
  "retry_count": 0,
  "notification_sent": true,
  "created_at": "2025-06-20T14:00:00"
}
```

#### Get Payout Earnings

```http
GET /history/{payout_id}/earnings
```

Get detailed earnings breakdown for a specific payout.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "appointment_id": 456,
    "earning_type": "service_commission",
    "gross_amount": 100.00,
    "commission_rate": 0.7,
    "commission_amount": 70.00,
    "earned_date": "2025-06-15T10:30:00",
    "service_name": "Premium Haircut",
    "customer_name": "Jane Smith"
  }
]
```

### 3. Manual Payouts

#### Create Manual Payout

```http
POST /manual
```

Create a manual payout for a barber.

**Request Body:**
```json
{
  "barber_id": 1,
  "amount": 250.00,
  "payout_type": "commission",
  "payment_method": "stripe",
  "description": "Bonus payout for excellent performance",
  "process_immediately": true
}
```

**Payout Types:**
- `commission`: Regular commission payout
- `booth_rent_refund`: Booth rent refund
- `bonus`: Bonus payment
- `adjustment`: Adjustment payment

**Response (201 Created):**
Returns the created payout object.

#### Create Bulk Payouts

```http
POST /bulk
```

Create payouts for multiple barbers at once.

**Request Body:**
```json
{
  "barber_ids": [1, 2, 3, 4, 5],
  "payment_method": "stripe",
  "process_immediately": false,
  "notify_barbers": true
}
```

**Response (200 OK):**
```json
{
  "successful": [
    {
      "barber_id": 1,
      "payout_id": 124,
      "amount": 450.00
    }
  ],
  "failed": [
    {
      "barber_id": 3,
      "reason": "No pending earnings"
    }
  ],
  "total_amount": 2250.00
}
```

### 4. Payout Processing

#### Process Payout

```http
POST /{payout_id}/process
```

Process a pending payout through the payment platform.

**Response (200 OK):**
Returns the updated payout object with processing details.

#### Retry Failed Payout

```http
POST /{payout_id}/retry
```

Retry a failed payout.

**Response (200 OK):**
Returns the updated payout object.

#### Cancel Payout

```http
POST /{payout_id}/cancel
```

Cancel a pending payout.

**Request Body:**
```json
{
  "reason": "Incorrect amount calculated"
}
```

**Response (204 No Content)**

### 5. Analytics & Reporting

#### Get Payout Analytics

```http
GET /analytics
```

Get comprehensive payout analytics.

**Query Parameters:**
- `barber_id` (optional): Filter by barber
- `start_date` (optional): Start date for analytics
- `end_date` (optional): End date for analytics

**Response (200 OK):**
```json
{
  "total_paid_out": 125000.00,
  "total_pending": 5000.00,
  "average_payout_amount": 450.00,
  "total_fees_paid": 3625.00,
  "payouts_by_status": {
    "completed": 250,
    "pending": 10,
    "failed": 2,
    "cancelled": 3
  },
  "payouts_by_method": {
    "stripe": 95000.00,
    "square": 25000.00,
    "bank_transfer": 5000.00
  },
  "monthly_trend": [
    {
      "month": "2025-01",
      "count": 40,
      "total": 18000.00
    }
  ],
  "next_scheduled_payouts": [
    {
      "barber_id": 1,
      "barber_name": "John Doe",
      "scheduled_date": "2025-06-27T00:00:00",
      "amount": 450.00
    }
  ]
}
```

#### Get Summary Report

```http
GET /reports/summary
```

Generate a summary report for the specified period.

**Query Parameters:**
- `period`: Period type (daily, weekly, monthly, quarterly)
- `barber_id` (optional): Filter by barber

**Response (200 OK):**
```json
{
  "period": "monthly",
  "start_date": "2025-05-25T00:00:00",
  "end_date": "2025-06-25T00:00:00",
  "total_payouts": 120,
  "total_amount": 54000.00,
  "total_fees": 1566.00,
  "net_amount": 52434.00,
  "by_status": {
    "completed": {
      "count": 115,
      "amount": 51750.00
    },
    "pending": {
      "count": 5,
      "amount": 2250.00
    }
  },
  "by_method": {
    "stripe": {
      "count": 100,
      "amount": 45000.00
    },
    "square": {
      "count": 20,
      "amount": 9000.00
    }
  },
  "by_barber": [
    {
      "barber_id": 1,
      "barber_name": "John Doe",
      "total_amount": 4500.00,
      "payout_count": 4
    }
  ]
}
```

### 6. System Health

#### Payout System Health Check

```http
GET /health
```

Check the health of the payout system.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "checks": {
    "failed_payouts": {
      "status": "ok",
      "count": 0
    },
    "overdue_payouts": {
      "status": "warning",
      "count": 2
    }
  },
  "statistics": {
    "active_schedules": 45,
    "payouts_today": 12,
    "pending_amount": 5400.00
  }
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Permission denied"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

## Webhooks

The system can send webhooks for the following events:

1. **payout.scheduled** - When a payout is scheduled
2. **payout.processing** - When payout processing begins
3. **payout.completed** - When a payout is successfully completed
4. **payout.failed** - When a payout fails
5. **payout.cancelled** - When a payout is cancelled

Webhook payload example:
```json
{
  "event": "payout.completed",
  "data": {
    "payout_id": 123,
    "barber_id": 1,
    "amount": 450.00,
    "net_amount": 435.50,
    "status": "completed",
    "processed_at": "2025-06-25T14:30:00Z"
  },
  "timestamp": "2025-06-25T14:30:05Z"
}
```

## Rate Limiting

- Standard rate limit: 1000 requests per hour per API key
- Bulk operations limited to 100 items per request
- Analytics endpoints limited to 100 requests per hour

## Best Practices

1. **Schedule Management**
   - Set appropriate minimum payout amounts to avoid excessive fees
   - Use advance notifications to keep barbers informed
   - Configure backup payment methods for reliability

2. **Error Handling**
   - Implement retry logic for failed payouts
   - Monitor the health endpoint regularly
   - Handle webhook failures gracefully

3. **Security**
   - Always use HTTPS
   - Validate webhook signatures
   - Implement proper access controls

4. **Performance**
   - Use pagination for large result sets
   - Cache analytics data when appropriate
   - Batch operations when possible
