'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Mock data for automation features
const mockAutomationStatus = {
  workflows: {
    active: 12,
    total: 15,
    triggered_today: 8
  },
  client_followup: {
    campaigns_active: 5,
    messages_sent_today: 23,
    response_rate: 15.2
  },
  performance_alerts: {
    alerts_today: 2,
    resolved: 8,
    pending: 1
  },
  reporting: {
    scheduled_reports: 6,
    generated_today: 3,
    delivery_success_rate: 98.5
  }
}

const mockActiveWorkflows = [
  {
    id: 1,
    name: "New Client Welcome Series",
    type: "client_followup",
    status: "active",
    triggered_count: 3,
    success_rate: 85.2,
    last_triggered: "2024-12-18 14:30"
  },
  {
    id: 2,
    name: "Post-Appointment Follow-up",
    type: "client_followup", 
    status: "active",
    triggered_count: 12,
    success_rate: 92.1,
    last_triggered: "2024-12-18 16:45"
  },
  {
    id: 3,
    name: "Low 6FB Score Alert",
    type: "performance_alert",
    status: "active",
    triggered_count: 1,
    success_rate: 100.0,
    last_triggered: "2024-12-18 09:15"
  },
  {
    id: 4,
    name: "Weekly Performance Report",
    type: "reporting",
    status: "active",
    triggered_count: 1,
    success_rate: 100.0,
    last_triggered: "2024-12-16 09:00"
  },
  {
    id: 5,
    name: "Client Reactivation Campaign",
    type: "client_followup",
    status: "paused",
    triggered_count: 0,
    success_rate: 0,
    last_triggered: "Never"
  }
]

const mockRecentActivity = [
  {
    id: 1,
    timestamp: "2024-12-18 16:45:23",
    type: "client_followup",
    action: "Email sent to John Smith",
    workflow: "Post-Appointment Follow-up",
    status: "success"
  },
  {
    id: 2,
    timestamp: "2024-12-18 15:30:15", 
    type: "performance_alert",
    action: "Alert triggered: Booking rate below threshold",
    workflow: "Performance Monitoring",
    status: "success"
  },
  {
    id: 3,
    timestamp: "2024-12-18 14:30:45",
    type: "client_followup",
    action: "Welcome email sent to new client",
    workflow: "New Client Welcome Series",
    status: "success"
  },
  {
    id: 4,
    timestamp: "2024-12-18 12:15:30",
    type: "scheduling",
    action: "Optimal time recommendation generated",
    workflow: "Smart Scheduling",
    status: "success"
  },
  {
    id: 5,
    timestamp: "2024-12-18 10:45:12",
    type: "reporting",
    action: "Daily summary report generated",
    workflow: "Automated Reporting",
    status: "success"
  }
]

const mockSchedulingRecommendations = [
  {
    id: 1,
    title: "High-Demand Time Slot Available",
    description: "Open appointment slot at 14:00 has high booking demand",
    suggested_time: "2024-12-19 14:00",
    expected_revenue: 75.00,
    confidence: 88.5,
    type: "optimal_times"
  },
  {
    id: 2,
    title: "Reach Out to Mike Johnson",
    description: "Client is due for appointment based on 28-day pattern",
    suggested_time: "2024-12-19 15:30",
    expected_revenue: 65.00,
    confidence: 82.3,
    type: "client_preference"
  },
  {
    id: 3,
    title: "90-minute Gap Available",
    description: "Schedule gap from 11:00 can fit full service appointment",
    suggested_time: "2024-12-19 11:00",
    expected_revenue: 70.00,
    confidence: 79.1,
    type: "gap_filling"
  }
]

const getWorkflowTypeColor = (type: string) => {
  switch (type) {
    case 'client_followup':
      return 'bg-blue-100 text-blue-800'
    case 'performance_alert':
      return 'bg-red-100 text-red-800'
    case 'reporting':
      return 'bg-green-100 text-green-800'
    case 'scheduling':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'paused':
      return 'bg-yellow-100 text-yellow-800'
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getRecommendationIcon = (type: string) => {
  switch (type) {
    case 'optimal_times':
      return '🎯'
    case 'client_preference':
      return '👤'
    case 'gap_filling':
      return '⏰'
    case 'revenue_optimization':
      return '💰'
    default:
      return '📋'
  }
}

export default function AutomationDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview')

  const handleWorkflowToggle = (workflowId: number, currentStatus: string) => {
    alert(`Workflow ${currentStatus === 'active' ? 'paused' : 'activated'}! In Phase 3: Real workflow management.`)
  }

  const handleRecommendationAction = (recommendation: { title: string }) => {
    alert(`Implementing recommendation: ${recommendation.title}. In Phase 3: Real scheduling integration.`)
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'workflows', label: 'Workflows' },
          { id: 'scheduling', label: 'Smart Scheduling' },
          { id: 'activity', label: 'Activity Log' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              selectedTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Automation Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {mockAutomationStatus.workflows.active}
                </div>
                <div className="text-sm text-gray-600">
                  of {mockAutomationStatus.workflows.total} total
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {mockAutomationStatus.workflows.triggered_today} triggered today
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Client Follow-ups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {mockAutomationStatus.client_followup.messages_sent_today}
                </div>
                <div className="text-sm text-gray-600">messages sent today</div>
                <div className="text-xs text-blue-600 mt-1">
                  {mockAutomationStatus.client_followup.response_rate}% response rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {mockAutomationStatus.performance_alerts.pending}
                </div>
                <div className="text-sm text-gray-600">pending alerts</div>
                <div className="text-xs text-gray-600 mt-1">
                  {mockAutomationStatus.performance_alerts.resolved} resolved today
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Automated Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {mockAutomationStatus.reporting.generated_today}
                </div>
                <div className="text-sm text-gray-600">generated today</div>
                <div className="text-xs text-green-600 mt-1">
                  {mockAutomationStatus.reporting.delivery_success_rate}% delivery success
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common automation tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="flex items-center gap-2">
                  ➕ Create Workflow
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  📊 Generate Report
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  🔄 Sync Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflows Tab */}
      {selectedTab === 'workflows' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Workflows</CardTitle>
              <CardDescription>Manage your automated workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActiveWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <Badge className={getWorkflowTypeColor(workflow.type)}>
                        {workflow.type.replace('_', ' ')}
                      </Badge>
                      <div>
                        <div className="font-medium">{workflow.name}</div>
                        <div className="text-sm text-gray-600">
                          Triggered {workflow.triggered_count} times • {workflow.success_rate}% success rate
                        </div>
                        <div className="text-xs text-gray-500">
                          Last triggered: {workflow.last_triggered}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(workflow.status)}>
                        {workflow.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWorkflowToggle(workflow.id, workflow.status)}
                      >
                        {workflow.status === 'active' ? 'Pause' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Smart Scheduling Tab */}
      {selectedTab === 'scheduling' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Smart Scheduling Recommendations</CardTitle>
              <CardDescription>AI-powered scheduling optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockSchedulingRecommendations.map((recommendation) => (
                  <div
                    key={recommendation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getRecommendationIcon(recommendation.type)}</span>
                      <div>
                        <div className="font-medium">{recommendation.title}</div>
                        <div className="text-sm text-gray-600">{recommendation.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Suggested: {new Date(recommendation.suggested_time).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          ${recommendation.expected_revenue.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {recommendation.confidence}% confidence
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecommendationAction(recommendation)}
                      >
                        Implement
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Schedule Optimization Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Optimization</CardTitle>
              <CardDescription>Analysis of your current schedule efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">82%</div>
                  <div className="text-sm text-gray-600">Schedule Utilization</div>
                  <div className="text-xs text-green-600 mt-1">+5% vs last week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">$68.50</div>
                  <div className="text-sm text-gray-600">Revenue per Hour</div>
                  <div className="text-xs text-green-600 mt-1">+$12.30 vs last week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">3.2</div>
                  <div className="text-sm text-gray-600">Avg Gap Hours</div>
                  <div className="text-xs text-red-600 mt-1">-0.8 vs last week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Log Tab */}
      {selectedTab === 'activity' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Automation Activity</CardTitle>
              <CardDescription>Log of automated actions and triggers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockRecentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={getWorkflowTypeColor(activity.type)}>
                        {activity.type.replace('_', ' ')}
                      </Badge>
                      <div>
                        <div className="text-sm font-medium">{activity.action}</div>
                        <div className="text-xs text-gray-600">{activity.workflow}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500">{activity.timestamp}</div>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}