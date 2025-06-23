'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Mock data - in real app this would come from API
const mockWeeklyData = {
  currentWeek: {
    weekStart: "Dec 16, 2024",
    appointments: 34,
    revenue: 2340.75,
    serviceRevenue: 1890.50,
    tips: 312.25,
    products: 138.00,
    newCustomers: 12,
    returningCustomers: 22,
    averageTicket: 68.85,
    bookingRate: 85.0
  },
  previousWeek: {
    weekStart: "Dec 9, 2024",
    appointments: 31,
    revenue: 2025.40,
    serviceRevenue: 1680.30,
    tips: 245.10,
    products: 100.00,
    newCustomers: 10,
    returningCustomers: 21,
    averageTicket: 65.34,
    bookingRate: 77.5
  }
}

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

const ChangeIndicator = ({ current, previous, format = 'number', suffix = '' }: {
  current: number
  previous: number
  format?: 'number' | 'currency' | 'percentage'
  suffix?: string
}) => {
  const change = calculateChange(current, previous)
  const isPositive = change > 0

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return `$${value.toFixed(2)}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return value.toString()
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-2xl font-bold">{formatValue(current)}{suffix}</div>
        <div className="text-sm text-gray-600">vs {formatValue(previous)}{suffix} last week</div>
      </div>
      <Badge variant={isPositive ? "default" : "destructive"} className="ml-2">
        {isPositive ? "+" : ""}{change.toFixed(1)}%
      </Badge>
    </div>
  )
}

export default function WeeklyComparison() {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const handleBreakdownToggle = () => {
    setShowBreakdown(!showBreakdown)
  }

  const handleRevenueItemClick = (item: string) => {
    alert(`${item} clicked! In Phase 2: Detailed breakdown with historical trends and drill-down analytics.`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Current Week Overview */}
      <Card>
        <CardHeader>
          <CardTitle>This Week Performance</CardTitle>
          <CardDescription>Week of {mockWeeklyData.currentWeek.weekStart}</CardDescription>
          <button
            onClick={handleBreakdownToggle}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            {showBreakdown ? 'Hide Details' : 'Show Details'}
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChangeIndicator
            current={mockWeeklyData.currentWeek.appointments}
            previous={mockWeeklyData.previousWeek.appointments}
            suffix=" appointments"
          />

          <ChangeIndicator
            current={mockWeeklyData.currentWeek.revenue}
            previous={mockWeeklyData.previousWeek.revenue}
            format="currency"
          />

          <ChangeIndicator
            current={mockWeeklyData.currentWeek.averageTicket}
            previous={mockWeeklyData.previousWeek.averageTicket}
            format="currency"
            suffix=" avg ticket"
          />

          <ChangeIndicator
            current={mockWeeklyData.currentWeek.bookingRate}
            previous={mockWeeklyData.previousWeek.bookingRate}
            format="percentage"
          />
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>Week of {mockWeeklyData.currentWeek.weekStart}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Service Revenue */}
            <div className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => handleRevenueItemClick('Service Revenue')}>
              <span className="text-sm font-medium">Service Revenue</span>
              <span className="font-bold">${mockWeeklyData.currentWeek.serviceRevenue.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(mockWeeklyData.currentWeek.serviceRevenue / mockWeeklyData.currentWeek.revenue) * 100}%` }}
              ></div>
            </div>

            {/* Tips */}
            <div className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => handleRevenueItemClick('Tips')}>
              <span className="text-sm font-medium">Tips</span>
              <span className="font-bold">${mockWeeklyData.currentWeek.tips.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${(mockWeeklyData.currentWeek.tips / mockWeeklyData.currentWeek.revenue) * 100}%` }}
              ></div>
            </div>

            {/* Products */}
            <div className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => handleRevenueItemClick('Product Sales')}>
              <span className="text-sm font-medium">Product Sales</span>
              <span className="font-bold">${mockWeeklyData.currentWeek.products.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-slate-600 h-2 rounded-full"
                style={{ width: `${(mockWeeklyData.currentWeek.products / mockWeeklyData.currentWeek.revenue) * 100}%` }}
              ></div>
            </div>

            {/* Customer Mix */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Customer Mix</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{mockWeeklyData.currentWeek.newCustomers}</div>
                  <div className="text-xs text-gray-600">New Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{mockWeeklyData.currentWeek.returningCustomers}</div>
                  <div className="text-xs text-gray-600">Returning Customers</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
