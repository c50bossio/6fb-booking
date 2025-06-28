'use client'

import { Card } from '@/components/ui/card'
import {
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
import { Trophy, Medal, Award, TrendingUp, Users, DollarSign, Star, Clock } from 'lucide-react'

interface BarberComparisonProps {
  data: any[]
}

export function BarberComparison({ data }: BarberComparisonProps) {
  // Sort barbers by revenue for leaderboard
  const leaderboard = [...data].sort((a, b) => b.revenue - a.revenue)

  // Prepare data for comparison chart
  const comparisonData = data.map(barber => ({
    name: barber.name,
    revenue: barber.revenue,
    bookings: barber.bookings,
    rating: barber.rating * 20, // Scale to 100 for better visualization
    efficiency: barber.efficiency
  }))

  // Calculate team averages
  const teamAvg = {
    revenue: data.reduce((sum, b) => sum + b.revenue, 0) / data.length,
    bookings: data.reduce((sum, b) => sum + b.bookings, 0) / data.length,
    rating: data.reduce((sum, b) => sum + b.rating, 0) / data.length,
    efficiency: data.reduce((sum, b) => sum + b.efficiency, 0) / data.length
  }

  const getPerformanceLevel = (barber: any) => {
    const score = (barber.revenue / teamAvg.revenue) * 0.4 +
                  (barber.bookings / teamAvg.bookings) * 0.3 +
                  (barber.rating / teamAvg.rating) * 0.2 +
                  (barber.efficiency / teamAvg.efficiency) * 0.1

    if (score >= 1.2) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' }
    if (score >= 1) return { level: 'Above Average', color: 'text-blue-600', bg: 'bg-blue-50' }
    if (score >= 0.8) return { level: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { level: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50' }
  }

  const getMedalIcon = (position: number) => {
    if (position === 0) return <Trophy className="h-6 w-6 text-yellow-500" />
    if (position === 1) return <Medal className="h-6 w-6 text-gray-400" />
    if (position === 2) return <Award className="h-6 w-6 text-orange-600" />
    return null
  }

  return (
    <div className="space-y-4">
      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Team Size</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Revenue</p>
              <p className="text-2xl font-bold">${teamAvg.revenue.toFixed(0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold">{teamAvg.rating.toFixed(1)}</p>
            </div>
            <Star className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Efficiency</p>
              <p className="text-2xl font-bold">{teamAvg.efficiency.toFixed(0)}%</p>
            </div>
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Performance Comparison Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={comparisonData}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
              stroke="#6b7280"
            />
            <YAxis fontSize={12} stroke="#6b7280" />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
            <Bar dataKey="bookings" fill="#10b981" name="Bookings" />
            <Bar dataKey="rating" fill="#f59e0b" name="Rating (%)" />
            <Bar dataKey="efficiency" fill="#8b5cf6" name="Efficiency (%)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leaderboard */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Leaderboard</h3>
          <div className="space-y-3">
            {leaderboard.map((barber, index) => {
              const performance = getPerformanceLevel(barber)
              return (
                <div
                  key={barber.id}
                  className={`p-4 rounded-lg border ${index < 3 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getMedalIcon(index)}
                      <div>
                        <p className="font-medium">{barber.name}</p>
                        <p className="text-sm text-gray-600">{barber.bookings} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${barber.revenue.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${performance.bg} ${performance.color}`}>
                        {performance.level}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Skills Radar Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Skills Analysis</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={data.slice(0, 5)}> {/* Show top 5 barbers */}
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="name" fontSize={12} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} fontSize={12} />
              <Radar
                name="Productivity"
                dataKey="productivity"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Radar
                name="Client Satisfaction"
                dataKey="satisfaction"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Radar
                name="Technical Skills"
                dataKey="skills"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.6}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-medium text-gray-700">Barber</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Revenue</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Bookings</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Avg Ticket</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Rating</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Retention</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Efficiency</th>
                <th className="pb-3 font-medium text-gray-700 text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {data.map((barber, index) => {
                const avgTicket = barber.revenue / barber.bookings || 0
                const trend = barber.trend || 0
                return (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{barber.name}</td>
                    <td className="py-3 text-right font-medium">
                      ${barber.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">{barber.bookings}</td>
                    <td className="py-3 text-right">${avgTicket.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        {barber.rating.toFixed(1)}
                      </div>
                    </td>
                    <td className="py-3 text-right">{barber.retention}%</td>
                    <td className="py-3 text-right">{barber.efficiency}%</td>
                    <td className="py-3 text-center">
                      {trend > 0 ? (
                        <span className="text-green-600">↑ {trend}%</span>
                      ) : trend < 0 ? (
                        <span className="text-red-600">↓ {Math.abs(trend)}%</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
