'use client'

import { Card } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react'

interface ClientRetentionChartProps {
  data: any
}

export function ClientRetentionChart({ data }: ClientRetentionChartProps) {
  const retentionMetrics = {
    overall: data.overallRetention || 0,
    new: data.newClients || 0,
    returning: data.returningClients || 0,
    lost: data.lostClients || 0,
    avgVisits: data.avgVisitsPerClient || 0,
    lifetimeValue: data.avgLifetimeValue || 0
  }

  const monthlyRetention = data.monthlyRetention || []
  const cohortData = data.cohortAnalysis || []
  const segmentData = data.segmentAnalysis || []

  const formatPercentage = (value: number) => `${value}%`
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`

  return (
    <div className="space-y-4">
      {/* Retention Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Retention Rate</p>
              <p className="text-2xl font-bold">{retentionMetrics.overall}%</p>
              <p className="text-xs text-green-600 mt-1">+2.5% vs last month</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">New Clients</p>
              <p className="text-2xl font-bold">{retentionMetrics.new}</p>
              <p className="text-xs text-blue-600 mt-1">This period</p>
            </div>
            <UserCheck className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lost Clients</p>
              <p className="text-2xl font-bold">{retentionMetrics.lost}</p>
              <p className="text-xs text-red-600 mt-1">Churn rate: 5.2%</p>
            </div>
            <UserX className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg LTV</p>
              <p className="text-2xl font-bold">${retentionMetrics.lifetimeValue}</p>
              <p className="text-xs text-slate-600 mt-1">Per client</p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Monthly Retention Trend */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Retention Trend</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={monthlyRetention} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
            <YAxis tickFormatter={formatPercentage} stroke="#6b7280" fontSize={12} />
            <Tooltip formatter={formatPercentage} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="retention" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Retention Rate"
            />
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke="#10b981" 
              strokeDasharray="5 5"
              strokeWidth={2}
              name="Target"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Segments */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Client Segments</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={segmentData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="segment" fontSize={12} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} fontSize={12} />
              <Radar 
                name="Retention %" 
                dataKey="retention" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
              />
              <Radar 
                name="Avg Spend" 
                dataKey="avgSpend" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Visit Frequency Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Visit Frequency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={data.visitFrequency || []}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="frequency" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Bar dataKey="clients" fill="#64748b" name="Number of Clients" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Cohort Analysis Heatmap */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Cohort Retention Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-3 font-medium text-gray-700">Cohort</th>
                {[...Array(6)].map((_, i) => (
                  <th key={i} className="text-center pb-3 font-medium text-gray-700">
                    Month {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortData.map((cohort: any, index: number) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-medium">{cohort.name}</td>
                  {cohort.retention.map((rate: number, monthIndex: number) => {
                    const opacity = rate / 100
                    const bgColor = rate >= 80 ? 'bg-green-500' : 
                                   rate >= 60 ? 'bg-yellow-500' : 
                                   rate >= 40 ? 'bg-orange-500' : 
                                   'bg-red-500'
                    return (
                      <td key={monthIndex} className="py-3 text-center">
                        <div 
                          className={`inline-block px-3 py-1 rounded text-white font-medium ${bgColor}`}
                          style={{ opacity: Math.max(opacity, 0.4) }}
                        >
                          {rate}%
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}