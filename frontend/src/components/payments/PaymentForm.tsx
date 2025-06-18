/**
 * Payment form component for processing payments
 */
import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PaymentMethodsList } from './PaymentMethodsList';
import { formatAmount } from '@/lib/api/payments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PaymentFormProps {
  amount: number;
  clientSecret: string;
  onSuccess?: (paymentId: number) => void;
  onError?: (error: string) => void;
  showSavedMethods?: boolean;
  allowSaveMethod?: boolean;
}

export function PaymentForm({
  amount,
  clientSecret,
  onSuccess,
  onError,
  showSavedMethods = true,
  allowSaveMethod = true,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [paymentTab, setPaymentTab] = useState<'saved' | 'new'>('saved');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe) {
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      let result;

      if (paymentTab === 'saved' && selectedMethodId) {
        // Use saved payment method
        const paymentMethod = await fetch(`/api/v1/payments/payment-methods`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        })
          .then(res => res.json())
          .then(methods => methods.find((m: any) => m.id === selectedMethodId));

        if (!paymentMethod) {
          throw new Error('Payment method not found');
        }

        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethod.stripe_payment_method_id,
        });
      } else {
        // Use new payment method
        if (!elements) {
          throw new Error('Payment elements not loaded');
        }

        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/payments/success`,
          },
          redirect: 'if_required',
        });
      }

      if (result.error) {
        setError(result.error.message || 'Payment failed');
        onError?.(result.error.message || 'Payment failed');
      } else if (result.paymentIntent) {
        // Payment succeeded
        onSuccess?.(parseInt(result.paymentIntent.metadata?.payment_id || '0'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Amount to pay</p>
        <p className="text-2xl font-bold">{formatAmount(amount)}</p>
      </div>

      {showSavedMethods ? (
        <Tabs value={paymentTab} onValueChange={(v) => setPaymentTab(v as 'saved' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saved">Saved Methods</TabsTrigger>
            <TabsTrigger value="new">New Method</TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-6">
            <PaymentMethodsList
              selectable
              selectedId={selectedMethodId || undefined}
              onSelect={setSelectedMethodId}
            />
          </TabsContent>

          <TabsContent value="new" className="mt-6">
            <PaymentElement
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card'],
                fields: {
                  billingDetails: {
                    address: 'auto',
                  },
                },
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto',
                },
              }}
            />
            {allowSaveMethod && (
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    defaultChecked
                  />
                  <span className="text-sm text-gray-600">
                    Save this payment method for future use
                  </span>
                </label>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          <PaymentElement
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card'],
              fields: {
                billingDetails: {
                  address: 'auto',
                },
              },
              wallets: {
                applePay: 'auto',
                googlePay: 'auto',
              },
            }}
          />
          {allowSaveMethod && (
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  defaultChecked
                />
                <span className="text-sm text-gray-600">
                  Save this payment method for future use
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing || (paymentTab === 'saved' && !selectedMethodId)}
        className="w-full"
      >
        {processing ? (
          <>
            <LoadingSpinner className="mr-2" />
            Processing Payment...
          </>
        ) : (
          `Pay ${formatAmount(amount)}`
        )}
      </Button>
    </form>
  );
}