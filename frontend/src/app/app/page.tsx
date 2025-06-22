'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  LinkIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'
import TrafftIntegration from '@/components/dashboard/TrafftIntegration'
import ModernCalendar from '@/components/ModernCalendar'

interface TodayStats {
  total_appointments: number
  upcoming_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  today_revenue: number
}

interface BarberInfo {
  id: string
  first_name: string
  last_name: string
  is_active: boolean
}

export default function AppPage() {
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayStats, setTodayStats] = useState<TodayStats>({
    total_appointments: 12,
    upcoming_appointments: 4,
    completed_appointments: 7,
    cancelled_appointments: 1,
    today_revenue: 840.00
  })
  const [activeBarbers] = useState<number>(4)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-theme-card">
      {/* Main Content */}
      <main className="p-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-theme-primary mb-2">
                  Welcome to BookBarber Platform!
                </h2>
                <p className="text-theme-secondary">
                  Explore the complete barbershop management system - all features enabled.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-white rounded-lg shadow-md p-3">
                  <div className="flex items-center space-x-2 text-violet-600">
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">+23.5% this week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-theme-card rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    +18.2%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-theme-secondary text-sm font-medium mb-1">Today's Revenue</p>
                <p className="text-2xl font-bold text-theme-primary">
                  {formatCurrency(todayStats.today_revenue)}
                </p>
                <div className="mt-3 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-theme-card rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
                    Active
                  </p>
                </div>
              </div>
              <div>
                <p className="text-theme-secondary text-sm font-medium mb-1">Appointments</p>
                <p className="text-2xl font-bold text-theme-primary">
                  {todayStats.total_appointments}
                </p>
                <p className="text-xs text-violet-600 mt-1">{todayStats.completed_appointments} completed, {todayStats.upcoming_appointments} upcoming</p>
              </div>
            </div>

            <div className="bg-theme-card rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Online
                  </p>
                </div>
              </div>
              <div>
                <p className="text-theme-secondary text-sm font-medium mb-1">Active Barbers</p>
                <p className="text-2xl font-bold text-theme-primary">
                  {activeBarbers}
                </p>
                <p className="text-xs text-blue-600 mt-1">All team members active</p>
              </div>
            </div>

            <div className="bg-theme-card rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    Next: Thu
                  </p>
                </div>
              </div>
              <div>
                <p className="text-theme-secondary text-sm font-medium mb-1">Weekly Payout</p>
                <p className="text-2xl font-bold text-theme-primary">
                  $3,240
                </p>
                <p className="text-xs text-amber-600 mt-1">Auto-payout enabled</p>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Today's Schedule</h3>
            <ModernCalendar />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a
              href="/app/appointments"
              className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                  {todayStats.total_appointments} Today
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">
                Manage Appointments
              </h3>
              <p className="text-sm text-gray-600">
                View and manage today's schedule
              </p>
            </a>

            <a
              href="/app/barbers"
              className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {activeBarbers} Active
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                Team Management
              </h3>
              <p className="text-sm text-gray-600">
                Manage barbers and payment accounts
              </p>
            </a>

            <a
              href="/app/analytics"
              className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Live Data
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                Analytics Dashboard
              </h3>
              <p className="text-sm text-gray-600">
                Track performance and insights
              </p>
            </a>

            <a
              href="/app/payments"
              className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <CreditCardIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  Secure
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                Payment Processing
              </h3>
              <p className="text-sm text-gray-600">
                Process and track transactions
              </p>
            </a>

            <a
              href="/app/payouts"
              className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  Automated
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                Barber Payouts
              </h3>
              <p className="text-sm text-gray-600">
                Manage commission payments
              </p>
            </a>

            <a
              href="/app/clients"
              className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-pink-600 bg-pink-50 px-3 py-1 rounded-full">
                  1,250+
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                Client Management
              </h3>
              <p className="text-sm text-gray-600">
                View client profiles and history
              </p>
            </a>
          </div>

          {/* Demo Notice */}
          <div className="mt-12 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">🚀 Full Access Demo Mode</h3>
                <p className="text-violet-100">
                  You're exploring the complete BookBarber platform with all features enabled. All buttons are fully functional!
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="bg-white/20 px-2 py-1 rounded">✅ Interactive Dashboard</span>
                  <span className="bg-white/20 px-2 py-1 rounded">✅ Live Analytics</span>
                  <span className="bg-white/20 px-2 py-1 rounded">✅ Booking System</span>
                  <span className="bg-white/20 px-2 py-1 rounded">✅ Payment Processing</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <a
                  href="/login"
                  className="bg-white text-violet-600 px-4 py-2 rounded-lg font-medium hover:bg-violet-50 transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="/signup"
                  className="bg-violet-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-800 transition-colors"
                >
                  Create Account
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
