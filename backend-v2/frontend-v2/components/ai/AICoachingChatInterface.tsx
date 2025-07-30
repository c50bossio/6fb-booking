'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'

// AI Agent Icons (reuse from AIBusinessCalendar)
const DollarSignIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

const BrainIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

// AI Agent Configuration
const AI_AGENTS = [
  {
    id: 'financial_coach',
    name: 'Marcus',
    title: 'Financial Coach',
    description: 'Revenue optimization and pricing strategies',
    icon: DollarSignIcon,
    color: 'bg-green-500',
    personality: 'analytical and data-driven',
    greeting: "Hi! I'm Marcus, your Financial Coach. I help optimize your revenue and pricing strategies. What business challenge can I help you with today?"
  },
  {
    id: 'growth_strategist',
    name: 'Sofia',
    title: 'Growth Strategist',
    description: 'Client acquisition and retention insights',
    icon: TrendingUpIcon, 
    color: 'bg-blue-500',
    personality: 'motivational and strategic',
    greeting: "Hello! I'm Sofia, your Growth Strategist. I'm passionate about helping you build lasting client relationships and scale your business. How can I support your growth today?"
  },
  {
    id: 'operations_optimizer',
    name: 'Alex',
    title: 'Operations Optimizer',
    description: 'Schedule efficiency and workflow optimization',
    icon: UsersIcon,
    color: 'bg-purple-500', 
    personality: 'systematic and efficient',
    greeting: "Hey! I'm Alex, your Operations Optimizer. I focus on streamlining your workflow and maximizing efficiency. What operational challenge shall we tackle?"
  },
  {
    id: 'brand_developer',
    name: 'Isabella',
    title: 'Brand Developer',
    description: 'Service mix and customer experience enhancement',
    icon: BrainIcon,
    color: 'bg-orange-500',
    personality: 'creative and empathetic',
    greeting: "Hi there! I'm Isabella, your Brand Developer. I help create exceptional customer experiences and develop your unique brand. What aspect of your brand would you like to explore?"
  }
]

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
  agentId?: string
  suggestions?: string[]
}

interface AICoachingChatInterfaceProps {
  activeAgent?: any
  onAgentChange?: (agent: any) => void
  className?: string
  businessInsights?: any
}

export function AICoachingChatInterface({ 
  activeAgent, 
  onAgentChange,
  className = '',
  businessInsights 
}: AICoachingChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(activeAgent || AI_AGENTS[0])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Initialize conversation when agent changes
  useEffect(() => {
    if (selectedAgent) {
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        type: 'agent',
        content: selectedAgent.greeting,
        timestamp: new Date(),
        agentId: selectedAgent.id,
        suggestions: [
          "What's my current revenue performance?",
          "How can I improve my pricing strategy?",
          "Show me client retention insights",
          "Help me optimize my schedule"
        ]
      }
      setMessages([welcomeMessage])
    }
  }, [selectedAgent])

  // Handle agent selection
  const handleAgentSelect = useCallback((agent: any) => {
    setSelectedAgent(agent)
    onAgentChange?.(agent)
    setMessages([]) // Clear messages when switching agents
  }, [onAgentChange])

  // Generate AI response (mock implementation)
  const generateAIResponse = useCallback(async (userMessage: string, agentId: string): Promise<Message> => {
    setIsTyping(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const agent = AI_AGENTS.find(a => a.id === agentId)
    let response = ''
    let suggestions: string[] = []

    // Generate contextual responses based on agent type and user message
    if (agentId === 'financial_coach') {
      if (userMessage.toLowerCase().includes('revenue') || userMessage.toLowerCase().includes('pricing')) {
        response = `Based on your recent data, I see you're averaging $${businessInsights?.average_booking_value || 65} per service. Here are three actionable strategies to boost your revenue:

1. **Premium Service Positioning**: Your luxury services show 40% higher margins. Consider expanding your premium offerings.

2. **Dynamic Pricing**: Your Tuesday 2-4 PM slots have consistent availability - perfect opportunity for promotional pricing to drive volume.

3. **Service Bundling**: Clients who book haircut + beard trim have 23% higher lifetime value. Create attractive packages.

Would you like me to dive deeper into any of these strategies?`
        suggestions = [
          "Tell me more about premium positioning",
          "How do I implement dynamic pricing?", 
          "What bundles should I create?",
          "Show me my profit margins"
        ]
      } else {
        response = `I understand you're looking for financial guidance. With your current revenue of $${businessInsights?.weekly_revenue || 4200} this week, there are several areas we can improve. What specific financial challenge would you like to address?`
        suggestions = [
          "Increase my service prices",
          "Improve profit margins",
          "Analyze revenue trends",
          "Optimize booking value"
        ]
      }
    } else if (agentId === 'growth_strategist') {
      if (userMessage.toLowerCase().includes('retention') || userMessage.toLowerCase().includes('client')) {
        response = `Your current retention rate of ${businessInsights?.client_retention_rate || 85}% is solid, but we can push it higher! Here's my strategic approach:

1. **Client Journey Mapping**: Your highest-value clients prefer morning slots (9-11 AM). Block more premium times for VIP clients.

2. **Follow-up System**: Implement a 48-hour post-appointment check-in. This single touchpoint can increase retention by 15%.

3. **Loyalty Rewards**: Create a "Chair Loyalty" program - every 5th visit gets a complimentary service add-on.

Which retention strategy resonates most with your brand vision?`
        suggestions = [
          "Set up the follow-up system",
          "Design my loyalty program",
          "Identify my VIP clients",
          "Plan my client journey"
        ]
      } else {
        response = `Growth is about relationships, not just revenue. With your business fundamentals strong, let's focus on sustainable client acquisition. What growth challenge can I help you tackle?`
        suggestions = [
          "Improve client retention",
          "Get more referrals", 
          "Attract premium clients",
          "Build my reputation"
        ]
      }
    } else if (agentId === 'operations_optimizer') {
      if (userMessage.toLowerCase().includes('schedule') || userMessage.toLowerCase().includes('efficiency')) {
        response = `Looking at your schedule patterns, I've identified three efficiency opportunities:

1. **Time Block Optimization**: Your average service runs 8 minutes over. Implementing buffer times will eliminate client wait stress.

2. **Peak Hour Management**: Your 6-8 PM slots are 95% booked. Consider adding a premium "Priority Booking" fee for peak times.

3. **Setup Standardization**: Create station prep checklists. This 5-minute investment saves 15 minutes between clients.

Your utilization rate could jump from ${businessInsights?.calendar_insights?.calendar_utilization_rate || 75}% to 85% with these changes.

Which efficiency improvement should we implement first?`
        suggestions = [
          "Set up my station checklist",
          "Add buffer time to services",
          "Implement priority booking",
          "Analyze my peak hours"
        ]
      } else {
        response = `Efficiency is about systems, not speed. Every minute you save can be reinvested in client experience or revenue. What operational challenge is slowing you down?`
        suggestions = [
          "Optimize my schedule",
          "Reduce service times",
          "Eliminate downtime",
          "Improve workflow"
        ]
      }
    } else if (agentId === 'brand_developer') {
      if (userMessage.toLowerCase().includes('brand') || userMessage.toLowerCase().includes('experience')) {
        response = `Your brand is your promise to every client. Looking at your service mix, I see opportunities to elevate your positioning:

1. **Signature Service Creation**: Develop a unique "Signature Style Consultation" that positions you as an artist, not just a barber.

2. **Premium Experience Design**: Your clients pay for transformation, not just a haircut. Consider aromatherapy, premium products, or personalized aftercare.

3. **Brand Story Integration**: Share your journey, your philosophy, your craft. Clients connect with stories, not just skills.

Your premium service ratio of ${((businessInsights?.service_tier_distribution?.premium || 0) / (businessInsights?.total_appointments || 1) * 100).toFixed(1)}% shows clients value quality. Let's leverage that.

What aspect of your brand experience excites you most?`
        suggestions = [
          "Create my signature service",
          "Design the premium experience",
          "Develop my brand story",
          "Position myself as premium"
        ]
      } else {
        response = `Brand development is about creating an experience that clients can't find anywhere else. Every touchpoint should reflect your unique value. How can I help elevate your brand?`
        suggestions = [
          "Improve customer experience",
          "Create signature services",
          "Develop my brand story",
          "Position as premium"
        ]
      }
    }

    setIsTyping(false)
    
    return {
      id: `agent-${Date.now()}`,
      type: 'agent',
      content: response,
      timestamp: new Date(),
      agentId,
      suggestions
    }
  }, [businessInsights])

  // Handle sending messages
  const handleSendMessage = useCallback(async (messageContent?: string) => {
    const content = messageContent || inputValue.trim()
    if (!content) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user', 
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Generate AI response
    try {
      const aiResponse = await generateAIResponse(content, selectedAgent.id)
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error generating AI response:', error)
      toast({
        title: "Communication Error",
        description: "Unable to connect with your AI coach. Please try again.",
        variant: "destructive"
      })
    }
  }, [inputValue, selectedAgent.id, generateAIResponse])

  // Handle suggestion clicks
  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSendMessage(suggestion)
  }, [handleSendMessage])

  // Handle enter key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  return (
    <div className={`flex flex-col h-full max-h-[600px] ${className}`}>
      {/* Agent Selection Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            AI Business Coaching Chat
          </h3>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Live Chat
          </Badge>
        </div>
        
        {/* Agent Selection Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {AI_AGENTS.map((agent) => {
            const IconComponent = agent.icon
            const isActive = selectedAgent?.id === agent.id
            
            return (
              <Button
                key={agent.id}
                onClick={() => handleAgentSelect(agent)}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`justify-start text-left h-auto p-2 ${
                  isActive 
                    ? `${agent.color} text-white hover:opacity-90` 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full ${isActive ? 'bg-white/20' : agent.color} flex items-center justify-center`}>
                    <IconComponent className={isActive ? 'text-white' : 'text-white'} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium">{agent.name}</div>
                    <div className="text-xs opacity-75">{agent.title}</div>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const agent = message.agentId ? AI_AGENTS.find(a => a.id === message.agentId) : null
            
            return (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback 
                    className={message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : `${agent?.color || 'bg-gray-500'} text-white`
                    }
                  >
                    {message.type === 'user' ? (
                      <UserIcon />
                    ) : (
                      agent && <agent.icon />
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Message Content */}
                <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-xs text-gray-500 mt-1 ${
                    message.type === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Suggested follow-ups:
                      </div>
                      <div className="space-y-1">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            variant="outline"
                            size="sm"
                            className="text-left h-auto p-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className={`${selectedAgent.color} text-white`}>
                  <selectedAgent.icon />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${selectedAgent.name} anything about your business...`}
              className="pr-10"
              disabled={isTyping}
            />
          </div>
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <SendIcon />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            onClick={() => handleSendMessage("What's my current performance?")}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            📊 Performance Overview
          </Button>
          <Button
            onClick={() => handleSendMessage("Give me 3 quick wins I can implement today")}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            ⚡ Quick Wins
          </Button>
          <Button
            onClick={() => handleSendMessage("How am I tracking against Six Figure Barber methodology?")}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            🎯 Six FB Check
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AICoachingChatInterface