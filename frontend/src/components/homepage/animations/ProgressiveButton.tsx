'use client';

import React from 'react';
import Link from 'next/link';

interface ProgressiveButtonProps {
  href?: string;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  success?: boolean;
}

export default function ProgressiveButton({
  href,
  loading = false,
  className = '',
  children,
  onClick,
  success = false
}: ProgressiveButtonProps) {
  const baseClasses = `
    relative inline-flex items-center justify-center
    px-8 py-4 text-lg font-semibold
    text-white rounded-full
    transition-all duration-300 ease-out
    transform-gpu will-change-transform
    overflow-hidden
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `;

  const content = (
    <>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-gradient" />

      {/* Glow effect overlay */}
      <div className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity duration-300 rounded-full bg-white" />

      {/* Content container */}
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Processing...</span>
          </>
        ) : success ? (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Success!</span>
          </>
        ) : (
          children
        )}
      </span>
    </>
  );

  if (href && !loading) {
    return (
      <Link
        href={href}
        className={`${baseClasses} hover:scale-105 hover:shadow-glow active:scale-100`}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={`${baseClasses} hover:scale-105 hover:shadow-glow active:scale-100`}
      onClick={onClick}
      disabled={loading}
    >
      {content}
    </button>
  );
}
