/**
 * React hooks for payment functionality
 */
import { useState, useCallback, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { paymentsAPI } from '@/lib/api/payments';
import {
  PaymentDetails,
  PaymentIntent,
  SavedPaymentMethod,
  RefundRequest,
  PaymentStatistics,
  PaymentStatus
} from '@/types/payment';

// Initialize Stripe (this should be in an environment variable)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

/**
 * Hook for managing payment methods
 */
export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const methods = await paymentsAPI.getSavedMethods(customerId);
      setPaymentMethods(methods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPaymentMethod = useCallback(async (
    paymentMethodId: string,
    customerId: string,
    setAsDefault = false
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Add payment method logic would be handled through Stripe API
      // then refresh the saved methods
      if (setAsDefault) {
        await paymentsAPI.setDefaultMethod(paymentMethodId);
      }
      const methods = await paymentsAPI.getSavedMethods(customerId);
      setPaymentMethods(methods);
      return methods.find(m => m.id === paymentMethodId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setDefaultPaymentMethod = useCallback(async (paymentMethodId: string) => {
    setLoading(true);
    setError(null);
    try {
      await paymentsAPI.setDefaultMethod(paymentMethodId);
      setPaymentMethods(prev =>
        prev.map(pm => ({
          ...pm,
          isDefault: pm.id === paymentMethodId,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removePaymentMethod = useCallback(async (paymentMethodId: string) => {
    setLoading(true);
    setError(null);
    try {
      await paymentsAPI.deleteSavedMethod(paymentMethodId);
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Note: fetchPaymentMethods now requires customerId parameter
  // It should be called from the component with the appropriate customerId

  return {
    paymentMethods,
    loading,
    error,
    fetchPaymentMethods,
    addPaymentMethod,
    setDefaultPaymentMethod,
    removePaymentMethod,
  };
}

/**
 * Hook for processing payments
 */
export function usePaymentProcessing() {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    stripePromise.then(setStripe);
  }, []);

  const createPaymentIntent = useCallback(async (
    appointmentId: string,
    amount: number,
    saveMethod = false,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> => {
    setProcessing(true);
    setError(null);
    try {
      const intent = await paymentsAPI.createPaymentIntent({
        appointmentId,
        amount,
        saveMethod,
        metadata
      });
      return intent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment intent');
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const confirmPayment = useCallback(async (
    clientSecret: string,
    elements?: StripeElements,
    paymentMethodId?: string
  ): Promise<PaymentDetails | null> => {
    if (!stripe) {
      setError('Stripe not initialized');
      return null;
    }

    setProcessing(true);
    setError(null);
    try {
      let result;

      if (elements) {
        // Confirm with elements (new payment method)
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/payments/success`,
          },
          redirect: 'if_required',
        });
      } else if (paymentMethodId) {
        // Confirm with existing payment method
        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethodId,
        });
      } else {
        throw new Error('Either elements or paymentMethodId must be provided');
      }

      if (result.error) {
        setError(result.error.message || 'Payment failed');
        return null;
      }

      // Get the payment intent ID from the result
      const paymentIntentId = result.paymentIntent?.id;
      if (!paymentIntentId) {
        throw new Error('Payment intent ID not found');
      }

      // Confirm on backend
      const payment = await paymentsAPI.confirmPayment(paymentIntentId, paymentMethodId);
      return payment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment confirmation failed');
      return null;
    } finally {
      setProcessing(false);
    }
  }, [stripe]);

  const cancelPayment = useCallback(async (paymentId: string, reason?: string): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      await paymentsAPI.cancelPayment(paymentId, reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel payment');
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    stripe,
    processing,
    error,
    createPaymentIntent,
    confirmPayment,
    cancelPayment,
  };
}

/**
 * Hook for payment history
 */
export function usePaymentHistory() {
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    pages: number;
  }>({ total: 0, page: 1, pages: 1 });

  const fetchPaymentHistory = useCallback(async (params?: {
    status?: PaymentStatus;
    startDate?: string;
    endDate?: string;
    barberId?: number;
    clientId?: number;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await paymentsAPI.listPayments(params);
      setPayments(response.payments);
      setPagination({
        total: response.total,
        page: response.page,
        pages: response.pages
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  }, []);

  const getPaymentDetails = useCallback(async (paymentId: string): Promise<PaymentDetails | null> => {
    setLoading(true);
    setError(null);
    try {
      const payment = await paymentsAPI.getPayment(paymentId);
      return payment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  return {
    payments,
    pagination,
    loading,
    error,
    fetchPaymentHistory,
    getPaymentDetails,
  };
}

/**
 * Hook for refunds
 */
export function useRefunds() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRefund = useCallback(async (
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentDetails | null> => {
    setProcessing(true);
    setError(null);
    try {
      const refundRequest: RefundRequest = {
        paymentId,
        amount,
        reason
      };
      const refund = await paymentsAPI.refundPayment(refundRequest);
      return refund;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create refund');
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  // Note: getRefundDetails is removed as the paymentsAPI doesn't have a separate refund details endpoint
  // Refund details would be part of the payment details

  return {
    processing,
    error,
    createRefund,
  };
}

/**
 * Hook for payment statistics
 */
export function usePaymentStatistics() {
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async (filters?: {
    startDate?: string;
    endDate?: string;
    barberId?: number;
    groupBy?: 'day' | 'week' | 'month';
  }) => {
    setLoading(true);
    setError(null);
    try {
      const stats = await paymentsAPI.getStatistics(filters);
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    statistics,
    loading,
    error,
    fetchStatistics,
  };
}
