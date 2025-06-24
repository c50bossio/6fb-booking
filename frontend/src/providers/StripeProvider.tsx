'use client'

import React from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

// Initialize Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeProviderProps {
  children: React.ReactNode
}

export function StripeProvider({ children }: StripeProviderProps) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.error('Stripe publishable key is not configured')
    return <>{children}</>
  }

  const options = {
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#14b8a6', // Teal color to match your theme
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Tab': {
          border: '1px solid #e5e7eb',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
        },
        '.Tab:hover': {
          border: '1px solid #14b8a6',
        },
        '.Tab--selected': {
          borderColor: '#14b8a6',
          boxShadow: '0px 1px 3px rgba(20, 184, 166, 0.1), 0px 0px 0px 1px #14b8a6',
        },
        '.Input': {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
        },
        '.Input:focus': {
          boxShadow: '0px 1px 3px rgba(20, 184, 166, 0.1), 0px 0px 0px 1px #14b8a6',
        },
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}