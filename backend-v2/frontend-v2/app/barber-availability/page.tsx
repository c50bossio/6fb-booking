'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  getProfile, 
  getBarberSchedule, 
  getBarberAvailability,
  getBarberTimeOff,
  type User 
} from '@/lib/api'
import { PageLoading, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import ScheduleGrid from '@/components/ScheduleGrid'
import TimeOffManager from '@/components/TimeOffManager'
import BulkAvailabilityUpdater from '@/components/BulkAvailabilityUpdater'

function BarberAvailabilityContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [activeTab, setActiveTab] = useState<'schedule' | 'timeoff' | 'bulk'>('schedule')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [barbers, setBarbers] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const userData = await getProfile()
        setUser(userData)
        
        // For now, if user is a barber, set them as selected
        if (userData.role === 'barber') {
          setSelectedBarberId(userData.id)
        }
        
        // TODO: Fetch list of barbers if user is admin
        if (userData.role === 'admin' || userData.role === 'super_admin') {
          // For now, just add the current user if they're a barber
          setBarbers([{ id: userData.id, name: userData.name || userData.email }])
          setSelectedBarberId(userData.id)
        }
      } catch (error) {
        setError('Failed to load user data')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Check for success message from URL params
    if (searchParams.get('success')) {
      setSuccessMessage('Operation completed successfully!')
      setTimeout(() => setSuccessMessage(''), 5000)
    }
  }, [router, searchParams])

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
  }

  const handleViewModeChange = (mode: 'week' | 'month') => {
    setViewMode(mode)
  }

  const handleBarberChange = (barberId: string) => {
    setSelectedBarberId(parseInt(barberId))
  }

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(''), 5000)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setTimeout(() => setError(''), 5000)
  }

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(date)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return end
  }

  if (loading) {
    return <PageLoading message="Loading barber availability..." />
  }

  if (!user) {
    return <ErrorDisplay error="User not found" />
  }

  // Check permissions
  if (user.role !== 'barber' && user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card variant="outlined" className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You need to be a barber or admin to access availability management.
            </p>
            <Button onClick={() => router.push('/dashboard')} variant="primary">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">Barber Availability</h1>
            <p className="text-gray-600 mt-2">
              Manage your schedule, time off, and availability settings
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Barber Selection (if admin) */}
            {(user.role === 'admin' || user.role === 'super_admin') && barbers.length > 1 && (
              <Select
                value={selectedBarberId?.toString() || ''}
                onChange={(value) => value && handleBarberChange(typeof value === 'string' ? value : value[0])}
                options={barbers.map(barber => ({
                  value: barber.id.toString(),
                  label: barber.name
                }))}
                placeholder="Select Barber"
                className="w-full sm:w-48"
              />
            )}
            
            <Button
              onClick={() => router.push('/dashboard')}
              variant="secondary"
              size="md"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <SuccessMessage 
            message={successMessage}
            onDismiss={() => setSuccessMessage('')}
            className="mb-6"
          />
        )}

        {error && (
          <ErrorDisplay 
            error={error}
            onRetry={() => {
              setError('')
              // Retry loading data if needed
              window.location.reload()
            }}
            className="mb-6"
            title="Something went wrong"
          />
        )}

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setDate(newDate.getDate() - (viewMode === 'week' ? 7 : 30))
                    setCurrentDate(newDate)
                  }}
                  variant="ghost"
                  size="sm"
                >
                  ← Previous {viewMode === 'week' ? 'Week' : 'Month'}
                </Button>
                
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {viewMode === 'week' ? (
                      `${getWeekStart(currentDate).toLocaleDateString()} - ${getWeekEnd(currentDate).toLocaleDateString()}`
                    ) : (
                      currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDateForDisplay(new Date())}
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setDate(newDate.getDate() + (viewMode === 'week' ? 7 : 30))
                    setCurrentDate(newDate)
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Next {viewMode === 'week' ? 'Week' : 'Month'} →
                </Button>
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex rounded-lg border border-gray-300 dark:border-gray-600 p-1">
                  <button
                    onClick={() => handleViewModeChange('week')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      viewMode === 'week'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => handleViewModeChange('month')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      viewMode === 'month'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Month
                  </button>
                </div>

                <Button
                  onClick={() => setCurrentDate(new Date())}
                  variant="secondary"
                  size="sm"
                >
                  Today
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b border-gray-200 mb-6">
          {[
            { id: 'schedule', label: 'Schedule', icon: '📅' },
            { id: 'timeoff', label: 'Time Off', icon: '🏖️' },
            { id: 'bulk', label: 'Bulk Operations', icon: '⚡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'schedule' && selectedBarberId && (
            <ScheduleGrid
              barberId={selectedBarberId}
              currentDate={currentDate}
              viewMode={viewMode}
              onDateChange={handleDateChange}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          )}

          {activeTab === 'timeoff' && selectedBarberId && (
            <TimeOffManager
              barberId={selectedBarberId}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          )}

          {activeTab === 'bulk' && selectedBarberId && (
            <BulkAvailabilityUpdater
              barberId={selectedBarberId}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          )}

          {!selectedBarberId && (
            <Card>
              <CardContent className="text-center p-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Barber Selected
                </h3>
                <p className="text-gray-600">
                  Please select a barber to manage their availability.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}

export default function BarberAvailabilityPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading barber availability..." />}>
      <BarberAvailabilityContent />
    </Suspense>
  )
}