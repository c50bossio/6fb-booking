'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, getProfile } from '@/lib/api'
import { getDefaultDashboard } from '@/lib/routeGuards'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { LoadingButton, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { useFormValidation, validators } from '@/hooks/useFormValidation'
import { ValidatedInput, PasswordStrengthIndicator } from '@/components/forms/ValidatedInput'
import { Form, FormField, FormActions, FormError } from '@/components/forms/Form'
import { Mail, Lock } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rememberMe, setRememberMe] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  const [loginState, loginActions] = useAsyncOperation()

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
      setSuccessMessage('Registration successful! Please sign in.')
    } else if (searchParams.get('reset') === 'true') {
      setSuccessMessage('Password reset successful! Please sign in with your new password.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
      } else {
        console.log('No access token in response')
      }
    } catch (err) {
      // Error is already handled by useAsyncOperation
      console.error('Login failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <Logo variant="mono" size="lg" className="mx-auto" href="#" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
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
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
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
                  disabled={!isFormValid || loginState.loading}
                >
                  Sign in
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