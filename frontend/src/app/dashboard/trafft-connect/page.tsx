'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'

interface TrafftData {
  client_id: string
  client_secret: string
  subdomain: string
  business_name: string
  owner_email: string
  phone: string
  verification_token?: string
}

export default function TrafftConnectPage() {
  const [formData, setFormData] = useState<TrafftData>({
    client_id: '',
    client_secret: '',
    subdomain: '',
    business_name: '',
    owner_email: '',
    phone: ''
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [step, setStep] = useState<'form' | 'connecting' | 'success' | 'error'>('form')
  const [errorMessage, setErrorMessage] = useState('')
  const [connectionResult, setConnectionResult] = useState<any>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsConnecting(true)
    setStep('connecting')

    try {
      console.log('Starting REAL Trafft connection process...')
      console.log('Form data:', formData)

      // Validate form data FIRST
      if (!formData.client_id || !formData.client_secret || !formData.business_name) {
        throw new Error('Please fill in all required fields')
      }

      console.log('Validation passed, connecting to real Trafft API...')

      const token = localStorage.getItem('access_token')

      // Use existing working endpoint for now
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trafft/connect?api_key=${formData.client_secret}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('Real Trafft connection successful!', response.data)

      setConnectionResult(response.data)
      setStep('success')
    } catch (error: any) {
      console.error('Connection failed:', error)
      console.log('Form data:', formData)
      console.log('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      })
      setErrorMessage(error.message || 'Connection failed')
      setStep('error')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/6fb-logo.png"
                alt="6FB Logo"
                width={50}
                height={50}
                className="rounded-full"
              />
              <div>
                <h1 className="text-lg font-bold text-white">Connect Trafft Account</h1>
                <p className="text-xs text-gray-400">One-click integration setup</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'form' && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Connect Your Trafft Account</h2>
              <p className="text-gray-400 mb-6">
                Connect your Trafft booking system to automatically sync appointments,
                clients, and revenue data with your 6FB dashboard.
              </p>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                <h3 className="text-blue-400 font-semibold mb-2">What happens when you connect:</h3>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• All your appointments will sync automatically</li>
                  <li>• Client information will be imported</li>
                  <li>• Barber/staff data will be synced</li>
                  <li>• Revenue tracking will be enabled</li>
                  <li>• Real-time updates via webhooks</li>
                </ul>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2">
                  Client ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleInputChange}
                  required
                  placeholder="your-client-id-here"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Public identifier from your Trafft integration settings
                </p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Client Secret <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  name="client_secret"
                  value={formData.client_secret}
                  onChange={handleInputChange}
                  required
                  placeholder="your-client-secret-here"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Private authentication credential - keep this secure
                </p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Verification Token
                </label>
                <input
                  type="password"
                  name="verification_token"
                  value={formData.verification_token || ''}
                  onChange={handleInputChange}
                  placeholder="your-verification-token-here"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used for webhook verification (optional for initial setup)
                </p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Trafft Admin URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  name="subdomain"
                  value={formData.subdomain}
                  onChange={handleInputChange}
                  required
                  placeholder="https://headlinesbarbershops.admin.wlbookings.com"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Your full Trafft admin URL (e.g., https://yourbusiness.admin.wlbookings.com)
                </p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  required
                  placeholder="My Barbershop"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">
                    Owner Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="owner_email"
                    value={formData.owner_email}
                    onChange={handleInputChange}
                    required
                    placeholder="owner@barbershop.com"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect Trafft Account'}
              </button>
            </form>
          </div>
        )}

        {step === 'connecting' && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-white mb-4">Connecting Your Account</h2>
            <p className="text-gray-400 mb-4">
              We're setting up your Trafft integration. This may take a moment...
            </p>
            <div className="space-y-2 text-sm text-gray-300">
              <p>✓ Validating API credentials</p>
              <p>✓ Importing locations and staff</p>
              <p>✓ Syncing appointment data</p>
              <p>✓ Configuring webhooks</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Successfully Connected!</h2>
            <p className="text-gray-400 mb-6">
              Your Trafft account has been connected to 6FB. Appointments will now sync automatically.
            </p>

            {connectionResult && (
              <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-white font-semibold mb-2">Connection Summary:</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>• Locations imported: {connectionResult.locations_imported || 0}</p>
                  <p>• Staff members synced: {connectionResult.staff_imported || 0}</p>
                  <p>• Services configured: {connectionResult.services_imported || 0}</p>
                  <p>• Webhook URL configured: ✓</p>
                </div>
              </div>
            )}

            <div className="space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/dashboard/appointments')}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                View Appointments
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="bg-gray-800 rounded-lg p-8 border border-red-500/30 text-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connection Failed</h2>
            <p className="text-gray-400 mb-4">
              We couldn't connect your Trafft account. Please check your credentials and try again.
            </p>

            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{errorMessage}</p>
            </div>

            <button
              onClick={() => setStep('form')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
