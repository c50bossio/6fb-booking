'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import apiClient from '@/lib/api/client'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validToken, setValidToken] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token')
      setCheckingToken(false)
      return
    }

    // Validate token by making a request to verify it's valid
    const validateToken = async () => {
      try {
        // We'll validate the token when the user submits the form
        // For now, just check if token exists
        setValidToken(true)
        setCheckingToken(false)
      } catch (err) {
        setError('Invalid or expired reset token')
        setCheckingToken(false)
      }
    }

    validateToken()
  }, [token])

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number'
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)

    try {
      await apiClient.post('/auth/reset-password', {
        token: token,
        new_password: password
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.push('/login')
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Validating reset token...</p>
        </div>
      </div>
    )
  }

  if (!validToken) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h1>
            <p className="text-gray-400 mb-6">
              This password reset link is invalid or has expired. Please request a new password reset.
            </p>
            <button
              onClick={handleBackToLogin}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password Reset Successfully</h1>
            <p className="text-gray-400 mb-6">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <button
              onClick={handleBackToLogin}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <span className="text-white font-bold text-xl">6</span>
            </div>
            <span className="text-2xl font-bold text-white">6FB Platform</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Reset Your Password</h1>
          <p className="text-gray-400">
            Enter your new password below
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all backdrop-blur-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all backdrop-blur-sm"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Password Requirements */}
          <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
            <p className="text-sm font-medium text-gray-300 mb-2">Password Requirements:</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains at least one uppercase letter</li>
              <li>• Contains at least one lowercase letter</li>
              <li>• Contains at least one number</li>
              <li>• Contains at least one special character (@$!%*?&)</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-800 hover:shadow-lg hover:shadow-teal-500/25 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}