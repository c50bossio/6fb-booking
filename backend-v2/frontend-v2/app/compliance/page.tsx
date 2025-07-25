'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ScissorsIcon,
  TrophyIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline'

interface ComplianceScore {
  overall_score: number
  tier_level: string
  category_scores: {
    pricing_strategy: number
    service_portfolio: number
    client_relationships: number
    business_operations: number
    marketing_presence: number
    revenue_optimization: number
  }
  last_calculated: string
}

interface ImprovementTask {
  id: number
  title: string
  description: string
  category: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed'
  potential_score_improvement: number
  revenue_impact: string
  effort_required: string
}

const TIER_INFO = {
  starter: { min: 0, max: 39, color: 'bg-red-500', label: 'Starter' },
  professional: { min: 40, max: 69, color: 'bg-yellow-500', label: 'Professional' },
  premium: { min: 70, max: 89, color: 'bg-blue-500', label: 'Premium' },
  luxury: { min: 90, max: 100, color: 'bg-green-500', label: 'Luxury' }
}

const CATEGORY_ICONS = {
  pricing_strategy: CurrencyDollarIcon,
  service_portfolio: ScissorsIcon,
  client_relationships: UsersIcon,
  business_operations: ChartBarIcon,
  marketing_presence: StarIcon,
  revenue_optimization: ArrowTrendingUpIcon
}

export default function CompliancePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [complianceScore, setComplianceScore] = useState<ComplianceScore | null>(null)
  const [improvementTasks, setImprovementTasks] = useState<ImprovementTask[]>([])
  const [activeTab, setActiveTab] = useState('overview')

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

        // Load compliance score (mock data for now)
        const mockComplianceScore: ComplianceScore = {
          overall_score: 67,
          tier_level: 'professional',
          category_scores: {
            pricing_strategy: 72,
            service_portfolio: 65,
            client_relationships: 80,
            business_operations: 58,
            marketing_presence: 45,
            revenue_optimization: 62
          },
          last_calculated: new Date().toISOString()
        }

        setComplianceScore(mockComplianceScore)

        // Load improvement tasks (mock data)
        const mockTasks: ImprovementTask[] = [
          {
            id: 1,
            title: "Implement Premium Service Tier",
            description: "Add luxury services priced above $75 to reach premium tier pricing standards",
            category: "pricing_strategy",
            priority: "high",
            status: "pending",
            potential_score_improvement: 8,
            revenue_impact: "$2,000+/month",
            effort_required: "2-3 weeks"
          },
          {
            id: 2,
            title: "Launch Social Media Presence",
            description: "Establish consistent Instagram and Facebook presence with client showcases",
            category: "marketing_presence",
            priority: "high",
            status: "pending",
            potential_score_improvement: 12,
            revenue_impact: "$1,500+/month",
            effort_required: "1 week setup"
          },
          {
            id: 3,
            title: "Optimize Booking Efficiency",
            description: "Reduce time between appointments and implement upselling protocols",
            category: "business_operations",
            priority: "medium",
            status: "in_progress",
            potential_score_improvement: 6,
            revenue_impact: "$800+/month",
            effort_required: "Ongoing"
          }
        ]

        setImprovementTasks(mockTasks)

      } catch (err) {
        console.error('Failed to load compliance data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return <PageLoading message="Loading 6FB compliance dashboard..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user || !complianceScore) {
    return null
  }

  const getTierInfo = (score: number) => {
    for (const [key, info] of Object.entries(TIER_INFO)) {
      if (score >= info.min && score <= info.max) {
        return { ...info, key }
      }
    }
    return TIER_INFO.starter
  }

  const currentTier = getTierInfo(complianceScore.overall_score)
  const nextTier = complianceScore.overall_score < 100 ? 
    getTierInfo(complianceScore.overall_score + 1) : null

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="w-4 h-4 text-green-600" />
      case 'in_progress': return <ClockIcon className="w-4 h-4 text-blue-600" />
      case 'pending': return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
      default: return null
    }
  }

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
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <AcademicCapIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    6FB Compliance Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Track your Six Figure Barber methodology alignment
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                leftIcon={<BookOpenIcon className="w-5 h-5" />}
                onClick={() => window.open('https://sixfigurebarber.com/methodology', '_blank')}
              >
                6FB Guide
              </Button>
              <Button
                variant="primary"
                leftIcon={<TrophyIcon className="w-5 h-5" />}
              >
                Recalculate Score
              </Button>
            </div>
          </div>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall Score */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Overall Compliance Score</CardTitle>
                  <CardDescription>Your current 6FB methodology alignment</CardDescription>
                </div>
                <Badge variant={currentTier.key as any} className={`${currentTier.color} text-white`}>
                  {currentTier.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {complianceScore.overall_score}%
                  </span>
                  {nextTier && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Next tier: {nextTier.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {nextTier.min - complianceScore.overall_score} points needed
                      </p>
                    </div>
                  )}
                </div>
                <Progress value={complianceScore.overall_score} className="h-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last updated: {new Date(complianceScore.last_calculated).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Quick Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending Tasks</span>
                <span className="font-bold text-red-600">
                  {improvementTasks.filter(t => t.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
                <span className="font-bold text-blue-600">
                  {improvementTasks.filter(t => t.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Potential Revenue</span>
                <span className="font-bold text-green-600">$4,300+/mo</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Category Breakdown</TabsTrigger>
            <TabsTrigger value="tasks">Improvement Tasks</TabsTrigger>
            <TabsTrigger value="history">Progress History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(complianceScore.category_scores).map(([category, score]) => {
                const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]
                const categoryTier = getTierInfo(score)
                
                return (
                  <Card key={category} variant="elevated" className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <Icon className="w-6 h-6 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg capitalize">
                            {category.replace('_', ' ')}
                          </CardTitle>
                          <Badge variant={categoryTier.key as any} className="mt-1">
                            {categoryTier.label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">{score}%</span>
                          <span className="text-sm text-gray-500">
                            Target: {categoryTier.max}%
                          </span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="space-y-4">
              {improvementTasks.map((task) => (
                <Card key={task.id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(task.status)}
                          <h3 className="text-lg font-semibold">{task.title}</h3>
                          <Badge variant={getPriorityColor(task.priority)}>
                            {task.priority} priority
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {task.description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-500">Score Impact</span>
                            <p className="text-green-600 font-bold">+{task.potential_score_improvement} points</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Revenue Impact</span>
                            <p className="text-green-600 font-bold">{task.revenue_impact}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Effort Required</span>
                            <p className="text-blue-600 font-bold">{task.effort_required}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {task.status === 'pending' && (
                          <Button size="sm" variant="primary">
                            Start Task
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button size="sm" variant="secondary">
                            Mark Complete
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Compliance History</CardTitle>
                <CardDescription>
                  Track your progress over time (feature coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Historical compliance tracking will be available soon.
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