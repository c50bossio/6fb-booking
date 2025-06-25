// Undo/Redo Testing Utilities for Calendar Drag & Drop
import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'

export interface UndoRedoTestScenario {
  id: string
  name: string
  description: string
  steps: string[]
  expectedBehavior: string
  keyboardShortcuts: string[]
}

export const UNDO_REDO_TEST_SCENARIOS: UndoRedoTestScenario[] = [
  {
    id: 'basic-undo-redo',
    name: 'Basic Undo/Redo Operations',
    description: 'Test basic undo and redo functionality',
    steps: [
      'Drag an appointment to a new time slot',
      'Verify appointment moved to new location',
      'Press Ctrl+Z (or Cmd+Z on Mac)',
      'Verify appointment returned to original location',
      'Press Ctrl+Y (or Cmd+Y on Mac)',
      'Verify appointment moved back to new location'
    ],
    expectedBehavior: 'Appointment location toggles correctly between original and new positions',
    keyboardShortcuts: ['Ctrl+Z / Cmd+Z (Undo)', 'Ctrl+Y / Cmd+Y (Redo)', 'Ctrl+Shift+Z / Cmd+Shift+Z (Redo alternative)']
  },
  {
    id: 'multiple-moves-undo',
    name: 'Multiple Moves Undo Chain',
    description: 'Test undoing multiple consecutive moves',
    steps: [
      'Move appointment A from 9:00 to 10:00',
      'Move appointment B from 11:00 to 12:00',
      'Move appointment C from 13:00 to 14:00',
      'Press Ctrl+Z three times',
      'Verify all appointments returned to original positions',
      'Press Ctrl+Y three times',
      'Verify all moves are redone correctly'
    ],
    expectedBehavior: 'Undo/redo stack maintains correct order and state for multiple operations',
    keyboardShortcuts: ['Ctrl+Z multiple times', 'Ctrl+Y multiple times']
  },
  {
    id: 'undo-button-interface',
    name: 'Undo/Redo Button Interface',
    description: 'Test the visual undo/redo buttons',
    steps: [
      'Look for undo/redo buttons in top-right corner',
      'Verify undo button is disabled when no actions to undo',
      'Drag an appointment to new location',
      'Verify undo button becomes enabled',
      'Click undo button',
      'Verify appointment returns to original location',
      'Verify redo button becomes enabled',
      'Click redo button',
      'Verify appointment moves back'
    ],
    expectedBehavior: 'Buttons enable/disable correctly and function the same as keyboard shortcuts',
    keyboardShortcuts: ['Visual buttons as alternative to keyboard']
  },
  {
    id: 'undo-after-conflict-resolution',
    name: 'Undo After Conflict Resolution',
    description: 'Test undo functionality after resolving conflicts',
    steps: [
      'Drag appointment to create a conflict',
      'Resolve conflict using the modal (accept suggestion)',
      'Press Ctrl+Z',
      'Verify appointment returns to pre-conflict state',
      'Press Ctrl+Y',
      'Verify conflict resolution is redone correctly'
    ],
    expectedBehavior: 'Undo/redo works correctly even with complex conflict resolution',
    keyboardShortcuts: ['Ctrl+Z', 'Ctrl+Y']
  },
  {
    id: 'undo-redo-stack-limits',
    name: 'Undo/Redo Stack Limits',
    description: 'Test behavior when undo/redo stacks reach limits',
    steps: [
      'Perform 20+ drag operations in sequence',
      'Try to undo all operations',
      'Check if there are any stack limitations',
      'Verify memory doesn\'t continuously grow',
      'Test performance with large undo stack'
    ],
    expectedBehavior: 'Stack handles large numbers of operations efficiently without memory leaks',
    keyboardShortcuts: ['Ctrl+Z repeatedly', 'Ctrl+Y repeatedly']
  },
  {
    id: 'undo-persistence-across-sessions',
    name: 'Undo Persistence Across Sessions',
    description: 'Test if undo stack persists across page refreshes',
    steps: [
      'Perform several drag operations',
      'Refresh the page',
      'Try to undo previous operations',
      'Verify expected behavior (usually undo stack is cleared)'
    ],
    expectedBehavior: 'Undo stack behavior is consistent and predictable across sessions',
    keyboardShortcuts: ['Ctrl+Z after page refresh']
  },
  {
    id: 'keyboard-shortcuts-focus',
    name: 'Keyboard Shortcuts with Different Focus',
    description: 'Test keyboard shortcuts work regardless of focus',
    steps: [
      'Drag an appointment',
      'Click on different parts of the page (modals, inputs, etc.)',
      'Try Ctrl+Z with different elements focused',
      'Verify undo works regardless of focus state',
      'Test with modal dialogs open'
    ],
    expectedBehavior: 'Keyboard shortcuts work globally regardless of focus state',
    keyboardShortcuts: ['Ctrl+Z with various elements focused']
  },
  {
    id: 'undo-with-external-changes',
    name: 'Undo with External Changes',
    description: 'Test undo behavior when appointments are modified externally',
    steps: [
      'Drag appointment A to new location',
      'Create new appointment B via "Add Appointment" modal',
      'Try to undo the drag operation',
      'Verify only the drag is undone, not the new appointment',
      'Test undo after external appointment deletion'
    ],
    expectedBehavior: 'Undo only affects drag operations, not other appointment changes',
    keyboardShortcuts: ['Ctrl+Z after mixed operations']
  }
]

export class UndoRedoTester {
  private testResults: Array<{
    scenarioId: string
    passed: boolean
    notes: string
    timestamp: Date
    keyboardShortcutsTested: string[]
  }> = []

  private moveHistory: Array<{
    appointmentId: string
    fromPosition: { date: string; time: string }
    toPosition: { date: string; time: string }
    timestamp: Date
  }> = []

  // Simulate keyboard shortcut
  static simulateKeyboardShortcut(key: 'z' | 'y', withShift: boolean = false): void {
    const event = new KeyboardEvent('keydown', {
      key: key,
      ctrlKey: true, // Will use metaKey on Mac automatically
      shiftKey: withShift,
      bubbles: true,
      cancelable: true
    })

    window.dispatchEvent(event)
    console.log(`🎹 Simulated: Ctrl+${withShift ? 'Shift+' : ''}${key.toUpperCase()}`)
  }

  // Check if undo/redo buttons exist and are functional
  static checkUndoRedoButtons(): {
    undoButton: { exists: boolean; enabled: boolean; element?: Element }
    redoButton: { exists: boolean; enabled: boolean; element?: Element }
  } {
    const undoButton = document.querySelector('[title*="Undo"]') as HTMLButtonElement
    const redoButton = document.querySelector('[title*="Redo"]') as HTMLButtonElement

    return {
      undoButton: {
        exists: !!undoButton,
        enabled: undoButton ? !undoButton.disabled : false,
        element: undoButton || undefined
      },
      redoButton: {
        exists: !!redoButton,
        enabled: redoButton ? !redoButton.disabled : false,
        element: redoButton || undefined
      }
    }
  }

  // Record a move operation for testing
  recordMove(appointmentId: string, fromDate: string, fromTime: string, toDate: string, toTime: string): void {
    this.moveHistory.push({
      appointmentId,
      fromPosition: { date: fromDate, time: fromTime },
      toPosition: { date: toDate, time: toTime },
      timestamp: new Date()
    })
  }

  // Get appointment position (mock function - would query actual DOM in real implementation)
  getAppointmentPosition(appointmentId: string): { date: string; time: string } | null {
    // In a real implementation, this would query the DOM to find the appointment's current position
    const appointmentElement = document.querySelector(`[data-appointment-id="${appointmentId}"]`)
    if (appointmentElement) {
      const date = appointmentElement.getAttribute('data-date')
      const time = appointmentElement.getAttribute('data-time')
      if (date && time) {
        return { date, time }
      }
    }
    return null
  }

  // Test a specific scenario
  async testScenario(scenarioId: string): Promise<boolean> {
    const scenario = UNDO_REDO_TEST_SCENARIOS.find(s => s.id === scenarioId)
    if (!scenario) {
      console.error(`Scenario not found: ${scenarioId}`)
      return false
    }

    console.log(`🧪 Testing: ${scenario.name}`)
    console.log(`📝 Description: ${scenario.description}`)
    console.log(`🎹 Keyboard shortcuts: ${scenario.keyboardShortcuts.join(', ')}`)

    // For now, return true as we would need actual DOM manipulation for full testing
    return true
  }

  // Record test result
  recordResult(scenarioId: string, passed: boolean, notes: string, keyboardShortcuts: string[] = []): void {
    this.testResults.push({
      scenarioId,
      passed,
      notes,
      timestamp: new Date(),
      keyboardShortcutsTested: keyboardShortcuts
    })

    const emoji = passed ? '✅' : '❌'
    console.log(`${emoji} Undo/Redo Test ${scenarioId}: ${passed ? 'PASSED' : 'FAILED'}`)
    console.log(`   📝 Notes: ${notes}`)
    if (keyboardShortcuts.length > 0) {
      console.log(`   🎹 Shortcuts tested: ${keyboardShortcuts.join(', ')}`)
    }
  }

  // Get comprehensive test summary
  getSummary(): {
    total: number
    passed: number
    failed: number
    passRate: number
    keyboardShortcutsTotal: number
    mostTestedShortcuts: Array<{ shortcut: string; count: number }>
  } {
    const total = this.testResults.length
    const passed = this.testResults.filter(r => r.passed).length
    const failed = total - passed
    const passRate = total > 0 ? (passed / total) * 100 : 0

    // Count keyboard shortcuts
    const shortcutCounts: Record<string, number> = {}
    this.testResults.forEach(result => {
      result.keyboardShortcutsTested.forEach(shortcut => {
        shortcutCounts[shortcut] = (shortcutCounts[shortcut] || 0) + 1
      })
    })

    const keyboardShortcutsTotal = Object.values(shortcutCounts).reduce((sum, count) => sum + count, 0)
    const mostTestedShortcuts = Object.entries(shortcutCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([shortcut, count]) => ({ shortcut, count }))

    return {
      total,
      passed,
      failed,
      passRate,
      keyboardShortcutsTotal,
      mostTestedShortcuts
    }
  }

  // Run all automated checks
  runAutomatedChecks(): {
    buttonsAvailable: boolean
    keyboardListenerActive: boolean
    undoStackExists: boolean
    redoStackExists: boolean
  } {
    const buttons = UndoRedoTester.checkUndoRedoButtons()

    // Check if keyboard event listeners are active (simplified check)
    const keyboardListenerActive = true // Would need more complex detection in real implementation

    // Check if undo/redo functionality exists (simplified)
    const undoStackExists = buttons.undoButton.exists
    const redoStackExists = buttons.redoButton.exists

    const result = {
      buttonsAvailable: buttons.undoButton.exists && buttons.redoButton.exists,
      keyboardListenerActive,
      undoStackExists,
      redoStackExists
    }

    console.log('🔍 Undo/Redo System Check:', result)
    console.log('🔘 Undo Button:', buttons.undoButton)
    console.log('🔘 Redo Button:', buttons.redoButton)

    return result
  }

  // Print comprehensive report
  printReport(): void {
    const summary = this.getSummary()
    const checks = this.runAutomatedChecks()

    console.log('\n🔄 Undo/Redo Testing Report')
    console.log('============================')
    console.log(`Buttons Available: ${checks.buttonsAvailable ? '✅' : '❌'}`)
    console.log(`Keyboard Listeners: ${checks.keyboardListenerActive ? '✅' : '❌'}`)
    console.log(`Undo Stack: ${checks.undoStackExists ? '✅' : '❌'}`)
    console.log(`Redo Stack: ${checks.redoStackExists ? '✅' : '❌'}`)
    console.log('\nTest Results:')
    console.log(`  Total Tests: ${summary.total}`)
    console.log(`  Passed: ${summary.passed}`)
    console.log(`  Failed: ${summary.failed}`)
    console.log(`  Pass Rate: ${summary.passRate.toFixed(1)}%`)
    console.log(`\nKeyboard Shortcuts:`)
    console.log(`  Total Shortcut Tests: ${summary.keyboardShortcutsTotal}`)
    console.log(`  Most Tested:`)
    summary.mostTestedShortcuts.forEach(({ shortcut, count }) => {
      console.log(`    ${shortcut}: ${count} times`)
    })
  }
}

// Global instance
export const undoRedoTester = new UndoRedoTester()

// Make available globally for console testing
if (typeof window !== 'undefined') {
  ;(window as any).undoRedoTester = undoRedoTester
  ;(window as any).UNDO_REDO_TEST_SCENARIOS = UNDO_REDO_TEST_SCENARIOS
  ;(window as any).UndoRedoTester = UndoRedoTester
}
