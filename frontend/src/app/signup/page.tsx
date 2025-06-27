'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  StarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { authService } from '../../lib/api/auth'

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

// Version: 2.0 - Fixed field names
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
  const [isProcessing, setIsProcessing] = useState(false)

  const router = useRouter()

  // Password validation utility
  const validatePasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    const isValid = Object.values(checks).every(Boolean)

    return { isValid, checks }
  }

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

    // Real-time password validation
    if (name === 'password' && value) { // pragma: allowlist secret
      const { isValid } = validatePasswordStrength(value)
      if (!isValid) {
        setErrors((prev: any) => ({
          ...prev,
          [name]: 'Password does not meet all requirements'
        }))
      }
    }

    // Real-time confirm password validation
    if (name === 'confirmPassword' && value && formData.password) {
      if (value !== formData.password) {
        setErrors((prev: any) => ({
          ...prev,
          confirmPassword: 'Passwords do not match' // pragma: allowlist secret
        }))
      }
    }
  }

  const validateStep2 = () => {
    const newErrors: any = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.email.includes('@')) newErrors.email = 'Please enter a valid email'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'

    // Enhanced password validation
    if (!formData.password) { // pragma: allowlist secret
      newErrors.password = 'Password is required' // pragma: allowlist secret
    } else {
      const { isValid, checks } = validatePasswordStrength(formData.password)
      if (!isValid) {
        const missingRequirements = []
        if (!checks.length) missingRequirements.push('at least 8 characters')
        if (!checks.uppercase) missingRequirements.push('an uppercase letter')
        if (!checks.lowercase) missingRequirements.push('a lowercase letter')
        if (!checks.number) missingRequirements.push('a number')
        if (!checks.special) missingRequirements.push('a special character')

        newErrors.password = `Password must contain ${missingRequirements.join(', ')}`
      }
    }

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match' // pragma: allowlist secret
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms and conditions'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    console.log('handleContinue called, current step:', step)
    console.log('Current form data:', formData)

    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (validateStep2()) {
        console.log('Validation passed, moving to step 3')
        setStep(3)
      } else {
        console.log('Validation failed, errors:', errors)
      }
    }
  }

  const handleCreateAccount = async (e?: React.MouseEvent) => {
    // Prevent default and stop propagation
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Prevent multiple submissions
    if (loading || isProcessing) {
      console.log('Registration already in progress, ignoring duplicate click')
      return
    }

    setLoading(true)
    setIsProcessing(true)
    setErrors({}) // Clear any previous errors

    try {

      console.log('Attempting to register user with data:', {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        hasPassword: !!formData.password,
        passwordLength: formData.password?.length
      })

      // Debug auth service call
      console.log('Calling authService.register with:', {
        email: formData.email,
        password: '[HIDDEN]',
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: 'barber'
      })

      // Validate required fields before API call
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
        throw new Error('Missing required fields. Please fill in all fields.')
      }

      // Create account via authService
      const userData = await authService.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: 'barber',
      })

      console.log('Registration successful:', { userId: userData.id, email: userData.email })

      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500))

      // Account created successfully - now log them in
      console.log('Attempting automatic login after registration...')

      const loginData = await authService.login({
        username: formData.email,
        password: formData.password,
      })

      console.log('Login successful after registration')

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Signup error:', error)
      console.error('Error details:', {
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })

      // Check for specific error types
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.response?.data?.error || error.message

        if (errorMessage && (errorMessage.includes('Email already registered') || errorMessage.includes('already registered'))) {
          setErrors({ email: 'This email is already registered. Please login instead.' })
          setLoading(false)
          return
        }
      }

      // Check if this is an "auto-login failed" error (account was created)
      const isAutoLoginFailure = error.message && error.message.includes('Account created successfully but automatic login failed')

      if (isAutoLoginFailure) {
        // Account was created, just auto-login failed - show success with manual login option
        setErrors(prev => ({
          ...prev,
          general: `🎉 Account created successfully! The automatic login failed, but you can now sign in manually.`,
          showManualLogin: true,
          accountEmail: formData.email
        }))
      } else {
        // Show the enhanced error message from the API client
        const errorMessage = error.userMessage || error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to create account. Please try again.'
        setErrors(prev => ({
          ...prev,
          general: errorMessage
        }))
      }
    } finally {
      // Always reset loading state
      setLoading(false)
      setIsProcessing(false)
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
              <span className="ml-2 text-2xl font-bold text-gray-900">Booked Barber</span>
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
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                        className={`w-full px-3 py-2 border rounded-md text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                        className={`w-full px-3 py-2 border rounded-md text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                      className={`w-full px-3 py-2 border rounded-md text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                        className={`w-full px-3 py-2 border rounded-md text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                        className={`w-full px-3 py-2 border rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}

                      {/* Password strength indicator */}
                      {formData.password && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-600 mb-2">Password requirements:</div>
                          <div className="space-y-1 text-xs">
                            {[
                              { key: 'length', label: '8+ characters', check: formData.password.length >= 8 },
                              { key: 'uppercase', label: 'Uppercase letter', check: /[A-Z]/.test(formData.password) },
                              { key: 'lowercase', label: 'Lowercase letter', check: /[a-z]/.test(formData.password) },
                              { key: 'number', label: 'Number', check: /\d/.test(formData.password) },
                              { key: 'special', label: 'Special character', check: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) }
                            ].map(({ key, label, check }) => (
                              <div key={key} className={`flex items-center space-x-2 ${
                                check ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  check ? 'bg-green-100 border-green-500' : 'border-gray-300'
                                }`}>
                                  {check && <span className="text-green-600 text-xs">✓</span>}
                                </span>
                                <span>{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                        className={`w-full px-3 py-2 border rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                </form>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mb-4">
                    Debug: Email={formData.email}, Name={formData.firstName} {formData.lastName}
                  </div>
                )}

                {/* Display general error message if any */}
                {errors.general && !loading && !isProcessing && (
                  <div className={`border rounded-lg p-4 mb-6 ${
                    errors.showManualLogin
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={errors.showManualLogin ? 'text-yellow-800' : 'text-red-800'}>
                      {errors.general}
                    </p>
                    {errors.showManualLogin && (
                      <div className="mt-4">
                        <p className="text-yellow-700 text-sm mb-3">
                          Your email: <strong>{errors.accountEmail}</strong>
                        </p>
                        <div className="flex gap-3">
                          <a
                            href="/login"
                            className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700 transition-colors"
                          >
                            Go to Login Page
                          </a>
                          <button
                            onClick={() => {
                              setErrors({})
                              setStep(1)
                              setFormData({
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
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-600 transition-colors"
                          >
                            Start Over
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-8 mb-8">
                  <CheckIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Booked Barber!</h2>
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
                    type="button"
                    onClick={(e) => handleCreateAccount(e)}
                    disabled={loading || isProcessing}
                    className="w-full bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
                  >
                    {loading || isProcessing ? 'Setting up your account...' : 'Complete Setup & Start Trial'}
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
