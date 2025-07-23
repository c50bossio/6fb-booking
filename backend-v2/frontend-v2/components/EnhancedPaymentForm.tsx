'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Types for the enhanced payment system
interface PaymentGateway {
  id: string;
  name: string;
  displayName: string;
  fees: {
    percentage: number;
    fixed: number;
  };
  isRecommended?: boolean;
  isAvailable: boolean;
}

interface PaymentIntentResponse {
  payment_id: number;
  amount: number;
  gift_certificate_used: number;
  gateway_type: string | null;
  client_secret?: string;
  payment_intent_id?: string;
}

interface EnhancedPaymentFormProps {
  bookingId: number;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  giftCertificateCode?: string;
  preferredGateway?: string;
  showGatewaySelection?: boolean;
}

// Initialize Stripe (will only be used if Stripe is selected)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Enhanced API functions that work with multiple gateways
async function createPaymentIntentEnhanced(data: {
  booking_id: number;
  gift_certificate_code?: string;
  preferred_gateway?: string;
  selection_strategy?: string;
}): Promise<PaymentIntentResponse> {
  const response = await fetch('/api/v2/payments/create-intent-enhanced', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create payment intent');
  }

  return response.json();
}

async function confirmPaymentEnhanced(data: {
  payment_intent_id: string;
  booking_id: number;
  gateway_type?: string;
}): Promise<any> {
  const response = await fetch('/api/v2/payments/confirm-enhanced', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to confirm payment');
  }

  return response.json();
}

async function getAvailableGateways(): Promise<PaymentGateway[]> {
  try {
    const response = await fetch('/api/v2/payments/gateways', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch gateways, using defaults');
      return getDefaultGateways();
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching gateways:', error);
    return getDefaultGateways();
  }
}

function getDefaultGateways(): PaymentGateway[] {
  return [
    {
      id: 'stripe',
      name: 'stripe',
      displayName: 'Stripe',
      fees: { percentage: 2.9, fixed: 0.30 },
      isAvailable: true,
    },
    {
      id: 'tilled',
      name: 'tilled',
      displayName: 'Tilled',
      fees: { percentage: 2.5, fixed: 0.15 },
      isRecommended: true,
      isAvailable: false, // Will be true if Tilled is configured
    },
  ];
}

function GatewaySelector({ 
  gateways, 
  selectedGateway, 
  onSelect, 
  amount 
}: {
  gateways: PaymentGateway[];
  selectedGateway: string;
  onSelect: (gatewayId: string) => void;
  amount: number;
}) {
  const calculateFee = (gateway: PaymentGateway) => {
    return (amount * gateway.fees.percentage / 100) + gateway.fees.fixed;
  };

  const calculateTotal = (gateway: PaymentGateway) => {
    return amount + calculateFee(gateway);
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Select Payment Method</h3>
      <div className="space-y-3">
        {gateways.filter(g => g.isAvailable).map((gateway) => (
          <div
            key={gateway.id}
            className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
              selectedGateway === gateway.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelect(gateway.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="radio"
                  checked={selectedGateway === gateway.id}
                  onChange={() => onSelect(gateway.id)}
                  className="mr-3 text-blue-600"
                />
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{gateway.displayName}</span>
                    {gateway.isRecommended && (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Processing fee: ${calculateFee(gateway).toFixed(2)} 
                    ({gateway.fees.percentage}% + ${gateway.fees.fixed})
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${calculateTotal(gateway).toFixed(2)}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TilledPaymentForm({ 
  amount, 
  onPaymentSuccess, 
  onError 
}: {
  amount: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // For Tilled, we would integrate with their SDK here
      // This is a placeholder implementation
      console.log('Processing Tilled payment...', { amount, cardData });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would:
      // 1. Create a Tilled payment method
      // 2. Confirm the payment
      // 3. Return the payment intent ID
      
      const mockPaymentIntentId = `tld_${Date.now()}`;
      onPaymentSuccess(mockPaymentIntentId);
    } catch (error: any) {
      onError(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded">
        <p className="text-sm">
          <strong>Note:</strong> Tilled integration is in development. 
          This will process as a test payment.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardData.name}
            onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <input
            type="text"
            value={cardData.number}
            onChange={(e) => setCardData(prev => ({ ...prev, number: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              value={cardData.expiry}
              onChange={(e) => setCardData(prev => ({ ...prev, expiry: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="MM/YY"
              maxLength={5}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVC
            </label>
            <input
              type="text"
              value={cardData.cvc}
              onChange={(e) => setCardData(prev => ({ ...prev, cvc: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123"
              maxLength={4}
              required
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={processing}
        className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
          processing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)} with Tilled`}
      </button>
    </form>
  );
}

function StripePaymentForm({ 
  amount, 
  onPaymentSuccess, 
  onError 
}: {
  amount: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe not loaded');
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // For now, we'll simulate the Stripe payment
      // In a real implementation, this would use the client_secret from the payment intent
      console.log('Processing Stripe payment...', { amount });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockPaymentIntentId = `pi_${Date.now()}`;
      onPaymentSuccess(mockPaymentIntentId);
    } catch (error: any) {
      onError(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <button
        type="submit"
        disabled={processing || !stripe}
        className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
          processing || !stripe
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)} with Stripe`}
      </button>
    </form>
  );
}

function EnhancedPaymentFormContent({
  bookingId,
  amount,
  onSuccess,
  onError,
  giftCertificateCode,
  preferredGateway,
  showGatewaySelection = true,
}: EnhancedPaymentFormProps) {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [noPaymentNeeded, setNoPaymentNeeded] = useState(false);

  // Load available gateways on component mount
  useEffect(() => {
    const loadGateways = async () => {
      try {
        const availableGateways = await getAvailableGateways();
        setGateways(availableGateways);
        
        // Set initial gateway selection
        const defaultGateway = preferredGateway 
          || availableGateways.find(g => g.isRecommended && g.isAvailable)?.id
          || availableGateways.find(g => g.isAvailable)?.id
          || '';
        
        setSelectedGateway(defaultGateway);
      } catch (error) {
        console.error('Error loading gateways:', error);
        setGateways(getDefaultGateways());
        setSelectedGateway('stripe');
      }
    };

    loadGateways();
  }, [preferredGateway]);

  // Create payment intent when gateway is selected
  useEffect(() => {
    if (selectedGateway && !paymentIntent) {
      createPaymentIntent();
    }
  }, [selectedGateway]);

  const createPaymentIntent = async () => {
    if (!selectedGateway) return;

    try {
      setError(null);
      setProcessing(true);

      const response = await createPaymentIntentEnhanced({
        booking_id: bookingId,
        gift_certificate_code: giftCertificateCode,
        preferred_gateway: selectedGateway,
      });

      setPaymentIntent(response);
      
      // Check if no payment is needed (e.g., fully covered by gift certificate)
      if (response.amount === 0 || !response.client_secret) {
        setNoPaymentNeeded(true);
      }
    } catch (error: any) {
      setError(error.message);
      onError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (gatewayPaymentIntentId: string) => {
    if (!paymentIntent) return;

    try {
      setProcessing(true);
      setError(null);

      await confirmPaymentEnhanced({
        payment_intent_id: gatewayPaymentIntentId,
        booking_id: bookingId,
        gateway_type: paymentIntent.gateway_type || selectedGateway,
      });

      onSuccess();
    } catch (error: any) {
      setError(error.message);
      onError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGatewayChange = (gatewayId: string) => {
    setSelectedGateway(gatewayId);
    setPaymentIntent(null);
    setNoPaymentNeeded(false);
    setError(null);
  };

  const finalAmount = paymentIntent?.amount ?? amount;
  const giftCertificateUsed = paymentIntent?.gift_certificate_amount_used ?? 0;

  if (processing && !paymentIntent) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading payment options...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Payment Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Booking Amount:</span>
            <span>${amount.toFixed(2)}</span>
          </div>
          {giftCertificateUsed > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Gift Certificate:</span>
              <span>-${giftCertificateUsed.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Amount to Pay:</span>
            <span>${finalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Gateway Selection */}
      {showGatewaySelection && gateways.length > 1 && !noPaymentNeeded && (
        <GatewaySelector
          gateways={gateways}
          selectedGateway={selectedGateway}
          onSelect={handleGatewayChange}
          amount={finalAmount}
        />
      )}

      {/* Payment Form or No Payment Message */}
      {noPaymentNeeded ? (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">No Payment Required</h3>
          <p>Your booking is fully covered by the gift certificate. Click below to complete your booking.</p>
          <button
            onClick={() => handlePaymentSuccess('')}
            disabled={processing}
            className="mt-4 w-full py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            {processing ? 'Completing Booking...' : 'Complete Booking'}
          </button>
        </div>
      ) : (
        <>
          {/* Payment Form Based on Selected Gateway */}
          {selectedGateway === 'stripe' && (
            <StripePaymentForm
              amount={finalAmount}
              onPaymentSuccess={handlePaymentSuccess}
              onError={setError}
            />
          )}
          
          {selectedGateway === 'tilled' && (
            <TilledPaymentForm
              amount={finalAmount}
              onPaymentSuccess={handlePaymentSuccess}
              onError={setError}
            />
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Gateway Info */}
      {paymentIntent?.gateway_type && (
        <div className="text-xs text-gray-500 text-center">
          Processing via {paymentIntent.gateway_type}
        </div>
      )}
    </div>
  );
}

export default function EnhancedPaymentForm(props: EnhancedPaymentFormProps) {
  // Only wrap with Stripe Elements if Stripe might be used
  const needsStripeElements = !props.preferredGateway || props.preferredGateway === 'stripe';

  if (needsStripeElements) {
    return (
      <Elements stripe={stripePromise}>
        <EnhancedPaymentFormContent {...props} />
      </Elements>
    );
  }

  return <EnhancedPaymentFormContent {...props} />;
}

// Export both components for backward compatibility
export { EnhancedPaymentForm };
export { default as PaymentForm } from './PaymentForm'; // Re-export original