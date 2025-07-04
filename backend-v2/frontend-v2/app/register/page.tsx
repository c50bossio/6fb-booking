'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [consent, setConsent] = useState({
    terms: false,
    privacy: false,
    marketing: false,
    testData: false
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasDigit: false
  })

  // Validate password strength
  const validatePassword = (password: string) => {
    setPasswordStrength({
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasDigit: /\d/.test(password)
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (name === 'password') {
      validatePassword(value)
    }
  }

  const handleConsentChange = (type: keyof typeof consent) => {
    setConsent(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const isPasswordValid = () => {
    return passwordStrength.hasMinLength &&
           passwordStrength.hasUpperCase &&
           passwordStrength.hasLowerCase &&
           passwordStrength.hasDigit
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (!isPasswordValid()) {
      setError('Password does not meet requirements')
      return
    }

    // Validate required consent
    if (!consent.terms || !consent.privacy) {
      setError('You must agree to the Terms of Service and Privacy Policy to create an account')
      return
    }

    setLoading(true)

    try {
      await register(formData.email, formData.password, formData.name, consent.testData)
      // Redirect to check-email page instead of login
      router.push(`/check-email?email=${encodeURIComponent(formData.email)}`)
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-gray-600">
            Join us to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              
              {/* Password Requirements */}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600">Password must contain:</p>
                <div className="space-y-1">
                  <div className={`text-xs flex items-center ${passwordStrength.hasMinLength ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                    At least 8 characters
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{passwordStrength.hasUpperCase ? '✓' : '○'}</span>
                    One uppercase letter
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasLowerCase ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{passwordStrength.hasLowerCase ? '✓' : '○'}</span>
                    One lowercase letter
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasDigit ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{passwordStrength.hasDigit ? '✓' : '○'}</span>
                    One number
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Privacy & Consent</h3>
            
            {/* Required Consents */}
            <div className="space-y-3">
              <div className="flex items-start">
                <input
                  id="terms-consent"
                  type="checkbox"
                  checked={consent.terms}
                  onChange={() => handleConsentChange('terms')}
                  className="mt-0.5 h-4 w-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-primary-400"
                  required
                />
                <label htmlFor="terms-consent" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  I agree to the{' '}
                  <a 
                    href="/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-500 underline"
                  >
                    Terms of Service
                  </a>
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>

              <div className="flex items-start">
                <input
                  id="privacy-consent"
                  type="checkbox"
                  checked={consent.privacy}
                  onChange={() => handleConsentChange('privacy')}
                  className="mt-0.5 h-4 w-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-primary-400"
                  required
                />
                <label htmlFor="privacy-consent" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  I agree to the{' '}
                  <a 
                    href="/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-500 underline"
                  >
                    Privacy Policy
                  </a>
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>

              {/* Optional Marketing Consent */}
              <div className="flex items-start">
                <input
                  id="marketing-consent"
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={() => handleConsentChange('marketing')}
                  className="mt-0.5 h-4 w-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-primary-400"
                />
                <label htmlFor="marketing-consent" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  I would like to receive promotional emails and updates about new features (optional)
                </label>
              </div>

              {/* Test Data Option */}
              <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                <input
                  id="test-data-consent"
                  type="checkbox"
                  checked={consent.testData}
                  onChange={() => handleConsentChange('testData')}
                  className="mt-0.5 h-4 w-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-primary-400"
                />
                <label htmlFor="test-data-consent" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Create sample data to help me learn the platform</span>
                  <br />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Adds test barbers, clients, and appointments to explore features safely. 
                    All test data is clearly marked and can be deleted anytime.
                  </span>
                </label>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <span className="text-red-500">*</span> Required fields. You can review our{' '}
              <a href="/cookies" className="text-primary-600 hover:text-primary-500 underline">
                Cookie Policy
              </a>{' '}
              and change your cookie preferences after registration in your{' '}
              <a href="/settings/privacy" className="text-primary-600 hover:text-primary-500 underline">
                privacy settings
              </a>.
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !isPasswordValid() || formData.password !== formData.confirmPassword || !consent.terms || !consent.privacy}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
            <Link href="/" className="text-sm text-primary-600 hover:text-primary-500">
              Back to home
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}