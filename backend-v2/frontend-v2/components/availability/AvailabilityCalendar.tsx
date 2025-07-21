'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClockIcon, CalendarIcon, CheckIcon, XMarkIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { availabilityAPI } from '@/lib/api/availability'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TimeSlot {
  start: string
  end: string
  active: boolean
}

interface WeeklySchedule {
  [day: number]: TimeSlot
}

interface AvailabilityCalendarProps {
  barberId: number
  onScheduleChange?: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' }
]

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? '00' : '30'
  const time = `${hour.toString().padStart(2, '0')}:${minute}`
  const label = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  return { value: time, label }
})

const TIME_PRESETS = [
  { name: 'Standard Day', start: '09:00', end: '17:00', label: '9 AM - 5 PM' },
  { name: 'Morning Shift', start: '06:00', end: '14:00', label: '6 AM - 2 PM' },
  { name: 'Afternoon Shift', start: '14:00', end: '22:00', label: '2 PM - 10 PM' },
  { name: 'Extended Day', start: '08:00', end: '20:00', label: '8 AM - 8 PM' },
  { name: 'Weekend Hours', start: '10:00', end: '18:00', label: '10 AM - 6 PM' },
  { name: 'Late Start', start: '11:00', end: '19:00', label: '11 AM - 7 PM' }
]

export function AvailabilityCalendar({ barberId, onScheduleChange }: AvailabilityCalendarProps) {
  const { toast } = useToast()
  const [schedule, setSchedule] = useState<WeeklySchedule>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDay, setSavingDay] = useState<number | null>(null)
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({})
  const [networkError, setNetworkError] = useState(false)

  useEffect(() => {
    fetchAvailability()
  }, [barberId])

  // Helper function to determine error type and user-friendly message
  const getErrorDetails = (error: any) => {
    const isNetworkError = !error.response || error.code === 'NETWORK_ERROR'
    const isServerError = error.response?.status >= 500
    const isAuthError = error.response?.status === 401 || error.response?.status === 403
    const isValidationError = error.response?.status === 400 || error.response?.status === 422
    
    if (isNetworkError) {
      return {
        type: 'network',
        title: 'Connection Issue',
        message: 'Unable to connect to the server. Please check your internet connection.',
        canRetry: true
      }
    } else if (isAuthError) {
      return {
        type: 'auth',
        title: 'Permission Denied',
        message: 'You may need to log in again to continue.',
        canRetry: false
      }
    } else if (isServerError) {
      return {
        type: 'server',
        title: 'Server Error',
        message: 'The server is experiencing issues. Please try again in a moment.',
        canRetry: true
      }
    } else if (isValidationError) {
      return {
        type: 'validation',
        title: 'Invalid Data',
        message: 'Please check your input and try again.',
        canRetry: false
      }
    } else {
      return {
        type: 'unknown',
        title: 'Something went wrong',
        message: 'An unexpected error occurred. Please try again.',
        canRetry: true
      }
    }
  }

  // Helper function to show error toast with retry option
  const showErrorToast = (error: any, operation: string, retryFunction?: () => void) => {
    const errorDetails = getErrorDetails(error)
    const operationKey = `${operation}-${barberId}`
    const currentAttempts = retryAttempts[operationKey] || 0
    
    setNetworkError(errorDetails.type === 'network')
    
    toast({
      title: errorDetails.title,
      description: `${errorDetails.message} ${retryFunction && errorDetails.canRetry && currentAttempts < 3 ? 'Tap to retry.' : ''}`,
      variant: 'destructive',
      duration: 7000,
      action: retryFunction && errorDetails.canRetry && currentAttempts < 3 ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setRetryAttempts(prev => ({ ...prev, [operationKey]: currentAttempts + 1 }))
            retryFunction()
          }}
          className="ml-2"
        >
          Retry ({3 - currentAttempts} left)
        </Button>
      ) : undefined
    })
  }

  const fetchAvailability = async () => {
    try {
      setLoading(true)
      const availability = await availabilityAPI.getBarberAvailability(barberId)
      
      // Convert to weekly schedule format
      const scheduleMap: WeeklySchedule = {}
      availability.forEach(slot => {
        scheduleMap[slot.day_of_week] = {
          start: slot.start_time,
          end: slot.end_time,
          active: slot.is_active
        }
      })
      
      // Fill in missing days with default values
      DAYS_OF_WEEK.forEach(day => {
        if (!scheduleMap[day.value]) {
          scheduleMap[day.value] = {
            start: '09:00',
            end: '17:00',
            active: false
          }
        }
      })
      
      setSchedule(scheduleMap)
      setNetworkError(false) // Clear network error on success
    } catch (error) {
      console.error('Fetch availability error:', error)
      showErrorToast(error, 'fetch', () => fetchAvailability())
    } finally {
      setLoading(false)
    }
  }

  const handleDayToggle = async (day: number, active: boolean) => {
    const updatedSchedule = {
      ...schedule,
      [day]: { ...schedule[day], active }
    }
    setSchedule(updatedSchedule)
    
    // Save immediately
    await saveDay(day, updatedSchedule[day])
  }

  const handleTimeChange = (day: number, field: 'start' | 'end', value: string) => {
    const currentSlot = schedule[day]
    
    // Validate time selection
    if (field === 'start' && currentSlot.end && value >= currentSlot.end) {
      toast({
        title: 'Invalid Time Selection',
        description: 'Start time must be before end time. Please select an earlier time.',
        variant: 'destructive',
        duration: 4000
      })
      return
    }
    
    if (field === 'end' && currentSlot.start && value <= currentSlot.start) {
      toast({
        title: 'Invalid Time Selection', 
        description: 'End time must be after start time. Please select a later time.',
        variant: 'destructive',
        duration: 4000
      })
      return
    }
    
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const saveDay = async (day: number, slot: TimeSlot) => {
    try {
      setSaving(true)
      setSavingDay(day)
      await availabilityAPI.createBarberAvailability(barberId, {
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        is_active: slot.active
      })
      
      toast({
        title: 'Success',
        description: `${DAYS_OF_WEEK.find(d => d.value === day)?.label} availability updated`,
        duration: 3000
      })
      
      if (onScheduleChange) {
        onScheduleChange()
      }
      
      setNetworkError(false) // Clear network error on success
    } catch (error) {
      console.error('Save availability error:', error)
      const dayName = DAYS_OF_WEEK.find(d => d.value === day)?.label
      showErrorToast(
        error, 
        `save-${day}`, 
        () => saveDay(day, slot)
      )
    } finally {
      setSaving(false)
      setSavingDay(null)
      setEditingDay(null)
    }
  }

  const applyPreset = (day: number, preset: typeof TIME_PRESETS[0]) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        start: preset.start,
        end: preset.end
      }
    }))
    
    toast({
      title: 'Preset Applied',
      description: `${preset.name} (${preset.label}) applied to ${DAYS_OF_WEEK.find(d => d.value === day)?.label}`,
      duration: 3000
    })
  }

  const applyToAllDays = () => {
    const activeDay = DAYS_OF_WEEK.find(d => schedule[d.value]?.active)
    if (!activeDay) {
      toast({
        title: 'Info',
        description: 'Please set at least one active day first',
        variant: 'default'
      })
      return
    }
    
    const template = schedule[activeDay.value]
    const updatedSchedule = { ...schedule }
    
    DAYS_OF_WEEK.forEach(day => {
      updatedSchedule[day.value] = { ...template }
    })
    
    setSchedule(updatedSchedule)
    toast({
      title: 'Success',
      description: 'Schedule applied to all days. Remember to save each day.'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-64" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DAYS_OF_WEEK.map(day => (
                <div
                  key={day.value}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
            </div>
          </CardContent>
        </Card>
        
        {/* Loading skeleton for stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Network Error Banner */}
      {networkError && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connection issues detected. Some features may not work properly.</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => fetchAvailability()}
              className="ml-4"
            >
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Weekly Availability</CardTitle>
          <CardDescription>
            Set your regular working hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map(day => {
              const slot = schedule[day.value]
              const isEditing = editingDay === day.value
              
              return (
                <div
                  key={day.value}
                  className={cn(
                    'p-4 rounded-lg border transition-colors',
                    slot?.active 
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' 
                      : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={slot?.active || false}
                        onCheckedChange={(checked) => handleDayToggle(day.value, checked)}
                        disabled={saving || savingDay === day.value}
                      />
                      <div className="flex-1">
                        <Label className="text-base font-medium">
                          {day.label}
                        </Label>
                        {slot?.active && !isEditing && (
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <ClockIcon className="w-3 h-3 text-gray-500" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {TIME_OPTIONS.find(t => t.value === slot.start)?.label} - {TIME_OPTIONS.find(t => t.value === slot.end)?.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {calculateDuration(slot.start, slot.end)} working day
                              </span>
                            </div>
                            
                            {/* Visual Time Bar */}
                            <div className="mt-2">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span>6 AM</span>
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full relative">
                                  <div 
                                    className="absolute h-full bg-primary-500 rounded-full"
                                    style={{
                                      left: `${((parseInt(slot.start.split(':')[0]) + parseInt(slot.start.split(':')[1]) / 60) - 6) / 18 * 100}%`,
                                      width: `${((parseInt(slot.end.split(':')[0]) + parseInt(slot.end.split(':')[1]) / 60) - (parseInt(slot.start.split(':')[0]) + parseInt(slot.start.split(':')[1]) / 60)) / 18 * 100}%`
                                    }}
                                  />
                                </div>
                                <span>12 AM</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {!slot?.active && (
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 italic">
                            Day off
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {slot?.active && (
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingDay(null)}
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveDay(day.value, slot)}
                              disabled={saving || savingDay === day.value}
                            >
                              {savingDay === day.value ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckIcon className="w-4 h-4" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDay(day.value)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {slot?.active && isEditing && (
                    <div className="mt-4 space-y-4">
                      {/* Quick Presets */}
                      <div>
                        <Label className="text-sm font-medium">Quick Presets</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {TIME_PRESETS.map(preset => (
                            <Button
                              key={preset.name}
                              size="sm"
                              variant="outline"
                              onClick={() => applyPreset(day.value, preset)}
                              disabled={saving || savingDay === day.value}
                              className="text-xs h-8 px-3 hover:bg-primary-50 hover:border-primary-300 dark:hover:bg-primary-900/20"
                            >
                              {preset.name}
                              <span className="ml-1 text-gray-500">({preset.label})</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Time Selection with Visual Indicators */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            Start Time
                          </Label>
                          <Select
                            value={slot.start}
                            onValueChange={(value) => handleTimeChange(day.value, 'start', value)}
                            disabled={saving || savingDay === day.value}
                          >
                            <SelectTrigger className="mt-1 h-10">
                              <SelectValue className="text-base" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {TIME_OPTIONS.map(option => (
                                <SelectItem 
                                  key={option.value} 
                                  value={option.value}
                                  className="py-2 px-3 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-medium">{option.label}</span>
                                    <span className="text-xs text-gray-500 ml-2">{option.value}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-sm flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            End Time
                          </Label>
                          <Select
                            value={slot.end}
                            onValueChange={(value) => handleTimeChange(day.value, 'end', value)}
                            disabled={saving || savingDay === day.value}
                          >
                            <SelectTrigger className="mt-1 h-10">
                              <SelectValue className="text-base" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {TIME_OPTIONS.filter(t => t.value > slot.start).map(option => (
                                <SelectItem 
                                  key={option.value} 
                                  value={option.value}
                                  className="py-2 px-3 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-medium">{option.label}</span>
                                    <span className="text-xs text-gray-500 ml-2">{option.value}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Duration Indicator */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-blue-900 dark:text-blue-100">
                            Duration: {calculateDuration(slot.start, slot.end)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Helpful time validation note */}
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <span>💡</span>
                          <span>Use quick presets above or select custom times. Click the save button (✓) when ready.</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="mt-6 space-y-4">
            {/* Bulk Preset Actions */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Quick Setup</Label>
                <span className="text-xs text-gray-500">Apply presets to all days</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TIME_PRESETS.map(preset => (
                  <Button
                    key={`bulk-${preset.name}`}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const updatedSchedule = { ...schedule }
                      DAYS_OF_WEEK.forEach(day => {
                        updatedSchedule[day.value] = {
                          start: preset.start,
                          end: preset.end,
                          active: true
                        }
                      })
                      setSchedule(updatedSchedule)
                      toast({
                        title: 'Bulk Preset Applied',
                        description: `${preset.name} applied to all days. Remember to save changes.`,
                        duration: 4000
                      })
                    }}
                    disabled={saving}
                    className="text-xs h-9 flex-col hover:bg-primary-50 hover:border-primary-300 dark:hover:bg-primary-900/20"
                  >
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-gray-500">{preset.label}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Apply Current Day to All */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Copy one day's schedule to all days
              </span>
              <Button
                variant="outline"
                onClick={applyToAllDays}
                disabled={!Object.values(schedule).some(s => s.active) || saving}
              >
                {saving ? 'Saving...' : 'Copy to All Days'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Days</p>
                <p className="text-2xl font-bold">
                  {Object.values(schedule).filter(s => s.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Weekly Hours</p>
                <p className="text-2xl font-bold">
                  {calculateWeeklyHours(schedule)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <Badge variant={Object.values(schedule).some(s => s.active) ? 'success' : 'secondary'}>
                  {Object.values(schedule).some(s => s.active) ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  const diff = (end.getTime() - start.getTime()) / (1000 * 60) // minutes
  
  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  
  if (hours === 0) {
    return `${minutes}m`
  } else if (minutes === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${minutes}m`
  }
}

function calculateWeeklyHours(schedule: WeeklySchedule): string {
  let totalMinutes = 0
  
  Object.values(schedule).forEach(slot => {
    if (slot.active) {
      const start = new Date(`2000-01-01T${slot.start}`)
      const end = new Date(`2000-01-01T${slot.end}`)
      const diff = (end.getTime() - start.getTime()) / (1000 * 60)
      totalMinutes += diff
    }
  })
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}