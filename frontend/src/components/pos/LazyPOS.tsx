'use client'

import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Lazy load POS components
const CheckoutForm = lazy(() => import('./CheckoutForm'))
const CheckoutFormEnhanced = lazy(() => import('./CheckoutFormEnhanced'))
const ProductGrid = lazy(() => import('./ProductGrid'))
const ShoppingCart = lazy(() => import('./ShoppingCart'))
const ReceiptDisplay = lazy(() => import('./ReceiptDisplay'))
const ReceiptDisplayEnhanced = lazy(() => import('./ReceiptDisplayEnhanced'))
const MobilePOSLayout = lazy(() => import('./MobilePOSLayout'))

interface LazyPOSProps {
  component: 'checkout' | 'checkout-enhanced' | 'products' | 'cart' |
            'receipt' | 'receipt-enhanced' | 'mobile-layout'
  [key: string]: any
}

const LazyPOS = ({ component, ...props }: LazyPOSProps) => {
  const POSFallback = () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <LoadingSpinner />
      <span className="ml-2 text-gray-600">Loading POS system...</span>
    </div>
  )

  const renderComponent = () => {
    switch (component) {
      case 'checkout':
        return (
          <Suspense fallback={<POSFallback />}>
            <CheckoutForm {...props} />
          </Suspense>
        )
      case 'checkout-enhanced':
        return (
          <Suspense fallback={<POSFallback />}>
            <CheckoutFormEnhanced {...props} />
          </Suspense>
        )
      case 'products':
        return (
          <Suspense fallback={<POSFallback />}>
            <ProductGrid {...props} />
          </Suspense>
        )
      case 'cart':
        return (
          <Suspense fallback={<POSFallback />}>
            <ShoppingCart {...props} />
          </Suspense>
        )
      case 'receipt':
        return (
          <Suspense fallback={<POSFallback />}>
            <ReceiptDisplay {...props} />
          </Suspense>
        )
      case 'receipt-enhanced':
        return (
          <Suspense fallback={<POSFallback />}>
            <ReceiptDisplayEnhanced {...props} />
          </Suspense>
        )
      case 'mobile-layout':
        return (
          <Suspense fallback={<POSFallback />}>
            <MobilePOSLayout {...props} />
          </Suspense>
        )
      default:
        return <POSFallback />
    }
  }

  return renderComponent()
}

export default LazyPOS
