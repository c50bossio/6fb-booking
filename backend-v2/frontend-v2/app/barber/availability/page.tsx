'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BarberAvailabilityPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new consolidated My Schedule page
    router.replace('/my-schedule');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to My Schedule...</p>
        </div>
      </div>
    </div>
  );
}