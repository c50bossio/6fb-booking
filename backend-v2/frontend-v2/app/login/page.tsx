'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LogoFull } from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, isAuthenticated, error, clearError } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard/welcome')
    }
  }, [isAuthenticated, router])

  // Clear errors when form changes
  useEffect(() => {
    if (error) {
      clearError()
    }
    if (formError) {
      setFormError('')
    }
  }, [formData.email, formData.password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setFormError('Please fill in all fields')
      return
    }

    if (!formData.email.includes('@')) {
      setFormError('Please enter a valid email address')
      return
    }

    try {
      await login(formData.email, formData.password)
    } catch (err) {
      // Error is handled by the auth hook
    }
  }

  const handleDemoLogin = async () => {
    setFormData({
      email: 'admin@bookedbarber.com',
      password: 'password123'
    })
    
    try {
      await login('admin@bookedbarber.com', 'password123')
    } catch (err) {
      // Error is handled by the auth hook
    }
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <LogoFull variant="auto" size="md" href="/" className="justify-center mb-6" />
          <h2 className="text-3xl font-extrabold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your barbershop
          </p>
        </div>

        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Demo Login Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Account</h3>
              <p className="text-xs text-blue-700 mb-3">
                Try the platform with our demo account
              </p>
              <Button 
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                {isLoading ? 'Signing in...' : 'Demo Login'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign in with your account</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || formError) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{error || formError}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/register" className="font-medium text-teal-600 hover:text-teal-500">
                  Create account
                </Link>
              </p>
              <Link href="/" className="text-sm text-teal-600 hover:text-teal-500">
                ← Back to homepage
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Accounts Info */}
        <div className="bg-gray-100 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Demo Accounts</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Shop Owner:</strong> admin@bookedbarber.com / password123</div>
            <div><strong>Barber:</strong> barber@bookedbarber.com / demo123</div>
            <div><strong>Quick Demo:</strong> demo@example.com / demo</div>
          </div>
        </div>
      </div>
    </div>
  )
}