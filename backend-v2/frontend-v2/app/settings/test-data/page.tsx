'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { fetchAPI } from '@/lib/api'

// Icons
const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const InfoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

interface TestDataStatus {
  has_test_data: boolean
  counts?: {
    barbers: number
    clients: number
    appointments: number
    services: number
    payments: number
  }
  created_at?: string
}

interface ServiceConfig {
  name: string
  duration_minutes: number
  base_price: number
  description?: string
  category: string
}

interface TestDataCustomization {
  client_count: number
  appointment_count: number
  payment_count: number
  start_date_days_ago: number
  end_date_days_ahead: number
  services?: ServiceConfig[]
  include_enterprise: boolean
  location_count: number
  vip_client_percentage: number
  new_client_percentage: number
}

export default function TestDataPage() {
  const router = useRouter()
  const [status, setStatus] = useState<TestDataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCustomization, setShowCustomization] = useState(false)
  const [customization, setCustomization] = useState<TestDataCustomization>({
    client_count: 20,
    appointment_count: 50,
    payment_count: 30,
    start_date_days_ago: 90,
    end_date_days_ahead: 30,
    include_enterprise: false,
    location_count: 3,
    vip_client_percentage: 20,
    new_client_percentage: 25
  })

  useEffect(() => {
    fetchTestDataStatus()
  }, [])

  const fetchTestDataStatus = async () => {
    try {
      const data = await fetchAPI('/api/v2/test-data/status')
      setStatus(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load test data status',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTestData = async (useCustomization = false) => {
    setActionLoading(true)
    try {
      const requestBody = useCustomization ? { customization } : {}
      await fetchAPI('/api/v2/test-data/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      toast({
        title: 'Success',
        description: useCustomization 
          ? `Test data created with ${customization.client_count} clients and ${customization.appointment_count} appointments!`
          : 'Test data created successfully!',
      })
      await fetchTestDataStatus()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create test data',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteTestData = async () => {
    if (!confirm('Are you sure you want to delete all test data? This action cannot be undone.')) {
      return
    }

    setActionLoading(true)
    try {
      await fetchAPI('/api/v2/test-data', {
        method: 'DELETE',
      })
      toast({
        title: 'Success',
        description: 'Test data deleted successfully!',
      })
      await fetchTestDataStatus()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete test data',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefreshTestData = async (useCustomization = false) => {
    setActionLoading(true)
    try {
      const requestBody = useCustomization ? { customization } : {}
      await fetchAPI('/api/v2/test-data/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      toast({
        title: 'Success',
        description: useCustomization 
          ? `Test data refreshed with ${customization.client_count} clients and ${customization.appointment_count} appointments!`
          : 'Test data refreshed successfully!',
      })
      await fetchTestDataStatus()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh test data',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Test Data Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage sample data to help you explore and learn the platform
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DatabaseIcon />
              Test Data Status
            </span>
            {status?.has_test_data && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                TEST MODE ACTIVE
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {status?.has_test_data 
              ? 'You have test data in your account. All test data is clearly marked and separate from real data.'
              : 'You don\'t have any test data. Create sample data to explore the platform features.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.has_test_data && status.counts && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {status.counts.barbers}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Test Barbers</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {status.counts.clients}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Test Clients</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {status.counts.appointments}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Appointments</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {status.counts.services}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Services</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {status.counts.payments}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Payments</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!status?.has_test_data ? (
              <>
                <Button
                  onClick={() => handleCreateTestData(false)}
                  disabled={actionLoading}
                  className="flex items-center gap-2"
                >
                  <DatabaseIcon />
                  Create Test Data
                </Button>
                <Button
                  onClick={() => setShowCustomization(!showCustomization)}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  ⚙️ Customize
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => handleRefreshTestData(false)}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshIcon />
                  Refresh Test Data
                </Button>
                <Button
                  onClick={() => setShowCustomization(!showCustomization)}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  ⚙️ Customize & Refresh
                </Button>
                <Button
                  onClick={handleDeleteTestData}
                  disabled={actionLoading}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <TrashIcon />
                  Delete All Test Data
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customization Card */}
      {showCustomization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚙️ Test Data Customization
            </CardTitle>
            <CardDescription>
              Customize the amount and type of test data to create
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data Volume Controls */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Data Volume</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Clients: {customization.client_count}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={customization.client_count}
                    onChange={(e) => setCustomization({
                      ...customization,
                      client_count: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">5 - 100 clients</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Appointments: {customization.appointment_count}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={customization.appointment_count}
                    onChange={(e) => setCustomization({
                      ...customization,
                      appointment_count: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">10 - 200 appointments</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payments: {customization.payment_count}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={customization.payment_count}
                    onChange={(e) => setCustomization({
                      ...customization,
                      payment_count: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">5 - 100 payments</div>
                </div>
              </div>
            </div>

            {/* Date Range Controls */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Date Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Historical Data: {customization.start_date_days_ago} days ago
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="365"
                    value={customization.start_date_days_ago}
                    onChange={(e) => setCustomization({
                      ...customization,
                      start_date_days_ago: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">1 - 365 days ago</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Future Bookings: {customization.end_date_days_ahead} days ahead
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="180"
                    value={customization.end_date_days_ahead}
                    onChange={(e) => setCustomization({
                      ...customization,
                      end_date_days_ahead: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">1 - 180 days ahead</div>
                </div>
              </div>
            </div>

            {/* Enterprise Options */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Enterprise Options</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include_enterprise"
                    checked={customization.include_enterprise}
                    onChange={(e) => setCustomization({
                      ...customization,
                      include_enterprise: e.target.checked
                    })}
                    className="rounded"
                  />
                  <label htmlFor="include_enterprise" className="text-sm font-medium">
                    Include multi-location enterprise data
                  </label>
                </div>
                
                {customization.include_enterprise && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Number of Locations: {customization.location_count}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={customization.location_count}
                      onChange={(e) => setCustomization({
                        ...customization,
                        location_count: parseInt(e.target.value)
                      })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">1 - 10 locations</div>
                  </div>
                )}
              </div>
            </div>

            {/* Client Distribution */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Client Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    VIP Clients: {customization.vip_client_percentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customization.vip_client_percentage}
                    onChange={(e) => setCustomization({
                      ...customization,
                      vip_client_percentage: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">0% - 100% VIP clients</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Clients: {customization.new_client_percentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customization.new_client_percentage}
                    onChange={(e) => setCustomization({
                      ...customization,
                      new_client_percentage: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">0% - 100% new clients</div>
                </div>
              </div>
            </div>

            {/* Action Buttons for Customized Creation */}
            <div className="pt-4 border-t">
              <div className="flex flex-wrap gap-3">
                {!status?.has_test_data ? (
                  <Button
                    onClick={() => handleCreateTestData(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2"
                  >
                    <DatabaseIcon />
                    Create Custom Test Data
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleRefreshTestData(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2"
                  >
                    <RefreshIcon />
                    Apply Custom Settings
                  </Button>
                )}
                <Button
                  onClick={() => setShowCustomization(false)}
                  disabled={actionLoading}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What is Test Data?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>Test data includes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Sample barber profiles with schedules</li>
              <li>Test clients with appointment history</li>
              <li>Example services and pricing</li>
              <li>Mock appointments and payments</li>
              <li>Analytics data to explore reports</li>
            </ul>
            <p className="pt-2">
              All test data is marked with a "TEST" indicator and stored separately from real data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customization Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>You can customize test data by:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Adjusting data volume (5-100 clients, 10-200 appointments)</li>
              <li>Setting date ranges (up to 1 year historical data)</li>
              <li>Creating custom services with your pricing</li>
              <li>Adding multi-location enterprise data</li>
              <li>Controlling client distribution (VIP vs new clients)</li>
            </ul>
            <p className="pt-2">
              Click "Customize" to see all available options and create data that matches your business needs.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warning Alert */}
      {status?.has_test_data && (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            <strong>Important:</strong> Test data is for learning purposes only. When you start accepting real bookings, 
            delete all test data to keep your records clean. Test appointments will show a "TEST" badge to distinguish 
            them from real bookings.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}