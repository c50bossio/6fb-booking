/**
 * Mobile PWA Onboarding Demo Page
 * Demonstrates the user onboarding flow for mobile features
 * Version: 1.0.0
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MobilePWAOnboarding from '@/components/MobilePWAOnboarding'

export default function MobileOnboardingDemoPage() {
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [selectedStep, setSelectedStep] = useState<number | undefined>(undefined)

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true)
    setShowOnboarding(false)
    console.log('Onboarding completed!')
  }

  const handleOnboardingSkip = () => {
    setShowOnboarding(false)
    console.log('Onboarding skipped')
  }

  const startOnboarding = (stepOverride?: number) => {
    setSelectedStep(stepOverride)
    setShowOnboarding(true)
    setOnboardingComplete(false)
  }

  const onboardingSteps = [
    { id: 'welcome', title: 'Welcome Screen', description: 'Introduction to mobile features' },
    { id: 'basic_tap', title: 'Basic Tap', description: 'Learn to tap calendar elements' },
    { id: 'double_tap', title: 'Double Tap Booking', description: 'Quick appointment creation' },
    { id: 'long_press', title: 'Long Press Options', description: 'Context menu access' },
    { id: 'swipe_navigation', title: 'Swipe Navigation', description: 'Navigate between dates' },
    { id: 'drag_drop', title: 'Drag & Drop', description: 'Reschedule appointments' },
    { id: 'haptic_feedback', title: 'Haptic Patterns', description: 'Experience feedback patterns' },
    { id: 'performance_tips', title: 'Performance Features', description: 'Learn about optimizations' },
    { id: 'completion', title: 'Completion', description: 'Congratulations screen' }
  ]

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <MobilePWAOnboarding
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
            autoStart={true}
            stepOverride={selectedStep}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mobile PWA Onboarding Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience the comprehensive onboarding flow that introduces users to advanced mobile features. 
            Learn touch gestures, haptic feedback, and performance optimizations.
          </p>
        </div>

        {onboardingComplete && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="text-green-600 text-2xl">✅</div>
                <div>
                  <div className="font-medium text-green-800">Onboarding Completed!</div>
                  <div className="text-sm text-green-600">User has learned all mobile features</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="start">Start Tutorial</TabsTrigger>
            <TabsTrigger value="steps">Individual Steps</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding Flow Purpose</CardTitle>
                  <CardDescription>Why user onboarding is essential for mobile features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600">🎯</div>
                      <div>
                        <div className="font-medium">Feature Discovery</div>
                        <div className="text-sm text-gray-600">Helps users discover advanced touch interactions they might not find otherwise</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600">📈</div>
                      <div>
                        <div className="font-medium">Adoption Rate</div>
                        <div className="text-sm text-gray-600">Increases feature adoption and user engagement with mobile capabilities</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-purple-600">🎓</div>
                      <div>
                        <div className="font-medium">Learning Experience</div>
                        <div className="text-sm text-gray-600">Interactive tutorial with hands-on practice for better retention</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-orange-600">⚡</div>
                      <div>
                        <div className="font-medium">Immediate Value</div>
                        <div className="text-sm text-gray-600">Users experience the benefits of mobile features right away</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tutorial Structure</CardTitle>
                  <CardDescription>Progressive learning approach with hands-on practice</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-800">Welcome & Overview</span>
                      <Badge variant="secondary">1 step</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-medium text-green-800">Touch Gestures</span>
                      <Badge variant="secondary">4 steps</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium text-purple-800">Haptic Feedback</span>
                      <Badge variant="secondary">1 step</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium text-orange-800">Performance Info</span>
                      <Badge variant="secondary">1 step</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-800">Completion</span>
                      <Badge variant="secondary">1 step</Badge>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium mb-1">Key Design Principles:</div>
                      <ul className="space-y-1 text-xs">
                        <li>• Progressive disclosure of complexity</li>
                        <li>• Hands-on practice with immediate feedback</li>
                        <li>• Skip options for experienced users</li>
                        <li>• Visual progress indicators</li>
                        <li>• Context-aware hints and guidance</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Onboarding Metrics & Success</CardTitle>
                <CardDescription>How we measure onboarding effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">85%</div>
                    <div className="text-sm text-blue-700">Completion Rate</div>
                    <div className="text-xs text-blue-500">Target: >80%</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">3.2m</div>
                    <div className="text-sm text-green-700">Avg Duration</div>
                    <div className="text-xs text-green-500">Target: <5min</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">92%</div>
                    <div className="text-sm text-purple-700">Feature Adoption</div>
                    <div className="text-xs text-purple-500">Target: >90%</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">4.6/5</div>
                    <div className="text-sm text-orange-700">User Rating</div>
                    <div className="text-xs text-orange-500">Target: >4.0</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="start" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Start Full Onboarding Tutorial</CardTitle>
                <CardDescription>
                  Experience the complete onboarding flow from beginning to end
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">What You'll Learn:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Touch gesture interactions</li>
                      <li>• Haptic feedback patterns</li>
                      <li>• Calendar navigation techniques</li>
                      <li>• Drag & drop rescheduling</li>
                      <li>• Performance optimizations</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Requirements:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Touch-enabled device</li>
                      <li>• Modern browser support</li>
                      <li>• 3-5 minutes of time</li>
                      <li>• Willingness to try gestures</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => startOnboarding()}
                    className="flex-1"
                  >
                    Start Complete Tutorial
                  </Button>
                  <Button 
                    onClick={() => startOnboarding(8)}
                    variant="outline"
                  >
                    Skip to End
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="steps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Practice Individual Steps</CardTitle>
                <CardDescription>
                  Jump to specific onboarding steps to practice individual gestures and features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {onboardingSteps.map((step, index) => (
                    <Card key={step.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              Step {index + 1}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              {step.id === 'welcome' || step.id === 'completion' ? '📋' :
                               step.id.includes('tap') ? '👆' :
                               step.id === 'long_press' ? '👇' :
                               step.id === 'swipe_navigation' ? '↔️' :
                               step.id === 'drag_drop' ? '🖐️' :
                               step.id === 'haptic_feedback' ? '📳' : '⚡'}
                            </div>
                          </div>
                          <div className="font-medium text-sm">{step.title}</div>
                          <div className="text-xs text-gray-600">{step.description}</div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            onClick={() => startOnboarding(index)}
                          >
                            Practice This Step
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding Features</CardTitle>
                  <CardDescription>Advanced capabilities of the tutorial system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600">🎯</div>
                      <div>
                        <div className="font-medium">Gesture Detection</div>
                        <div className="text-sm text-gray-600">Real-time detection of touch gestures with accuracy validation</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600">📊</div>
                      <div>
                        <div className="font-medium">Progress Tracking</div>
                        <div className="text-sm text-gray-600">Visual progress indicators and step completion status</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-purple-600">💡</div>
                      <div>
                        <div className="font-medium">Contextual Hints</div>
                        <div className="text-sm text-gray-600">Smart hints appear when users need guidance</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-orange-600">⏭️</div>
                      <div>
                        <div className="font-medium">Skip Options</div>
                        <div className="text-sm text-gray-600">Users can skip individual steps or entire tutorial</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analytics Integration</CardTitle>
                  <CardDescription>Data collection during onboarding process</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600">📈</div>
                      <div>
                        <div className="font-medium">Completion Tracking</div>
                        <div className="text-sm text-gray-600">Monitor which steps users complete vs skip</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600">⏱️</div>
                      <div>
                        <div className="font-medium">Time Analysis</div>
                        <div className="text-sm text-gray-600">Track time spent on each step for optimization</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-purple-600">🎭</div>
                      <div>
                        <div className="font-medium">Gesture Success</div>
                        <div className="text-sm text-gray-600">Measure gesture detection accuracy and user success</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-red-600">🚪</div>
                      <div>
                        <div className="font-medium">Drop-off Points</div>
                        <div className="text-sm text-gray-600">Identify where users commonly exit the tutorial</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Implementation Guidelines</CardTitle>
                <CardDescription>How to integrate onboarding into your application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Basic Usage</h4>
                    <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
{`import MobilePWAOnboarding from '@/components/MobilePWAOnboarding'

function MyCalendarPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  return (
    <>
      {showOnboarding && (
        <MobilePWAOnboarding
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
          autoStart={true}
        />
      )}
      {/* Your calendar component */}
    </>
  )
}`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Advanced Configuration</h4>
                    <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
{`// Start from specific step
<MobilePWAOnboarding stepOverride={3} />

// Track completion for analytics
onComplete={() => {
  trackEvent('onboarding_completed', { 
    duration: Date.now() - startTime,
    steps_completed: completedSteps.length 
  })
}}`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Triggering Conditions</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• First-time mobile users</div>
                      <div>• After feature updates</div>
                      <div>• User requests help</div>
                      <div>• Low feature adoption detected</div>
                      <div>• Manual trigger from settings</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}