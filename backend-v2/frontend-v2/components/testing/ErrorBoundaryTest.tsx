'use client'

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { 
  AnalyticsErrorBoundary, 
  BookingErrorBoundary, 
  PaymentErrorBoundary, 
  FormErrorBoundary 
} from '../error-boundaries'

// Test components that can throw different types of errors
function AnalyticsTestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false)
  
  if (shouldThrow) {
    // Simulate a common analytics error (toFixed on undefined)
    const badNumber: any = undefined
    return <div>{badNumber.toFixed(2)}</div>
  }
  
  return (
    <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded border">
      <p>Analytics component working correctly</p>
      <Button onClick={() => setShouldThrow(true)} variant="destructive" size="sm">
        Trigger Analytics Error
      </Button>
    </div>
  )
}

function BookingTestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false)
  
  if (shouldThrow) {
    throw new Error('Booking slot is no longer available')
  }
  
  return (
    <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded border">
      <p>Booking component working correctly</p>
      <Button onClick={() => setShouldThrow(true)} variant="destructive" size="sm">
        Trigger Booking Error
      </Button>
    </div>
  )
}

function PaymentTestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false)
  
  if (shouldThrow) {
    throw new Error('Payment card was declined by your bank')
  }
  
  return (
    <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded border">
      <p>Payment component working correctly</p>
      <Button onClick={() => setShouldThrow(true)} variant="destructive" size="sm">
        Trigger Payment Error
      </Button>
    </div>
  )
}

function FormTestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false)
  
  if (shouldThrow) {
    throw new Error('Validation failed: Required field is missing')
  }
  
  return (
    <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded border">
      <p>Form component working correctly</p>
      <Button onClick={() => setShouldThrow(true)} variant="destructive" size="sm">
        Trigger Form Error
      </Button>
    </div>
  )
}

export default function ErrorBoundaryTest() {
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Boundary Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Analytics Error Boundary Test */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Analytics Error Boundary</h3>
            <AnalyticsErrorBoundary 
              contextInfo={{ 
                analyticsType: 'test-analytics',
                userId: 'test-user',
                dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' }
              }}
            >
              <AnalyticsTestComponent />
            </AnalyticsErrorBoundary>
          </div>

          {/* Booking Error Boundary Test */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Booking Error Boundary</h3>
            <BookingErrorBoundary 
              contextInfo={{ 
                bookingStep: 2,
                selectedService: 'Haircut',
                selectedDate: '2025-01-15',
                selectedTime: '10:00',
                userId: 'test-user',
                isGuestBooking: false
              }}
            >
              <BookingTestComponent />
            </BookingErrorBoundary>
          </div>

          {/* Payment Error Boundary Test */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Payment Error Boundary</h3>
            <PaymentErrorBoundary 
              contextInfo={{ 
                bookingId: 123,
                amount: 45,
                paymentStep: 'card-input',
                userId: 'test-user',
                isGuestPayment: false,
                paymentMethod: 'stripe'
              }}
            >
              <PaymentTestComponent />
            </PaymentErrorBoundary>
          </div>

          {/* Form Error Boundary Test */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Form Error Boundary</h3>
            <FormErrorBoundary 
              contextInfo={{ 
                formName: 'test-form',
                formStep: 'validation',
                userId: 'test-user',
                formData: { name: 'Test', email: 'test@example.com' },
                isSubmitting: false
              }}
            >
              <FormTestComponent />
            </FormErrorBoundary>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to Test:</h4>
            <ol className="list-decimal list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>Click any "Trigger Error" button above</li>
              <li>Observe the error boundary catching the error gracefully</li>
              <li>Try the recovery options (Try Again, different actions)</li>
              <li>Notice the contextual error messages and recovery suggestions</li>
              <li>Test the feedback forms if available</li>
            </ol>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}