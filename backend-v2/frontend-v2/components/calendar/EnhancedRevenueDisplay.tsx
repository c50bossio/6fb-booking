'use client'

import React, { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { TrendingUp, TrendingDown, DollarSign, Calendar, ChevronUp, ChevronDown } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import type { BookingResponse } from '@/lib/api'
import { useResponsive } from '@/hooks/useResponsive'

interface EnhancedRevenueDisplayProps {
  appointments: BookingResponse[]
  todayRevenue: number
  todayCount: number
  selectedDate: Date
  collapsed?: boolean
  onToggleCollapse?: () => void
}

interface RevenueStats {
  today: number
  todayCount: number
  week: number
  weekCount: number
  month: number
  monthCount: number
  weekChange: number
  monthChange: number
}

export default function EnhancedRevenueDisplay({
  appointments,
  todayRevenue,
  todayCount,
  selectedDate,
  collapsed = false,
  onToggleCollapse
}: EnhancedRevenueDisplayProps) {
  const { isMobile } = useResponsive()

  // Calculate comprehensive revenue statistics
  const revenueStats = useMemo((): RevenueStats => {
    const now = new Date()
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    
    // Previous periods for comparison
    const prevWeekStart = new Date(currentWeekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevWeekEnd = new Date(currentWeekEnd)
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
    
    const prevMonthStart = new Date(currentMonthStart)
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)
    const prevMonthEnd = new Date(currentMonthEnd)
    prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1)

    // Filter completed appointments only for revenue
    const completedAppointments = appointments.filter(apt => apt.status === 'completed')

    // Current week revenue
    const weekRevenue = completedAppointments
      .filter(apt => {
        const aptDate = new Date(apt.start_time)
        return isWithinInterval(aptDate, { start: currentWeekStart, end: currentWeekEnd })
      })
      .reduce((sum, apt) => sum + (apt.price || 0), 0)

    const weekCount = appointments
      .filter(apt => {
        const aptDate = new Date(apt.start_time)
        return isWithinInterval(aptDate, { start: currentWeekStart, end: currentWeekEnd })
      })
      .length

    // Previous week revenue
    const prevWeekRevenue = completedAppointments
      .filter(apt => {
        const aptDate = new Date(apt.start_time)
        return isWithinInterval(aptDate, { start: prevWeekStart, end: prevWeekEnd })
      })
      .reduce((sum, apt) => sum + (apt.price || 0), 0)

    // Current month revenue
    const monthRevenue = completedAppointments
      .filter(apt => {
        const aptDate = new Date(apt.start_time)
        return isWithinInterval(aptDate, { start: currentMonthStart, end: currentMonthEnd })
      })
      .reduce((sum, apt) => sum + (apt.price || 0), 0)

    const monthCount = appointments
      .filter(apt => {
        const aptDate = new Date(apt.start_time)
        return isWithinInterval(aptDate, { start: currentMonthStart, end: currentMonthEnd })
      })
      .length

    // Previous month revenue
    const prevMonthRevenue = completedAppointments
      .filter(apt => {
        const aptDate = new Date(apt.start_time)
        return isWithinInterval(aptDate, { start: prevMonthStart, end: prevMonthEnd })
      })
      .reduce((sum, apt) => sum + (apt.price || 0), 0)

    // Calculate percentage changes
    const weekChange = prevWeekRevenue > 0 
      ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 
      : 0

    const monthChange = prevMonthRevenue > 0 
      ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
      : 0

    return {
      today: todayRevenue,
      todayCount,
      week: weekRevenue,
      weekCount,
      month: monthRevenue,
      monthCount,
      weekChange,
      monthChange
    }
  }, [appointments, todayRevenue, todayCount])

  const formatCurrency = (amount: number) => {
    if (isMobile && amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`
    }
    return `$${amount.toFixed(2)}`
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  if (isMobile && collapsed) {
    return (
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-green-600" />
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(revenueStats.today)}
            </div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
        </div>
        <ChevronDown className="w-5 h-5 text-gray-400" />
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Header with collapse button on mobile */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Revenue Overview
          </h3>
          {isMobile && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronUp className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Revenue Grid */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-3 gap-4'}`}>
          {/* Today's Revenue */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Today</span>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(revenueStats.today)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {revenueStats.todayCount} appointments
            </div>
          </div>

          {/* This Week */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                revenueStats.weekChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {revenueStats.weekChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {formatChange(revenueStats.weekChange)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(revenueStats.week)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {revenueStats.weekCount} appointments
            </div>
          </div>

          {/* This Month */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                revenueStats.monthChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {revenueStats.monthChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {formatChange(revenueStats.monthChange)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(revenueStats.month)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {revenueStats.monthCount} appointments
            </div>
          </div>
        </div>

        {/* Mini Revenue Chart (placeholder for sparkline) */}
        {!isMobile && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Revenue Trend (30 days)
              </span>
              <span className="text-xs text-gray-500">
                {/* This could be replaced with a sparkline chart component */}
                Chart coming soon
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}