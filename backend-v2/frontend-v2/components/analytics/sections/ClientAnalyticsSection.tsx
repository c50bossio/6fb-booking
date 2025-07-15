import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import ClientInsightsChart from '@/components/analytics/ClientInsightsChart'
import { 
  UsersIcon,
  UserPlusIcon,
  ArrowPathRoundedSquareIcon,
  StarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface ClientAnalyticsSectionProps {
  data: any
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function ClientAnalyticsSection({ data, userRole, dateRange }: ClientAnalyticsSectionProps) {
  const [selectedView, setSelectedView] = useState<'retention' | 'segments' | 'lifetime'>('retention')
  const [clientData, setClientData] = useState<any>(null)

  useEffect(() => {
    // Transform data for client analytics
    if (data) {
      const transformedData = {
        summary: data.client_summary || {},
        retention: data.client_retention || {},
        segments: data.client_segments || [],
        topClients: data.top_clients || []
      }
      setClientData(transformedData)
    }
  }, [data])

  if (!clientData) {
    return <div>Loading client analytics...</div>
  }

  const metrics = [
    {
      title: 'Total Clients',
      value: clientData.summary.total_clients || 0,
      icon: <UsersIcon className="w-5 h-5 text-blue-600" />,
      trend: 'up' as const,
      change: 12.5,
      changeLabel: 'vs last period'
    },
    {
      title: 'New Clients',
      value: clientData.summary.new_clients || 0,
      icon: <UserPlusIcon className="w-5 h-5 text-green-600" />,
      trend: (clientData.summary.new_client_growth > 0 ? 'up' : 'down') as 'up' | 'down',
      change: Math.abs(clientData.summary.new_client_growth || 0)
    },
    {
      title: 'Retention Rate',
      value: `${clientData.summary.retention_rate || 0}%`,
      icon: <ArrowPathRoundedSquareIcon className="w-5 h-5 text-purple-600" />,
      trend: (clientData.summary.retention_rate > 80 ? 'up' : 'down') as 'up' | 'down'
    },
    {
      title: 'Avg Client Value',
      value: `$${clientData.summary.average_client_value?.toFixed(2) || '0'}`,
      icon: <StarIcon className="w-5 h-5 text-orange-600" />,
      trend: 'neutral' as const,
      description: 'Lifetime value'
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={false} />

      {/* Client Insights Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Client Insights</CardTitle>
            <div className="flex gap-2">
              {(['retention', 'segments', 'lifetime'] as const).map((view) => (
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
          <ClientInsightsChart 
            data={clientData}
            view={selectedView}
            height={400}
          />
        </CardContent>
      </Card>

      {/* Client Segments & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="font-medium">VIP Clients</p>
                  <p className="text-sm text-gray-600">10+ visits, high spend</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{clientData.segments.vip || 0}</p>
                  <p className="text-sm text-green-600">+15%</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="font-medium">Regular</p>
                  <p className="text-sm text-gray-600">Monthly visits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{clientData.segments.regular || 0}</p>
                  <p className="text-sm text-blue-600">+8%</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div>
                  <p className="font-medium">At Risk</p>
                  <p className="text-sm text-gray-600">No visit in 60+ days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{clientData.segments.at_risk || 0}</p>
                  <p className="text-sm text-yellow-600">Needs attention</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">Dormant</p>
                  <p className="text-sm text-gray-600">No visit in 90+ days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{clientData.segments.dormant || 0}</p>
                  <p className="text-sm text-gray-600">Re-engage</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientData.topClients.slice(0, 5).map((client: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold">
                      {client.initials}
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-gray-600">{client.visits} visits</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${client.total_spent.toLocaleString()}</p>
                    <div className="flex items-center space-x-1">
                      <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm">{client.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Client Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              Export Client List
            </Button>
            <Button variant="outline" className="justify-start">
              Send Campaign
            </Button>
            <Button variant="outline" className="justify-start">
              Loyalty Program
            </Button>
            <Button variant="outline" className="justify-start">
              Client Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}