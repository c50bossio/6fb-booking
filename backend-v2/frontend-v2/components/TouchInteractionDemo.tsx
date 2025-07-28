'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Switch } from './ui/switch'
import { 
  Smartphone, 
  Vibrate, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Zap,
  Hand,
  MousePointer2,
  Move
} from 'lucide-react'
import { createTouchGestureManager, MobileTouchGestureManager } from '@/lib/mobile-touch-gestures'
import { useHapticFeedback, hapticFeedback, CalendarInteraction } from '@/lib/haptic-feedback-system'
import { useMobileDragAndDrop } from '@/hooks/useMobileDragAndDrop'
import { useToast } from '@/hooks/use-toast'

interface DemoInteraction {
  name: string
  type: CalendarInteraction
  description: string
  instruction: string
  color: string
  icon: React.ReactNode
}

const DEMO_INTERACTIONS: DemoInteraction[] = [
  {
    name: 'Appointment Select',
    type: 'appointment_select',
    description: 'Single tap to select an appointment',
    instruction: 'Tap the appointment card below',
    color: 'bg-blue-100 border-blue-200',
    icon: <MousePointer2 className="w-4 h-4" />
  },
  {
    name: 'Double Tap Booking',
    type: 'double_tap',
    description: 'Double tap to create new booking',
    instruction: 'Double-tap the time slot quickly',
    color: 'bg-green-100 border-green-200',
    icon: <CheckCircle className="w-4 h-4" />
  },
  {
    name: 'Long Press Options',
    type: 'long_press',
    description: 'Long press for context menu',
    instruction: 'Press and hold for 600ms',
    color: 'bg-purple-100 border-purple-200',
    icon: <Hand className="w-4 h-4" />
  },
  {
    name: 'Drag to Reschedule',
    type: 'drag_start',
    description: 'Drag appointment to new time',
    instruction: 'Drag the appointment card',
    color: 'bg-orange-100 border-orange-200',
    icon: <Move className="w-4 h-4" />
  },
  {
    name: 'Swipe Navigation',
    type: 'swipe_navigation',
    description: 'Swipe to navigate dates',
    instruction: 'Swipe left or right on calendar area',
    color: 'bg-indigo-100 border-indigo-200',
    icon: <RotateCcw className="w-4 h-4" />
  },
  {
    name: 'Booking Success',
    type: 'booking_success',
    description: 'Celebration feedback on success',
    instruction: 'Click to simulate successful booking',
    color: 'bg-emerald-100 border-emerald-200',
    icon: <Zap className="w-4 h-4" />
  },
  {
    name: 'Conflict Detection',
    type: 'conflict_detected',
    description: 'Warning for scheduling conflicts',
    instruction: 'Click to simulate conflict warning',
    color: 'bg-red-100 border-red-200',
    icon: <AlertTriangle className="w-4 h-4" />
  }
]

export function TouchInteractionDemo() {
  const [selectedDemo, setSelectedDemo] = useState<DemoInteraction | null>(null)
  const [lastInteraction, setLastInteraction] = useState<string>('')
  const [interactionLog, setInteractionLog] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [hapticEnabled, setHapticEnabled] = useState(true)
  
  const demoAreaRef = useRef<HTMLDivElement>(null)
  const gestureManagerRef = useRef<MobileTouchGestureManager | null>(null)
  const { toast } = useToast()
  
  const { 
    feedback: triggerHaptic, 
    capabilities, 
    setEnabled: setHapticSystemEnabled,
    testFeedback 
  } = useHapticFeedback({
    debugMode: true,
    fallbackToSound: true
  })

  // Setup gesture manager
  useEffect(() => {
    if (demoAreaRef.current && !gestureManagerRef.current) {
      gestureManagerRef.current = createTouchGestureManager(demoAreaRef.current, {
        swipe: {
          threshold: 50,
          velocity: 0.3,
          maxTime: 800,
          preventScroll: false
        },
        tap: {
          maxTime: 300,
          maxDistance: 15,
          doubleTapDelay: 350
        },
        longPress: {
          duration: 600,
          maxDistance: 20
        },
        drag: {
          threshold: 15,
          snapBack: true,
          hapticFeedback: true
        }
      })

      gestureManagerRef.current
        .onSwipe((gesture) => {
          logInteraction(`Swipe ${gesture.direction} (${Math.round(gesture.velocity * 100)}% velocity)`)
          triggerHaptic('swipe_navigation')
          toast({
            title: 'Swipe Detected',
            description: `Swiped ${gesture.direction} with ${Math.round(gesture.velocity * 1000)}ms velocity`,
            duration: 2000
          })
        })
        .onTap((gesture) => {
          if (gesture.isDoubleTap) {
            logInteraction('Double tap detected')
            triggerHaptic('double_tap')
            toast({
              title: 'Double Tap',
              description: 'Creating new appointment...',
              duration: 2000
            })
          } else {
            logInteraction('Single tap detected')
            triggerHaptic('appointment_select')
          }
        })
        .onLongPress((gesture) => {
          logInteraction(`Long press (${gesture.duration}ms)`)
          triggerHaptic('long_press')
          toast({
            title: 'Long Press',
            description: 'Context menu available',
            duration: 2000
          })
        })
        .onDrag((gesture) => {
          switch (gesture.phase) {
            case 'start':
              logInteraction('Drag started')
              triggerHaptic('drag_start')
              break
            case 'move':
              // Only log every few moves to avoid spam
              if (Math.abs(gesture.delta.x) % 20 < 5 || Math.abs(gesture.delta.y) % 20 < 5) {
                logInteraction(`Dragging (${Math.round(gesture.delta.x)}, ${Math.round(gesture.delta.y)})`)
              }
              break
            case 'end':
              logInteraction('Drag completed')
              triggerHaptic('drag_success')
              toast({
                title: 'Drag Complete',
                description: 'Appointment moved successfully',
                duration: 2000
              })
              break
            case 'cancel':
              logInteraction('Drag cancelled')
              triggerHaptic('drag_cancel')
              break
          }
        })
    }

    return () => {
      gestureManagerRef.current?.destroy()
      gestureManagerRef.current = null
    }
  }, [triggerHaptic, toast])

  // Update haptic system when toggle changes
  useEffect(() => {
    setHapticSystemEnabled(hapticEnabled)
  }, [hapticEnabled, setHapticSystemEnabled])

  const logInteraction = (interaction: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `${timestamp}: ${interaction}`
    setLastInteraction(logEntry)
    
    if (isRecording) {
      setInteractionLog(prev => [...prev.slice(-9), logEntry])
    }
  }

  const simulateInteraction = async (demo: DemoInteraction) => {
    setSelectedDemo(demo)
    logInteraction(`Simulated: ${demo.name}`)
    await triggerHaptic(demo.type, { force: true })
    
    toast({
      title: demo.name,
      description: demo.description,
      duration: 2000
    })
  }

  const clearLog = () => {
    setInteractionLog([])
    setLastInteraction('')
  }

  const runHapticTest = async () => {
    toast({
      title: 'Testing Haptic Patterns',
      description: 'You should feel different vibration patterns',
      duration: 3000
    })
    await testFeedback()
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Touch Interaction & Haptic Feedback Demo
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={hapticEnabled} 
                  onCheckedChange={setHapticEnabled}
                  id="haptic-toggle"
                />
                <label htmlFor="haptic-toggle" className="text-sm font-medium">
                  Haptic Feedback
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch 
                  checked={isRecording} 
                  onCheckedChange={setIsRecording}
                  id="recording-toggle"
                />
                <label htmlFor="recording-toggle" className="text-sm font-medium">
                  Record Interactions
                </label>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={capabilities.supported ? "default" : "secondary"}>
                {capabilities.supported ? "Haptics Supported" : "Haptics Not Available"}
              </Badge>
              {capabilities.supported && (
                <Button size="sm" onClick={runHapticTest}>
                  Test Haptics
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {capabilities.supported ? 
                <Vibrate className="w-4 h-4 text-green-600" /> : 
                <VolumeX className="w-4 h-4 text-red-600" />
              }
              <span className="text-sm">
                {capabilities.supported ? 'Haptics Available' : 'No Haptic Support'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {capabilities.enabled ? 
                <Volume2 className="w-4 h-4 text-green-600" /> : 
                <VolumeX className="w-4 h-4 text-gray-400" />
              }
              <span className="text-sm">
                {capabilities.enabled ? 'Feedback Enabled' : 'Feedback Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isRecording ? 
                <Play className="w-4 h-4 text-red-600" /> : 
                <Pause className="w-4 h-4 text-gray-400" />
              }
              <span className="text-sm">
                {isRecording ? 'Recording' : 'Not Recording'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span className="text-sm">Touch Ready</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Interactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demo Interactions</CardTitle>
          <p className="text-sm text-gray-600">
            Try these interactions on mobile devices for the best experience
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DEMO_INTERACTIONS.map((demo) => (
              <Card 
                key={demo.type}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedDemo?.type === demo.type ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => simulateInteraction(demo)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${demo.color}`}>
                      {demo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{demo.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{demo.description}</p>
                      <p className="text-xs text-blue-600 mt-2 font-medium">{demo.instruction}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Touch Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Touch Interaction Area</CardTitle>
          <p className="text-sm text-gray-600">
            Swipe, tap, double-tap, long press, or drag in this area
          </p>
        </CardHeader>
        <CardContent>
          <div 
            ref={demoAreaRef}
            className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[300px] flex flex-col items-center justify-center gap-4 touch-manipulation select-none"
          >
            {/* Draggable Appointment Card */}
            <div 
              className="bg-blue-100 border border-blue-200 rounded-lg p-4 cursor-move touch-manipulation shadow-sm"
              data-appointment-id="demo-1"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="font-medium text-sm text-blue-900">Demo Appointment</p>
                  <p className="text-xs text-blue-700">Drag me to reschedule</p>
                </div>
              </div>
            </div>

            {/* Time Slot Areas */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div 
                className="bg-white border border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50"
                data-time-slot="true"
                data-date="2024-01-15"
                data-time="10:00"
              >
                <p className="text-sm font-medium">10:00 AM</p>
                <p className="text-xs text-gray-500">Available</p>
              </div>
              <div 
                className="bg-white border border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50"
                data-time-slot="true"
                data-date="2024-01-15"
                data-time="11:00"
              >
                <p className="text-sm font-medium">11:00 AM</p>
                <p className="text-xs text-gray-500">Available</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">Interactive Touch Zone</p>
              <p className="text-sm text-gray-500 mt-1">
                Try different gestures here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Interaction Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Interaction Log</CardTitle>
          <Button variant="outline" size="sm" onClick={clearLog}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </CardHeader>
        <CardContent>
          {/* Last Interaction */}
          {lastInteraction && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="font-mono text-sm">
                {lastInteraction}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Interaction History */}
          {interactionLog.length > 0 ? (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {interactionLog.map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-600 p-2 bg-gray-50 rounded">
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              {isRecording ? 'Perform interactions to see them logged here...' : 'Enable recording to track interactions'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use This Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>On Mobile:</strong> All gestures work with haptic feedback if supported
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>On Desktop:</strong> Some gestures work with mouse (click, drag), no haptics
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Demo Cards:</strong> Click any interaction card to simulate the haptic pattern
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Touch Area:</strong> Try different gestures in the interactive zone above
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Recording:</strong> Enable to track and log your interactions
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TouchInteractionDemo