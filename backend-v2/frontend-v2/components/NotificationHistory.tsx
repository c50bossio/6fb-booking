'use client'

import { useState, useEffect } from 'react'
import { getNotificationHistory } from '../lib/api'
import { format } from 'date-fns'

interface NotificationHistoryItem {
  id: number
  notification_type: string
  template_name: string
  recipient: string
  subject?: string
  status: string
  scheduled_for: string
  sent_at?: string
  attempts: number
  error_message?: string
  created_at: string
  // Additional fields for UI enrichment
  user_id?: number
  user_name?: string
  user_email?: string
  phone_number?: string
  appointment_id?: number
  channel?: string
  metadata?: any
}

interface SMSConversation {
  client_phone: string
  client_name: string
  client_email?: string
  messages: Array<{
    id: number
    notification_type: string
    template_name: string
    status: string
    sent_at: string
    error_message?: string
    metadata?: any
  }>
  last_message_at: string
  total_messages: number
}

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'conversations'>('conversations')
  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('sms')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await getNotificationHistory()
      // Enrich data with inferred channel and phone number
      const enrichedData = data.map(item => {
        // Infer channel from recipient format
        const isEmail = item.recipient.includes('@')
        const channel = isEmail ? 'email' : 'sms'
        const phone_number = !isEmail ? item.recipient : undefined
        const user_email = isEmail ? item.recipient : undefined
        
        return {
          ...item,
          channel,
          phone_number,
          user_email,
          user_name: item.recipient // Use recipient as name fallback
        } as NotificationHistoryItem
      })
      // Sort by created_at descending
      const sortedData = enrichedData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setNotifications(sortedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load notification history')
    } finally {
      setLoading(false)
    }
  }

  // Group notifications by phone number for conversation view
  const getConversations = (): SMSConversation[] => {
    const smsNotifications = notifications.filter(n => n.channel === 'sms' && n.phone_number)
    const conversationMap = new Map<string, SMSConversation>()

    smsNotifications.forEach(notification => {
      const phone = notification.phone_number!
      
      if (!conversationMap.has(phone)) {
        conversationMap.set(phone, {
          client_phone: phone,
          client_name: notification.user_name || 'Unknown',
          client_email: notification.user_email,
          messages: [],
          last_message_at: notification.created_at,
          total_messages: 0
        })
      }

      const conversation = conversationMap.get(phone)!
      conversation.messages.push({
        id: notification.id,
        notification_type: notification.notification_type,
        template_name: notification.template_name || notification.notification_type,
        status: notification.status,
        sent_at: notification.sent_at || notification.created_at,
        error_message: notification.error_message,
        metadata: notification.metadata
      })
      conversation.total_messages++
      
      // Update last message time
      if (new Date(notification.created_at) > new Date(conversation.last_message_at)) {
        conversation.last_message_at = notification.created_at
      }
    })

    // Sort conversations by last message time
    return Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter
    const matchesChannel = channelFilter === 'all' || notification.channel === channelFilter
    const matchesSearch = !searchTerm || 
      notification.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.phone_number?.includes(searchTerm) ||
      notification.notification_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesChannel && matchesSearch
  })

  // Filter conversations
  const filteredConversations = searchTerm 
    ? getConversations().filter(conv => 
        conv.client_phone.includes(searchTerm) ||
        conv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.client_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : getConversations()

  // Paginate data
  const totalPages = Math.ceil(
    viewMode === 'conversations' 
      ? filteredConversations.length / itemsPerPage
      : filteredNotifications.length / itemsPerPage
  )
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedConversations = filteredConversations.slice(startIndex, startIndex + itemsPerPage)
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage)

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getTemplateCategory = (templateName: string) => {
    if (templateName.includes('confirmation')) return 'Confirmation'
    if (templateName.includes('reminder')) return 'Reminder'
    if (templateName.includes('change') || templateName.includes('update')) return 'Changes'
    if (templateName.includes('cancellation')) return 'Cancellation'
    return 'Other'
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">SMS Customer Communication Center</h2>
              <p className="text-sm text-gray-600 mt-1">
                Track real text message conversations with customers' actual phone numbers
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setViewMode('conversations')
                  setChannelFilter('sms')
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  viewMode === 'conversations'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                SMS Conversations
              </button>
              <button
                onClick={() => {
                  setViewMode('list')
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  viewMode === 'list'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All Notifications
              </button>
              <button
                onClick={loadNotifications}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search by phone, name, or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            
            {viewMode === 'list' && (
              <>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <select
                    value={channelFilter}
                    onChange={(e) => {
                      setChannelFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">All Channels</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : viewMode === 'conversations' ? (
          // Conversations View
          <div className="divide-y divide-gray-200">
            {filteredConversations.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">No SMS conversations found</p>
              </div>
            ) : (
              paginatedConversations.map((conversation) => (
                <div
                  key={conversation.client_phone}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedPhone(
                    selectedPhone === conversation.client_phone ? null : conversation.client_phone
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{conversation.client_name}</div>
                        <div className="text-sm text-gray-600">{conversation.client_phone}</div>
                        {conversation.client_email && (
                          <div className="text-xs text-gray-500">{conversation.client_email}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">
                        {conversation.total_messages} {conversation.total_messages === 1 ? 'message' : 'messages'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Last: {format(new Date(conversation.last_message_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Message History */}
                  {selectedPhone === conversation.client_phone && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {conversation.messages.map((message) => (
                          <div key={message.id} className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    getTemplateCategory(message.template_name) === 'Confirmation' ? 'bg-blue-100 text-blue-800' :
                                    getTemplateCategory(message.template_name) === 'Reminder' ? 'bg-yellow-100 text-yellow-800' :
                                    getTemplateCategory(message.template_name) === 'Changes' ? 'bg-purple-100 text-purple-800' :
                                    getTemplateCategory(message.template_name) === 'Cancellation' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {getTemplateCategory(message.template_name)}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    message.status === 'sent' || message.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    message.status === 'failed' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {message.status}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-gray-600">
                                  {message.template_name.replace(/_/g, ' ').replace(/sms /i, '')}
                                </div>
                                {message.error_message && (
                                  <div className="mt-1 text-xs text-red-600">
                                    Error: {message.error_message}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 ml-4">
                                {format(new Date(message.sent_at), 'MMM d, h:mm a')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          // List View
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedNotifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {notification.user_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {notification.channel === 'sms' ? notification.phone_number : notification.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {notification.notification_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        notification.channel === 'sms' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {(notification.channel || 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        notification.status === 'sent' || notification.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        notification.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {notification.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {notification.sent_at ? formatDateTime(notification.sent_at) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  if (page > totalPages) return null
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm font-medium rounded ${
                        currentPage === page
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}