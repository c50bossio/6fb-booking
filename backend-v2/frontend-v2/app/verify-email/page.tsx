'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { verifyEmail } from '@/lib/api'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { LoadingButton, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/Logo'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState<string>('')
  
  const [verifyState, verifyActions] = useAsyncOperation()

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        setVerificationStatus('error')
        setErrorMessage('No verification token provided')
        return
      }

      try {
        await verifyActions.execute(() => verifyEmail(token))
        setVerificationStatus('success')
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 3000)
      } catch (error: any) {
        setVerificationStatus('error')
        setErrorMessage(error.message || 'Verification failed')
      }
    }

    verifyToken()
  }, [searchParams])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <Logo variant="mono" size="lg" className="mx-auto" href="/" />
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              {verificationStatus === 'verifying' && (
                <>
                  <div className="flex justify-center">
                    <Loader2 className="h-16 w-16 text-primary-600 animate-spin" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Verifying Your Email
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                      Please wait while we verify your email address...
                    </p>
                  </div>
                </>
              )}

              {verificationStatus === 'success' && (
                <>
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="bg-green-100 dark:bg-green-900 rounded-full p-3">
                        <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Email Verified!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                      Your email has been successfully verified.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Redirecting to login page...
                    </p>
                  </div>
                  <div className="pt-4">
                    <Button
                      onClick={() => router.push('/login')}
                      variant="primary"
                      size="lg"
                      fullWidth
                    >
                      Go to Login
                    </Button>
                  </div>
                </>
              )}

              {verificationStatus === 'error' && (
                <>
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="bg-red-100 dark:bg-red-900 rounded-full p-3">
                        <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Verification Failed
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                      {errorMessage || 'We couldn\'t verify your email address.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      The verification link may have expired or is invalid.
                    </p>
                    
                    <div className="space-y-2">
                      <Button
                        onClick={() => router.push('/register')}
                        variant="primary"
                        size="lg"
                        fullWidth
                      >
                        Create New Account
                      </Button>
                      
                      <Button
                        onClick={() => router.push('/login')}
                        variant="secondary"
                        size="lg"
                        fullWidth
                      >
                        Go to Login
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Need help?{' '}
                  <a href="mailto:support@bookedbarber.com" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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