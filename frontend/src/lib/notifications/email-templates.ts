import { BookingDetails } from '@/components/booking/BookingConfirmation';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateData {
  clientName: string;
  clientEmail: string;
  barberName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  price: number;
  locationName: string;
  locationAddress: string;
  confirmationNumber: string;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
  reviewUrl?: string;
  additionalNotes?: string;
}

export const emailTemplates = {
  appointmentConfirmation: (data: TemplateData): EmailTemplate => ({
    subject: `Appointment Confirmation - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; }
            .confirmation-number { background: #1e40af; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .actions { margin: 30px 0; text-align: center; }
            .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
            .btn-secondary { background: #64748b; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Confirmed!</h1>
              <p>We're excited to see you soon</p>
            </div>

            <div class="content">
              <p>Hello ${data.clientName},</p>
              <p>Your appointment has been successfully confirmed. Here are your booking details:</p>

              <div class="confirmation-number">
                <h3>Confirmation Number</h3>
                <h2>${data.confirmationNumber}</h2>
              </div>

              <div class="booking-details">
                <h3>Booking Details</h3>
                <div class="detail-row">
                  <span><strong>Service:</strong></span>
                  <span>${data.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Barber:</strong></span>
                  <span>${data.barberName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Date:</strong></span>
                  <span>${data.appointmentDate}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Time:</strong></span>
                  <span>${data.appointmentTime}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Duration:</strong></span>
                  <span>${data.duration} minutes</span>
                </div>
                <div class="detail-row">
                  <span><strong>Price:</strong></span>
                  <span>$${data.price}</span>
                </div>
              </div>

              <div class="booking-details">
                <h3>Location</h3>
                <p><strong>${data.locationName}</strong></p>
                <p>${data.locationAddress}</p>
                ${data.businessPhone ? `<p>Phone: ${data.businessPhone}</p>` : ''}
              </div>

              ${data.additionalNotes ? `
                <div class="booking-details">
                  <h3>Additional Notes</h3>
                  <p>${data.additionalNotes}</p>
                </div>
              ` : ''}

              <div class="actions">
                <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.serviceName + ' with ' + data.barberName)}&dates=${new Date(data.appointmentDate + ' ' + data.appointmentTime).toISOString().replace(/-|:|\.\d\d\d/g, '')}" class="btn">Add to Calendar</a>
                ${data.rescheduleUrl ? `<a href="${data.rescheduleUrl}" class="btn btn-secondary">Reschedule</a>` : ''}
                ${data.cancelUrl ? `<a href="${data.cancelUrl}" class="btn btn-secondary">Cancel</a>` : ''}
              </div>

              <p>If you need to make any changes to your appointment, please contact us as soon as possible.</p>
              <p>We look forward to seeing you!</p>
            </div>

            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              ${data.businessEmail ? `<p>For questions, contact us at ${data.businessEmail}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
APPOINTMENT CONFIRMED

Hello ${data.clientName},

Your appointment has been successfully confirmed.

Confirmation Number: ${data.confirmationNumber}

Booking Details:
- Service: ${data.serviceName}
- Barber: ${data.barberName}
- Date: ${data.appointmentDate}
- Time: ${data.appointmentTime}
- Duration: ${data.duration} minutes
- Price: $${data.price}

Location:
${data.locationName}
${data.locationAddress}
${data.businessPhone ? `Phone: ${data.businessPhone}` : ''}

${data.additionalNotes ? `Notes: ${data.additionalNotes}` : ''}

We look forward to seeing you!

${data.businessEmail ? `For questions, contact us at ${data.businessEmail}` : ''}
    `
  }),

  appointmentReminder: (data: TemplateData & { hoursUntil: number }): EmailTemplate => ({
    subject: `Reminder: Your appointment in ${data.hoursUntil} hours`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .reminder-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .booking-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; }
            .actions { margin: 30px 0; text-align: center; }
            .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; }
            .btn-secondary { background: #64748b; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Reminder</h1>
              <p>Don't forget about your upcoming appointment!</p>
            </div>

            <div class="content">
              <div class="reminder-box">
                <h2>Your appointment is in ${data.hoursUntil} hours</h2>
                <p><strong>${data.appointmentDate} at ${data.appointmentTime}</strong></p>
              </div>

              <p>Hello ${data.clientName},</p>
              <p>This is a friendly reminder about your upcoming appointment.</p>

              <div class="booking-details">
                <h3>Appointment Details</h3>
                <div class="detail-row">
                  <span><strong>Service:</strong></span>
                  <span>${data.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Barber:</strong></span>
                  <span>${data.barberName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Location:</strong></span>
                  <span>${data.locationName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Address:</strong></span>
                  <span>${data.locationAddress}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Confirmation:</strong></span>
                  <span>${data.confirmationNumber}</span>
                </div>
              </div>

              <div class="actions">
                ${data.rescheduleUrl ? `<a href="${data.rescheduleUrl}" class="btn btn-secondary">Reschedule</a>` : ''}
                ${data.cancelUrl ? `<a href="${data.cancelUrl}" class="btn btn-secondary">Cancel</a>` : ''}
              </div>

              <p>Please arrive 10 minutes early to ensure we can start your appointment on time.</p>
              <p>We look forward to seeing you!</p>
            </div>

            <div class="footer">
              <p>This is an automated reminder. Please do not reply to this email.</p>
              ${data.businessEmail ? `<p>For questions, contact us at ${data.businessEmail}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
APPOINTMENT REMINDER

Hello ${data.clientName},

Your appointment is in ${data.hoursUntil} hours!

Appointment Details:
- Service: ${data.serviceName}
- Barber: ${data.barberName}
- Date: ${data.appointmentDate}
- Time: ${data.appointmentTime}
- Confirmation: ${data.confirmationNumber}

Location:
${data.locationName}
${data.locationAddress}

Please arrive 10 minutes early.

${data.businessEmail ? `For questions, contact us at ${data.businessEmail}` : ''}
    `
  }),

  appointmentCancellation: (data: TemplateData): EmailTemplate => ({
    subject: `Appointment Cancelled - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; }
            .actions { margin: 30px 0; text-align: center; }
            .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Cancelled</h1>
              <p>Your appointment has been cancelled</p>
            </div>

            <div class="content">
              <p>Hello ${data.clientName},</p>
              <p>We're writing to confirm that your appointment has been cancelled.</p>

              <div class="booking-details">
                <h3>Cancelled Appointment Details</h3>
                <div class="detail-row">
                  <span><strong>Service:</strong></span>
                  <span>${data.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Barber:</strong></span>
                  <span>${data.barberName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Date:</strong></span>
                  <span>${data.appointmentDate}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Time:</strong></span>
                  <span>${data.appointmentTime}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Confirmation:</strong></span>
                  <span>${data.confirmationNumber}</span>
                </div>
              </div>

              <p>If you paid for this appointment, any refund will be processed within 3-5 business days.</p>

              <div class="actions">
                <a href="/book" class="btn">Book New Appointment</a>
              </div>

              <p>We hope to see you again soon!</p>
            </div>

            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              ${data.businessEmail ? `<p>For questions, contact us at ${data.businessEmail}` : ''}
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
APPOINTMENT CANCELLED

Hello ${data.clientName},

Your appointment has been cancelled.

Cancelled Appointment Details:
- Service: ${data.serviceName}
- Barber: ${data.barberName}
- Date: ${data.appointmentDate}
- Time: ${data.appointmentTime}
- Confirmation: ${data.confirmationNumber}

If you paid for this appointment, any refund will be processed within 3-5 business days.

We hope to see you again soon!

${data.businessEmail ? `For questions, contact us at ${data.businessEmail}` : ''}
    `
  }),

  paymentReceipt: (data: TemplateData & { paymentId: string; paymentMethod: string }): EmailTemplate => ({
    subject: `Receipt for ${data.serviceName} - ${data.confirmationNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; }
            .total-row { font-weight: bold; font-size: 18px; background: #f0fdf4; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
              <p>Thank you for your payment</p>
            </div>

            <div class="content">
              <p>Hello ${data.clientName},</p>
              <p>We've received your payment for the following appointment:</p>

              <div class="receipt-details">
                <h3>Receipt Details</h3>
                <div class="detail-row">
                  <span><strong>Service:</strong></span>
                  <span>${data.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Barber:</strong></span>
                  <span>${data.barberName}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Date:</strong></span>
                  <span>${data.appointmentDate}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Time:</strong></span>
                  <span>${data.appointmentTime}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Payment Method:</strong></span>
                  <span>${data.paymentMethod}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Payment ID:</strong></span>
                  <span>${data.paymentId}</span>
                </div>
                <div class="detail-row total-row">
                  <span><strong>Total Paid:</strong></span>
                  <span>$${data.price}</span>
                </div>
              </div>

              <p>Your appointment is confirmed and we look forward to seeing you!</p>
            </div>

            <div class="footer">
              <p>This is an automated email. Please do not reply to this email.</p>
              <p>Keep this receipt for your records.</p>
              ${data.businessEmail ? `<p>For questions, contact us at ${data.businessEmail}` : ''}
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
PAYMENT RECEIPT

Hello ${data.clientName},

We've received your payment for the following appointment:

Receipt Details:
- Service: ${data.serviceName}
- Barber: ${data.barberName}
- Date: ${data.appointmentDate}
- Time: ${data.appointmentTime}
- Payment Method: ${data.paymentMethod}
- Payment ID: ${data.paymentId}
- Total Paid: $${data.price}

Your appointment is confirmed and we look forward to seeing you!

Keep this receipt for your records.

${data.businessEmail ? `For questions, contact us at ${data.businessEmail}` : ''}
    `
  })
};

export const createTemplateData = (booking: BookingDetails): TemplateData => ({
  clientName: booking.clientInfo.name,
  clientEmail: booking.clientInfo.email,
  barberName: booking.barber.name,
  serviceName: booking.service.name,
  appointmentDate: new Date(booking.appointmentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }),
  appointmentTime: booking.appointmentTime,
  duration: booking.service.duration,
  price: booking.service.price,
  locationName: booking.location.name,
  locationAddress: `${booking.location.address}, ${booking.location.city}, ${booking.location.state} ${booking.location.zip}`,
  confirmationNumber: booking.confirmationNumber,
  businessPhone: booking.location.phone,
  cancelUrl: `${window.location.origin}/cancel/${booking.confirmationNumber}`,
  rescheduleUrl: `${window.location.origin}/reschedule/${booking.confirmationNumber}`,
  reviewUrl: `${window.location.origin}/review/${booking.confirmationNumber}`,
  additionalNotes: booking.notes
});
