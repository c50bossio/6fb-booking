'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { getProfile } from '@/lib/api'

// AI Agent Icons
const DollarSignIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

const BrainIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const MicIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
)

// AI Agent Configuration
const AI_AGENTS = [
  {
    id: 'financial',
    name: 'Marcus',
    title: 'Financial Coach',
    description: 'Revenue optimization and pricing strategies',
    icon: DollarSignIcon,
    color: 'bg-green-500',
    personality: 'analytical and data-driven',
    greeting: "Hi! I'm Marcus, your Financial Coach. I help optimize your revenue and pricing strategies based on your actual business data. What would you like to explore today?"
  },
  {
    id: 'growth',
    name: 'Sofia',
    title: 'Growth Strategist', 
    description: 'Client acquisition and retention insights',
    icon: TrendingUpIcon,
    color: 'bg-blue-500',
    personality: 'motivational and strategic',
    greeting: "Hello! I'm Sofia, your Growth Strategist. I analyze your client patterns and help build lasting relationships that scale your business. How can I support your growth today?"
  },
  {
    id: 'operations',
    name: 'Alex',
    title: 'Operations Optimizer',
    description: 'Schedule efficiency and workflow optimization', 
    icon: UsersIcon,
    color: 'bg-purple-500',
    personality: 'systematic and efficient',
    greeting: "Hey! I'm Alex, your Operations Optimizer. I help streamline your workflow and maximize efficiency based on your appointment patterns. What operational challenge can we tackle?"
  },
  {
    id: 'brand',
    name: 'Isabella',
    title: 'Brand Developer',
    description: 'Service mix and customer experience enhancement',
    icon: BrainIcon,
    color: 'bg-orange-500',
    personality: 'creative and empathetic',
    greeting: "Hi there! I'm Isabella, your Brand Developer. I help create exceptional customer experiences and develop your unique brand identity. What aspect of your brand shall we enhance?"
  }
]

interface Message {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  agentId?: string
  suggestions?: string[]
  actions?: Array<{
    type: string
    title: string
    description: string
  }>
  metrics?: Record<string, any>
}

interface BusinessMetrics {
  period_days: number
  total_revenue: number
  total_appointments: number
  unique_clients: number
  average_revenue_per_appointment: number
  average_revenue_per_client: number
}

export default function UnifiedAIDashboard() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('growth')
  const [isLoading, setIsLoading] = useState(false)
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Initialize conversation with selected agent greeting
    if (user && messages.length === 0) {
      const agent = AI_AGENTS.find(a => a.id === selectedAgent)
      if (agent) {
        const welcomeMessage: Message = {
          id: `msg_${Date.now()}`,
          type: 'agent',
          content: agent.greeting,
          timestamp: new Date(),
          agentId: selectedAgent,
          suggestions: [
            "Show me my business performance",
            "What are my growth opportunities?", 
            "Help me optimize my pricing",
            "Analyze my client retention"
          ]
        }
        setMessages([welcomeMessage])
      }
      
      // Load business metrics
      loadBusinessMetrics()
    }
  }, [user, selectedAgent])

  const loadBusinessMetrics = async () => {
    try {
      // This would call your AI orchestrator service
      const response = await fetch('/api/v2/ai/dashboard/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const metrics = await response.json()
        setBusinessMetrics(metrics)
      }
    } catch (error) {
      console.error('Error loading business metrics:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Call AI orchestrator service
      const response = await fetch('/api/v2/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: userMessage.content,
          preferred_agent: selectedAgent,
          context: {
            business_metrics: businessMetrics
          }
        })
      })

      if (response.ok) {
        const aiResponse = await response.json()
        
        const agentMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          type: 'agent',
          content: aiResponse.content,
          timestamp: new Date(),
          agentId: aiResponse.agent_id,
          suggestions: aiResponse.suggestions || [],
          actions: aiResponse.actions || [],
          metrics: aiResponse.metrics || {}
        }

        setMessages(prev => [...prev, agentMessage])
      } else {
        throw new Error('Failed to get AI response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        type: 'system',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    inputRef.current?.focus()
  }

  const handleActionClick = (action: any) => {
    // Handle action execution
    console.log('Action clicked:', action)
    // This would trigger specific workflows based on action type
  }

  const handleAgentSwitch = (agentId: string) => {
    setSelectedAgent(agentId)
    
    const agent = AI_AGENTS.find(a => a.id === agentId)
    if (agent) {
      const switchMessage: Message = {
        id: `msg_${Date.now()}`,
        type: 'system',
        content: `Switched to ${agent.name} (${agent.title})`,
        timestamp: new Date()
      }
      
      const greetingMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        type: 'agent',
        content: agent.greeting,
        timestamp: new Date(),
        agentId: agentId,
        suggestions: [
          "Show me relevant insights",
          "What should I focus on?",
          "Help me improve this area"
        ]
      }
      
      setMessages(prev => [...prev, switchMessage, greetingMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const currentAgent = AI_AGENTS.find(a => a.id === selectedAgent)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex h-screen">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-12 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    AI Business Intelligence
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your unified AI-powered business assistant
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="ghost"
                  size="sm"
                >
                  ← Back to Dashboard
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-4">
                  {message.type === 'agent' && (
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={`${currentAgent?.color || 'bg-gray-500'} text-white text-sm font-medium`}>
                        {currentAgent?.name?.[0] || 'AI'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {message.type === 'user' && (
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-600 text-white text-sm font-medium">
                        {user.first_name?.[0] || user.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {message.type === 'system' && (
                    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}

                  <div className="flex-1 space-y-3">
                    {/* Message Header */}
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {message.type === 'agent' && currentAgent ? currentAgent.name :
                         message.type === 'user' ? (user.first_name || 'You') :
                         'System'}
                      </span>
                      {message.type === 'agent' && currentAgent && (
                        <Badge variant="secondary" className="text-xs">
                          {currentAgent.title}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Message Content */}
                    <div className={`p-4 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white ml-12' 
                        : message.type === 'system'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Metrics Display */}
                      {message.metrics && Object.keys(message.metrics).length > 0 && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Business Metrics
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {message.metrics.total_revenue && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                                <span className="ml-2 font-medium text-green-600">
                                  {formatCurrency(message.metrics.total_revenue)}
                                </span>
                              </div>
                            )}
                            {message.metrics.total_appointments && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Appointments:</span>
                                <span className="ml-2 font-medium">{message.metrics.total_appointments}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="space-y-2">
                        {message.actions.map((action, index) => (
                          <Card key={index} className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-white">{action.title}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleActionClick(action)}
                              >
                                Execute
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start space-x-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`${currentAgent?.color || 'bg-gray-500'} text-white text-sm font-medium`}>
                      {currentAgent?.name?.[0] || 'AI'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
                        <span className="text-gray-600 dark:text-gray-400 text-sm ml-2">
                          {currentAgent?.name} is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Ask ${currentAgent?.name || 'AI'} anything about your business...`}
                    className="resize-none"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-4 py-2"
                >
                  <SendIcon />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsListening(!isListening)}
                  className={isListening ? 'bg-red-100 text-red-600' : ''}
                >
                  <MicIcon />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Business Context Sidebar */}
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Agent Selection */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">AI Coaches</h3>
            <div className="space-y-2">
              {AI_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAgentSwitch(agent.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedAgent === agent.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${agent.color} rounded-lg flex items-center justify-center text-white`}>
                      <agent.icon />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{agent.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{agent.title}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Metrics */}
          {businessMetrics && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Business Overview</h3>
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-400">Revenue (30d)</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-300">
                    {formatCurrency(businessMetrics.total_revenue)}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-400">Appointments</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
                      {businessMetrics.total_appointments}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                    <p className="text-xs text-purple-800 dark:text-purple-400">Clients</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-300">
                      {businessMetrics.unique_clients}
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-400">Avg Revenue/Appointment</p>
                  <p className="text-lg font-bold text-orange-900 dark:text-orange-300">
                    {formatCurrency(businessMetrics.average_revenue_per_appointment)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => handleSuggestionClick("Analyze my business performance trends")}
              >
                📊 Performance Analysis
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => handleSuggestionClick("Recommend strategies to increase revenue")}
              >
                💰 Revenue Strategies
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => handleSuggestionClick("Help me improve client retention")}
              >
                🤝 Client Retention
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => handleSuggestionClick("Optimize my appointment scheduling")}
              >
                📅 Schedule Optimization
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}