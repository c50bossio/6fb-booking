'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resendVerification } from '@/lib/api'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { LoadingButton, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/Logo'
import { Mail, CheckCircle, Clock, ArrowRight } from 'lucide-react'

function CheckEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [timeLeft, setTimeLeft] = useState(60) // 60 seconds cooldown
  const [canResend, setCanResend] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const [resendState, resendActions] = useAsyncOperation()

  // Extract email from URL on mount
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [timeLeft])

  const handleResendVerification = async () => {
    if (!email || !canResend) return

    try {
      await resendActions.execute(() => resendVerification(email))
      setResendSuccess(true)
      setCanResend(false)
      setTimeLeft(60) // Reset cooldown
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false)
      }, 5000)
    } catch (error: any) {
      // Error will be shown by the useAsyncOperation
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <Logo variant="mono" size="lg" className="mx-auto" href="/" />
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <Mail className="h-16 w-16 text-primary-600" />
                  <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Check Your Email
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  We've sent a verification link to:
                </p>
                {email && (
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {email}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  What's next?
                </h3>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 text-left">
                  <li className="flex items-center space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <span>Check your email inbox (and spam folder)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <span>Click the verification link in the email</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <span>Return here to sign in to your account</span>
                  </li>
                </ol>
              </div>

              {resendSuccess && (
                <SuccessMessage 
                  message="Verification email sent successfully! Please check your inbox." 
                  onDismiss={() => setResendSuccess(false)}
                />
              )}

              {resendState.error && (
                <ErrorDisplay error={resendState.error} />
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/login')}
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="flex items-center justify-center space-x-2"
                >
                  <span>Continue to Login</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="text-center">
                  {canResend ? (
                    <LoadingButton
                      onClick={handleResendVerification}
                      loading={resendState.loading}
                      loadingText="Sending..."
                      variant="secondary"
                      disabled={!email}
                    >
                      Resend Verification Email
                    </LoadingButton>
                  ) : (
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>Resend available in {formatTime(timeLeft)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Didn't receive the email? Check your spam folder or{' '}
                  <Link href="/register" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                    try a different email address
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help?{' '}
            <a href="mailto:support@bookedbarber.com" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  )
}