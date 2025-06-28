/**
 * Appointment payment component for booking flow
 */
import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutFlow } from '@/components/payments/CheckoutFlow';
import { formatAmount } from '@/lib/api/payments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface AppointmentDetails {
  id: number;
  date: string;
  time: string;
  barber: string;
  service: string;
  duration: number;
  price: number;
}

interface AppointmentPaymentProps {
  appointment: AppointmentDetails;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

export function AppointmentPayment({
  appointment,
  onPaymentSuccess,
  onCancel,
}: AppointmentPaymentProps) {
  const [showCheckout, setShowCheckout] = useState(false);

  const handleConfirmBooking = () => {
    setShowCheckout(true);
  };

  if (showCheckout) {
    return (
      <Elements stripe={stripePromise}>
        <CheckoutFlow
          appointmentId={appointment.id}
          amount={appointment.price * 100} // Convert to cents
          onSuccess={onPaymentSuccess}
          onCancel={() => setShowCheckout(false)}
        />
      </Elements>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Appointment Summary</h3>

        <div className="space-y-3">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-3" />
            <span>{format(new Date(appointment.date), 'MMMM d, yyyy')}</span>
          </div>

          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-3" />
            <span>{appointment.time} ({appointment.duration} minutes)</span>
          </div>

          <div className="flex items-center text-gray-600">
            <User className="h-4 w-4 mr-3" />
            <span>{appointment.barber}</span>
          </div>

          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium">{appointment.service}</span>
              <span className="font-semibold">{formatAmount(appointment.price * 100)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-lg font-medium">Total Amount</span>
          </div>
          <span className="text-2xl font-bold">{formatAmount(appointment.price * 100)}</span>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Your payment will be processed securely through Stripe. You can save your
          payment method for faster checkout in the future.
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBooking}
            className="flex-1"
          >
            Proceed to Payment
          </Button>
        </div>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>
          By confirming this booking, you agree to our{' '}
          <a href="/terms" className="text-primary hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
