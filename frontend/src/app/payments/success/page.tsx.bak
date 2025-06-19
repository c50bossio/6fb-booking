/**
 * Payment success page
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Get payment intent from URL params
    const paymentIntent = searchParams.get('payment_intent');
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
    
    if (paymentIntent) {
      // TODO: Fetch payment details from backend
      // For now, we'll just show a success message
      setTimeout(() => {
        setPaymentDetails({
          amount: 5000, // Example amount in cents
          appointmentId: 123,
        });
        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const handleViewAppointment = () => {
    router.push('/appointments');
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="flex flex-col items-center justify-center">
          <LoadingSpinner className="mb-4" />
          <p className="text-gray-600">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto">
        <Card className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          
          <p className="text-gray-600 mb-8">
            Your payment has been processed successfully. You will receive a
            confirmation email shortly with your appointment details.
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-2">What's Next?</h3>
            <ul className="text-left text-sm text-gray-600 space-y-2">
              <li>• Check your email for appointment confirmation</li>
              <li>• Add the appointment to your calendar</li>
              <li>• Arrive 5 minutes early for your appointment</li>
              <li>• Contact us if you need to reschedule</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button onClick={handleViewAppointment} className="w-full">
              View My Appointments
            </Button>
            <Button onClick={handleReturnHome} variant="outline" className="w-full">
              Return to Home
            </Button>
          </div>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Need help? Contact our support team at{' '}
            <a href="mailto:support@6fb.com" className="text-primary hover:underline">
              support@6fb.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}