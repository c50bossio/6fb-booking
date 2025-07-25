/**
 * Calendar Performance Tests
 * Tests for measuring and validating calendar performance improvements
 */

import { performance } from 'perf_hooks'

// Mock appointment data generator for realistic testing
export function generateMockAppointments(count: number = 1000) {
  const appointments = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30) // Start 30 days ago
  
  const services = ['Haircut', 'Beard Trim', 'Shampoo', 'Styling', 'Color']
  const statuses = ['confirmed', 'pending', 'completed', 'cancelled']
  const barbers = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Barber ${i + 1}`,
    first_name: `First${i + 1}`,
    last_name: `Last${i + 1}`
  }))
  
  for (let i = 0; i < count; i++) {
    const appointmentDate = new Date(startDate)
    appointmentDate.setDate(startDate.getDate() + Math.floor(i / 10)) // ~10 appointments per day
    appointmentDate.setHours(8 + Math.floor(Math.random() * 10)) // Business hours 8-18
    appointmentDate.setMinutes(Math.random() > 0.5 ? 0 : 30) // Half or full hour
    
    const barber = barbers[Math.floor(Math.random() * barbers.length)]
    
    appointments.push({
      id: i + 1,
      start_time: appointmentDate.toISOString(),
      end_time: new Date(appointmentDate.getTime() + 30 * 60000).toISOString(), // 30 min duration
      service_name: services[Math.floor(Math.random() * services.length)],
      client_name: `Client ${i + 1}`,
      barber_name: barber.name,
      barber_id: barber.id,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      price: 25 + Math.floor(Math.random() * 75), // $25-$100
      duration_minutes: 30,
      created_at: new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      updated_at: appointmentDate.toISOString()
    })
  }
  
  return appointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
}

// Performance benchmark utilities
export class PerformanceBenchmark {
  private tests: Map<string, number[]> = new Map()
  private memoryBaseline: number = 0
  
  constructor() {
    this.memoryBaseline = this.getCurrentMemoryUsage()
  }
  
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as any).memory
      return memInfo ? memInfo.usedJSHeapSize / 1024 / 1024 : 0
    }
    return 0
  }
  
  startTest(testName: string): () => number {
    const startTime = performance.now()
    const startMemory = this.getCurrentMemoryUsage()
    
    return () => {
      const endTime = performance.now()
      const endMemory = this.getCurrentMemoryUsage()
      const duration = endTime - startTime
      const memoryDelta = endMemory - startMemory
      
      if (!this.tests.has(testName)) {
        this.tests.set(testName, [])
      }
      this.tests.get(testName)!.push(duration)
      
      console.log(`${testName}: ${duration.toFixed(2)}ms, Memory: ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(2)}MB`)
      return duration
    }
  }
  
  getResults(testName: string) {
    const times = this.tests.get(testName) || []
    if (times.length === 0) return null
    
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length
    const min = Math.min(...times)
    const max = Math.min(...times)
    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
    
    return { avg, min, max, median, count: times.length }
  }
  
  getAllResults() {
    const results: Record<string, any> = {}
    for (const [testName] of this.tests) {
      results[testName] = this.getResults(testName)
    }
    return results
  }
  
  reset() {
    this.tests.clear()
    this.memoryBaseline = this.getCurrentMemoryUsage()
  }
}

// Calendar-specific performance tests
export class CalendarPerformanceTests {
  private benchmark = new PerformanceBenchmark()
  private mockData = generateMockAppointments(1000)
  
  // Test appointment filtering performance
  async testAppointmentFiltering(useOptimized: boolean = false) {
    console.log(`\n=== Appointment Filtering Test (${useOptimized ? 'Optimized' : 'Original'}) ===`)
    
    const { useCalendarPerformance } = await import('../../hooks/useCalendarPerformance')
    const { useOptimizedCalendarPerformance } = await import('../../hooks/useOptimizedCalendarPerformance')
    
    const hook = useOptimized ? useOptimizedCalendarPerformance() : useCalendarPerformance()
    
    // Test different filter scenarios
    const filterTests = [
      { name: 'Filter by barber', filters: { barberId: 1 } },
      { name: 'Filter by date range', filters: { 
        startDate: new Date(), 
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
      }},
      { name: 'Filter by status', filters: { status: 'confirmed' } },
      { name: 'Complex filter', filters: { 
        barberId: 2, 
        status: 'confirmed',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }}
    ]
    
    for (const test of filterTests) {
      const endTest = this.benchmark.startTest(`${test.name} (${useOptimized ? 'optimized' : 'original'})`)
      
      // Run filtering multiple times to get average
      for (let i = 0; i < 10; i++) {
        hook.optimizedAppointmentFilter(this.mockData, test.filters)
      }
      
      endTest()
    }
  }
  
  // Test date calculation performance
  async testDateCalculations(useOptimized: boolean = false) {
    console.log(`\n=== Date Calculations Test (${useOptimized ? 'Optimized' : 'Original'}) ===`)
    
    const { useCalendarPerformance } = await import('../../hooks/useCalendarPerformance')
    const { useOptimizedCalendarPerformance } = await import('../../hooks/useOptimizedCalendarPerformance')
    
    const hook = useOptimized ? useOptimizedCalendarPerformance() : useCalendarPerformance()
    
    const testDates = [
      new Date(),
      new Date(2024, 0, 1), // January 1, 2024
      new Date(2024, 5, 15), // June 15, 2024
      new Date(2024, 11, 31), // December 31, 2024
    ]
    
    const endTest = this.benchmark.startTest(`Date calculations (${useOptimized ? 'optimized' : 'original'})`)
    
    // Run calculations multiple times
    for (let i = 0; i < 100; i++) {
      testDates.forEach(date => {
        hook.memoizedDateCalculations(date)
      })
    }
    
    endTest()
  }
  
  // Test appointments by day grouping
  async testAppointmentsByDay(useOptimized: boolean = false) {
    console.log(`\n=== Appointments by Day Test (${useOptimized ? 'Optimized' : 'Original'}) ===`)
    
    const { useCalendarPerformance } = await import('../../hooks/useCalendarPerformance')
    const { useOptimizedCalendarPerformance } = await import('../../hooks/useOptimizedCalendarPerformance')
    
    const hook = useOptimized ? useOptimizedCalendarPerformance() : useCalendarPerformance()
    
    const dateRange = {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
    
    const endTest = this.benchmark.startTest(`Appointments by day (${useOptimized ? 'optimized' : 'original'})`)
    
    // Run grouping multiple times
    for (let i = 0; i < 20; i++) {
      hook.optimizedAppointmentsByDay(this.mockData, dateRange)
    }
    
    endTest()
  }
  
  // Test memory usage under load
  async testMemoryUsage() {
    console.log('\n=== Memory Usage Test ===')
    
    const { useOptimizedCalendarPerformance } = await import('../../hooks/useOptimizedCalendarPerformance')
    const hook = useOptimizedCalendarPerformance()
    
    const initialMemory = this.getCurrentMemoryUsage()
    console.log(`Initial memory: ${initialMemory.toFixed(2)}MB`)
    
    // Simulate heavy usage
    const endTest = this.benchmark.startTest('Heavy usage memory test')
    
    for (let i = 0; i < 100; i++) {
      // Create different filter combinations
      const filters = {
        barberId: (i % 8) + 1,
        status: ['confirmed', 'pending', 'completed'][i % 3],
        startDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + (i + 7) * 24 * 60 * 60 * 1000)
      }
      
      hook.optimizedAppointmentFilter(this.mockData, filters)
      
      // Calculate date data
      hook.memoizedDateCalculations(new Date(Date.now() + i * 24 * 60 * 60 * 1000))
      
      // Group appointments
      hook.optimizedAppointmentsByDay(this.mockData, {
        start: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + (i + 7) * 24 * 60 * 60 * 1000)
      })
    }
    
    endTest()
    
    const finalMemory = this.getCurrentMemoryUsage()
    const memoryGrowth = finalMemory - initialMemory
    console.log(`Final memory: ${finalMemory.toFixed(2)}MB`)
    console.log(`Memory growth: ${memoryGrowth > 0 ? '+' : ''}${memoryGrowth.toFixed(2)}MB`)
    
    // Test cache clearing
    hook.clearCache()
    
    // Allow garbage collection
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }
    
    setTimeout(() => {
      const afterGCMemory = this.getCurrentMemoryUsage()
      console.log(`After cache clear: ${afterGCMemory.toFixed(2)}MB`)
    }, 1000)
  }
  
  // Test event handler performance
  async testEventHandlers() {
    console.log('\n=== Event Handler Performance Test ===')
    
    const { useOptimizedCalendarEventHandlers } = await import('../../components/calendar/optimized/CalendarEventHandlers')
    
    // Mock event handlers
    const mockHandlers = {
      onAppointmentUpdate: jest.fn(),
      onBarberSelect: jest.fn(),
      onLocationChange: jest.fn(),
      onDateChange: jest.fn(),
      onViewModeChange: jest.fn()
    }
    
    const handlers = useOptimizedCalendarEventHandlers(mockHandlers)
    
    // Test rapid interactions
    const endTest = this.benchmark.startTest('Rapid event handling')
    
    // Simulate rapid barber selections (should be debounced)
    for (let i = 0; i < 50; i++) {
      handlers.handleBarberSelect((i % 8) + 1)
    }
    
    // Simulate rapid date changes (should be throttled)
    for (let i = 0; i < 30; i++) {
      handlers.handleDateChange(new Date(Date.now() + i * 24 * 60 * 60 * 1000))
    }
    
    endTest()
    
    // Wait for debounced/throttled calls to complete
    setTimeout(() => {
      console.log(`Barber select calls: ${mockHandlers.onBarberSelect.mock.calls.length} (should be much less than 50)`)
      console.log(`Date change calls: ${mockHandlers.onDateChange.mock.calls.length} (should be much less than 30)`)
    }, 1000)
  }
  
  // Component render performance test
  async testComponentRenderPerformance() {
    console.log('\n=== Component Render Performance Test ===')
    
    const { MemoizedAppointmentCard, MemoizedTimeSlot } = await import('../../components/calendar/optimized/CalendarMemoizedComponents')
    
    // Test appointment card rendering
    const endTest = this.benchmark.startTest('Appointment card rendering')
    
    const mockAppointment = this.mockData[0]
    const mockProps = {
      appointment: mockAppointment,
      onClick: jest.fn(),
      onUpdate: jest.fn()
    }
    
    // Simulate multiple renders with same props (should be memoized)
    for (let i = 0; i < 1000; i++) {
      // This would typically be handled by React's reconciliation
      // In a real test, we'd use React Testing Library
      const component = MemoizedAppointmentCard(mockProps)
    }
    
    endTest()
  }
  
  // Run all performance tests
  async runAllTests() {
    console.log('🚀 Starting Calendar Performance Test Suite\n')
    
    // Test original vs optimized implementations
    await this.testAppointmentFiltering(false) // Original
    await this.testAppointmentFiltering(true)  // Optimized
    
    await this.testDateCalculations(false)
    await this.testDateCalculations(true)
    
    await this.testAppointmentsByDay(false)
    await this.testAppointmentsByDay(true)
    
    await this.testMemoryUsage()
    await this.testEventHandlers()
    await this.testComponentRenderPerformance()
    
    // Print summary
    console.log('\n=== Performance Test Results Summary ===')
    const results = this.benchmark.getAllResults()
    
    for (const [testName, result] of Object.entries(results)) {
      if (result) {
        console.log(`${testName}:`)
        console.log(`  Average: ${result.avg.toFixed(2)}ms`)
        console.log(`  Min: ${result.min.toFixed(2)}ms`)
        console.log(`  Max: ${result.max.toFixed(2)}ms`)
        console.log(`  Runs: ${result.count}`)
        console.log('')
      }
    }
    
    // Performance score calculation
    const optimizedTests = Object.entries(results).filter(([name]) => name.includes('optimized'))
    const originalTests = Object.entries(results).filter(([name]) => name.includes('original'))
    
    if (optimizedTests.length > 0 && originalTests.length > 0) {
      const optimizedAvg = optimizedTests.reduce((sum, [, result]) => sum + (result?.avg || 0), 0) / optimizedTests.length
      const originalAvg = originalTests.reduce((sum, [, result]) => sum + (result?.avg || 0), 0) / originalTests.length
      
      const improvement = ((originalAvg - optimizedAvg) / originalAvg) * 100
      console.log(`\n🎯 Overall Performance Improvement: ${improvement.toFixed(1)}%`)
      
      if (improvement > 30) {
        console.log('✅ Excellent performance improvement!')
      } else if (improvement > 15) {
        console.log('✅ Good performance improvement!')
      } else if (improvement > 0) {
        console.log('⚠️  Modest performance improvement')
      } else {
        console.log('❌ Performance regression detected')
      }
    }
  }
  
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as any).memory
      return memInfo ? memInfo.usedJSHeapSize / 1024 / 1024 : 0
    }
    return 0
  }
}

// Load testing utilities
export class CalendarLoadTester {
  private appointments: any[]
  
  constructor(appointmentCount: number = 5000) {
    this.appointments = generateMockAppointments(appointmentCount)
    console.log(`Load tester initialized with ${appointmentCount} appointments`)
  }
  
  async simulateHeavyUsage() {
    console.log('\n=== Load Testing: Heavy Usage Simulation ===')
    
    const { useOptimizedCalendarPerformance } = await import('../../hooks/useOptimizedCalendarPerformance')
    const hook = useOptimizedCalendarPerformance()
    
    const benchmark = new PerformanceBenchmark()
    const endTest = benchmark.startTest('Heavy usage simulation')
    
    // Simulate 1000 rapid operations
    for (let i = 0; i < 1000; i++) {
      // Random filter combinations
      const randomBarber = Math.floor(Math.random() * 8) + 1
      const randomDate = new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000)
      
      hook.optimizedAppointmentFilter(this.appointments, {
        barberId: i % 10 === 0 ? 'all' : randomBarber,
        startDate: randomDate,
        endDate: new Date(randomDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      })
      
      // Date calculations
      hook.memoizedDateCalculations(randomDate)
      
      // Grouping operations
      if (i % 10 === 0) {
        hook.optimizedAppointmentsByDay(this.appointments, {
          start: randomDate,
          end: new Date(randomDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        })
      }
    }
    
    const duration = endTest()
    console.log(`Heavy usage test completed in ${duration.toFixed(2)}ms`)
    console.log(`Average per operation: ${(duration / 1000).toFixed(2)}ms`)
  }
  
  async stressTestMemory() {
    console.log('\n=== Load Testing: Memory Stress Test ===')
    
    const { useOptimizedCalendarPerformance } = await import('../../hooks/useOptimizedCalendarPerformance')
    const hook = useOptimizedCalendarPerformance()
    
    const initialMemory = this.getCurrentMemoryUsage()
    console.log(`Initial memory: ${initialMemory.toFixed(2)}MB`)
    
    // Gradually increase load
    for (let load = 100; load <= 1000; load += 100) {
      console.log(`Testing with ${load} operations...`)
      
      const startMemory = this.getCurrentMemoryUsage()
      
      for (let i = 0; i < load; i++) {
        hook.optimizedAppointmentFilter(this.appointments, {
          barberId: (i % 8) + 1,
          startDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + (i + 7) * 24 * 60 * 60 * 1000)
        })
      }
      
      const endMemory = this.getCurrentMemoryUsage()
      const memoryDelta = endMemory - startMemory
      
      console.log(`  Memory usage: ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(2)}MB`)
      
      if (memoryDelta > 50) {
        console.log('  ⚠️  High memory usage detected!')
        break
      }
    }
    
    // Test cleanup
    hook.clearCache()
    
    setTimeout(() => {
      const finalMemory = this.getCurrentMemoryUsage()
      console.log(`After cleanup: ${finalMemory.toFixed(2)}MB`)
    }, 1000)
  }
  
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as any).memory
      return memInfo ? memInfo.usedJSHeapSize / 1024 / 1024 : 0
    }
    return 0
  }
}

// Test runner
export async function runCalendarPerformanceTests() {
  const performanceTests = new CalendarPerformanceTests()
  const loadTester = new CalendarLoadTester(2000)
  
  try {
    await performanceTests.runAllTests()
    await loadTester.simulateHeavyUsage()
    await loadTester.stressTestMemory()
    
    console.log('\n✅ All performance tests completed successfully!')
  } catch (error) {
    console.error('❌ Performance tests failed:', error)
    throw error
  }
}

// Browser-specific test runner
if (typeof window !== 'undefined') {
  // Add global test runner for browser console
  (window as any).runCalendarPerformanceTests = runCalendarPerformanceTests
  console.log('Calendar performance tests available. Run with: runCalendarPerformanceTests()')
}