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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <Logo variant="mono" size="lg" className="mx-auto" href="#" />
          <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-accent-600 dark:text-gray-300">
            Sign in to manage your barbershop
          </p>
        </div>

        <Card className="mt-8">
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

              <FormField>
                <ValidatedInput
                  id="email"
                  type="email"
                  label="Email address"
                  placeholder="Enter your email"
                  leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                  showPasswordToggle={false}
                  helperText="Use the email associated with your BookedBarber account"
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
                  {...getFieldProps('password')}
                />
              </FormField>

              <div className="flex items-center justify-between">
                <EnhancedRememberMe
                  value={rememberMe}
                  onChange={setRememberMe}
                  className="flex-1"
                />
                <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 ml-4">
                  Forgot password?
                </Link>
              </div>

              <FormActions>
                <Button
                  type="submit"
                  loading={loginState.loading}
                  loadingText="Signing in..."
                  variant="primary"
                  fullWidth
                  size="lg"
                  disabled={!isFormValid || loginState.loading || rateLimit.isLocked}
                >
                  {rateLimit.isLocked ? 'Account Locked' : 'Sign in'}
                </Button>
              </FormActions>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Don't have an account?{' '}
                  <Link href="/register" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                    Create account
                  </Link>
                </p>
                <Link href="/" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                  Back to home
                </Link>
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