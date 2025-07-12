'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = () => {
    // Mock login - redirect to dashboard
    router.push('/dashboard/welcome')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BB</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to BookedBarber
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your barbershop dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Demo Login</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value="admin@bookedbarber.com"
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value="••••••••"
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
              />
            </div>

            <Button 
              onClick={handleLogin}
              className="w-full"
            >
              Sign In
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Demo mode - click "Sign In" to access dashboard
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-teal-600 hover:text-teal-500"
          >
            ← Back to homepage
          </button>
        </div>
      </div>
    </div>
  )
}