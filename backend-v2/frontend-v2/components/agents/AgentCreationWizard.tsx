'use client'

import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Modal } from '@/components/ui/Modal'
import { 
  agentsApi,
  type AgentTemplate,
  type AgentInstanceCreate,
  type AIProvider
} from '@/lib/api/agents'
import { useToast } from '@/hooks/use-toast'

interface AgentCreationWizardProps {
  templates: AgentTemplate[]
  onClose: () => void
  onSuccess: () => void
}

const WIZARD_STEPS = [
  { id: 'type', title: 'Choose Agent Type', description: 'Select what you want your agent to do' },
  { id: 'config', title: 'Configuration', description: 'Customize your agent settings' },
  { id: 'provider', title: 'AI Provider', description: 'Choose your AI provider' },
  { id: 'review', title: 'Review & Create', description: 'Review and create your agent' }
]

export function AgentCreationWizard({ templates, onClose, onSuccess }: AgentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [agentName, setAgentName] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('anthropic')
  const [config, setConfig] = useState<any>({})

  useEffect(() => {
    loadProviders()
  }, [])

  useEffect(() => {
    if (selectedTemplate) {
      setAgentName(`${selectedTemplate.name} - ${new Date().toLocaleDateString()}`)
      setConfig(selectedTemplate.configuration || {})
    }
  }, [selectedTemplate])

  const loadProviders = async () => {
    try {
      const providersData = await agentsApi.getAIProviders()
      setProviders(providersData)
    } catch (error) {
      console.error('Failed to load providers:', error)
      toast({
        title: 'Warning',
        description: 'Failed to load AI providers. Using defaults.',
        variant: 'default'
      })
      // Set default providers if API fails
      setProviders([
        { name: 'anthropic', models: ['claude-3'], capabilities: ['chat'], pricing: {}, is_available: true },
        { name: 'openai', models: ['gpt-4'], capabilities: ['chat'], pricing: {}, is_available: true },
        { name: 'google', models: ['gemini-pro'], capabilities: ['chat'], pricing: {}, is_available: true }
      ])
    }
  }

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = async () => {
    if (!selectedTemplate || !agentName.trim()) return

    try {
      setCreating(true)
      
      // First create the agent template, then create instance
      const agentCreateData = {
        name: selectedTemplate.name,
        agent_type: selectedTemplate.agent_type,
        description: selectedTemplate.description,
        configuration: {
          ...selectedTemplate.configuration,
          ...config,
          ai_provider: selectedProvider
        },
        is_active: false // Created in draft mode
      }

      const agentResponse = await agentsApi.createAgent(agentCreateData)
      
      // Create agent instance
      const instanceCreateData: AgentInstanceCreate = {
        agent_id: agentResponse.agent.id,
        name: agentName,
        configuration: {
          ...config,
          ai_provider: selectedProvider,
          use_ai_personalization: true,
          agent_type: selectedTemplate.agent_type
        },
        auto_start: false
      }

      await agentsApi.createAgentInstance(instanceCreateData)

      toast({
        title: 'Success',
        description: `Agent "${agentName}" created successfully!`,
        variant: 'default'
      })

      onSuccess()
    } catch (error) {
      console.error('Failed to create agent:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create agent'
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const renderStepContent = () => {
    switch (WIZARD_STEPS[currentStep].id) {
      case 'type':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Choose Your Agent Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <Card
                  key={template.agent_type}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedTemplate?.agent_type === template.agent_type
                      ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary">
                          {agentsApi.getAgentTypeDisplay(template.agent_type)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ${template.estimated_cost_per_month}/mo
                        </Badge>
                      </div>
                    </div>
                    {selectedTemplate?.agent_type === template.agent_type && (
                      <Check className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )

      case 'config':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Configure Your Agent</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter a name for your agent"
                />
              </div>

              {selectedTemplate && (
                <div className="space-y-4">
                  <h4 className="font-medium">Agent Settings</h4>
                  
                  {/* Rebooking specific settings */}
                  {selectedTemplate.agent_type === 'retention_specialist' && (
                    <div className="space-y-3">
                      <div>
                        <Label>Rebooking Interval (days)</Label>
                        <Input
                          type="number"
                          value={config.rebooking_intervals?.default || 28}
                          onChange={(e) => setConfig({
                            ...config,
                            rebooking_intervals: {
                              ...config.rebooking_intervals,
                              default: parseInt(e.target.value)
                            }
                          })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={config.message_timing?.avoid_weekends !== false}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            message_timing: {
                              ...config.message_timing,
                              avoid_weekends: checked
                            }
                          })}
                        />
                        <Label>Avoid sending messages on weekends</Label>
                      </div>
                    </div>
                  )}

                  {/* Birthday specific settings */}
                  {selectedTemplate.agent_type === 'marketing_assistant' && (
                    <div className="space-y-3">
                      <div>
                        <Label>Birthday Discount (%)</Label>
                        <Input
                          type="number"
                          value={config.birthday_discount || 20}
                          onChange={(e) => setConfig({
                            ...config,
                            birthday_discount: parseInt(e.target.value)
                          })}
                        />
                      </div>
                      <div>
                        <Label>Discount Validity (days)</Label>
                        <Input
                          type="number"
                          value={config.discount_validity_days || 30}
                          onChange={(e) => setConfig({
                            ...config,
                            discount_validity_days: parseInt(e.target.value)
                          })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Common settings */}
                  <div>
                    <Label>Max Conversations per Run</Label>
                    <Input
                      type="number"
                      value={config.max_conversations_per_run || 50}
                      onChange={(e) => setConfig({
                        ...config,
                        max_conversations_per_run: parseInt(e.target.value)
                      })}
                    />
                  </div>

                  <div>
                    <Label>Supported Channels</Label>
                    <div className="flex space-x-4 mt-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={config.supported_channels?.includes('sms')}
                          onChange={(e) => {
                            const channels = config.supported_channels || []
                            if (e.target.checked) {
                              setConfig({
                                ...config,
                                supported_channels: [...channels.filter((c: string) => c !== 'sms'), 'sms']
                              })
                            } else {
                              setConfig({
                                ...config,
                                supported_channels: channels.filter((c: string) => c !== 'sms')
                              })
                            }
                          }}
                        />
                        <span>SMS</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={config.supported_channels?.includes('email')}
                          onChange={(e) => {
                            const channels = config.supported_channels || []
                            if (e.target.checked) {
                              setConfig({
                                ...config,
                                supported_channels: [...channels.filter((c: string) => c !== 'email'), 'email']
                              })
                            } else {
                              setConfig({
                                ...config,
                                supported_channels: channels.filter((c: string) => c !== 'email')
                              })
                            }
                          }}
                        />
                        <span>Email</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'provider':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Choose AI Provider</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {providers.map((provider) => (
                <Card
                  key={provider.name}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedProvider === provider.name
                      ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:shadow-md'
                  } ${!provider.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => provider.is_available && setSelectedProvider(provider.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        provider.name === 'anthropic' ? 'bg-blue-100' :
                        provider.name === 'openai' ? 'bg-green-100' :
                        provider.name === 'google' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        {provider.name === 'anthropic' ? (
                          <Sparkles className="w-5 h-5 text-blue-600" />
                        ) : provider.name === 'openai' ? (
                          <Bot className="w-5 h-5 text-green-600" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium capitalize">
                          {provider.name === 'anthropic' ? 'Claude (Anthropic)' :
                           provider.name === 'openai' ? 'GPT-4 (OpenAI)' :
                           provider.name === 'google' ? 'Gemini (Google)' :
                           provider.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {provider.capabilities.includes('chat') && 'Chat capabilities'} • {provider.models.length} models
                        </p>
                        {!provider.is_available && (
                          <p className="text-xs text-red-600 mt-1">Currently unavailable</p>
                        )}
                      </div>
                    </div>
                    {selectedProvider === provider.name && (
                      <Check className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Your Agent</h3>
            
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-2">Agent Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{agentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{selectedTemplate?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI Provider:</span>
                    <span className="font-medium capitalize">{selectedProvider}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-2">Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Conversations:</span>
                    <span className="font-medium">{config.max_conversations_per_run || 50}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Channels:</span>
                    <span className="font-medium">
                      {config.supported_channels?.join(', ') || 'SMS, Email'}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Your agent will be created in draft mode. You can review the settings and activate it when ready.
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (WIZARD_STEPS[currentStep].id) {
      case 'type':
        return selectedTemplate !== null
      case 'config':
        return agentName.trim().length > 0
      case 'provider':
        return selectedProvider !== null
      case 'review':
        return true
      default:
        return false
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create AI Agent
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                index <= currentStep
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {step.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className="w-12 h-px bg-gray-200 mx-4" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-96">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center space-x-3">
            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button
                onClick={handleCreate}
                disabled={!canProceed() || creating}
              >
                {creating ? 'Creating...' : 'Create Agent'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}