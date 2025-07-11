'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { createPaymentIntent, confirmPayment } from '@/lib/api';

// Initialize Stripe (using test key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51234567890');

interface PaymentFormProps {
  bookingId: number;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function PaymentFormContent({ bookingId, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPaymentNeeded, setNoPaymentNeeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const paymentIntentResponse = await createPaymentIntent({ booking_id: bookingId });
      const { client_secret, payment_intent_id } = paymentIntentResponse;

      let stripePaymentIntentId = null;

      // Only process Stripe payment if there's an amount to charge
      if (client_secret) {
        // Confirm payment with Stripe
        const result = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        stripePaymentIntentId = result.paymentIntent.id;
      } else {
        // No payment needed (e.g., fully covered by gift certificate)
        setNoPaymentNeeded(true);
      }

      // Confirm payment on backend
      await confirmPayment({
        payment_intent_id: stripePaymentIntentId || '',
        booking_id: bookingId,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message);
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
        <p className="text-gray-600 mb-4">Amount to pay: ${amount.toFixed(2)}</p>
        
        {noPaymentNeeded ? (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded">
            Payment covered by gift certificate. No additional payment required.
          </div>
        ) : (
          <div className="border rounded-md p-3 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={(!noPaymentNeeded && !stripe) || processing}
        className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
          processing || (!noPaymentNeeded && !stripe)
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {processing 
          ? 'Processing...' 
          : noPaymentNeeded 
            ? 'Complete Booking' 
            : `Pay $${amount.toFixed(2)}`
        }
      </button>
    </form>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
}