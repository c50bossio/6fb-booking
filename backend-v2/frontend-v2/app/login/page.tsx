'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/Logo'
import { Mail, Lock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // Simple form state - no authentication hooks
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Login failed')
      }

      // Success - navigate to dashboard
      router.push('/dashboard')
      
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
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
            {/* Subtle glow effect - positioned behind logo with pointer-events-none */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/5 to-transparent rounded-full blur-xl pointer-events-none -z-10" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent leading-tight tracking-tight">
              Welcome Back
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Sign in to your <span className="text-slate-900 dark:text-white font-semibold">BookedBarber</span> account
            </p>
          </div>
        </div>

        {/* Enhanced Glassmorphism Card */}
        <div className="relative">
          {/* Simplified Card Background */}
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg shadow-black/5 dark:shadow-black/10" />
          
          <Card className="relative bg-transparent border-0 shadow-none rounded-3xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {successMessage && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-gray-700 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:focus:border-teal-400 transition-all duration-300 shadow-sm hover:shadow-md"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-gray-700 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:focus:border-teal-400 transition-all duration-300 shadow-sm hover:shadow-md"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <Link 
                    href="/forgot-password" 
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors duration-200 hover:underline decoration-teal-500/30 underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!email || !password || isLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-500 dark:to-teal-600 hover:from-teal-700 hover:to-teal-800 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white font-semibold py-4 px-6 shadow-md shadow-teal-500/20 dark:shadow-teal-400/15 transition-all duration-200 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
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
                </Button>

                {/* Registration Link */}
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
              </form>
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