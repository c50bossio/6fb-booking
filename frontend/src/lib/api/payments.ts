/**
 * Payment API Integration
 *
 * This module handles all payment-related API calls for the calendar system.
 */

import apiClient from './client'
import {
  PaymentDetails,
  PaymentIntent,
  SavedPaymentMethod,
  RefundRequest,
  PaymentStatistics,
  PaymentStatus
} from '@/types/payment'

// Payment endpoints
const PAYMENT_ENDPOINTS = {
  CREATE_INTENT: '/api/v1/payments/create-intent',
  CONFIRM_PAYMENT: '/api/v1/payments/confirm',
  CANCEL_PAYMENT: '/api/v1/payments/cancel',
  REFUND: '/api/v1/payments/refund',
  GET_PAYMENT: '/api/v1/payments',
  LIST_PAYMENTS: '/api/v1/payments/list',
  SAVED_METHODS: '/api/v1/payments/saved-methods',
  STATISTICS: '/api/v1/payments/statistics',
  UPDATE_STATUS: '/api/v1/payments/status',
  SEND_INVOICE: '/api/v1/payments/invoice',
  PROCESS_WEBHOOK: '/api/v1/payments/webhook'
}

export const paymentsAPI = {
  /**
   * Create a payment intent for an appointment
   */
  async createPaymentIntent(data: {
    appointmentId: string
    amount: number
    currency?: string
    saveMethod?: boolean
    metadata?: Record<string, any>
  }): Promise<PaymentIntent> {
    const response = await apiClient.post<PaymentIntent>(PAYMENT_ENDPOINTS.CREATE_INTENT, {
      appointment_id: data.appointmentId,
      amount: data.amount,
      currency: data.currency || 'usd',
      save_method: data.saveMethod,
      metadata: data.metadata
    })
    return response
  },

  /**
   * Confirm a payment
   */
  async confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentDetails> {
    const response = await apiClient.post<PaymentDetails>(PAYMENT_ENDPOINTS.CONFIRM_PAYMENT, {
      payment_intent_id: paymentIntentId,
      payment_method_id: paymentMethodId
    })
    return response
  },

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string, reason?: string): Promise<PaymentDetails> {
    const response = await apiClient.post<PaymentDetails>(PAYMENT_ENDPOINTS.CANCEL_PAYMENT, {
      payment_id: paymentId,
      reason
    })
    return response
  },

  /**
   * Process a refund
   */
  async refundPayment(data: RefundRequest): Promise<PaymentDetails> {
    const response = await apiClient.post<PaymentDetails>(PAYMENT_ENDPOINTS.REFUND, {
      payment_id: data.paymentId,
      amount: data.amount,
      reason: data.reason
    })
    return response
  },

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<PaymentDetails> {
    const response = await apiClient.get<PaymentDetails>(`${PAYMENT_ENDPOINTS.GET_PAYMENT}/${paymentId}`)
    return response
  },

  /**
   * Get payment by appointment ID
   */
  async getPaymentByAppointment(appointmentId: string): Promise<PaymentDetails | null> {
    try {
      const response = await apiClient.get<PaymentDetails>(
        `${PAYMENT_ENDPOINTS.GET_PAYMENT}/appointment/${appointmentId}`
      )
      return response
    } catch (error) {
      return null
    }
  },

  /**
   * List payments with filters
   */
  async listPayments(filters?: {
    status?: PaymentStatus
    startDate?: string
    endDate?: string
    barberId?: number
    clientId?: number
    page?: number
    limit?: number
  }): Promise<{
    payments: PaymentDetails[]
    total: number
    page: number
    pages: number
  }> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get<{
      payments: PaymentDetails[]
      total: number
      page: number
      pages: number
    }>(`${PAYMENT_ENDPOINTS.LIST_PAYMENTS}?${params}`)

    return response
  },

  /**
   * Get saved payment methods for a customer
   */
  async getSavedMethods(customerId: string): Promise<SavedPaymentMethod[]> {
    const response = await apiClient.get<SavedPaymentMethod[]>(
      `${PAYMENT_ENDPOINTS.SAVED_METHODS}/${customerId}`
    )
    return response
  },

  /**
   * Delete a saved payment method
   */
  async deleteSavedMethod(methodId: string): Promise<void> {
    await apiClient.delete(`${PAYMENT_ENDPOINTS.SAVED_METHODS}/${methodId}`)
  },

  /**
   * Set default payment method
   */
  async setDefaultMethod(methodId: string): Promise<void> {
    await apiClient.put(`${PAYMENT_ENDPOINTS.SAVED_METHODS}/${methodId}/default`)
  },

  /**
   * Get payment statistics
   */
  async getStatistics(filters?: {
    startDate?: string
    endDate?: string
    barberId?: number
    groupBy?: 'day' | 'week' | 'month'
  }): Promise<PaymentStatistics> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get<PaymentStatistics>(
      `${PAYMENT_ENDPOINTS.STATISTICS}?${params}`
    )
    return response
  },

  /**
   * Update payment status (for cash/check payments)
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    metadata?: Record<string, any>
  ): Promise<PaymentDetails> {
    const response = await apiClient.put<PaymentDetails>(PAYMENT_ENDPOINTS.UPDATE_STATUS, {
      payment_id: paymentId,
      status,
      metadata
    })
    return response
  },

  /**
   * Send invoice via email
   */
  async sendInvoice(paymentId: string, email?: string): Promise<void> {
    await apiClient.post(PAYMENT_ENDPOINTS.SEND_INVOICE, {
      payment_id: paymentId,
      email
    })
  },

  /**
   * Process payment webhook (for internal use)
   */
  async processWebhook(event: any): Promise<void> {
    await apiClient.post(PAYMENT_ENDPOINTS.PROCESS_WEBHOOK, event)
  }
}

// Helper functions for payment calculations
export const paymentHelpers = {
  /**
   * Calculate deposit amount based on service price
   */
  calculateDeposit(servicePrice: number, depositPercentage: number = 30): number {
    return Math.ceil(servicePrice * (depositPercentage / 100))
  },

  /**
   * Calculate installment schedule
   */
  calculateInstallments(
    totalAmount: number,
    numberOfInstallments: number,
    startDate: Date = new Date()
  ): Array<{ amount: number; dueDate: string }> {
    const installmentAmount = Math.ceil(totalAmount / numberOfInstallments)
    const installments = []

    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      installments.push({
        amount: i === numberOfInstallments - 1
          ? totalAmount - (installmentAmount * (numberOfInstallments - 1))
          : installmentAmount,
        dueDate: dueDate.toISOString().split('T')[0]
      })
    }

    return installments
  },

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100)
  },

  /**
   * Check if payment is overdue
   */
  isPaymentOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date()
  }
}
