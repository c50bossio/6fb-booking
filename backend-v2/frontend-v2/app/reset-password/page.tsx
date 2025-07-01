'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/api'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasDigit: false
  })

  // Extract token from URL on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError('Invalid or missing reset token. Please request a new password reset.')
    } else {
      setToken(tokenParam)
    }
  }, [searchParams])

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

  const isPasswordValid = () => {
    return passwordStrength.hasMinLength &&
           passwordStrength.hasUpperCase &&
           passwordStrength.hasLowerCase &&
           passwordStrength.hasDigit
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate token exists
    if (!token) {
      setError('Invalid reset token. Please request a new password reset.')
      return
    }

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

    setLoading(true)

    try {
      await resetPassword(token, formData.password)
      // Redirect to login with success message
      router.push('/login?reset=true')
    } catch (err: any) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (detail.includes('expired') || detail.includes('invalid')) {
          setError('This reset link has expired or is invalid. Please request a new password reset.')
        } else {
          setError(detail)
        }
      } else {
        setError('Failed to reset password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Show error state if no token
  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Invalid Reset Link</h2>
            <p className="mt-2 text-gray-600">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-600 text-center">
              {error}
            </p>
          </div>

          <div className="text-center space-y-2">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
              Request new password reset
            </Link>
            <br />
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-gray-600">
            Enter your new password below
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
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
                Confirm New Password
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

          <div>
            <button
              type="submit"
              disabled={loading || !isPasswordValid() || formData.password !== formData.confirmPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}