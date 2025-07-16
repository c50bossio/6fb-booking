'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, getProfile, resendVerification } from '@/lib/api'
import { getDefaultDashboard } from '@/lib/routeGuards'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { LoadingButton, ErrorDisplay, SuccessMessage } from '@/components/ui/LoadingSystem'
import { Button } from '@/components/ui/Button'
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
      setIsSubmitting(true)
      const response = await loginActions.execute(() => login(values.email, values.password))
      
      if (response.access_token) {
        // Token is already stored in the login function
        
        // Handle device trust if remember me is checked
        if (rememberMe && response.user?.id) {
          try {
            const deviceFingerprint = generateDeviceFingerprint()
            trustDevice(deviceFingerprint) // Trust for 30 days
          } catch (error) {
            // Continue with login even if device trust fails
          }
        }
        
        // Set up a timeout fallback to ensure redirect happens
        const redirectTimeout = setTimeout(() => {
          window.location.href = '/dashboard'
        }, 3000)
        
        try {
          const userProfile = await getProfile()
          
          // Clear timeout since we got profile successfully
          clearTimeout(redirectTimeout)
          
          // Always redirect to dashboard for now
          const dashboardUrl = '/dashboard'
          
          // Use both methods to ensure redirect works
          router.push(dashboardUrl)
          
          // Also set a backup using window.location after short delay
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              window.location.href = dashboardUrl
            }
          }, 1000)
          
        } catch (profileError) {
          // Clear timeout and redirect anyway
          clearTimeout(redirectTimeout)
          
          window.location.href = '/dashboard'
        }
        
        // Reset rate limit on successful login
        rateLimit.resetAttempts()
      }
    } catch (err: any) {
      // Increment rate limit attempts on failed login
      rateLimit.incrementAttempts()
      
      // Check if this is a verification error (403 status)
      if (err.message && err.message.includes('Email address not verified')) {
        setVerificationError(true)
        setShowResendButton(true)
      } else {
        setVerificationError(false)
        setShowResendButton(false)
      }
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
      // Error will be shown by the useAsyncOperation
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="animate-in fade-in duration-600 ease-out">
            <Logo variant="mono" size="lg" className="mx-auto" href="/" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white animate-in slide-in-from-bottom-4 duration-500 ease-out delay-200">Welcome Back</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 animate-in slide-in-from-bottom-2 duration-400 ease-out delay-300">
            Sign in to manage your barbershop
          </p>
        </div>

        <Card className="mt-6 sm:mt-8 animate-in slide-in-from-bottom-6 duration-600 ease-out delay-400">
          <CardContent className="p-4 sm:p-6">
            <Form onSubmit={handleSubmit} isSubmitting={loginState.loading}>
              {successMessage && (
                <div className="animate-in slide-in-from-top-4 duration-500 ease-out">
                  <SuccessMessage message={successMessage} onDismiss={() => setSuccessMessage('')} />
                </div>
              )}
              
              {loginState.error && (
                <div className="animate-in slide-in-from-top-4 duration-300 ease-out">
                  <FormError error={loginState.error} />
                </div>
              )}

              {verificationError && (
                <div className="animate-in slide-in-from-top-4 duration-400 ease-out">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-200 animate-in fade-in duration-300 delay-100">
                          Email Verification Required
                        </h3>
                        <p className="mt-1 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 animate-in fade-in duration-300 delay-200">
                          Please verify your email address before signing in. Check your inbox for a verification email.
                        </p>
                        {showResendButton && (
                          <div className="mt-3 animate-in slide-in-from-bottom-2 duration-300 delay-300">
                            <LoadingButton
                              onClick={handleResendVerification}
                              loading={resendState.loading}
                              loadingText="Sending..."
                              variant="secondary"
                              size="sm"
                              className="min-h-[40px] text-xs sm:text-sm"
                            >
                              Resend Verification Email
                            </LoadingButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {resendState.error && (
                <div className="animate-in slide-in-from-top-4 duration-300 ease-out">
                  <FormError error={resendState.error} />
                </div>
              )}

              {/* Rate Limiting Indicator */}
              {(rateLimit.attempts > 0 || rateLimit.isLocked) && (
                <div className="animate-in slide-in-from-top-4 duration-400 ease-out">
                  <RateLimitIndicator
                    attempts={rateLimit.attempts}
                    maxAttempts={rateLimit.maxAttempts}
                    lockedUntil={rateLimit.lockedUntil}
                    variant="embedded"
                    showWarning={true}
                  />
                </div>
              )}

              <FormField>
                <ValidatedInput
                  id="email"
                  type="email"
                  label="Email address"
                  placeholder="Enter your email"
                  leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                  showPasswordToggle={false}
                  helperText="Use the email associated with your BookedBarber account"
                  className="min-h-[48px] text-base"
                  {...getFieldProps('email')}
                />
              </FormField>

              <FormField>
                <ValidatedInput
                  id="password"
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  leftIcon={<Lock className="h-4 w-4 text-gray-400" />}
                  showPasswordToggle
                  className="min-h-[48px] text-base"
                  {...getFieldProps('password')}
                />
              </FormField>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 animate-in slide-in-from-bottom-2 duration-400 ease-out delay-100">
                <EnhancedRememberMe
                  value={rememberMe}
                  onChange={setRememberMe}
                  className="flex-1"
                />
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 sm:ml-4 transition-all duration-200 hover:underline min-h-[44px] flex items-center justify-center sm:justify-start"
                  aria-label="Reset your password"
                >
                  Forgot password?
                </Link>
              </div>

              <FormActions align="center">
                <div className="animate-in slide-in-from-bottom-4 duration-400 ease-out">
                  <Button
                    type="submit"
                    loading={loginState.loading}
                    loadingText="Signing in..."
                    variant="primary"
                    fullWidth
                    size="lg"
                    disabled={!isFormValid || loginState.loading || rateLimit.isLocked}
                    className="transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 min-h-[48px] text-base font-medium"
                  >
                    {rateLimit.isLocked ? 'Account Locked' : 'Sign in'}
                  </Button>
                </div>
              </FormActions>

              <div className="text-center space-y-3 sm:space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300 animate-in fade-in duration-400 delay-300">
                  Don't have an account?{' '}
                  <Link 
                  href="/register" 
                  className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-all duration-200 hover:underline min-h-[44px] inline-flex items-center"
                  aria-label="Sign up for a new BookedBarber account"
                >
                    Create account
                  </Link>
                </p>
                <Link 
                  href="/" 
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-all duration-200 hover:underline animate-in fade-in duration-400 delay-400 min-h-[44px] inline-flex items-center"
                  aria-label="Return to BookedBarber homepage"
                >
                  Back to home
                </Link>
              </div>

              <div className="animate-in slide-in-from-bottom-4 duration-500 ease-out delay-200">
                <SocialLoginGroup 
                  onError={(error) => {
                    toast({
                      variant: 'destructive',
                      title: 'Social login error',
                      description: error.message
                    })
                  }}
                />
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

const LoginPageClient = dynamic(() => Promise.resolve(LoginContent), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading login form">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="animate-pulse">
            <div className="h-12 w-32 bg-gray-200 rounded mx-auto"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-700">Sign in to manage your barbershop</p>
        </div>
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="space-y-4" aria-label="Loading form fields">
            <div className="h-12 bg-gray-100 rounded animate-pulse" aria-label="Email field loading"></div>
            <div className="h-12 bg-gray-100 rounded animate-pulse" aria-label="Password field loading"></div>
            <div className="h-12 bg-blue-100 rounded animate-pulse" aria-label="Sign in button loading"></div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default function LoginPage() {
  return <LoginPageClient />
}