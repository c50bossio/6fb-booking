// Drag & Drop Testing Utilities
import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'

export interface TestScenario {
  id: string
  name: string
  description: string
  steps: string[]
  expectedResult: string
  category: 'conflict' | 'precision' | 'mobile' | 'undo' | 'performance'
}

export const DRAG_DROP_TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'conflict-resolution-basic',
    name: 'Basic Conflict Resolution',
    description: 'Test conflict detection and resolution modal',
    steps: [
      'Drag "John Conflict" (10:00) appointment',
      'Drop it on "Mike Overlap" (10:30) time slot (same barber)',
      'Verify conflict modal appears',
      'Choose "Accept Suggestion" option',
      'Verify appointment moves to suggested time'
    ],
    expectedResult: 'Conflict modal shows with smart suggestions, appointment moves successfully',
    category: 'conflict'
  },
  {
    id: 'back-to-back-precision',
    name: 'Back-to-Back Appointment Precision',
    description: 'Test precise timing with sequential appointments',
    steps: [
      'Locate "Alex Sequential" (14:00) and "Sam Following" (14:20)',
      'Drag "Alex Sequential" to 15:00',
      'Verify both appointments maintain proper spacing',
      'Test snap-to-grid functionality'
    ],
    expectedResult: 'Appointments maintain precise timing, no overlap',
    category: 'precision'
  },
  {
    id: 'long-appointment-handling',
    name: 'Long Appointment Duration Handling',
    description: 'Test dragging appointments with long durations',
    steps: [
      'Find "David Lengthy" (75-minute Premium Cut & Style)',
      'Drag to different time slots',
      'Verify end time calculation is correct',
      'Check for conflicts with existing appointments'
    ],
    expectedResult: 'Duration calculations remain accurate, conflicts detected properly',
    category: 'precision'
  },
  {
    id: 'multi-barber-independence',
    name: 'Multi-Barber Independence',
    description: 'Test that same time slots work for different barbers',
    steps: [
      'Verify "Chris Parallel" (11:00 Lisa) and "Ryan Concurrent" (11:00 Tony)',
      'Try moving appointments between barbers',
      'Confirm no false conflicts between different barbers'
    ],
    expectedResult: 'Different barbers can have same time slots without conflicts',
    category: 'conflict'
  },
  {
    id: 'undo-redo-functionality',
    name: 'Undo/Redo Operations',
    description: 'Test keyboard shortcuts for undoing and redoing moves',
    steps: [
      'Move any appointment to a new time slot',
      'Press Ctrl+Z (or Cmd+Z on Mac)',
      'Verify appointment returns to original position',
      'Press Ctrl+Y (or Cmd+Y on Mac)',
      'Verify appointment moves back to new position'
    ],
    expectedResult: 'Undo/redo works correctly with keyboard shortcuts',
    category: 'undo'
  },
  {
    id: 'mobile-touch-interaction',
    name: 'Mobile Touch Interactions',
    description: 'Test touch-based drag and drop on mobile devices',
    steps: [
      'Switch to mobile viewport or use touch device',
      'Long press on appointment block',
      'Drag appointment to new time slot',
      'Verify touch feedback and snap guides work',
      'Test conflict resolution on mobile'
    ],
    expectedResult: 'Touch interactions work smoothly with proper feedback',
    category: 'mobile'
  },
  {
    id: 'cross-day-scheduling',
    name: 'Cross-Day Appointment Scheduling',
    description: 'Test moving appointments between different days',
    steps: [
      'Drag an appointment from today to tomorrow',
      'Verify date calculations are correct',
      'Test conflicts across different days',
      'Check calendar view updates properly'
    ],
    expectedResult: 'Cross-day moves work correctly with proper date handling',
    category: 'precision'
  },
  {
    id: 'edge-time-slots',
    name: 'Edge Time Slot Handling',
    description: 'Test early morning and late evening time slots',
    steps: [
      'Move appointments to 9:00 AM (opening)',
      'Move appointments to 6:00 PM (closing)',
      'Test boundary conditions',
      'Verify working hours constraints'
    ],
    expectedResult: 'Edge time slots work correctly within business hours',
    category: 'precision'
  },
  {
    id: 'status-based-dragging',
    name: 'Status-Based Drag Behavior',
    description: 'Test dragging appointments with different statuses',
    steps: [
      'Try dragging completed appointments',
      'Try dragging cancelled appointments',
      'Try dragging pending vs confirmed appointments',
      'Verify appropriate restrictions or warnings'
    ],
    expectedResult: 'Status affects drag behavior appropriately',
    category: 'conflict'
  },
  {
    id: 'performance-stress-test',
    name: 'Performance with Multiple Appointments',
    description: 'Test drag performance with many appointments loaded',
    steps: [
      'Load calendar with 50+ appointments',
      'Perform rapid drag operations',
      'Monitor for lag or performance issues',
      'Test conflict detection speed'
    ],
    expectedResult: 'Smooth performance even with many appointments',
    category: 'performance'
  }
]

export interface TestResult {
  scenarioId: string
  passed: boolean
  notes: string
  timestamp: Date
  duration?: number
}

export class DragDropTestRunner {
  private results: TestResult[] = []

  startTest(scenarioId: string): void {
    console.log(`🧪 Starting test: ${scenarioId}`)
    const scenario = DRAG_DROP_TEST_SCENARIOS.find(s => s.id === scenarioId)
    if (scenario) {
      console.log(`📋 Description: ${scenario.description}`)
      console.log(`🔍 Steps:`)
      scenario.steps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`)
      })
      console.log(`✅ Expected Result: ${scenario.expectedResult}`)
    }
  }

  recordResult(scenarioId: string, passed: boolean, notes: string, duration?: number): void {
    const result: TestResult = {
      scenarioId,
      passed,
      notes,
      timestamp: new Date(),
      duration
    }
    this.results.push(result)

    const emoji = passed ? '✅' : '❌'
    console.log(`${emoji} Test ${scenarioId}: ${passed ? 'PASSED' : 'FAILED'}`)
    if (notes) {
      console.log(`   📝 Notes: ${notes}`)
    }
    if (duration) {
      console.log(`   ⏱️ Duration: ${duration}ms`)
    }
  }

  getResults(): TestResult[] {
    return [...this.results]
  }

  getTestsByCategory(category: TestScenario['category']): TestScenario[] {
    return DRAG_DROP_TEST_SCENARIOS.filter(s => s.category === category)
  }

  getSummary(): { total: number; passed: number; failed: number; passRate: number } {
    const total = this.results.length
    const passed = this.results.filter(r => r.passed).length
    const failed = total - passed
    const passRate = total > 0 ? (passed / total) * 100 : 0

    return { total, passed, failed, passRate }
  }

  printSummary(): void {
    const summary = this.getSummary()
    console.log(`\n📊 Test Summary:`)
    console.log(`   Total Tests: ${summary.total}`)
    console.log(`   Passed: ${summary.passed}`)
    console.log(`   Failed: ${summary.failed}`)
    console.log(`   Pass Rate: ${summary.passRate.toFixed(1)}%`)

    if (summary.failed > 0) {
      console.log(`\n❌ Failed Tests:`)
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          const scenario = DRAG_DROP_TEST_SCENARIOS.find(s => s.id === r.scenarioId)
          console.log(`   • ${scenario?.name || r.scenarioId}: ${r.notes}`)
        })
    }
  }
}

// Utility functions for testing
export const dragDropTestUtils = {
  // Simulate drag start
  simulateDragStart: (appointmentId: string) => {
    console.log(`🖱️ Simulating drag start for appointment: ${appointmentId}`)
  },

  // Simulate drag over time slot
  simulateDragOver: (date: string, time: string) => {
    console.log(`🎯 Simulating drag over time slot: ${date} ${time}`)
  },

  // Simulate drop
  simulateDrop: (appointmentId: string, date: string, time: string) => {
    console.log(`🎯 Simulating drop of ${appointmentId} at ${date} ${time}`)
  },

  // Check for conflicts
  checkConflicts: (appointments: CalendarAppointment[], barberId: number, date: string, startTime: string, duration: number): CalendarAppointment[] => {
    const endTime = new Date()
    const [hours, minutes] = startTime.split(':').map(Number)
    endTime.setHours(hours, minutes + duration, 0, 0)
    const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`

    return appointments.filter(apt => {
      if (apt.barberId !== barberId || apt.date !== date) return false

      const aptStart = new Date(`2024-01-01T${apt.startTime}`)
      const aptEnd = new Date(`2024-01-01T${apt.endTime}`)
      const testStart = new Date(`2024-01-01T${startTime}`)
      const testEnd = new Date(`2024-01-01T${endTimeStr}`)

      return (testStart < aptEnd && testEnd > aptStart)
    })
  },

  // Validate appointment timing
  validateTiming: (appointment: CalendarAppointment): boolean => {
    const start = new Date(`2024-01-01T${appointment.startTime}`)
    const end = new Date(`2024-01-01T${appointment.endTime}`)
    const expectedDuration = appointment.duration * 60000 // Convert to milliseconds
    const actualDuration = end.getTime() - start.getTime()

    return Math.abs(actualDuration - expectedDuration) < 60000 // Allow 1 minute tolerance
  }
}

// Global test runner instance
export const testRunner = new DragDropTestRunner()

// Make test runner available globally for console testing
if (typeof window !== 'undefined') {
  ;(window as any).dragDropTestRunner = testRunner
  ;(window as any).dragDropTestUtils = dragDropTestUtils
  ;(window as any).DRAG_DROP_TEST_SCENARIOS = DRAG_DROP_TEST_SCENARIOS
}
