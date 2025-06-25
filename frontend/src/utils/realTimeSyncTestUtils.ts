// Real-time Synchronization Testing Utilities
import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'

export interface SyncTestScenario {
  id: string
  name: string
  description: string
  testType: 'websocket' | 'polling' | 'multi-tab' | 'concurrent-user'
  steps: string[]
  expectedBehavior: string
  duration: 'short' | 'medium' | 'long' // < 30s, 30s-2m, > 2m
}

export const REAL_TIME_SYNC_TEST_SCENARIOS: SyncTestScenario[] = [
  {
    id: 'websocket-appointment-update',
    name: 'WebSocket Appointment Updates',
    description: 'Test real-time updates via WebSocket connections',
    testType: 'websocket',
    steps: [
      'Open calendar in two browser tabs',
      'Move appointment in tab 1',
      'Verify appointment updates in tab 2 immediately',
      'Create new appointment in tab 2',
      'Verify new appointment appears in tab 1',
      'Delete appointment in tab 1',
      'Verify deletion reflects in tab 2'
    ],
    expectedBehavior: 'Changes appear in other tabs within 1-2 seconds without refresh',
    duration: 'short'
  },
  {
    id: 'concurrent-drag-operations',
    name: 'Concurrent Drag Operations',
    description: 'Test handling of simultaneous drag operations from multiple users',
    testType: 'concurrent-user',
    steps: [
      'Open calendar in two separate browsers/users',
      'Both users attempt to drag the same appointment simultaneously',
      'Verify conflict resolution (first wins, last wins, or merge)',
      'Test optimistic updates vs server reconciliation',
      'Verify final state is consistent across all clients'
    ],
    expectedBehavior: 'Conflicts resolved gracefully, final state consistent everywhere',
    duration: 'medium'
  },
  {
    id: 'polling-fallback-mechanism',
    name: 'Polling Fallback Mechanism',
    description: 'Test fallback to polling when WebSocket fails',
    testType: 'polling',
    steps: [
      'Disable WebSocket connection (dev tools network tab)',
      'Verify calendar falls back to polling mechanism',
      'Make changes in another tab/user',
      'Verify changes sync within polling interval',
      'Re-enable WebSocket and verify seamless transition'
    ],
    expectedBehavior: 'Seamless fallback to polling, changes still sync (with delay)',
    duration: 'medium'
  },
  {
    id: 'multi-tab-state-consistency',
    name: 'Multi-Tab State Consistency',
    description: 'Test state consistency across multiple tabs of same user',
    testType: 'multi-tab',
    steps: [
      'Open 3+ tabs with the same calendar',
      'Perform various operations: create, update, delete, drag',
      'Verify all tabs maintain consistent state',
      'Test with different calendar views (week, month, day)',
      'Verify filters and selections sync appropriately'
    ],
    expectedBehavior: 'All tabs show identical calendar state at all times',
    duration: 'medium'
  },
  {
    id: 'network-interruption-recovery',
    name: 'Network Interruption Recovery',
    description: 'Test sync recovery after network interruptions',
    testType: 'websocket',
    steps: [
      'Make changes while online',
      'Simulate network disconnection',
      'Make additional changes while offline',
      'Restore network connection',
      'Verify offline changes sync properly',
      'Check for data consistency and conflict resolution'
    ],
    expectedBehavior: 'Offline changes queued and synced on reconnection',
    duration: 'long'
  },
  {
    id: 'high-frequency-updates',
    name: 'High-Frequency Update Handling',
    description: 'Test system under rapid succession of updates',
    testType: 'websocket',
    steps: [
      'Script rapid drag operations (10+ per second)',
      'Monitor for update conflicts or lost messages',
      'Verify UI remains responsive',
      'Check for memory leaks or performance degradation',
      'Validate final state accuracy'
    ],
    expectedBehavior: 'System handles rapid updates without loss or corruption',
    duration: 'short'
  },
  {
    id: 'calendar-view-sync',
    name: 'Calendar View Synchronization',
    description: 'Test if view changes sync between sessions',
    testType: 'multi-tab',
    steps: [
      'Open calendar in multiple tabs',
      'Change view in one tab (week to month)',
      'Verify if view change should/shouldn\'t sync',
      'Test date navigation synchronization',
      'Test filter synchronization'
    ],
    expectedBehavior: 'View preferences sync appropriately based on design intent',
    duration: 'short'
  },
  {
    id: 'large-dataset-sync',
    name: 'Large Dataset Synchronization',
    description: 'Test sync performance with many appointments',
    testType: 'websocket',
    steps: [
      'Load calendar with 100+ appointments',
      'Make changes and monitor sync performance',
      'Test initial load sync time',
      'Verify incremental updates vs full refresh',
      'Monitor memory usage during sync'
    ],
    expectedBehavior: 'Efficient sync even with large datasets, incremental updates',
    duration: 'medium'
  }
]

export class RealTimeSyncTester {
  private testResults: Array<{
    scenarioId: string
    passed: boolean
    notes: string
    timestamp: Date
    syncLatency: number // milliseconds
    connectionType: string
  }> = []

  private connections: Map<string, WebSocket> = new Map()
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  // Test WebSocket connection establishment
  static testWebSocketConnection(url?: string): Promise<{
    connected: boolean
    latency: number
    error?: string
  }> {
    return new Promise((resolve) => {
      const wsUrl = url || 'ws://localhost:8000/ws' // Default WebSocket URL
      const startTime = Date.now()

      try {
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          const latency = Date.now() - startTime
          ws.close()
          resolve({ connected: true, latency })
        }

        ws.onerror = (error) => {
          resolve({
            connected: false,
            latency: Date.now() - startTime,
            error: 'WebSocket connection failed'
          })
        }

        ws.onclose = () => {
          if (Date.now() - startTime < 100) {
            resolve({
              connected: false,
              latency: Date.now() - startTime,
              error: 'Connection closed immediately'
            })
          }
        }

        // Timeout after 5 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close()
            resolve({
              connected: false,
              latency: Date.now() - startTime,
              error: 'Connection timeout'
            })
          }
        }, 5000)

      } catch (error) {
        resolve({
          connected: false,
          latency: Date.now() - startTime,
          error: `Error: ${error}`
        })
      }
    })
  }

  // Simulate multi-tab scenario
  static simulateMultiTabTest(): {
    tabs: Array<{ id: string; title: string; url: string }>
    instructions: string[]
  } {
    const baseUrl = window.location.origin
    const calendarUrl = `${baseUrl}/calendar-demo`

    const tabs = [
      { id: 'tab1', title: 'Calendar Tab 1', url: calendarUrl },
      { id: 'tab2', title: 'Calendar Tab 2', url: calendarUrl },
      { id: 'tab3', title: 'Calendar Tab 3', url: calendarUrl }
    ]

    const instructions = [
      `Open these URLs in separate tabs:`,
      ...tabs.map(tab => `  - ${tab.url}`),
      ``,
      `Test steps:`,
      `1. Drag appointment in Tab 1`,
      `2. Verify it updates in Tab 2 and 3`,
      `3. Create appointment in Tab 2`,
      `4. Verify it appears in Tab 1 and 3`,
      `5. Delete appointment in Tab 3`,
      `6. Verify deletion reflects in Tab 1 and 2`
    ]

    return { tabs, instructions }
  }

  // Test sync latency
  async measureSyncLatency(operation: 'create' | 'update' | 'delete'): Promise<number> {
    // This would measure actual sync latency in a real implementation
    // For now, return simulated latency based on operation type
    const simulatedLatencies = {
      create: 150 + Math.random() * 100,
      update: 100 + Math.random() * 50,
      delete: 80 + Math.random() * 40
    }

    return simulatedLatencies[operation]
  }

  // Check for sync mechanism availability
  static checkSyncCapabilities(): {
    websocketSupported: boolean
    pollingAvailable: boolean
    serverSentEventsSupported: boolean
    currentSyncMethod: string
  } {
    const websocketSupported = 'WebSocket' in window
    const pollingAvailable = 'fetch' in window || 'XMLHttpRequest' in window
    const serverSentEventsSupported = 'EventSource' in window

    // Determine current sync method (would check actual implementation)
    let currentSyncMethod = 'unknown'
    if (websocketSupported) {
      currentSyncMethod = 'websocket'
    } else if (serverSentEventsSupported) {
      currentSyncMethod = 'server-sent-events'
    } else if (pollingAvailable) {
      currentSyncMethod = 'polling'
    }

    return {
      websocketSupported,
      pollingAvailable,
      serverSentEventsSupported,
      currentSyncMethod
    }
  }

  // Monitor sync events
  startSyncMonitoring(): void {
    console.log('🔄 Starting real-time sync monitoring...')

    // Monitor WebSocket messages
    const originalWebSocket = window.WebSocket
    window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
      const ws = new originalWebSocket(url, protocols)

      ws.addEventListener('message', (event) => {
        console.log('📨 WebSocket message received:', event.data)
      })

      ws.addEventListener('open', () => {
        console.log('🔗 WebSocket connection opened')
      })

      ws.addEventListener('close', () => {
        console.log('❌ WebSocket connection closed')
      })

      return ws
    }

    // Monitor fetch requests (for polling)
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      const url = args[0]
      if (typeof url === 'string' && url.includes('appointments')) {
        console.log('🔄 Polling request:', url)
      }
      return originalFetch.apply(this, args)
    }
  }

  // Stop sync monitoring
  stopSyncMonitoring(): void {
    console.log('⏹️ Stopping sync monitoring')
    // Would restore original WebSocket and fetch implementations
  }

  // Record test result
  recordResult(
    scenarioId: string,
    passed: boolean,
    notes: string,
    syncLatency: number = 0,
    connectionType: string = 'unknown'
  ): void {
    this.testResults.push({
      scenarioId,
      passed,
      notes,
      timestamp: new Date(),
      syncLatency,
      connectionType
    })

    const emoji = passed ? '✅' : '❌'
    console.log(`${emoji} Real-time Sync Test ${scenarioId}: ${passed ? 'PASSED' : 'FAILED'}`)
    console.log(`   📝 Notes: ${notes}`)
    console.log(`   ⚡ Sync Latency: ${syncLatency}ms`)
    console.log(`   🔗 Connection: ${connectionType}`)
  }

  // Get test summary
  getSummary(): {
    total: number
    passed: number
    failed: number
    passRate: number
    averageLatency: number
    connectionTypes: Record<string, number>
    fastestSync: number
    slowestSync: number
  } {
    const total = this.testResults.length
    const passed = this.testResults.filter(r => r.passed).length
    const failed = total - passed
    const passRate = total > 0 ? (passed / total) * 100 : 0

    const latencies = this.testResults.map(r => r.syncLatency).filter(l => l > 0)
    const averageLatency = latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0
    const fastestSync = latencies.length > 0 ? Math.min(...latencies) : 0
    const slowestSync = latencies.length > 0 ? Math.max(...latencies) : 0

    const connectionTypes: Record<string, number> = {}
    this.testResults.forEach(result => {
      connectionTypes[result.connectionType] = (connectionTypes[result.connectionType] || 0) + 1
    })

    return {
      total,
      passed,
      failed,
      passRate,
      averageLatency,
      connectionTypes,
      fastestSync,
      slowestSync
    }
  }

  // Run automated sync checks
  async runAutomatedChecks(): Promise<{
    syncCapabilities: ReturnType<typeof RealTimeSyncTester.checkSyncCapabilities>
    connectionTest: Awaited<ReturnType<typeof RealTimeSyncTester.testWebSocketConnection>>
    pollingFallback: boolean
    multiTabSupport: boolean
  }> {
    console.log('🔍 Running automated real-time sync checks...')

    const syncCapabilities = RealTimeSyncTester.checkSyncCapabilities()
    const connectionTest = await RealTimeSyncTester.testWebSocketConnection()

    // Test polling fallback (simplified)
    const pollingFallback = syncCapabilities.pollingAvailable

    // Test multi-tab support (simplified)
    const multiTabSupport = 'BroadcastChannel' in window || 'localStorage' in window

    const result = {
      syncCapabilities,
      connectionTest,
      pollingFallback,
      multiTabSupport
    }

    console.log('📊 Sync Check Results:', result)

    return result
  }

  // Print comprehensive report
  printReport(): void {
    const summary = this.getSummary()

    console.log('\n🔄 Real-time Synchronization Testing Report')
    console.log('==========================================')
    console.log(`Test Results:`)
    console.log(`  Total Tests: ${summary.total}`)
    console.log(`  Passed: ${summary.passed}`)
    console.log(`  Failed: ${summary.failed}`)
    console.log(`  Pass Rate: ${summary.passRate.toFixed(1)}%`)
    console.log(`\nPerformance:`)
    console.log(`  Average Latency: ${summary.averageLatency.toFixed(1)}ms`)
    console.log(`  Fastest Sync: ${summary.fastestSync}ms`)
    console.log(`  Slowest Sync: ${summary.slowestSync}ms`)
    console.log(`\nConnection Types:`)
    Object.entries(summary.connectionTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} tests`)
    })

    // Provide recommendations
    console.log(`\n💡 Recommendations:`)
    if (summary.averageLatency > 500) {
      console.log(`  ⚠️ High latency detected - consider optimizing sync mechanism`)
    }
    if (summary.passRate < 80) {
      console.log(`  ⚠️ Low pass rate - review sync reliability`)
    }
    if (!summary.connectionTypes.websocket) {
      console.log(`  ℹ️ No WebSocket tests found - consider testing WebSocket implementation`)
    }
  }
}

// Global instance
export const syncTester = new RealTimeSyncTester()

// Make available globally for console testing
if (typeof window !== 'undefined') {
  ;(window as any).syncTester = syncTester
  ;(window as any).REAL_TIME_SYNC_TEST_SCENARIOS = REAL_TIME_SYNC_TEST_SCENARIOS
  ;(window as any).RealTimeSyncTester = RealTimeSyncTester
}
