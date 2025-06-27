# POS Error Handling Implementation Guide

## Overview

This guide documents the comprehensive error handling system implemented for the Six Feet Barbershop POS system. The system is designed to handle various failure scenarios gracefully, ensuring business continuity even in challenging network conditions.

## Key Features

### 1. Network Error Recovery with Retry Logic

**Implementation**: `/src/lib/pos/network-monitor.ts`

- **Automatic Retry**: Failed network requests are automatically retried up to 3 times
- **Exponential Backoff**: Retry delays increase progressively (1s, 2s, 5s)
- **Smart Recovery**: System distinguishes between recoverable and non-recoverable errors

```typescript
// Example usage
await NetworkMonitor.withRetry(
  async () => await apiClient.post('/sales', saleData),
  {
    maxRetries: 3,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}`)
    }
  }
)
```

### 2. Offline Mode Detection and Handling

**Implementation**: `/src/lib/pos/offline-queue.ts`

- **Automatic Detection**: System monitors network status in real-time
- **Local Queue**: Sales are saved locally when offline
- **Auto-Sync**: Queued transactions sync automatically when connection restored
- **Persistent Storage**: Uses localStorage to survive app restarts

Key Methods:
- `OfflineQueueManager.queueTransaction()` - Save transaction offline
- `OfflineQueueManager.syncPendingTransactions()` - Manual sync trigger
- `OfflineQueueManager.getPendingCount()` - Check queue status

### 3. Transaction Rollback on Failures

**Implementation**: `/src/lib/pos/error-handler.ts`

- **Atomic Operations**: Ensures data consistency
- **Rollback Registry**: Tracks rollback handlers for each transaction
- **Automatic Cleanup**: Removes handlers after successful completion

```typescript
// Register rollback
TransactionRollback.register(transactionId, async () => {
  // Rollback logic here
})

// On success
TransactionRollback.clear(transactionId)

// On failure
await TransactionRollback.rollback(transactionId)
```

### 4. Duplicate Sale Prevention

**Implementation**: `/src/lib/pos/duplicate-detector.ts`

- **Smart Detection**: Identifies similar transactions within 5-minute window
- **Fingerprinting**: Creates unique hash for each transaction
- **User Confirmation**: Shows modal for potential duplicates
- **Configurable Window**: Can adjust duplicate detection timeframe

Detection Criteria:
- Same total amount
- Same items and quantities
- Same payment method
- Within 5-minute window

### 5. User-Friendly Error Messages

**Implementation**: `/src/components/pos/ErrorNotification.tsx`

- **Clear Communication**: Technical errors translated to user language
- **Visual Indicators**: Color-coded notifications
- **Actionable Options**: Retry buttons where appropriate
- **Auto-dismiss**: Non-critical errors auto-hide after 5 seconds

## Error Types and Handling

| Error Type | User Message | Retry | Action |
|------------|--------------|-------|---------|
| NETWORK_ERROR | "Network connection error. Please check your internet connection." | Yes | Auto-retry with backoff |
| OFFLINE | "You are currently offline. Sales will be saved and synced when connection is restored." | Yes | Queue locally |
| DUPLICATE_SALE | "This sale appears to be a duplicate. Please verify before proceeding." | No | Show confirmation modal |
| TRANSACTION_FAILED | "Transaction failed. Please try again or use a different payment method." | Yes | Rollback and retry |
| AUTHENTICATION_ERROR | "Authentication failed. Please log in again." | No | Redirect to login |
| VALIDATION_ERROR | "Please check the entered information and try again." | No | Show field errors |
| SERVER_ERROR | "Server error occurred. Our team has been notified." | Yes | Log and retry |
| TIMEOUT_ERROR | "Request timed out. Please try again." | Yes | Retry with longer timeout |

## UI Components

### Error Notification Component
- Location: `/src/components/pos/ErrorNotification.tsx`
- Features:
  - Floating notification with error details
  - Retry button for recoverable errors
  - Auto-hide for non-critical errors
  - Dismiss option

### Offline Indicator
- Shows persistent banner when offline
- Displays count of pending transactions
- Updates automatically on status change

### Duplicate Confirmation Modal
- Location: `/src/components/pos/DuplicateConfirmModal.tsx`
- Shows details of similar transaction
- Options to proceed or cancel
- Displays time since last similar transaction

## Integration Examples

### 1. Enhanced POS Page

```typescript
// Import error handling utilities
import { POSErrorHandler, POSError } from '@/lib/pos/error-handler'
import { OfflineQueueManager } from '@/lib/pos/offline-queue'
import { useNetworkStatus } from '@/lib/pos/network-monitor'
import { useDuplicateDetection } from '@/lib/pos/duplicate-detector'

// Use in component
const networkStatus = useNetworkStatus()
const { checkForDuplicate, recordTransaction } = useDuplicateDetection()

// Handle errors
try {
  // Attempt operation
} catch (error) {
  const posError = POSErrorHandler.parseError(error)
  setCurrentError(posError)
}
```

### 2. Enhanced Checkout Form

Features added:
- Real-time validation with error messages
- Network status indicator
- Disabled state during processing
- Automatic retry on timeout
- Phone number formatting

### 3. Enhanced Receipt Display

Features added:
- Offline transaction indicator
- Sync status notification
- Conditional features based on network status

## Testing

Test suite available at: `/src/app/(auth)/pos/test-error-handling.tsx`

Run tests to verify:
1. Network error recovery
2. Offline mode detection
3. Duplicate detection
4. Error parsing
5. Retry logic

## Best Practices

1. **Always Handle Errors**: Wrap API calls in try-catch blocks
2. **Use Retry Logic**: For network operations, use NetworkMonitor.withRetry()
3. **Check Network Status**: Display appropriate UI based on connectivity
4. **Queue When Offline**: Use OfflineQueueManager for critical operations
5. **Validate Early**: Perform client-side validation before API calls
6. **Provide Feedback**: Show clear error messages and recovery options

## Monitoring and Debugging

### Local Storage Keys
- `pos_offline_queue` - Offline transaction queue
- `pos_transaction_fingerprints` - Duplicate detection history
- `pos_session` - Active POS session

### Console Logging
- Network status changes logged
- Retry attempts logged with details
- Queue sync operations logged

### Error Tracking
Consider integrating with error tracking service (e.g., Sentry) for production:
```typescript
// In error handler
if (process.env.NODE_ENV === 'production') {
  Sentry.captureException(error, {
    tags: {
      component: 'pos',
      errorType: posError.type
    }
  })
}
```

## Future Enhancements

1. **Progressive Web App**: Enable offline app installation
2. **Background Sync**: Use Service Workers for better offline support
3. **Conflict Resolution**: Handle sync conflicts for offline transactions
4. **Analytics**: Track error patterns and recovery success rates
5. **Custom Retry Strategies**: Configure retry logic per operation type

## Support

For issues or questions about the error handling system:
1. Check browser console for detailed error logs
2. Review network tab for failed requests
3. Check localStorage for queued transactions
4. Use test page to verify error handling components
