import apiClient from './client'

export interface Notification {
  id: number
  type: string
  priority: string
  title: string
  message: string
  data?: any
  is_read: boolean
  read_at?: string
  created_at: string
  action_url?: string
}

export interface NotificationTemplate {
  id: string
  name: string
  type: 'email' | 'sms' | 'push'
  subject?: string
  content: string
  variables: string[]
  active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationDeliveryStatus {
  notification_id: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked'
  provider: string
  provider_message_id?: string
  error_message?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  created_at: string
}

export const notificationsService = {
  // Get all notifications
  async getAll(): Promise<Notification[]> {
    const response = await apiClient.get('/notifications')
    return response.data
  },

  // Get unread notifications
  async getUnread(): Promise<Notification[]> {
    const response = await apiClient.get('/notifications/unread')
    return response.data
  },

  // Mark notification as read
  async markAsRead(id: number): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`)
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await apiClient.put('/notifications/read-all')
  },

  // Delete a notification
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/notifications/${id}`)
  },

  // Get notification count
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/notifications/unread-count')
    return response.data.count
  },

  // Send email notification
  async sendEmail(request: any): Promise<any> {
    const response = await apiClient.post('/notifications/email', request)
    return response.data
  },

  // Send SMS notification
  async sendSMS(request: any): Promise<any> {
    const response = await apiClient.post('/notifications/sms', request)
    return response.data
  },

  // Send push notification
  async sendPush(request: any): Promise<any> {
    const response = await apiClient.post('/notifications/push', request)
    return response.data
  },

  // Schedule notification
  async scheduleNotification(request: any): Promise<any> {
    const response = await apiClient.post('/notifications/schedule', request)
    return response.data
  },

  // Get notification preferences
  async getPreferences(userId: string): Promise<any> {
    const response = await apiClient.get(`/notifications/preferences/${userId}`)
    return response.data
  },

  // Update notification preferences
  async updatePreferences(userId: string, preferences: any): Promise<any> {
    const response = await apiClient.put(`/notifications/preferences/${userId}`, preferences)
    return response.data
  },

  // Get notification history
  async getHistory(userId: string, limit: number = 50): Promise<any[]> {
    const response = await apiClient.get(`/notifications/history/${userId}?limit=${limit}`)
    return response.data
  },

  // Get delivery analytics
  async getAnalytics(timeframe: string = 'week'): Promise<any> {
    const response = await apiClient.get(`/notifications/analytics?timeframe=${timeframe}`)
    return response.data
  },

  // Get notification templates
  async getTemplates(): Promise<NotificationTemplate[]> {
    const response = await apiClient.get('/notifications/templates')
    return response.data
  },

  // Create notification template
  async createTemplate(template: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const response = await apiClient.post('/notifications/templates', template)
    return response.data
  },

  // Update notification template
  async updateTemplate(id: string, template: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const response = await apiClient.put(`/notifications/templates/${id}`, template)
    return response.data
  },

  // Delete notification template
  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/notifications/templates/${id}`)
  },

  // Get delivery status
  async getDeliveryStatus(notificationId: string): Promise<NotificationDeliveryStatus> {
    const response = await apiClient.get(`/notifications/delivery-status/${notificationId}`)
    return response.data
  },

  // Process webhook
  async processWebhook(provider: string, payload: any): Promise<void> {
    await apiClient.post(`/notifications/webhooks/${provider}`, payload)
  },

  // Test notification
  async testNotification(type: string, recipient: string, template: string): Promise<any> {
    const response = await apiClient.post('/notifications/test', {
      type,
      recipient,
      template
    })
    return response.data
  },

  // Unsubscribe user
  async unsubscribe(email: string, type: string = 'all'): Promise<void> {
    await apiClient.post('/notifications/unsubscribe', { email, type })
  },

  // Resubscribe user
  async resubscribe(email: string, type: string = 'all'): Promise<void> {
    await apiClient.post('/notifications/resubscribe', { email, type })
  },

  // Get unsubscribe status
  async getUnsubscribeStatus(email: string): Promise<any> {
    const response = await apiClient.get(`/notifications/unsubscribe-status/${email}`)
    return response.data
  }
}
