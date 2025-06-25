'use client'

import { useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface PayoutEvent {
  id: string
  date: string
  barbers: string[]
  totalAmount: number
  status: 'scheduled' | 'completed' | 'failed' | 'processing'
  payoutCount: number
}

interface TimelineEvent {
  id: string
  timestamp: string
  type: 'payout' | 'schedule_change' | 'failure' | 'retry'
  title: string
  description: string
  amount?: number
  status?: 'success' | 'pending' | 'failed'
}

export default function PayoutCalendarView() {
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const [payoutEvents] = useState<PayoutEvent[]>([
    {
      id: '1',
      date: '2024-06-05',
      barbers: ['Marcus Johnson', 'Anthony Davis', 'Jerome Williams'],
      totalAmount: 3456,
      status: 'completed',
      payoutCount: 3
    },
    {
      id: '2',
      date: '2024-06-12',
      barbers: ['Marcus Johnson', 'Anthony Davis', 'Jerome Williams'],
      totalAmount: 3789,
      status: 'completed',
      payoutCount: 3
    },
    {
      id: '3',
      date: '2024-06-19',
      barbers: ['Marcus Johnson', 'Anthony Davis', 'Jerome Williams'],
      totalAmount: 3124,
      status: 'completed',
      payoutCount: 3
    },
    {
      id: '4',
      date: '2024-06-26',
      barbers: ['Marcus Johnson', 'Anthony Davis', 'Jerome Williams'],
      totalAmount: 3456,
      status: 'scheduled',
      payoutCount: 3
    },
    {
      id: '5',
      date: '2024-07-03',
      barbers: ['Marcus Johnson', 'Anthony Davis', 'Jerome Williams'],
      totalAmount: 3456,
      status: 'scheduled',
      payoutCount: 3
    }
  ])

  const [timelineEvents] = useState<TimelineEvent[]>([
    {
      id: '1',
      timestamp: '2024-06-26T10:00:00Z',
      type: 'payout',
      title: 'Weekly Payout Scheduled',
      description: '3 payouts totaling $3,456',
      amount: 3456,
      status: 'pending'
    },
    {
      id: '2',
      timestamp: '2024-06-19T10:15:00Z',
      type: 'payout',
      title: 'Weekly Payout Completed',
      description: 'Successfully processed 3 payouts',
      amount: 3124,
      status: 'success'
    },
    {
      id: '3',
      timestamp: '2024-06-19T10:00:00Z',
      type: 'payout',
      title: 'Weekly Payout Initiated',
      description: 'Processing 3 barber payouts',
      amount: 3124,
      status: 'success'
    },
    {
      id: '4',
      timestamp: '2024-06-15T14:30:00Z',
      type: 'schedule_change',
      title: 'Payout Schedule Updated',
      description: 'Changed from bi-weekly to weekly payouts',
      status: 'success'
    },
    {
      id: '5',
      timestamp: '2024-06-12T10:45:00Z',
      type: 'failure',
      title: 'Payout Failed',
      description: 'Failed to process payout for Anthony Davis - Invalid account',
      status: 'failed'
    },
    {
      id: '6',
      timestamp: '2024-06-12T11:00:00Z',
      type: 'retry',
      title: 'Payout Retry Successful',
      description: 'Successfully processed payout for Anthony Davis',
      amount: 936,
      status: 'success'
    }
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  const getEventForDate = (day: number | null) => {
    if (!day) return null
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return payoutEvents.find(event => event.date === dateStr)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-600" />
      case 'processing':
        return <ClockIcon className="h-4 w-4 text-blue-600" />
      default:
        return <CalendarIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const getTimelineIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'payout':
        return <BanknotesIcon className="h-5 w-5 text-white" />
      case 'schedule_change':
        return <CalendarIcon className="h-5 w-5 text-white" />
      case 'failure':
        return <XCircleIcon className="h-5 w-5 text-white" />
      case 'retry':
        return <CheckCircleIcon className="h-5 w-5 text-white" />
    }
  }

  const getTimelineColor = (type: TimelineEvent['type'], status?: string) => {
    if (status === 'failed' || type === 'failure') return 'bg-red-600'
    if (status === 'pending') return 'bg-amber-600'
    if (type === 'schedule_change') return 'bg-blue-600'
    return 'bg-green-600'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Payout Schedule</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'calendar'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'timeline'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <>
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h4 className="text-lg font-medium text-gray-900">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="bg-gray-50 px-2 py-3 text-center">
                <span className="text-xs font-medium text-gray-700">{day}</span>
              </div>
            ))}

            {/* Calendar Days */}
            {getDaysInMonth(currentMonth).map((day, index) => {
              const event = getEventForDate(day)
              return (
                <div
                  key={index}
                  className={`bg-white p-2 min-h-[80px] ${
                    !day ? 'bg-gray-50' : ''
                  }`}
                >
                  {day && (
                    <>
                      <div className="text-sm text-gray-900 mb-1">{day}</div>
                      {event && (
                        <div
                          className={`p-2 rounded-lg text-xs ${
                            event.status === 'completed'
                              ? 'bg-green-50 text-green-700'
                              : event.status === 'scheduled'
                              ? 'bg-violet-50 text-violet-700'
                              : event.status === 'failed'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            {getStatusIcon(event.status)}
                            <span className="font-medium">{formatCurrency(event.totalAmount)}</span>
                          </div>
                          <div className="text-xs opacity-75">
                            {event.payoutCount} payouts
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Scheduled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Failed</span>
            </div>
          </div>
        </>
      ) : (
        /* Timeline View */
        <div className="flow-root">
          <ul className="-mb-8">
            {timelineEvents.map((event, eventIdx) => (
              <li key={event.id}>
                <div className="relative pb-8">
                  {eventIdx !== timelineEvents.length - 1 ? (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ${getTimelineColor(event.type, event.status)}`}>
                        {getTimelineIcon(event.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {event.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            {event.description}
                          </p>
                          {event.amount && (
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {formatCurrency(event.amount)}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 whitespace-nowrap ml-4">
                          {formatTimestamp(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
