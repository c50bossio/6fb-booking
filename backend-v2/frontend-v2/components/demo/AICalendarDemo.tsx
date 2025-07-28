'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  InformationCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

// Import our AI components
import AIEnhancedCalendarLayout from '@/components/calendar/AIEnhancedCalendarLayout'
import SmartTimeSuggestions from '@/components/calendar/SmartTimeSuggestions'
import AIInsightsSidebar from '@/components/calendar/AIInsightsSidebar'

// Import new mobile components
import ResponsiveMobileCalendar from '@/components/calendar/ResponsiveMobileCalendar'
import { MobileCalendarLayout } from '@/components/calendar/MobileCalendarLayout'
import SwipeNavigation from '@/components/calendar/SwipeNavigation'

// Import AI engines
import { 
  createSmartSchedulingEngine,
  TimeSlotRecommendation 
} from '@/lib/ai-scheduling-engine'
import {
  createClientPreferenceLearningSystem,
  ClientBehaviorProfile
} from '@/lib/client-preference-learning'
import {
  createRevenueOptimizationEngine,
  RevenueMetrics,
  ServiceProfitability
} from '@/lib/revenue-optimization'

// Import sample data
import {
  sampleData,
  sampleAppointments,
  sampleAvailability,
  sampleBarbers,
  aiTestScenarios,
  generateExtendedSampleData
} from '@/lib/sample-data/ai-demo-data'

const AICalendarDemo: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeDemo, setActiveDemo] = useState<'calendar' | 'mobile' | 'suggestions' | 'insights' | 'analytics'>('calendar')
  const [selectedScenario, setSelectedScenario] = useState<keyof typeof aiTestScenarios>('vipClientBooking')
  const [showLiveDemo, setShowLiveDemo] = useState(false)
  const [showMobileDemo, setShowMobileDemo] = useState(false)
  const [extendedData] = useState(() => generateExtendedSampleData(2)) // 2x data for better analytics

  // Initialize AI engines with sample data
  const aiEngines = useMemo(() => {
    const schedulingEngine = createSmartSchedulingEngine(extendedData, sampleAvailability)
    const clientLearningSystem = createClientPreferenceLearningSystem(extendedData)
    const revenueEngine = createRevenueOptimizationEngine(extendedData)

    return {
      schedulingEngine,
      clientLearningSystem,
      revenueEngine
    }
  }, [extendedData])

  // Generate AI analytics
  const analytics = useMemo(() => {
    const schedulingInsights = aiEngines.schedulingEngine.generateSchedulingInsights()
    const clientInsights = aiEngines.clientLearningSystem.getInsights()
    const revenueInsights = aiEngines.revenueEngine.generateOptimizationInsights()
    const revenueMetrics = aiEngines.revenueEngine.calculateRevenueMetrics()
    const serviceProfitability = aiEngines.revenueEngine.getServiceProfitability()
    const clientProfiles = aiEngines.clientLearningSystem.getAllClientProfiles()

    return {
      schedulingInsights,
      clientInsights,
      revenueInsights,
      revenueMetrics,
      serviceProfitability,
      clientProfiles
    }
  }, [aiEngines])

  // Generate smart suggestions for demo scenario
  const smartSuggestions = useMemo(() => {
    return aiEngines.schedulingEngine.generateTimeSlotRecommendations(
      selectedDate,
      'Signature Haircut',
      60,
      1, // Barber ID
      1  // Client ID
    )
  }, [aiEngines.schedulingEngine, selectedDate])

  const handleTimeSlotSelect = (timeSlot: TimeSlotRecommendation) => {
    // TODO: Replace with toast notification: `Selected: ${timeSlot.start_time.toLocaleTimeString()} with ${timeSlot.confidence_score}% confidence`
  }

  const handleInsightAction = (insight: any, action: string) => {
    // TODO: Replace with toast notification: `Action: ${action}\nInsight: ${insight.title}`
  }

  // Mobile demo event handlers
  const handleAppointmentClick = (appointment: any) => {
    // TODO: Replace with toast notification: `Appointment: ${appointment.client_name}\nService: ${appointment.service_name}\nTime: ${new Date(appointment.start_time).toLocaleTimeString()}`
  }

  const handleTimeSlotClick = (date: Date, barberId: number, hour: number, minute: number) => {
    // TODO: Replace with toast notification: `New appointment slot:\nDate: ${date.toLocaleDateString()}\nTime: ${hour}:${minute.toString().padStart(2, '0')}\nBarber ID: ${barberId}`
  }

  const handleBarberSelect = (barberId: number) => {
    const barber = sampleBarbers.find(b => b.id === barberId)
    // TODO: Replace with toast notification: `Selected barber: ${barber?.name || barber?.first_name}`
  }

  const handleNewAppointment = () => {
    // TODO: Replace with toast notification: 'Opening new appointment dialog...'
  }

  const renderDemoHeader = () => (
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white p-8 rounded-lg mb-8">
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 bg-white/20 rounded-full">
          <SparklesIcon className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-2">AI-Powered Appointment Optimization</h1>
          <p className="text-blue-100 text-lg">
            Machine learning-driven insights for Six Figure Barber success
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5" />
              <div>
                <p className="text-sm opacity-90">Revenue Optimization</p>
                <p className="text-xl font-bold">${analytics.revenueMetrics.total_revenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserGroupIcon className="h-5 w-5" />
              <div>
                <p className="text-sm opacity-90">Client Insights</p>
                <p className="text-xl font-bold">{analytics.clientProfiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5" />
              <div>
                <p className="text-sm opacity-90">Smart Suggestions</p>
                <p className="text-xl font-bold">{smartSuggestions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowTrendingUpIcon className="h-5 w-5" />
              <div>
                <p className="text-sm opacity-90">Optimization Score</p>
                <p className="text-xl font-bold">{Math.round(analytics.revenueMetrics.utilization_rate)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {renderDemoHeader()}

        <Tabs value={activeDemo} onValueChange={(value) => setActiveDemo(value as any)}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="calendar" className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4" />
              <span>AI Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center space-x-2">
              <span className="text-lg">📱</span>
              <span>Mobile</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center space-x-2">
              <SparklesIcon className="h-4 w-4" />
              <span>Smart Suggestions</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <LightBulbIcon className="h-4 w-4" />
              <span>AI Insights</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <ChartBarIcon className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Alert>
              <InformationCircleIcon className="h-4 w-4" />
              <AlertTitle>Live AI-Enhanced Calendar</AlertTitle>
              <AlertDescription>
                This calendar integrates all AI features: smart time suggestions, real-time insights, 
                and revenue optimization. Click on time slots to see AI recommendations.
              </AlertDescription>
            </Alert>

            <div className="h-[800px] border border-gray-200 rounded-lg overflow-hidden mt-6">
              <AIEnhancedCalendarLayout
                barbers={sampleBarbers}
                appointments={sampleAppointments}
                availability={sampleAvailability}
                currentDate={selectedDate}
                enableAIInsights={true}
                enableSmartSuggestions={true}
                showAISidebar={true}
                onDateChange={setSelectedDate}
                onInsightAction={handleInsightAction}
              />
            </div>
          </TabsContent>

          <TabsContent value="mobile">
            <Alert>
              <InformationCircleIcon className="h-4 w-4" />
              <AlertTitle>Advanced Mobile Calendar Experience</AlertTitle>
              <AlertDescription>
                Touch-optimized mobile calendar with swipe navigation, haptic feedback, and AI insights drawer. 
                Automatically adapts to different screen sizes and touch interactions.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mt-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant={showMobileDemo ? "default" : "outline"}
                  onClick={() => setShowMobileDemo(!showMobileDemo)}
                  className="flex items-center space-x-2"
                >
                  <span>{showMobileDemo ? "Hide" : "Show"} Mobile View</span>
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                👆 Tap to toggle mobile simulation
              </div>
            </div>

            <div className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 mt-6 ${
              showMobileDemo ? 'h-[600px] max-w-sm mx-auto' : 'h-[800px]'
            }`}>
              <ResponsiveMobileCalendar
                barbers={sampleBarbers}
                appointments={sampleAppointments}
                availability={sampleAvailability}
                currentDate={selectedDate}
                enableAIInsights={true}
                enableSmartSuggestions={true}
                forceMobile={showMobileDemo}
                onDateChange={setSelectedDate}
                onAppointmentClick={handleAppointmentClick}
                onTimeSlotClick={handleTimeSlotClick}
                onBarberSelect={handleBarberSelect}
                onNewAppointment={handleNewAppointment}
                onAIInsightAction={handleInsightAction}
              />
            </div>
          </TabsContent>

          <TabsContent value="suggestions">
            <Alert>
              <SparklesIcon className="h-4 w-4" />
              <AlertTitle>Smart Time Slot Suggestions</AlertTitle>
              <AlertDescription>
                AI analyzes client preferences, revenue potential, and Six Figure Barber methodology 
                to recommend optimal appointment times.
              </AlertDescription>
            </Alert>

            <div className="mt-6">
              <SmartTimeSuggestions
                selectedDate={selectedDate}
                serviceName="Signature Haircut"
                serviceDuration={60}
                barberId={1}
                clientId={1}
                appointments={extendedData}
                availability={sampleAvailability}
                onTimeSlotSelect={handleTimeSlotSelect}
              />
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <Alert>
              <LightBulbIcon className="h-4 w-4" />
              <AlertTitle>AI Business Insights</AlertTitle>
              <AlertDescription>
                Real-time analysis of scheduling efficiency, client behavior, and revenue optimization 
                opportunities based on your business data.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ChartBarIcon className="h-5 w-5" />
                      <span>Revenue Analytics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-700">
                          ${analytics.revenueMetrics.total_revenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-green-600">Total Revenue</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-700">
                          ${analytics.revenueMetrics.revenue_per_hour}
                        </p>
                        <p className="text-sm text-blue-600">Revenue/Hour</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-700">
                          {analytics.revenueMetrics.utilization_rate}%
                        </p>
                        <p className="text-sm text-purple-600">Utilization</p>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-700">
                          {analytics.revenueMetrics.client_retention_rate}%
                        </p>
                        <p className="text-sm text-amber-600">Retention Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <AIInsightsSidebar
                  appointments={extendedData}
                  availability={sampleAvailability}
                  selectedDate={selectedDate}
                  onInsightAction={handleInsightAction}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Alert>
              <AcademicCapIcon className="h-4 w-4" />
              <AlertTitle>Advanced AI Analytics</AlertTitle>
              <AlertDescription>
                Deep learning analysis of client behavior patterns, retention risk assessment, 
                and personalized business growth recommendations.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserGroupIcon className="h-5 w-5" />
                    <span>Client Behavior Profiles</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.clientProfiles.slice(0, 6).map((profile, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Client #{profile.client_id}</h4>
                          <Badge 
                            variant={
                              profile.loyalty_tier === 'champion' ? 'default' :
                              profile.loyalty_tier === 'vip' ? 'secondary' : 'outline'
                            }
                          >
                            {profile.loyalty_tier.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">LTV:</span> 
                            <span className="font-medium ml-1">${profile.predicted_lifetime_value}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Risk:</span> 
                            <span className={`font-medium ml-1 ${
                              profile.retention_risk_score > 70 ? 'text-red-600' :
                              profile.retention_risk_score > 40 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {profile.retention_risk_score}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CurrencyDollarIcon className="h-5 w-5" />
                    <span>Revenue Optimization</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.revenueInsights.slice(0, 4).map((insight, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <Badge 
                            variant={
                              insight.priority === 'high' ? 'destructive' :
                              insight.priority === 'medium' ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {insight.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-600 font-medium">
                            +${Math.round(insight.potential_monthly_impact)} monthly
                          </span>
                          <span className="text-blue-600">
                            {insight.six_fb_methodology_alignment}% 6FB aligned
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Six Figure Barber Methodology Notice */}
        <Card className="mt-8 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-amber-100">
                <StarIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 mb-2">
                  Powered by Six Figure Barber Methodology
                </h3>
                <p className="text-amber-800 leading-relaxed">
                  All AI recommendations are aligned with Six Figure Barber principles, focusing on 
                  premium positioning, client value creation, and sustainable revenue growth. 
                  The system prioritizes long-term client relationships over short-term gains, 
                  helping barbers build a six-figure business through intelligent optimization.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Force dynamic rendering for demo pages to avoid SSR issues  
export const dynamic = 'force-dynamic'

export default AICalendarDemo