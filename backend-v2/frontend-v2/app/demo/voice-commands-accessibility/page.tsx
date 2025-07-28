/**
 * Voice Commands Accessibility Demo Page
 * Interactive demonstration of speech recognition and voice navigation
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import VoiceCommandsManager from '@/components/VoiceCommandsManager'
import { useVoiceCommands, useVoiceBookingCommands, useVoiceAccessibility } from '@/hooks/useVoiceCommands'
import { VoiceCommandConfig } from '@/lib/voice-commands-accessibility'

export default function VoiceCommandsAccessibilityDemo() {
  const [demoMode, setDemoMode] = useState<'guided' | 'free' | 'booking'>('guided')
  const [currentStep, setCurrentStep] = useState(0)
  const [completedActions, setCompletedActions] = useState<string[]>([])
  const [demoConfig, setDemoConfig] = useState<Partial<VoiceCommandConfig>>({
    enabled: true,
    audioFeedback: true,
    visualFeedback: true,
    continuous: true,
    confidenceThreshold: 0.7,
    wakeWord: 'hey barber'
  })

  // Guided tutorial steps
  const tutorialSteps = [
    {
      id: 'welcome',
      title: 'Welcome to Voice Commands',
      description: 'Learn how to navigate with your voice',
      instruction: 'Say "help" to hear available commands',
      expectedCommand: 'general:help',
      audioPrompt: 'Welcome to voice commands accessibility. Say "help" to get started.'
    },
    {
      id: 'navigation',
      title: 'Navigation Commands',
      description: 'Use voice to move between steps',
      instruction: 'Say "next step" to continue',
      expectedCommand: 'navigate:next',
      audioPrompt: 'Great! Now try saying "next step" to move forward.'
    },
    {
      id: 'booking',
      title: 'Booking Commands',
      description: 'Book services with voice',
      instruction: 'Say "book a haircut" to select a service',
      expectedCommand: 'booking:select-service',
      audioPrompt: 'Perfect! Now let\'s try booking. Say "book a haircut".'
    },
    {
      id: 'form-input',
      title: 'Form Input',
      description: 'Fill forms using voice',
      instruction: 'Say "my name is [your name]"',
      expectedCommand: 'form:name',
      audioPrompt: 'Excellent! Now try voice form input. Say "my name is" followed by your name.'
    },
    {
      id: 'completion',
      title: 'Tutorial Complete',
      description: 'You\'ve mastered voice commands!',
      instruction: 'Say "start over" to restart or explore freely',
      expectedCommand: 'general:reset',
      audioPrompt: 'Congratulations! You\'ve completed the voice commands tutorial. You can now explore freely or start over.'
    }
  ]

  const { 
    isListening, 
    isSupported, 
    isEnabled, 
    error, 
    currentCommand, 
    lastTranscript,
    startListening,
    speak,
    getCommands
  } = useVoiceCommands({
    config: demoConfig,
    onCommand: (match) => {
      handleVoiceCommand(match.command.action, match.parameters)
    },
    onUnrecognized: (transcript) => {
      console.log('Unrecognized:', transcript)
    }
  })

  const { bookingCommands } = useVoiceBookingCommands()
  
  const { 
    accessibilityMode, 
    enableAccessibilityMode,
    navigationHistory 
  } = useVoiceAccessibility()

  useEffect(() => {
    // Auto-enable accessibility mode for demo
    if (isSupported && !accessibilityMode) {
      enableAccessibilityMode()
    }
  }, [isSupported, accessibilityMode, enableAccessibilityMode])

  const handleVoiceCommand = (action: string, parameters: Record<string, string>) => {
    const currentTutorialStep = tutorialSteps[currentStep]
    
    // Handle tutorial progression
    if (demoMode === 'guided' && currentTutorialStep) {
      if (action === currentTutorialStep.expectedCommand) {
        setCompletedActions(prev => [...prev, action])
        
        if (currentStep < tutorialSteps.length - 1) {
          setTimeout(() => {
            setCurrentStep(prev => prev + 1)
            const nextStep = tutorialSteps[currentStep + 1]
            if (nextStep) {
              speak(nextStep.audioPrompt)
            }
          }, 1500)
        }
      }
    }

    // Handle general commands
    switch (action) {
      case 'navigate:next':
        if (currentStep < tutorialSteps.length - 1) {
          setCurrentStep(prev => prev + 1)
        }
        break
      case 'navigate:previous':
        if (currentStep > 0) {
          setCurrentStep(prev => prev - 1)
        }
        break
      case 'general:reset':
        setCurrentStep(0)
        setCompletedActions([])
        break
      case 'general:help':
        speakHelpText()
        break
    }

    // Log the action
    console.log('Voice command executed:', action, parameters)
  }

  const speakHelpText = () => {
    const commands = getCommands().slice(0, 5)
    const helpText = `Available commands: ${commands.map(cmd => cmd.examples[0]).join(', ')}`
    speak(helpText)
  }

  const startGuidedTour = () => {
    setDemoMode('guided')
    setCurrentStep(0)
    setCompletedActions([])
    
    if (!isListening) {
      startListening()
    }
    
    setTimeout(() => {
      speak(tutorialSteps[0].audioPrompt)
    }, 1000)
  }

  const renderSystemCapabilities = () => {
    const capabilities = [
      { name: 'Speech Recognition', supported: isSupported, icon: '🎤' },
      { name: 'Speech Synthesis', supported: 'speechSynthesis' in window, icon: '🔊' },
      { name: 'Web Audio API', supported: 'AudioContext' in window, icon: '🎵' },
      { name: 'Media Devices', supported: 'mediaDevices' in navigator, icon: '📱' },
      { name: 'Vibration API', supported: 'vibrate' in navigator, icon: '📳' }
    ]

    return (
      <Card>
        <CardHeader>
          <CardTitle>Browser Capabilities</CardTitle>
          <CardDescription>Voice accessibility features available in your browser</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((capability) => (
              <div key={capability.name} className="flex items-center space-x-3">
                <span className="text-2xl">{capability.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{capability.name}</div>
                  <Badge variant={capability.supported ? 'default' : 'secondary'}>
                    {capability.supported ? 'Available' : 'Not Supported'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderGuidedTutorial = () => {
    const currentTutorialStep = tutorialSteps[currentStep]
    const progress = ((currentStep + 1) / tutorialSteps.length) * 100

    return (
      <div className="space-y-6">
        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Guided Tutorial</span>
              <Badge variant="outline">
                Step {currentStep + 1} of {tutorialSteps.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Learn voice commands step by step
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            
            <div className="text-center">
              <div className="text-2xl mb-2">{currentStep === 0 ? '👋' : currentStep === tutorialSteps.length - 1 ? '🎉' : '🎯'}</div>
              <h3 className="text-xl font-semibold mb-2">{currentTutorialStep.title}</h3>
              <p className="text-gray-600 mb-4">{currentTutorialStep.description}</p>
              
              <Alert className="text-left">
                <AlertDescription>
                  <strong>Try this:</strong> {currentTutorialStep.instruction}
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-center space-x-2">
              <Button 
                onClick={startGuidedTour}
                variant="outline"
                disabled={isListening}
              >
                🔄 Restart Tutorial
              </Button>
              
              <Button
                onClick={() => setDemoMode('free')}
                variant="ghost"
              >
                Skip to Free Mode
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        {(currentCommand || lastTranscript || error) && (
          <Card>
            <CardHeader>
              <CardTitle>Voice Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {currentCommand && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                  <div className="font-medium text-green-800">✅ Command Recognized</div>
                  <div className="text-green-700">{currentCommand}</div>
                </div>
              )}
              
              {lastTranscript && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                  <div className="font-medium text-blue-800">🎤 You said</div>
                  <div className="text-blue-700">"{lastTranscript}"</div>
                </div>
              )}
              
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderBookingDemo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Voice Booking Demo</CardTitle>
        <CardDescription>
          Complete a booking using only voice commands
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking Progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="font-medium">Service Selection</div>
            <div className="p-3 border rounded-lg">
              {bookingCommands.serviceSelected ? (
                <div className="text-green-600">✅ {bookingCommands.serviceSelected}</div>
              ) : (
                <div className="text-gray-500">Say: "book a haircut"</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Barber Selection</div>
            <div className="p-3 border rounded-lg">
              {bookingCommands.barberSelected ? (
                <div className="text-green-600">✅ {bookingCommands.barberSelected}</div>
              ) : (
                <div className="text-gray-500">Say: "choose John" or "any barber"</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Time Selection</div>
            <div className="p-3 border rounded-lg">
              {bookingCommands.timeSelected ? (
                <div className="text-green-600">✅ {bookingCommands.timeSelected}</div>
              ) : (
                <div className="text-gray-500">Say: "book for 2 PM"</div>
              )}
            </div>
          </div>
        </div>

        {/* Form Data */}
        {Object.keys(bookingCommands.formData).length > 0 && (
          <div className="space-y-2">
            <div className="font-medium">Customer Information</div>
            <div className="p-3 border rounded-lg space-y-1">
              {Object.entries(bookingCommands.formData).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key}:</span>
                  <span className="text-green-600">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <Alert>
          <AlertDescription>
            <strong>Voice Commands to Try:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>"book a haircut" or "I want a beard trim"</li>
              <li>"choose John" or "any barber"</li>
              <li>"book for 2 PM" or "schedule at 10:30"</li>
              <li>"my name is John Smith"</li>
              <li>"my email is john@example.com"</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )

  const renderAnalytics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Session Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Commands Completed</span>
              <Badge variant="default">{completedActions.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Tutorial Progress</span>
              <Badge variant="outline">
                {currentStep + 1}/{tutorialSteps.length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Mode</span>
              <Badge variant="secondary">{demoMode}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Accessibility</span>
              <Badge variant={accessibilityMode ? 'default' : 'outline'}>
                {accessibilityMode ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Navigation History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {navigationHistory.slice(-5).map((action, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                {action}
              </div>
            ))}
            {navigationHistory.length === 0 && (
              <div className="text-gray-500 text-sm">No navigation yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completed Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {completedActions.map((action, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-sm">{action}</span>
              </div>
            ))}
            {completedActions.length === 0 && (
              <div className="text-gray-500 text-sm">No actions completed</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (!isSupported) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Voice Commands Accessibility</h1>
          <p className="text-xl text-gray-600">
            Speech recognition and voice navigation for enhanced accessibility
          </p>
        </div>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription>
            <strong>Voice commands are not supported in this browser.</strong> 
            <br />
            Please use Chrome, Safari, or Firefox with microphone permissions to experience voice accessibility features.
          </AlertDescription>
        </Alert>

        {renderSystemCapabilities()}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Voice Commands Accessibility</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Experience hands-free navigation and booking with speech recognition technology designed for accessibility and inclusive user experiences
        </p>
      </div>

      {/* System Capabilities */}
      {renderSystemCapabilities()}

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Choose how you'd like to explore voice commands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={startGuidedTour}
              className="h-20 flex flex-col items-center space-y-2"
              variant={demoMode === 'guided' ? 'default' : 'outline'}
            >
              <span className="text-2xl">🎓</span>
              <span>Guided Tutorial</span>
            </Button>

            <Button
              onClick={() => setDemoMode('booking')}
              className="h-20 flex flex-col items-center space-y-2"
              variant={demoMode === 'booking' ? 'default' : 'outline'}
            >
              <span className="text-2xl">📅</span>
              <span>Booking Demo</span>
            </Button>

            <Button
              onClick={() => setDemoMode('free')}
              className="h-20 flex flex-col items-center space-y-2"
              variant={demoMode === 'free' ? 'default' : 'outline'}
            >
              <span className="text-2xl">🎤</span>
              <span>Free Exploration</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo Tabs */}
      <Tabs defaultValue="demo" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demo">Demo</TabsTrigger>
          <TabsTrigger value="manager">Settings</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          {demoMode === 'guided' && renderGuidedTutorial()}
          {demoMode === 'booking' && renderBookingDemo()}
          {demoMode === 'free' && (
            <Alert>
              <AlertDescription>
                <strong>Free Exploration Mode:</strong> Try any voice command! 
                Say "help" to hear available commands, or explore the Settings tab to configure voice recognition.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="manager" className="space-y-6">
          <VoiceCommandsManager
            defaultConfig={demoConfig}
            onConfigChange={(config) => setDemoConfig(config)}
            showAnalytics={true}
          />
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>React Hook Integration</CardTitle>
                <CardDescription>Easy integration with existing React applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre>{`import { useVoiceCommands } from '@/hooks/useVoiceCommands'

function AccessibleBookingForm() {
  const {
    isListening,
    startListening,
    speak
  } = useVoiceCommands({
    config: {
      audioFeedback: true,
      accessibility: true
    },
    onCommand: (match) => {
      // Handle voice commands
      handleVoiceInput(match)
    }
  })
  
  return (
    <form>
      <button onClick={startListening}>
        {isListening ? '🛑 Stop' : '🎤 Voice Input'}
      </button>
    </form>
  )
}`}</pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accessibility Features</CardTitle>
                <CardDescription>WCAG 2.1 AA compliant voice interactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="font-medium">✅ Screen Reader Compatible</div>
                  <div className="text-sm text-gray-600">Works with NVDA, JAWS, VoiceOver</div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium">✅ Keyboard Navigation</div>
                  <div className="text-sm text-gray-600">Full keyboard accessibility maintained</div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium">✅ Visual Feedback</div>
                  <div className="text-sm text-gray-600">Clear visual indicators for all states</div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium">✅ Error Recovery</div>
                  <div className="text-sm text-gray-600">Graceful handling of recognition errors</div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium">✅ Configurable Sensitivity</div>
                  <div className="text-sm text-gray-600">Adjustable confidence thresholds</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {renderAnalytics()}
        </TabsContent>
      </Tabs>

      {/* Quick Tips */}
      <Alert>
        <AlertDescription>
          💡 <strong>Accessibility Tip:</strong> Voice commands work alongside traditional navigation methods. 
          Users can seamlessly switch between voice, keyboard, and mouse interactions based on their needs and preferences.
        </AlertDescription>
      </Alert>
    </div>
  )
}