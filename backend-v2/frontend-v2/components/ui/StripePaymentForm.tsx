'use client'

import React, { useState, useEffect } from 'react'
import { 
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { StripeElementsOptions } from '@stripe/stripe-js'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Loader2, Lock } from 'lucide-react'
import { getStripe, parseStripeError, PaymentErrorType } from '@/lib/stripe'

interface StripePaymentFormProps {
  clientSecret: string
  onSuccess: (paymentMethodId?: string) => void
  onError: (error: string, errorType?: string) => void
  organizationId?: number
  buttonText?: string
  description?: string
  submitLabel?: string
  isLoading?: boolean
}

function PaymentForm({ 
  clientSecret, 
  onSuccess, 
  onError,
  organizationId,
  buttonText,
  description,
  submitLabel = 'Save Payment Method',
  isLoading = false 
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Confirm the setup intent
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          // Return URL for redirect-based payment methods
          return_url: `${window.location.origin}/billing/payment-success`,
        },
        // Prevent redirect for card payments
        redirect: 'if_required',
      })

      if (confirmError) {
        // Parse the error to get more specific error type
        const parsedError = parseStripeError(confirmError)
        setError(parsedError.message)
        onError(parsedError.message, parsedError.type)
      } else {
        // Payment method successfully set up
        // Extract the payment method ID from the setup intent if needed
        const setupIntent = await stripe.retrieveSetupIntent(clientSecret)
        onSuccess(setupIntent.setupIntent?.payment_method as string)
      }
    } catch (err) {
      const parsedError = parseStripeError(err)
      setError(parsedError.message)
      onError(parsedError.message, parsedError.type)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <PaymentElement 
            options={{
              layout: 'tabs',
              defaultValues: {
                billingDetails: {
                  address: {
                    country: 'US',
                  }
                }
              }
            }}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Payment Error
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {description && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {description}
          </p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!stripe || isProcessing || isLoading}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            {buttonText || submitLabel}
          </>
        )}
      </Button>

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Your payment information is securely processed by Stripe.
          We never store your card details.
        </p>
      </div>
    </form>
  )
}

interface StripePaymentFormWrapperProps {
  clientSecret: string
  onSuccess: (paymentMethodId?: string) => void
  onError: (error: string, errorType?: string) => void
  organizationId?: number
  buttonText?: string
  description?: string
  submitLabel?: string
  isLoading?: boolean
}

export function StripePaymentForm({ 
  clientSecret, 
  ...props 
}: StripePaymentFormWrapperProps) {
  const [stripePromise] = useState(() => getStripe())
  
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#4F46E5',
        colorBackground: '#ffffff',
        colorText: '#1F2937',
        colorDanger: '#EF4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          border: '1px solid #E5E7EB',
          boxShadow: 'none',
        },
        '.Input:focus': {
          border: '1px solid #4F46E5',
          boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)',
        },
        '.Label': {
          fontWeight: '500',
          fontSize: '14px',
          marginBottom: '6px',
        },
      },
    },
  }

  if (!stripePromise) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Payment processing is not configured. Please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm clientSecret={clientSecret} {...props} />
    </Elements>
  )
}

export default StripePaymentForm