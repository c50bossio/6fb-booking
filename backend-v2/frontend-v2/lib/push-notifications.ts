/**
 * PWA Push Notifications System 
 * Advanced notification management for appointment reminders and booking alerts
 * Enhanced from existing system with comprehensive scheduling and templates
 * Version: 2.0.0 - Advanced PWA Features
 */

import { getOfflineSystem } from './mobile-pwa-offline'
import { getAnalyticsSystem } from './mobile-pwa-analytics'

export interface NotificationConfig {
  enabled: boolean
  appointmentReminders: boolean
  bookingConfirmations: boolean
  cancellationAlerts: boolean
  dailySchedule: boolean
  businessHours: {
    start: number // 0-23
    end: number   // 0-23
  }
  reminderTimes: number[] // minutes before appointment
  quietHours: {
    enabled: boolean
    start: number // 0-23
    end: number   // 0-23
  }
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  appointmentReminders: true,
  bookingConfirmations: true,
  cancellationAlerts: true,
  dailySchedule: true,
  businessHours: {
    start: 8,  // 8 AM
    end: 20    // 8 PM
  },
  reminderTimes: [1440, 60, 15], // 24 hours, 1 hour, 15 minutes
  quietHours: {
    enabled: true,
    start: 22, // 10 PM
    end: 8     // 8 AM
  }
}

export interface NotificationTemplate {
  type: 'appointment_reminder' | 'booking_confirmed' | 'appointment_cancelled' | 'daily_schedule' | 'client_arrival'
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  actions?: NotificationAction[]
  data?: any
}

interface ScheduledNotification {
  id: string
  type: string
  appointmentId?: string
  scheduledTime: number
  template: NotificationTemplate
  status: 'scheduled' | 'sent' | 'cancelled'
  created: number
}

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  appointment_reminder: {
    type: 'appointment_reminder',
    title: 'Upcoming Appointment',
    body: '{{clientName}} has an appointment in {{timeUntil}}',
    icon: '/icons/calendar-notification.png',
    badge: '/icons/badge.png',
    tag: 'appointment_reminder',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      { action: 'reschedule', title: 'Reschedule', icon: '/icons/reschedule.png' }
    ]
  },
  booking_confirmed: {
    type: 'booking_confirmed',
    title: 'New Booking Confirmed',
    body: '{{clientName}} booked {{serviceName}} for {{appointmentTime}}',
    icon: '/icons/booking-confirmed.png',
    badge: '/icons/badge.png',
    tag: 'booking_confirmed',
    actions: [
      { action: 'view', title: 'View Booking', icon: '/icons/view.png' },
      { action: 'contact', title: 'Contact Client', icon: '/icons/phone.png' }
    ]
  },
  appointment_cancelled: {
    type: 'appointment_cancelled', 
    title: 'Appointment Cancelled',
    body: '{{clientName}} cancelled their {{serviceName}} appointment',
    icon: '/icons/cancelled.png',
    badge: '/icons/badge.png',
    tag: 'appointment_cancelled',
    actions: [
      { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      { action: 'reschedule', title: 'Offer Reschedule', icon: '/icons/reschedule.png' }
    ]
  },
  daily_schedule: {
    type: 'daily_schedule',
    title: 'Today\'s Schedule',
    body: 'You have {{appointmentCount}} appointments today starting at {{firstAppointmentTime}}',
    icon: '/icons/daily-schedule.png',
    badge: '/icons/badge.png',
    tag: 'daily_schedule',
    actions: [
      { action: 'view', title: 'View Schedule', icon: '/icons/calendar.png' },
      { action: 'prepare', title: 'Prepare Day', icon: '/icons/checklist.png' }
    ]
  },
  client_arrival: {
    type: 'client_arrival',
    title: 'Client Arrived',
    body: '{{clientName}} has arrived for their {{serviceName}} appointment',
    icon: '/icons/client-arrival.png',
    badge: '/icons/badge.png',
    tag: 'client_arrival',
    requireInteraction: true,
    actions: [
      { action: 'start', title: 'Start Service', icon: '/icons/start.png' },
      { action: 'delay', title: 'Running Late', icon: '/icons/clock.png' }
    ]
  }
}

export class PWAPushNotificationSystem {
  private config: NotificationConfig
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map()
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null
  private isBrowser = typeof window !== 'undefined'

  constructor(config?: Partial<NotificationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // Only initialize in browser environment
    if (this.isBrowser) {
      this.initializeSystem()
    }
  }

  private async initializeSystem() {
    if (!this.isBrowser || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ Service Worker registered for push notifications')

      // Setup message listener
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this))

      // Initialize existing subscription
      await this.initializeSubscription()

      // Load scheduled notifications
      this.loadScheduledNotifications()

      // Setup scheduling
      this.setupNotificationScheduler()

      console.log('✅ PWA Push Notification System initialized')
    } catch (error) {
      console.error('Failed to initialize push notification system:', error)
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }

    const permission = await Notification.requestPermission()
    
    const analytics = getAnalyticsSystem()
    analytics.trackEvent('notification_permission_requested', {
      permission,
      timestamp: Date.now()
    })

    return permission === 'granted'
  }

  /**
   * Schedule appointment reminder notifications
   */
  scheduleAppointmentReminders(appointment: any): void {
    if (!this.config.appointmentReminders) return

    const appointmentTime = new Date(appointment.start_time || appointment.startTime).getTime()
    const now = Date.now()

    this.config.reminderTimes.forEach(minutesBefore => {
      const reminderTime = appointmentTime - (minutesBefore * 60 * 1000)
      
      if (reminderTime > now) {
        const notificationId = `reminder_${appointment.id}_${minutesBefore}`
        
        const scheduledNotification: ScheduledNotification = {
          id: notificationId,
          type: 'appointment_reminder',
          appointmentId: appointment.id,
          scheduledTime: reminderTime,
          template: this.buildNotificationFromTemplate('appointment_reminder', {
            clientName: appointment.client_name || appointment.clientName,
            timeUntil: this.formatTimeUntil(minutesBefore),
            appointmentTime: new Date(appointmentTime).toLocaleTimeString()
          }),
          status: 'scheduled',
          created: now
        }

        this.scheduledNotifications.set(notificationId, scheduledNotification)
        this.saveScheduledNotifications()
      }
    })
  }

  /**
   * Show booking confirmation notification
   */
  async showBookingConfirmation(appointment: any): Promise<void> {
    if (!this.config.bookingConfirmations) return

    const template = this.buildNotificationFromTemplate('booking_confirmed', {
      clientName: appointment.client_name || appointment.clientName,
      serviceName: appointment.service_name || appointment.serviceName,
      appointmentTime: new Date(appointment.start_time || appointment.startTime).toLocaleString()
    })

    await this.showNotification(template)
  }

  /**
   * Show cancellation alert notification
   */
  async showCancellationAlert(appointment: any): Promise<void> {
    if (!this.config.cancellationAlerts) return

    const template = this.buildNotificationFromTemplate('appointment_cancelled', {
      clientName: appointment.client_name || appointment.clientName,
      serviceName: appointment.service_name || appointment.serviceName
    })

    await this.showNotification(template)

    // Cancel scheduled reminders for this appointment
    this.cancelAppointmentReminders(appointment.id)
  }

  /**
   * Show client arrival notification
   */
  async showClientArrivalNotification(appointment: any): Promise<void> {
    const template = this.buildNotificationFromTemplate('client_arrival', {
      clientName: appointment.client_name || appointment.clientName,
      serviceName: appointment.service_name || appointment.serviceName
    })

    await this.showNotification(template)
  }

  /**
   * Cancel appointment reminders
   */
  private cancelAppointmentReminders(appointmentId: string): void {
    const toCancel = Array.from(this.scheduledNotifications.entries())
      .filter(([_, notification]) => notification.appointmentId === appointmentId)

    toCancel.forEach(([id, _]) => {
      this.scheduledNotifications.delete(id)
    })

    this.saveScheduledNotifications()
  }

  /**
   * Show notification with template
   */
  private async showNotification(template: NotificationTemplate): Promise<void> {
    if (!this.isWithinBusinessHours() || this.isQuietHours()) {
      console.log('Notification suppressed due to business/quiet hours')
      return
    }

    if (!this.registration) {
      console.warn('Service Worker not available for notifications')
      return
    }

    try {
      await this.registration.showNotification(template.title, {
        body: template.body,
        icon: template.icon,
        badge: template.badge,
        tag: template.tag,
        requireInteraction: template.requireInteraction,
        actions: template.actions,
        data: template.data,
        timestamp: Date.now(),
        silent: false,
        vibrate: [200, 100, 200]
      })

      const analytics = getAnalyticsSystem()
      analytics.trackEvent('notification_shown', {
        type: template.type,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  /**
   * Build notification from template with data interpolation
   */
  private buildNotificationFromTemplate(templateKey: string, data: Record<string, any>): NotificationTemplate {
    const template = { ...NOTIFICATION_TEMPLATES[templateKey] }
    
    // Interpolate template variables
    template.title = this.interpolateTemplate(template.title, data)
    template.body = this.interpolateTemplate(template.body, data)
    template.data = { ...template.data, ...data }

    return template
  }

  /**
   * Interpolate template string with data
   */
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match
    })
  }

  /**
   * Check if current time is within business hours
   */
  private isWithinBusinessHours(): boolean {
    const now = new Date()
    const hour = now.getHours()
    return hour >= this.config.businessHours.start && hour < this.config.businessHours.end
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.config.quietHours.enabled) return false

    const now = new Date()
    const hour = now.getHours()
    
    if (this.config.quietHours.start > this.config.quietHours.end) {
      // Quiet hours span midnight
      return hour >= this.config.quietHours.start || hour < this.config.quietHours.end
    } else {
      return hour >= this.config.quietHours.start && hour < this.config.quietHours.end
    }
  }

  /**
   * Format time until appointment
   */
  private formatTimeUntil(minutes: number): string {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440)
      return `${days} day${days > 1 ? 's' : ''}`
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`
    }
  }

  /**
   * Setup notification scheduler
   */
  private setupNotificationScheduler(): void {
    setInterval(() => {
      this.processScheduledNotifications()
    }, 60000) // Check every minute
  }

  /**
   * Process scheduled notifications
   */
  private async processScheduledNotifications(): Promise<void> {
    const now = Date.now()
    const toSend = Array.from(this.scheduledNotifications.entries())
      .filter(([_, notification]) => 
        notification.status === 'scheduled' && 
        notification.scheduledTime <= now
      )

    for (const [id, notification] of toSend) {
      try {
        if (notification.type === 'daily_schedule') {
          await this.showDailyScheduleNotification()
        } else {
          await this.showNotification(notification.template)
        }

        notification.status = 'sent'
        this.scheduledNotifications.set(id, notification)
      } catch (error) {
        console.error(`Failed to send scheduled notification ${id}:`, error)
      }
    }

    // Clean up old notifications
    this.cleanupOldNotifications()
    this.saveScheduledNotifications()
  }

  /**
   * Show daily schedule notification with real data
   */
  private async showDailyScheduleNotification(): Promise<void> {
    try {
      const offlineSystem = getOfflineSystem()
      const appointments = offlineSystem.getOfflineData('appointments') || []
      
      const today = new Date().toDateString()
      const todayAppointments = appointments.filter((apt: any) => 
        new Date(apt.start_time || apt.startTime).toDateString() === today
      )

      if (todayAppointments.length === 0) return

      const firstAppointment = todayAppointments
        .sort((a: any, b: any) => 
          new Date(a.start_time || a.startTime).getTime() - 
          new Date(b.start_time || b.startTime).getTime()
        )[0]

      const template = this.buildNotificationFromTemplate('daily_schedule', {
        appointmentCount: todayAppointments.length,
        firstAppointmentTime: new Date(firstAppointment.start_time || firstAppointment.startTime)
          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })

      await this.showNotification(template)
    } catch (error) {
      console.error('Failed to show daily schedule notification:', error)
    }
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
      const { action, notificationData } = event.data
      this.handleNotificationClick(action, notificationData)
    }
  }

  /**
   * Handle notification click actions
   */
  private handleNotificationClick(action: string, data: any): void {
    const analytics = getAnalyticsSystem()
    analytics.trackEvent('notification_clicked', {
      action,
      notificationType: data?.type,
      timestamp: Date.now()
    })

    switch (action) {
      case 'view':
        if (data?.appointmentId) {
          window.location.href = `/appointments/${data.appointmentId}`
        } else {
          window.location.href = '/calendar'
        }
        break

      case 'reschedule':
        if (data?.appointmentId) {
          window.location.href = `/appointments/${data.appointmentId}/reschedule`
        }
        break

      case 'contact':
        if (data?.clientPhone) {
          window.location.href = `tel:${data.clientPhone}`
        }
        break

      case 'start':
        if (data?.appointmentId) {
          window.location.href = `/appointments/${data.appointmentId}/start`
        }
        break

      default:
        window.location.href = '/calendar'
    }
  }

  /**
   * Clean up old notifications
   */
  private cleanupOldNotifications(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    const toDelete = Array.from(this.scheduledNotifications.entries())
      .filter(([_, notification]) => 
        notification.status === 'sent' && 
        notification.created < oneWeekAgo
      )

    toDelete.forEach(([id, _]) => {
      this.scheduledNotifications.delete(id)
    })
  }

  /**
   * Initialize existing push subscription
   */
  private async initializeSubscription(): Promise<void> {
    if (!this.registration) return

    try {
      this.subscription = await this.registration.pushManager.getSubscription()
      if (this.subscription) {
        console.log('✅ Existing push subscription found')
      }
    } catch (error) {
      console.error('Failed to get existing subscription:', error)
    }
  }

  /**
   * Load scheduled notifications from storage
   */
  private loadScheduledNotifications(): void {
    try {
      const stored = localStorage.getItem('pwa_scheduled_notifications')
      if (stored) {
        const notifications = JSON.parse(stored)
        this.scheduledNotifications = new Map(Object.entries(notifications))
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error)
    }
  }

  /**
   * Save scheduled notifications to storage
   */
  private saveScheduledNotifications(): void {
    try {
      const notifications = Object.fromEntries(this.scheduledNotifications)
      localStorage.setItem('pwa_scheduled_notifications', JSON.stringify(notifications))
    } catch (error) {
      console.error('Failed to save scheduled notifications:', error)
    }
  }

  /**
   * Get notification status and statistics
   */
  getStatus(): {
    permission: NotificationPermission
    subscribed: boolean
    scheduledCount: number
    config: NotificationConfig
  } {
    return {
      permission: Notification.permission,
      subscribed: !!this.subscription,
      scheduledCount: this.scheduledNotifications.size,
      config: this.config
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Save to localStorage
    localStorage.setItem('pwa_notification_config', JSON.stringify(this.config))
  }
}

// Global notification system instance
let globalNotificationSystem: PWAPushNotificationSystem | null = null

/**
 * Get or create notification system instance
 */
export function getPushNotificationSystem(config?: Partial<NotificationConfig>): PWAPushNotificationSystem {
  if (!globalNotificationSystem) {
    globalNotificationSystem = new PWAPushNotificationSystem(config)
  }
  return globalNotificationSystem
}

/**
 * React hook for push notifications
 */
export function usePushNotifications() {
  const notificationSystem = getPushNotificationSystem()

  return {
    requestPermission: notificationSystem.requestPermission.bind(notificationSystem),
    scheduleReminders: notificationSystem.scheduleAppointmentReminders.bind(notificationSystem),
    showBookingConfirmation: notificationSystem.showBookingConfirmation.bind(notificationSystem),
    showCancellationAlert: notificationSystem.showCancellationAlert.bind(notificationSystem),
    showClientArrival: notificationSystem.showClientArrivalNotification.bind(notificationSystem),
    getStatus: notificationSystem.getStatus.bind(notificationSystem),
    updateConfig: notificationSystem.updateConfig.bind(notificationSystem)
  }
}

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

// Utility functions for PWA compatibility
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined') return 'default';
  return Notification.permission;
}

export async function subscribeToPushNotifications(): Promise<PushSubscriptionData | null> {
  if (!isPushNotificationSupported()) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });
    
    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
      }
    };
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? await subscription.unsubscribe() : true;
  } catch (error) {
    console.error('Push unsubscription failed:', error);
    return false;
  }
}

export async function isSubscribedToPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    return false;
  }
}

export function showLocalNotification(data: NotificationData): void {
  if (!isPushNotificationSupported() || getNotificationPermission() !== 'granted') return;
  
  new Notification(data.title, {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    image: data.image,
    badge: data.badge || '/icons/badge-72x72.png',
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    silent: data.silent,
    data: data.data
  });
}

class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private isInitialized = false;
  private userId: string | null = null;
  private barberId: string | null = null;
  private isBrowser = typeof window !== 'undefined';

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
      await this.subscribeToPush();
    } else {
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
   * Send daily performance summary notification
   */
  async sendDailyPerformanceSummary(performance: any): Promise<void> {
    await this.showNotification({
      id: `daily_summary_${Date.now()}`,
      title: '📊 Daily Performance Summary',
      body: `${performance.appointments} appointments | $${performance.revenue} revenue | ${performance.clientsServed} clients`,
      tag: 'daily_summary',
      requireInteraction: true,
      url: '/analytics?period=today',
      actions: [
        {
          action: 'view_analytics',
          title: 'View Details'
        },
        {
          action: 'plan_tomorrow',
          title: 'Plan Tomorrow'
        }
      ],
      data: { performance }
    });
  }

  /**
   * Send appointment conflict notification
   */
  async sendAppointmentConflict(conflict: any): Promise<void> {
    await this.showNotification({
      id: `conflict_${conflict.id}`,
      title: '⚠️ Schedule Conflict Detected',
      body: `Double booking detected for ${conflict.time}. Immediate action required.`,
      tag: 'schedule_conflict',
      requireInteraction: true,
      url: `/calendar?conflict=${conflict.id}`,
      actions: [
        {
          action: 'resolve_conflict',
          title: 'Resolve Now'
        },
        {
          action: 'contact_clients',
          title: 'Contact Clients'
        }
      ],
      data: { conflict }
    });
  }

  /**
   * Send break reminder notification
   */
  async sendBreakReminder(nextAppointment: any): Promise<void> {
    await this.showNotification({
      id: `break_reminder_${Date.now()}`,
      title: '☕ Break Time Reminder',
      body: `Take a 10-minute break before your next client (${nextAppointment.client_name}) at ${nextAppointment.time}`,
      tag: 'break_reminder',
      url: '/my-schedule',
      actions: [
        {
          action: 'extend_break',
          title: 'Extend Break'
        },
        {
          action: 'prep_next_client',
          title: 'Prep Next Client'
        }
      ],
      data: { nextAppointment }
    });
  }

  /**
   * Send client check-in notification
   */
  async sendClientCheckIn(client: any): Promise<void> {
    await this.showNotification({
      id: `checkin_${client.appointment_id}`,
      title: '👋 Client Check-In',
      body: `${client.name} has checked in for their appointment`,
      tag: 'client_checkin',
      url: `/calendar?appointment=${client.appointment_id}`,
      actions: [
        {
          action: 'start_service',
          title: 'Start Service'
        },
        {
          action: 'running_late',
          title: 'Running Late'
        }
      ],
      data: { client }
    });
  }

  /**
   * Send weekly goal progress notification
   */
  async sendWeeklyGoalProgress(progress: any): Promise<void> {
    const progressPercentage = Math.round((progress.current / progress.target) * 100);
    
    await this.showNotification({
      id: `weekly_progress_${Date.now()}`,
      title: `🎯 Weekly Goal: ${progressPercentage}% Complete`,
      body: `$${progress.current.toLocaleString()} of $${progress.target.toLocaleString()} weekly goal`,
      tag: 'weekly_progress',
      url: '/analytics?period=week',
      actions: [
        {
          action: 'view_analytics',
          title: 'View Progress'
        },
        {
          action: 'adjust_strategy',
          title: 'Adjust Strategy'
        }
      ],
      data: { progress }
    });
  }

  /**
   * Send inventory low notification
   */
  async sendInventoryAlert(inventory: any): Promise<void> {
    await this.showNotification({
      id: `inventory_${inventory.id}`,
      title: '📦 Low Inventory Alert',
      body: `${inventory.product_name} is running low (${inventory.remaining} left)`,
      tag: 'inventory_alert',
      url: '/products?low-stock=true',
      actions: [
        {
          action: 'reorder_now',
          title: 'Reorder Now'
        },
        {
          action: 'remind_later',
          title: 'Remind Later'
        }
      ],
      data: { inventory }
    });
  }

  /**
   * Send client birthday notification
   */
  async sendClientBirthdayReminder(client: any): Promise<void> {
    await this.showNotification({
      id: `birthday_${client.id}`,
      title: '🎂 Client Birthday Today',
      body: `It's ${client.name}'s birthday! Send them a special message.`,
      tag: 'client_birthday',
      url: `/clients/${client.id}`,
      actions: [
        {
          action: 'send_birthday_message',
          title: 'Send Message'
        },
        {
          action: 'offer_birthday_discount',
          title: 'Offer Discount'
        }
      ],
      data: { client }
    });
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
  }),

  dailyGoalReached: (amount: number, goal: number): NotificationData => ({
    id: `daily_goal_${Date.now()}`,
    title: '🎯 Daily Goal Achieved!',
    body: `Congratulations! You've reached your daily goal of $${goal.toLocaleString()}`,
    tag: 'daily_goal',
    requireInteraction: true,
    url: '/analytics?celebration=daily',
    actions: [
      { action: 'view_progress', title: 'View Progress' },
      { action: 'set_stretch_goal', title: 'Set Stretch Goal' }
    ],
    data: { amount, goal, period: 'daily' }
  }),

  clientCheckIn: (client: any): NotificationData => ({
    id: `checkin_${client.appointment_id}`,
    title: '👋 Client Checked In',
    body: `${client.name} has checked in and is ready`,
    tag: 'client_checkin',
    url: `/calendar?appointment=${client.appointment_id}`,
    actions: [
      { action: 'start_service', title: 'Start Service' },
      { action: 'view_notes', title: 'View Client Notes' }
    ],
    data: { client }
  }),

  breakReminder: (nextClient: string, minutes: number): NotificationData => ({
    id: `break_${Date.now()}`,
    title: '☕ Break Time',
    body: `Take a ${minutes}-minute break before ${nextClient}`,
    tag: 'break_reminder',
    url: '/my-schedule',
    actions: [
      { action: 'extend_break', title: 'Extend Break' },
      { action: 'prep_station', title: 'Prep Station' }
    ],
    data: { nextClient, minutes }
  }),

  weeklyProgress: (current: number, target: number, percentage: number): NotificationData => ({
    id: `weekly_progress_${Date.now()}`,
    title: `🚀 Weekly Progress: ${percentage}%`,
    body: `$${current.toLocaleString()} of $${target.toLocaleString()} weekly target`,
    tag: 'weekly_progress',
    url: '/analytics?period=week',
    actions: [
      { action: 'view_breakdown', title: 'View Breakdown' },
      { action: 'plan_strategy', title: 'Plan Strategy' }
    ],
    data: { current, target, percentage }
  }),

  inventoryLow: (product: string, remaining: number): NotificationData => ({
    id: `inventory_${Date.now()}`,
    title: '📦 Low Inventory',
    body: `${product} is running low (${remaining} remaining)`,
    tag: 'inventory_alert',
    url: '/products?filter=low-stock',
    actions: [
      { action: 'reorder', title: 'Reorder Now' },
      { action: 'find_alternative', title: 'Find Alternative' }
    ],
    data: { product, remaining }
  }),

  clientBirthday: (clientName: string, clientId: string): NotificationData => ({
    id: `birthday_${clientId}`,
    title: '🎂 Client Birthday',
    body: `It's ${clientName}'s birthday today!`,
    tag: 'client_birthday',
    url: `/clients/${clientId}`,
    actions: [
      { action: 'send_wishes', title: 'Send Birthday Wishes' },
      { action: 'offer_special', title: 'Offer Birthday Special' }
    ],
    data: { clientName, clientId }
  }),

  endOfDaySummary: (appointments: number, revenue: number, tips: number): NotificationData => ({
    id: `daily_summary_${Date.now()}`,
    title: '📊 Day Complete!',
    body: `${appointments} appointments | $${revenue} revenue | $${tips} tips`,
    tag: 'daily_summary',
    url: '/analytics?period=today',
    actions: [
      { action: 'view_details', title: 'View Details' },
      { action: 'plan_tomorrow', title: 'Plan Tomorrow' }
    ],
    data: { appointments, revenue, tips }
  }),

  appointmentCancellation: (clientName: string, time: string, reason?: string): NotificationData => ({
    id: `cancellation_${Date.now()}`,
    title: '❌ Appointment Cancelled',
    body: `${clientName} cancelled their ${time} appointment${reason ? ` - ${reason}` : ''}`,
    tag: 'appointment_cancelled',
    url: '/calendar?view=availability',
    actions: [
      { action: 'fill_slot', title: 'Fill Time Slot' },
      { action: 'contact_client', title: 'Contact Client' }
    ],
    data: { clientName, time, reason }
  })
};

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;