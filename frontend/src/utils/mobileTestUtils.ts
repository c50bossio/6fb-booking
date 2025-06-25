// Mobile Touch Testing Utilities for Drag & Drop
import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'

export interface TouchTestScenario {
  id: string
  name: string
  description: string
  device: 'phone' | 'tablet' | 'touch-laptop'
  steps: string[]
  expectedBehavior: string
}

export const MOBILE_TOUCH_SCENARIOS: TouchTestScenario[] = [
  {
    id: 'mobile-basic-drag',
    name: 'Basic Touch Drag & Drop',
    description: 'Test basic touch interaction for dragging appointments',
    device: 'phone',
    steps: [
      'Long press on appointment block (500ms)',
      'Drag finger across screen to new time slot',
      'Release finger to drop appointment',
      'Verify haptic feedback (if available)',
      'Check appointment moved correctly'
    ],
    expectedBehavior: 'Smooth drag with visual feedback, prevents scrolling during drag'
  },
  {
    id: 'mobile-conflict-handling',
    name: 'Mobile Conflict Resolution',
    description: 'Test conflict resolution modal on mobile devices',
    device: 'phone',
    steps: [
      'Drag appointment to conflicting time slot',
      'Verify modal appears properly sized for mobile',
      'Test modal interaction with touch',
      'Select resolution option with touch',
      'Confirm modal closes properly'
    ],
    expectedBehavior: 'Modal scales properly, touch targets are accessible'
  },
  {
    id: 'tablet-multi-appointment',
    name: 'Tablet Multi-Appointment Handling',
    description: 'Test handling multiple appointments on larger touch screens',
    device: 'tablet',
    steps: [
      'Drag multiple appointments in succession',
      'Test precision with larger targets',
      'Verify landscape/portrait orientation handling',
      'Test two-finger gestures (zoom/pan) while dragging disabled'
    ],
    expectedBehavior: 'Accurate targeting, orientation changes handled gracefully'
  },
  {
    id: 'touch-snap-precision',
    name: 'Touch Snap-to-Grid Precision',
    description: 'Test snap-to-grid accuracy with touch input',
    device: 'phone',
    steps: [
      'Drag appointment near time slot boundaries',
      'Test snapping to 15-minute intervals',
      'Verify visual snap guides appear',
      'Check snapping works with different drag speeds',
      'Test edge cases at calendar boundaries'
    ],
    expectedBehavior: 'Precise snapping despite finger imprecision, clear visual feedback'
  },
  {
    id: 'mobile-undo-redo',
    name: 'Mobile Undo/Redo Interface',
    description: 'Test undo/redo functionality on mobile without keyboard',
    device: 'phone',
    steps: [
      'Drag appointment to new location',
      'Look for mobile undo controls',
      'Test touch-based undo if available',
      'Verify redo functionality',
      'Test gesture-based undo (shake, swipe) if implemented'
    ],
    expectedBehavior: 'Alternative to keyboard shortcuts available on mobile'
  },
  {
    id: 'mobile-accessibility',
    name: 'Mobile Accessibility',
    description: 'Test accessibility features for touch devices',
    device: 'phone',
    steps: [
      'Test with screen reader (TalkBack/VoiceOver)',
      'Verify touch targets meet 44px minimum size',
      'Test drag announcement with screen reader',
      'Check color contrast in mobile view',
      'Test with increased font sizes'
    ],
    expectedBehavior: 'Accessible to users with disabilities, proper announcements'
  },
  {
    id: 'mobile-performance',
    name: 'Mobile Performance Under Load',
    description: 'Test performance with many appointments on mobile',
    device: 'phone',
    steps: [
      'Load calendar with 50+ appointments',
      'Test drag responsiveness',
      'Monitor for frame drops during animation',
      'Test on older mobile hardware if possible',
      'Check memory usage during extended use'
    ],
    expectedBehavior: 'Smooth performance even on slower devices'
  }
]

export class MobileTouchTester {
  private testResults: Array<{
    scenarioId: string
    device: string
    passed: boolean
    notes: string
    timestamp: Date
  }> = []

  // Detect if we're on a touch device
  static isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0
    )
  }

  // Get device type estimation
  static getDeviceType(): 'phone' | 'tablet' | 'desktop' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase()
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const isTouch = MobileTouchTester.isTouchDevice()

    if (!isTouch) return 'desktop'

    // Check for tablet indicators
    if (
      userAgent.includes('ipad') ||
      (userAgent.includes('android') && !userAgent.includes('mobile')) ||
      (screenWidth >= 768 && screenHeight >= 1024) ||
      (screenWidth >= 1024 && screenHeight >= 768)
    ) {
      return 'tablet'
    }

    // Assume phone for other touch devices
    if (isTouch) return 'phone'

    return 'unknown'
  }

  // Simulate touch events for testing
  static simulateTouchEvent(
    element: Element,
    eventType: 'touchstart' | 'touchmove' | 'touchend',
    x: number,
    y: number
  ): void {
    const touch = new Touch({
      identifier: 1,
      target: element,
      clientX: x,
      clientY: y,
      radiusX: 10,
      radiusY: 10,
      rotationAngle: 0,
      force: 1
    })

    const touchEvent = new TouchEvent(eventType, {
      touches: eventType !== 'touchend' ? [touch] : [],
      targetTouches: eventType !== 'touchend' ? [touch] : [],
      changedTouches: [touch],
      bubbles: true,
      cancelable: true
    })

    element.dispatchEvent(touchEvent)
  }

  // Test touch target sizes
  static validateTouchTargets(): Array<{ element: Element; size: { width: number; height: number }; valid: boolean }> {
    const appointmentBlocks = document.querySelectorAll('.appointment-block')
    const timeSlots = document.querySelectorAll('[data-time-slot]')
    const allTargets = [...Array.from(appointmentBlocks), ...Array.from(timeSlots)]

    return allTargets.map(element => {
      const rect = element.getBoundingClientRect()
      const size = { width: rect.width, height: rect.height }
      const valid = size.width >= 44 && size.height >= 44 // iOS HIG recommendation

      return { element, size, valid }
    })
  }

  // Test scroll prevention during drag
  static testScrollPrevention(): boolean {
    const body = document.body
    const hasPreventClass = body.classList.contains('dragging-active')
    const styles = window.getComputedStyle(body)
    const overflowPrevented = styles.overflow === 'hidden'
    const positionFixed = styles.position === 'fixed'

    return hasPreventClass && overflowPrevented && positionFixed
  }

  // Record test result
  recordResult(scenarioId: string, device: string, passed: boolean, notes: string): void {
    this.testResults.push({
      scenarioId,
      device,
      passed,
      notes,
      timestamp: new Date()
    })

    console.log(`📱 Mobile Test ${passed ? 'PASSED' : 'FAILED'}: ${scenarioId}`)
    console.log(`   Device: ${device}`)
    console.log(`   Notes: ${notes}`)
  }

  // Get test summary
  getSummary(): {
    total: number
    passed: number
    failed: number
    byDevice: Record<string, { passed: number; failed: number }>
  } {
    const total = this.testResults.length
    const passed = this.testResults.filter(r => r.passed).length
    const failed = total - passed

    const byDevice: Record<string, { passed: number; failed: number }> = {}
    this.testResults.forEach(result => {
      if (!byDevice[result.device]) {
        byDevice[result.device] = { passed: 0, failed: 0 }
      }
      if (result.passed) {
        byDevice[result.device].passed++
      } else {
        byDevice[result.device].failed++
      }
    })

    return { total, passed, failed, byDevice }
  }

  // Run automated checks
  runAutomatedChecks(): {
    deviceType: string
    isTouchDevice: boolean
    touchTargetsValid: boolean
    hasHapticFeedback: boolean
    supportsPointerEvents: boolean
  } {
    const deviceType = MobileTouchTester.getDeviceType()
    const isTouchDevice = MobileTouchTester.isTouchDevice()
    const touchTargets = MobileTouchTester.validateTouchTargets()
    const touchTargetsValid = touchTargets.every(target => target.valid)

    // Check for haptic feedback support
    // @ts-ignore
    const hasHapticFeedback = 'vibrate' in navigator || 'hapticFeedback' in navigator

    // Check for pointer events support
    const supportsPointerEvents = 'PointerEvent' in window

    const result = {
      deviceType,
      isTouchDevice,
      touchTargetsValid,
      hasHapticFeedback,
      supportsPointerEvents
    }

    console.log('📱 Mobile Environment Check:', result)
    console.log('🎯 Touch Targets Analysis:', {
      total: touchTargets.length,
      valid: touchTargets.filter(t => t.valid).length,
      invalid: touchTargets.filter(t => !t.valid).length
    })

    if (!touchTargetsValid) {
      console.warn('⚠️ Some touch targets are smaller than 44px recommended size')
      touchTargets
        .filter(t => !t.valid)
        .forEach(target => {
          console.warn(`   Small target:`, target.size, target.element)
        })
    }

    return result
  }

  // Print comprehensive report
  printReport(): void {
    const summary = this.getSummary()
    const checks = this.runAutomatedChecks()

    console.log('\n📱 Mobile Touch Testing Report')
    console.log('================================')
    console.log(`Device Type: ${checks.deviceType}`)
    console.log(`Touch Device: ${checks.isTouchDevice}`)
    console.log(`Touch Targets Valid: ${checks.touchTargetsValid}`)
    console.log(`Haptic Feedback: ${checks.hasHapticFeedback}`)
    console.log(`Pointer Events: ${checks.supportsPointerEvents}`)
    console.log('\nTest Results:')
    console.log(`  Total: ${summary.total}`)
    console.log(`  Passed: ${summary.passed}`)
    console.log(`  Failed: ${summary.failed}`)
    console.log('\nBy Device:')
    Object.entries(summary.byDevice).forEach(([device, stats]) => {
      console.log(`  ${device}: ${stats.passed}✅ ${stats.failed}❌`)
    })
  }
}

// Global mobile test instance
export const mobileTester = new MobileTouchTester()

// Make available globally for console testing
if (typeof window !== 'undefined') {
  ;(window as any).mobileTester = mobileTester
  ;(window as any).MOBILE_TOUCH_SCENARIOS = MOBILE_TOUCH_SCENARIOS
  ;(window as any).MobileTouchTester = MobileTouchTester
}
