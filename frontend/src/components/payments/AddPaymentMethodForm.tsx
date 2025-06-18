/**
 * Add payment method form using Stripe Elements
 */
import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AddPaymentMethodFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  setAsDefault?: boolean;
}

export function AddPaymentMethodForm({
  onSuccess,
  onCancel,
  setAsDefault = false,
}: AddPaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      // Create payment method
      const { error: submitError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
      });

      if (submitError) {
        setError(submitError.message || 'An error occurred');
        setProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setError('Failed to create payment method');
        setProcessing(false);
        return;
      }

      // Save payment method to backend
      const response = await fetch('/api/v1/payments/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          payment_method_id: paymentMethod.id,
          set_as_default: setAsDefault,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to save payment method');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card', 'us_bank_account'],
        }}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!stripe || processing}>
          {processing ? (
            <>
              <LoadingSpinner className="mr-2" />
              Processing...
            </>
          ) : (
            'Add Payment Method'
          )}
        </Button>
      </div>
    </form>
  );
}