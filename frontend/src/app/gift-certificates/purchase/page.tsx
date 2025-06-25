'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GiftCertificatePurchase } from '@/components/gift-certificates';
import { PageTransition } from '@/components/PageTransition';

export default function GiftCertificatePurchasePage() {
  const router = useRouter();

  const handleSuccess = (certificate: any) => {
    // Redirect to success page or dashboard after a short delay
    setTimeout(() => {
      router.push('/gift-certificates');
    }, 3000);
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Give the Gift of Great Grooming</h1>
            <p className="text-xl text-gray-600">
              Perfect for birthdays, holidays, or any special occasion
            </p>
          </div>

          <GiftCertificatePurchase
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />

          {/* Benefits Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="font-semibold mb-2">Instant Delivery</h3>
              <p className="text-gray-600">
                Gift certificates are delivered immediately via email
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="font-semibold mb-2">Personalized</h3>
              <p className="text-gray-600">
                Add a custom message to make it extra special
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="font-semibold mb-2">Never Expires</h3>
              <p className="text-gray-600">
                Valid for 12 months from purchase date
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
