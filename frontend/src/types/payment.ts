/**
 * Payment Types and Interfaces
 *
 * This file defines all payment-related types used throughout the calendar
 * payment integration system.
 */

import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'

export type PaymentStatus =
  | 'not_required'
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'

export type PaymentMethod =
  | 'card'
  | 'apple_pay'
  | 'google_pay'
  | 'cash'
  | 'check'
  | 'bank_transfer'
  | 'saved_card'

export type PaymentSchedule =
  | 'full_payment'
  | 'deposit'
  | 'installment'
  | 'post_service'

export interface PaymentDetails {
  id: string
  appointmentId: string
  amount: number
  currency: string
  status: PaymentStatus
  method?: PaymentMethod
  paymentIntentId?: string
  chargeId?: string

  // Payment scheduling
  schedule: PaymentSchedule
  depositAmount?: number
  installments?: PaymentInstallment[]

  // Transaction details
  paidAmount: number
  refundedAmount: number
  tipAmount?: number

  // Metadata
  createdAt: string
  updatedAt: string
  paidAt?: string

  // Customer info
  customerEmail?: string
  customerName?: string
  last4?: string
  brand?: string

  // Invoice
  invoiceId?: string
  invoiceUrl?: string
  receiptUrl?: string
}

export interface PaymentInstallment {
  id: string
  amount: number
  dueDate: string
  status: PaymentStatus
  paidAt?: string
}

export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  currency: string
  status: string
  paymentMethodTypes: string[]
}

export interface SavedPaymentMethod {
  id: string
  type: PaymentMethod
  last4: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

export interface RefundRequest {
  paymentId: string
  amount: number
  reason?: string
}

export interface PaymentStatistics {
  totalRevenue: number
  pendingPayments: number
  completedPayments: number
  averageTransactionValue: number
  paymentMethodBreakdown: Record<PaymentMethod, number>
  dailyRevenue: Array<{
    date: string
    amount: number
    count: number
  }>
}

// Extended Calendar Appointment with Payment Info
export interface CalendarAppointmentWithPayment extends CalendarAppointment {
  payment?: PaymentDetails
  requiresPayment: boolean
  paymentDue?: string
  allowPartialPayment?: boolean
  minimumDeposit?: number
}

// Payment collection modal props
export interface PaymentCollectionModalProps {
  appointment: CalendarAppointmentWithPayment
  onSuccess: (payment: PaymentDetails) => void
  onCancel: () => void
  allowSavedMethods?: boolean
  requireImmediate?: boolean
}

// Payment reminder configuration
export interface PaymentReminder {
  id: string
  appointmentId: string
  scheduledFor: string
  sent: boolean
  sentAt?: string
  type: 'email' | 'sms' | 'push'
}

// Payment webhook events
export interface PaymentWebhookEvent {
  id: string
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded' | 'payment.updated'
  data: PaymentDetails
  timestamp: string
}
