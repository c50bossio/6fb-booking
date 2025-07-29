'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarWithBookingModal } from './CalendarWithBookingModal'
import { AppointmentModal } from './AppointmentModal'
import { AIInsightsSidebar } from './AIInsightsSidebar'
import { CalendarHeader } from './CalendarHeader'
import { AICoachingChatInterface } from '@/components/ai/AICoachingChatInterface'
import { useRealtimeCalendar } from '@/hooks/useRealtimeCalendar'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/use-toast'

// AI Business Intelligence Icons
const BrainIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const DollarSignIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

// AI Agent Types for Business Intelligence
const AI_AGENTS = [
  {
    id: 'financial_coach',
    name: 'Financial Coach',
    description: 'Revenue optimization and pricing strategies',
    icon: DollarSignIcon,
    color: 'bg-green-500',
  },
  {
    id: 'growth_strategist', 
    name: 'Growth Strategist',
    description: 'Client acquisition and retention insights',
    icon: TrendingUpIcon,
    color: 'bg-blue-500',
  },
  {
    id: 'operations_optimizer',
    name: 'Operations Optimizer', 
    description: 'Schedule efficiency and workflow optimization',
    icon: UsersIcon,
    color: 'bg-purple-500',
  },
  {
    id: 'brand_developer',
    name: 'Brand Developer',
    description: 'Service mix and customer experience enhancement',
    icon: BrainIcon,
    color: 'bg-orange-500',
  },
]

interface AIBusinessCalendarProps {
  className?: string
  showAIInsights?: boolean
  enableGoogleSync?: boolean
}

export function AIBusinessCalendar({ 
  className = '',
  showAIInsights = true,
  enableGoogleSync = true
}: AIBusinessCalendarProps) {
  const [appointments, setAppointments] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [activeAIAgent, setActiveAIAgent] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [businessInsights, setBusinessInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAIChat, setShowAIChat] = useState(false)
  
  const { user } = useAuth()
  const realtimeCalendar = useRealtimeCalendar({
    enableToasts: true,
    enableConflictAlerts: true,
    autoConnect: true,
  })

  // Load calendar data and business insights
  useEffect(() => {
    const loadCalendarData = async () => {
      setLoading(true)
      try {
        // Load appointments from existing API
        const appointmentsResponse = await fetch('/api/v2/appointments/')
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json()
          setAppointments(appointmentsData.appointments || [])
        }

        // Load Google Calendar events if sync is enabled
        if (enableGoogleSync) {
          const calendarResponse = await fetch('/api/v2/google-calendar/events')
          if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json()
            setCalendarEvents(calendarData.events || [])
          }
        }

        // Load AI business insights
        const insightsResponse = await fetch('/api/v2/agents/analytics')
        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json()
          setBusinessInsights(insightsData)
        }

      } catch (error) {
        console.error('Error loading calendar data:', error)
        // Load demo data for development
        setAppointments([
          {
            id: 1,
            service_name: 'Premium Haircut',
            client_name: 'John Smith',
            start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            status: 'confirmed',
            price: 85
          },
          {
            id: 2,
            service_name: 'Beard Trim',
            client_name: 'Mike Wilson',
            start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            status: 'confirmed',
            price: 45
          }
        ])
        
        setBusinessInsights({
          daily_revenue: 780,
          weekly_revenue: 4200,
          monthly_revenue: 16800,
          client_retention_rate: 85,
          average_booking_value: 65,
          optimization_opportunities: [
            'Consider raising premium service prices by 15%',
            'Tuesday 2-4 PM shows consistent availability - perfect for marketing push',
            'Your highest-value clients prefer morning slots - block more 9-11 AM times'
          ]
        })
      } finally {
        setLoading(false)
      }
    }

    loadCalendarData()
  }, [enableGoogleSync])

  // Handle appointment selection
  const handleAppointmentClick = useCallback((appointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentModal(true)
  }, [])

  // Handle AI agent activation
  const handleAIAgentClick = useCallback((agent) => {
    setActiveAIAgent(agent)
    toast({
      title: `${agent.name} Activated`,
      description: `Analyzing your calendar data for ${agent.description.toLowerCase()}`,
    })
  }, [])

  // Handle AI chat toggle
  const handleToggleAIChat = useCallback(() => {
    setShowAIChat(prev => !prev)
    if (!showAIChat && !activeAIAgent) {
      // Set default agent when opening chat for first time
      setActiveAIAgent(AI_AGENTS[0])
    }
  }, [showAIChat, activeAIAgent])

  // AI Insights Quick Stats
  const renderQuickInsights = () => {
    if (!businessInsights) return null

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <DollarSignIcon className="text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Today's Revenue</p>
              <p className="text-lg font-semibold">${businessInsights.daily_revenue}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUpIcon className="text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Weekly Revenue</p>
              <p className="text-lg font-semibold">${businessInsights.weekly_revenue}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <UsersIcon className="text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Retention Rate</p>
              <p className="text-lg font-semibold">{businessInsights.client_retention_rate}%</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <BrainIcon className="text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Avg Booking</p>
              <p className="text-lg font-semibold">${businessInsights.average_booking_value}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // AI Agents Panel
  const renderAIAgentsPanel = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BrainIcon className="text-blue-600" />
          <span>AI Business Coaches</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AI_AGENTS.map((agent) => {
            const IconComponent = agent.icon
            const isActive = activeAIAgent?.id === agent.id
            
            return (
              <Card 
                key={agent.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  isActive ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleAIAgentClick(agent)}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg ${agent.color} flex items-center justify-center`}>
                    <IconComponent className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{agent.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{agent.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      {isActive && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveAIAgent(agent)
                          setShowAIChat(true)
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-xs p-1 h-6"
                      >
                        <ChatIcon className="w-3 h-3 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Business Intelligence Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI Business Calendar</h1>
        <div className="flex items-center space-x-2">
          {enableGoogleSync && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Google Calendar Synced
            </Badge>
          )}
          <Button
            onClick={handleToggleAIChat}
            variant={showAIChat ? "default" : "outline"}
            size="sm"
            className={showAIChat ? "bg-blue-600 text-white" : ""}
          >
            <ChatIcon />
            <span className="ml-2">AI Chat</span>
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Quick Business Insights */}
      {showAIInsights && renderQuickInsights()}

      {/* AI Agents Panel */}
      {showAIInsights && renderAIAgentsPanel()}

      {/* Main Calendar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Component */}
        <div className="lg:col-span-3">
          <CalendarWithBookingModal
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            showGoogleCalendarEvents={enableGoogleSync}
            googleCalendarEvents={calendarEvents}
          />
        </div>

        {/* AI Insights Sidebar */}
        {showAIInsights && (
          <div className="lg:col-span-1">
            <AIInsightsSidebar
              activeAgent={activeAIAgent}
              businessInsights={businessInsights}
              appointments={appointments}
              onAgentMessage={(message) => {
                toast({
                  title: activeAIAgent?.name || 'AI Coach',
                  description: message,
                  duration: 5000,
                })
              }}
            />
          </div>
        )}
      </div>

      {/* AI Chat Interface Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] m-4 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Business Coaching
              </h2>
              <Button
                onClick={handleToggleAIChat}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden">
              <AICoachingChatInterface
                activeAgent={activeAIAgent}
                onAgentChange={setActiveAIAgent}
                businessInsights={businessInsights}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          isOpen={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false)
            setSelectedAppointment(null)
          }}
          onSave={(updatedAppointment) => {
            setAppointments(prev => 
              prev.map(apt => 
                apt.id === updatedAppointment.id ? updatedAppointment : apt
              )
            )
            setShowAppointmentModal(false)
            setSelectedAppointment(null)
          }}
        />
      )}
    </div>
  )
}

export default AIBusinessCalendar