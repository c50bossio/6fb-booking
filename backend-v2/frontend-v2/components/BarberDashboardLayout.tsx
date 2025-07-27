'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { QuickActions } from '@/components/QuickActions'
import SnapshotDashboard from '@/components/dashboards/SnapshotDashboard'
import PriorityInsightWidget from '@/components/smart-insights/PriorityInsightWidget'
import InsightActionCenter from '@/components/smart-insights/InsightActionCenter'
import { ClockIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface BarberDashboardLayoutProps {
  user: {
    id: number
    first_name?: string
    role: string
  }
  todayStats: {
    appointments: number
    revenue: number
    newClients: number
    completionRate: number
  }
  upcomingAppointments: any[]
}

export function BarberDashboardLayout({ user, todayStats, upcomingAppointments }: BarberDashboardLayoutProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Snapshot Dashboard - KPI cards and Six Figure Analytics */}
      <SnapshotDashboard
        user={user}
        todayStats={todayStats}
        timeRange="30d"
      />

      {/* Smart Insights Hub - Priority Insight for immediate attention */}
      <PriorityInsightWidget
        userId={user.id}
        autoRefresh={true}
        onActionClick={(action, insight) => {
          // Handle smart insight actions
          if (action.endpoint) {
            router.push(action.endpoint)
          }
        }}
      />

      {/* Two-column layout for actions and appointment info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Action Center - Intelligent quick actions */}
        <InsightActionCenter
          userId={user.id}
          variant="compact"
          maxActions={4}
          showHeader={true}
          autoRefresh={true}
          onActionExecuted={(action, result) => {
            // Handle action execution results
            console.log('Action executed:', action.label, result)
          }}
        />

        {/* Next Appointment Card */}
        {upcomingAppointments.length > 0 && (
          <Card variant="default" padding="lg">
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Next Appointment</h3>
                <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-gray-900 dark:text-white">
                  {upcomingAppointments[0].client_name || 'Client'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {upcomingAppointments[0].service_name} • {new Date(upcomingAppointments[0].start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    View all appointments →
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fallback when no appointments */}
        {upcomingAppointments.length === 0 && (
          <Card variant="default" padding="lg">
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule</h3>
                <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  No upcoming appointments scheduled
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  View calendar →
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Traditional Quick Actions - Keep for existing functionality */}
      <QuickActions userRole={user.role} />

    </div>
  )
}