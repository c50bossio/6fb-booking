'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCustomerAuth } from '@/components/customer/CustomerAuthProvider'

export default function CustomerSignupPage() {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    subscribeToNewsletter: true
  })
  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const { customer } = useCustomerAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    if (customer) {
      router.push('/customer/dashboard')
    }
  }, [customer, router])

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

  const validateForm = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Create customer account via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/customer/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          newsletter_subscription: formData.subscribeToNewsletter
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create account')
      }

      // Account created successfully - now log them in
      const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/customer/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
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
          localStorage.setItem('customer_access_token', loginData.access_token)
          localStorage.setItem('customer', JSON.stringify(loginData.customer))
        }
      } catch (e) {
        console.warn('Unable to save to localStorage:', e)
        // Continue - app will still work
      }

      // Redirect to customer dashboard
      router.push('/customer/dashboard')
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to create account. Please try again.' })
      setLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-16 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-900/5 to-slate-900/10 pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-white font-bold text-xl">6</span>
              </div>
              <span className="text-2xl font-bold text-white">6FB Booking</span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-2">
              Create your account
            </h1>
            <p className="text-gray-400 text-lg">
              Join thousands of satisfied customers
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all backdrop-blur-sm ${
                    errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-800 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  placeholder="John"
                  autoComplete="given-name"
                />
                {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all backdrop-blur-sm ${
                    errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-800 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  placeholder="Doe"
                  autoComplete="family-name"
                />
                {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3.5 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all backdrop-blur-sm ${
                  errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-800 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-4 py-3.5 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all backdrop-blur-sm ${
                  errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-800 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
              {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all backdrop-blur-sm ${
                    errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-800 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}

                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-2">Password requirements:</div>
                    <div className="space-y-1 text-xs">
                      {[
                        { key: 'length', label: '8+ characters', check: formData.password.length >= 8 },
                        { key: 'uppercase', label: 'Uppercase letter', check: /[A-Z]/.test(formData.password) },
                        { key: 'lowercase', label: 'Lowercase letter', check: /[a-z]/.test(formData.password) },
                        { key: 'number', label: 'Number', check: /\d/.test(formData.password) },
                        { key: 'special', label: 'Special character', check: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) }
                      ].map(({ key, label, check }) => (
                        <div key={key} className={`flex items-center space-x-2 ${
                          check ? 'text-green-400' : 'text-gray-500'
                        }`}>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            check ? 'bg-green-900/50 border-green-400' : 'border-gray-600'
                          }`}>
                            {check && <span className="text-green-400 text-xs">✓</span>}
                          </span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all backdrop-blur-sm ${
                    errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-800 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 border-gray-600 bg-gray-800 rounded focus:ring-blue-500 focus:ring-offset-gray-900 mt-1"
                />
                <label className="ml-3 text-sm text-gray-300">
                  I agree to the <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">Terms of Service</Link> and <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">Privacy Policy</Link> *
                </label>
              </div>
              {errors.agreeToTerms && <p className="text-red-400 text-sm">{errors.agreeToTerms}</p>}

              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="subscribeToNewsletter"
                  checked={formData.subscribeToNewsletter}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 border-gray-600 bg-gray-800 rounded focus:ring-blue-500 focus:ring-offset-gray-900 mt-1"
                />
                <label className="ml-3 text-sm text-gray-300">
                  Send me booking confirmations and appointment reminders
                </label>
              </div>
            </div>

            {errors.general && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{errors.general}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href="/customer/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-gray-500 text-sm">
              Business owner?{' '}
              <Link href="/signup" className="text-gray-400 hover:text-gray-300 transition-colors">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-slate-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
        <div className="relative h-full flex items-center justify-center p-16">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-6">
              Join Our Community
            </h2>
            <p className="text-xl text-blue-100 mb-12 leading-relaxed">
              Experience hassle-free booking with your favorite barbers
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-lg font-semibold text-white mb-1">Instant Booking</div>
                <div className="text-blue-200 text-sm">Book your next appointment in seconds</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-2xl mb-2">📱</div>
                <div className="text-lg font-semibold text-white mb-1">Mobile Friendly</div>
                <div className="text-blue-200 text-sm">Manage everything from your phone</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-lg font-semibold text-white mb-1">Personalized Experience</div>
                <div className="text-blue-200 text-sm">Remember your preferences and history</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
