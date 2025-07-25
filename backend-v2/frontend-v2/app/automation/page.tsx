'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { 
  CogIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

interface AutomationRule {
  id: number
  name: string
  category: string
  type: 'manual' | 'semi-auto' | 'ai-agent'
  status: 'active' | 'paused' | 'disabled'
  description: string
  triggers: string[]
  actions: string[]
  performance: {
    executions: number
    success_rate: number
    revenue_generated: number
  }
}

const AUTOMATION_CATEGORIES = [
  {
    id: 'upselling',
    name: 'Upselling Automation',
    icon: ArrowTrendingUpIcon,
    href: '/automation/upselling',
    description: 'Manual → Semi-Auto → AI Agent upselling controls',
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'booking',
    name: 'Booking Management',
    icon: CalendarIcon,
    href: '/automation/booking',
    description: 'Automated scheduling and confirmations',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'revenue',
    name: 'Revenue Optimization',
    icon: CurrencyDollarIcon,
    href: '/automation/revenue',
    description: 'AI-powered pricing and revenue strategies',
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'workflows',
    name: 'Workflow Builder',
    icon: ArrowPathIcon,
    href: '/automation/workflows',
    description: 'Create custom automation workflows',
    color: 'bg-orange-100 text-orange-600'
  }
]

export default function AutomationPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }

        setUser(userData)

        // Mock automation rules data
        const mockRules: AutomationRule[] = [
          {
            id: 1,
            name: "New Client Welcome Series",
            category: "communication",
            type: "semi-auto",
            status: "active",
            description: "Automatically send welcome messages and follow-ups to new clients",
            triggers: ["client_registration", "first_appointment_booked"],
            actions: ["send_welcome_email", "schedule_follow_up", "add_to_newsletter"],
            performance: {
              executions: 45,
              success_rate: 96.7,
              revenue_generated: 2340
            }
          },
          {
            id: 2,
            name: "Premium Service Upselling",
            category: "upselling",
            type: "ai-agent",
            status: "active",
            description: "AI agent identifies and suggests premium services based on client history",
            triggers: ["appointment_booking", "service_completion"],
            actions: ["analyze_client_profile", "suggest_premium_services", "track_conversion"],
            performance: {
              executions: 128,
              success_rate: 73.4,
              revenue_generated: 5670
            }
          },
          {
            id: 3,
            name: "Appointment Reminder System",
            category: "booking",
            type: "manual",
            status: "active",
            description: "Send automated reminders 24 hours before appointments",
            triggers: ["appointment_scheduled"],
            actions: ["send_sms_reminder", "send_email_reminder"],
            performance: {
              executions: 234,
              success_rate: 98.9,
              revenue_generated: 890
            }
          },
          {
            id: 4,
            name: "Dynamic Pricing Optimizer",
            category: "revenue",
            type: "ai-agent",
            status: "paused",
            description: "Automatically adjust pricing based on demand and time slots",
            triggers: ["low_demand_period", "high_demand_period"],
            actions: ["adjust_pricing", "send_promotional_offers"],
            performance: {
              executions: 67,
              success_rate: 82.1,
              revenue_generated: 3200
            }
          }
        ]

        setAutomationRules(mockRules)

      } catch (err) {
        console.error('Failed to load automation data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return <PageLoading message="Loading automation dashboard..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user) {
    return null
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-gray-100 text-gray-600'
      case 'semi-auto': return 'bg-blue-100 text-blue-600'
      case 'ai-agent': return 'bg-purple-100 text-purple-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-600'
      case 'paused': return 'bg-yellow-100 text-yellow-600'
      case 'disabled': return 'bg-red-100 text-red-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayIcon className="w-4 h-4" />
      case 'paused': return <PauseIcon className="w-4 h-4" />
      case 'disabled': return <ExclamationTriangleIcon className="w-4 h-4" />
      default: return null
    }
  }

  const totalRevenue = automationRules.reduce((sum, rule) => sum + rule.performance.revenue_generated, 0)
  const activeRules = automationRules.filter(rule => rule.status === 'active').length
  const avgSuccessRate = automationRules.reduce((sum, rule) => sum + rule.performance.success_rate, 0) / automationRules.length

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
              >
                ← Dashboard
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <CogIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Business Automation
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manual → Semi-Auto → AI-powered business automation
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                leftIcon={<AdjustmentsHorizontalIcon className="w-5 h-5" />}
              >
                Global Settings
              </Button>
              <Button
                variant="primary"
                leftIcon={<ArrowPathIcon className="w-5 h-5" />}
              >
                Create Workflow
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <Badge variant="secondary">{activeRules} active</Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {automationRules.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Automations
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Revenue Generated
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {avgSuccessRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Average Success Rate
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                47h
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Time Saved/Month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Automation Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {AUTOMATION_CATEGORIES.map((category) => {
            const Icon = category.icon
            return (
              <Card
                key={category.id}
                variant="elevated"
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(category.href)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${category.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {category.description}
                  </p>
                  <div className="flex items-center text-primary-600 dark:text-primary-400">
                    <span className="text-sm font-medium">Configure</span>
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Automation Rules */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Active Rules</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="space-y-4">
              {automationRules.map((rule) => (
                <Card key={rule.id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{rule.name}</h3>
                          <Badge className={getTypeColor(rule.type)}>
                            {rule.type.replace('-', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(rule.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(rule.status)}
                              <span>{rule.status}</span>
                            </div>
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {rule.description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-500">Executions</span>
                            <p className="text-blue-600 font-bold">{rule.performance.executions}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Success Rate</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={rule.performance.success_rate} className="flex-1 h-2" />
                              <span className="text-green-600 font-bold text-sm">
                                {rule.performance.success_rate}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Revenue Generated</span>
                            <p className="text-green-600 font-bold">
                              ${rule.performance.revenue_generated.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={rule.status === 'active'} 
                          onChange={() => {}} 
                        />
                        <Button size="sm" variant="outline">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Automation Templates</CardTitle>
                <CardDescription>
                  Pre-built automation workflows for common business scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ArrowPathIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Automation templates will be available soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Automation Analytics</CardTitle>
                <CardDescription>
                  Performance insights and optimization recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Detailed automation analytics coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}