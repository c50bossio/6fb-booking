'use client'

import { useState, useEffect } from 'react'
import CalendarSystem from '@/components/calendar/CalendarSystem'
import { generateDragDropTestData, generateConflictTestScenarios } from '@/utils/mockCalendarData'
import {
  DRAG_DROP_TEST_SCENARIOS,
  testRunner,
  dragDropTestUtils,
  type TestScenario
} from '@/utils/dragDropTestUtils'
import {
  MOBILE_TOUCH_SCENARIOS,
  mobileTester,
  MobileTouchTester,
  type TouchTestScenario
} from '@/utils/mobileTestUtils'

export default function CalendarDemoPage() {
  const [testMode, setTestMode] = useState<'comprehensive' | 'conflicts' | 'basic' | 'mobile'>('comprehensive')
  const [showInstructions, setShowInstructions] = useState(true)
  const [activeTest, setActiveTest] = useState<string | null>(null)
  const [testResults, setTestResults] = useState(testRunner.getResults())
  const [mobileEnv, setMobileEnv] = useState<any>(null)

  // Initialize test environment
  useEffect(() => {
    console.log('🧪 Calendar Drag & Drop Test Environment Initialized')
    console.log('📚 Available test scenarios:', DRAG_DROP_TEST_SCENARIOS.length)
    console.log('📱 Mobile test scenarios:', MOBILE_TOUCH_SCENARIOS.length)
    console.log('🔧 Test utilities loaded')
    console.log('\nTo run a test manually:')
    console.log('  testRunner.startTest("conflict-resolution-basic")')
    console.log('  testRunner.recordResult("conflict-resolution-basic", true, "All good!")')
    console.log('\nTo see all scenarios:')
    console.log('  DRAG_DROP_TEST_SCENARIOS')
    console.log('  MOBILE_TOUCH_SCENARIOS')

    // Initialize mobile environment check
    const env = mobileTester.runAutomatedChecks()
    setMobileEnv(env)
  }, [])

  const startTest = (scenarioId: string) => {
    setActiveTest(scenarioId)
    testRunner.startTest(scenarioId)
  }

  const recordTestResult = (scenarioId: string, passed: boolean, notes: string) => {
    testRunner.recordResult(scenarioId, passed, notes)
    setTestResults(testRunner.getResults())
    setActiveTest(null)
  }

  const testInstructions = {
    comprehensive: [
      "🎯 **Drag & Drop Test Scenarios Loaded**",
      "",
      "**Conflict Testing:**",
      "• Try dragging 'John Conflict' (10:00 Marcus) to overlap with 'Mike Overlap' (10:30 Marcus)",
      "• Should trigger conflict resolution modal with smart suggestions",
      "",
      "**Back-to-Back Testing:**",
      "• Move 'Alex Sequential' (14:00 Sarah) and watch 'Sam Following' (14:20 Sarah)",
      "• Test precision timing with 20-minute appointments",
      "",
      "**Long Appointment Testing:**",
      "• Drag 'David Lengthy' (75min appointment) to different time slots",
      "• Should handle duration calculations correctly",
      "",
      "**Multi-Barber Testing:**",
      "• Same time slots work for different barbers (11:00 Lisa & Tony)",
      "• Cross-barber conflicts should not occur",
      "",
      "**Keyboard Shortcuts:**",
      "• **Ctrl+Z**: Undo last move",
      "• **Ctrl+Y**: Redo last move",
      "",
      "**Mobile Testing:**",
      "• Use touch gestures on mobile devices",
      "• Test snap-to-grid on different screen sizes"
    ],
    conflicts: [
      "⚠️ **Conflict Resolution Testing**",
      "",
      "This mode loads specific conflicting appointments:",
      "• Two overlapping appointments for the same barber",
      "• Test the conflict resolution modal",
      "• Try different resolution strategies",
      "",
      "**Test Actions:**",
      "1. Drag one appointment onto another (same barber)",
      "2. Choose resolution: Accept suggestion, Bump appointments, or Allow overlap",
      "3. Test undo/redo after conflict resolution"
    ],
    basic: [
      "📅 **Basic Calendar Testing**",
      "",
      "Standard calendar functionality:",
      "• Create new appointments by clicking time slots",
      "• View appointment details by clicking appointments",
      "• Basic drag & drop without conflicts",
      "• Test different calendar views (week/month/day)"
    ],
    mobile: [
      "📱 **Mobile Touch Testing**",
      "",
      "Touch-specific functionality:",
      "• Long press to start dragging appointments",
      "• Test touch precision and snap-to-grid",
      "• Verify scroll prevention during drag",
      "• Test conflict resolution on mobile",
      "• Check touch target sizes (44px minimum)",
      "• Test landscape/portrait orientation",
      "",
      `**Current Device: ${mobileEnv?.deviceType || 'Unknown'}**`,
      `**Touch Support: ${mobileEnv?.isTouchDevice ? '✅' : '❌'}**`,
      `**Touch Targets Valid: ${mobileEnv?.touchTargetsValid ? '✅' : '⚠️'}**`
    ]
  }

  return (
    <div className="min-h-screen bg-[#0F1014] text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#20D9D2] mb-2">
            Calendar Drag & Drop Testing
          </h1>
          <p className="text-gray-400">
            Comprehensive testing environment for calendar functionality
          </p>
        </div>

        {/* Test Mode Selector */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <button
            onClick={() => setTestMode('comprehensive')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              testMode === 'comprehensive'
                ? 'bg-[#20D9D2] text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🎯 Comprehensive Testing
          </button>
          <button
            onClick={() => setTestMode('conflicts')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              testMode === 'conflicts'
                ? 'bg-[#20D9D2] text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            ⚠️ Conflict Testing
          </button>
          <button
            onClick={() => setTestMode('basic')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              testMode === 'basic'
                ? 'bg-[#20D9D2] text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            📅 Basic Testing
          </button>
          <button
            onClick={() => setTestMode('mobile')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              testMode === 'mobile'
                ? 'bg-[#20D9D2] text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            📱 Mobile Testing
          </button>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="px-4 py-2 rounded-lg font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {showInstructions ? '👁️ Hide' : '📋 Show'} Instructions
          </button>
        </div>

        {/* Instructions Panel */}
        {showInstructions && (
          <div className="mb-6 bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <div className="prose prose-invert max-w-none">
              {testInstructions[testMode].map((line, index) => {
                if (line === '') return <br key={index} />
                if (line.startsWith('**') && line.endsWith('**')) {
                  return (
                    <h4 key={index} className="text-[#20D9D2] font-semibold mt-4 mb-2">
                      {line.slice(2, -2)}
                    </h4>
                  )
                }
                if (line.startsWith('• ')) {
                  return (
                    <div key={index} className="ml-4 text-gray-300 mb-1">
                      {line}
                    </div>
                  )
                }
                return (
                  <p key={index} className="text-gray-300 mb-2">
                    {line}
                  </p>
                )
              })}
            </div>
          </div>
        )}

        {/* Calendar System */}
        <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-6">
          <CalendarSystem
            initialView="week"
            enableDragDrop={true}
            darkMode={true}
            onAppointmentCreate={(appointment) => {
              console.log('Appointment created:', appointment)
            }}
            onAppointmentUpdate={(appointment) => {
              console.log('Appointment updated:', appointment)
            }}
            onAppointmentDelete={(appointmentId) => {
              console.log('Appointment deleted:', appointmentId)
            }}
          />
        </div>

        {/* Test Status */}
        <div className="mt-6 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[#20D9D2] mb-3">
            🧪 Test Status & Console
          </h3>
          <div className="space-y-2 text-sm text-gray-400">
            <div>• Demo mode is active - using comprehensive test data</div>
            <div>• Drag & drop is enabled with conflict resolution</div>
            <div>• Check browser console for detailed logs</div>
            <div>• Mobile touch support is enabled</div>
            <div>• Undo/Redo functionality available (Ctrl+Z/Ctrl+Y)</div>
          </div>
        </div>

        {/* Test Scenarios Panel */}
        <div className="mt-6 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[#20D9D2] mb-3">
            🧪 Test Scenarios
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {DRAG_DROP_TEST_SCENARIOS.map((scenario) => {
              const isActive = activeTest === scenario.id
              const result = testResults.find(r => r.scenarioId === scenario.id)

              return (
                <div
                  key={scenario.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isActive
                      ? 'border-[#20D9D2] bg-[#20D9D2]/10'
                      : result?.passed
                      ? 'border-green-500 bg-green-500/10'
                      : result?.passed === false
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-gray-600 bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white text-sm">{scenario.name}</h4>
                    <div className="flex items-center gap-2">
                      {result && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          result.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {result.passed ? '✅' : '❌'}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${
                        scenario.category === 'conflict' ? 'bg-red-800 text-red-200' :
                        scenario.category === 'precision' ? 'bg-blue-800 text-blue-200' :
                        scenario.category === 'mobile' ? 'bg-purple-800 text-purple-200' :
                        scenario.category === 'undo' ? 'bg-yellow-800 text-yellow-200' :
                        'bg-gray-800 text-gray-200'
                      }`}>
                        {scenario.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{scenario.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startTest(scenario.id)}
                      disabled={isActive}
                      className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-[#20D9D2] text-black hover:bg-[#20D9D2]/80'
                      }`}
                    >
                      {isActive ? 'Running...' : 'Start Test'}
                    </button>
                    {isActive && (
                      <>
                        <button
                          onClick={() => recordTestResult(scenario.id, true, 'Manual test passed')}
                          className="px-3 py-1 text-xs rounded font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          ✅ Pass
                        </button>
                        <button
                          onClick={() => recordTestResult(scenario.id, false, 'Manual test failed')}
                          className="px-3 py-1 text-xs rounded font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          ❌ Fail
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <div className="mt-6 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-[#20D9D2] mb-3">
              📊 Test Results Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{testResults.length}</div>
                <div className="text-xs text-gray-400">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {testResults.filter(r => r.passed).length}
                </div>
                <div className="text-xs text-gray-400">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {testResults.filter(r => !r.passed).length}
                </div>
                <div className="text-xs text-gray-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#20D9D2]">
                  {testResults.length > 0 ? Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-400">Pass Rate</div>
              </div>
            </div>
            <button
              onClick={() => {
                testRunner.printSummary()
                setTestResults([])
              }}
              className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              Clear Results & Print Summary
            </button>
          </div>
        )}

        {/* Feature Checklist */}
        <div className="mt-6 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-[#20D9D2] mb-3">
            ✅ Manual Testing Checklist
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="text-gray-300 font-medium">Basic Functionality:</div>
              <div className="space-y-1 text-gray-400 ml-4">
                <div>□ Drag appointment blocks</div>
                <div>□ Drop on valid time slots</div>
                <div>□ Visual feedback during drag</div>
                <div>□ Snap to 15/30 minute intervals</div>
                <div>□ Click to create appointments</div>
                <div>□ Click to view appointment details</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-gray-300 font-medium">Advanced Features:</div>
              <div className="space-y-1 text-gray-400 ml-4">
                <div>□ Conflict detection & resolution</div>
                <div>□ Multi-option conflict modal</div>
                <div>□ Undo/Redo with Ctrl+Z/Y</div>
                <div>□ Mobile touch support</div>
                <div>□ Cross-barber scheduling</div>
                <div>□ Duration-aware dragging</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
