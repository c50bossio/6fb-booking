'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from '@/lib/recharts-dynamic'

interface PerformanceData {
  individual_metrics: {
    service_efficiency: Array<{
      service: string
      standard_minutes: number
      actual_minutes: number
      efficiency_percent: number
      service_count: number
    }>
    schedule_utilization: {
      total_available_hours: number
      total_booked_hours: number
      utilization_rate_percent: number
      idle_time_hours: number
    }
    client_satisfaction: {
      trends: Array<{
        date: string
        average_score: number
        rating_count: number
      }>
      overall_average: number
    }
    six_fb_excellence_scores: Record<string, number>
  }
  team_metrics?: any
}

interface PerformanceChartProps {
  data: PerformanceData
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data || !data.individual_metrics) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No performance data available
      </div>
    )
  }

  const { individual_metrics } = data

  // Prepare service efficiency data
  const efficiencyData = individual_metrics.service_efficiency?.map(service => ({
    name: service.service.length > 15 ? service.service.substring(0, 15) + '...' : service.service,
    efficiency: service.efficiency_percent,
    standard: service.standard_minutes,
    actual: service.actual_minutes,
    count: service.service_count
  })) || []

  // Prepare Six Figure Barber excellence scores for radar chart
  const excellenceData = Object.entries(individual_metrics.six_fb_excellence_scores || {}).map(([area, score]) => ({
    area: area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score: score,
    fullMark: 100
  }))

  // Prepare satisfaction trend data
  const satisfactionTrends = individual_metrics.client_satisfaction?.trends?.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: trend.average_score,
    count: trend.rating_count
  })) || []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {entry.name === 'efficiency' ? '%' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Schedule Utilization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">
            {individual_metrics.schedule_utilization?.utilization_rate_percent?.toFixed(1) || '0'}%
          </p>
          <p className="text-sm text-blue-700">Schedule Utilization</p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">
            {individual_metrics.schedule_utilization?.total_booked_hours?.toFixed(1) || '0'}h
          </p>
          <p className="text-sm text-green-700">Hours Booked</p>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <p className="text-2xl font-bold text-orange-600">
            {individual_metrics.client_satisfaction?.overall_average?.toFixed(1) || '0'}
          </p>
          <p className="text-sm text-orange-700">Client Satisfaction</p>
        </div>
      </div>

      {/* Service Efficiency */}
      {efficiencyData.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">Service Efficiency</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={11}
                  label={{ value: 'Efficiency %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="efficiency" 
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Efficiency % = (Standard Time / Actual Time) × 100. Higher is better.
          </p>
        </div>
      )}

      {/* Six Figure Barber Excellence Radar */}
      {excellenceData.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">Six Figure Barber Excellence Areas</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={excellenceData}>
                <PolarGrid />
                <PolarAngleAxis 
                  dataKey="area" 
                  tick={{ fontSize: 11 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="Excellence Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Legend />
                <Tooltip 
                  formatter={(value: any) => [value.toFixed(1), 'Score']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Excellence scores based on Six Figure Barber methodology standards (0-100).
          </p>
        </div>
      )}

      {/* Client Satisfaction Trends */}
      {satisfactionTrends.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">Client Satisfaction Trends</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={satisfactionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={11}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={11}
                  domain={[0, 100]}
                  label={{ value: 'Satisfaction Score', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    typeof value === 'number' ? value.toFixed(1) : value, 
                    name === 'score' ? 'Satisfaction Score' : name
                  ]}
                />
                <Bar 
                  dataKey="score" 
                  fill="#10b981"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">
            {individual_metrics.schedule_utilization?.total_available_hours?.toFixed(0) || '0'}h
          </p>
          <p className="text-xs text-gray-600">Available Hours</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">
            {individual_metrics.schedule_utilization?.idle_time_hours?.toFixed(1) || '0'}h
          </p>
          <p className="text-xs text-gray-600">Idle Time</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-600">
            {efficiencyData.length > 0 ? 
              (efficiencyData.reduce((sum, item) => sum + item.efficiency, 0) / efficiencyData.length).toFixed(1) : 
              '0'
            }%
          </p>
          <p className="text-xs text-gray-600">Avg Efficiency</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-orange-600">
            {satisfactionTrends.reduce((sum, trend) => sum + trend.count, 0)}
          </p>
          <p className="text-xs text-gray-600">Total Ratings</p>
        </div>
      </div>
    </div>
  )
}