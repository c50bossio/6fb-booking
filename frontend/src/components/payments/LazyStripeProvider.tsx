'use client'

import { lazy, Suspense, ReactNode } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Lazy load Stripe components only when payment is needed
const StripeProvider = lazy(() => import('@/providers/StripeProvider'))
const PaymentForm = lazy(() => import('./PaymentForm'))
const StripePaymentForm = lazy(() => import('./StripePaymentForm'))
const CheckoutFlow = lazy(() => import('./CheckoutFlow'))
const UnifiedPaymentForm = lazy(() => import('./UnifiedPaymentForm'))

interface LazyStripeWrapperProps {
  children: ReactNode
}

const LazyStripeWrapper = ({ children }: LazyStripeWrapperProps) => {
  const PaymentFallback = () => (
    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <LoadingSpinner />
      <span className="ml-2 text-gray-600">Loading payment system...</span>
    </div>
  )

  return (
    <Suspense fallback={<PaymentFallback />}>
      <StripeProvider>
        {children}
      </StripeProvider>
    </Suspense>
  )
}

interface LazyPaymentComponentProps {
  component: 'form' | 'stripe-form' | 'checkout' | 'unified'
  [key: string]: any
}

const LazyPaymentComponent = ({ component, ...props }: LazyPaymentComponentProps) => {
  const PaymentFallback = () => (
    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
      <LoadingSpinner />
      <span className="ml-2 text-gray-600">Loading payment form...</span>
    </div>
  )

  const renderComponent = () => {
    switch (component) {
      case 'form':
        return (
          <Suspense fallback={<PaymentFallback />}>
            <PaymentForm {...props} />
          </Suspense>
        )
      case 'stripe-form':
        return (
          <Suspense fallback={<PaymentFallback />}>
            <StripePaymentForm {...props} />
          </Suspense>
        )
      case 'checkout':
        return (
          <Suspense fallback={<PaymentFallback />}>
            <CheckoutFlow {...props} />
          </Suspense>
        )
      case 'unified':
        return (
          <Suspense fallback={<PaymentFallback />}>
            <UnifiedPaymentForm {...props} />
          </Suspense>
        )
      default:
        return <PaymentFallback />
    }
  }

  return (
    <LazyStripeWrapper>
      {renderComponent()}
    </LazyStripeWrapper>
  )
}

export { LazyStripeWrapper, LazyPaymentComponent }
