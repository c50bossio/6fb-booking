'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import GoogleOAuthService from '@/lib/auth/google-oauth'
import {
  CheckIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  StarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

const plans = {
  starter: {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for new barbers getting started',
    features: [
      'Automated weekly payouts',
      'Basic commission tracking',
      'Email notifications',
      'Mobile app access',
      'Standard support'
    ],
  },
  professional: {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For established barbers maximizing earnings',
    features: [
      'Everything in Starter',
      'Instant payouts (30 minutes)',
      'Advanced analytics & insights',
      'Multi-location support',
      'Performance bonuses tracking',
      'Priority support'
    ],
    popular: true,
  },
  shop_owner: {
    name: 'Shop Owner',
    price: '$99',
    period: '/month',
    description: 'Complete solution for shop owners',
    features: [
      'Everything in Professional',
      'Unlimited barber accounts',
      'Shop revenue analytics',
      'Staff performance tracking',
      'Custom compensation plans',
      'Dedicated account manager'
    ],
  },
}

export default function SignupPage() {
  const [selectedPlan, setSelectedPlan] = useState('professional')
  const [step, setStep] = useState(1) // 1: Plan Selection, 2: Account Creation, 3: Payment
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    shopName: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    subscribeToNewsletter: true
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<any>({})

  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
  }

  const validateStep2 = () => {
    const newErrors: any = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.email.includes('@')) newErrors.email = 'Please enter a valid email'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms and conditions'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3)
      }
    }
  }

  const handleCreateAccount = async () => {
    setLoading(true)

    try {
      // Create account via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: 'barber',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create account')
      }

      // Account created successfully - now log them in
      const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: formData.email,
          password: formData.password,
        }),
      })

      if (!loginResponse.ok) {
        throw new Error('Account created but login failed. Please try logging in.')
      }

      const loginData = await loginResponse.json()
      try {
        // Safely store tokens with error handling
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', loginData.access_token)
          localStorage.setItem('user', JSON.stringify(loginData.user))
        }
      } catch (e) {
        console.warn('Unable to save to localStorage:', e)
        // Continue - app will still work
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      alert(error.message || 'Failed to create account. Please try again.')
      setLoading(false)
    }
  }

  const selectedPlanData = plans[selectedPlan as keyof typeof plans]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center text-gray-500 hover:text-gray-900">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-teal-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">6FB Payouts</span>
            </div>
            <Link href="/login" className="text-gray-500 hover:text-gray-900">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Start Your Free Trial
          </h1>
          <p className="text-xl text-gray-600">
            14 days free • No credit card required • Cancel anytime
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= num ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {num}
                </div>
                {num < 3 && (
                  <div className={`w-16 h-1 mx-4 ${step > num ? 'bg-teal-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4 space-x-16 text-sm text-gray-500">
            <span className={step >= 1 ? 'text-teal-600 font-medium' : ''}>Choose Plan</span>
            <span className={step >= 2 ? 'text-teal-600 font-medium' : ''}>Account Info</span>
            <span className={step >= 3 ? 'text-teal-600 font-medium' : ''}>Complete</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Plan/Form */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
                <div className="space-y-4">
                  {Object.entries(plans).map(([key, plan]) => (
                    <div
                      key={key}
                      className={`border rounded-lg p-6 cursor-pointer transition-all ${
                        selectedPlan === key ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-600' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPlan(key)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="plan"
                            value={key}
                            checked={selectedPlan === key}
                            onChange={() => setSelectedPlan(key)}
                            className="h-4 w-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                          />
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                              {plan.popular && (
                                <span className="ml-2 bg-teal-600 text-white text-xs px-2 py-1 rounded-full">
                                  Most Popular
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600">{plan.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{plan.price}</div>
                          <div className="text-gray-500">{plan.period}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your Account</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.firstName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="John"
                        autoComplete="given-name"
                      />
                      {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.lastName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Doe"
                        autoComplete="family-name"
                      />
                      {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="john@barbershop.com"
                      autoComplete="email"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="(555) 123-4567"
                        autoComplete="tel"
                      />
                      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shop Name (Optional)
                      </label>
                      <input
                        type="text"
                        name="shopName"
                        value={formData.shopName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="The Cut Above"
                        autoComplete="organization"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 mt-1"
                      />
                      <label className="ml-3 text-sm text-gray-600">
                        I agree to the <Link href="/terms" className="text-teal-600 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link> *
                      </label>
                    </div>
                    {errors.agreeToTerms && <p className="text-red-500 text-sm">{errors.agreeToTerms}</p>}

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        name="subscribeToNewsletter"
                        checked={formData.subscribeToNewsletter}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 mt-1"
                      />
                      <label className="ml-3 text-sm text-gray-600">
                        Subscribe to our newsletter for tips and updates
                      </label>
                    </div>
                  </div>

                  {/* Google OAuth Alternative */}
                  <div className="mt-8">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">or</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        GoogleOAuthService.redirectToGoogle()
                      }}
                      className="mt-6 w-full py-3 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <p className="mt-4 text-xs text-gray-500 text-center">
                      By continuing with Google, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-8 mb-8">
                  <CheckIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to 6FB Payouts!</h2>
                  <p className="text-gray-600 mb-6">
                    Your {selectedPlanData.name} plan is ready. You have 14 days to explore all features risk-free.
                  </p>

                  <div className="bg-white rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
                    <div className="space-y-3 text-left">
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-sm text-gray-600">Set up your compensation structure</span>
                      </div>
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-sm text-gray-600">Connect your bank account for payouts</span>
                      </div>
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-sm text-gray-600">Start tracking your earnings in real-time</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateAccount}
                    disabled={loading}
                    className="w-full bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
                  >
                    {loading ? 'Setting up your account...' : 'Complete Setup & Start Trial'}
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {step < 3 && (
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                >
                  {step === 1 ? 'Continue' : 'Create Account'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Plan Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6 h-fit">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h3>

            <div className="border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900">{selectedPlanData.name} Plan</span>
                <span className="text-2xl font-bold text-gray-900">{selectedPlanData.price}<span className="text-base font-normal text-gray-500">/month</span></span>
              </div>
              <p className="text-sm text-gray-600">{selectedPlanData.description}</p>
            </div>

            <div className="space-y-3 mb-6">
              {selectedPlanData.features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{feature}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900">Free Trial</span>
                <span className="text-green-600 font-medium">14 days</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-gray-900">Then</span>
                <span className="font-bold text-gray-900">{selectedPlanData.price}/month</span>
              </div>

              <div className="bg-teal-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-teal-600 mr-2" />
                  <span className="text-sm text-teal-800 font-medium">Risk-Free Trial</span>
                </div>
                <p className="text-xs text-teal-700 mt-1">
                  Cancel anytime during your trial with no charges
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center mb-2">
                <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="text-sm font-medium text-gray-900">Trusted by 1,200+ barbers</span>
              </div>
              <p className="text-xs text-gray-600">
                Join thousands of barbers who automated their payouts with 6FB
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
