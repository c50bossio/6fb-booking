/**
 * Mobile PWA Onboarding Flow
 * Interactive tutorial for new mobile features and touch interactions
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { useHapticFeedback } from '@/lib/haptic-feedback-system'
import { useFeatureFlag } from '@/lib/mobile-pwa-deployment'
import { trackMobileTouchInteraction, trackMobileHapticAnalytics } from '@/lib/mobile-pwa-analytics'

interface OnboardingStep {
  id: string
  title: string
  description: string
  instruction: string
  gesture?: 'tap' | 'double_tap' | 'long_press' | 'swipe' | 'drag'
  hapticPattern?: string
  demoElement?: React.ReactNode
  validation?: () => boolean
}

interface OnboardingProps {
  onComplete: () => void
  onSkip: () => void
  autoStart?: boolean
  stepOverride?: number
}

export default function MobilePWAOnboarding({ 
  onComplete, 
  onSkip, 
  autoStart = false,
  stepOverride 
}: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(stepOverride || 0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isActive, setIsActive] = useState(autoStart)
  const [gestureDetected, setGestureDetected] = useState(false)
  const [showHint, setShowHint] = useState(false)
  
  const { feedback } = useHapticFeedback()
  const isTouchEnabled = useFeatureFlag('touch-gestures')
  const isHapticEnabled = useFeatureFlag('haptic-feedback')
  
  const demoElementRef = useRef<HTMLDivElement>(null)
  const hintTimeoutRef = useRef<NodeJS.Timeout>()

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Mobile PWA Features!',
      description: 'Your calendar now has advanced touch interactions and haptic feedback.',
      instruction: 'Tap "Continue" to start the tour',
      demoElement: (
        <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
          <div className="text-4xl mb-4">📱✨</div>
          <div className="text-lg font-semibold text-blue-700">Enhanced Mobile Experience</div>
          <div className="text-sm text-blue-600 mt-2">Touch gestures, haptic feedback, and optimized performance</div>
        </div>
      )
    },
    {
      id: 'basic_tap',
      title: 'Basic Touch Interaction',
      description: 'Learn how to interact with calendar elements using touch.',
      instruction: 'Tap the demo appointment below',
      gesture: 'tap',
      hapticPattern: 'appointment_select',
      demoElement: (
        <div 
          ref={demoElementRef}
          className="p-4 bg-blue-100 border-2 border-blue-300 rounded-lg cursor-pointer transition-all hover:bg-blue-200 active:bg-blue-300"
          data-demo="appointment"
        >
          <div className="font-medium">Demo Appointment</div>
          <div className="text-sm text-gray-600">2:00 PM - 3:00 PM</div>
          <div className="text-xs text-blue-600 mt-1">👆 Tap me!</div>
        </div>
      )
    },
    {
      id: 'double_tap',
      title: 'Double Tap to Book',
      description: 'Quickly create appointments with double-tap gestures.',
      instruction: 'Double-tap the time slot below',
      gesture: 'double_tap',
      hapticPattern: 'booking_success',
      demoElement: (
        <div 
          ref={demoElementRef}
          className="p-4 bg-green-50 border-2 border-dashed border-green-300 rounded-lg cursor-pointer transition-all hover:bg-green-100"
          data-demo="timeslot"
        >
          <div className="text-center text-green-700">
            <div className="text-sm font-medium">Available Time Slot</div>
            <div className="text-sm">3:00 PM - 4:00 PM</div>
            <div className="text-xs text-green-600 mt-1">👆👆 Double-tap to book!</div>
          </div>
        </div>
      )
    },
    {
      id: 'long_press',
      title: 'Long Press for Options',
      description: 'Access context menus and additional options.',
      instruction: 'Press and hold the appointment for 1 second',
      gesture: 'long_press',
      hapticPattern: 'context_menu',
      demoElement: (
        <div 
          ref={demoElementRef}
          className="p-4 bg-purple-100 border-2 border-purple-300 rounded-lg cursor-pointer transition-all hover:bg-purple-200"
          data-demo="appointment-options"
        >
          <div className="font-medium text-purple-800">Client Appointment</div>
          <div className="text-sm text-purple-600">John Doe - Haircut</div>
          <div className="text-xs text-purple-600 mt-1">👆 Press and hold for options</div>
        </div>
      )
    },
    {
      id: 'swipe_navigation',
      title: 'Swipe Navigation',
      description: 'Navigate between dates and views with swipe gestures.',
      instruction: 'Swipe left or right on the demo area',
      gesture: 'swipe',
      hapticPattern: 'navigation',
      demoElement: (
        <div 
          ref={demoElementRef}
          className="p-6 bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 rounded-lg cursor-pointer"
          data-demo="navigation"
        >
          <div className="text-center">
            <div className="text-lg font-medium text-orange-800">📅 Calendar Navigation</div>
            <div className="text-sm text-orange-600 mt-1">
              ← Swipe left/right to change dates →
            </div>
            <div className="flex justify-center items-center mt-3 space-x-4">
              <div className="text-2xl">←</div>
              <div className="px-3 py-1 bg-white rounded-lg shadow">Today</div>
              <div className="text-2xl">→</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'drag_drop',
      title: 'Drag & Drop Rescheduling',
      description: 'Move appointments by dragging them to new time slots.',
      instruction: 'Drag the appointment to the target slot',
      gesture: 'drag',
      hapticPattern: 'drag_success',
      demoElement: (
        <div className="space-y-4">
          <div 
            ref={demoElementRef}
            className="p-3 bg-indigo-100 border-2 border-indigo-300 rounded-lg cursor-move transition-all hover:bg-indigo-200"
            data-demo="draggable-appointment"
            draggable
          >
            <div className="font-medium text-indigo-800">Appointment to Move</div>
            <div className="text-sm text-indigo-600">2:00 PM - Haircut</div>
            <div className="text-xs text-indigo-600 mt-1">🖐️ Drag me down!</div>
          </div>
          
          <div className="p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center text-gray-500">
              <div className="text-sm">Drop Zone</div>
              <div className="text-xs">3:00 PM - Available</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'haptic_feedback',
      title: 'Haptic Feedback',
      description: 'Feel the feedback when interacting with calendar elements.',
      instruction: 'Try the different haptic patterns',
      demoElement: (
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-3">
            {isHapticEnabled ? 
              'Your device supports haptic feedback! Try the patterns below:' : 
              'Haptic feedback is not available on this device.'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { pattern: 'appointment_select', label: 'Selection', icon: '📍' },
              { pattern: 'booking_success', label: 'Success', icon: '✅' },
              { pattern: 'drag_start', label: 'Drag Start', icon: '🔄' },
              { pattern: 'navigation', label: 'Navigation', icon: '📅' }
            ].map((haptic, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isHapticEnabled) {
                    feedback(haptic.pattern)
                    trackMobileHapticAnalytics(haptic.pattern, true, 'onboarding')
                  }
                }}
                disabled={!isHapticEnabled}
                className="flex items-center space-x-1"
              >
                <span>{haptic.icon}</span>
                <span className="text-xs">{haptic.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'performance_tips',
      title: 'Performance Features',
      description: 'Your calendar is optimized for smooth mobile performance.',
      instruction: 'Learn about the optimizations',
      demoElement: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="text-green-600">⚡</div>
              <div>
                <div className="font-medium text-green-800">60 FPS Animations</div>
                <div className="text-sm text-green-600">Smooth touch interactions and transitions</div>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-blue-600">🧠</div>
              <div>
                <div className="font-medium text-blue-800">Smart Memory Management</div>
                <div className="text-sm text-blue-600">Handles large appointment datasets efficiently</div>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
              <div className="text-purple-600">🔋</div>
              <div>
                <div className="font-medium text-purple-800">Battery Optimized</div>
                <div className="text-sm text-purple-600">Minimal impact on device battery life</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'completion',
      title: 'You\'re All Set!',
      description: 'You\'ve learned all the new mobile features. Start using them in your calendar!',
      instruction: 'Tap "Finish" to complete the tour',
      demoElement: (
        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
          <div className="text-4xl mb-4">🎉</div>
          <div className="text-lg font-semibold text-green-700 mb-2">Congratulations!</div>
          <div className="text-sm text-gray-600 mb-4">
            You're now ready to use all the advanced mobile calendar features
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-medium">Gestures Learned:</div>
              <div>✓ Tap to select</div>
              <div>✓ Double-tap to book</div>
              <div>✓ Long press for options</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">Features Enabled:</div>
              <div>✓ Swipe navigation</div>
              <div>✓ Drag & drop</div>
              <div>✓ Haptic feedback</div>
            </div>
          </div>
        </div>
      )
    }
  ]

  // Initialize gesture detection
  useEffect(() => {
    if (!isActive || !demoElementRef.current) return

    const element = demoElementRef.current
    const step = onboardingSteps[currentStep]
    
    if (!step.gesture) return

    let touchStartTime = 0
    let touchStartPos = { x: 0, y: 0 }
    let tapCount = 0
    let lastTapTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartTime = Date.now()
      const touch = e.touches[0]
      touchStartPos = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndTime = Date.now()
      const duration = touchEndTime - touchStartTime
      const touch = e.changedTouches[0]
      const endPos = { x: touch.clientX, y: touch.clientY }
      const distance = Math.sqrt(
        Math.pow(endPos.x - touchStartPos.x, 2) + Math.pow(endPos.y - touchStartPos.y, 2)
      )

      // Detect gesture type
      let detectedGesture: string | null = null

      if (step.gesture === 'long_press' && duration > 500) {
        detectedGesture = 'long_press'
      } else if (step.gesture === 'swipe' && distance > 50) {
        detectedGesture = 'swipe'
      } else if (step.gesture === 'double_tap') {
        const timeSinceLastTap = touchEndTime - lastTapTime
        if (timeSinceLastTap < 300) {
          tapCount++
          if (tapCount >= 2) {
            detectedGesture = 'double_tap'
            tapCount = 0
          }
        } else {
          tapCount = 1
        }
        lastTapTime = touchEndTime
      } else if (step.gesture === 'tap' && duration < 300 && distance < 10) {
        detectedGesture = 'tap'
      }

      if (detectedGesture === step.gesture) {
        setGestureDetected(true)
        
        // Trigger haptic feedback
        if (step.hapticPattern && isHapticEnabled) {
          feedback(step.hapticPattern)
          trackMobileHapticAnalytics(step.hapticPattern, true, 'onboarding')
        }

        // Track interaction
        trackMobileTouchInteraction(step.gesture, 'onboarding-demo', true, duration)

        // Auto-advance after gesture
        setTimeout(() => {
          completeStep()
        }, 1500)
      }
    }

    const handleDragStart = () => {
      if (step.gesture === 'drag') {
        setGestureDetected(true)
        if (step.hapticPattern && isHapticEnabled) {
          feedback(step.hapticPattern)
        }
        setTimeout(completeStep, 2000)
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('dragstart', handleDragStart)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('dragstart', handleDragStart)
    }
  }, [currentStep, isActive, feedback, isHapticEnabled])

  // Show hint after delay
  useEffect(() => {
    if (isActive && onboardingSteps[currentStep].gesture) {
      hintTimeoutRef.current = setTimeout(() => {
        setShowHint(true)
      }, 5000) // Show hint after 5 seconds
    }

    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
      }
    }
  }, [currentStep, isActive])

  const completeStep = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    setGestureDetected(false)
    setShowHint(false)
    
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const skipStep = () => {
    setGestureDetected(false)
    setShowHint(false)
    completeStep()
  }

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex)
    setGestureDetected(false)
    setShowHint(false)
  }

  const startOnboarding = () => {
    setIsActive(true)
    setCurrentStep(0)
    setCompletedSteps(new Set())
  }

  if (!isTouchEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mobile Features Unavailable</CardTitle>
          <CardDescription>
            Touch gestures are not enabled for your account or device.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>New Mobile Features Available!</CardTitle>
          <CardDescription>
            Learn how to use advanced touch gestures, haptic feedback, and mobile optimizations in your calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-1">👆</div>
              <div>Touch Gestures</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-1">📳</div>
              <div>Haptic Feedback</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl mb-1">⚡</div>
              <div>Performance</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl mb-1">🎯</div>
              <div>Optimizations</div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button onClick={startOnboarding} className="flex-1">
              Start Tutorial
            </Button>
            <Button onClick={onSkip} variant="outline">
              Skip for Now
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentStepData = onboardingSteps[currentStep]
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium">Mobile PWA Tutorial</div>
              <div className="text-sm text-gray-500">
                Step {currentStep + 1} of {onboardingSteps.length}
              </div>
            </div>
            <Badge variant="outline">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step Navigation */}
          <div className="flex space-x-1 mt-4 overflow-x-auto">
            {onboardingSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`flex-shrink-0 w-8 h-8 rounded-full text-xs font-medium transition-all ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : completedSteps.has(index)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {completedSteps.has(index) ? '✓' : index + 1}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {currentStepData.title}
            {currentStepData.gesture && (
              <Badge variant="secondary" className="text-xs">
                {currentStepData.gesture.replace('_', ' ')}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{currentStepData.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demo Element */}
          {currentStepData.demoElement && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-blue-700">
                {currentStepData.instruction}
              </div>
              {currentStepData.demoElement}
              
              {/* Gesture Status */}
              {currentStepData.gesture && (
                <div className="flex items-center justify-center space-x-2">
                  {gestureDetected ? (
                    <Badge className="bg-green-100 text-green-800">
                      ✓ Gesture Detected!
                    </Badge>
                  ) : showHint ? (
                    <Badge className="bg-yellow-100 text-yellow-800 animate-pulse">
                      💡 Try {currentStepData.gesture.replace('_', ' ')}ing the element above
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Waiting for {currentStepData.gesture.replace('_', ' ')}...
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              onClick={() => goToStep(Math.max(0, currentStep - 1))}
              variant="outline"
              size="sm"
              disabled={currentStep === 0}
            >
              ← Previous
            </Button>
            
            <div className="flex space-x-2">
              {currentStepData.gesture && !gestureDetected && (
                <Button onClick={skipStep} variant="outline" size="sm">
                  Skip Gesture
                </Button>
              )}
              
              {(!currentStepData.gesture || gestureDetected || currentStep === onboardingSteps.length - 1) && (
                <Button 
                  onClick={currentStep === onboardingSteps.length - 1 ? onComplete : completeStep}
                  size="sm"
                >
                  {currentStep === onboardingSteps.length - 1 ? 'Finish' : 'Continue'} →
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Exit */}
      <div className="text-center">
        <Button onClick={onSkip} variant="ghost" size="sm" className="text-gray-500">
          Exit Tutorial
        </Button>
      </div>
    </div>
  )
}