'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/use-toast'
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

export default function TestDataPage() {
  const router = useRouter()
  const [status, setStatus] = useState<TestDataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchTestDataStatus()
  }, [])

  const fetchTestDataStatus = async () => {
    try {
      const data = await fetchAPI('/api/v1/test-data/status')
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch test data status:', error)
      toast({
        title: 'Error',
        description: 'Failed to load test data status',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTestData = async () => {
    setActionLoading(true)
    try {
      await fetchAPI('/api/v1/test-data/create', {
        method: 'POST',
      })
      toast({
        title: 'Success',
        description: 'Test data created successfully!',
      })
      await fetchTestDataStatus()
    } catch (error) {
      console.error('Failed to create test data:', error)
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
      await fetchAPI('/api/v1/test-data', {
        method: 'DELETE',
      })
      toast({
        title: 'Success',
        description: 'Test data deleted successfully!',
      })
      await fetchTestDataStatus()
    } catch (error) {
      console.error('Failed to delete test data:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete test data',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefreshTestData = async () => {
    setActionLoading(true)
    try {
      await fetchAPI('/api/v1/test-data/refresh', {
        method: 'POST',
      })
      toast({
        title: 'Success',
        description: 'Test data refreshed successfully!',
      })
      await fetchTestDataStatus()
    } catch (error) {
      console.error('Failed to refresh test data:', error)
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
              <Button
                onClick={handleCreateTestData}
                disabled={actionLoading}
                className="flex items-center gap-2"
              >
                <DatabaseIcon />
                Create Test Data
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleRefreshTestData}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshIcon />
                  Refresh Test Data
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
            <CardTitle className="text-lg">How to Use Test Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>With test data active, you can:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Practice booking appointments</li>
              <li>Test drag-and-drop scheduling</li>
              <li>Explore analytics and reports</li>
              <li>Try payment processing (no real charges)</li>
              <li>Learn all features risk-free</li>
            </ul>
            <p className="pt-2">
              When you're ready to go live, simply delete all test data with one click.
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