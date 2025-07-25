/**
 * Push Notifications System
 * Native-like notification experience for BookedBarber PWA
 * Six Figure Barber methodology integration for revenue optimization
 */

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  data?: any;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number;
}

export type NotificationType = 
  | 'appointment_reminder'
  | 'appointment_confirmation'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'client_arrived'
  | 'payment_received'
  | 'review_request'
  | 'revenue_milestone'
  | 'schedule_conflict'
  | 'marketing_update'
  | 'system_alert';

class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private isInitialized = false;
  private userId: string | null = null;
  private barberId: string | null = null;

  /**
   * Initialize push notification system
   */
  async initialize(userId?: string, barberId?: string): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Check if notifications are supported
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('Push notifications not supported');
        return false;
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      this.userId = userId || null;
      this.barberId = barberId || null;
      this.isInitialized = true;

      console.log('🔔 Push notification system initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      await this.subscribeToPush();
    } else {
      console.log('❌ Notification permission denied');
    }

    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    try {
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (!this.subscription) {
        // Create new subscription
        const vapidPublicKey = await this.getVapidPublicKey();
        
        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });

        console.log('🔔 Push subscription created');
      }

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);
      
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) return true;

    try {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer();
      
      this.subscription = null;
      console.log('🔕 Push notifications disabled');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Show local notification
   */
  async showNotification(notification: NotificationData): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const options: NotificationOptions = {
      body: notification.body,
      icon: notification.icon || '/icon?size=192',
      badge: notification.badge || '/icon?size=96',
      image: notification.image,
      tag: notification.tag || 'general',
      requireInteraction: notification.requireInteraction || false,
      silent: notification.silent || false,
      timestamp: notification.timestamp || Date.now(),
      data: {
        ...notification.data,
        url: notification.url,
        notificationId: notification.id
      },
      actions: notification.actions
    };

    await this.registration.showNotification(notification.title, options);
    
    // Track notification display
    this.trackNotificationEvent('displayed', notification);
  }

  /**
   * Schedule appointment reminder notifications
   */
  async scheduleAppointmentReminder(appointment: any, reminderTime: number): Promise<void> {
    const now = Date.now();
    const appointmentTime = new Date(appointment.start_time).getTime();
    const reminderDelay = appointmentTime - reminderTime - now;

    if (reminderDelay <= 0) return; // Already past reminder time

    setTimeout(() => {
      this.showNotification({
        id: `reminder_${appointment.id}`,
        title: '⏰ Appointment Reminder',
        body: `${appointment.client_name} appointment in ${Math.round(reminderTime / (1000 * 60))} minutes`,
        tag: 'appointment_reminder',
        requireInteraction: true,
        url: `/calendar?appointment=${appointment.id}`,
        actions: [
          {
            action: 'view_appointment',
            title: 'View Details'
          },
          {
            action: 'mark_arrived',
            title: 'Client Arrived'
          }
        ],
        data: { appointment }
      });
    }, reminderDelay);
  }

  /**
   * Send appointment confirmation notification
   */
  async sendAppointmentConfirmation(appointment: any): Promise<void> {
    await this.showNotification({
      id: `confirmation_${appointment.id}`,
      title: '✅ Appointment Confirmed',
      body: `${appointment.client_name} - ${appointment.service_name} on ${new Date(appointment.start_time).toLocaleDateString()}`,
      tag: 'appointment_confirmation',
      url: `/calendar?appointment=${appointment.id}`,
      actions: [
        {
          action: 'view_calendar',
          title: 'View Calendar'
        },
        {
          action: 'contact_client',
          title: 'Contact Client'
        }
      ],
      data: { appointment }
    });
  }

  /**
   * Send revenue milestone notification (Six Figure Barber)
   */
  async sendRevenueMilestone(milestone: any): Promise<void> {
    const milestoneMessages = {
      daily: '🎯 Daily revenue goal achieved!',
      weekly: '🚀 Weekly revenue milestone reached!',
      monthly: '💰 Monthly revenue target hit!',
      yearly: '🏆 Six Figure Barber goal achieved!'
    };

    await this.showNotification({
      id: `milestone_${milestone.type}_${Date.now()}`,
      title: milestoneMessages[milestone.type as keyof typeof milestoneMessages] || '💰 Revenue Milestone',
      body: `Congratulations! You've earned $${milestone.amount.toLocaleString()} ${milestone.period}`,
      tag: 'revenue_milestone',
      requireInteraction: true,
      url: '/analytics?tab=revenue',
      actions: [
        {
          action: 'view_analytics',
          title: 'View Analytics'
        },
        {
          action: 'share_success',
          title: 'Share Success'
        }
      ],
      data: { milestone }
    });
  }

  /**
   * Send client review request notification
   */
  async sendReviewRequest(appointment: any): Promise<void> {
    // Wait 1 hour after appointment completion
    const reviewDelay = 60 * 60 * 1000; // 1 hour

    setTimeout(() => {
      this.showNotification({
        id: `review_request_${appointment.id}`,
        title: '⭐ Request Client Review',
        body: `Ask ${appointment.client_name} to leave a review for great service`,
        tag: 'review_request',
        url: `/clients/${appointment.client_id}?action=review`,
        actions: [
          {
            action: 'send_review_request',
            title: 'Send Review Link'
          },
          {
            action: 'skip_review',
            title: 'Skip'
          }
        ],
        data: { appointment }
      });
    }, reviewDelay);
  }

  /**
   * Send marketing campaign notification
   */
  async sendMarketingUpdate(campaign: any): Promise<void> {
    await this.showNotification({
      id: `marketing_${campaign.id}`,
      title: '📈 Marketing Update',
      body: campaign.message || 'New marketing insights available',
      tag: 'marketing_update',
      url: '/marketing',
      actions: [
        {
          action: 'view_marketing',
          title: 'View Details'
        }
      ],
      data: { campaign }
    });
  }

  /**
   * Handle notification preferences
   */
  async updateNotificationPreferences(preferences: any): Promise<void> {
    try {
      const response = await fetch('/api/v1/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          barberId: this.barberId,
          preferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      console.log('✅ Notification preferences updated');
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(limit = 50): Promise<any[]> {
    try {
      const response = await fetch(`/api/v1/notifications?limit=${limit}&userId=${this.userId}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Check if push notifications are active
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.registration) return false;
    
    const subscription = await this.registration.pushManager.getSubscription();
    return !!subscription;
  }

  /**
   * Private helper methods
   */
  private async getVapidPublicKey(): Promise<string> {
    try {
      const response = await fetch('/api/v1/vapid-public-key');
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('Failed to get VAPID key:', error);
      // Fallback key (should be replaced with actual key)
      return 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8rxr6CrTjWXbTI5cU0J7DVtBWNhA5IkBxEuKkr4nJfpQRn5E8Q';
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/v1/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          barberId: this.barberId,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
            },
            expirationTime: subscription.expirationTime
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('✅ Push subscription saved to server');
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      await fetch('/api/v1/push-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          barberId: this.barberId
        })
      });
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  private trackNotificationEvent(event: string, notification: NotificationData): void {
    // Track notification events for analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'notification_' + event, {
        notification_type: notification.tag,
        notification_id: notification.id,
        user_id: this.userId,
        barber_id: this.barberId
      });
    }
  }
}

/**
 * Notification Templates for common scenarios
 */
export const notificationTemplates = {
  appointmentReminder: (appointment: any, minutesUntil: number): NotificationData => ({
    id: `reminder_${appointment.id}`,
    title: '⏰ Appointment Reminder',
    body: `${appointment.client_name} appointment in ${minutesUntil} minutes`,
    tag: 'appointment_reminder',
    requireInteraction: true,
    url: `/calendar?appointment=${appointment.id}`,
    actions: [
      { action: 'view_appointment', title: 'View Details' },
      { action: 'mark_arrived', title: 'Client Arrived' }
    ],
    data: { appointment }
  }),

  clientArrived: (appointment: any): NotificationData => ({
    id: `arrived_${appointment.id}`,
    title: '👋 Client Arrived',
    body: `${appointment.client_name} has arrived for their appointment`,
    tag: 'client_arrived',
    url: `/calendar?appointment=${appointment.id}`,
    actions: [
      { action: 'start_service', title: 'Start Service' },
      { action: 'view_notes', title: 'View Notes' }
    ],
    data: { appointment }
  }),

  paymentReceived: (payment: any): NotificationData => ({
    id: `payment_${payment.id}`,
    title: '💰 Payment Received',
    body: `$${payment.amount} received from ${payment.client_name}`,
    tag: 'payment_received',
    url: `/payments?payment=${payment.id}`,
    data: { payment }
  }),

  dailyRevenue: (amount: number): NotificationData => ({
    id: `daily_revenue_${Date.now()}`,
    title: '🎯 Daily Goal Achieved!',
    body: `Congratulations! Today's revenue: $${amount.toLocaleString()}`,
    tag: 'revenue_milestone',
    requireInteraction: true,
    url: '/analytics?tab=revenue',
    actions: [
      { action: 'view_analytics', title: 'View Analytics' },
      { action: 'share_success', title: 'Share Success' }
    ],
    data: { amount, period: 'daily' }
  }),

  scheduleConflict: (conflict: any): NotificationData => ({
    id: `conflict_${conflict.id}`,
    title: '⚠️ Schedule Conflict',
    body: `Conflicting appointments detected. Review needed.`,
    tag: 'schedule_conflict',
    requireInteraction: true,
    url: `/calendar?conflict=${conflict.id}`,
    actions: [
      { action: 'resolve_conflict', title: 'Resolve Now' },
      { action: 'view_calendar', title: 'View Calendar' }
    ],
    data: { conflict }
  })
};

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;