'use client';

import React, { useState } from 'react';
import ProgressiveButton from './ProgressiveButton';

/**
 * Example component showing how to use ProgressiveButton
 * This replaces the complex PremiumTrialButton with a simpler implementation
 */
export default function ProgressiveButtonExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsLoading(false);
    setIsSuccess(true);

    // Reset success state after 3 seconds
    setTimeout(() => {
      setIsSuccess(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h2 className="text-2xl font-bold text-gray-900">ProgressiveButton Examples</h2>

      {/* Basic Link Button */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Link Button</h3>
        <ProgressiveButton href="/signup">
          Start Free Trial
        </ProgressiveButton>
      </div>

      {/* Button with Loading State */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Interactive Button</h3>
        <ProgressiveButton
          loading={isLoading}
          success={isSuccess}
          onClick={handleClick}
        >
          {isSuccess ? 'Account Created!' : 'Create Account'}
        </ProgressiveButton>
      </div>

      {/* Custom Styled Button */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Custom Style</h3>
        <ProgressiveButton
          href="/book"
          className="text-xl px-12 py-6"
        >
          Book Appointment
        </ProgressiveButton>
      </div>
    </div>
  );
}
