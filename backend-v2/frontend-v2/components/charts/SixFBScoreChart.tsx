'use client'

import React from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from '@/lib/recharts-dynamic'
import { Progress } from '@/components/ui/progress'

interface SixFBData {
  overall_score: number
  principle_scores: {
    revenue_optimization: number
    client_value: number
    service_excellence: number
    business_efficiency: number
    professional_growth: number
  }
  milestone_progress: {
    current_level: string
    next_target: string
    progress_percent: number
    estimated_days: number
  }
  key_opportunities?: Array<{
    title: string
    impact: string
    priority: string
  }>
  quick_wins?: Array<{
    title: string
    effort: string
    impact: string
  }>
}

interface SixFBScoreChartProps {
  data: SixFBData
}

const COLORS = {
  excellent: '#10b981',   // Green
  good: '#3b82f6',        // Blue  
  fair: '#f59e0b',        // Orange
  poor: '#ef4444'         // Red
}

const PRINCIPLE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

export default function SixFBScoreChart({ data }: SixFBScoreChartProps) {
  if (!data) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No Six Figure Barber data available
      </div>
    )
  }

  // Prepare radar chart data
  const radarData = [
    {
      principle: 'Revenue\nOptimization',
      score: data.principle_scores?.revenue_optimization || 0,
      fullMark: 100
    },
    {
      principle: 'Client\nValue',
      score: data.principle_scores?.client_value || 0,
      fullMark: 100
    },
    {
      principle: 'Service\nExcellence',
      score: data.principle_scores?.service_excellence || 0,
      fullMark: 100
    },
    {
      principle: 'Business\nEfficiency',
      score: data.principle_scores?.business_efficiency || 0,
      fullMark: 100
    },
    {
      principle: 'Professional\nGrowth',
      score: data.principle_scores?.professional_growth || 0,
      fullMark: 100
    }
  ]

  // Prepare bar chart data for principle scores
  const barData = Object.entries(data.principle_scores || {}).map(([principle, score], index) => ({
    name: principle.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score: score,
    fill: PRINCIPLE_COLORS[index]
  }))

  // Determine overall score color and level
  const getScoreColor = (score: number) => {
    if (score >= 85) return COLORS.excellent
    if (score >= 70) return COLORS.good
    if (score >= 55) return COLORS.fair
    return COLORS.poor
  }

  const getScoreLevel = (score: number) => {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 55) return 'Fair'
    return 'Needs Improvement'
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            Score: {payload[0].value.toFixed(1)}/100
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Display */}
      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
        <div className="text-6xl font-bold mb-2" style={{ color: getScoreColor(data.overall_score) }}>
          {data.overall_score?.toFixed(1) || '0.0'}
        </div>
        <div className="text-lg font-medium text-gray-700 mb-2">
          Overall Six Figure Barber Score
        </div>
        <div 
          className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: getScoreColor(data.overall_score) }}
        >
          {getScoreLevel(data.overall_score)}
        </div>
        <Progress 
          value={data.overall_score} 
          className="mt-4 h-3"
        />
      </div>

      {/* Principle Scores Radar Chart */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-3">Six Figure Barber Principles</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis 
                  dataKey="principle" 
                  tick={{ fontSize: 10, textAnchor: 'middle' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fontSize: 9 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                />
                <Tooltip 
                  formatter={(value: any) => [value.toFixed(1), 'Score']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  type="number"
                  domain={[0, 100]}
                  stroke="#6b7280"
                  fontSize={11}
                />
                <YAxis 
                  type="category"
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={10}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="score" 
                  radius={[0, 2, 2, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Milestone Progress */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-gray-900 mb-3">Milestone Progress</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Current Level: {data.milestone_progress?.current_level || 'Unknown'}</span>
              <span className="text-gray-600">Next: {data.milestone_progress?.next_target || 'Unknown'}</span>
            </div>
            <Progress 
              value={data.milestone_progress?.progress_percent || 0} 
              className="mb-2" 
            />
            <p className="text-sm text-gray-600">
              {data.milestone_progress?.progress_percent?.toFixed(1) || '0'}% complete
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.milestone_progress?.estimated_days || 0}
            </div>
            <p className="text-sm text-gray-600">Days to next milestone</p>
          </div>
        </div>
      </div>

      {/* Key Opportunities */}
      {data.key_opportunities && data.key_opportunities.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">Key Opportunities</h4>
          <div className="space-y-2">
            {data.key_opportunities.slice(0, 3).map((opportunity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="font-medium text-yellow-800">{opportunity.title}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-yellow-600">Impact: {opportunity.impact}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    opportunity.priority === 'high' ? 'bg-red-100 text-red-800' :
                    opportunity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {opportunity.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {data.quick_wins && data.quick_wins.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">Quick Wins</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.quick_wins.slice(0, 4).map((win, index) => (
              <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-medium text-green-800 mb-1">{win.title}</p>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Effort: {win.effort}</span>
                  <span>Impact: {win.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
        {Object.entries(data.principle_scores || {}).map(([principle, score], index) => (
          <div key={principle} className="text-center">
            <div 
              className="text-lg font-bold"
              style={{ color: PRINCIPLE_COLORS[index] }}
            >
              {score.toFixed(1)}
            </div>
            <p className="text-xs text-gray-600 capitalize">
              {principle.replace('_', ' ')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}