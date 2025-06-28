/**
 * Checkout flow component for appointment payments
 */
import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentForm } from './PaymentForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { usePaymentProcessing } from '@/hooks/usePayments';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFlowProps {
  appointmentId: number;
  amount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CheckoutFlow({
  appointmentId,
  amount,
  onSuccess,
  onCancel,
}: CheckoutFlowProps) {
  const { createPaymentIntent, processing, error } = usePaymentProcessing();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [paymentId, setPaymentId] = useState<number | null>(null);

  useEffect(() => {
    // Create payment intent when component mounts
    const initPayment = async () => {
      try {
        const intent = await createPaymentIntent(appointmentId, amount);
        setClientSecret(intent.client_secret);
      } catch (err) {
        setPaymentStatus('error');
      }
    };

    initPayment();
  }, [appointmentId, amount, createPaymentIntent]);

  const handlePaymentSuccess = (id: number) => {
    setPaymentId(id);
    setPaymentStatus('success');
    setTimeout(() => {
      onSuccess?.();
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error');
  };

  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully.
        </p>
        <Button onClick={onSuccess}>Continue</Button>
      </div>
    );
  }

  if (paymentStatus === 'error' && !clientSecret) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Payment Error</h3>
        <p className="text-gray-600 mb-6">
          {error || 'An error occurred while processing your payment.'}
        </p>
        <div className="space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!clientSecret || processing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner className="mb-4" />
        <p className="text-gray-600">Preparing payment...</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0066cc',
            fontFamily: 'system-ui, sans-serif',
          },
        },
      }}
    >
      <PaymentForm
        amount={amount}
        clientSecret={clientSecret}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        showSavedMethods={true}
        allowSaveMethod={true}
      />
    </Elements>
  );
}
