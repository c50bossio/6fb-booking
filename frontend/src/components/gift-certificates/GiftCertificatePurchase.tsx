'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AnimatedCard } from '@/components/ui/animated-card';
import { SuccessAnimation } from '@/components/ui/success-animation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface GiftCertificatePurchaseFormProps {
  onSuccess?: (certificate: any) => void;
  onCancel?: () => void;
}

const GiftCertificatePurchaseForm: React.FC<GiftCertificatePurchaseFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [purchasedCertificate, setPurchasedCertificate] = useState<any>(null);

  // Form fields
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('50');
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState(user?.full_name || '');
  const [senderEmail, setSenderEmail] = useState(user?.email || '');

  // Preset amounts
  const presetAmounts = [25, 50, 75, 100, 150, 200];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment method
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      // Purchase gift certificate
      const response = await api.post('/gift-certificates/purchase', {
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        amount: parseFloat(amount),
        payment_method_id: paymentMethod.id,
        message: message || undefined,
        sender_name: senderName || undefined,
        sender_email: senderEmail || undefined,
      });

      setPurchasedCertificate(response.data);
      setSuccess(true);

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to purchase gift certificate');
    } finally {
      setLoading(false);
    }
  };

  if (success && purchasedCertificate) {
    return (
      <AnimatedCard className="max-w-2xl mx-auto p-8 text-center">
        <SuccessAnimation />
        <h2 className="text-2xl font-bold mt-4 mb-2">Purchase Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your gift certificate has been sent to {purchasedCertificate.recipient_email}
        </p>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-600 mb-2">Gift Certificate Code</p>
          <p className="text-2xl font-mono font-bold text-primary">
            {purchasedCertificate.code}
          </p>
          <p className="text-lg font-semibold mt-4">
            ${purchasedCertificate.original_amount.toFixed(2)}
          </p>
        </div>

        <Button
          onClick={() => {
            setSuccess(false);
            setPurchasedCertificate(null);
            // Reset form
            setRecipientName('');
            setRecipientEmail('');
            setAmount('50');
            setMessage('');
          }}
          variant="outline"
        >
          Purchase Another
        </Button>
      </AnimatedCard>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Purchase Gift Certificate</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recipient Information</h3>

          <div>
            <label className="block text-sm font-medium mb-2">
              Recipient Name *
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Recipient Email *
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Amount Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Amount</h3>

          <div className="grid grid-cols-3 gap-3">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className={`py-3 px-4 rounded-lg border transition-colors ${
                  amount === preset.toString()
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 hover:border-primary'
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Custom Amount ($5 minimum, $1000 maximum)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="5"
                max="1000"
                step="1"
                className="w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
        </div>

        {/* Personal Message */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Personal Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Add a personal message to your gift..."
          />
          <p className="text-sm text-gray-500 mt-1">
            {message.length}/1000 characters
          </p>
        </div>

        {/* Sender Information (if not logged in) */}
        {!user && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Information</h3>

            <div>
              <label className="block text-sm font-medium mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Your Email
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Payment Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Payment Information</h3>

          <div className="border rounded-lg p-4">
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
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-2xl font-bold text-primary">
              ${parseFloat(amount || '0').toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={!stripe || loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Processing...
              </>
            ) : (
              'Purchase Gift Certificate'
            )}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export const GiftCertificatePurchase: React.FC<GiftCertificatePurchaseFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <GiftCertificatePurchaseForm {...props} />
    </Elements>
  );
};
