
# Trafft Integration API Documentation
Generated: 2025-06-23T16:55:37.105406
Base URL: https://sixfb-backend.onrender.com

## Overview
The 6FB platform appears to be integrated with Trafft for appointment management.

## Available Endpoints

### Status & Health
- GET /api/trafft/status - Check integration status
- GET /api/trafft/health - Health check for Trafft connection

### Data Endpoints
- GET /api/trafft/services - List available services
- GET /api/trafft/employees - List employees (barbers)
- GET /api/trafft/customers - List customers
- GET /api/trafft/appointments/recent - Recent appointments

### Sync & Reports
- GET /api/trafft/sync/history - Sync operation history
- POST /api/trafft/sync/initial - Initial sync
- POST /api/trafft/sync/manual - Manual sync
- GET /api/trafft/reports/revenue - Revenue reports

### Connection Management
- POST /api/trafft/connect - Connect to Trafft
- POST /api/trafft/disconnect - Disconnect from Trafft

### Webhooks
- POST /api/trafft/webhooks/register - Register webhooks
- GET /api/trafft/webhooks/status - Webhook status

## Test Results
- Total endpoints tested: 8
- Successful: 3
- Failed: 5

## Notes
- All endpoints require authentication
- The system uses Trafft as the appointment booking backend
- Direct appointment creation may need to go through Trafft API
