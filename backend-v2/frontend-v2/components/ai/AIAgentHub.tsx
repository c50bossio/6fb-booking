/**
 * AI Agent Hub - Enterprise AI Agent Interface
 * Professional interface for 7 specialized barbershop AI agents
 * Built for Six Figure Barber methodology with enterprise UX patterns
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { aiAgent, professionalTypography, enterpriseAnimations } from '@/lib/design-tokens'
import { Bot, TrendingUp, Users, PieChart, Target, Star, Zap, MessageCircle, BarChart3, Calendar, DollarSign } from 'lucide-react'

// AI Agent Definitions - The 7 Specialists
const AI_AGENTS = [
  {
    id: 'master-coach',
    name: 'Master Coach',
    role: 'Strategic Business Advisor',
    description: 'Your personal Six Figure Barber mentor providing strategic guidance and goal tracking.',
    icon: <Target className="w-6 h-6" />,
    color: aiAgent.coaching.primary,
    bgColor: '#f0fdfa',
    specialties: ['Business Strategy', 'Goal Setting', 'Performance Analysis', 'Growth Planning'],
    status: 'active',
    conversations: 156,
    successRate: 94,
    lastInteraction: '2 minutes ago',
  },
  {
    id: 'financial-agent',
    name: 'Financial Agent',
    role: 'Revenue Optimization Expert',
    description: 'Maximize revenue with pricing optimization, financial forecasting, and profit analysis.',
    icon: <DollarSign className="w-6 h-6" />,
    color: '#059669',
    bgColor: '#f0fdf4',
    specialties: ['Revenue Analysis', 'Pricing Strategy', 'Financial Forecasting', 'Profit Optimization'],
    status: 'active',
    conversations: 89,
    successRate: 91,
    lastInteraction: '15 minutes ago',
  },
  {
    id: 'operations-agent',
    name: 'Operations Agent',
    role: 'Efficiency & Process Expert',
    description: 'Streamline operations, optimize schedules, and improve business efficiency.',
    icon: <BarChart3 className="w-6 h-6" />,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    specialties: ['Schedule Optimization', 'Process Improvement', 'Resource Management', 'Efficiency Analysis'],
    status: 'active',
    conversations: 134,
    successRate: 88,
    lastInteraction: '1 hour ago',
  },
  {
    id: 'marketing-agent',
    name: 'Marketing Agent',
    role: 'Growth & Promotion Specialist',
    description: 'Drive customer acquisition with targeted marketing campaigns and brand development.',
    icon: <TrendingUp className="w-6 h-6" />,
    color: '#a855f7',
    bgColor: '#fdf4ff',
    specialties: ['Digital Marketing', 'Brand Building', 'Campaign Management', 'Social Media Strategy'],
    status: 'active',
    conversations: 67,
    successRate: 85,
    lastInteraction: '3 hours ago',
  },
  {
    id: 'client-acquisition-agent',
    name: 'Client Acquisition Agent',
    role: 'Customer Growth Expert',
    description: 'Convert leads into loyal customers with intelligent acquisition strategies.',
    icon: <Users className="w-6 h-6" />,
    color: '#f59e0b',
    bgColor: '#fffbeb',
    specialties: ['Lead Generation', 'Conversion Optimization', 'Customer Onboarding', 'Retention Strategies'],
    status: 'active',
    conversations: 78,
    successRate: 89,
    lastInteraction: '45 minutes ago',
  },
  {
    id: 'brand-agent',
    name: 'Brand Agent',
    role: 'Reputation & Identity Expert',
    description: 'Build a powerful brand presence and manage online reputation effectively.',
    icon: <Star className="w-6 h-6" />,
    color: '#ef4444',
    bgColor: '#fef2f2',
    specialties: ['Brand Strategy', 'Reputation Management', 'Online Presence', 'Customer Reviews'],
    status: 'active',
    conversations: 45,
    successRate: 92,
    lastInteraction: '2 hours ago',
  },
  {
    id: 'growth-agent',
    name: 'Growth Agent',
    role: 'Expansion & Scaling Expert',
    description: 'Scale your business with expansion planning and growth opportunity analysis.',
    icon: <Zap className="w-6 h-6" />,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    specialties: ['Business Expansion', 'Market Analysis', 'Scaling Strategies', 'Opportunity Assessment'],
    status: 'active',
    conversations: 23,
    successRate: 96,
    lastInteraction: '6 hours ago',
  },
]

interface AIAgentHubProps {
  className?: string
  onAgentSelect?: (agentId: string) => void
  showMetrics?: boolean
  layout?: 'grid' | 'list'
}

export function AIAgentHub({ 
  className = '', 
  onAgentSelect,
  showMetrics = true,
  layout = 'grid'
}: AIAgentHubProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAgentClick = async (agentId: string) => {
    setIsLoading(true)
    setSelectedAgent(agentId)
    
    // Simulate API call to start conversation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (onAgentSelect) {
      onAgentSelect(agentId)
    }
    
    setIsLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22c55e'
      case 'busy':
        return '#f59e0b'
      case 'offline':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ 
              fontSize: professionalTypography.executive.title[0], 
              lineHeight: professionalTypography.executive.title[1].lineHeight,
              fontWeight: professionalTypography.executive.title[1].fontWeight,
            }} className="text-gray-900 dark:text-white">
              AI Agent Hub
            </h1>
            <p style={{
              fontSize: professionalTypography.executive.caption[0],
              lineHeight: professionalTypography.executive.caption[1].lineHeight,
              fontWeight: professionalTypography.executive.caption[1].fontWeight,
            }} className="text-gray-600 dark:text-gray-300">
              Your team of 7 specialized AI experts for Six Figure Barber success
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {showMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-primary-600">7</div>
              <div className="text-xs text-gray-500">Active Agents</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600">592</div>
              <div className="text-xs text-gray-500">Total Conversations</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-purple-600">91%</div>
              <div className="text-xs text-gray-500">Success Rate</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600">$2.4K</div>
              <div className="text-xs text-gray-500">Revenue Impact</div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Grid */}
      <div className={`
        ${layout === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
          : 'space-y-4'
        }
      `}>
        <AnimatePresence>
          {AI_AGENTS.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: parseFloat(enterpriseAnimations.duration.normal) / 1000,
                delay: index * 0.1,
                ease: enterpriseAnimations.easing.smooth
              }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`
                  h-full cursor-pointer transition-all duration-200 hover:shadow-lg
                  ${selectedAgent === agent.id ? 'ring-2 ring-primary-500 shadow-lg' : ''}
                  ${isLoading && selectedAgent === agent.id ? 'opacity-75' : ''}
                `}
                onClick={() => handleAgentClick(agent.id)}
                style={{ backgroundColor: agent.bgColor }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: agent.color, color: 'white' }}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={agent.status === 'active' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {agent.status}
                      </Badge>
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getStatusColor(agent.status) }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {agent.name}
                    </CardTitle>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {agent.role}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Specialties */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                      Specialties
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {agent.specialties.slice(0, 2).map((specialty) => (
                        <Badge 
                          key={specialty} 
                          variant="outline" 
                          className="text-xs px-2 py-1"
                        >
                          {specialty}
                        </Badge>
                      ))}
                      {agent.specialties.length > 2 && (
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          +{agent.specialties.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  {showMetrics && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {agent.conversations}
                        </div>
                        <div className="text-xs text-gray-500">Conversations</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {agent.successRate}%
                        </div>
                        <div className="text-xs text-gray-500">Success Rate</div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button 
                    className="w-full"
                    style={{ backgroundColor: agent.color }}
                    disabled={isLoading && selectedAgent === agent.id}
                  >
                    {isLoading && selectedAgent === agent.id ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4" />
                        <span>Start Conversation</span>
                      </div>
                    )}
                  </Button>

                  {/* Last Interaction */}
                  <div className="text-xs text-gray-400 text-center">
                    Last active: {agent.lastInteraction}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Need Help Getting Started?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Not sure which agent to choose? Start with the Master Coach for personalized guidance, 
            or let our AI recommend the best agent for your current goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              className="flex items-center space-x-2"
              onClick={() => handleAgentClick('master-coach')}
            >
              <Target className="w-4 h-4" />
              <span>Talk to Master Coach</span>
            </Button>
            <Button 
              className="flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-purple-600"
              onClick={() => handleAgentClick('ai-recommendation')}
            >
              <Bot className="w-4 h-4" />
              <span>Get AI Recommendation</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAgentHub