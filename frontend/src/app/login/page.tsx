'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import apiClient from '@/lib/api/client'

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [forgotPasswordError, setForgotPasswordError] = useState('')

  const { login, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordError('')
    setForgotPasswordSuccess(false)

    if (!forgotPasswordEmail) {
      setForgotPasswordError('Please enter your email address')
      return
    }

    setForgotPasswordLoading(true)

    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email: forgotPasswordEmail
      })
      setForgotPasswordSuccess(true)
      setForgotPasswordEmail('')
    } catch (err: any) {
      setForgotPasswordError(err.response?.data?.detail || 'Failed to send password reset email')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const resetForgotPasswordModal = () => {
    setShowForgotPassword(false)
    setForgotPasswordEmail('')
    setForgotPasswordError('')
    setForgotPasswordSuccess(false)
    setForgotPasswordLoading(false)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-16 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-teal-900/5 to-slate-900/10 pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                <span className="text-white font-bold text-xl">6</span>
              </div>
              <span className="text-2xl font-bold text-white">6FB Platform</span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back
            </h1>
            <p className="text-gray-400 text-lg">
              Sign in to your account to continue
            </p>
          </div>

          {/* Demo Mode Notice */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-teal-600/20 to-teal-700/20 border border-teal-500/30">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-teal-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-teal-300 mb-1">Demo Mode Active</h3>
                <p className="text-xs text-gray-300">
                  Click "Sign in" with any credentials to explore the full application with all features enabled.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all backdrop-blur-sm"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all backdrop-blur-sm"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
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
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="text-center">
              <button 
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black text-gray-400">or</span>
              </div>
            </div>

            <button className="mt-6 w-full py-3 px-4 border border-gray-800 rounded-xl text-gray-300 hover:bg-gray-900/50 transition-all duration-200 flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Sign in with Email Link</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-400">
              New to 6FB Platform?{' '}
              <a href="/signup" className="text-teal-400 hover:text-teal-300 transition-colors">
                Create Your Account
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-teal-600 via-teal-700 to-slate-900">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-slate-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
        <div className="relative h-full flex items-center justify-center p-16">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-6">
              Elevate Your Barbershop
            </h2>
            <p className="text-xl text-teal-100 mb-12 leading-relaxed">
              Join thousands of barbers building six-figure businesses with our all-in-one platform
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">2.5K+</div>
                <div className="text-teal-200">Active Barbers</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">98%</div>
                <div className="text-teal-200">Satisfaction</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">$5M+</div>
                <div className="text-teal-200">Revenue Tracked</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">50K+</div>
                <div className="text-teal-200">Appointments</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Reset Password</h2>
              <button
                onClick={resetForgotPasswordModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!forgotPasswordSuccess ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <p className="text-gray-300 mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                {forgotPasswordError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{forgotPasswordError}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={resetForgotPasswordModal}
                    className="flex-1 py-3 px-4 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800/50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Check Your Email</h3>
                <p className="text-gray-300 mb-6">
                  We've sent password reset instructions to your email address. Please check your inbox and follow the link to reset your password.
                </p>
                <button
                  onClick={resetForgotPasswordModal}
                  className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
