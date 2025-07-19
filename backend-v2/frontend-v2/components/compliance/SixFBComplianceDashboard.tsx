'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  TrendingUp, TrendingDown, Award, Target, AlertCircle, 
  CheckCircle2, XCircle, ArrowRight, RefreshCw, Calendar,
  DollarSign, Users, Briefcase, Megaphone, BarChart3
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/api-client-sentry'
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from '@/lib/recharts'

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
  metrics: {
    total_checks_performed: number
    checks_passed: number
    improvement_areas: Array<{
      category: string
      check_name: string
      score: number
      recommendation: string
    }>
    strengths: Array<{
      category: string
      check_name: string
      score: number
      feedback: string
    }>
  }
}

interface ImprovementTask {
  id: number
  title: string
  description: string
  category: string
  priority: 'high' | 'medium' | 'low'
  status: string
  potential_score_improvement: number
  revenue_impact: string
  effort_required: string
  resources: string[]
  created_at: string
  completed_at?: string
}

interface ComplianceHistory {
  date: string
  overall_score: number
  tier_level: string
  score_change: number
}

const categoryIcons = {
  pricing_strategy: DollarSign,
  service_portfolio: Briefcase,
  client_relationships: Users,
  business_operations: BarChart3,
  marketing_presence: Megaphone,
  revenue_optimization: TrendingUp
}

const categoryLabels = {
  pricing_strategy: 'Pricing Strategy',
  service_portfolio: 'Service Portfolio',
  client_relationships: 'Client Relationships',
  business_operations: 'Business Operations',
  marketing_presence: 'Marketing Presence',
  revenue_optimization: 'Revenue Optimization'
}

const tierColors = {
  starter: 'bg-gray-500',
  professional: 'bg-blue-500',
  premium: 'bg-purple-500',
  luxury: 'bg-yellow-500'
}

const tierDescriptions = {
  starter: 'Building your foundation',
  professional: 'Establishing your brand',
  premium: 'Commanding premium prices',
  luxury: 'Six Figure Barber Elite'
}

export default function SixFBComplianceDashboard() {
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [complianceData, setComplianceData] = useState<{
    score: ComplianceScore
    tasks: ImprovementTask[]
    history: ComplianceHistory[]
  } | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchComplianceData = async () => {
    try {
      const response = await apiRequest('/api/v2/six-fb-compliance/dashboard', {
        method: 'GET'
      })
      
      if (response.data) {
        setComplianceData({
          score: {
            overall_score: response.data.overall_score,
            tier_level: response.data.tier_level,
            category_scores: response.data.category_scores,
            last_calculated: response.data.last_calculated,
            metrics: response.data.metrics
          },
          tasks: response.data.improvement_tasks,
          history: response.data.compliance_history
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load compliance data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const recalculateScore = async () => {
    setRecalculating(true)
    try {
      const response = await apiRequest('/api/v2/six-fb-compliance/recalculate', {
        method: 'POST'
      })
      
      toast({
        title: 'Success',
        description: 'Compliance score recalculated successfully'
      })
      
      await fetchComplianceData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to recalculate score',
        variant: 'destructive'
      })
    } finally {
      setRecalculating(false)
    }
  }

  const completeTask = async (taskId: number) => {
    try {
      await apiRequest(`/api/v2/six-fb-compliance/improvement-tasks/${taskId}/complete`, {
        method: 'PUT'
      })
      
      toast({
        title: 'Success',
        description: 'Task marked as complete'
      })
      
      await fetchComplianceData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete task',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    fetchComplianceData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!complianceData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No compliance data available</AlertTitle>
        <AlertDescription>
          Click the recalculate button to generate your first compliance score.
        </AlertDescription>
      </Alert>
    )
  }

  const { score, tasks, history } = complianceData

  // Prepare data for radar chart
  const radarData = Object.entries(score.category_scores).map(([key, value]) => ({
    category: categoryLabels[key as keyof typeof categoryLabels],
    score: value,
    fullMark: 100
  }))

  // Prepare data for history chart
  const historyData = history.map(h => ({
    date: new Date(h.date).toLocaleDateString(),
    score: h.overall_score
  }))

  return (
    <div className="space-y-6">
      {/* Header with Overall Score */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Six Figure Barber Compliance</h1>
          <p className="text-muted-foreground">Track your alignment with 6FB methodology</p>
        </div>
        <Button
          onClick={recalculateScore}
          disabled={recalculating}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
          Recalculate
        </Button>
      </div>

      {/* Overall Score Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overall Compliance Score</CardTitle>
              <CardDescription>
                Last updated: {new Date(score.last_calculated).toLocaleString()}
              </CardDescription>
            </div>
            <Badge className={`${tierColors[score.tier_level as keyof typeof tierColors]} text-white`}>
              <Award className="mr-1 h-4 w-4" />
              {score.tier_level.charAt(0).toUpperCase() + score.tier_level.slice(1)} Tier
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-5xl font-bold">{score.overall_score.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">
                  {tierDescriptions[score.tier_level as keyof typeof tierDescriptions]}
                </p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{score.metrics.checks_passed} checks passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">{score.metrics.total_checks_performed - score.metrics.checks_passed} areas to improve</span>
                </div>
              </div>
            </div>
            <Progress value={score.overall_score} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Strengths and Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Top Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {score.metrics.strengths.map((strength, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{strength.check_name}</span>
                        <Badge variant="secondary">{strength.score.toFixed(0)}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{strength.feedback}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-yellow-500" />
                  Improvement Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {score.metrics.improvement_areas.map((area, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{area.check_name}</span>
                        <Badge variant="outline">{area.score.toFixed(0)}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{area.recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Your scores across all Six Figure Barber categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(score.category_scores).map(([category, categoryScore]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons]
              return (
                <Card 
                  key={category} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedCategory(category)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </CardTitle>
                      <Badge variant={categoryScore >= 75 ? 'default' : categoryScore >= 50 ? 'secondary' : 'outline'}>
                        {categoryScore.toFixed(0)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={categoryScore} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Click to view detailed checks
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {/* Priority Tasks */}
          <div className="space-y-4">
            {['high', 'medium', 'low'].map(priority => {
              const priorityTasks = tasks.filter(t => t.priority === priority && t.status === 'pending')
              if (priorityTasks.length === 0) return null
              
              return (
                <div key={priority}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Badge variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'default' : 'secondary'}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                    </Badge>
                    <span className="text-sm text-muted-foreground">({priorityTasks.length} tasks)</span>
                  </h3>
                  <div className="grid gap-4">
                    {priorityTasks.map(task => (
                      <Card key={task.id}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg">{task.title}</CardTitle>
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline">{task.category}</Badge>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">
                                  +{task.potential_score_improvement.toFixed(1)} points
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => completeTask(task.id)}
                            >
                              Complete
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm">{task.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              <span>Revenue Impact: {task.revenue_impact}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4 text-blue-500" />
                              <span>Effort: {task.effort_required}</span>
                            </div>
                          </div>
                          {task.resources.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-sm font-medium mb-1">Resources:</p>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {task.resources.map((resource, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {resource}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Score History</CardTitle>
              <CardDescription>Track your progress over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tier Progression */}
          <Card>
            <CardHeader>
              <CardTitle>Tier Progression</CardTitle>
              <CardDescription>Your journey through Six Figure Barber tiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['starter', 'professional', 'premium', 'luxury'].map((tier, index) => {
                  const tierScore = index === 0 ? 0 : index === 1 ? 60 : index === 2 ? 75 : 90
                  const isCurrentTier = tier === score.tier_level
                  const isAchieved = score.overall_score >= tierScore
                  
                  return (
                    <div key={tier} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isAchieved ? tierColors[tier as keyof typeof tierColors] : 'bg-gray-200'
                      }`}>
                        {isAchieved ? (
                          <CheckCircle2 className="h-6 w-6 text-white" />
                        ) : (
                          <XCircle className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isCurrentTier ? 'text-primary' : ''}`}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                          </span>
                          {isCurrentTier && <Badge>Current</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Requires {tierScore}% compliance score
                        </p>
                      </div>
                      <div className="text-right">
                        {isAchieved && (
                          <span className="text-sm text-green-500">Achieved</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}