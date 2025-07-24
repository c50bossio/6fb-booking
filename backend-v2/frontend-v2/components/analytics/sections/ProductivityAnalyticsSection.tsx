import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import { 
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  ChartBarIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface ProductivityAnalyticsSectionProps {
  data: any
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function ProductivityAnalyticsSection({ data, userRole, dateRange }: ProductivityAnalyticsSectionProps) {
  const [productivityData, setProductivityData] = useState<any>(null)
  const [selectedView, setSelectedView] = useState<'utilization' | 'performance' | 'goals'>('utilization')

  useEffect(() => {
    // Transform data for productivity analytics
    if (data) {
      const transformedData = {
        summary: {
          utilizationRate: data.appointment_summary?.chair_utilization || 85,
          completionRate: 100 - (data.appointment_summary?.cancellation_rate || 0),
          averageServiceTime: 45, // minutes
          efficiency: 92
        },
        appointments: data.appointment_summary || {},
        performance: data.performance_metrics || {},
        goals: {
          daily: { target: 10, actual: 8, percentage: 80 },
          weekly: { target: 50, actual: 42, percentage: 84 },
          monthly: { target: 200, actual: 168, percentage: 84 }
        }
      }
      setProductivityData(transformedData)
    }
  }, [data])

  if (!productivityData) {
    return <div>Loading productivity analytics...</div>
  }

  const metrics = [
    {
      title: 'Utilization Rate',
      value: `${productivityData.summary.utilizationRate}%`,
      icon: <ChartBarIcon className="w-5 h-5 text-blue-600" />,
      trend: productivityData.summary.utilizationRate > 80 ? 'up' as const : 'down' as const,
      change: 5.2,
      description: 'Chair time utilized'
    },
    {
      title: 'Completion Rate',
      value: `${productivityData.summary.completionRate}%`,
      icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
      trend: productivityData.summary.completionRate > 90 ? 'up' as const : 'down' as const,
      change: 3.8
    },
    {
      title: 'Avg Service Time',
      value: `${productivityData.summary.averageServiceTime} min`,
      icon: <ClockIcon className="w-5 h-5 text-purple-600" />,
      trend: 'neutral' as const,
      description: 'Per appointment'
    },
    {
      title: 'Efficiency Score',
      value: `${productivityData.summary.efficiency}%`,
      icon: <TrophyIcon className="w-5 h-5 text-orange-600" />,
      trend: productivityData.summary.efficiency > 90 ? 'up' as const : 'down' as const,
      change: 7.1
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={false} />

      {/* Productivity Views */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Productivity Analysis</CardTitle>
            <div className="flex gap-2">
              {(['utilization', 'performance', 'goals'] as const).map((view) => (
                <Button
                  key={view}
                  variant={selectedView === view ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedView(view)}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedView === 'utilization' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Daily Utilization</h4>
                  <div className="space-y-3">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, index) => (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-sm">{day}</span>
                        <div className="flex items-center space-x-2 flex-1 ml-4">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div 
                              className="bg-blue-500 h-3 rounded-full"
                              style={{ width: `${75 + index * 5}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{75 + index * 5}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Time Slot Performance</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Morning (9AM-12PM)</span>
                        <span className="font-bold text-green-600">95%</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Afternoon (12PM-5PM)</span>
                        <span className="font-bold text-blue-600">88%</span>
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Evening (5PM-8PM)</span>
                        <span className="font-bold text-yellow-600">72%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedView === 'performance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="mb-2">
                  <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto" />
                </div>
                <p className="text-3xl font-bold">{productivityData.appointments.completed_appointments || 0}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center">
                <div className="mb-2">
                  <XCircleIcon className="w-12 h-12 text-red-600 mx-auto" />
                </div>
                <p className="text-3xl font-bold">{productivityData.appointments.cancelled_appointments || 0}</p>
                <p className="text-sm text-gray-600">Cancelled</p>
              </div>
              <div className="text-center">
                <div className="mb-2">
                  <ClockIcon className="w-12 h-12 text-yellow-600 mx-auto" />
                </div>
                <p className="text-3xl font-bold">{productivityData.appointments.no_show_appointments || 0}</p>
                <p className="text-sm text-gray-600">No Shows</p>
              </div>
              <div className="text-center">
                <div className="mb-2">
                  <CalendarDaysIcon className="w-12 h-12 text-blue-600 mx-auto" />
                </div>
                <p className="text-3xl font-bold">{productivityData.appointments.rescheduled_appointments || 0}</p>
                <p className="text-sm text-gray-600">Rescheduled</p>
              </div>
            </div>
          )}

          {selectedView === 'goals' && (
            <div className="space-y-6">
              {Object.entries(productivityData.goals).map(([period, goal]: [string, any]) => (
                <div key={period} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium capitalize">{period} Goal</h4>
                    <span className="text-sm text-gray-600">{goal.actual} / {goal.target}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-500 ${
                        goal.percentage >= 100 ? 'bg-green-500' :
                        goal.percentage >= 80 ? 'bg-blue-500' :
                        goal.percentage >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className={`font-medium ${
                      goal.percentage >= 100 ? 'text-green-600' :
                      goal.percentage >= 80 ? 'text-blue-600' :
                      goal.percentage >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>{goal.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barber-specific metrics */}
      {userRole === 'barber' && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <TrophyIcon className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">Top 10%</p>
                <p className="text-sm text-gray-600">Location Ranking</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <StarIcon className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">4.9</p>
                <p className="text-sm text-gray-600">Client Rating</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ArrowPathRoundedSquareIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">85%</p>
                <p className="text-sm text-gray-600">Rebooking Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productivity Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              Schedule Optimizer
            </Button>
            <Button variant="outline" className="justify-start">
              Time Tracking
            </Button>
            <Button variant="outline" className="justify-start">
              Goal Settings
            </Button>
            <Button variant="outline" className="justify-start">
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Import missing icon
import { ArrowPathRoundedSquareIcon } from '@heroicons/react/24/outline'