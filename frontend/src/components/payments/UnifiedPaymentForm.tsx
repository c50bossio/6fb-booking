'use client'

import React, { useState } from 'react'
import { PaymentForm } from './PaymentForm'
import { SquarePaymentForm } from './SquarePaymentForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Square } from 'lucide-react'

interface UnifiedPaymentFormProps {
  amount: number
  appointmentId: number
  clientSecret?: string // For Stripe
  squareApplicationId?: string // For Square
  squareLocationId?: string // For Square
  customerEmail?: string
  onSuccess?: (paymentId: number, method: 'stripe' | 'square') => void
  onError?: (error: string) => void
  enabledMethods?: ('stripe' | 'square')[]
}

export function UnifiedPaymentForm({
  amount,
  appointmentId,
  clientSecret,
  squareApplicationId,
  squareLocationId,
  customerEmail,
  onSuccess,
  onError,
  enabledMethods = ['stripe'], // Default to Stripe only
}: UnifiedPaymentFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'square'>(
    enabledMethods[0] || 'stripe'
  )

  const handleStripeSuccess = (paymentId: number) => {
    onSuccess?.(paymentId, 'stripe')
  }

  const handleSquareSuccess = (paymentId: number) => {
    onSuccess?.(paymentId, 'square')
  }

  // If only one method is enabled, don't show tabs
  if (enabledMethods.length === 1) {
    const method = enabledMethods[0]

    if (method === 'stripe' && clientSecret) {
      return (
        <PaymentForm
          amount={amount}
          clientSecret={clientSecret}
          onSuccess={handleStripeSuccess}
          onError={onError}
        />
      )
    }

    if (method === 'square' && squareApplicationId && squareLocationId) {
      return (
        <SquarePaymentForm
          amount={amount}
          appointmentId={appointmentId}
          applicationId={squareApplicationId}
          locationId={squareLocationId}
          customerEmail={customerEmail}
          onSuccess={handleSquareSuccess}
          onError={onError}
        />
      )
    }

    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
        Payment method not properly configured
      </div>
    )
  }

  // Multiple methods available - show tabs
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Choose your payment method
        </h3>
        <p className="text-sm text-gray-600">
          Select your preferred way to pay for this appointment
        </p>
      </div>

      <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as 'stripe' | 'square')}>
        <TabsList className="grid w-full grid-cols-2">
          {enabledMethods.includes('stripe') && (
            <TabsTrigger value="stripe" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Credit Card</span>
              <Badge variant="secondary" className="text-xs">Stripe</Badge>
            </TabsTrigger>
          )}
          {enabledMethods.includes('square') && (
            <TabsTrigger value="square" className="flex items-center space-x-2">
              <Square className="w-4 h-4" />
              <span>Square</span>
              <Badge variant="secondary" className="text-xs">Square</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {enabledMethods.includes('stripe') && clientSecret && (
          <TabsContent value="stripe" className="mt-6">
            <PaymentForm
              amount={amount}
              clientSecret={clientSecret}
              onSuccess={handleStripeSuccess}
              onError={onError}
            />
          </TabsContent>
        )}

        {enabledMethods.includes('square') && squareApplicationId && squareLocationId && (
          <TabsContent value="square" className="mt-6">
            <SquarePaymentForm
              amount={amount}
              appointmentId={appointmentId}
              applicationId={squareApplicationId}
              locationId={squareLocationId}
              customerEmail={customerEmail}
              onSuccess={handleSquareSuccess}
              onError={onError}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
