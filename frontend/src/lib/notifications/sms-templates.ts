import { BookingDetails } from '@/components/booking/BookingConfirmation';

export interface SMSTemplate {
  message: string;
  maxLength: number;
}

export interface SMSTemplateData {
  clientName: string;
  barberName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  locationName: string;
  confirmationNumber: string;
  businessName?: string;
  businessPhone?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
}

export const smsTemplates = {
  appointmentConfirmation: (data: SMSTemplateData): SMSTemplate => ({
    message: `Hi ${data.clientName}! Your ${data.serviceName} appointment with ${data.barberName} is confirmed for ${data.appointmentDate} at ${data.appointmentTime}. Location: ${data.locationName}. Confirmation: ${data.confirmationNumber}. ${data.businessPhone ? `Questions? Call ${data.businessPhone}` : ''}`,
    maxLength: 160
  }),

  appointmentReminder24h: (data: SMSTemplateData): SMSTemplate => ({
    message: `Reminder: Your ${data.serviceName} appointment with ${data.barberName} is tomorrow at ${data.appointmentTime} at ${data.locationName}. Confirmation: ${data.confirmationNumber}. ${data.cancelUrl ? `Cancel: ${data.cancelUrl}` : ''}`,
    maxLength: 160
  }),

  appointmentReminder2h: (data: SMSTemplateData): SMSTemplate => ({
    message: `Your appointment with ${data.barberName} is in 2 hours (${data.appointmentTime}) at ${data.locationName}. Please arrive 10 minutes early. Confirmation: ${data.confirmationNumber}`,
    maxLength: 160
  }),

  appointmentCancellation: (data: SMSTemplateData): SMSTemplate => ({
    message: `Your ${data.serviceName} appointment with ${data.barberName} on ${data.appointmentDate} has been cancelled. Confirmation: ${data.confirmationNumber}. ${data.businessPhone ? `Questions? Call ${data.businessPhone}` : ''}`,
    maxLength: 160
  }),

  paymentConfirmation: (data: SMSTemplateData & { amount: number }): SMSTemplate => ({
    message: `Payment received! $${data.amount} for ${data.serviceName} with ${data.barberName} on ${data.appointmentDate}. Confirmation: ${data.confirmationNumber}. Thank you!`,
    maxLength: 160
  }),

  appointmentRescheduled: (data: SMSTemplateData & { newDate: string; newTime: string }): SMSTemplate => ({
    message: `Your appointment has been rescheduled to ${data.newDate} at ${data.newTime} with ${data.barberName} at ${data.locationName}. New confirmation: ${data.confirmationNumber}`,
    maxLength: 160
  }),

  noShow: (data: SMSTemplateData): SMSTemplate => ({
    message: `We missed you today for your ${data.appointmentTime} appointment with ${data.barberName}. ${data.businessPhone ? `Please call ${data.businessPhone} to reschedule.` : 'Please reschedule when convenient.'}`,
    maxLength: 160
  }),

  followUp: (data: SMSTemplateData): SMSTemplate => ({
    message: `Thanks for visiting ${data.locationName}! How was your ${data.serviceName} with ${data.barberName}? We'd love your feedback. Book again anytime!`,
    maxLength: 160
  })
};

export const createSMSTemplateData = (booking: BookingDetails): SMSTemplateData => ({
  clientName: booking.clientInfo.name.split(' ')[0], // Use first name only for SMS
  barberName: booking.barber.name,
  serviceName: booking.service.name,
  appointmentDate: new Date(booking.appointmentDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }),
  appointmentTime: booking.appointmentTime,
  locationName: booking.location.name,
  confirmationNumber: booking.confirmationNumber,
  businessPhone: booking.location.phone,
  cancelUrl: `${window.location.origin}/cancel/${booking.confirmationNumber}`,
  rescheduleUrl: `${window.location.origin}/reschedule/${booking.confirmationNumber}`
});

// Utility function to truncate SMS messages if they exceed length limits
export const truncateSMSMessage = (message: string, maxLength: number = 160): string => {
  if (message.length <= maxLength) {
    return message;
  }

  // Try to truncate at word boundaries
  const truncated = message.substring(0, maxLength - 3);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  return truncated + '...';
};

// Utility function to validate phone numbers for SMS
export const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');

  // Check if it's a valid US phone number (10 or 11 digits)
  return cleanPhone.length === 10 || (cleanPhone.length === 11 && cleanPhone.startsWith('1'));
};

// Utility function to format phone number for SMS
export const formatPhoneForSMS = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length === 10) {
    return `+1${cleanPhone}`;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    return `+${cleanPhone}`;
  }

  throw new Error('Invalid phone number format');
};
