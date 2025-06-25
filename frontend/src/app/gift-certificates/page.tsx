'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GiftCertificateDashboard } from '@/components/gift-certificates';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';

export default function GiftCertificatesPage() {
  const router = useRouter();

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <GiftCertificateDashboard />
        </div>
      </div>
    </PageTransition>
  );
}
