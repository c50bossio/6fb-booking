'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getBarberTimeOff,
  createTimeOffRequest,
  type BarberTimeOff,
  type BarberTimeOffCreate
} from '@/lib/api'
import { LoadingSkeleton, ErrorDisplay } from '@/components/ui/LoadingSystem'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface TimeOffManagerProps {
  barberId: number
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

const TIME_OFF_REASONS = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Day' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'training', label: 'Training/Conference' },
  { value: 'family', label: 'Family Emergency' },
  { value: 'other', label: 'Other' }
]

export default function TimeOffManager({ barberId, onSuccess, onError }: TimeOffManagerProps) {
  const [timeOffRequests, setTimeOffRequests] = useState<BarberTimeOff[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewFilter, setViewFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')

  const loadTimeOff = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get time off for the next 6 months and past 3 months
      const today = new Date()
      const startDate = new Date(today)
      startDate.setMonth(today.getMonth() - 3)
      const endDate = new Date(today)
      endDate.setMonth(today.getMonth() + 6)
      
      const timeOff = await getBarberTimeOff(
        barberId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      
      setTimeOffRequests(timeOff)
    } catch (error) {
      console.error('Failed to load time off:', error)
      onError('Failed to load time off requests')
    } finally {
      setLoading(false)
    }
  }, [barberId, onError])

  useEffect(() => {
    loadTimeOff()
  }, [loadTimeOff])

  const handleAddTimeOff = async (timeOffData: BarberTimeOffCreate) => {
    try {
      // Validate dates
      const startDate = new Date(timeOffData.start_date)
      const endDate = new Date(timeOffData.end_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (startDate < today) {
        onError('Start date cannot be in the past')
        return
      }
      
      if (endDate < startDate) {
        onError('End date cannot be before start date')
        return
      }
      
      if (timeOffData.start_time && timeOffData.end_time) {
        if (timeOffData.start_time >= timeOffData.end_time) {
          onError('Start time must be before end time')
          return
        }
      }
      
      await createTimeOffRequest(barberId, timeOffData)
      onSuccess('Time off request created successfully')
      setShowAddModal(false)
      loadTimeOff()
    } catch (error: any) {
      console.error('Error creating time off:', error)
      const errorMessage = error?.message || 'Failed to create time off request'
      onError(errorMessage)
    }
  }

  const getFilteredTimeOff = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return timeOffRequests.filter(timeOff => {
      const endDate = new Date(timeOff.end_date)
      endDate.setHours(23, 59, 59, 999)
      
      switch (viewFilter) {
        case 'upcoming':
          return endDate >= today
        case 'past':
          return endDate < today
        default:
          return true
      }
    }).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (startDate === endDate) {
      return start.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
    
    return `${start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })} - ${end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`
  }

  const getTimeOffStatus = (timeOff: BarberTimeOff) => {
    const today = new Date()
    const startDate = new Date(timeOff.start_date)
    const endDate = new Date(timeOff.end_date)
    
    if (endDate < today) return 'past'
    if (startDate <= today && endDate >= today) return 'active'
    return 'upcoming'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'upcoming':
        return 'bg-green-100 text-green-800'
      case 'past':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const filteredTimeOff = getFilteredTimeOff()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time Off Management</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton lines={6} className="h-64" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Time Off Management</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={viewFilter}
                onChange={(value) => {
                  if (value && !Array.isArray(value)) {
                    setViewFilter(value as any)
                  }
                }}
                options={[
                  { value: 'all', label: 'All Requests' },
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'past', label: 'Past' }
                ]}
                className="w-full sm:w-32"
              />
              <Button
                onClick={() => setShowAddModal(true)}
                variant="primary"
                size="md"
              >
                Add Time Off
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {timeOffRequests.filter(t => getTimeOffStatus(t) === 'active').length}
              </div>
              <div className="text-sm text-blue-700">Active Time Off</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {timeOffRequests.filter(t => getTimeOffStatus(t) === 'upcoming').length}
              </div>
              <div className="text-sm text-green-700">Upcoming Requests</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900">
                {timeOffRequests.filter(t => {
                  const start = new Date(t.start_date)
                  const now = new Date()
                  return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear()
                }).length}
              </div>
              <div className="text-sm text-purple-700">This Month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Off List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewFilter === 'all' ? 'All Time Off Requests' : 
             viewFilter === 'upcoming' ? 'Upcoming Time Off' : 'Past Time Off'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTimeOff.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No time off requests
              </h3>
              <p className="text-gray-500 mb-4">
                {viewFilter === 'upcoming' ? 'You have no upcoming time off scheduled.' :
                 viewFilter === 'past' ? 'No past time off requests found.' :
                 'You haven\'t created any time off requests yet.'}
              </p>
              <Button
                onClick={() => setShowAddModal(true)}
                variant="primary"
                size="md"
              >
                Add Your First Time Off Request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTimeOff.map((timeOff) => {
                const status = getTimeOffStatus(timeOff)
                return (
                  <div
                    key={timeOff.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {timeOff.reason.replace('_', ' ')}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                            {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Past'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDateRange(timeOff.start_date, timeOff.end_date)}</span>
                          </div>
                          
                          {(timeOff.start_time || timeOff.end_time) && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {timeOff.start_time?.substring(0, 5) || '00:00'} - {timeOff.end_time?.substring(0, 5) || '23:59'}
                              </span>
                            </div>
                          )}
                          
                          {timeOff.notes && (
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-gray-500">{timeOff.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {status === 'upcoming' && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Time Off Modal */}
      {showAddModal && (
        <AddTimeOffModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTimeOff}
        />
      )}
    </div>
  )
}

// Add Time Off Modal Component
function AddTimeOffModal({
  isOpen,
  onClose,
  onSubmit
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (timeOffData: BarberTimeOffCreate) => void
}) {
  const [formData, setFormData] = useState<BarberTimeOffCreate>({
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: 'vacation',
    notes: ''
  })
  const [isFullDay, setIsFullDay] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const timeOffData: BarberTimeOffCreate = {
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason,
      notes: formData.notes || undefined
    }
    
    if (!isFullDay) {
      timeOffData.start_time = formData.start_time
      timeOffData.end_time = formData.end_time
    }
    
    onSubmit(timeOffData)
  }

  const handleInputChange = (field: keyof BarberTimeOffCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Set end date to start date if it's not set or is before start date
  const handleStartDateChange = (value: string) => {
    handleInputChange('start_date', value)
    if (!formData.end_date || formData.end_date < value) {
      handleInputChange('end_date', value)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-timeoff-title"
    >
      <Card className="w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle id="add-timeoff-title">Add Time Off Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Reason"
              value={formData.reason}
              onChange={(value) => {
                if (value && !Array.isArray(value)) {
                  handleInputChange('reason', value)
                }
              }}
              options={TIME_OFF_REASONS}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleStartDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              
              <Input
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fullDay"
                checked={isFullDay}
                onChange={(e) => setIsFullDay(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="fullDay" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Full day(s) off
              </label>
            </div>
            
            {!isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  required={!isFullDay}
                />
                
                <Input
                  label="End Time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  required={!isFullDay}
                />
              </div>
            )}
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add any additional information about this time off..."
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" fullWidth>
                Create Time Off Request
              </Button>
              <Button type="button" onClick={onClose} variant="secondary" fullWidth>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}