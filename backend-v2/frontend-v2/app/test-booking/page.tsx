'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export default function TestBookingPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const testBooking = async () => {
    setLoading(true)
    setResult('')
    
    try {
      // Test 1: Create appointment
      const appointmentData = {
        service: "Haircut",
        barber_id: 1,
        client_name: "Test Customer",
        client_email: "test@example.com",
        client_phone: "555-0123",
        date: new Date().toISOString().split('T')[0],
        time: "14:00",
        duration: 60,
        price: 50.00,
        notes: "Test appointment for payment flow"
      }

      console.log('Creating test appointment...')
      const response = await fetch('/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(appointmentData)
      })

      if (response.ok) {
        const appointment = await response.json()
        console.log('Appointment created:', appointment)
        
        // Test 2: Create payment intent
        console.log('Creating payment intent...')
        const paymentResponse = await fetch('/api/v1/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            appointment_id: appointment.id,
            amount: 5000, // $50.00 in cents
            currency: 'usd'
          })
        })

        if (paymentResponse.ok) {
          const paymentIntent = await paymentResponse.json()
          console.log('Payment intent created:', paymentIntent)
          
          setResult(`✅ Success! 
Appointment ID: ${appointment.id}
Payment Intent: ${paymentIntent.client_secret}
Ready for Stripe payment testing!`)
        } else {
          const error = await paymentResponse.text()
          setResult(`❌ Payment intent failed: ${error}`)
        }
      } else {
        const error = await response.text()
        setResult(`❌ Appointment creation failed: ${error}`)
      }
    } catch (error) {
      console.error('Test failed:', error)
      setResult(`❌ Test failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    setResult('')
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const fullUrl = `${API_URL}/api/v1/auth-test/login`
      
      console.log('🔧 Environment API_URL:', process.env.NEXT_PUBLIC_API_URL)
      console.log('🔧 Using API_URL:', API_URL)
      console.log('🔧 Full URL:', fullUrl)
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'test@example.com', 
          password: 'test123' 
        })
      })

      console.log('✅ Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.access_token)
        setResult(`✅ Login successful! 
API URL: ${API_URL}
Token stored: ${data.access_token.substring(0, 50)}...`)
      } else {
        const errorText = await response.text()
        setResult(`❌ Login failed (${response.status}): ${errorText}`)
      }
    } catch (error) {
      setResult(`❌ Login error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            BookedBarber V2 - Appointment Booking Test
          </h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h2 className="font-semibold text-blue-900 mb-2">Test Instructions:</h2>
              <ol className="list-decimal list-inside text-blue-800 space-y-1">
                <li>First, click "Test Login" to authenticate</li>
                <li>Then click "Test Booking Flow" to create appointment + payment</li>
                <li>Check console for detailed logs</li>
                <li>Verify in Stripe dashboard if payment intent is created</li>
              </ol>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={testLogin} 
                loading={loading}
                disabled={loading}
                variant="secondary"
              >
                Test Login
              </Button>
              
              <Button 
                onClick={testBooking} 
                loading={loading}
                disabled={loading}
                variant="primary"
              >
                Test Booking Flow
              </Button>
            </div>

            {result && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Test Result:</h3>
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {result}
                </pre>
              </div>
            )}

            <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Next Steps:</h3>
              <p className="text-yellow-800 text-sm">
                Once booking flow works, you can proceed to live Stripe payment testing with real credit cards.
                The appointment will be created in the system and should appear in calendar views.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}