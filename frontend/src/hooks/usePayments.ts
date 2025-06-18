/**
 * React hooks for payment functionality
 */
import { useState, useCallback, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  paymentMethodsApi,
  paymentIntentsApi,
  paymentsApi,
  refundsApi,
  paymentReportsApi,
  PaymentMethod,
  PaymentIntent,
  Payment,
  PaymentStatus,
  Refund,
  PaymentReport,
} from '@/lib/api/payments';

// Initialize Stripe (this should be in an environment variable)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

/**
 * Hook for managing payment methods
 */
export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async (activeOnly = true) => {
    setLoading(true);
    setError(null);
    try {
      const methods = await paymentMethodsApi.list(activeOnly);
      setPaymentMethods(methods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPaymentMethod = useCallback(async (
    paymentMethodId: string,
    setAsDefault = false
  ) => {
    setLoading(true);
    setError(null);
    try {
      const method = await paymentMethodsApi.add(paymentMethodId, setAsDefault);
      setPaymentMethods(prev => [...prev, method]);
      return method;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setDefaultPaymentMethod = useCallback(async (paymentMethodId: number) => {
    setLoading(true);
    setError(null);
    try {
      await paymentMethodsApi.setDefault(paymentMethodId);
      setPaymentMethods(prev =>
        prev.map(pm => ({
          ...pm,
          is_default: pm.id === paymentMethodId,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removePaymentMethod = useCallback(async (paymentMethodId: number) => {
    setLoading(true);
    setError(null);
    try {
      await paymentMethodsApi.remove(paymentMethodId);
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

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
    appointmentId: number,
    amount: number,
    paymentMethodId?: number,
    savePaymentMethod = false,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> => {
    setProcessing(true);
    setError(null);
    try {
      const intent = await paymentIntentsApi.create(
        appointmentId,
        amount,
        paymentMethodId,
        savePaymentMethod,
        metadata
      );
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
  ): Promise<Payment | null> => {
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
      const payment = await paymentIntentsApi.confirm(paymentIntentId);
      return payment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment confirmation failed');
      return null;
    } finally {
      setProcessing(false);
    }
  }, [stripe]);

  const cancelPayment = useCallback(async (paymentId: number): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      await paymentIntentsApi.cancel(paymentId);
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentHistory = useCallback(async (params?: {
    status?: PaymentStatus;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const history = await paymentsApi.getHistory(params);
      setPayments(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  }, []);

  const getPaymentDetails = useCallback(async (paymentId: number): Promise<Payment | null> => {
    setLoading(true);
    setError(null);
    try {
      const payment = await paymentsApi.getById(paymentId);
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
    paymentId: number,
    amount?: number,
    reason?: string
  ): Promise<Refund | null> => {
    setProcessing(true);
    setError(null);
    try {
      const refund = await refundsApi.create(paymentId, amount, reason);
      return refund;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create refund');
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  const getRefundDetails = useCallback(async (refundId: number): Promise<Refund | null> => {
    setProcessing(true);
    setError(null);
    try {
      const refund = await refundsApi.getById(refundId);
      return refund;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch refund details');
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processing,
    error,
    createRefund,
    getRefundDetails,
  };
}

/**
 * Hook for payment reports
 */
export function usePaymentReports() {
  const [reports, setReports] = useState<PaymentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReport = useCallback(async (
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom',
    startDate: string,
    endDate: string
  ): Promise<PaymentReport | null> => {
    setLoading(true);
    setError(null);
    try {
      const report = await paymentReportsApi.create(reportType, startDate, endDate);
      setReports(prev => [report, ...prev]);
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async (params?: {
    report_type?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const reportsList = await paymentReportsApi.list(params);
      setReports(reportsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    loading,
    error,
    createReport,
    fetchReports,
  };
}