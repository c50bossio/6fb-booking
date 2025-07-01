# API Client Update Summary

## Changes Made to `/lib/api.ts`

### 1. Added Webhook Management Types and API
- Added comprehensive TypeScript interfaces for webhook management:
  - `WebhookEndpoint` - Main webhook configuration
  - `WebhookLog` - Webhook delivery logs
  - `WebhookEvent` - Available webhook events
  - `WebhookStats` - Webhook statistics
- Implemented `webhooksAPI` object with full CRUD operations:
  - `list()` - List webhooks with filtering
  - `get()` - Get webhook details
  - `create()` - Create new webhook
  - `update()` - Update webhook configuration
  - `delete()` - Delete webhook
  - `getLogs()` - Get webhook delivery logs
  - `test()` - Test webhook endpoint
  - `retryDelivery()` - Retry failed delivery
  - `getEvents()` - Get available webhook events
  - `getStats()` - Get webhook statistics

### 2. Added Import/Export Types and APIs

#### Import Types:
- `ImportUploadResponse` - Response after file upload
- `ImportStatusResponse` - Import job status
- `ImportPreviewRequest/Response` - Preview import data
- `ImportExecutionRequest/Response` - Execute import
- `ImportRollbackRequest/Response` - Rollback import
- `ImportHistoryItem/Response` - Import history
- `ImportSourceType` - Supported import sources (booksy, square, etc.)
- `ImportType` - Types of data to import

#### Import API (`importsAPI`):
- `upload()` - Upload file with progress tracking support
- `getStatus()` - Check import job status
- `preview()` - Preview data before import
- `execute()` - Execute the import
- `rollback()` - Rollback completed import
- `getHistory()` - Get import history

#### Export Types:
- `ExportFilters` - Base export filters
- `ClientExportFilters` - Client-specific filters
- `AppointmentExportFilters` - Appointment filters
- `CustomExportConfig` - Custom export configuration
- `ExportResponse` - Export result with base64 content
- `ExportProgress` - Progress for async exports
- `ExportFormat` - Supported export formats

#### Export API (`exportsAPI`):
- `exportClients()` - Export client data with filters
- `exportAppointments()` - Export appointments
- `exportAnalytics()` - Export analytics with charts
- `customExport()` - Custom data export
- `downloadExport()` - Download completed export
- `getProgress()` - Check export progress
- `getFormats()` - Get supported formats
- `clearCache()` - Clear export cache (admin)
- `downloadAsFile()` - Helper to download base64 as file

### 3. Infrastructure Improvements
- Updated `fetchAPI` wrapper to handle FormData properly (for file uploads)
- Added XMLHttpRequest-based upload with progress tracking
- Maintained proper TypeScript typing throughout
- Followed existing patterns and conventions

## Usage Examples

### Webhook Management
```typescript
// Create a webhook
const webhook = await webhooksAPI.create({
  url: 'https://example.com/webhook',
  name: 'Order Updates',
  events: ['booking.created', 'booking.updated'],
  auth_type: 'bearer',
  auth_config: { token: 'secret-token' }
})

// Test webhook
const testResult = await webhooksAPI.test(webhook.id, 'booking.created')

// Get webhook logs
const logs = await webhooksAPI.getLogs(webhook.id, {
  status: 'failed',
  limit: 10
})
```

### Import Data
```typescript
// Upload file with progress
const importJob = await importsAPI.upload(
  file,
  'csv',
  'clients',
  (progress) => console.log(`Upload progress: ${progress}%`)
)

// Preview data
const preview = await importsAPI.preview(importJob.import_id, {
  max_preview_records: 20,
  validation_level: 'strict'
})

// Execute import
const result = await importsAPI.execute(importJob.import_id, {
  field_mapping: preview.field_mapping,
  duplicate_handling: 'skip',
  rollback_on_error: true
})
```

### Export Data
```typescript
// Export clients to Excel
const clientExport = await exportsAPI.exportClients({
  format: 'excel',
  include_pii: false,
  filters: {
    date_from: '2024-01-01',
    min_visits: 5
  }
})

// Download the file
exportsAPI.downloadAsFile(clientExport)

// Export analytics with charts
const analyticsExport = await exportsAPI.exportAnalytics({
  format: 'pdf',
  include_charts: true,
  date_from: '2024-01-01',
  date_to: '2024-12-31'
})
```

## Notes
- All endpoints require authentication via JWT token
- Import/Export operations may require admin permissions
- File uploads support progress tracking via XMLHttpRequest
- Exports return base64-encoded content for immediate download
- Webhook management is admin-only functionality