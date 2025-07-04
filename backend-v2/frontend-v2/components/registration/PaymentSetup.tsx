'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { 
  CreditCard, 
  Calendar, 
  Shield, 
  Check, 
  Clock, 
  AlertTriangle,
  Gift,
  Zap
} from 'lucide-react'

interface PricingInfo {
  chairs: number
  monthlyTotal: number
  tier: string
}

interface PaymentSetupProps {
  businessName: string
  pricingInfo: PricingInfo
  onComplete: (paymentInfo: { trialStarted: boolean; paymentMethodAdded: boolean }) => void
  onFinish: () => void
  onBack: () => void
}

interface PaymentMethod {
  type: 'card' | 'bank'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
}

export function PaymentSetup({ 
  businessName, 
  pricingInfo, 
  onComplete, 
  onFinish, 
  onBack 
}: PaymentSetupProps) {
  const [step, setStep] = useState<'trial' | 'payment' | 'complete'>('trial')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Mock payment form state
  const [cardForm, setCardForm] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    name: '',
    zipCode: ''
  })

  const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const billingStartDate = new Date(trialEndDate.getTime() + 24 * 60 * 60 * 1000)

  const handleStartTrial = async () => {
    setLoading(true)
    
    // Simulate API call to start trial
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setStep('payment')
    setLoading(false)
  }

  const validateCardForm = () => {
    const newErrors: Record<string, string> = {}

    if (!cardForm.number || cardForm.number.length < 16) {
      newErrors.number = 'Please enter a valid card number'
    }

    if (!cardForm.expiryMonth || !cardForm.expiryYear) {
      newErrors.expiry = 'Please enter expiry date'
    }

    if (!cardForm.cvc || cardForm.cvc.length < 3) {
      newErrors.cvc = 'Please enter CVC'
    }

    if (!cardForm.name.trim()) {
      newErrors.name = 'Please enter cardholder name'
    }

    if (!cardForm.zipCode || cardForm.zipCode.length < 5) {
      newErrors.zipCode = 'Please enter billing ZIP code'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddPaymentMethod = async () => {
    if (!validateCardForm()) return

    setLoading(true)

    // Simulate Stripe integration
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock successful payment method addition
    setPaymentMethod({
      type: 'card',
      last4: cardForm.number.slice(-4),
      brand: 'Visa', // Mock brand detection
      expiryMonth: parseInt(cardForm.expiryMonth),
      expiryYear: parseInt(cardForm.expiryYear)
    })

    setStep('complete')
    setLoading(false)
  }

  const handleComplete = () => {
    onComplete({
      trialStarted: true,
      paymentMethodAdded: !!paymentMethod
    })
    onFinish()
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  if (step === 'trial') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Start your free trial
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Get full access to BookedBarber for 14 days - no payment required
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <Gift className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400">
                14-Day Free Trial
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300">
                Experience everything BookedBarber has to offer
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Trial Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  {businessName}
                </h3>
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {pricingInfo.tier} ({pricingInfo.chairs} chairs)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Trial starts:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Today
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Trial ends:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {trialEndDate.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-gray-600 dark:text-gray-400">Billing starts:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {billingStartDate.toLocaleDateString()} (${pricingInfo.monthlyTotal}/month)
                    </span>
                  </div>
                </div>
              </div>

              {/* Trial Benefits */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  During your trial, you'll get:
                </h4>
                <div className="space-y-2">
                  {[
                    'Full access to all features',
                    'Unlimited bookings and clients',
                    'Complete payment processing',
                    'SMS and email notifications',
                    'Mobile app access',
                    'Priority customer support'
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      No commitment during trial
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Cancel anytime during your 14-day trial and you won't be charged. 
                      We'll remind you 3 days before your trial ends.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartTrial}
                disabled={loading}
                size="lg"
                className="w-full"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Starting your trial...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Free Trial Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between pt-6 max-w-2xl mx-auto">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <div /> {/* Spacer */}
        </div>
      </div>
    )
  }

  if (step === 'payment') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Add payment method
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Secure your spot - we'll charge you only after your trial ends
          </p>
        </div>

        <div className="max-w-2xl mx-auto grid gap-6 lg:grid-cols-2">
          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={formatCardNumber(cardForm.number)}
                  onChange={(e) => setCardForm(prev => ({ 
                    ...prev, 
                    number: e.target.value.replace(/\s/g, '') 
                  }))}
                  maxLength={19}
                  className={errors.number ? 'border-red-500' : ''}
                />
                {errors.number && (
                  <p className="text-sm text-red-600 mt-1">{errors.number}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="expiryMonth">Month</Label>
                  <Input
                    id="expiryMonth"
                    placeholder="MM"
                    value={cardForm.expiryMonth}
                    onChange={(e) => setCardForm(prev => ({ 
                      ...prev, 
                      expiryMonth: e.target.value 
                    }))}
                    maxLength={2}
                    className={errors.expiry ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="expiryYear">Year</Label>
                  <Input
                    id="expiryYear"
                    placeholder="YY"
                    value={cardForm.expiryYear}
                    onChange={(e) => setCardForm(prev => ({ 
                      ...prev, 
                      expiryYear: e.target.value 
                    }))}
                    maxLength={2}
                    className={errors.expiry ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cardForm.cvc}
                    onChange={(e) => setCardForm(prev => ({ 
                      ...prev, 
                      cvc: e.target.value 
                    }))}
                    maxLength={4}
                    className={errors.cvc ? 'border-red-500' : ''}
                  />
                </div>
              </div>
              {errors.expiry && (
                <p className="text-sm text-red-600">{errors.expiry}</p>
              )}
              {errors.cvc && (
                <p className="text-sm text-red-600">{errors.cvc}</p>
              )}

              <div>
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  placeholder="John Doe"
                  value={cardForm.name}
                  onChange={(e) => setCardForm(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="zipCode">Billing ZIP Code</Label>
                <Input
                  id="zipCode"
                  placeholder="12345"
                  value={cardForm.zipCode}
                  onChange={(e) => setCardForm(prev => ({ 
                    ...prev, 
                    zipCode: e.target.value 
                  }))}
                  className={errors.zipCode ? 'border-red-500' : ''}
                />
                {errors.zipCode && (
                  <p className="text-sm text-red-600 mt-1">{errors.zipCode}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security & Billing Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-600" />
                  Secure & Protected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    256-bit SSL encryption
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    PCI DSS compliant
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Powered by Stripe
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Billing Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Trial ends:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {trialEndDate.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">First charge:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {billingStartDate.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${pricingInfo.monthlyTotal}/month
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleAddPaymentMethod}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Securing payment method...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Secure Payment Method
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            You won't be charged until your trial ends on {trialEndDate.toLocaleDateString()}
          </p>
        </div>

        <div className="flex justify-between pt-6 max-w-2xl mx-auto">
          <Button variant="outline" onClick={() => setStep('trial')}>
            Back
          </Button>
          <div />
        </div>
      </div>
    )
  }

  // Complete step
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to BookedBarber!
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Your account is ready and your trial has started
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Success Summary */}
              <div className="text-center space-y-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Trial Active
                </Badge>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {businessName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {pricingInfo.tier} • {pricingInfo.chairs} chairs • ${pricingInfo.monthlyTotal}/month
                  </p>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                  🎉 What's next?
                </h4>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-center space-x-2">
                    <Check className="h-3 w-3" />
                    <span>Check your email for account verification</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-3 w-3" />
                    <span>Download the mobile app for easy access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-3 w-3" />
                    <span>Set up your first barber and services</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-3 w-3" />
                    <span>Start taking bookings immediately</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              {paymentMethod && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Payment Method Secured
                  </h4>
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {paymentMethod.brand} ending in {paymentMethod.last4}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    First charge: {billingStartDate.toLocaleDateString()}
                  </p>
                </div>
              )}

              <Button
                onClick={handleComplete}
                size="lg"
                className="w-full"
              >
                Enter Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PaymentSetup