'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getNotificationStats, NotificationStats } from '../../lib/api'
import NotificationTemplates from '../../components/NotificationTemplates'
import NotificationHistory from '../../components/NotificationHistory'
import NotificationSettings from '../../components/NotificationSettings'
import SendNotification from '../../components/SendNotification'

type TabType = 'overview' | 'templates' | 'history' | 'settings' | 'send'

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        // Check if user is authenticated and has admin/barber role
        const userProfile = await getProfile()
        if (!userProfile.role || !['admin', 'barber'].includes(userProfile.role)) {
          router.push('/dashboard')
          return
        }
        setUser(userProfile)
        
        // Load notification statistics
        await loadStats()
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const loadStats = async (days: number = 7) => {
    setStatsLoading(true)
    try {
      const notificationStats = await getNotificationStats(days)
      setStats(notificationStats)
    } catch (err: any) {
      } finally {
      setStatsLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'templates', label: 'Templates', icon: '📝' },
    { id: 'history', label: 'History', icon: '📋' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'send', label: 'Send', icon: '📤' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user || !['admin', 'barber'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">Access denied. Admin or Barber role required.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notification Management</h1>
                <p className="text-gray-600 mt-1">Manage templates, preferences, and track notification delivery</p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="bg-white shadow-lg rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Notification Statistics</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadStats(7)}
                        className={`px-3 py-1 text-sm rounded ${stats?.period_days === 7 ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'}`}
                      >
                        7 Days
                      </button>
                      <button
                        onClick={() => loadStats(30)}
                        className={`px-3 py-1 text-sm rounded ${stats?.period_days === 30 ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'}`}
                      >
                        30 Days
                      </button>
                      <button
                        onClick={() => loadStats(90)}
                        className={`px-3 py-1 text-sm rounded ${stats?.period_days === 90 ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'}`}
                      >
                        90 Days
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-6">
                  {statsLoading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Loading statistics...</div>
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Email Stats */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">📧 Email Notifications</h3>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-600">Sent:</span>
                            <span className="font-medium text-blue-800">{stats.email.sent || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-600">Failed:</span>
                            <span className="font-medium text-red-600">{stats.email.failed || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-600">Pending:</span>
                            <span className="font-medium text-yellow-600">{stats.email.pending || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* SMS Stats */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-green-800 mb-2">📱 SMS Notifications</h3>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">Sent:</span>
                            <span className="font-medium text-green-800">{stats.sms.sent || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">Failed:</span>
                            <span className="font-medium text-red-600">{stats.sms.failed || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">Pending:</span>
                            <span className="font-medium text-yellow-600">{stats.sms.pending || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-purple-800 mb-2">📈 Success Rate</h3>
                        <div className="space-y-1">
                          {(() => {
                            const totalEmail = (stats.email.sent || 0) + (stats.email.failed || 0)
                            const totalSms = (stats.sms.sent || 0) + (stats.sms.failed || 0)
                            const emailRate = totalEmail > 0 ? ((stats.email.sent || 0) / totalEmail * 100).toFixed(1) : '0'
                            const smsRate = totalSms > 0 ? ((stats.sms.sent || 0) / totalSms * 100).toFixed(1) : '0'
                            
                            return (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-purple-600">Email:</span>
                                  <span className="font-medium text-purple-800">{emailRate}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-purple-600">SMS:</span>
                                  <span className="font-medium text-purple-800">{smsRate}%</span>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Total Volume */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-800 mb-2">📊 Total Volume</h3>
                        <div className="space-y-1">
                          {(() => {
                            const totalEmail = (stats.email.sent || 0) + (stats.email.failed || 0) + (stats.email.pending || 0)
                            const totalSms = (stats.sms.sent || 0) + (stats.sms.failed || 0) + (stats.sms.pending || 0)
                            const total = totalEmail + totalSms
                            
                            return (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Email:</span>
                                  <span className="font-medium text-gray-800">{totalEmail}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">SMS:</span>
                                  <span className="font-medium text-gray-800">{totalSms}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium border-t pt-1 mt-2">
                                  <span className="text-gray-800">Total:</span>
                                  <span className="text-gray-800">{total}</span>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500">No statistics available</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow-lg rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                </div>
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📝</span>
                        <div>
                          <div className="font-medium text-gray-900">Manage Templates</div>
                          <div className="text-sm text-gray-500">Create and edit notification templates</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('send')}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📤</span>
                        <div>
                          <div className="font-medium text-gray-900">Send Notification</div>
                          <div className="text-sm text-gray-500">Send manual notifications to users</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📋</span>
                        <div>
                          <div className="font-medium text-gray-900">View History</div>
                          <div className="text-sm text-gray-500">Track sent notifications and delivery status</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <NotificationTemplates />
          )}

          {activeTab === 'history' && (
            <NotificationHistory />
          )}

          {activeTab === 'settings' && (
            <NotificationSettings />
          )}

          {activeTab === 'send' && (
            <SendNotification />
          )}
        </div>
      </div>
    </div>
  )
}