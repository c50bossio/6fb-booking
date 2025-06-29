'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingButton, LoadingSpinner, ErrorDisplay } from '@/components/LoadingStates'
import Calendar from '@/components/Calendar'
import TimeSlots from '@/components/TimeSlots'
import {
  updateRecurringPattern,
  deleteRecurringPattern,
  generateAppointments,
  cancelRecurringSeries,
  modifySingleOccurrence,
  getUpcomingAppointments,
  type RecurringPattern,
  type AppointmentOccurrence
} from '@/lib/recurringApi'
import { formatDateForAPI, parseAPIDate } from '@/lib/timezone'

interface RecurringSeriesManagerProps {
  pattern: RecurringPattern
  onUpdate: () => void
  onClose: () => void
}

export default function RecurringSeriesManager({ pattern, onUpdate, onClose }: RecurringSeriesManagerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'occurrences' | 'modify'>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<AppointmentOccurrence[]>([])
  const [selectedOccurrence, setSelectedOccurrence] = useState<AppointmentOccurrence | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState<'cancel' | 'delete' | null>(null)

  // Modification state
  const [modifyDate, setModifyDate] = useState<Date | null>(null)
  const [modifyTime, setModifyTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])

  // Fetch upcoming appointments
  useEffect(() => {
    fetchUpcomingAppointments()
  }, [pattern.id])

  const fetchUpcomingAppointments = async () => {
    try {
      setLoading(true)
      const data = await getUpcomingAppointments(pattern.id)
      setAppointments(data.appointments)
    } catch (err) {
      console.error('Failed to fetch appointments:', err)
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAppointments = async (previewOnly = false) => {
    try {
      setLoading(true)
      setError(null)
      const result = await generateAppointments(pattern.id, previewOnly)
      
      if (!previewOnly) {
        // Refresh appointments list
        await fetchUpcomingAppointments()
        // Show success message
        if (result.total_generated > 0) {
          alert(`Successfully generated ${result.total_generated} appointments!`)
        }
        if (result.total_conflicts > 0) {
          alert(`Note: ${result.total_conflicts} appointments had conflicts and need to be rescheduled.`)
        }
      } else {
        // Show preview
        setAppointments(result.appointments)
      }
    } catch (err: any) {
      console.error('Failed to generate appointments:', err)
      setError(err.message || 'Failed to generate appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSeries = async (futureOnly: boolean) => {
    try {
      setLoading(true)
      setError(null)
      await cancelRecurringSeries(pattern.id, futureOnly)
      setShowConfirmDialog(null)
      onUpdate()
    } catch (err: any) {
      console.error('Failed to cancel series:', err)
      setError(err.message || 'Failed to cancel series')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePattern = async () => {
    try {
      setLoading(true)
      setError(null)
      await deleteRecurringPattern(pattern.id)
      setShowConfirmDialog(null)
      onUpdate()
    } catch (err: any) {
      console.error('Failed to delete pattern:', err)
      setError(err.message || 'Failed to delete pattern')
    } finally {
      setLoading(false)
    }
  }

  const handleModifyOccurrence = async () => {
    if (!selectedOccurrence || !modifyDate || !modifyTime) return

    try {
      setLoading(true)
      setError(null)
      await modifySingleOccurrence(
        selectedOccurrence.id,
        formatDateForAPI(modifyDate),
        modifyTime,
        null, // Keep same barber
        false // Not cancelling
      )
      
      // Reset modification state
      setSelectedOccurrence(null)
      setModifyDate(null)
      setModifyTime(null)
      
      // Refresh appointments
      await fetchUpcomingAppointments()
    } catch (err: any) {
      console.error('Failed to modify occurrence:', err)
      setError(err.message || 'Failed to modify occurrence')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOccurrence = async (appointmentId: number) => {
    try {
      setLoading(true)
      setError(null)
      await modifySingleOccurrence(
        appointmentId,
        null,
        null,
        null,
        true // Cancel this occurrence
      )
      
      // Refresh appointments
      await fetchUpcomingAppointments()
    } catch (err: any) {
      console.error('Failed to cancel occurrence:', err)
      setError(err.message || 'Failed to cancel occurrence')
    } finally {
      setLoading(false)
    }
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3">Pattern Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Type:</dt>
            <dd className="font-medium capitalize">{pattern.pattern_type}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Service:</dt>
            <dd className="font-medium">{pattern.service?.name || 'N/A'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Barber:</dt>
            <dd className="font-medium">{pattern.barber?.name || 'N/A'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Time:</dt>
            <dd className="font-medium">{pattern.preferred_time}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Duration:</dt>
            <dd className="font-medium">{pattern.duration_minutes} minutes</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Start Date:</dt>
            <dd className="font-medium">{pattern.start_date}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">End Date:</dt>
            <dd className="font-medium">{pattern.end_date || 'Ongoing'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Status:</dt>
            <dd>
              <span className={`px-2 py-1 text-xs rounded-full ${
                pattern.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {pattern.is_active ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Quick Actions</h3>
        
        <Button
          onClick={() => handleGenerateAppointments(false)}
          className="w-full"
          disabled={!pattern.is_active}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Generate Appointments
        </Button>

        <Button
          variant="outline"
          onClick={() => handleGenerateAppointments(true)}
          className="w-full"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Preview Next Appointments
        </Button>

        <Button
          variant="outline"
          onClick={() => setActiveTab('modify')}
          className="w-full"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Modify Pattern
        </Button>

        <div className="pt-3 space-y-2 border-t">
          <Button
            variant="outline"
            onClick={() => setShowConfirmDialog('cancel')}
            className="w-full text-yellow-600 border-yellow-600 hover:bg-yellow-50"
          >
            Cancel Future Appointments
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowConfirmDialog('delete')}
            className="w-full text-red-600 border-red-600 hover:bg-red-50"
          >
            Delete Pattern
          </Button>
        </div>
      </div>
    </div>
  )

  const renderOccurrencesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Upcoming Appointments</h3>
        <Button
          size="sm"
          onClick={() => fetchUpcomingAppointments()}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No upcoming appointments found.</p>
          <Button
            className="mt-4"
            onClick={() => handleGenerateAppointments(false)}
          >
            Generate Appointments
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div>
                <div className="font-medium">
                  {new Date(apt.start_time).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(apt.start_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  {' - '}
                  {new Date(apt.end_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {apt.service?.name} with {apt.barber?.name}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  apt.status === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : apt.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : apt.status === 'completed'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {apt.status}
                </span>
                
                {apt.status === 'confirmed' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOccurrence(apt)
                        setActiveTab('modify')
                      }}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelOccurrence(apt.id)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderModifyTab = () => (
    <div className="space-y-6">
      {selectedOccurrence ? (
        <>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">
              Rescheduling Single Occurrence
            </h3>
            <p className="text-sm text-blue-700">
              Original: {new Date(selectedOccurrence.start_time).toLocaleDateString()}{' '}
              at {new Date(selectedOccurrence.start_time).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-3">Select New Date</h4>
            <Calendar
              selectedDate={modifyDate}
              onDateSelect={setModifyDate}
              bookingDates={[]}
            />
          </div>

          {modifyDate && (
            <div>
              <h4 className="font-medium mb-3">Select New Time</h4>
              <TimeSlots
                slots={availableSlots}
                selectedTime={modifyTime}
                onTimeSelect={setModifyTime}
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedOccurrence(null)
                setModifyDate(null)
                setModifyTime(null)
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <LoadingButton
              loading={loading}
              onClick={handleModifyOccurrence}
              disabled={!modifyDate || !modifyTime}
              className="flex-1"
            >
              Confirm Reschedule
            </LoadingButton>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Select an appointment from the Occurrences tab to reschedule it.</p>
          <Button
            className="mt-4"
            onClick={() => setActiveTab('occurrences')}
          >
            View Occurrences
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Manage Recurring Series</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'text-teal-600 border-teal-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('occurrences')}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'occurrences'
                  ? 'text-teal-600 border-teal-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Occurrences
            </button>
            <button
              onClick={() => setActiveTab('modify')}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'modify'
                  ? 'text-teal-600 border-teal-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Modify
            </button>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <ErrorDisplay
              message={error}
              onRetry={() => setError(null)}
            />
          )}

          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'occurrences' && renderOccurrencesTab()}
          {activeTab === 'modify' && renderModifyTab()}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      {showConfirmDialog === 'cancel' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <CardHeader>
              <h3 className="text-lg font-semibold">Cancel Recurring Series</h3>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Do you want to cancel all future appointments or just stop creating new ones?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <LoadingButton
                  loading={loading}
                  onClick={() => handleCancelSeries(true)}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                >
                  Cancel Future Only
                </LoadingButton>
                <LoadingButton
                  loading={loading}
                  onClick={() => handleCancelSeries(false)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Cancel All
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showConfirmDialog === 'delete' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <CardHeader>
              <h3 className="text-lg font-semibold">Delete Recurring Pattern</h3>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this recurring pattern? This will deactivate the pattern
                but existing appointments will remain.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <LoadingButton
                  loading={loading}
                  onClick={handleDeletePattern}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Delete Pattern
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}