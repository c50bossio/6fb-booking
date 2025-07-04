'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { verifyEmail, resendVerification } from '@/lib/api'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { LoadingButton, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { CheckCircle, XCircle, Mail, AlertCircle } from 'lucide-react'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [resendEmail, setResendEmail] = useState('')
  const [showResendForm, setShowResendForm] = useState(false)

  const [verifyState, verifyActions] = useAsyncOperation()
  const [resendState, resendActions] = useAsyncOperation()

  // Extract token from URL on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setVerificationStatus('invalid')
      setErrorMessage('Invalid or missing verification token. Please check your email for a valid verification link.')
    } else {
      setToken(tokenParam)
    }
  }, [searchParams])

  // Verify email when token is available
  useEffect(() => {
    if (token && verificationStatus === 'loading') {
      handleVerification()
    }
  }, [token])

  // Countdown timer for success redirect
  useEffect(() => {
    if (verificationStatus === 'success' && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (verificationStatus === 'success' && redirectCountdown === 0) {
      router.push('/login?verified=true')
    }
  }, [verificationStatus, redirectCountdown, router])

  const handleVerification = async () => {
    if (!token) return

    try {
      await verifyActions.execute(() => verifyEmail(token))
      setVerificationStatus('success')
    } catch (error: any) {
      console.error('Email verification failed:', error)
      setVerificationStatus('error')
      if (error.message.includes('Invalid or expired')) {
        setErrorMessage('This verification link has expired or is invalid. Please request a new verification email.')
        setShowResendForm(true)
      } else {
        setErrorMessage(error.message || 'Email verification failed. Please try again.')
      }
    }
  }

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail.trim()) return

    try {
      await resendActions.execute(() => resendVerification(resendEmail))
      setShowResendForm(false)
      setErrorMessage('')
      // Show success message
      setVerificationStatus('loading')
      setErrorMessage('')
      // You could show a "new email sent" message here
    } catch (error: any) {
      console.error('Resend verification failed:', error)
      setErrorMessage(error.message || 'Failed to send verification email. Please try again.')
    }
  }

  const renderContent = () => {
    switch (verificationStatus) {
      case 'loading':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Verifying Your Email
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait while we verify your email address...
              </p>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Email Verified Successfully!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Welcome to BookedBarber! Your email address has been verified and your account is now active.
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200 text-sm">
                  Redirecting to login page in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/login?verified=true')}
                variant="primary"
                size="lg"
                fullWidth
              >
                Continue to Login
              </Button>
              <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                Go to Dashboard
              </Link>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Verification Failed
              </h1>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-red-800 dark:text-red-200 text-sm">
                  {errorMessage}
                </p>
              </div>
            </div>
            {showResendForm ? (
              <form onSubmit={handleResendVerification} className="space-y-4">
                <div>
                  <label htmlFor="resend-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter your email address to receive a new verification link:
                  </label>
                  <input
                    id="resend-email"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <LoadingButton
                  type="submit"
                  loading={resendState.loading}
                  loadingText="Sending..."
                  variant="primary"
                  fullWidth
                >
                  Send New Verification Email
                </LoadingButton>
              </form>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowResendForm(true)}
                  variant="primary"
                  size="lg"
                  fullWidth
                >
                  Request New Verification Email
                </Button>
                <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        )

      case 'invalid':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Invalid Verification Link
              </h1>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  {errorMessage}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => setShowResendForm(true)}
                variant="primary"
                size="lg"
                fullWidth
              >
                Request New Verification Email
              </Button>
              <Link href="/register" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                Create New Account
              </Link>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <Logo variant="mono" size="lg" className="mx-auto" href="/" />
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            {renderContent()}
          </CardContent>
        </Card>

        {verificationStatus !== 'success' && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Need help?{' '}
              <a href="mailto:support@bookedbarber.com" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                Contact Support
              </a>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}