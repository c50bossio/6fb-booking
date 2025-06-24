import { notificationService } from './notification-service';

export interface WebhookPayload {
  provider: string;
  event_type: string;
  notification_id: string;
  status: string;
  timestamp: string;
  recipient: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface SendGridWebhook {
  email: string;
  timestamp: number;
  'smtp-id': string;
  event: 'processed' | 'deferred' | 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spamreport' | 'unsubscribe' | 'group_unsubscribe' | 'group_resubscribe';
  category?: string[];
  sg_event_id: string;
  sg_message_id: string;
  useragent?: string;
  ip?: string;
  url?: string;
  reason?: string;
  status?: string;
  response?: string;
  attempt?: string;
  type?: string;
}

export interface TwilioWebhook {
  MessageSid: string;
  MessageStatus: 'accepted' | 'queued' | 'sending' | 'sent' | 'receiving' | 'received' | 'delivered' | 'undelivered' | 'failed' | 'read';
  To: string;
  From: string;
  Body?: string;
  NumSegments?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  NumMedia?: string;
  ReferralNumMedia?: string;
  SmsStatus?: string;
  SmsSid?: string;
  ApiVersion?: string;
}

export class WebhookHandler {
  private static instance: WebhookHandler;
  private eventListeners: Map<string, Function[]> = new Map();

  public static getInstance(): WebhookHandler {
    if (!WebhookHandler.instance) {
      WebhookHandler.instance = new WebhookHandler();
    }
    return WebhookHandler.instance;
  }

  // Process SendGrid webhook events
  processSendGridWebhook(events: SendGridWebhook[]): void {
    events.forEach(event => {
      const payload: WebhookPayload = {
        provider: 'sendgrid',
        event_type: event.event,
        notification_id: event['sg_message_id'],
        status: this.mapSendGridStatus(event.event),
        timestamp: new Date(event.timestamp * 1000).toISOString(),
        recipient: event.email,
        metadata: {
          sg_event_id: event.sg_event_id,
          smtp_id: event['smtp-id'],
          category: event.category,
          useragent: event.useragent,
          ip: event.ip,
          url: event.url,
          reason: event.reason,
          response: event.response,
          type: event.type
        }
      };

      if (event.reason) {
        payload.error_message = event.reason;
      }

      this.processWebhookEvent(payload);
    });
  }

  // Process Twilio webhook events
  processTwilioWebhook(event: TwilioWebhook): void {
    const payload: WebhookPayload = {
      provider: 'twilio',
      event_type: event.MessageStatus,
      notification_id: event.MessageSid,
      status: this.mapTwilioStatus(event.MessageStatus),
      timestamp: new Date().toISOString(),
      recipient: event.To,
      metadata: {
        from: event.From,
        body: event.Body,
        num_segments: event.NumSegments,
        account_sid: event.AccountSid,
        messaging_service_sid: event.MessagingServiceSid,
        num_media: event.NumMedia,
        api_version: event.ApiVersion
      }
    };

    if (event.ErrorCode && event.ErrorMessage) {
      payload.error_message = `${event.ErrorCode}: ${event.ErrorMessage}`;
    }

    this.processWebhookEvent(payload);
  }

  // Process generic webhook event
  private processWebhookEvent(payload: WebhookPayload): void {
    try {
      // Update notification status in local storage or state management
      this.updateNotificationStatus(payload);

      // Trigger event listeners
      this.triggerEventListeners(payload);

      // Send to notification service for processing
      notificationService.handleWebhook(payload.provider, payload);

      console.log(`Processed ${payload.provider} webhook event:`, payload);
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }

  // Update notification status in local state
  private updateNotificationStatus(payload: WebhookPayload): void {
    try {
      const notificationHistory = this.getNotificationHistory();
      const updatedHistory = notificationHistory.map(notification => {
        if (notification.providerMessageId === payload.notification_id) {
          return {
            ...notification,
            status: payload.status,
            deliveredAt: payload.status === 'delivered' ? payload.timestamp : notification.deliveredAt,
            openedAt: payload.event_type === 'open' ? payload.timestamp : notification.openedAt,
            clickedAt: payload.event_type === 'click' ? payload.timestamp : notification.clickedAt,
            error: payload.error_message || notification.error,
            updatedAt: payload.timestamp
          };
        }
        return notification;
      });

      this.saveNotificationHistory(updatedHistory);
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  }

  // Map SendGrid event types to standard status
  private mapSendGridStatus(event: string): string {
    switch (event) {
      case 'processed':
      case 'deferred':
        return 'pending';
      case 'delivered':
        return 'delivered';
      case 'open':
        return 'opened';
      case 'click':
        return 'clicked';
      case 'bounce':
      case 'dropped':
      case 'spamreport':
        return 'failed';
      case 'unsubscribe':
      case 'group_unsubscribe':
        return 'unsubscribed';
      default:
        return 'unknown';
    }
  }

  // Map Twilio status to standard status
  private mapTwilioStatus(status: string): string {
    switch (status) {
      case 'accepted':
      case 'queued':
      case 'sending':
        return 'pending';
      case 'sent':
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'opened';
      case 'receiving':
      case 'received':
        return 'received';
      case 'undelivered':
      case 'failed':
        return 'failed';
      default:
        return 'unknown';
    }
  }

  // Event listener management
  addEventListener(eventType: string, callback: Function): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);
  }

  removeEventListener(eventType: string, callback: Function): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  private triggerEventListeners(payload: WebhookPayload): void {
    const listeners = this.eventListeners.get(payload.event_type) || [];
    listeners.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Error in webhook event listener:', error);
      }
    });

    // Also trigger 'all' event listeners
    const allListeners = this.eventListeners.get('all') || [];
    allListeners.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Error in webhook event listener:', error);
      }
    });
  }

  // Local storage helpers
  private getNotificationHistory(): any[] {
    try {
      const history = localStorage.getItem('notification_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error reading notification history from localStorage:', error);
      return [];
    }
  }

  private saveNotificationHistory(history: any[]): void {
    try {
      localStorage.setItem('notification_history', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving notification history to localStorage:', error);
    }
  }

  // Analytics helpers
  getDeliveryStats(timeframe: 'day' | 'week' | 'month' = 'week'): {
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  } {
    const history = this.getNotificationHistory();
    const now = new Date();
    const cutoff = new Date();

    switch (timeframe) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
    }

    const recentNotifications = history.filter(notification =>
      new Date(notification.createdAt) >= cutoff
    );

    const sent = recentNotifications.length;
    const delivered = recentNotifications.filter(n => n.status === 'delivered').length;
    const failed = recentNotifications.filter(n => n.status === 'failed').length;
    const opened = recentNotifications.filter(n => n.openedAt).length;
    const clicked = recentNotifications.filter(n => n.clickedAt).length;

    return {
      sent,
      delivered,
      failed,
      opened,
      clicked,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0
    };
  }

  // Real-time notification updates
  subscribeToRealtimeUpdates(): void {
    // This would typically connect to a WebSocket or Server-Sent Events stream
    // For now, we'll simulate with polling
    setInterval(() => {
      this.pollForUpdates();
    }, 30000); // Poll every 30 seconds
  }

  private async pollForUpdates(): void {
    try {
      // This would fetch recent notification updates from the API
      // For now, we'll just trigger a refresh event
      this.triggerEventListeners({
        provider: 'system',
        event_type: 'refresh',
        notification_id: '',
        status: 'refresh',
        timestamp: new Date().toISOString(),
        recipient: ''
      });
    } catch (error) {
      console.error('Error polling for notification updates:', error);
    }
  }

  // Unsubscribe handling
  handleUnsubscribe(email: string, type: string = 'all'): void {
    try {
      // Update user preferences to disable notifications
      const unsubscribeData = {
        email,
        type,
        timestamp: new Date().toISOString()
      };

      // Store unsubscribe request
      const unsubscribes = this.getUnsubscribes();
      unsubscribes.push(unsubscribeData);
      localStorage.setItem('unsubscribes', JSON.stringify(unsubscribes));

      // Trigger unsubscribe event
      this.triggerEventListeners({
        provider: 'system',
        event_type: 'unsubscribe',
        notification_id: '',
        status: 'unsubscribed',
        timestamp: new Date().toISOString(),
        recipient: email,
        metadata: { type }
      });

      console.log(`Processed unsubscribe for ${email} (type: ${type})`);
    } catch (error) {
      console.error('Error handling unsubscribe:', error);
    }
  }

  private getUnsubscribes(): any[] {
    try {
      const unsubscribes = localStorage.getItem('unsubscribes');
      return unsubscribes ? JSON.parse(unsubscribes) : [];
    } catch (error) {
      console.error('Error reading unsubscribes from localStorage:', error);
      return [];
    }
  }

  // Check if email is unsubscribed
  isUnsubscribed(email: string, type: string = 'all'): boolean {
    const unsubscribes = this.getUnsubscribes();
    return unsubscribes.some(unsubscribe =>
      unsubscribe.email === email &&
      (unsubscribe.type === 'all' || unsubscribe.type === type)
    );
  }
}

export const webhookHandler = WebhookHandler.getInstance();
