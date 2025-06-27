# Calendar Drag & Drop Test Suite

## Overview

This automated test suite validates the drag and drop functionality in the 6FB Booking Calendar using Puppeteer. It performs comprehensive testing of appointment dragging, dropping, cancellation, and UI feedback states.

## Prerequisites

1. **Next.js Development Server**: The app must be running on `http://localhost:3000`
2. **Authentication**: Admin user (`admin@6fb.com` / `admin123`) must exist in the system
3. **Puppeteer**: Already installed as dev dependency in package.json

## Running the Tests

### Quick Start
```bash
# From the frontend directory
npm run test:calendar-drag-drop
```

### Manual Execution
```bash
# From the frontend directory
node scripts/test-calendar-drag-drop.js
```

### Prerequisites Check
Before running the tests, ensure:
```bash
# 1. Start the development server
npm run dev

# 2. Verify the calendar page loads manually
# Visit: http://localhost:3000/dashboard/calendar
```

## What the Test Suite Validates

### 1. **Draggable Appointments Check**
- ✅ Verifies appointments have `draggable="true"` attribute
- ✅ Counts total vs draggable appointments
- ✅ Takes screenshot of initial state

### 2. **Successful Drag & Drop**
- ✅ Finds empty time slot for drop target
- ✅ Performs mouse drag from appointment to time slot
- ✅ Checks for confirmation modal appearance
- ✅ Confirms the move if modal appears
- ✅ Validates loading states resolve properly
- ❌ **Key Issue**: Detects if "Moving appointment loading" gets stuck

### 3. **Cancelled Drag Operation**
- ✅ Starts drag operation
- ✅ Cancels with ESC key
- ✅ Verifies no modal appears
- ✅ Ensures no loading state triggered

### 4. **Invalid Drop Zones**
- ✅ Tests dropping on header, sidebar, search areas
- ✅ Verifies drops are properly prevented
- ✅ Ensures no unintended side effects

### 5. **UI Feedback & Visual States**
- ✅ Tests appointment hover states
- ✅ Checks for drag handle indicators
- ✅ Validates "Moving Appointment" indicator appears
- ✅ Tests time slot hover feedback during drag

### 6. **Keyboard Cancellation**
- ✅ Multiple ESC key cancellation tests
- ✅ Verifies proper state cleanup
- ✅ Ensures no stuck modals or loading states

## Test Output

### Screenshots
All tests generate timestamped screenshots saved to:
```
frontend/scripts/calendar-drag-drop-test-screenshots/
```

Key screenshots include:
- `01-calendar-initial-state` - Starting point
- `03-before-drag-drop` - Pre-drag state
- `04-during-drag` - Mid-drag operation
- `06-after-drop` - Post-drop result
- `07-confirmation-modal` - Modal appearance
- `09-loading-stuck` - If loading gets stuck (issue detection)

### Reports
Two reports are generated:

1. **JSON Report**: `drag-drop-test-report.json`
   - Machine-readable detailed results
   - Complete test data and timestamps

2. **Markdown Report**: `drag-drop-test-report.md`
   - Human-readable summary
   - Issue analysis and recommendations
   - Next steps for fixes

## Common Issues & Solutions

### ❌ "Moving appointment loading" Stuck
**Symptoms**: Loading state never resolves after drag & drop
**Root Cause**: State management issue in `handleConfirmedMove`
**Solution**: Review state cleanup in `UnifiedCalendar.tsx`

```typescript
// Check these areas in UnifiedCalendar.tsx:
- setIsSaving(false) in finally block
- dragState reset after successful drop
- Error handling in onAppointmentMove
```

### ❌ Appointments Not Draggable
**Symptoms**: No appointments have `draggable="true"`
**Root Cause**: `enableDragDrop` prop not set or `__dragProps` not applied
**Solution**: Verify prop flow and enhancedAppointments mapping

### ❌ ESC Cancellation Not Working
**Symptoms**: ESC key doesn't cancel drag operations
**Root Cause**: Global event listener not properly set up
**Solution**: Check `useEffect` with `handleKeyDown` in UnifiedCalendar

## Test Results Interpretation

### Exit Codes
- `0`: All tests passed ✅
- `1`: Tests failed or errors occurred ❌

### Status Meanings
- **PASSED** ✅: Test completed successfully
- **FAILED** ❌: Test detected an issue
- **ERROR** 🚫: Test encountered an exception
- **SKIPPED** ⏭️: Test couldn't run (missing prerequisites)
- **PARTIAL** ⚠️: Test completed with some issues

## Development Workflow

### Before Code Changes
```bash
# Run baseline test
npm run test:calendar-drag-drop

# Review any issues in the report
# Fix identified problems
```

### After Code Changes
```bash
# Re-run tests to validate fixes
npm run test:calendar-drag-drop

# Compare results with previous run
# Ensure no regressions introduced
```

### Continuous Integration
Consider adding this test to your CI pipeline:
```yaml
# Example GitHub Actions step
- name: Test Calendar Drag & Drop
  run: |
    npm run dev &
    sleep 10  # Wait for server to start
    npm run test:calendar-drag-drop
```

## Troubleshooting

### Browser Launch Issues
```bash
# Try headful mode for debugging
# Modify test script: headless: false
```

### Server Not Running
```bash
# Error: net::ERR_CONNECTION_REFUSED
# Solution: Start dev server first
npm run dev
```

### Authentication Failures
```bash
# Ensure admin user exists
# Check credentials: admin@6fb.com / admin123
```

### Timeout Issues
```bash
# Increase timeout values in test script
# Check network connectivity
# Verify server performance
```

## Advanced Usage

### Custom Test Configuration
Modify the script for different scenarios:

```javascript
// Test with different user credentials
await page.type('input[type="email"]', 'custom@email.com');

// Test different viewport sizes
await page.setViewport({ width: 768, height: 1024 }); // Mobile

// Test with slow network
await page.emulateNetworkConditions({
  offline: false,
  downloadThroughput: 500 * 1024,
  uploadThroughput: 500 * 1024,
  latency: 100
});
```

### Adding New Tests
Extend the `CalendarDragDropTester` class:

```javascript
async testMobileTouch() {
  // Test touch-based drag operations
  // Mobile-specific interactions
}

async testMultipleDrags() {
  // Test concurrent drag operations
  // Edge case scenarios
}
```

## Performance Monitoring

The test suite includes performance monitoring:
- Page load times
- Drag operation duration
- Modal response times
- Loading state resolution times

Review the timestamps in test results to identify performance bottlenecks.

## Contributing

When adding new tests:
1. Follow the existing pattern in `CalendarDragDropTester`
2. Add comprehensive error handling
3. Include relevant screenshots
4. Update this documentation
5. Test both success and failure scenarios

## Support

For issues with the test suite:
1. Check the generated screenshots for visual debugging
2. Review the detailed JSON report for specific error data
3. Run tests with modified timeouts if needed
4. Ensure all prerequisites are met

The test suite is designed to be comprehensive yet maintainable, helping ensure the calendar's drag & drop functionality remains robust across all development iterations.
