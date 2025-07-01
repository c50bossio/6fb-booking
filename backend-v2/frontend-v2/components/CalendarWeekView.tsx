'use client'

import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay, addHours, addMinutes } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { parseAPIDate } from '@/lib/timezone'
import Image from 'next/image'
import ClientDetailModal from './modals/ClientDetailModal'

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  service_name: string
  client_name?: string
  client_email?: string
  client_phone?: string
  barber_id?: number
  barber_name?: string
  status: string
  duration_minutes?: number
}

interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  role?: string
}

interface CalendarWeekViewProps {
  appointments: Appointment[]
  barbers?: Barber[]
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  onAppointmentClick?: (appointment: Appointment) => void
  onClientClick?: (client: any) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string) => void
  clients?: any[]
  startHour?: number
  endHour?: number
  slotDuration?: number
  currentDate?: Date
  onDateChange?: (date: Date) => void
}

export default function CalendarWeekView({
  appointments,
  barbers = [],
  selectedBarberId = 'all',
  onBarberSelect,
  onAppointmentClick,
  onClientClick,
  onTimeSlotClick,
  onAppointmentUpdate,
  clients = [],
  startHour = 8,
  endHour = 19,
  slotDuration = 30,
  currentDate = new Date(),
  onDateChange
}: CalendarWeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(() => currentDate)
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ day: Date; hour: number; minute: number } | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)

  // Sync currentWeek with currentDate prop changes
  useEffect(() => {
    if (!isSameDay(currentWeek, currentDate)) {
      setCurrentWeek(currentDate)
    }
  }, [currentDate, currentWeek])

  // Get week start and end dates
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  // Generate time slots
  const timeSlots: { hour: number; minute: number }[] = []
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      timeSlots.push({ hour, minute })
    }
  }

  // Generate week days
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(weekStart, i))
  }

  // Filter appointments by selected barber
  const filteredAppointments = selectedBarberId === 'all' 
    ? appointments 
    : appointments.filter(apt => apt.barber_id === selectedBarberId)

  // Navigate weeks
  const previousWeek = () => {
    const newDate = addDays(currentWeek, -7)
    setCurrentWeek(newDate)
    onDateChange?.(newDate)
  }

  const nextWeek = () => {
    const newDate = addDays(currentWeek, 7)
    setCurrentWeek(newDate)
    onDateChange?.(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentWeek(today)
    onDateChange?.(today)
  }

  // Get appointment position and height
  const getAppointmentStyle = (appointment: Appointment) => {
    const start = parseAPIDate(appointment.start_time)
    let end: Date
    
    if (appointment.end_time) {
      end = parseAPIDate(appointment.end_time)
    } else if (appointment.duration_minutes) {
      end = addMinutes(start, appointment.duration_minutes)
    } else {
      // Default to 30 minutes if no end time or duration
      end = addMinutes(start, 30)
    }
    
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    const slotStartMinutes = startHour * 60
    
    const top = ((startMinutes - slotStartMinutes) / slotDuration) * 48 // 48px per slot
    const height = ((endMinutes - startMinutes) / slotDuration) * 48
    
    return {
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`, // Minimum height of 20px
    }
  }

  // Check if appointment is on a specific day
  const isAppointmentOnDay = (appointment: Appointment, day: Date) => {
    return isSameDay(parseAPIDate(appointment.start_time), day)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-500 hover:bg-green-600'
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600'
      case 'completed':
        return 'bg-blue-500 hover:bg-blue-600'
      default:
        return 'bg-purple-500 hover:bg-purple-600'
    }
  }

  // Format barber name
  const getBarberName = (barber: Barber) => {
    return barber.name || 
           (barber.first_name && barber.last_name ? `${barber.first_name} ${barber.last_name}` : '') ||
           barber.email.split('@')[0]
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Header section */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        {/* Barber Filter */}
        {barbers.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => onBarberSelect?.('all')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  selectedBarberId === 'all' ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                  All
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">All Staff</span>
              </button>
              
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => onBarberSelect?.(barber.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                    selectedBarberId === barber.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden">
                    {barber.avatar ? (
                      <Image src={barber.avatar} alt={getBarberName(barber)} width={48} height={48} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 font-semibold">
                        {getBarberName(barber).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{getBarberName(barber)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={previousWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={goToToday}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Today
            </button>
            <h3 className="text-lg font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'd, yyyy')}
            </h3>
          </div>
          
          <button onClick={nextWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="flex">
            {/* Time column */}
            <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
              <div className="h-12 border-b border-gray-200 dark:border-gray-700"></div>
              {timeSlots.map((slot, idx) => (
                <div 
                  key={idx} 
                  className="h-12 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 p-2 text-right"
                >
                  {slot.minute === 0 && (
                    `${slot.hour === 12 ? 12 : slot.hour % 12}:00 ${slot.hour < 12 ? 'am' : 'pm'}`
                  )}
                </div>
              ))}
            </div>

            {/* Days columns */}
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map((day, dayIdx) => (
                <div key={dayIdx} className="border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                  {/* Day header */}
                  <div className="h-12 border-b border-gray-200 dark:border-gray-700 p-2 text-center">
                    <div className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-xs ${isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  
                  {/* Time slots */}
                  <div className="relative">
                    {timeSlots.map((slot, idx) => (
                      <div 
                        key={idx}
                        className={`h-12 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                          dragOverSlot && 
                          isSameDay(dragOverSlot.day, day) && 
                          dragOverSlot.hour === slot.hour && 
                          dragOverSlot.minute === slot.minute
                            ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500 ring-inset'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => {
                          const slotDate = new Date(day)
                          slotDate.setHours(slot.hour, slot.minute, 0, 0)
                          if (selectedBarberId !== 'all') {
                            onTimeSlotClick?.(slotDate, selectedBarberId as number)
                          } else {
                            onTimeSlotClick?.(slotDate)
                          }
                        }}
                        onDragOver={(e) => {
                          if (draggedAppointment) {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            setDragOverSlot({ day, hour: slot.hour, minute: slot.minute })
                          }
                        }}
                        onDragLeave={() => {
                          setDragOverSlot(null)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (draggedAppointment && onAppointmentUpdate) {
                            const newDate = new Date(day)
                            newDate.setHours(slot.hour, slot.minute, 0, 0)
                            
                            // Check if the new time is valid (not in the past)
                            if (newDate > new Date()) {
                              onAppointmentUpdate(draggedAppointment.id, newDate.toISOString())
                            }
                          }
                          setDraggedAppointment(null)
                          setDragOverSlot(null)
                        }}
                      />
                    ))}
                    
                    {/* Appointments */}
                    {filteredAppointments
                      .filter(apt => isAppointmentOnDay(apt, day))
                      .map((appointment) => (
                        <div
                          key={appointment.id}
                          draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                          className={`absolute left-1 right-1 rounded cursor-pointer transition-all text-white p-1 text-xs overflow-hidden ${
                            getStatusColor(appointment.status)
                          } ${
                            draggedAppointment?.id === appointment.id ? 'opacity-50' : ''
                          } ${
                            appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                              ? 'cursor-move hover:shadow-lg hover:z-10' 
                              : 'cursor-pointer'
                          }`}
                          style={getAppointmentStyle(appointment)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick?.(appointment)
                          }}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            setDraggedAppointment(appointment)
                          }}
                          onDragEnd={() => {
                            setDraggedAppointment(null)
                            setDragOverSlot(null)
                          }}
                        >
                          <div 
                            className="font-semibold truncate hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Find client by name and open detail modal
                              const client = clients.find(c => 
                                `${c.first_name} ${c.last_name}` === appointment.client_name ||
                                c.email === appointment.client_email
                              )
                              if (client) {
                                setSelectedClient(client)
                                setShowClientModal(true)
                              }
                            }}
                          >
                            {appointment.client_name || 'Client'}
                          </div>
                          <div className="truncate opacity-90">{appointment.service_name}</div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Cancelled</span>
        </div>
        <div className="text-gray-500 ml-6">
          💡 Click client names to view details
        </div>
      </div>

      {/* Client Detail Modal */}
      <ClientDetailModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
        appointments={appointments}
        onEdit={(client) => {
          // Handle edit client
          onClientClick?.(client)
        }}
        onBookAppointment={(clientId) => {
          // Handle book appointment for client
          setShowClientModal(false)
          // Could trigger appointment modal here
        }}
      />
    </div>
  )
}