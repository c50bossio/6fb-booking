"use client"

/**
 * Professional Growth Tracking Dashboard
 * 
 * Comprehensive professional development tracking and milestone system aligned with
 * Six Figure Barber methodology for scaling business growth and personal development.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { 
  Award, 
  TrendingUp, 
  Target, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Star,
  Users,
  DollarSign,
  BarChart3,
  LineChart,
  Plus,
  BookOpen,
  Lightbulb,
  Rocket,
  Trophy,
  Building,
  Briefcase,
  GraduationCap,
  Zap,
  ArrowUp
} from 'lucide-react'
import { LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import { 
  getGrowthMetrics,
  getDevelopmentPlans,
  GrowthMetrics,
  DevelopmentPlans
} from '@/lib/six-figure-barber-api'

interface ProfessionalGrowthTrackingProps {
  className?: string
}

// Growth milestone categories
const GROWTH_CATEGORIES = {
  'technical_skills': {
    name: 'Technical Skills',
    description: 'Barbering techniques, tools mastery, and service expertise',
    icon: GraduationCap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  'business_development': {
    name: 'Business Development',
    description: 'Revenue growth, client acquisition, and business expansion',
    icon: Building,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  'brand_building': {
    name: 'Brand Building',
    description: 'Personal brand, marketing, and professional reputation',
    icon: Star,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  'leadership': {
    name: 'Leadership',
    description: 'Team management, mentoring, and industry leadership',
    icon: Trophy,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  'innovation': {
    name: 'Innovation',
    description: 'Service innovation, process improvement, and trendsetting',
    icon: Lightbulb,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
}

const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444']

export function ProfessionalGrowthTracking({ className }: ProfessionalGrowthTrackingProps) {
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null)
  const [developmentPlans, setDevelopmentPlans] = useState<DevelopmentPlans | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreatePlan, setShowCreatePlan] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [metrics, plans] = await Promise.all([
        getGrowthMetrics(),
        getDevelopmentPlans()
      ])
      
      setGrowthMetrics(metrics)
      setDevelopmentPlans(plans)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load growth data'
      setError(errorMessage)
      console.error('Failed to load professional growth data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressBadgeVariant = (progress: number) => {
    if (progress >= 90) return 'default'
    if (progress >= 75) return 'secondary'
    if (progress >= 50) return 'outline'
    return 'destructive'
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Professional Growth Data Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              onClick={loadData} 
              variant="outline" 
              size="sm" 
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!growthMetrics || !developmentPlans) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Growth Data</AlertTitle>
          <AlertDescription>
            Professional growth tracking data is not available. Start setting development goals to track your progress.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Professional Growth Tracking</h2>
          <p className="text-muted-foreground">
            Track your development journey with Six Figure Barber methodology
          </p>
        </div>
        <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Development Plan
            </Button>
          </DialogTrigger>
          <CreateDevelopmentPlanDialog onClose={() => setShowCreatePlan(false)} onSuccess={loadData} />
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Development Plans</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Growth Score Overview */}
          <Card className="border-2 border-primary">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Overall Growth Score</CardTitle>
              <CardDescription>
                Comprehensive professional development assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className={`text-4xl font-bold ${getScoreColor(growthMetrics.overall_growth_score)}`}>
                {growthMetrics.overall_growth_score.toFixed(1)}
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <Progress value={growthMetrics.overall_growth_score} className="w-full h-3" />
              <Badge variant={getProgressBadgeVariant(growthMetrics.overall_growth_score)}>
                {growthMetrics.overall_growth_score >= 90 ? 'Industry Leader' :
                 growthMetrics.overall_growth_score >= 75 ? 'Advanced Professional' :
                 growthMetrics.overall_growth_score >= 50 ? 'Developing Professional' : 'Early Development'}
              </Badge>
            </CardContent>
          </Card>

          {/* Key Growth Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  growthMetrics.monthly_revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {growthMetrics.monthly_revenue_growth > 0 ? '+' : ''}{growthMetrics.monthly_revenue_growth.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Monthly revenue growth rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Client Base Growth</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  growthMetrics.client_base_growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {growthMetrics.client_base_growth > 0 ? '+' : ''}{growthMetrics.client_base_growth.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Client acquisition growth
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Development Plans</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{growthMetrics.active_development_plans}</div>
                <p className="text-xs text-muted-foreground">
                  Plans in progress
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Growth Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(GROWTH_CATEGORIES).map(([categoryKey, categoryInfo]) => {
              const CategoryIcon = categoryInfo.icon
              // Mock data for demonstration - in real app this would come from API
              const categoryScore = 70 + Math.random() * 30
              
              return (
                <Card key={categoryKey} className={`${categoryInfo.borderColor} border-2`}>
                  <CardHeader className={categoryInfo.bgColor}>
                    <CardTitle className="flex items-center gap-2">
                      <CategoryIcon className={`h-5 w-5 ${categoryInfo.color}`} />
                      {categoryInfo.name}
                    </CardTitle>
                    <CardDescription>{categoryInfo.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progress</span>
                        <span className={`text-lg font-bold ${getScoreColor(categoryScore)}`}>
                          {categoryScore.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={categoryScore} className="h-2" />
                      <Badge variant={getProgressBadgeVariant(categoryScore)} className="text-xs">
                        {categoryScore >= 90 ? 'Mastery' :
                         categoryScore >= 75 ? 'Advanced' :
                         categoryScore >= 50 ? 'Developing' : 'Beginner'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          {/* Active Development Plans */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {developmentPlans.active_plans.map((plan) => (
              <Card key={plan.id} className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.plan_name}
                    <Badge variant={getProgressBadgeVariant(plan.completion_percentage)}>
                      {plan.completion_percentage.toFixed(0)}%
                    </Badge>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{plan.completion_percentage.toFixed(1)}% Complete</span>
                    </div>
                    <Progress value={plan.completion_percentage} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Focus Area</p>
                      <p className="font-medium">{plan.methodology_focus}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Phase</p>
                      <p className="font-medium">{plan.current_phase}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Timeline</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Started: {new Date(plan.start_date).toLocaleDateString()}</span>
                      <span>Target: {new Date(plan.target_completion_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {plan.next_milestone && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium">Next Milestone</p>
                      <p className="text-xs text-muted-foreground">{plan.next_milestone.title || plan.next_milestone.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Development Plan Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Development Score
                </CardTitle>
                <CardDescription>
                  Overall professional development assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getScoreColor(developmentPlans.overall_development_score)}`}>
                  {developmentPlans.overall_development_score.toFixed(1)}
                </div>
                <Progress value={developmentPlans.overall_development_score} className="mt-2 h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  Across all active development plans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Methodology Alignment
                </CardTitle>
                <CardDescription>
                  Six Figure Barber methodology adherence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getScoreColor(developmentPlans.six_fb_alignment)}`}>
                  {developmentPlans.six_fb_alignment.toFixed(1)}%
                </div>
                <Progress value={developmentPlans.six_fb_alignment} className="mt-2 h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  Alignment with core principles
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          {/* Milestone Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Milestone Progress
              </CardTitle>
              <CardDescription>
                Track your achievement milestones across development areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {growthMetrics.milestone_progress && Object.entries(growthMetrics.milestone_progress).map(([milestone, progress]: [string, any]) => (
                  <div key={milestone} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{progress.title || milestone}</h4>
                      <Badge variant={progress.completed ? 'default' : 'secondary'}>
                        {progress.completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{progress.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress: {progress.progress_percentage || 0}%</span>
                      {progress.target_date && (
                        <span>Target: {new Date(progress.target_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    <Progress value={progress.progress_percentage || 0} className="mt-2 h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Growth Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Growth Insights
                </CardTitle>
                <CardDescription>
                  AI-powered insights from your development data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {growthMetrics.growth_insights.map((insight, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 space-y-1">
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.impact && (
                      <Badge variant="outline" className="text-xs">
                        Impact: {insight.impact}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Development Recommendations
                </CardTitle>
                <CardDescription>
                  Actionable steps for professional growth
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {growthMetrics.development_recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-medium">{recommendation.title}</h4>
                      <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                      {recommendation.priority && (
                        <Badge variant={
                          recommendation.priority === 'high' ? 'destructive' :
                          recommendation.priority === 'medium' ? 'secondary' : 'default'
                        } className="text-xs">
                          {recommendation.priority} priority
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Six Figure Barber Growth Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Six Figure Barber Growth Strategy
              </CardTitle>
              <CardDescription>
                Strategic development roadmap based on methodology principles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Revenue Mastery</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Focus on premium service development and pricing strategies to achieve six-figure income goals
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Client Relationship Excellence</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Build deeper client relationships through personalized service and consistent value delivery
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">Business Systems</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Develop efficient systems and processes that support scalable business growth
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-900">Professional Brand</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Establish yourself as a premium service provider through continuous skill development and brand building
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Create Development Plan Dialog Component
function CreateDevelopmentPlanDialog({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [planData, setPlanData] = useState({
    plan_name: '',
    description: '',
    methodology_focus: 'revenue_optimization',
    target_completion_months: 6
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Here you would typically call an API to create the development plan
    // For now, we'll just show a success message
    toast({
      title: "Development Plan Created",
      description: `"${planData.plan_name}" has been added to your professional growth tracking.`,
    })
    
    onClose()
    onSuccess()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create Development Plan</DialogTitle>
        <DialogDescription>
          Set up a new professional development plan aligned with Six Figure Barber methodology
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="plan_name">Plan Name</Label>
          <Input
            id="plan_name"
            value={planData.plan_name}
            onChange={(e) => setPlanData(prev => ({ ...prev, plan_name: e.target.value }))}
            placeholder="e.g., Advanced Technical Skills Development"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={planData.description}
            onChange={(e) => setPlanData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your development goals and objectives..."
            required
          />
        </div>
        <div>
          <Label htmlFor="methodology_focus">Primary Focus Area</Label>
          <Select
            value={planData.methodology_focus}
            onValueChange={(value) => setPlanData(prev => ({ ...prev, methodology_focus: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue_optimization">Revenue Optimization</SelectItem>
              <SelectItem value="client_value_maximization">Client Value Maximization</SelectItem>
              <SelectItem value="service_delivery_excellence">Service Excellence</SelectItem>
              <SelectItem value="business_efficiency">Business Efficiency</SelectItem>
              <SelectItem value="professional_growth">Professional Growth</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="target_months">Target Completion (Months)</Label>
          <Select
            value={planData.target_completion_months.toString()}
            onValueChange={(value) => setPlanData(prev => ({ ...prev, target_completion_months: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
              <SelectItem value="24">24 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create Plan</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}