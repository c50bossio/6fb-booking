'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { EnhancedRememberMe } from '@/components/auth/RememberMe'
import { SocialLoginGroup } from '@/components/auth/SocialLoginButton'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@bookedbarber.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Check for password reset success
    if (searchParams?.get('reset') === 'true') {
      setResetSuccess(true)
    }
  }, [searchParams])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError('Email is required')
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required')
      return false
    }
    if (password.length < 3) {
      setPasswordError('Password must be at least 3 characters')
      return false
    }
    setPasswordError('')
    return true
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (emailError) {
      validateEmail(value)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    if (passwordError) {
      validatePassword(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setError('')
    
    // Validate form
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)
    
    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        // Store tokens in both localStorage and cookies for compatibility (SSR safe)
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('token', data.access_token) // Legacy support
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token)
          }
        }
        
        // Also set cookies to match middleware expectations (SSR safe)
        if (typeof document !== 'undefined') {
          document.cookie = `access_token=${data.access_token}; path=/; max-age=${15 * 60}; samesite=lax`
          if (data.refresh_token) {
            document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
          }
        }
        
        // Redirect to dashboard (SSR safe)
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard'
        }
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Login failed')
      }
    } catch (err) {
      setError('Connection failed - make sure backend is running')
    } finally {
      setLoading(false)
    }
  }

  // Development bypass function (for development only)
  const handleDevelopmentBypass = () => {
    if (typeof window !== 'undefined') {
      // Set a temporary dev token in localStorage for development
      localStorage.setItem('dev_bypass', 'true')
      localStorage.setItem('access_token', 'dev-token-bypass')
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image 
              src="/images/logos/bookedbarber-main-logo.png" 
              alt="BookedBarber Logo" 
              width={128}
              height={128}
              className="mx-auto drop-shadow-lg"
              priority
            />
          </div>
        </div>

        {/* Password Reset Success Message */}
        {resetSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start">
            <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <div>
              <strong className="font-semibold">Password Reset Successful</strong>
              <div className="mt-1">You can now sign in with your new password.</div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block mb-2 text-slate-700 text-sm font-semibold">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`w-full px-4 py-3 bg-slate-50 text-slate-900 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                emailError 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500 hover:border-slate-300'
              }`}
              placeholder="your@email.com"
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p id="email-error" className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {emailError}
              </p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block mb-2 text-slate-700 text-sm font-semibold">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-3 pr-12 bg-slate-50 text-slate-900 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                  passwordError 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-slate-200 focus:ring-teal-500 focus:border-teal-500 hover:border-slate-300'
                }`}
                placeholder="Enter your password"
                aria-invalid={passwordError ? 'true' : 'false'}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-teal-600 transition-colors duration-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {passwordError && (
              <p id="password-error" className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {passwordError}
              </p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="mb-6">
            <EnhancedRememberMe 
              value={rememberMe} 
              onChange={setRememberMe}
            />
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
              <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <div>
                <strong className="font-semibold">Login Failed</strong>
                <div className="mt-1">{error}</div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-all duration-200 mb-6 shadow-lg transform ${
              loading 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 active:transform active:scale-95'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Signing In...
              </div>
            ) : (
              'Sign In to Your Account'
            )}
          </button>

          {/* Development Bypass Button (only for development) */}
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={handleDevelopmentBypass}
              className="w-full py-3 px-4 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium text-sm transition-colors duration-200 mb-4 border-2 border-dashed border-slate-300"
            >
              🚀 Dev Bypass - Go to Dashboard
            </button>
          )}
        </form>

        {/* Social Login Options */}
        <SocialLoginGroup 
          providers={['google', 'facebook', 'apple']}
          onError={(error) => setError(error.message)}
        />

        <div className="border-t border-slate-200 pt-6 mt-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-500">
              Need help accessing your account?
            </p>
            <div className="flex justify-center space-x-4">
              <Link 
                href="/forgot-password" 
                className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors duration-200"
              >
                Forgot Password
              </Link>
              <span className="text-slate-300">•</span>
              <Link 
                href="#" 
                className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors duration-200"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="inline-flex items-center text-slate-500 text-sm hover:text-slate-700 transition-colors duration-200 group"
          >
            <svg className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Homepage
          </a>
        </div>
      </div>
    </div>
  )
}