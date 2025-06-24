import { BookingDetails } from '@/components/booking/BookingConfirmation';
import { emailTemplates, createTemplateData, TemplateData } from './email-templates';
import { smsTemplates, createSMSTemplateData, formatPhoneForSMS, validatePhoneNumber } from './sms-templates';
import apiClient from '../api/client';

export interface NotificationRequest {
  type: 'email' | 'sms' | 'push';
  template: string;
  recipient: {
    email?: string;
    phone?: string;
    userId?: string;
  };
  data: any;
  priority: 'high' | 'medium' | 'low';
  scheduledFor?: string; // ISO datetime string
  retryAttempts?: number;
  metadata?: Record<string, any>;
}

export interface NotificationResponse {
  id: string;
  status: 'sent' | 'failed' | 'pending' | 'scheduled';
  provider?: string;
  providerMessageId?: string;
  error?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
}

export interface NotificationHistory {
  id: string;
  type: string;
  template: string;
  recipient: string;
  status: string;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  error?: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  email: {
    appointment_confirmation: boolean;
    appointment_reminder: boolean;
    appointment_cancellation: boolean;
    payment_receipt: boolean;
    marketing: boolean;
    performance_reports?: boolean;
    team_updates?: boolean;
  };
  sms: {
    appointment_confirmation: boolean;
    appointment_reminder: boolean;
    appointment_cancellation: boolean;
    payment_confirmation: boolean;
    marketing: boolean;
  };
  push: {
    enabled: boolean;
    appointment_updates: boolean;
    performance_alerts?: boolean;
    team_updates?: boolean;
  };
  reminders: {
    hours_before: number;
    second_reminder_hours: number;
  };
  quiet_hours: {
    enabled: boolean;
    start: number;
    end: number;
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private retryQueue: NotificationRequest[] = [];
  private webhookListeners: Map<string, Function[]> = new Map();

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Send appointment confirmation notifications
  async sendAppointmentConfirmation(
    booking: BookingDetails,
    preferences?: NotificationPreferences
  ): Promise<NotificationResponse[]> {
    const responses: NotificationResponse[] = [];
    const templateData = createTemplateData(booking);
    const smsData = createSMSTemplateData(booking);

    try {
      // Send email confirmation if enabled
      if (!preferences || preferences.email.appointment_confirmation) {
        const emailTemplate = emailTemplates.appointmentConfirmation(templateData);
        const emailResponse = await this.sendEmail({
          type: 'email',
          template: 'appointment_confirmation',
          recipient: { email: booking.clientInfo.email },
          data: {
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          },
          priority: 'high'
        });
        responses.push(emailResponse);
      }

      // Send SMS confirmation if phone provided and enabled
      if (booking.clientInfo.phone &&
          (!preferences || preferences.sms.appointment_confirmation) &&
          validatePhoneNumber(booking.clientInfo.phone)) {
        const smsTemplate = smsTemplates.appointmentConfirmation(smsData);
        const smsResponse = await this.sendSMS({
          type: 'sms',
          template: 'appointment_confirmation',
          recipient: { phone: formatPhoneForSMS(booking.clientInfo.phone) },
          data: { message: smsTemplate.message },
          priority: 'high'
        });
        responses.push(smsResponse);
      }

      // Schedule reminder notifications
      await this.scheduleReminders(booking, preferences);

      return responses;
    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
      throw error;
    }
  }

  // Send appointment reminder
  async sendAppointmentReminder(
    booking: BookingDetails,
    hoursUntil: number,
    preferences?: NotificationPreferences
  ): Promise<NotificationResponse[]> {
    const responses: NotificationResponse[] = [];

    // Check quiet hours
    if (preferences?.quiet_hours.enabled && this.isQuietHour(preferences.quiet_hours)) {
      console.log('Skipping reminder due to quiet hours');
      return responses;
    }

    const templateData = { ...createTemplateData(booking), hoursUntil };
    const smsData = createSMSTemplateData(booking);

    try {
      // Send email reminder if enabled
      if (!preferences || preferences.email.appointment_reminder) {
        const emailTemplate = emailTemplates.appointmentReminder(templateData);
        const emailResponse = await this.sendEmail({
          type: 'email',
          template: 'appointment_reminder',
          recipient: { email: booking.clientInfo.email },
          data: {
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          },
          priority: 'medium'
        });
        responses.push(emailResponse);
      }

      // Send SMS reminder if phone provided and enabled
      if (booking.clientInfo.phone &&
          (!preferences || preferences.sms.appointment_reminder) &&
          validatePhoneNumber(booking.clientInfo.phone)) {
        const smsTemplate = hoursUntil <= 2 ?
          smsTemplates.appointmentReminder2h(smsData) :
          smsTemplates.appointmentReminder24h(smsData);

        const smsResponse = await this.sendSMS({
          type: 'sms',
          template: 'appointment_reminder',
          recipient: { phone: formatPhoneForSMS(booking.clientInfo.phone) },
          data: { message: smsTemplate.message },
          priority: 'medium'
        });
        responses.push(smsResponse);
      }

      return responses;
    } catch (error) {
      console.error('Error sending appointment reminder:', error);
      throw error;
    }
  }

  // Send appointment cancellation notification
  async sendAppointmentCancellation(
    booking: BookingDetails,
    preferences?: NotificationPreferences
  ): Promise<NotificationResponse[]> {
    const responses: NotificationResponse[] = [];
    const templateData = createTemplateData(booking);
    const smsData = createSMSTemplateData(booking);

    try {
      // Send email cancellation if enabled
      if (!preferences || preferences.email.appointment_cancellation) {
        const emailTemplate = emailTemplates.appointmentCancellation(templateData);
        const emailResponse = await this.sendEmail({
          type: 'email',
          template: 'appointment_cancellation',
          recipient: { email: booking.clientInfo.email },
          data: {
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          },
          priority: 'high'
        });
        responses.push(emailResponse);
      }

      // Send SMS cancellation if phone provided and enabled
      if (booking.clientInfo.phone &&
          (!preferences || preferences.sms.appointment_cancellation) &&
          validatePhoneNumber(booking.clientInfo.phone)) {
        const smsTemplate = smsTemplates.appointmentCancellation(smsData);
        const smsResponse = await this.sendSMS({
          type: 'sms',
          template: 'appointment_cancellation',
          recipient: { phone: formatPhoneForSMS(booking.clientInfo.phone) },
          data: { message: smsTemplate.message },
          priority: 'high'
        });
        responses.push(smsResponse);
      }

      return responses;
    } catch (error) {
      console.error('Error sending appointment cancellation:', error);
      throw error;
    }
  }

  // Send payment receipt
  async sendPaymentReceipt(
    booking: BookingDetails,
    paymentDetails: { paymentId: string; paymentMethod: string },
    preferences?: NotificationPreferences
  ): Promise<NotificationResponse[]> {
    const responses: NotificationResponse[] = [];
    const templateData = { ...createTemplateData(booking), ...paymentDetails };
    const smsData = { ...createSMSTemplateData(booking), amount: booking.service.price };

    try {
      // Send email receipt if enabled
      if (!preferences || preferences.email.payment_receipt) {
        const emailTemplate = emailTemplates.paymentReceipt(templateData);
        const emailResponse = await this.sendEmail({
          type: 'email',
          template: 'payment_receipt',
          recipient: { email: booking.clientInfo.email },
          data: {
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          },
          priority: 'high'
        });
        responses.push(emailResponse);
      }

      // Send SMS payment confirmation if phone provided and enabled
      if (booking.clientInfo.phone &&
          (!preferences || preferences.sms.payment_confirmation) &&
          validatePhoneNumber(booking.clientInfo.phone)) {
        const smsTemplate = smsTemplates.paymentConfirmation(smsData);
        const smsResponse = await this.sendSMS({
          type: 'sms',
          template: 'payment_confirmation',
          recipient: { phone: formatPhoneForSMS(booking.clientInfo.phone) },
          data: { message: smsTemplate.message },
          priority: 'high'
        });
        responses.push(smsResponse);
      }

      return responses;
    } catch (error) {
      console.error('Error sending payment receipt:', error);
      throw error;
    }
  }

  // Schedule reminder notifications
  private async scheduleReminders(
    booking: BookingDetails,
    preferences?: NotificationPreferences
  ): Promise<void> {
    const appointmentDate = new Date(`${booking.appointmentDate} ${booking.appointmentTime}`);
    const hoursBeforeFirst = preferences?.reminders.hours_before || 24;
    const hoursBeforeSecond = preferences?.reminders.second_reminder_hours || 2;

    // Schedule first reminder
    const firstReminderTime = new Date(appointmentDate.getTime() - hoursBeforeFirst * 60 * 60 * 1000);
    if (firstReminderTime > new Date()) {
      await this.scheduleNotification({
        type: 'email',
        template: 'appointment_reminder',
        recipient: { email: booking.clientInfo.email },
        data: { booking, hoursUntil: hoursBeforeFirst },
        priority: 'medium',
        scheduledFor: firstReminderTime.toISOString(),
        metadata: { bookingId: booking.id, reminderType: 'first' }
      });
    }

    // Schedule second reminder
    const secondReminderTime = new Date(appointmentDate.getTime() - hoursBeforeSecond * 60 * 60 * 1000);
    if (secondReminderTime > new Date()) {
      await this.scheduleNotification({
        type: 'sms',
        template: 'appointment_reminder',
        recipient: { phone: booking.clientInfo.phone },
        data: { booking, hoursUntil: hoursBeforeSecond },
        priority: 'medium',
        scheduledFor: secondReminderTime.toISOString(),
        metadata: { bookingId: booking.id, reminderType: 'second' }
      });
    }
  }

  // Core notification sending methods
  private async sendEmail(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      const response = await apiClient.post('/api/v1/notifications/email', request);
      return response.data;
    } catch (error) {
      console.error('Failed to send email:', error);
      await this.handleFailedNotification(request, error);
      throw error;
    }
  }

  private async sendSMS(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      const response = await apiClient.post('/api/v1/notifications/sms', request);
      return response.data;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      await this.handleFailedNotification(request, error);
      throw error;
    }
  }

  private async sendPushNotification(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      const response = await apiClient.post('/api/v1/notifications/push', request);
      return response.data;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      await this.handleFailedNotification(request, error);
      throw error;
    }
  }

  // Schedule notification for later delivery
  private async scheduleNotification(request: NotificationRequest): Promise<void> {
    try {
      await apiClient.post('/api/v1/notifications/schedule', request);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  // Handle failed notifications with retry logic
  private async handleFailedNotification(request: NotificationRequest, error: any): Promise<void> {
    const maxRetries = request.retryAttempts || 3;
    const currentRetries = request.metadata?.retryCount || 0;

    if (currentRetries < maxRetries) {
      const retryRequest = {
        ...request,
        metadata: {
          ...request.metadata,
          retryCount: currentRetries + 1,
          lastError: error.message
        }
      };

      this.retryQueue.push(retryRequest);

      // Schedule retry with exponential backoff
      const delay = Math.pow(2, currentRetries) * 1000;
      setTimeout(() => this.processRetryQueue(), delay);
    }
  }

  // Process retry queue
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) return;

    const request = this.retryQueue.shift();
    if (!request) return;

    try {
      switch (request.type) {
        case 'email':
          await this.sendEmail(request);
          break;
        case 'sms':
          await this.sendSMS(request);
          break;
        case 'push':
          await this.sendPushNotification(request);
          break;
      }
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }

  // Utility methods
  private isQuietHour(quietHours: { start: number; end: number }): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    if (quietHours.start <= quietHours.end) {
      return currentHour >= quietHours.start && currentHour < quietHours.end;
    } else {
      // Spans midnight
      return currentHour >= quietHours.start || currentHour < quietHours.end;
    }
  }

  // Webhook handling for delivery status
  handleWebhook(provider: string, payload: any): void {
    const listeners = this.webhookListeners.get(provider) || [];
    listeners.forEach(listener => listener(payload));
  }

  // Subscribe to webhook events
  onWebhook(provider: string, callback: Function): void {
    const listeners = this.webhookListeners.get(provider) || [];
    listeners.push(callback);
    this.webhookListeners.set(provider, listeners);
  }

  // Get notification history
  async getNotificationHistory(userId: string, limit: number = 50): Promise<NotificationHistory[]> {
    try {
      const response = await apiClient.get(`/api/v1/notifications/history/${userId}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get notification history:', error);
      throw error;
    }
  }

  // Get notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const response = await apiClient.get(`/api/v1/notifications/preferences/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const response = await apiClient.put(`/api/v1/notifications/preferences/${userId}`, preferences);
      return response.data;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  // Test notification (for admin use)
  async testNotification(
    type: 'email' | 'sms' | 'push',
    recipient: string,
    template: string
  ): Promise<NotificationResponse> {
    const testData = {
      clientName: 'Test User',
      barberName: 'Test Barber',
      serviceName: 'Test Service',
      appointmentDate: 'Tomorrow',
      appointmentTime: '2:00 PM',
      locationName: 'Test Location',
      confirmationNumber: 'TEST123'
    };

    const request: NotificationRequest = {
      type,
      template,
      recipient: type === 'email' ? { email: recipient } : { phone: recipient },
      data: testData,
      priority: 'low',
      metadata: { test: true }
    };

    switch (type) {
      case 'email':
        return await this.sendEmail(request);
      case 'sms':
        return await this.sendSMS(request);
      case 'push':
        return await this.sendPushNotification(request);
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }
  }
}

export const notificationService = NotificationService.getInstance();
