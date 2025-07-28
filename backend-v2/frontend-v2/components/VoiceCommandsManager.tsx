/**
 * Voice Commands Manager Component
 * UI for managing voice command accessibility settings
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Switch } from './ui/switch'
import { Slider } from './ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Separator } from './ui/separator'
import { useVoiceCommands, useVoiceAccessibility, useVoiceCommandHelp, useVoiceCommandAnalytics } from '@/hooks/useVoiceCommands'
import { VoiceCommand, VoiceCommandConfig } from '@/lib/voice-commands-accessibility'

interface VoiceCommandsManagerProps {
  className?: string
  defaultConfig?: Partial<VoiceCommandConfig>
  onConfigChange?: (config: VoiceCommandConfig) => void
  showAnalytics?: boolean
}

export default function VoiceCommandsManager({
  className = '',
  defaultConfig,
  onConfigChange,
  showAnalytics = true
}: VoiceCommandsManagerProps) {
  const {
    isListening,
    isSupported,
    isEnabled,
    hasPermission,
    currentCommand,
    error,
    confidence,
    lastTranscript,
    startListening,
    stopListening,
    toggle,
    speak,
    getCommands,
    updateConfig,
    system
  } = useVoiceCommands({
    config: defaultConfig,
    autoInit: true
  })

  const { 
    accessibilityMode, 
    enableAccessibilityMode, 
    disableAccessibilityMode,
    navigationHistory
  } = useVoiceAccessibility()

  const {
    categories,
    currentCategory,
    setCurrentCategory,
    searchQuery,
    setSearchQuery,
    filteredCommands,
    speakCommandHelp,
    speakCategoryHelp
  } = useVoiceCommandHelp()

  const {
    analytics,
    getSuccessRate,
    getSessionDuration,
    resetAnalytics
  } = useVoiceCommandAnalytics()

  const [config, setConfig] = useState<Partial<VoiceCommandConfig>>({
    enabled: true,
    language: 'en-US',
    continuous: true,
    interimResults: true,
    confidenceThreshold: 0.7,
    audioFeedback: true,
    visualFeedback: true,
    wakeWord: 'hey barber',
    feedbackVolume: 0.8,
    ...defaultConfig
  })

  const [customCommand, setCustomCommand] = useState<Partial<VoiceCommand>>({
    id: '',
    patterns: [''],
    action: '',
    description: '',
    examples: [''],
    category: 'general'
  })

  const [testPhrase, setTestPhrase] = useState('')

  useEffect(() => {
    if (onConfigChange && system) {
      onConfigChange(system.getStatus() as any)
    }
  }, [config, onConfigChange, system])

  const handleConfigUpdate = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    updateConfig(newConfig)
  }

  const handleTestVoice = () => {
    if (testPhrase.trim()) {
      speak(testPhrase)
    }
  }

  const handleAddCustomCommand = () => {
    if (customCommand.id && customCommand.patterns?.[0] && customCommand.action) {
      const command: VoiceCommand = {
        id: customCommand.id,
        patterns: customCommand.patterns.filter(p => p.trim()),
        action: customCommand.action,
        parameters: [],
        description: customCommand.description || 'Custom command',
        examples: customCommand.examples?.filter(e => e.trim()) || [customCommand.patterns[0]],
        category: customCommand.category as any
      }

      system?.addCommand(command)
      
      // Reset form
      setCustomCommand({
        id: '',
        patterns: [''],
        action: '',
        description: '',
        examples: [''],
        category: 'general'
      })
    }
  }

  const renderSystemStatus = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>System Status</span>
          {isListening && (
            <Badge variant="default" className="animate-pulse">
              🎤 Listening
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Voice commands accessibility system status and controls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Browser Support</div>
            <Badge variant={isSupported ? 'default' : 'destructive'}>
              {isSupported ? 'Supported' : 'Not Available'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm font-medium">Microphone</div>
            <Badge variant={hasPermission ? 'default' : 'secondary'}>
              {hasPermission ? 'Permitted' : 'No Permission'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm font-medium">Voice System</div>
            <Badge variant={isEnabled ? 'default' : 'secondary'}>
              {isEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm font-medium">Accessibility Mode</div>
            <Badge variant={accessibilityMode ? 'default' : 'outline'}>
              {accessibilityMode ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>

        {/* Current Activity */}
        {(currentCommand || lastTranscript || error) && (
          <div className="space-y-2">
            {currentCommand && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-800">Current Command</div>
                <div className="text-blue-700">{currentCommand}</div>
              </div>
            )}
            
            {lastTranscript && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium text-gray-800">Last Transcript</div>
                <div className="text-gray-700">{lastTranscript}</div>
                {confidence && (
                  <div className="text-xs text-gray-600 mt-1">
                    Confidence: {Math.round(confidence * 100)}%
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Main Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={toggle}
            disabled={!isSupported}
            variant={isListening ? "destructive" : "default"}
            className="flex items-center space-x-2"
          >
            <span>{isListening ? '🛑' : '🎤'}</span>
            <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
          </Button>
          
          <Button
            onClick={accessibilityMode ? disableAccessibilityMode : enableAccessibilityMode}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>♿</span>
            <span>{accessibilityMode ? 'Disable' : 'Enable'} Accessibility Mode</span>
          </Button>
          
          <Button
            onClick={() => speakCategoryHelp('navigation')}
            variant="ghost"
            disabled={!isSupported}
          >
            🔊 Help
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderConfiguration = () => (
    <Card>
      <CardHeader>
        <CardTitle>Voice Settings</CardTitle>
        <CardDescription>
          Configure voice recognition and feedback settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Audio Feedback</div>
              <div className="text-sm text-gray-600">Spoken responses to commands</div>
            </div>
            <Switch
              checked={config.audioFeedback}
              onCheckedChange={(checked) => handleConfigUpdate('audioFeedback', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Visual Feedback</div>
              <div className="text-sm text-gray-600">Visual indicators for recognition</div>
            </div>
            <Switch
              checked={config.visualFeedback}
              onCheckedChange={(checked) => handleConfigUpdate('visualFeedback', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Continuous Listening</div>
              <div className="text-sm text-gray-600">Always listen for commands</div>
            </div>
            <Switch
              checked={config.continuous}
              onCheckedChange={(checked) => handleConfigUpdate('continuous', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Advanced Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={config.language}
              onValueChange={(value) => handleConfigUpdate('language', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="en-GB">English (UK)</SelectItem>
                <SelectItem value="es-ES">Spanish</SelectItem>
                <SelectItem value="fr-FR">French</SelectItem>
                <SelectItem value="de-DE">German</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Wake Word</Label>
            <Input
              value={config.wakeWord || ''}
              onChange={(e) => handleConfigUpdate('wakeWord', e.target.value || null)}
              placeholder="Enter wake word (optional)"
            />
            <div className="text-xs text-gray-600">
              Leave empty to disable wake word requirement
            </div>
          </div>

          <div className="space-y-2">
            <Label>Confidence Threshold: {Math.round((config.confidenceThreshold || 0.7) * 100)}%</Label>
            <Slider
              value={[(config.confidenceThreshold || 0.7) * 100]}
              onValueChange={([value]) => handleConfigUpdate('confidenceThreshold', value / 100)}
              min={50}
              max={95}
              step={5}
              className="w-full"
            />
            <div className="text-xs text-gray-600">
              Higher values require clearer speech
            </div>
          </div>

          <div className="space-y-2">
            <Label>Voice Volume: {Math.round((config.feedbackVolume || 0.8) * 100)}%</Label>
            <Slider
              value={[(config.feedbackVolume || 0.8) * 100]}
              onValueChange={([value]) => handleConfigUpdate('feedbackVolume', value / 100)}
              min={0}
              max={100}
              step={10}
              className="w-full"
            />
          </div>
        </div>

        <Separator />

        {/* Voice Test */}
        <div className="space-y-2">
          <Label>Test Voice Output</Label>
          <div className="flex space-x-2">
            <Input
              value={testPhrase}
              onChange={(e) => setTestPhrase(e.target.value)}
              placeholder="Enter text to speak"
            />
            <Button onClick={handleTestVoice} disabled={!testPhrase.trim()}>
              🔊 Test
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderCommands = () => (
    <Card>
      <CardHeader>
        <CardTitle>Voice Commands</CardTitle>
        <CardDescription>
          Available voice commands and patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Command Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={currentCategory} onValueChange={setCurrentCategory}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-48"
          />
        </div>

        {/* Commands List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredCommands().map((command) => (
            <div key={command.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{command.description}</div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {command.category}
                  </Badge>
                  {command.accessibility && (
                    <Badge variant="default" className="text-xs">
                      ♿ Accessible
                    </Badge>
                  )}
                  <Button
                    onClick={() => speakCommandHelp(command)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                  >
                    🔊
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="text-gray-600">
                  <span className="font-medium">Examples:</span> {command.examples.join(', ')}
                </div>
                <div className="text-gray-500">
                  <span className="font-medium">Action:</span> {command.action}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCommands().length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No commands found matching your criteria
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderCustomCommands = () => (
    <Card>
      <CardHeader>
        <CardTitle>Add Custom Command</CardTitle>
        <CardDescription>
          Create custom voice commands for your workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Command ID</Label>
            <Input
              value={customCommand.id}
              onChange={(e) => setCustomCommand(prev => ({ ...prev, id: e.target.value }))}
              placeholder="unique-command-id"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={customCommand.category}
              onValueChange={(value) => setCustomCommand(prev => ({ ...prev, category: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="navigation">Navigation</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Voice Patterns (one per line)</Label>
          <Textarea
            value={customCommand.patterns?.join('\n')}
            onChange={(e) => setCustomCommand(prev => ({ 
              ...prev, 
              patterns: e.target.value.split('\n').filter(p => p.trim()) 
            }))}
            placeholder="open calendar&#10;show calendar&#10;view schedule"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Action</Label>
          <Input
            value={customCommand.action}
            onChange={(e) => setCustomCommand(prev => ({ ...prev, action: e.target.value }))}
            placeholder="custom:open-calendar"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={customCommand.description}
            onChange={(e) => setCustomCommand(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Opens the calendar view"
          />
        </div>

        <Button 
          onClick={handleAddCustomCommand}
          disabled={!customCommand.id || !customCommand.patterns?.[0] || !customCommand.action}
          className="w-full"
        >
          Add Custom Command
        </Button>
      </CardContent>
    </Card>
  )

  const renderAnalytics = () => {
    if (!showAnalytics) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Usage Analytics</span>
            <Button onClick={resetAnalytics} variant="outline" size="sm">
              Reset
            </Button>
          </CardTitle>
          <CardDescription>
            Voice command usage statistics and performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.totalCommands}</div>
              <div className="text-sm text-gray-600">Total Commands</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getSuccessRate().toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(analytics.averageConfidence * 100)}%</div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{getSessionDuration()}</div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
          </div>

          {/* Navigation History */}
          {navigationHistory.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium">Recent Navigation</div>
              <div className="flex flex-wrap gap-1">
                {navigationHistory.slice(-10).map((action, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Performance Indicators */}
          <div className="space-y-2">
            <div className="font-medium">Performance</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Successful Commands</span>
                <span className="text-green-600">{analytics.successfulCommands}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed Commands</span>
                <span className="text-red-600">{analytics.failedCommands}</span>
              </div>
              <div className="flex justify-between">
                <span>Session Duration</span>
                <span>{getSessionDuration()} minutes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <div className={`max-w-2xl mx-auto ${className}`}>
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription>
            Voice commands are not supported in this browser. Please use Chrome, Safari, or Firefox with microphone permissions.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* System Status */}
      {renderSystemStatus()}

      {/* Main Interface */}
      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration">Settings</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          {renderConfiguration()}
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
          {renderCommands()}
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          {renderCustomCommands()}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {renderAnalytics()}
        </TabsContent>
      </Tabs>
    </div>
  )
}