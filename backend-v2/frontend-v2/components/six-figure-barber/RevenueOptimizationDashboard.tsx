"use client"

/**
 * Revenue Optimization Dashboard
 * 
 * Comprehensive revenue tracking and optimization interface aligned with
 * Six Figure Barber methodology for maximizing income potential.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  Users,
  Scissors,
  ArrowUp,
  ArrowDown,
  Plus,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Lightbulb
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from '@/lib/recharts-dynamic'

import { 
  getRevenueMetrics, 
  getRevenueGoalProgress, 
  createRevenueGoal,
  RevenueMetrics, 
  RevenueGoalProgress,
  RevenueGoalCreateRequest 
} from '@/lib/six-figure-barber-api'

interface RevenueOptimizationDashboardProps {
  className?: string
}

const CHART_COLORS = {
  primary: '#2563eb',
  secondary: '#10b981',
  tertiary: '#f59e0b',
  quaternary: '#ef4444',
  quinary: '#8b5cf6'
}

export function RevenueOptimizationDashboard({ className }: RevenueOptimizationDashboardProps) {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [goalProgress, setGoalProgress] = useState<RevenueGoalProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [newGoal, setNewGoal] = useState<Partial<RevenueGoalCreateRequest>>({
    goal_name: '',
    target_annual_revenue: 0,
    start_date: new Date().toISOString().split('T')[0],
    target_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    sfb_principle_focus: 'revenue_optimization'
  })

  const loadData = async (date?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const [metricsData, progressData] = await Promise.all([
        getRevenueMetrics(date),
        getRevenueGoalProgress()
      ])
      
      setMetrics(metricsData)
      setGoalProgress(progressData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 
                          typeof err === 'string' ? err : 
                          'No revenue data available yet. Create some bookings to see analytics.'
      setError(errorMessage)
      console.error('Failed to load revenue optimization data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedDate)
  }, [selectedDate])

  const handleCreateGoal = async () => {
    try {
      if (!newGoal.goal_name || !newGoal.target_annual_revenue) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please fill in all required fields"
        })
        return
      }

      await createRevenueGoal(newGoal as RevenueGoalCreateRequest)
      
      toast({
        title: "Goal Created",
        description: `Revenue goal "${newGoal.goal_name}" has been created successfully`
      })
      
      setShowGoalDialog(false)
      setNewGoal({
        goal_name: '',
        target_annual_revenue: 0,
        start_date: new Date().toISOString().split('T')[0],
        target_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        sfb_principle_focus: 'revenue_optimization'
      })
      
      // Reload data to show new goal
      loadData(selectedDate)
    } catch (err) {
      console.error('Failed to create revenue goal:', err)
    }
  }

  const getVarianceIndicator = (variance: number) => {
    if (variance > 0) {
      return {
        icon: ArrowUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        label: 'Above Target'
      }
    } else if (variance < 0) {
      return {
        icon: ArrowDown,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        label: 'Below Target'
      }
    } else {
      return {
        icon: Target,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        label: 'On Target'
      }
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
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
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Revenue Data Yet</AlertTitle>
          <AlertDescription>
            Your Six Figure Barber analytics will appear here once you have bookings and revenue data. 
            Start taking appointments to see detailed revenue insights and optimization recommendations.
            <Button 
              onClick={() => loadData(selectedDate)} 
              variant="outline" 
              size="sm" 
              className="ml-4"
            >
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
        
        {/* Show a placeholder/demo view */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Revenue Overview (Demo Data)
            </CardTitle>
            <CardDescription>
              This is how your revenue analytics will look with actual booking data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-400">$0</div>
                <div className="text-sm text-gray-500">Today's Revenue</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-400">0</div>
                <div className="text-sm text-gray-500">Appointments</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-400">$0</div>
                <div className="text-sm text-gray-500">Average Ticket</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!metrics || !goalProgress) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Revenue Data</AlertTitle>
          <AlertDescription>
            Revenue metrics are not available. Complete some appointments to see your revenue analytics.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const variance = getVarianceIndicator(metrics.variance_percentage)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue Optimization</h2>
          <p className="text-muted-foreground">
            Track and optimize your revenue using Six Figure Barber methodology
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Set Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Revenue Goal</DialogTitle>
                <DialogDescription>
                  Set a new Six Figure Barber revenue goal to track your progress
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goal-name">Goal Name</Label>
                  <Input
                    id="goal-name"
                    value={newGoal.goal_name}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, goal_name: e.target.value }))}
                    placeholder="e.g., Six Figure Achievement 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="target-revenue">Annual Revenue Target</Label>
                  <Input
                    id="target-revenue"
                    type="number"
                    value={newGoal.target_annual_revenue}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_annual_revenue: parseFloat(e.target.value) }))}
                    placeholder="100000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={newGoal.start_date}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="target-date">Target Date</Label>
                    <Input
                      id="target-date"
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="principle">Primary Focus</Label>
                  <Select 
                    value={newGoal.sfb_principle_focus} 
                    onValueChange={(value) => setNewGoal(prev => ({ ...prev, sfb_principle_focus: value }))}
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGoalDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGoal}>
                  Create Goal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.daily_revenue.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${variance.color}`}>
              <variance.icon className="mr-1 h-3 w-3" />
              {Math.abs(metrics.variance_percentage).toFixed(1)}% {variance.label}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Ticket</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.average_ticket.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.service_count} services completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upsell Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.upsell_revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.premium_service_percentage.toFixed(1)}% premium services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Count</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.client_count}</div>
            <p className="text-xs text-muted-foreground">
              Unique clients served today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Revenue Goal Progress
          </CardTitle>
          <CardDescription>
            Track your progress toward Six Figure Barber revenue goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{goalProgress.overall_pace.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Overall Pace</p>
            </div>
            <Badge variant={goalProgress.overall_pace >= 100 ? 'default' : 
                           goalProgress.overall_pace >= 80 ? 'secondary' : 'destructive'}>
              {goalProgress.overall_pace >= 100 ? 'Exceeding' :
               goalProgress.overall_pace >= 80 ? 'On Track' : 'Behind'}
            </Badge>
          </div>
          
          {goalProgress.goals_progress.map((goal, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{goal.goal_name}</h4>
                <span className="text-sm text-muted-foreground">
                  ${goal.current_revenue?.toLocaleString()} / ${goal.target_revenue?.toLocaleString()}
                </span>
              </div>
              <Progress value={goal.progress_percentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{goal.progress_percentage?.toFixed(1)}% complete</span>
                <span>{goal.days_remaining} days remaining</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Insights and Optimization Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Revenue Insights
            </CardTitle>
            <CardDescription>
              AI-powered insights from your revenue data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.insights.map((insight, index) => (
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
              <TrendingUp className="h-5 w-5" />
              Optimization Opportunities
            </CardTitle>
            <CardDescription>
              Actionable steps to increase revenue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.optimization_opportunities.map((opportunity, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-medium">{opportunity.title}</h4>
                  <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                  {opportunity.potential_increase && (
                    <p className="text-sm font-medium text-green-600">
                      Potential increase: ${opportunity.potential_increase.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Goal Recommendations */}
      {goalProgress.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goal Recommendations
            </CardTitle>
            <CardDescription>
              Specific actions to achieve your revenue goals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {goalProgress.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-medium">{recommendation.title}</h4>
                  <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                  {recommendation.priority && (
                    <Badge variant={recommendation.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                      {recommendation.priority} priority
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}