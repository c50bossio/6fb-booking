'use client'

import { useState, useEffect } from 'react'
import { getBookingSettings, updateBookingSettings, type BookingSettings, type BookingSettingsUpdate } from '../lib/api'

interface BusinessHoursProps {
  onError: (message: string) => void
  onSuccess: (message: string) => void
}

interface TimeSlot {
  day: string
  dayIndex: number
  isOpen: boolean
  openTime: string
  closeTime: string
  breaks: Array<{ start: string; end: string }>
}

const DAYS_OF_WEEK = [
  { name: 'Monday', index: 0 },
  { name: 'Tuesday', index: 1 },
  { name: 'Wednesday', index: 2 },
  { name: 'Thursday', index: 3 },
  { name: 'Friday', index: 4 },
  { name: 'Saturday', index: 5 },
  { name: 'Sunday', index: 6 }
]

export default function BusinessHours({ onError, onSuccess }: BusinessHoursProps) {
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [businessHours, setBusinessHours] = useState<TimeSlot[]>(
    DAYS_OF_WEEK.map(day => ({
      day: day.name,
      dayIndex: day.index,
      isOpen: day.index < 5, // Default: Monday-Friday open
      openTime: '09:00',
      closeTime: '17:00',
      breaks: []
    }))
  )
  
  const [holidays, setHolidays] = useState<string[]>([])
  const [newHoliday, setNewHoliday] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [bufferTime, setBufferTime] = useState(15)
  const [slotDuration, setSlotDuration] = useState(30)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await getBookingSettings()
      setSettings(data)
      
      // Parse business hours from settings
      if (data.business_hours) {
        // Assuming business_hours is stored as JSON in settings
        try {
          const hours = JSON.parse(data.business_hours)
          setBusinessHours(hours)
        } catch {
          // Use default if parsing fails
        }
      }
      
      // Set other settings
      setSlotDuration(data.slot_duration_minutes)
      if (data.buffer_time_minutes) setBufferTime(data.buffer_time_minutes)
      if (data.timezone) setTimezone(data.timezone)
      if (data.holidays) {
        try {
          const holidayList = JSON.parse(data.holidays)
          setHolidays(holidayList)
        } catch {
          setHolidays([])
        }
      }
    } catch (err: any) {
      onError(err.message || 'Failed to load business hours')
    } finally {
      setLoading(false)
    }
  }

  const handleDayToggle = (dayIndex: number) => {
    setBusinessHours(prev => 
      prev.map(slot => 
        slot.dayIndex === dayIndex 
          ? { ...slot, isOpen: !slot.isOpen }
          : slot
      )
    )
  }

  const handleTimeChange = (dayIndex: number, field: 'openTime' | 'closeTime', value: string) => {
    setBusinessHours(prev => 
      prev.map(slot => 
        slot.dayIndex === dayIndex 
          ? { ...slot, [field]: value }
          : slot
      )
    )
  }

  const handleAddBreak = (dayIndex: number) => {
    setBusinessHours(prev => 
      prev.map(slot => 
        slot.dayIndex === dayIndex 
          ? { ...slot, breaks: [...slot.breaks, { start: '12:00', end: '13:00' }] }
          : slot
      )
    )
  }

  const handleRemoveBreak = (dayIndex: number, breakIndex: number) => {
    setBusinessHours(prev => 
      prev.map(slot => 
        slot.dayIndex === dayIndex 
          ? { ...slot, breaks: slot.breaks.filter((_, i) => i !== breakIndex) }
          : slot
      )
    )
  }

  const handleBreakTimeChange = (dayIndex: number, breakIndex: number, field: 'start' | 'end', value: string) => {
    setBusinessHours(prev => 
      prev.map(slot => 
        slot.dayIndex === dayIndex 
          ? {
              ...slot,
              breaks: slot.breaks.map((brk, i) => 
                i === breakIndex ? { ...brk, [field]: value } : brk
              )
            }
          : slot
      )
    )
  }

  const handleAddHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday])
      setNewHoliday('')
    }
  }

  const handleRemoveHoliday = (holiday: string) => {
    setHolidays(holidays.filter(h => h !== holiday))
  }

  const copyHoursToAllDays = (sourceDay: TimeSlot) => {
    setBusinessHours(prev => 
      prev.map(slot => ({
        ...slot,
        isOpen: sourceDay.isOpen,
        openTime: sourceDay.openTime,
        closeTime: sourceDay.closeTime,
        breaks: [...sourceDay.breaks]
      }))
    )
  }

  const validateBusinessHours = (): boolean => {
    for (const slot of businessHours) {
      if (slot.isOpen) {
        // Validate open/close times
        const [openHour, openMin] = slot.openTime.split(':').map(Number)
        const [closeHour, closeMin] = slot.closeTime.split(':').map(Number)
        const openMinutes = openHour * 60 + openMin
        const closeMinutes = closeHour * 60 + closeMin
        
        if (openMinutes >= closeMinutes) {
          onError(`${slot.day}: Close time must be after open time`)
          return false
        }
        
        // Validate breaks
        for (const brk of slot.breaks) {
          const [startHour, startMin] = brk.start.split(':').map(Number)
          const [endHour, endMin] = brk.end.split(':').map(Number)
          const startMinutes = startHour * 60 + startMin
          const endMinutes = endHour * 60 + endMin
          
          if (startMinutes >= endMinutes) {
            onError(`${slot.day}: Break end time must be after start time`)
            return false
          }
          
          if (startMinutes < openMinutes || endMinutes > closeMinutes) {
            onError(`${slot.day}: Break times must be within business hours`)
            return false
          }
        }
      }
    }
    return true
  }

  const handleSave = async () => {
    if (!validateBusinessHours()) return
    
    try {
      setSaving(true)
      
      const updates: BookingSettingsUpdate = {
        business_hours: JSON.stringify(businessHours),
        holidays: JSON.stringify(holidays),
        timezone,
        buffer_time_minutes: bufferTime,
        slot_duration_minutes: slotDuration
      }
      
      await updateBookingSettings(updates)
      onSuccess('Business hours updated successfully')
      loadSettings() // Reload to get updated data
    } catch (err: any) {
      onError(err.message || 'Failed to save business hours')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center">
          <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading business hours...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* General Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Phoenix">Arizona Time</option>
              <option value="America/Anchorage">Alaska Time</option>
              <option value="Pacific/Honolulu">Hawaii Time</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Slot Duration
            </label>
            <select
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buffer Time Between Appointments
            </label>
            <select
              value={bufferTime}
              onChange={(e) => setBufferTime(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>No buffer</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Weekly Schedule</h3>
          <button
            onClick={() => {
              const monday = businessHours.find(h => h.dayIndex === 0)
              if (monday) copyHoursToAllDays(monday)
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Copy Monday to all days
          </button>
        </div>
        
        <div className="space-y-4">
          {businessHours.map((slot) => (
            <div key={slot.dayIndex} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`day-${slot.dayIndex}`}
                    checked={slot.isOpen}
                    onChange={() => handleDayToggle(slot.dayIndex)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`day-${slot.dayIndex}`} className="ml-3 text-sm font-medium text-gray-700">
                    {slot.day}
                  </label>
                </div>
                
                {slot.isOpen && (
                  <button
                    onClick={() => handleAddBreak(slot.dayIndex)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add break
                  </button>
                )}
              </div>
              
              {slot.isOpen && (
                <>
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Open</label>
                      <input
                        type="time"
                        value={slot.openTime}
                        onChange={(e) => handleTimeChange(slot.dayIndex, 'openTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Close</label>
                      <input
                        type="time"
                        value={slot.closeTime}
                        onChange={(e) => handleTimeChange(slot.dayIndex, 'closeTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {slot.breaks.length > 0 && (
                    <div className="pl-7 space-y-2">
                      <p className="text-xs text-gray-500 mb-1">Breaks</p>
                      {slot.breaks.map((brk, breakIndex) => (
                        <div key={breakIndex} className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={brk.start}
                            onChange={(e) => handleBreakTimeChange(slot.dayIndex, breakIndex, 'start', e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={brk.end}
                            onChange={(e) => handleBreakTimeChange(slot.dayIndex, breakIndex, 'end', e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleRemoveBreak(slot.dayIndex, breakIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Holidays */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Holidays & Special Dates</h3>
        <div className="mb-4">
          <div className="flex space-x-2">
            <input
              type="date"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Select date"
            />
            <button
              onClick={handleAddHoliday}
              disabled={!newHoliday}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Holiday
            </button>
          </div>
        </div>
        
        {holidays.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {holidays.map((holiday) => (
              <span
                key={holiday}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
              >
                {new Date(holiday).toLocaleDateString()}
                <button
                  onClick={() => handleRemoveHoliday(holiday)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Business Hours'}
          </button>
        </div>
      </div>
    </div>
  )
}