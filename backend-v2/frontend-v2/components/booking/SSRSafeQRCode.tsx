'use client'

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import QRCodeGenerator with SSR disabled
const QRCodeGenerator = dynamic(() => import('./QRCodeGenerator'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading QR code...</div>
    </div>
  ),
});

// Export SSR-safe version
export default QRCodeGenerator;