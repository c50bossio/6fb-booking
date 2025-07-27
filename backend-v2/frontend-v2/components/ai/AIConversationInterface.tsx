/**
 * AI Conversation Interface - Enterprise Conversational UI
 * Professional chat interface for AI agent interactions
 * Built for barbershop business intelligence with Six Figure Barber methodology
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { aiAgent, professionalTypography, enterpriseAnimations } from '@/lib/design-tokens'
import { 
  Send, 
  Bot, 
  User, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Bookmark, 
  MoreVertical,
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  Users,
  Star,
  Zap,
  Mic,
  Paperclip,
  Smile
} from 'lucide-react'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  agentId?: string
  messageType?: 'text' | 'insight' | 'recommendation' | 'data'
  metadata?: {
    confidence?: number
    actionable?: boolean
    category?: string
    priority?: 'low' | 'medium' | 'high'
  }
}

interface AIConversationInterfaceProps {
  agentId: string
  agentName?: string
  agentRole?: string
  className?: string
  onMessageSent?: (message: string) => void
  onMessageReceived?: (message: Message) => void
  initialMessages?: Message[]
  showTypingIndicator?: boolean
}

const AGENT_AVATARS = {
  'master-coach': { icon: <Target className="w-5 h-5" />, color: '#0d9488' },
  'financial-agent': { icon: <DollarSign className="w-5 h-5" />, color: '#059669' },
  'operations-agent': { icon: <BarChart3 className="w-5 h-5" />, color: '#3b82f6' },
  'marketing-agent': { icon: <TrendingUp className="w-5 h-5" />, color: '#a855f7' },
  'client-acquisition-agent': { icon: <Users className="w-5 h-5" />, color: '#f59e0b' },
  'brand-agent': { icon: <Star className="w-5 h-5" />, color: '#ef4444' },
  'growth-agent': { icon: <Zap className="w-5 h-5" />, color: '#8b5cf6' },
}

export function AIConversationInterface({
  agentId,
  agentName = 'AI Agent',
  agentRole = 'Business Assistant',
  className = '',
  onMessageSent,
  onMessageReceived,
  initialMessages = [],
  showTypingIndicator = false
}: AIConversationInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const agentAvatar = AGENT_AVATARS[agentId as keyof typeof AGENT_AVATARS] || 
    { icon: <Bot className="w-5 h-5" />, color: '#6b7280' }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Add welcome message if no initial messages
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        content: `Hello! I'm your ${agentName}, ready to help you achieve Six Figure Barber success. How can I assist you today?`,
        sender: 'ai',
        timestamp: new Date(),
        agentId,
        messageType: 'text',
      }
      setMessages([welcomeMessage])
    }
  }, [agentId, agentName, messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setIsTyping(true)

    if (onMessageSent) {
      onMessageSent(inputValue.trim())
    }

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue.trim(), agentId)
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
      setIsLoading(false)

      if (onMessageReceived) {
        onMessageReceived(aiResponse)
      }
    }, 1500 + Math.random() * 1000)
  }

  const generateAIResponse = (userInput: string, agentId: string): Message => {
    // Mock AI responses based on agent type and user input
    const responses = {
      'master-coach': [
        "Based on the Six Figure Barber methodology, I recommend focusing on your service pricing strategy. Let's analyze your current rates and identify opportunities for premium positioning.",
        "Your goal alignment is crucial for success. I've identified 3 key areas where we can optimize your performance: client retention, service efficiency, and revenue per appointment.",
        "Let me help you create a strategic roadmap. What's your current monthly revenue target, and where do you see the biggest challenges?"
      ],
      'financial-agent': [
        "I've analyzed your revenue patterns and found a 23% opportunity for growth through strategic pricing adjustments. Here's my recommendation...",
        "Your profit margins can be improved by optimizing service mix. Premium services show 40% higher profitability than standard cuts.",
        "Based on industry benchmarks, your financial performance indicates strong potential for scaling. Let's discuss investment priorities."
      ],
      'operations-agent': [
        "Your current schedule efficiency is at 78%. I've identified time gaps that could accommodate 3 additional appointments per day.",
        "Streamlining your booking process could reduce no-shows by 15%. Would you like me to create an optimization plan?",
        "I notice peak demand patterns on weekends. Let's discuss capacity management strategies to maximize revenue during high-traffic periods."
      ]
    }

    const agentResponses = responses[agentId as keyof typeof responses] || [
      "I understand your question. Let me provide you with data-driven insights to help optimize your barbershop operations.",
    ]

    const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)]

    return {
      id: `ai-${Date.now()}`,
      content: randomResponse,
      sender: 'ai',
      timestamp: new Date(),
      agentId,
      messageType: Math.random() > 0.5 ? 'insight' : 'recommendation',
      metadata: {
        confidence: 0.85 + Math.random() * 0.15,
        actionable: Math.random() > 0.3,
        category: ['revenue', 'operations', 'marketing', 'growth'][Math.floor(Math.random() * 4)],
        priority: ['medium', 'high'][Math.floor(Math.random() * 2)] as 'medium' | 'high',
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageTypeColor = (messageType?: string) => {
    switch (messageType) {
      case 'insight':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'recommendation':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'data':
        return 'bg-purple-50 border-purple-200 text-purple-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  return (
    <div className={`flex flex-col h-full max-h-[600px] bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: agentAvatar.color }}
            >
              {agentAvatar.icon}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {agentName}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {agentRole} • Online
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success" className="text-xs">
              Active
            </Badge>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-1' : 'order-2'}`}>
                {/* Message bubble */}
                <div className={`
                  p-4 rounded-2xl shadow-sm
                  ${message.sender === 'user' 
                    ? 'bg-primary-500 text-white ml-auto' 
                    : `bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 ${
                        message.messageType && message.messageType !== 'text' 
                          ? getMessageTypeColor(message.messageType)
                          : ''
                      }`
                  }
                `}>
                  {/* Message type indicator */}
                  {message.messageType && message.messageType !== 'text' && message.sender === 'ai' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {message.messageType === 'insight' ? '💡 Insight' : 
                         message.messageType === 'recommendation' ? '🎯 Recommendation' : 
                         message.messageType === 'data' ? '📊 Data' : 'Message'}
                      </Badge>
                      {message.metadata?.confidence && (
                        <span className="text-xs opacity-75">
                          {Math.round(message.metadata.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>

                  {/* Action buttons for AI messages */}
                  {message.sender === 'ai' && (
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <Bookmark className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  )}

                  {/* Timestamp for user messages */}
                  {message.sender === 'user' && (
                    <div className="text-xs opacity-75 mt-2 text-right">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  )}
                </div>

                {/* Avatar for AI messages */}
                {message.sender === 'ai' && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: agentAvatar.color }}
                    >
                      {React.cloneElement(agentAvatar.icon, { className: "w-3 h-3" })}
                    </div>
                    <span className="text-xs text-gray-500">{agentName}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {(isTyping || showTypingIndicator) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">{agentName} is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${agentName} anything about your barbershop...`}
              className="pr-24 min-h-[44px] resize-none"
              disabled={isLoading}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Smile className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Mic className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="h-11 px-4 bg-primary-500 hover:bg-primary-600"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "Show my revenue trends",
            "Optimize my schedule", 
            "Analyze client retention",
            "Suggest pricing improvements"
          ].map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setInputValue(suggestion)}
              disabled={isLoading}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AIConversationInterface