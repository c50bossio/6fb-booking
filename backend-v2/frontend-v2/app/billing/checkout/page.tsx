'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { getProfile, getTrialStatus, type User, type TrialStatus } from '@/lib/api'
import { createSetupIntent } from '@/lib/stripe'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { StripePaymentForm } from '@/components/ui/StripePaymentForm'
import { ArrowLeft, CreditCard, Shield, Check, AlertTriangle, Loader2 } from 'lucide-react'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutState {
  step: 'loading' | 'payment' | 'processing' | 'success' | 'error'
  error?: string
  errorType?: 'card_declined' | 'insufficient_funds' | 'expired_card' | 'network' | 'stripe_unavailable' | 'generic'
  retryCount?: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({ step: 'loading', retryCount: 0 })
  const [setupIntent, setSetupIntent] = useState<any>(null)

  // Get parameters from URL
  const chairs = parseInt(searchParams.get('chairs') || '1')
  const monthlyTotal = parseFloat(searchParams.get('total') || '19')

  useEffect(() => {
    async function initializeCheckout() {
      try {
        // Get user profile and trial status
        const userData = await getProfile()
        setUser(userData)

        if (!userData.primary_organization_id) {
          throw new Error('No organization found for user')
        }

        const trialData = await getTrialStatus(userData.primary_organization_id)
        setTrialStatus(trialData)

        // Create setup intent for payment method collection
        const intent = await createSetupIntent(userData.primary_organization_id)
        setSetupIntent(intent)

        setCheckoutState({ step: 'payment' })
      } catch (error) {
        console.error('Failed to initialize checkout:', error)
        setCheckoutState({ 
          step: 'error', 
          error: 'Failed to load checkout. Please try again.' 
        })
      }
    }

    initializeCheckout()
  }, [])

  const handlePaymentSuccess = async (paymentMethodId: string) => {
    setCheckoutState({ step: 'processing' })
    
    try {
      // The StripePaymentForm handles attaching the payment method
      // Here we just need to redirect to success or handle subscription creation
      
      // For now, we'll redirect to the dashboard with a success message
      setCheckoutState({ step: 'success' })
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard?payment=success')
      }, 2000)
      
    } catch (error) {
      console.error('Payment processing failed:', error)
      setCheckoutState({ 
        step: 'error', 
        error: 'Payment processing failed. Please try again.' 
      })
    }
  }

  const handlePaymentError = (error: string, errorType?: string) => {
    // Parse error type from Stripe error codes
    let parsedErrorType: CheckoutState['errorType'] = 'generic'
    
    if (error.includes('card_declined') || error.includes('Your card was declined')) {
      parsedErrorType = 'card_declined'
    } else if (error.includes('insufficient_funds')) {
      parsedErrorType = 'insufficient_funds'
    } else if (error.includes('expired_card')) {
      parsedErrorType = 'expired_card'
    } else if (error.includes('network') || error.includes('fetch')) {
      parsedErrorType = 'network'
    } else if (error.includes('Stripe is not available')) {
      parsedErrorType = 'stripe_unavailable'
    }
    
    setCheckoutState(prev => ({ 
      step: 'error', 
      error, 
      errorType: parsedErrorType,
      retryCount: prev.retryCount || 0
    }))
  }

  const handleRetry = () => {
    setCheckoutState(prev => ({ 
      step: 'payment', 
      retryCount: (prev.retryCount || 0) + 1 
    }))
  }

  if (checkoutState.step === 'loading') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600 dark:text-gray-300">Loading checkout...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (checkoutState.step === 'error') {
    const getErrorMessage = () => {
      switch (checkoutState.errorType) {
        case 'card_declined':
          return {
            title: 'Card Declined',
            message: 'Your card was declined. Please try a different payment method or contact your bank.',
            icon: CreditCard,
            canRetry: true
          }
        case 'insufficient_funds':
          return {
            title: 'Insufficient Funds',
            message: 'Your card has insufficient funds. Please try a different payment method.',
            icon: AlertTriangle,
            canRetry: true
          }
        case 'expired_card':
          return {
            title: 'Card Expired',
            message: 'Your card has expired. Please use a different payment method.',
            icon: CreditCard,
            canRetry: true
          }
        case 'network':
          return {
            title: 'Connection Error',
            message: 'We couldn\'t connect to the payment processor. Please check your internet connection and try again.',
            icon: AlertTriangle,
            canRetry: true
          }
        case 'stripe_unavailable':
          return {
            title: 'Payment System Unavailable',
            message: 'Our payment system is temporarily unavailable. Please try again in a few minutes.',
            icon: AlertTriangle,
            canRetry: true
          }
        default:
          return {
            title: 'Payment Error',
            message: checkoutState.error || 'An unexpected error occurred. Please try again.',
            icon: AlertTriangle,
            canRetry: true
          }
      }
    }
    
    const errorInfo = getErrorMessage()
    const IconComponent = errorInfo.icon
    
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <IconComponent className="h-12 w-12 text-red-600 mx-auto" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {errorInfo.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {errorInfo.message}
                  </p>
                </div>
                
                {checkoutState.retryCount && checkoutState.retryCount > 2 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
                    <p className="text-amber-800 dark:text-amber-200">
                      Still having trouble? You can contact support at{' '}
                      <a href="mailto:support@bookedbarber.com" className="underline font-medium">
                        support@bookedbarber.com
                      </a>
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3 justify-center pt-4">
                  {errorInfo.canRetry && (
                    <Button onClick={handleRetry} variant="primary">
                      Try Again
                    </Button>
                  )}
                  <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Alternative payment methods suggestion */}
          {checkoutState.errorType === 'card_declined' && (
            <div className="mt-6">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="py-4">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Alternative Payment Options
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Try a different credit or debit card</li>
                    <li>• Contact your bank to authorize the transaction</li>
                    <li>• Use a prepaid card with sufficient balance</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    )
  }

  if (checkoutState.step === 'success') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card variant="outlined">
            <CardContent className="text-center py-8">
              <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Payment Method Added!</h2>
              <p className="text-green-700">
                Your payment method has been successfully added. You'll be redirected to your dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (checkoutState.step === 'processing') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600 dark:text-gray-300">Processing payment method...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Add Payment Method
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {trialStatus?.trial_active 
                ? 'Add a payment method to continue after your trial expires'
                : 'Add a payment method to reactivate your subscription'
              }
            </p>
          </div>
        </div>

        {/* Trial Status Summary */}
        {trialStatus && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Subscription Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Organization</p>
                  <p className="font-medium">{trialStatus.organization_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Chairs</p>
                  <p className="font-medium">{trialStatus.chairs_count} chairs</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Monthly Cost</p>
                  <p className="font-medium text-xl">${trialStatus.monthly_cost}/month</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Trial Status</p>
                  <p className="font-medium">
                    {trialStatus.trial_active 
                      ? `${trialStatus.days_remaining} days remaining`
                      : 'Trial expired'
                    }
                  </p>
                </div>
              </div>
              
              {trialStatus.trial_active && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Trial Protection
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Adding a payment method now ensures seamless service after your trial. 
                        You won't be charged until {new Date(trialStatus.trial_expires_at || '').toLocaleDateString()}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {setupIntent && (
              <Elements stripe={stripePromise}>
                <StripePaymentForm
                  clientSecret={setupIntent.client_secret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  organizationId={user?.primary_organization_id}
                  buttonText="Add Payment Method"
                  description="Your card information is encrypted and secure"
                />
              </Elements>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Secure Payment Processing
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Your payment information is processed securely by Stripe and never stored on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}