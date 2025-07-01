/**
 * Calendar Performance Testing Utilities
 * Tests and validates performance optimizations across all calendar components
 */

interface PerformanceTestResult {
  componentName: string
  renderTime: number
  appointmentCount: number
  cacheHitRate: number
  memoryUsage?: number
  testPassed: boolean
  recommendations: string[]
}

interface TestAppointment {
  id: number
  start_time: string
  end_time?: string
  service_name: string
  client_name: string
  barber_id: number
  status: string
  duration_minutes: number
}

/**
 * Generate test appointments for performance testing
 */
export function generateTestAppointments(count: number): TestAppointment[] {
  const appointments: TestAppointment[] = []
  const statuses = ['confirmed', 'pending', 'completed', 'cancelled']
  const services = ['Haircut', 'Beard Trim', 'Shave', 'Styling', 'Color', 'Wash']
  const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'David Brown']
  
  for (let i = 0; i < count; i++) {
    const date = new Date()
    date.setDate(date.getDate() + Math.floor(Math.random() * 30)) // Next 30 days
    date.setHours(8 + Math.floor(Math.random() * 10)) // 8am-6pm
    date.setMinutes(Math.random() > 0.5 ? 0 : 30) // :00 or :30
    
    appointments.push({
      id: i + 1,
      start_time: date.toISOString(),
      service_name: services[Math.floor(Math.random() * services.length)],
      client_name: names[Math.floor(Math.random() * names.length)],
      barber_id: Math.floor(Math.random() * 3) + 1,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      duration_minutes: 30 + Math.floor(Math.random() * 60) // 30-90 minutes
    })
  }
  
  return appointments
}

/**
 * Performance test configuration
 */
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT_RENDER_TIME: 50, // ms
  GOOD_RENDER_TIME: 100, // ms
  ACCEPTABLE_RENDER_TIME: 200, // ms
  MIN_CACHE_HIT_RATE: 70, // %
  MAX_MEMORY_USAGE: 50, // MB
  LARGE_DATASET_SIZE: 1000 // appointments
}

/**
 * Analyze performance test results
 */
export function analyzePerformanceResults(
  componentName: string,
  renderTime: number,
  appointmentCount: number,
  cacheHitRate: number,
  memoryUsage?: number
): PerformanceTestResult {
  const recommendations: string[] = []
  let testPassed = true
  
  // Render time analysis
  if (renderTime > PERFORMANCE_THRESHOLDS.ACCEPTABLE_RENDER_TIME) {
    testPassed = false
    recommendations.push(`Render time (${renderTime.toFixed(2)}ms) exceeds acceptable threshold`)
    recommendations.push('Consider implementing virtual scrolling for large datasets')
    recommendations.push('Review memoization strategies for expensive calculations')
  } else if (renderTime > PERFORMANCE_THRESHOLDS.GOOD_RENDER_TIME) {
    recommendations.push(`Render time (${renderTime.toFixed(2)}ms) could be improved`)
    recommendations.push('Consider optimizing re-renders with React.memo')
  }
  
  // Cache hit rate analysis
  if (cacheHitRate < PERFORMANCE_THRESHOLDS.MIN_CACHE_HIT_RATE) {
    testPassed = false
    recommendations.push(`Cache hit rate (${cacheHitRate.toFixed(1)}%) is below optimal threshold`)
    recommendations.push('Review cache key generation strategy')
    recommendations.push('Consider increasing cache size or improving cache expiration')
  }
  
  // Memory usage analysis
  if (memoryUsage && memoryUsage > PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE) {
    testPassed = false
    recommendations.push(`Memory usage (${memoryUsage.toFixed(1)}MB) is high`)
    recommendations.push('Consider implementing cache cleanup strategies')
    recommendations.push('Review for potential memory leaks')
  }
  
  // Large dataset performance
  if (appointmentCount > PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE) {
    if (renderTime > PERFORMANCE_THRESHOLDS.GOOD_RENDER_TIME) {
      recommendations.push('For large datasets, consider implementing virtualization')
      recommendations.push('Implement progressive loading for better UX')
    }
  }
  
  // Success case recommendations
  if (testPassed && recommendations.length === 0) {
    if (renderTime < PERFORMANCE_THRESHOLDS.EXCELLENT_RENDER_TIME) {
      recommendations.push('Excellent performance! Component is well optimized.')
    } else {
      recommendations.push('Good performance. Component meets all thresholds.')
    }
  }
  
  return {
    componentName,
    renderTime,
    appointmentCount,
    cacheHitRate,
    memoryUsage,
    testPassed,
    recommendations
  }
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(results: PerformanceTestResult[]): string {
  let report = '📊 Calendar Performance Test Report\n'
  report += '=' .repeat(50) + '\n\n'
  
  const passedTests = results.filter(r => r.testPassed).length
  const totalTests = results.length
  const overallPassed = passedTests === totalTests
  
  report += `Overall Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'} (${passedTests}/${totalTests})\n\n`
  
  // Summary statistics
  const avgRenderTime = results.reduce((sum, r) => sum + r.renderTime, 0) / results.length
  const avgCacheHitRate = results.reduce((sum, r) => sum + r.cacheHitRate, 0) / results.length
  const totalAppointments = results.reduce((sum, r) => sum + r.appointmentCount, 0)
  
  report += `📈 Summary Statistics:\n`
  report += `   Average Render Time: ${avgRenderTime.toFixed(2)}ms\n`
  report += `   Average Cache Hit Rate: ${avgCacheHitRate.toFixed(1)}%\n`
  report += `   Total Appointments Tested: ${totalAppointments}\n\n`
  
  // Component details
  report += `📋 Component Details:\n`
  results.forEach(result => {
    const status = result.testPassed ? '✅' : '❌'
    report += `\n${status} ${result.componentName}:\n`
    report += `   Render Time: ${result.renderTime.toFixed(2)}ms\n`
    report += `   Appointments: ${result.appointmentCount}\n`
    report += `   Cache Hit Rate: ${result.cacheHitRate.toFixed(1)}%\n`
    if (result.memoryUsage) {
      report += `   Memory Usage: ${result.memoryUsage.toFixed(1)}MB\n`
    }
    
    if (result.recommendations.length > 0) {
      report += `   Recommendations:\n`
      result.recommendations.forEach(rec => {
        report += `     • ${rec}\n`
      })
    }
  })
  
  // Performance thresholds reference
  report += `\n📋 Performance Thresholds:\n`
  report += `   Excellent Render Time: < ${PERFORMANCE_THRESHOLDS.EXCELLENT_RENDER_TIME}ms\n`
  report += `   Good Render Time: < ${PERFORMANCE_THRESHOLDS.GOOD_RENDER_TIME}ms\n`
  report += `   Acceptable Render Time: < ${PERFORMANCE_THRESHOLDS.ACCEPTABLE_RENDER_TIME}ms\n`
  report += `   Minimum Cache Hit Rate: ${PERFORMANCE_THRESHOLDS.MIN_CACHE_HIT_RATE}%\n`
  report += `   Maximum Memory Usage: ${PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE}MB\n\n`
  
  return report
}

/**
 * Browser performance testing helper
 */
export function runBrowserPerformanceTest(): Promise<{
  memory?: number
  timing: PerformanceTiming
  entries: PerformanceEntry[]
}> {
  return new Promise((resolve) => {
    // Wait for next frame to get accurate measurements
    requestAnimationFrame(() => {
      const result: any = {
        timing: performance.timing,
        entries: performance.getEntriesByType('measure')
      }
      
      // Add memory info if available
      if ('memory' in performance) {
        const memInfo = (performance as any).memory
        result.memory = memInfo.usedJSHeapSize / 1024 / 1024 // Convert to MB
      }
      
      resolve(result)
    })
  })
}

/**
 * Component-specific performance tests
 */
export const componentTests = {
  async testCalendarMonthView(appointmentCount: number = 100) {
    const appointments = generateTestAppointments(appointmentCount)
    
    console.time('CalendarMonthView-render')
    // Simulate render with test data
    const renderStart = performance.now()
    
    // Mock the component's main operations
    const filteredAppointments = appointments.filter(apt => apt.status !== 'cancelled')
    const appointmentsByDay = new Map()
    
    filteredAppointments.forEach(apt => {
      const date = new Date(apt.start_time)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      if (!appointmentsByDay.has(key)) {
        appointmentsByDay.set(key, [])
      }
      appointmentsByDay.get(key).push(apt)
    })
    
    const renderEnd = performance.now()
    console.timeEnd('CalendarMonthView-render')
    
    return {
      componentName: 'CalendarMonthView',
      renderTime: renderEnd - renderStart,
      appointmentCount: filteredAppointments.length,
      operationsPerformed: ['filtering', 'grouping', 'date parsing']
    }
  },
  
  async testCalendarWeekView(appointmentCount: number = 100) {
    const appointments = generateTestAppointments(appointmentCount)
    
    console.time('CalendarWeekView-render')
    const renderStart = performance.now()
    
    // Mock the component's preprocessing operations
    const processedAppointments = appointments.map(apt => {
      const start = new Date(apt.start_time)
      const startMinutes = start.getHours() * 60 + start.getMinutes()
      const height = (apt.duration_minutes / 30) * 48
      
      return {
        ...apt,
        parsedStartTime: start,
        style: {
          top: `${((startMinutes - 480) / 30) * 48}px`, // 8am start
          height: `${height}px`
        }
      }
    })
    
    const renderEnd = performance.now()
    console.timeEnd('CalendarWeekView-render')
    
    return {
      componentName: 'CalendarWeekView',
      renderTime: renderEnd - renderStart,
      appointmentCount: processedAppointments.length,
      operationsPerformed: ['preprocessing', 'style calculation', 'date parsing']
    }
  }
}

// Export performance testing utilities
export default {
  generateTestAppointments,
  analyzePerformanceResults,
  generatePerformanceReport,
  runBrowserPerformanceTest,
  componentTests,
  PERFORMANCE_THRESHOLDS
}