'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSquare } from '@/providers/SquareProvider'
import { paymentHelpers } from '@/lib/api/payments'

interface SquarePaymentFormProps {
  amount: number
  appointmentId: number
  applicationId: string
  locationId: string
  customerEmail?: string
  onSuccess?: (paymentId: number) => void
  onError?: (error: string) => void
}

export function SquarePaymentForm({
  amount,
  appointmentId,
  applicationId,
  locationId,
  customerEmail,
  onSuccess,
  onError,
}: SquarePaymentFormProps) {
  const { square, isLoaded, error: squareError } = useSquare()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cardInitialized, setCardInitialized] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const cardInstance = useRef<any>(null)

  useEffect(() => {
    if (!isLoaded || !square || !cardRef.current || cardInitialized) return

    const initializeCard = async () => {
      try {
        const payments = square.payments(applicationId, locationId)
        const card = await payments.card()

        await card.attach(cardRef.current!)
        cardInstance.current = card
        setCardInitialized(true)
      } catch (err) {
        console.error('Failed to initialize Square card:', err)
        setError('Failed to initialize payment form')
      }
    }

    initializeCard()
  }, [isLoaded, square, applicationId, locationId, cardInitialized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cardInstance.current) {
      setError('Payment form not ready')
      return
    }

    setError(null)
    setProcessing(true)

    try {
      // Tokenize the card
      const result = await cardInstance.current.tokenize()

      if (result.status === 'OK') {
        // Send the token to our backend
        const paymentData = {
          appointment_id: appointmentId,
          source_id: result.token,
          amount: amount,
          customer_email: customerEmail,
        }

        const response = await fetch('/api/v1/square-oauth/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify(paymentData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Payment failed')
        }

        const paymentResult = await response.json()
        onSuccess?.(paymentResult.id)
      } else {
        throw new Error(result.errors?.[0]?.message || 'Payment tokenization failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  if (squareError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
        {squareError}
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner className="mr-2" />
        Loading payment form...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Amount to pay</p>
        <p className="text-2xl font-bold">{paymentHelpers.formatAmount(amount)}</p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Card Information
        </label>
        <div
          ref={cardRef}
          className="p-4 border border-gray-300 rounded-lg min-h-[60px] bg-white"
          style={{
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!cardInitialized || processing}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {processing ? (
          <>
            <LoadingSpinner className="mr-2" />
            Processing Payment...
          </>
        ) : (
          `Pay ${paymentHelpers.formatAmount(amount)} with Square`
        )}
      </Button>

      <div className="text-xs text-gray-500 text-center">
        Secured by Square • Your payment information is encrypted and secure
      </div>
    </form>
  )
}
