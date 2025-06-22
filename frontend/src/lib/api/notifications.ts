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

export const notificationsService = {
  // Get all notifications
  async getAll(): Promise<Notification[]> {
    const response = await apiClient.get('/api/v1/notifications')
    return response.data
  },

  // Get unread notifications
  async getUnread(): Promise<Notification[]> {
    const response = await apiClient.get('/api/v1/notifications/unread')
    return response.data
  },

  // Mark notification as read
  async markAsRead(id: number): Promise<void> {
    await apiClient.put(`/api/v1/notifications/${id}/read`)
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await apiClient.put('/api/v1/notifications/read-all')
  },

  // Delete a notification
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/notifications/${id}`)
  },

  // Get notification count
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/api/v1/notifications/unread-count')
    return response.data.count
  }
}
