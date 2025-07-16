'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  getBarberSchedule, 
  getBarberAvailability,
  createBarberAvailability,
  updateBarberAvailability,
  deleteBarberAvailability,
  createSpecialAvailability,
  type BarberSchedule,
  type BarberAvailability,
  type BarberAvailabilityCreate,
  type BarberSpecialAvailabilityCreate
} from '@/lib/api'
import { LoadingSkeleton, ErrorDisplay } from '@/components/ui/LoadingSystem'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface ScheduleGridProps {
  barberId: number
  currentDate: Date
  viewMode: 'week' | 'month'
  onDateChange: (date: Date) => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

interface TimeSlot {
  time: string
  status: 'available' | 'booked' | 'blocked' | 'unavailable'
  booking_id?: number
  availability_id?: number
}

interface DaySchedule {
  date: string
  dayOfWeek: number
  slots: TimeSlot[]
  regularAvailability: BarberAvailability[]
  hasSpecialAvailability: boolean
}

const ScheduleGrid = React.memo(function ScheduleGrid({
  barberId,
  currentDate,
  viewMode,
  onDateChange,
  onSuccess,
  onError
}: ScheduleGridProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [regularAvailability, setRegularAvailability] = useState<BarberAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string
    time: string
    status: string
  } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState<BarberAvailability | null>(null)

  // Memoize static data to prevent re-creation on every render
  const timeSlots = useMemo(() => [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ], [])

  const dayNames = useMemo(() => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], [])

  const getDateRange = useCallback(() => {
    if (viewMode === 'week') {
      const start = new Date(currentDate)
      const day = start.getDay()
      start.setDate(start.getDate() - day) // Go to Sunday
      
      const dates = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        dates.push(date)
      }
      return dates
    } else {
      // Month view
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      const dates = []
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d))
      }
      return dates
    }
  }, [currentDate, viewMode])

  const loadScheduleData = useCallback(async () => {
    try {
      setLoading(true)
      const dates = getDateRange()
      const startDate = dates[0].toISOString().split('T')[0]
      const endDate = dates[dates.length - 1].toISOString().split('T')[0]
      
      // Load regular availability
      const availability = await getBarberAvailability(barberId)
      setRegularAvailability(availability)
      
      // Load schedule data
      const scheduleData = await getBarberSchedule(barberId, startDate, endDate)
      
      // Transform data for display
      const transformedSchedule: DaySchedule[] = dates.map(date => {
        const dateStr = date.toISOString().split('T')[0]
        const dayOfWeek = date.getDay()
        
        // Get regular availability for this day of week
        const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek)
        
        // Create time slots for this day
        const slots: TimeSlot[] = timeSlots.map(time => {
          // Check if this time is within regular availability
          const isAvailable = dayAvailability.some(avail => {
            const startTime = avail.start_time.substring(0, 5)
            const endTime = avail.end_time.substring(0, 5)
            return time >= startTime && time < endTime
          })
          
          // TODO: Check for appointments, special availability, time off
          return {
            time,
            status: isAvailable ? 'available' : 'unavailable',
            availability_id: dayAvailability[0]?.id
          }
        })
        
        return {
          date: dateStr,
          dayOfWeek,
          slots,
          regularAvailability: dayAvailability,
          hasSpecialAvailability: false // TODO: Check actual special availability
        }
      })
      
      setSchedule(transformedSchedule)
    } catch (error) {
      console.error('Failed to load schedule:', error)
      onError('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }, [barberId, getDateRange, onError])

  useEffect(() => {
    loadScheduleData()
  }, [loadScheduleData])

  const handleSlotClick = useCallback((date: string, time: string, status: string) => {
    setSelectedSlot({ date, time, status })
    
    if (status === 'unavailable') {
      setShowAddModal(true)
    }
  }, [])

  const handleAddAvailability = useCallback(async (dayOfWeek: number, startTime: string, endTime: string) => {
    try {
      // Validate input
      if (startTime >= endTime) {
        onError('Start time must be before end time')
        return
      }
      
      const availabilityData: BarberAvailabilityCreate = {
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime
      }
      
      await createBarberAvailability(barberId, availabilityData)
      onSuccess('Availability added successfully')
      setShowAddModal(false)
      setSelectedSlot(null)
      loadScheduleData()
    } catch (error: any) {
      console.error('Error adding availability:', error)
      const errorMessage = error?.message || 'Failed to add availability'
      onError(errorMessage)
    }
  }, [barberId, onSuccess, onError, loadScheduleData])

  const handleEditAvailability = async (id: number, startTime: string, endTime: string) => {
    try {
      // Validate input
      if (startTime >= endTime) {
        onError('Start time must be before end time')
        return
      }
      
      await updateBarberAvailability(id, { start_time: startTime, end_time: endTime })
      onSuccess('Availability updated successfully')
      setShowEditModal(false)
      setEditingAvailability(null)
      loadScheduleData()
    } catch (error: any) {
      console.error('Error updating availability:', error)
      const errorMessage = error?.message || 'Failed to update availability'
      onError(errorMessage)
    }
  }

  const handleDeleteAvailability = async (id: number) => {
    if (!confirm('Are you sure you want to delete this availability?')) return
    
    try {
      await deleteBarberAvailability(id)
      onSuccess('Availability deleted successfully')
      loadScheduleData()
    } catch (error: any) {
      console.error('Error deleting availability:', error)
      const errorMessage = error?.message || 'Failed to delete availability'
      onError(errorMessage)
    }
  }

  const getSlotClassName = (status: string, isSelected: boolean) => {
    const baseClasses = 'w-full h-8 text-xs border border-gray-200 rounded transition-all cursor-pointer'
    
    if (isSelected) {
      return `${baseClasses} bg-primary-200 border-primary-400`
    }
    
    switch (status) {
      case 'available':
        return `${baseClasses} bg-green-50 border-green-200 text-green-800 hover:bg-green-100`
      case 'booked':
        return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800 cursor-not-allowed`
      case 'blocked':
        return `${baseClasses} bg-red-50 border-red-200 text-red-800 hover:bg-red-100`
      case 'unavailable':
      default:
        return `${baseClasses} bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100`
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton lines={8} className="h-96" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <h3 className="font-medium text-gray-900">Legend:</h3>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span className="text-sm text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span className="text-sm text-gray-600">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span className="text-sm text-gray-600">Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
              <span className="text-sm text-gray-600">Unavailable</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {viewMode === 'week' ? 'Weekly' : 'Monthly'} Schedule
            </CardTitle>
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
              size="sm"
            >
              Add Availability
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header Row */}
              <div className={`grid gap-1 p-4 border-b border-gray-200 ${viewMode === 'week' ? 'grid-cols-8' : 'grid-cols-8'}`}>
                <div className="font-medium text-gray-900 text-sm">Time</div>
                {schedule.slice(0, viewMode === 'week' ? 7 : 7).map((day) => (
                  <div key={day.date} className="text-center">
                    <div className="font-medium text-gray-900 text-sm">
                      {dayNames[day.dayOfWeek]}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(day.date)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slot Rows */}
              <div className="p-4 space-y-1">
                {timeSlots.map((time) => (
                  <div key={time} className={`grid gap-1 ${viewMode === 'week' ? 'grid-cols-8' : 'grid-cols-8'}`}>
                    <div className="flex items-center text-sm text-gray-600 font-medium py-1">
                      {time}
                    </div>
                    {schedule.slice(0, viewMode === 'week' ? 7 : 7).map((day) => {
                      const slot = day.slots.find(s => s.time === time)
                      const isSelected = selectedSlot?.date === day.date && selectedSlot?.time === time
                      
                      return (
                        <button
                          key={`${day.date}-${time}`}
                          onClick={() => handleSlotClick(day.date, time, slot?.status || 'unavailable')}
                          className={getSlotClassName(slot?.status || 'unavailable', isSelected)}
                          title={`${day.date} ${time} - ${slot?.status || 'unavailable'}`}
                        >
                          {slot?.status === 'booked' && '📅'}
                          {slot?.status === 'blocked' && '🚫'}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regular Availability Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Regular Weekly Availability</CardTitle>
        </CardHeader>
        <CardContent>
          {regularAvailability.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No regular availability set. Click "Add Availability" to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {regularAvailability.map((avail) => (
                <div key={avail.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      {dayNames[avail.day_of_week]}
                    </span>
                    <span className="text-gray-600">
                      {avail.start_time.substring(0, 5)} - {avail.end_time.substring(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setEditingAvailability(avail)
                        setShowEditModal(true)
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteAvailability(avail.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Availability Modal */}
      {showAddModal && (
        <AddAvailabilityModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setSelectedSlot(null)
          }}
          onSubmit={handleAddAvailability}
          selectedSlot={selectedSlot}
        />
      )}

      {/* Edit Availability Modal */}
      {showEditModal && editingAvailability && (
        <EditAvailabilityModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingAvailability(null)
          }}
          onSubmit={(startTime, endTime) => handleEditAvailability(editingAvailability.id, startTime, endTime)}
          availability={editingAvailability}
        />
      )}
    </div>
  )
})

// Add display name for debugging
ScheduleGrid.displayName = 'ScheduleGrid'

export default ScheduleGrid

// Add Availability Modal Component
function AddAvailabilityModal({
  isOpen,
  onClose,
  onSubmit,
  selectedSlot
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (dayOfWeek: number, startTime: string, endTime: string) => void
  selectedSlot: { date: string; time: string; status: string } | null
}) {
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  useEffect(() => {
    if (selectedSlot) {
      const date = new Date(selectedSlot.date + 'T00:00:00')
      setDayOfWeek(date.getDay())
      setStartTime(selectedSlot.time)
    }
  }, [selectedSlot])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(dayOfWeek, startTime, endTime)
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-availability-title"
    >
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle id="add-availability-title">Add Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Day of Week"
              value={dayOfWeek.toString()}
              onChange={(value) => {
                if (value && !Array.isArray(value)) {
                  setDayOfWeek(parseInt(value))
                }
              }}
              options={[
                { value: '0', label: 'Sunday' },
                { value: '1', label: 'Monday' },
                { value: '2', label: 'Tuesday' },
                { value: '3', label: 'Wednesday' },
                { value: '4', label: 'Thursday' },
                { value: '5', label: 'Friday' },
                { value: '6', label: 'Saturday' }
              ]}
            />
            
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" fullWidth>
                Add Availability
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

// Edit Availability Modal Component
function EditAvailabilityModal({
  isOpen,
  onClose,
  onSubmit,
  availability
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (startTime: string, endTime: string) => void
  availability: BarberAvailability
}) {
  const [startTime, setStartTime] = useState(availability.start_time.substring(0, 5))
  const [endTime, setEndTime] = useState(availability.end_time.substring(0, 5))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(startTime, endTime)
  }

  if (!isOpen) return null

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-availability-title"
    >
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle id="edit-availability-title">Edit Availability - {dayNames[availability.day_of_week]}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" fullWidth>
                Update Availability
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