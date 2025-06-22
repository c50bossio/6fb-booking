'use client'

import { useEffect, useState } from 'react'
import {
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import ModernLayout from '@/components/ModernLayout'
import axios from 'axios'

interface Notification {
  id: string
  type: 'appointment' | 'payment' | 'system' | 'reminder' | 'alert'
  title: string
  message: string
  is_read: boolean
  created_at: string
  data?: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
}

interface NotificationStats {
  total: number
  unread: number
  high_priority: number
  urgent: number
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterRead, setFilterRead] = useState<string>('all')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setNotifications(response.data.notifications || [])
      setStats(response.data.stats || {
        total: 0,
        unread: 0,
        high_priority: 0,
        urgent: 0
      })
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      // Use mock data
      const mockNotifications = [
        {
          id: '1',
          type: 'appointment',
          title: 'New Appointment Scheduled',
          message: 'John Smith has booked a Premium Fade for tomorrow at 2:00 PM',
          is_read: false,
          created_at: '2024-06-22T10:30:00Z',
          priority: 'medium',
          category: 'Booking',
          data: { appointment_id: '123', client_name: 'John Smith' }
        },
        {
          id: '2',
          type: 'payment',
          title: 'Payment Received',
          message: 'Payment of $65.00 received from Mike Johnson for Classic Cut',
          is_read: false,
          created_at: '2024-06-22T09:15:00Z',
          priority: 'low',
          category: 'Payment'
        },
        {
          id: '3',
          type: 'reminder',
          title: 'Upcoming Appointment Reminder',
          message: 'David Wilson has an appointment in 30 minutes',
          is_read: true,
          created_at: '2024-06-22T08:30:00Z',
          priority: 'high',
          category: 'Reminder'
        },
        {
          id: '4',
          type: 'alert',
          title: 'Client No-Show',
          message: 'Chris Brown missed his 1:00 PM appointment without cancelling',
          is_read: false,
          created_at: '2024-06-22T13:15:00Z',
          priority: 'urgent',
          category: 'Alert'
        },
        {
          id: '5',
          type: 'system',
          title: 'Weekly Report Available',
          message: 'Your weekly performance report is ready for review',
          is_read: true,
          created_at: '2024-06-21T18:00:00Z',
          priority: 'low',
          category: 'System'
        }
      ]
      
      setNotifications(mockNotifications)
      setStats({
        total: 5,
        unread: 3,
        high_priority: 2,
        urgent: 1
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      
      // Update stats
      if (stats) {
        setStats(prev => prev ? { ...prev, unread: prev.unread - 1 } : null)
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setStats(prev => prev ? { ...prev, unread: 0 } : null)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (stats) {
        setStats(prev => prev ? { ...prev, total: prev.total - 1 } : null)
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'urgent' ? 'text-red-600' :
                     priority === 'high' ? 'text-amber-600' :
                     priority === 'medium' ? 'text-blue-600' : 'text-gray-600'
    
    switch (type) {
      case 'appointment':
        return <CalendarIcon className={`h-5 w-5 ${iconClass}`} />
      case 'payment':
        return <CurrencyDollarIcon className={`h-5 w-5 ${iconClass}`} />
      case 'reminder':
        return <ClockIcon className={`h-5 w-5 ${iconClass}`} />
      case 'alert':
        return <ExclamationTriangleIcon className={`h-5 w-5 ${iconClass}`} />
      case 'system':
        return <InformationCircleIcon className={`h-5 w-5 ${iconClass}`} />
      default:
        return <BellIcon className={`h-5 w-5 ${iconClass}`} />
    }
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-amber-100 text-amber-800 border-amber-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[priority as keyof typeof styles]}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || notification.type === filterType
    const matchesRead = filterRead === 'all' || 
                       (filterRead === 'unread' && !notification.is_read) ||
                       (filterRead === 'read' && notification.is_read)
    
    return matchesSearch && matchesType && matchesRead
  })

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="appointment">Appointments</option>
              <option value="payment">Payments</option>
              <option value="reminder">Reminders</option>
              <option value="alert">Alerts</option>
              <option value="system">System</option>
            </select>
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <CheckIcon className="h-5 w-5" />
              <span>Mark All Read</span>
            </button>
            
            <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2">
              <BellIcon className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <BellIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <EyeIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Unread</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.unread || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">High Priority</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.high_priority || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Urgent</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.urgent || 0}</p>
          </div>
        </div>

        {/* Notifications List */}
        <div className="premium-card-modern overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications ({filteredNotifications.length})
            </h3>
          </div>
          
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No notifications found for the selected criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200/50">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-6 hover:bg-gray-50/50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          {getPriorityBadge(notification.priority)}
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatTimestamp(notification.created_at)}</span>
                          {notification.category && (
                            <>
                              <span>•</span>
                              <span>{notification.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.is_read && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="text-blue-600 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModernLayout>
  )
}