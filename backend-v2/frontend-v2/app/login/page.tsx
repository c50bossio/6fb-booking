'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, getProfile, resendVerification } from '@/lib/api'
import { getDefaultDashboard } from '@/lib/routeGuards'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { LoadingButton, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/Logo'
import { useFormValidation, validators } from '@/hooks/useFormValidation'
import { ValidatedInput, PasswordStrengthIndicator } from '@/components/forms/ValidatedInput'
import { Form, FormField, FormActions, FormError } from '@/components/forms/Form'
import { Mail, Lock } from 'lucide-react'
import { RateLimitIndicator, useRateLimit } from '@/components/auth/RateLimitIndicator'
import { EnhancedRememberMe } from '@/components/auth/RememberMe'
import { trustDevice, generateDeviceFingerprint } from '@/lib/device-fingerprint'
import { SocialLoginGroup } from '@/components/auth/SocialLoginButton'
import { useToast } from '@/hooks/use-toast'
import { getBusinessContextError, formatErrorForToast } from '@/lib/error-messages'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [rememberMe, setRememberMe] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [verificationError, setVerificationError] = useState(false)
  const [showResendButton, setShowResendButton] = useState(false)
  
  const [loginState, loginActions] = useAsyncOperation()
  const [resendState, resendActions] = useAsyncOperation()
  const rateLimit = useRateLimit('login-rate-limit')

  // Initialize form validation
  const {
    values,
    errors,
    isFormValid,
    isFormDirty,
    getFieldProps,
    validateForm,
    setIsSubmitting,
  } = useFormValidation({
    email: {
      value: '',
      rules: [
        validators.required('Email is required'),
        validators.email('Please enter a valid email address'),
      ],
    },
    password: {
      value: '',
      rules: [
        validators.required('Password is required'),
        validators.minLength(6, 'Password must be at least 6 characters'),
      ],
    },
  })

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Registration successful! Please check your email to verify your account before signing in.')
    } else if (searchParams.get('reset') === 'true') {
      setSuccessMessage('Password reset successful! Please sign in with your new password.')
    } else if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified successfully! You can now sign in to your account.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if rate limited
    if (rateLimit.isLocked) {
      return
    }

    // Validate form before submission
    const isValid = await validateForm()
    if (!isValid) {
      return
    }

    try {
      console.log('Starting login...')
      setIsSubmitting(true)
      const response = await loginActions.execute(() => login(values.email, values.password))
      console.log('Login response:', response)
      
      if (response.access_token) {
        console.log('Token received, fetching profile...')
        // Token is already stored in the login function
        
        // Handle device trust if remember me is checked
        if (rememberMe && response.user_id) {
          try {
            const deviceId = await generateDeviceFingerprint()
            await trustDevice(deviceId, response.user_id, 30) // Trust for 30 days
            console.log('✅ Device trusted successfully')
          } catch (error) {
            console.error('Failed to trust device:', error)
            // Continue with login even if device trust fails
          }
        }
        
        // Fetch user profile to determine role
        console.log('✅ Login successful, starting redirect process...')
        
        // Set up a timeout fallback to ensure redirect happens
        const redirectTimeout = setTimeout(() => {
          console.log('⏰ Timeout fallback - forcing redirect to dashboard')
          window.location.href = '/dashboard'
        }, 3000)
        
        try {
          console.log('📋 Fetching user profile...')
          const userProfile = await getProfile()
          console.log('✅ User profile fetched:', userProfile)
          
          // Clear timeout since we got profile successfully
          clearTimeout(redirectTimeout)
          
          // Always redirect to dashboard for now
          const dashboardUrl = '/dashboard'
          console.log('🎯 Redirecting to:', dashboardUrl)
          
          // Use both methods to ensure redirect works
          router.push(dashboardUrl)
          
          // Also set a backup using window.location after short delay
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              console.log('🔄 Router.push failed, using window.location fallback')
              window.location.href = dashboardUrl
            }
          }, 1000)
          
        } catch (profileError) {
          console.error('❌ Failed to fetch user profile:', profileError)
          
          // Clear timeout and redirect anyway
          clearTimeout(redirectTimeout)
          
          console.log('🎯 Redirecting to dashboard despite profile error...')
          window.location.href = '/dashboard'
        }
        
        // Reset rate limit on successful login
        rateLimit.resetAttempts()
      } else {
        console.log('No access token in response')
      }
    } catch (err: any) {
      // Increment rate limit attempts on failed login
      rateLimit.incrementAttempts()
      
      // Generate enhanced error message
      const enhancedError = getBusinessContextError('login', err, {
        userType: 'client', // Most common case
        feature: 'authentication'
      })
      
      // Handle specific error cases with enhanced messaging
      if (err.status === 403 || err.message?.includes('Email address not verified') || err.message?.includes('not verified')) {
        setVerificationError(true)
        setShowResendButton(true)
        
        // Show user-friendly verification error
        toast({
          title: 'Email Verification Required',
          description: 'Please check your email and click the verification link to activate your account.',
          variant: 'destructive'
        })
      } else {
        setVerificationError(false)
        setShowResendButton(false)
        
        // Show enhanced error message via toast (API layer already shows toast, but we can provide additional context)
        console.error('Enhanced login error:', enhancedError)
      }
      
      console.error('Login failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerification = async () => {
    if (!values.email) {
      return
    }

    try {
      await resendActions.execute(() => resendVerification(values.email))
      setSuccessMessage('Verification email sent! Please check your email and click the verification link.')
      setVerificationError(false)
      setShowResendButton(false)
    } catch (error: any) {
      // Generate enhanced error message for resend verification
      const enhancedError = getBusinessContextError('resend_verification', error, {
        userType: 'client',
        feature: 'email_verification'
      })
      
      // Show enhanced error message
      toast(formatErrorForToast(enhancedError))
      
      console.error('Resend verification failed:', error)
      console.error('Enhanced resend error:', enhancedError)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Premium Background with Glassmorphism Support */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800" />
      
      {/* Floating Accent Elements for Depth */}
      <div className="absolute top-1/4 -left-16 w-32 h-32 bg-gradient-to-r from-teal-400/20 to-blue-500/10 rounded-full blur-3xl animate-pulse hidden lg:block" />
      <div className="absolute bottom-1/4 -right-16 w-40 h-40 bg-gradient-to-r from-blue-500/10 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000 hidden lg:block" />
      
      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Enhanced Header with 2025 Typography */}
        <div className="text-center space-y-6">
          <div className="relative">
            <Logo variant="mono" size="lg" className="mx-auto drop-shadow-sm" href="/" />
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/5 to-transparent rounded-full blur-xl" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent leading-tight tracking-tight">
              Welcome Back
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Sign in to your <span className="text-teal-600 dark:text-teal-400 font-semibold">BookedBarber</span> account
            </p>
          </div>
        </div>

        {/* Enhanced Glassmorphism Card */}
        <div className="relative">
          {/* Simplified Card Background */}
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg shadow-black/5 dark:shadow-black/10" />
          
          <Card className="relative bg-transparent border-0 shadow-none rounded-3xl">
          <CardContent>
            <Form onSubmit={handleSubmit} isSubmitting={loginState.loading}>
              {successMessage && (
                <SuccessMessage message={successMessage} onDismiss={() => setSuccessMessage('')} />
              )}
              
              {loginState.error && (
                <FormError error={loginState.error} />
              )}

              {verificationError && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Email Verification Required
                      </h3>
                      <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                        Please verify your email address before signing in. Check your inbox for a verification email.
                      </p>
                      {showResendButton && (
                        <div className="mt-3">
                          <LoadingButton
                            onClick={handleResendVerification}
                            loading={resendState.loading}
                            loadingText="Sending..."
                            variant="secondary"
                            size="sm"
                          >
                            Resend Verification Email
                          </LoadingButton>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {resendState.error && (
                <FormError error={resendState.error} />
              )}

              {/* Rate Limiting Indicator */}
              {(rateLimit.attempts > 0 || rateLimit.isLocked) && (
                <RateLimitIndicator
                  attempts={rateLimit.attempts}
                  maxAttempts={rateLimit.maxAttempts}
                  lockedUntil={rateLimit.lockedUntil}
                  variant="embedded"
                  showWarning={true}
                />
              )}

              {/* Enhanced Premium Form Fields */}
              <div className="space-y-6">
                <FormField>
                  <div className="relative group">
                    <ValidatedInput
                      id="email"
                      type="email"
                      label="Email address"
                      placeholder="Enter your email"
                      leftIcon={<Mail className="h-4 w-4 text-teal-500 dark:text-teal-400 group-focus-within:text-teal-600 dark:group-focus-within:text-teal-300 transition-colors duration-200" />}
                      showPasswordToggle={false}
                      helperText="Use the email associated with your BookedBarber account"
                      className="rounded-2xl border-slate-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 dark:focus-within:border-teal-400 transition-all duration-300 shadow-sm hover:shadow-md group"
                      {...getFieldProps('email')}
                    />
                    {/* Premium Focus Ring */}
                    <div className="absolute inset-0 rounded-2xl ring-0 group-focus-within:ring-2 group-focus-within:ring-teal-500/20 transition-all duration-300 pointer-events-none" />
                  </div>
                </FormField>

                <FormField>
                  <div className="relative group">
                    <ValidatedInput
                      id="password"
                      type="password"
                      label="Password"
                      placeholder="Enter your password"
                      leftIcon={<Lock className="h-4 w-4 text-teal-500 dark:text-teal-400 group-focus-within:text-teal-600 dark:group-focus-within:text-teal-300 transition-colors duration-200" />}
                      showPasswordToggle
                      className="rounded-2xl border-slate-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 dark:focus-within:border-teal-400 transition-all duration-300 shadow-sm hover:shadow-md group"
                      {...getFieldProps('password')}
                    />
                    {/* Premium Focus Ring */}
                    <div className="absolute inset-0 rounded-2xl ring-0 group-focus-within:ring-2 group-focus-within:ring-teal-500/20 transition-all duration-300 pointer-events-none" />
                  </div>
                </FormField>
              </div>

              {/* Enhanced Remember Me & Forgot Password Section */}
              <div className="flex items-center justify-between pt-2">
                <EnhancedRememberMe
                  value={rememberMe}
                  onChange={setRememberMe}
                  className="flex-1 text-slate-600 dark:text-slate-300"
                />
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 ml-4 transition-colors duration-200 hover:underline decoration-teal-500/30 underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Enhanced Premium Submit Button */}
              <FormActions className="pt-6" align="center">
                <div className="relative group">
                  <Button
                    type="submit"
                    loading={loginState.loading}
                    loadingText="Signing in..."
                    fullWidth
                    size="lg"
                    disabled={!isFormValid || loginState.loading || rateLimit.isLocked}
                    className="relative rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-500 dark:to-teal-600 hover:from-teal-700 hover:to-teal-800 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white font-semibold py-4 px-6 shadow-md shadow-teal-500/20 dark:shadow-teal-400/15 transition-all duration-200 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    
                    <span className="relative z-10 flex items-center justify-center">
                      {rateLimit.isLocked ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Account Locked
                        </>
                      ) : loginState.loading ? (
                        <>
                          <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Signing in...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Sign in to your account
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </FormActions>

              {/* Enhanced Footer Links */}
              <div className="text-center space-y-4 pt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/80 dark:bg-gray-800/80 text-slate-500 dark:text-slate-400 backdrop-blur-sm rounded-full">
                      New to BookedBarber?
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Don't have an account?{' '}
                    <Link 
                      href="/register" 
                      className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors duration-200 hover:underline decoration-teal-500/30 underline-offset-4"
                    >
                      Create your account
                    </Link>
                  </p>
                  
                  <Link 
                    href="/" 
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200 group"
                  >
                    <svg className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to home
                  </Link>
                </div>
              </div>

              <SocialLoginGroup 
                onError={(error) => {
                  // Generate enhanced error message for social login
                  const enhancedError = getBusinessContextError('social_login', error, {
                    userType: 'client',
                    feature: 'social_authentication'
                  })
                  
                  // Show enhanced error message
                  toast(formatErrorForToast(enhancedError))
                }}
              />
            </Form>
          </CardContent>
        </Card>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-gray-600">Loading...</p></div>}>
      <LoginContent />
    </Suspense>
  )
}