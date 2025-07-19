// Push notification management utilities
import { API_URL } from './api'

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

// Convert base64 string to Uint8Array for Web Push
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Get current notification permission status
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(userId: string): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported')
  }

  // Check permission
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready

  // Get the VAPID public key from environment or API
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY'
  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

  try {
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    })

    // Send subscription to backend
    await savePushSubscription(userId, subscription)

    return subscription
  } catch (error) {
    throw error
  }
}

// Save push subscription to backend
async function savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  const subscriptionData: PushSubscriptionData = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
      auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
    }
  }

  const response = await fetch(`${API_URL}/api/v1/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      user_id: userId,
      subscription: subscriptionData
    })
  })

  if (!response.ok) {
    throw new Error('Failed to save push subscription')
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(userId: string): Promise<void> {
  if (!isPushNotificationSupported()) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe()

      // Remove subscription from backend
      await removePushSubscription(userId, subscription.endpoint)
    }
  } catch (error) {
    throw error
  }
}

// Remove push subscription from backend
async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/push/unsubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      user_id: userId,
      endpoint: endpoint
    })
  })

  if (!response.ok) {
    throw new Error('Failed to remove push subscription')
  }
}

// Check if user is subscribed to push notifications
export async function isSubscribedToPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}

// Get current push subscription
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription
  } catch {
    return null
  }
}

// Show a local notification (for testing)
export function showLocalNotification(options: NotificationOptions): void {
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return
  }

  // Use service worker to show notification for better reliability
  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification(options.title, {
      body: options.body,
      icon: options.icon || '/icon?size=192',
      badge: options.badge || '/icon?size=96',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction || false,
      actions: options.actions || []
    })
  })
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    appointments?: boolean
    bookings?: boolean
    payments?: boolean
    marketing?: boolean
    reminders?: boolean
  }
): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/push/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      user_id: userId,
      preferences
    })
  })

  if (!response.ok) {
    throw new Error('Failed to update notification preferences')
  }
}

// Get notification preferences
export async function getNotificationPreferences(userId: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/v1/push/preferences/${userId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get notification preferences')
  }

  return response.json()
}

// Common notification templates
export const notificationTemplates = {
  appointmentReminder: (appointmentTime: string, clientName: string): NotificationOptions => ({
    title: 'Appointment Reminder',
    body: `You have an appointment with ${clientName} at ${appointmentTime}`,
    icon: '/icon?size=192',
    badge: '/icon?size=96',
    tag: 'appointment-reminder',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }),

  newBooking: (clientName: string, service: string, time: string): NotificationOptions => ({
    title: 'New Booking',
    body: `${clientName} booked ${service} for ${time}`,
    icon: '/icon?size=192',
    badge: '/icon?size=96',
    tag: 'new-booking',
    actions: [
      { action: 'accept', title: 'Accept' },
      { action: 'view', title: 'View' }
    ]
  }),

  paymentReceived: (amount: string, clientName: string): NotificationOptions => ({
    title: 'Payment Received',
    body: `You received ${amount} from ${clientName}`,
    icon: '/icon?size=192',
    badge: '/icon?size=96',
    tag: 'payment-received'
  }),

  cancellation: (clientName: string, time: string): NotificationOptions => ({
    title: 'Appointment Cancelled',
    body: `${clientName} cancelled their appointment for ${time}`,
    icon: '/icon?size=192',
    badge: '/icon?size=96',
    tag: 'cancellation',
    requireInteraction: true
  })
}