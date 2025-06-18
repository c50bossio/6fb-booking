'use client'

import { Card } from '@/components/ui/card'
import { Clock, TrendingUp, Calendar } from 'lucide-react'

interface PeakHoursHeatmapProps {
  data: any[]
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 8 // Start from 8 AM
  return hour <= 12 ? `${hour}AM` : `${hour - 12}PM`
})

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  // Calculate max value for color scaling
  const maxValue = Math.max(...data.map(d => d.bookings))
  
  // Get value for specific day and hour
  const getValue = (day: string, hour: number) => {
    const item = data.find(d => d.day === day && d.hour === hour + 8)
    return item ? item.bookings : 0
  }

  // Calculate color intensity based on value
  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100'
    const intensity = value / maxValue
    if (intensity > 0.8) return 'bg-red-500'
    if (intensity > 0.6) return 'bg-orange-500'
    if (intensity > 0.4) return 'bg-yellow-500'
    if (intensity > 0.2) return 'bg-green-400'
    return 'bg-green-300'
  }

  // Calculate busiest times
  const busiestTimes = data
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 3)
    .map(time => ({
      day: time.day,
      hour: time.hour,
      bookings: time.bookings
    }))

  // Calculate daily totals
  const dailyTotals = DAYS.map(day => ({
    day,
    total: data
      .filter(d => d.day === day)
      .reduce((sum, d) => sum + d.bookings, 0)
  }))

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Peak Hours Analysis</h3>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            Bookings by day and hour
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-13 gap-1 text-xs">
              {/* Header row */}
              <div className="h-8" /> {/* Empty corner cell */}
              {HOURS.map(hour => (
                <div key={hour} className="h-8 flex items-center justify-center font-medium text-gray-600">
                  {hour}
                </div>
              ))}

              {/* Data rows */}
              {DAYS.map(day => (
                <div key={day} className="contents">
                  <div className="h-12 flex items-center font-medium text-gray-700 pr-2">
                    {day.slice(0, 3)}
                  </div>
                  {HOURS.map((_, hourIndex) => {
                    const value = getValue(day, hourIndex)
                    return (
                      <div
                        key={`${day}-${hourIndex}`}
                        className={`h-12 flex items-center justify-center rounded transition-all hover:ring-2 hover:ring-gray-400 cursor-pointer ${getColor(value)}`}
                        title={`${day} ${HOURS[hourIndex]}: ${value} bookings`}
                      >
                        <span className={`text-xs font-medium ${value > maxValue * 0.6 ? 'text-white' : 'text-gray-700'}`}>
                          {value > 0 ? value : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center mt-6 space-x-4">
              <span className="text-sm text-gray-600">Less busy</span>
              <div className="flex space-x-1">
                <div className="w-6 h-6 bg-gray-100 rounded" />
                <div className="w-6 h-6 bg-green-300 rounded" />
                <div className="w-6 h-6 bg-green-400 rounded" />
                <div className="w-6 h-6 bg-yellow-500 rounded" />
                <div className="w-6 h-6 bg-orange-500 rounded" />
                <div className="w-6 h-6 bg-red-500 rounded" />
              </div>
              <span className="text-sm text-gray-600">More busy</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Busiest Times */}
        <Card className="p-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-orange-500" />
            Busiest Time Slots
          </h4>
          <div className="space-y-3">
            {busiestTimes.map((time, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium">{time.day}</p>
                  <p className="text-sm text-gray-600">
                    {time.hour <= 12 ? `${time.hour}:00 AM` : `${time.hour - 12}:00 PM`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">{time.bookings}</p>
                  <p className="text-xs text-gray-500">bookings</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Daily Summary */}
        <Card className="p-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Daily Booking Totals
          </h4>
          <div className="space-y-2">
            {dailyTotals.map(({ day, total }) => {
              const maxDaily = Math.max(...dailyTotals.map(d => d.total))
              const percentage = (total / maxDaily) * 100
              
              return (
                <div key={day} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{day}</span>
                    <span className="text-gray-600">{total} bookings</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}