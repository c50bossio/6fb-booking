'use client'

import { useState, useEffect } from 'react'
import { getClientAnalytics, type Client } from '@/lib/api'

interface AnalyticsProps {
  clientId: number
  analytics: any
  client: Client
  onRefresh: () => void
}

interface ChartData {
  labels: string[]
  data: number[]
  colors: string[]
}

export default function ClientAnalytics({ clientId, analytics, client, onRefresh }: AnalyticsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentAnalytics, setCurrentAnalytics] = useState(analytics)

  useEffect(() => {
    setCurrentAnalytics(analytics)
  }, [analytics])

  const refreshAnalytics = async () => {
    try {
      setLoading(true)
      const updatedAnalytics = await getClientAnalytics(clientId)
      setCurrentAnalytics(updatedAnalytics)
      onRefresh()
    } catch (err: any) {
      setError('Failed to refresh analytics')
    } finally {
      setLoading(false)
    }
  }

  const calculateClientValue = () => {
    if (!currentAnalytics) return 0
    
    // Six Figure Barber client value calculation
    const visits = currentAnalytics.total_visits || 0
    const avgTicket = currentAnalytics.average_ticket || 0
    const frequency = currentAnalytics.visit_frequency_days || 30
    
    // Projected annual value based on frequency
    const visitsPerYear = 365 / frequency
    return visitsPerYear * avgTicket
  }

  const getClientLifetimeValue = () => {
    if (!currentAnalytics) return 0
    
    // Estimate lifetime value based on retention and spending patterns
    const annualValue = calculateClientValue()
    const retentionMultiplier = currentAnalytics.completion_rate || 0.8
    const estimatedLifetimeYears = 3 // Average client lifetime
    
    return annualValue * retentionMultiplier * estimatedLifetimeYears
  }

  const getRiskLevel = () => {
    if (!currentAnalytics) return 'low'
    
    const daysSinceLastVisit = currentAnalytics.days_since_last_visit || 0
    const noShowRate = (currentAnalytics.no_show_count || 0) / Math.max(currentAnalytics.total_scheduled || 1, 1)
    const cancelRate = (currentAnalytics.cancellation_count || 0) / Math.max(currentAnalytics.total_scheduled || 1, 1)
    
    if (daysSinceLastVisit > 90 || noShowRate > 0.3 || cancelRate > 0.4) return 'high'
    if (daysSinceLastVisit > 60 || noShowRate > 0.2 || cancelRate > 0.3) return 'medium'
    return 'low'
  }

  const getEngagementScore = () => {
    if (!currentAnalytics) return 0
    
    const completionRate = currentAnalytics.completion_rate || 0
    const frequencyScore = Math.min((30 / (currentAnalytics.visit_frequency_days || 30)), 1)
    const loyaltyScore = Math.min(currentAnalytics.total_visits / 10, 1)
    
    return Math.round((completionRate + frequencyScore + loyaltyScore) / 3 * 100)
  }

  const renderProgressBar = (value: number, max: number, color: string = 'blue') => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`bg-${color}-600 h-2 rounded-full transition-all duration-300`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      ></div>
    </div>
  )

  const renderMetricCard = (title: string, value: string | number, subtitle?: string, color: string = 'blue', icon?: string) => (
    <div className={`bg-white rounded-lg shadow-sm border border-${color}-100 p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium text-${color}-600`}>{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-3 bg-${color}-100 rounded-full`}>
            <span className="text-2xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  )

  const renderBookingPatterns = () => {
    if (!currentAnalytics?.booking_patterns) return null

    const patterns = currentAnalytics.booking_patterns
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Booking Patterns</h3>
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600">📊</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {patterns.preferred_day && (
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">📅</div>
              <p className="text-sm text-gray-600">Preferred Day</p>
              <p className="font-semibold text-purple-800">{patterns.preferred_day}</p>
            </div>
          )}
          
          {patterns.preferred_hour && (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🕐</div>
              <p className="text-sm text-gray-600">Preferred Time</p>
              <p className="font-semibold text-blue-800">{patterns.preferred_hour}:00</p>
            </div>
          )}
          
          {patterns.preferred_service && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">✂️</div>
              <p className="text-sm text-gray-600">Favorite Service</p>
              <p className="font-semibold text-green-800">{patterns.preferred_service}</p>
            </div>
          )}
          
          {currentAnalytics.visit_frequency_days && (
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl mb-2">🔄</div>
              <p className="text-sm text-gray-600">Visit Frequency</p>
              <p className="font-semibold text-orange-800">Every {Math.round(currentAnalytics.visit_frequency_days)} days</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSixFigureInsights = () => {
    const clientValue = calculateClientValue()
    const lifetimeValue = getClientLifetimeValue()
    const riskLevel = getRiskLevel()
    const engagementScore = getEngagementScore()

    const riskColors = {
      low: 'green',
      medium: 'yellow',
      high: 'red'
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Six Figure Barber Insights</h3>
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600">💎</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">${Math.round(clientValue)}</span>
            </div>
            <h4 className="font-semibold text-gray-900">Annual Value</h4>
            <p className="text-sm text-gray-600">Projected yearly revenue</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">${Math.round(lifetimeValue)}</span>
            </div>
            <h4 className="font-semibold text-gray-900">Lifetime Value</h4>
            <p className="text-sm text-gray-600">Estimated total value</p>
          </div>

          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-${riskColors[riskLevel]}-400 to-${riskColors[riskLevel]}-600 rounded-full flex items-center justify-center`}>
              <span className="text-white text-xl">
                {riskLevel === 'low' ? '✅' : riskLevel === 'medium' ? '⚠️' : '🚨'}
              </span>
            </div>
            <h4 className="font-semibold text-gray-900">Risk Level</h4>
            <p className="text-sm text-gray-600 capitalize">{riskLevel} risk</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">{engagementScore}%</span>
            </div>
            <h4 className="font-semibold text-gray-900">Engagement</h4>
            <p className="text-sm text-gray-600">Overall score</p>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-900 mb-4">Performance Metrics</h5>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completion Rate</span>
                  <span>{Math.round((currentAnalytics?.completion_rate || 0) * 100)}%</span>
                </div>
                {renderProgressBar((currentAnalytics?.completion_rate || 0) * 100, 100, 'green')}
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Loyalty Score</span>
                  <span>{Math.min(currentAnalytics?.total_visits || 0, 10)}/10</span>
                </div>
                {renderProgressBar(Math.min(currentAnalytics?.total_visits || 0, 10), 10, 'purple')}
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Frequency Score</span>
                  <span>{Math.round(Math.min((30 / (currentAnalytics?.visit_frequency_days || 30)), 1) * 100)}%</span>
                </div>
                {renderProgressBar(Math.min((30 / (currentAnalytics?.visit_frequency_days || 30)), 1) * 100, 100, 'blue')}
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-4">Growth Opportunities</h5>
            <div className="space-y-3">
              {currentAnalytics?.visit_frequency_days > 45 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Frequency Opportunity:</strong> Client visits every {Math.round(currentAnalytics.visit_frequency_days)} days. 
                    Consider booking reminders to increase frequency.
                  </p>
                </div>
              )}
              
              {(currentAnalytics?.average_ticket || 0) < 50 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💰 <strong>Upsell Opportunity:</strong> Average ticket is ${(currentAnalytics?.average_ticket || 0).toFixed(2)}. 
                    Consider premium services or add-ons.
                  </p>
                </div>
              )}
              
              {(currentAnalytics?.referral_count || 0) === 0 && (currentAnalytics?.total_visits || 0) > 3 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    🎯 <strong>Referral Potential:</strong> Loyal client with no referrals yet. 
                    Great candidate for referral program.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentAnalytics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-500 mb-4">No analytics data available yet</p>
        <button 
          onClick={refreshAnalytics}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Analytics'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Client Analytics</h2>
        <button 
          onClick={refreshAnalytics}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard('Total Visits', currentAnalytics.total_visits || 0, 'Completed appointments', 'blue', '👥')}
        {renderMetricCard('Total Revenue', `$${(currentAnalytics.total_spent || 0).toFixed(2)}`, 'Lifetime spending', 'green', '💰')}
        {renderMetricCard('Average Ticket', `$${(currentAnalytics.average_ticket || 0).toFixed(2)}`, 'Per appointment', 'purple', '🎫')}
        {renderMetricCard('Completion Rate', `${Math.round((currentAnalytics.completion_rate || 0) * 100)}%`, 'Reliability score', 'orange', '✅')}
      </div>

      {/* Six Figure Barber Insights */}
      {renderSixFigureInsights()}

      {/* Booking Patterns */}
      {renderBookingPatterns()}

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Statistics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Appointment Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Scheduled</span>
              <span className="font-semibold">{currentAnalytics.total_scheduled || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{currentAnalytics.total_visits || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">No Shows</span>
              <span className="font-semibold text-red-600">{currentAnalytics.no_show_count || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cancellations</span>
              <span className="font-semibold text-yellow-600">{currentAnalytics.cancellation_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Visit</span>
              <span className="font-semibold">
                {currentAnalytics.last_visit_date 
                  ? new Date(currentAnalytics.last_visit_date).toLocaleDateString()
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Days Since Last Visit</span>
              <span className={`font-semibold ${
                (currentAnalytics.days_since_last_visit || 0) > 60 ? 'text-red-600' : 
                (currentAnalytics.days_since_last_visit || 0) > 30 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {currentAnalytics.days_since_last_visit || 0} days
              </span>
            </div>
            {currentAnalytics.visit_frequency_days && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Typical Visit Interval</span>
                <span className="font-semibold">{Math.round(currentAnalytics.visit_frequency_days)} days</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}