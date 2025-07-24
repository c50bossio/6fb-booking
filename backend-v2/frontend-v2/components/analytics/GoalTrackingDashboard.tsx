'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  TagIcon,
  TrophyIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  PolarAngleAxis
} from '@/lib/recharts'

interface Goal {
  id: string
  type: 'revenue' | 'clients' | 'retention' | 'services' | 'custom'
  name: string
  target: number
  current: number
  deadline: string
  startDate: string
  milestones: {
    date: string
    value: number
    achieved: boolean
  }[]
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved'
}

interface GoalTrackingDashboardProps {
  userId: number
  currentMetrics: {
    monthlyRevenue: number
    totalClients: number
    retentionRate: number
    avgTicket: number
    servicesPerClient: number
  }
  historicalData: Array<{
    date: string
    revenue: number
    clients: number
    retention: number
  }>
}

const GOAL_PRESETS = {
  six_figure: {
    name: 'Six Figure Barber',
    revenue: 100000,
    timeframe: 12
  },
  revenue_growth: {
    name: '30% Revenue Growth',
    multiplier: 1.3,
    timeframe: 6
  },
  client_base: {
    name: 'Double Client Base',
    multiplier: 2,
    timeframe: 9
  },
  premium_shift: {
    name: 'Premium Service Focus',
    avgTicketIncrease: 1.5,
    timeframe: 3
  }
}

export default function GoalTrackingDashboard({ userId, currentMetrics, historicalData }: GoalTrackingDashboardProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [showGoalCreator, setShowGoalCreator] = useState(false)
  const [newGoal, setNewGoal] = useState({
    type: 'revenue' as Goal['type'],
    name: '',
    target: 0,
    timeframe: 6
  })
  
  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    return goals.map(goal => {
      const progress = (goal.current / goal.target) * 100
      const daysTotal = Math.ceil((new Date(goal.deadline).getTime() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24))
      const daysElapsed = Math.ceil((new Date().getTime() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24))
      const expectedProgress = (daysElapsed / daysTotal) * 100
      
      return {
        ...goal,
        progress,
        expectedProgress,
        progressDiff: progress - expectedProgress,
        daysRemaining: Math.max(0, daysTotal - daysElapsed),
        requiredDailyProgress: daysElapsed < daysTotal ? (goal.target - goal.current) / (daysTotal - daysElapsed) : 0
      }
    })
  }, [goals])
  
  // Initialize with sample goals
  useEffect(() => {
    const sampleGoals: Goal[] = [
      {
        id: '1',
        type: 'revenue',
        name: 'Six Figure Annual Revenue',
        target: 100000,
        current: currentMetrics.monthlyRevenue * 12 * 0.7, // Assuming 70% of annual projection
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString(),
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(),
        milestones: [],
        status: 'on_track'
      },
      {
        id: '2',
        type: 'clients',
        name: 'Grow Client Base to 200',
        target: 200,
        current: currentMetrics.totalClients,
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
        startDate: new Date().toISOString(),
        milestones: [],
        status: currentMetrics.totalClients < 150 ? 'at_risk' : 'on_track'
      }
    ]
    setGoals(sampleGoals)
    setSelectedGoal(sampleGoals[0])
  }, [currentMetrics])
  
  // Create projection data
  const projectionData = useMemo(() => {
    if (!selectedGoal) return []
    
    const data = []
    const startDate = new Date(selectedGoal.startDate)
    const endDate = new Date(selectedGoal.deadline)
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())
    
    for (let i = 0; i <= monthsDiff; i++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + i)
      
      const targetProgress = (selectedGoal.target / monthsDiff) * i
      const actualProgress = i <= 3 ? (selectedGoal.current / 3) * i : selectedGoal.current // Assuming current is at month 3
      
      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        target: targetProgress,
        actual: actualProgress,
        projected: i > 3 ? selectedGoal.current + ((selectedGoal.target - selectedGoal.current) / (monthsDiff - 3)) * (i - 3) : null
      })
    }
    
    return data
  }, [selectedGoal])
  
  // Calculate goal achievement probability
  const achievementProbability = (goal: Goal) => {
    const progress = (goal.current / goal.target) * 100
    const timeProgress = ((new Date().getTime() - new Date(goal.startDate).getTime()) / 
                        (new Date(goal.deadline).getTime() - new Date(goal.startDate).getTime())) * 100
    
    if (progress >= timeProgress + 10) return 95
    if (progress >= timeProgress) return 80
    if (progress >= timeProgress - 10) return 60
    if (progress >= timeProgress - 20) return 40
    return 20
  }
  
  // Render goal cards
  const renderGoalCard = (goal: Goal, metrics: any) => {
    const probability = achievementProbability(goal)
    const statusColor = goal.status === 'achieved' ? 'text-green-600' :
                       goal.status === 'on_track' ? 'text-blue-600' :
                       goal.status === 'at_risk' ? 'text-yellow-600' : 'text-red-600'
    
    return (
      <Card 
        key={goal.id}
        className={`cursor-pointer transition-all ${selectedGoal?.id === goal.id ? 'ring-2 ring-blue-500' : ''}`}
        onClick={() => setSelectedGoal(goal)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-medium text-gray-900">{goal.name}</h4>
              <p className={`text-sm ${statusColor}`}>{goal.status.replace('_', ' ').toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{metrics.progress.toFixed(0)}%</p>
              <p className="text-xs text-gray-500">{metrics.daysRemaining} days left</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>${goal.current.toLocaleString()}</span>
              <span>${goal.target.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 relative">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(metrics.progress, 100)}%` }}
              />
              <div 
                className="absolute top-0 h-2 w-0.5 bg-gray-400"
                style={{ left: `${metrics.expectedProgress}%` }}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {probability >= 70 ? (
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
              ) : probability >= 50 ? (
                <CalendarIcon className="w-4 h-4 text-yellow-500" />
              ) : (
                <XCircleIcon className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs text-gray-600">{probability}% likely</span>
            </div>
            <span className="text-xs text-gray-600">
              {metrics.progressDiff > 0 ? '+' : ''}{metrics.progressDiff.toFixed(0)}% vs plan
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Render goal detail view
  const renderGoalDetail = () => {
    if (!selectedGoal) return null
    
    const metrics = progressMetrics.find(m => m.id === selectedGoal.id)
    if (!metrics) return null
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>{selectedGoal.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Progress visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Progress Over Time</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="target" stroke="#E5E7EB" fill="#F3F4F6" name="Target Path" />
                    <Area type="monotone" dataKey="actual" stroke="#3B82F6" fill="#93C5FD" name="Actual Progress" />
                    <Area type="monotone" dataKey="projected" stroke="#8B5CF6" fill="#C4B5FD" name="Projected" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Achievement Probability</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <RadialBarChart 
                    innerRadius="30%" 
                    outerRadius="90%" 
                    data={[{ value: achievementProbability(selectedGoal), fill: '#3B82F6' }]}
                    startAngle={180} 
                    endAngle={0}
                  >
                    <PolarAngleAxis 
                      type="number" 
                      domain={[0, 100]} 
                      angleAxisId={0} 
                      tick={false}
                    />
                    <RadialBar 
                      dataKey="value" 
                      cornerRadius={10} 
                      fill="#3B82F6"
                      label={{ position: 'center', fontSize: 24, fontWeight: 'bold' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <p className="text-center text-sm text-gray-600 -mt-10">
                  {achievementProbability(selectedGoal)}% chance of success
                </p>
              </div>
            </div>
            
            {/* Required performance */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-600">Daily Target</p>
                  <p className="text-lg font-bold">
                    ${metrics.requiredDailyProgress.toFixed(0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-600">Weekly Target</p>
                  <p className="text-lg font-bold">
                    ${(metrics.requiredDailyProgress * 7).toFixed(0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-600">Gap to Close</p>
                  <p className="text-lg font-bold">
                    ${(selectedGoal.target - selectedGoal.current).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-600">Time Remaining</p>
                  <p className="text-lg font-bold">
                    {metrics.daysRemaining} days
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Recommendations */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Action Plan</h4>
              <div className="space-y-2 text-sm text-gray-700">
                {metrics.progressDiff < -10 && (
                  <>
                    <p>• You're {Math.abs(metrics.progressDiff).toFixed(0)}% behind schedule - increase daily efforts</p>
                    <p>• Focus on high-value services to close the gap faster</p>
                  </>
                )}
                {selectedGoal.type === 'revenue' && metrics.requiredDailyProgress > currentMetrics.monthlyRevenue / 30 && (
                  <p>• Required daily revenue (${metrics.requiredDailyProgress.toFixed(0)}) exceeds current average - need 
                     {((metrics.requiredDailyProgress / (currentMetrics.monthlyRevenue / 30) - 1) * 100).toFixed(0)}% increase</p>
                )}
                {selectedGoal.type === 'clients' && (
                  <p>• Need to acquire {((selectedGoal.target - selectedGoal.current) / metrics.daysRemaining).toFixed(1)} new clients per day</p>
                )}
                <p>• Schedule weekly progress reviews to stay on track</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Goal Tracking & Progress</h2>
        <Button onClick={() => setShowGoalCreator(!showGoalCreator)}>
          <TagIcon className="w-4 h-4 mr-2" />
          Set New Goal
        </Button>
      </div>
      
      {/* Goal creator */}
      {showGoalCreator && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-4">Create New Goal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={newGoal.type}
                  onChange={(e) => setNewGoal({...newGoal, type: e.target.value as Goal['type']})}
                >
                  <option value="revenue">Revenue Target</option>
                  <option value="clients">Client Growth</option>
                  <option value="retention">Retention Rate</option>
                  <option value="services">Services per Client</option>
                  <option value="custom">Custom Goal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe (months)</label>
                <Input 
                  type="number" 
                  value={newGoal.timeframe}
                  onChange={(e) => setNewGoal({...newGoal, timeframe: parseInt(e.target.value)})}
                  min={1}
                  max={24}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(GOAL_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Apply preset logic
                      setNewGoal({
                        type: key.includes('revenue') || key === 'six_figure' ? 'revenue' : 'clients',
                        name: preset.name,
                        target: 'revenue' in preset ? preset.revenue : 0,
                        timeframe: preset.timeframe
                      })
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowGoalCreator(false)}>Cancel</Button>
              <Button onClick={() => {
                // Create goal logic
                setShowGoalCreator(false)
              }}>Create Goal</Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Goals overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {progressMetrics.map(goal => renderGoalCard(goal, goal))}
      </div>
      
      {/* Goal detail */}
      {selectedGoal && renderGoalDetail()}
      
      {/* Six Figure Barber Progress */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Six Figure Barber Journey</h3>
              <p className="text-purple-100">
                Annual Revenue Run Rate: ${(currentMetrics.monthlyRevenue * 12).toLocaleString()}
              </p>
              <div className="mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-purple-700 rounded-full h-3">
                    <div 
                      className="bg-white h-3 rounded-full transition-all"
                      style={{ width: `${Math.min((currentMetrics.monthlyRevenue * 12 / 100000) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold">
                    {((currentMetrics.monthlyRevenue * 12 / 100000) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            <TrophyIcon className="w-16 h-16 text-purple-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}