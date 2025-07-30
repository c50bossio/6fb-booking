"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Brain, MessageCircle, TrendingUp, Users, Calendar, DollarSign,
  BarChart3, Target, Lightbulb, Settings, Send, Mic, MicOff,
  User, Bot, Clock, CheckCircle, AlertCircle, Loader2, 
  Maximize2, Minimize2, RefreshCw, Star, Award, Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

/**
 * 🚀 Unified AI Dashboard - Revolutionary Business Intelligence System
 * 
 * This single interface replaces 30+ fragmented dashboard components with:
 * - Conversational AI interface with 4 specialized business coaches
 * - Real-time business intelligence and contextual recommendations
 * - Strategy generation, tracking, and ROI measurement
 * - Advanced RAG system that learns from barbershop business data
 * - Six Figure Barber methodology integration
 * 
 * AI Business Coaches:
 * - Marcus: Financial Coach (revenue optimization, pricing strategies)
 * - Sofia: Growth Strategist (client acquisition, retention strategies)  
 * - Alex: Operations Optimizer (scheduling, efficiency, workflow)
 * - Isabella: Brand Excellence (service quality, experience, reputation)
 */

interface AIMessage {
  id: string
  type: 'user' | 'agent' | 'system' | 'strategy'
  content: string
  agent_id?: string
  agent_name?: string
  timestamp: string
  suggestions?: string[]
  actions?: AIAction[]
  metrics?: BusinessMetrics
  strategy_data?: StrategyData
}

interface AIAction {
  type: string
  title: string
  description: string
  estimated_impact?: string
  implementation_difficulty?: 'low' | 'medium' | 'high'
}

interface BusinessMetrics {
  period_days: number
  total_revenue: number
  total_appointments: number
  unique_clients: number
  average_revenue_per_appointment: number
  average_revenue_per_client: number
  growth_rate?: number
  retention_rate?: number
}

interface StrategyData {
  id: string
  title: string
  type: string
  description: string
  predicted_roi: number
  implementation_timeline: string
  success_metrics: string[]
  status: 'proposed' | 'accepted' | 'implementing' | 'completed' | 'failed'
}

interface AIAgent {
  id: string
  name: string
  display_name: string
  description: string
  specialization: string
  avatar_color: string
  personality_traits: string[]
  current_focus?: string
}

interface ProactiveInsight {
  id: string
  type: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  confidence_score: number
  expected_roi: number
  implementation_difficulty: string
  created_at: string
}

const AI_AGENTS: AIAgent[] = [
  {
    id: 'financial',
    name: 'Marcus - Financial Coach',
    display_name: 'Marcus',
    description: 'Revenue optimization and pricing strategies expert',
    specialization: 'Financial Growth & Pricing',
    avatar_color: 'bg-green-500',
    personality_traits: ['analytical', 'data-driven', 'results-focused'],
    current_focus: 'Revenue per client optimization'
  },
  {
    id: 'growth',
    name: 'Sofia - Growth Strategist', 
    display_name: 'Sofia',
    description: 'Client acquisition and retention specialist',
    specialization: 'Business Growth & Marketing',
    avatar_color: 'bg-purple-500',
    personality_traits: ['strategic', 'innovative', 'encouraging'],
    current_focus: 'Client retention enhancement'
  },
  {
    id: 'operations',
    name: 'Alex - Operations Optimizer',
    display_name: 'Alex',
    description: 'Scheduling and efficiency optimization expert',
    specialization: 'Operations & Efficiency',
    avatar_color: 'bg-blue-500',
    personality_traits: ['systematic', 'practical', 'efficiency-focused'],
    current_focus: 'Schedule optimization'
  },
  {
    id: 'brand',
    name: 'Isabella - Brand Excellence',
    display_name: 'Isabella',
    description: 'Service quality and brand experience specialist',
    specialization: 'Brand & Service Excellence',
    avatar_color: 'bg-pink-500',
    personality_traits: ['quality-focused', 'creative', 'client-centric'],
    current_focus: 'Service experience enhancement'
  }
]

export default function UnifiedAIDashboard() {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Core state
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Agent and conversation state
  const [activeAgent, setActiveAgent] = useState<string>('growth') // Default to Sofia
  const [conversationId, setConversationId] = useState<string>('')
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [proactiveInsights, setProactiveInsights] = useState<ProactiveInsight[]>([])
  
  // UI state
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [showAgentDetails, setShowAgentDetails] = useState(false)
  const [activeStrategies, setActiveStrategies] = useState<StrategyData[]>([])

  // API wrapper with authentication
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // Initialize dashboard
  const initializeDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load business metrics, conversation context, and proactive insights
      const [metricsData, insightsData, strategiesData] = await Promise.all([
        apiCall('/api/v2/ai-orchestrator/business-metrics'),
        apiCall('/api/v2/ai-orchestrator/proactive-insights'),
        apiCall('/api/v2/ai-orchestrator/active-strategies')
      ])

      setBusinessMetrics(metricsData)
      setProactiveInsights(insightsData.insights || [])
      setActiveStrategies(strategiesData.strategies || [])

      // Generate conversation ID if not exists
      if (!conversationId) {
        setConversationId(`conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
      }

      // Add welcome message from default agent
      const welcomeMessage: AIMessage = {
        id: `welcome_${Date.now()}`,
        type: 'agent',
        content: `Hi! I'm Sofia, your Growth Strategist. I've analyzed your recent business performance and I'm here to help you achieve breakthrough growth using the Six Figure Barber methodology. 

Based on your current metrics, I can see exciting opportunities for:
• Client retention enhancement (current rate: ${metricsData.retention_rate?.toFixed(1) || 'calculating...'}%)
• Revenue per client optimization ($${metricsData.average_revenue_per_client?.toFixed(2) || '0'} current average)
• Strategic growth planning

What would you like to focus on today? I can also connect you with Marcus (Financial), Alex (Operations), or Isabella (Brand Excellence) if you need their expertise.`,
        agent_id: 'growth',
        agent_name: 'Sofia',
        timestamp: new Date().toISOString(),
        suggestions: [
          'How can I increase client retention?',
          'What pricing strategies should I use?', 
          'Show me my revenue trends',
          'How can I optimize my schedule?'
        ],
        metrics: metricsData
      }

      setMessages([welcomeMessage])

    } catch (err: any) {
      setError(err.message || 'Failed to initialize AI Dashboard')
      console.error('Dashboard initialization error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  // Send message to AI orchestrator
  const sendMessage = async (message: string, preferredAgent?: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await apiCall('/api/v2/ai-orchestrator/process-query', {
        method: 'POST',
        body: JSON.stringify({
          query: message,
          conversation_id: conversationId,
          preferred_agent: preferredAgent || activeAgent,
          include_business_context: true,
          include_proactive_insights: true
        })
      })

      const aiMessage: AIMessage = {
        id: `ai_${Date.now()}`,
        type: 'agent',
        content: response.content,
        agent_id: response.agent_id,
        agent_name: AI_AGENTS.find(a => a.id === response.agent_id)?.display_name || 'AI Assistant',
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions || [],
        actions: response.actions || [],
        metrics: response.metrics,
        strategy_data: response.strategy
      }

      setMessages(prev => [...prev, aiMessage])

      // Update active agent if different agent responded
      if (response.agent_id && response.agent_id !== activeAgent) {
        setActiveAgent(response.agent_id)
      }

      // Update business metrics if provided
      if (response.metrics) {
        setBusinessMetrics(response.metrics)
      }

      // Handle strategy proposals
      if (response.strategy) {
        toast({
          title: "🎯 Strategy Proposed",
          description: `${response.strategy.title} - Expected ROI: ${response.strategy.predicted_roi}%`,
          duration: 5000,
        })
      }

    } catch (err: any) {
      setError(`Failed to send message: ${err.message}`)
      toast({
        title: "❌ Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  // Handle action execution
  const executeAction = async (action: AIAction, messageId: string) => {
    try {
      const response = await apiCall('/api/v2/ai-orchestrator/execute-action', {
        method: 'POST',
        body: JSON.stringify({
          action: action,
          message_id: messageId,
          conversation_id: conversationId
        })
      })

      toast({
        title: "✅ Action Executed",
        description: `${action.title} has been initiated successfully.`,
        duration: 3000,
      })

      // Refresh insights if action affects business state
      if (action.type.includes('strategy') || action.type.includes('optimization')) {
        initializeDashboard()
      }

    } catch (err: any) {
      toast({
        title: "❌ Action Failed", 
        description: `Failed to execute ${action.title}: ${err.message}`,
        variant: "destructive"
      })
    }
  }

  // Switch active agent
  const switchAgent = (agentId: string) => {
    setActiveAgent(agentId)
    const agent = AI_AGENTS.find(a => a.id === agentId)
    
    if (agent) {
      const switchMessage: AIMessage = {
        id: `switch_${Date.now()}`,
        type: 'system',
        content: `Switched to ${agent.display_name} (${agent.specialization}). ${agent.description}`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, switchMessage])
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize on mount
  useEffect(() => {
    initializeDashboard()
  }, [initializeDashboard])

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputMessage)
    }
  }

  const currentAgent = AI_AGENTS.find(a => a.id === activeAgent)

  return (
    <div className={cn(
      "flex h-screen bg-gray-50 transition-all duration-300",
      isExpanded ? "p-0" : "p-4"
    )}>
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Brain className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">AI Business Intelligence</h1>
                  <p className="text-blue-100">Six Figure Barber AI Coaching System</p>
                </div>
              </div>
              
              {/* Active Agent Indicator */}
              {currentAgent && (
                <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                  <div className={cn("w-3 h-3 rounded-full", currentAgent.avatar_color)} />
                  <span className="font-medium">{currentAgent.display_name}</span>
                  <Badge variant="secondary" className="bg-white/30 text-white">
                    {currentAgent.specialization}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-white/20"
              >
                {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={initializeDashboard}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Agent Selection Bar */}
        <div className="border-b bg-gray-50 p-4">
          <div className="flex space-x-2 overflow-x-auto">
            {AI_AGENTS.map((agent) => (
              <Button
                key={agent.id}
                variant={activeAgent === agent.id ? "default" : "outline"}
                size="sm"
                onClick={() => switchAgent(agent.id)}
                className="flex items-center space-x-2 whitespace-nowrap"
              >
                <div className={cn("w-2 h-2 rounded-full", agent.avatar_color)} />
                <span>{agent.display_name}</span>
                {agent.current_focus && (
                  <Badge variant="secondary" className="text-xs">
                    {agent.current_focus}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-red-800 font-medium">Connection Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <Button size="sm" onClick={initializeDashboard} className="ml-auto">
                Retry
              </Button>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={cn(
              "flex items-start space-x-3",
              message.type === 'user' ? "justify-end" : "justify-start"
            )}>
              {/* Agent Avatar */}
              {message.type !== 'user' && (
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium",
                  message.type === 'system' ? "bg-gray-500" : 
                  AI_AGENTS.find(a => a.id === message.agent_id)?.avatar_color || "bg-gray-500"
                )}>
                  {message.type === 'system' ? <Settings className="w-5 h-5" /> : 
                   message.agent_name?.[0] || <Bot className="w-5 h-5" />}
                </div>
              )}

              {/* Message Content */}
              <div className={cn(
                "max-w-3xl rounded-lg p-4",
                message.type === 'user' 
                  ? "bg-blue-600 text-white" 
                  : message.type === 'system'
                  ? "bg-gray-100 text-gray-700"
                  : "bg-white border shadow-sm"
              )}>
                {/* Agent Name and Timestamp */}
                {message.type !== 'user' && message.type !== 'system' && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">
                      {message.agent_name || 'AI Assistant'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {/* Message Text */}
                <div className="whitespace-pre-wrap">
                  {message.content}
                </div>

                {/* Business Metrics Display */}
                {message.metrics && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 rounded p-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        ${message.metrics.total_revenue.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600">Revenue ({message.metrics.period_days}d)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {message.metrics.total_appointments}
                      </div>
                      <div className="text-xs text-gray-600">Appointments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {message.metrics.unique_clients}
                      </div>
                      <div className="text-xs text-gray-600">Clients</div>
                    </div>
                  </div>
                )}

                {/* Strategy Data */}
                {message.strategy_data && (
                  <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-l-4 border-green-400">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        {message.strategy_data.title}
                      </h4>
                      <Badge variant="outline" className="bg-white">
                        {message.strategy_data.predicted_roi}% ROI
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{message.strategy_data.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        Timeline: {message.strategy_data.implementation_timeline}
                      </span>
                      <Button size="sm" className="h-6 text-xs">
                        Accept Strategy
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {message.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => executeAction(action, message.id)}
                        className="text-xs flex items-center space-x-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{action.title}</span>
                        {action.estimated_impact && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {action.estimated_impact}
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-600 mb-2">Quick suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs bg-gray-50 hover:bg-gray-100 rounded-full px-3 py-1 h-auto"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {message.type === 'user' && (
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white",
                currentAgent?.avatar_color || "bg-gray-500"
              )}>
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="bg-white border shadow-sm rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-gray-600">
                    {currentAgent?.display_name || 'AI'} is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={`Ask ${currentAgent?.display_name || 'AI'} about your business...`}
                disabled={isLoading}
                className="pr-12"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                onClick={() => setIsVoiceActive(!isVoiceActive)}
              >
                {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              onClick={() => sendMessage(inputMessage)}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Press Enter to send</span>
              {currentAgent && (
                <span>• Speaking with {currentAgent.display_name}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                📊 Show Analytics
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                🎯 View Strategies  
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Business Context Sidebar */}
      <div className={cn(
        "transition-all duration-300 bg-white border-l",
        isExpanded ? "w-0 overflow-hidden" : "w-80"
      )}>
        <div className="p-6 space-y-6">
          
          {/* Real-Time Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Live Business Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {businessMetrics ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Revenue (30d)</span>
                    <span className="font-semibold text-green-600">
                      ${businessMetrics.total_revenue?.toFixed(0) || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Avg per Appointment</span>
                    <span className="font-semibold">
                      ${businessMetrics.average_revenue_per_appointment?.toFixed(2) || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Clients</span>
                    <span className="font-semibold text-blue-600">
                      {businessMetrics.unique_clients || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Growth Rate</span>
                    <Badge variant={businessMetrics.growth_rate && businessMetrics.growth_rate > 0 ? "default" : "secondary"}>
                      {businessMetrics.growth_rate ? `${businessMetrics.growth_rate.toFixed(1)}%` : 'Calculating...'}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading metrics...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Strategies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Strategy Execution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeStrategies.length > 0 ? (
                <div className="space-y-3">
                  {activeStrategies.slice(0, 3).map((strategy) => (
                    <div key={strategy.id} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{strategy.title}</span>
                        <Badge 
                          variant={strategy.status === 'implementing' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {strategy.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{strategy.description}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">ROI: {strategy.predicted_roi}%</span>
                        <span className="text-gray-500">{strategy.implementation_timeline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">
                  No active strategies. Ask your AI coach for recommendations!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Proactive Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proactiveInsights.length > 0 ? (
                <div className="space-y-3">
                  {proactiveInsights.slice(0, 2).map((insight) => (
                    <div key={insight.id} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{insight.title}</span>
                        <Badge 
                          variant={insight.priority === 'high' ? 'destructive' : 
                                   insight.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{insight.description}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>ROI: {insight.expected_roi}%</span>
                        <span>{(insight.confidence_score * 100).toFixed()}% confidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">
                  AI is analyzing your business for new insights...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Calendar className="w-3 h-3 mr-2" />
                Optimize Schedule
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Users className="w-3 h-3 mr-2" />
                Analyze Clients
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <DollarSign className="w-3 h-3 mr-2" />
                Review Pricing
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Award className="w-3 h-3 mr-2" />
                Service Excellence
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}