'use client';

import GiftCertificates from '@/components/GiftCertificates';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GiftCertificatesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/payments')}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payments
        </button>
        
        <GiftCertificates />
      </div>
    </div>
  );
}