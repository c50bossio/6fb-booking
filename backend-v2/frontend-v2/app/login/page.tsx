'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, getProfile } from '@/lib/api'
import { getDefaultDashboard } from '@/lib/routeGuards'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { LoadingButton, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  const [loginState, loginActions] = useAsyncOperation()

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Registration successful! Please sign in.')
    } else if (searchParams.get('reset') === 'true') {
      setSuccessMessage('Password reset successful! Please sign in with your new password.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await loginActions.execute(() => login(email, password))
      if (response.access_token) {
        // Token is already stored in the login function
        // Fetch user profile to determine role
        try {
          const userProfile = await getProfile()
          const dashboardUrl = getDefaultDashboard(userProfile)
          router.push(dashboardUrl)
        } catch (profileError) {
          // If profile fetch fails, fallback to default dashboard
          console.error('Failed to fetch user profile:', profileError)
          router.push('/dashboard')
        }
      }
    } catch (err) {
      // Error is already handled by useAsyncOperation
      console.error('Login failed:', err)
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
            <form className="space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <SuccessMessage message={successMessage} onDismiss={() => setSuccessMessage('')} />
          )}
          
          {loginState.error && (
            <ErrorDisplay 
              error={loginState.error} 
              title="Login failed"
            />
          )}

          <div className="space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>

          <div>
            <Button
              type="submit"
              loading={loginState.loading}
              loadingText="Signing in..."
              variant="primary"
              fullWidth
              size="lg"
            >
              Sign in
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-primary-600 hover:text-primary-700">
                Create account
              </Link>
            </p>
            <Link href="/" className="text-sm text-primary-600 hover:text-primary-700">
              Back to home
            </Link>
          </div>
            </form>
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