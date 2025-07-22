'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Bell,
  AlertTriangle,
  TrendingUp,
  Trophy,
  DollarSign,
  Users,
  Target,
  Mail,
  BarChart3,
  Lightbulb,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { formatters } from '@/lib/formatters'

interface SmartNotification {
  id: string
  user_id: number
  type: string
  priority: string
  title: string
  message: string
  action_items: string[]
  data: Record<string, any>
  created_at: string
  expires_at?: string
  is_read: boolean
  is_actionable: boolean
  estimated_impact?: string
  next_review_date?: string
}

interface NotificationSummary {
  total_notifications: number
  unread_count: number
  urgent_count: number
  high_priority_count: number
  notifications_by_type: Record<string, number>
  estimated_total_revenue_impact: number
  top_priority_actions: string[]
}

interface SmartNotificationsCardProps {
  userId: number
  className?: string
  compact?: boolean
}

export default function SmartNotificationsCard({ 
  userId, 
  className = '', 
  compact = false 
}: SmartNotificationsCardProps) {
  const [notifications, setNotifications] = useState<SmartNotification[]>([])
  const [summary, setSummary] = useState<NotificationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const fetchNotifications = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('token')
      
      // Fetch notifications and summary in parallel
      const [notificationsRes, summaryRes] = await Promise.all([
        fetch('/api/v2/notifications/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/v2/notifications/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (!notificationsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const notificationsData = await notificationsRes.json()
      const summaryData = await summaryRes.json()
      
      setNotifications(notificationsData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to fetch smart notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [userId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v2/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        )
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const dismissNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v2/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        if (summary) {
          setSummary(prev => prev ? {
            ...prev,
            total_notifications: prev.total_notifications - 1,
            unread_count: prev.unread_count - 1
          } : null)
        }
      }
    } catch (err) {
      console.error('Failed to dismiss notification:', err)
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      'at_risk_client': <Users className="w-5 h-5" />,
      'pricing_opportunity': <DollarSign className="w-5 h-5" />,
      'milestone_achievement': <Trophy className="w-5 h-5" />,
      'service_performance': <BarChart3 className="w-5 h-5" />,
      'revenue_opportunity': <TrendingUp className="w-5 h-5" />,
      'business_coaching': <Lightbulb className="w-5 h-5" />,
      'six_figure_progress': <Target className="w-5 h-5" />,
      'client_outreach': <Mail className="w-5 h-5" />
    }
    return iconMap[type] || <Bell className="w-5 h-5" />
  }

  const getPriorityColor = (priority: string) => {
    const colorMap = {
      'urgent': 'bg-red-100 text-red-800 border-red-200',
      'high': 'bg-orange-100 text-orange-800 border-orange-200',
      'medium': 'bg-blue-100 text-blue-800 border-blue-200',
      'low': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colorMap[priority] || colorMap['low']
  }

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent') return <ExclamationCircleIcon className="w-4 h-4" />
    if (priority === 'high') return <AlertTriangle className="w-4 h-4" />
    return <Bell className="w-4 h-4" />
  }

  const filterNotifications = (filter: string) => {
    switch (filter) {
      case 'urgent':
        return notifications.filter(n => n.priority === 'urgent')
      case 'unread':
        return notifications.filter(n => !n.is_read)
      case 'actionable':
        return notifications.filter(n => n.is_actionable)
      default:
        return notifications
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm mb-4">{error}</p>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-sm">Smart Notifications</span>
            </div>
            <Button 
              onClick={handleRefresh} 
              size="sm" 
              variant="ghost" 
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Active</p>
              <p className="font-bold text-lg">{summary?.total_notifications || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Revenue Impact</p>
              <p className="font-bold text-lg text-green-600">
                {formatters.currency(summary?.estimated_total_revenue_impact || 0, { showCents: false })}
              </p>
            </div>
          </div>
          {summary && summary.urgent_count > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-red-600 mb-1">
                <span className="flex items-center gap-1">
                  <ExclamationCircleIcon className="w-3 h-3" />
                  Urgent Actions
                </span>
                <span>{summary.urgent_count}</span>
              </div>
              <Progress value={(summary.urgent_count / summary.total_notifications) * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const filteredNotifications = filterNotifications(activeTab)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Smart Notifications</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Six Figure business intelligence alerts
              </p>
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            size="sm" 
            variant="ghost" 
            disabled={refreshing}
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Bell className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.total_notifications}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.urgent_count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Urgent</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatters.currency(summary.estimated_total_revenue_impact, { showCents: false })}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Impact</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Target className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.top_priority_actions.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Actions</div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="urgent">Urgent ({notifications.filter(n => n.priority === 'urgent').length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({notifications.filter(n => !n.is_read).length})</TabsTrigger>
            <TabsTrigger value="actionable">Actions ({notifications.filter(n => n.is_actionable).length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No notifications found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Your Six Figure business intelligence is monitoring for opportunities
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg ${
                      !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                            <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                              <span className="flex items-center gap-1">
                                {getPriorityIcon(notification.priority)}
                                {notification.priority.toUpperCase()}
                              </span>
                            </Badge>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                          {notification.estimated_impact && (
                            <p className="text-sm font-medium text-green-600">
                              💰 {notification.estimated_impact}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {!notification.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                            className="h-8 w-8 p-0"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissNotification(notification.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {notification.action_items.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 mt-3">
                        <h5 className="font-medium text-sm mb-2">Recommended Actions:</h5>
                        <ul className="space-y-1">
                          {notification.action_items.map((action, index) => (
                            <li key={index} className="text-sm flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                      <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                      {notification.expires_at && (
                        <span>Expires: {new Date(notification.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}