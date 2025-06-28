'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { analyticsService } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface DashboardData {
  type: 'network' | 'location' | 'barber'
  location_id?: number
  metrics: {
    [key: string]: number
  }
}

interface TrendData {
  date: string
  value: number
}

export default function DashboardWithAPI() {
  const { user, hasRole } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get dashboard summary
      const summary = await analyticsService.getDashboardSummary()
      setDashboardData(summary)

      // Get revenue trends based on user role
      if (hasRole(['super_admin', 'admin'])) {
        const trends = await analyticsService.getMetricTrends('revenue', 90)
        setRevenueTrend(trends.data)
      } else if (summary.type === 'location' && summary.location_id) {
        const trends = await analyticsService.getMetricTrends('revenue', 90, summary.location_id)
        setRevenueTrend(trends.data)
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button onClick={loadDashboardData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const renderNetworkDashboard = () => {
    if (!dashboardData || dashboardData.type !== 'network') return null

    const { metrics } = dashboardData

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_locations || 0}</div>
              <p className="text-xs text-muted-foreground">Active barbershops</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Barbers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_barbers || 0}</div>
              <p className="text-xs text-muted-foreground">Network professionals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(metrics.total_revenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_appointments || 0}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {revenueTrend.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Network revenue over last 90 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {/* Add chart component here */}
                <p className="text-sm text-gray-500">Chart visualization would go here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    )
  }

  const renderLocationDashboard = () => {
    if (!dashboardData || dashboardData.type !== 'location') return null

    const { metrics } = dashboardData

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(metrics.total_revenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_appointments || 0}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg 6FB Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avg_6fb_score || 0}</div>
              <p className="text-xs text-muted-foreground">Team average</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.barber_count || 0}</div>
              <p className="text-xs text-muted-foreground">Active barbers</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const renderBarberDashboard = () => {
    if (!dashboardData || dashboardData.type !== 'barber') return null

    const { metrics } = dashboardData

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">6FB Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.sixfb_score || 0}</div>
              <p className="text-xs text-muted-foreground">Your performance score</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.appointments_this_week || 0}</div>
              <p className="text-xs text-muted-foreground">Appointments scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(metrics.revenue_this_month || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Client Retention</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.client_retention || 0}%</div>
              <p className="text-xs text-muted-foreground">Return rate</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user?.full_name || 'User'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{user?.role}</Badge>
          {user?.sixfb_certification_level && (
            <Badge variant="default">{user.sixfb_certification_level}</Badge>
          )}
        </div>
      </div>

      {dashboardData?.type === 'network' && renderNetworkDashboard()}
      {dashboardData?.type === 'location' && renderLocationDashboard()}
      {dashboardData?.type === 'barber' && renderBarberDashboard()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {hasRole(['super_admin', 'admin']) && (
                <>
                  <Button variant="outline" className="justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </>
              )}
              {hasRole(['mentor']) && (
                <>
                  <Button variant="outline" className="justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    View Mentees
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Schedule Check-in
                  </Button>
                </>
              )}
              {hasRole(['barber']) && (
                <>
                  <Button variant="outline" className="justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    My Schedule
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    My Performance
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Dashboard loaded successfully</span>
              </div>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">API integration active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
