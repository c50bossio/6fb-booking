'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Mock data - in real app this would come from API
const mockMetrics = {
  daily: {
    appointments: 8,
    revenue: 485.50,
    averageTicket: 60.69,
    bookingRate: 80.0
  },
  weekly: {
    appointments: 34,
    revenue: 2340.75,
    averageTicket: 68.85,
    bookingRate: 85.0,
    newCustomers: 12,
    returningCustomers: 22
  },
  comparisons: {
    revenueChange: 15.3,
    appointmentsChange: 8.2
  }
}

export default function MetricsCards() {
  const handleCardClick = (cardType: string) => {
    alert(`${cardType} clicked! In Phase 2: Detailed view with charts and historical data would open.`)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Today's Appointments */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick("Today's Appointments")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
          <div className="h-4 w-4 text-blue-600">📅</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mockMetrics.daily.appointments}</div>
          <p className="text-xs text-muted-foreground">
            Booking rate: {mockMetrics.daily.bookingRate}%
          </p>
        </CardContent>
      </Card>

      {/* Today's Revenue */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick("Today's Revenue")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
          <div className="h-4 w-4 text-green-600">💰</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${mockMetrics.daily.revenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Avg ticket: ${mockMetrics.daily.averageTicket.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Weekly Appointments */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick("Weekly Appointments")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <Badge variant={mockMetrics.comparisons.appointmentsChange > 0 ? "default" : "destructive"}>
            {mockMetrics.comparisons.appointmentsChange > 0 ? "+" : ""}{mockMetrics.comparisons.appointmentsChange}%
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mockMetrics.weekly.appointments} appointments</div>
          <p className="text-xs text-muted-foreground">
            {mockMetrics.weekly.newCustomers} new, {mockMetrics.weekly.returningCustomers} returning
          </p>
        </CardContent>
      </Card>

      {/* Weekly Revenue */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick("Weekly Revenue")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
          <Badge variant={mockMetrics.comparisons.revenueChange > 0 ? "default" : "destructive"}>
            {mockMetrics.comparisons.revenueChange > 0 ? "+" : ""}{mockMetrics.comparisons.revenueChange}%
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${mockMetrics.weekly.revenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Avg: ${mockMetrics.weekly.averageTicket.toFixed(2)} per appointment
          </p>
        </CardContent>
      </Card>
    </div>
  )
}