'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import PremiumCalendar, { CalendarAppointment } from './PremiumCalendar'
import AppointmentCreateModal, { AppointmentFormData, Service, Barber } from './AppointmentCreateModal'
import AppointmentDetailsModal from './AppointmentDetailsModal'
import DragDropCalendar from './DragDropCalendar'
import { appointmentsService } from '../../lib/api/appointments'
import { bookingService } from '../../lib/api/bookings'
import {
  generateMockCalendarData,
  generateTodayAppointments,
  generateComprehensiveDemoData,
  isDemoMode,
  getMockBarbers,
  getMockServices
} from '../../utils/mockCalendarData'

interface CalendarSystemProps {
  initialView?: 'month' | 'week' | 'day'
  initialDate?: Date
  locationId?: number
  barberId?: number
  enableDragDrop?: boolean
  darkMode?: boolean
  onAppointmentCreate?: (appointment: CalendarAppointment) => void
  onAppointmentUpdate?: (appointment: CalendarAppointment) => void
  onAppointmentDelete?: (appointmentId: string) => void
}

// Convert backend appointment to calendar appointment
const convertToCalendarAppointment = (apiAppointment: any): CalendarAppointment => {
  return {
    id: apiAppointment.id?.toString() || '',
    title: apiAppointment.service_name || apiAppointment.title || '',
    client: apiAppointment.client_name || apiAppointment.client || '',
    clientId: apiAppointment.client_id,
    barber: apiAppointment.barber?.name || apiAppointment.barber || '',
    barberId: apiAppointment.barber_id || apiAppointment.barberId || 1,
    startTime: apiAppointment.appointment_time || apiAppointment.startTime || '',
    endTime: calculateEndTime(
      apiAppointment.appointment_time || apiAppointment.startTime || '',
      apiAppointment.service_duration || apiAppointment.duration || 60
    ),
    service: apiAppointment.service_name || apiAppointment.service || '',
    serviceId: apiAppointment.service_id || apiAppointment.serviceId,
    price: apiAppointment.service_price || apiAppointment.price || 0,
    status: mapStatus(apiAppointment.status),
    date: apiAppointment.appointment_date || apiAppointment.date || '',
    notes: apiAppointment.notes || '',
    duration: apiAppointment.service_duration || apiAppointment.duration || 60,
    clientPhone: apiAppointment.client_phone || apiAppointment.clientPhone,
    clientEmail: apiAppointment.client_email || apiAppointment.clientEmail
  }
}

// Map backend status to calendar status
const mapStatus = (status: string): CalendarAppointment['status'] => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'confirmed'
    case 'completed':
      return 'completed'
    case 'pending':
      return 'pending'
    case 'cancelled':
    case 'canceled':
      return 'cancelled'
    case 'no_show':
    case 'no-show':
      return 'no_show'
    default:
      return 'pending'
  }
}

// Calculate end time from start time and duration
const calculateEndTime = (startTime: string, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)

  const endDate = new Date(startDate.getTime() + duration * 60000)
  return endDate.toTimeString().slice(0, 5)
}

export default function CalendarSystem({
  initialView = 'week',
  initialDate = new Date(),
  locationId,
  barberId,
  enableDragDrop = true,
  darkMode = true,
  onAppointmentCreate,
  onAppointmentUpdate,
  onAppointmentDelete
}: CalendarSystemProps) {
  // State management
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)
  const [createModalData, setCreateModalData] = useState<{ date: string; time: string }>({ date: '', time: '' })

  // Refresh interval for real-time updates
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Load initial data
  useEffect(() => {
    loadInitialData()

    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      loadAppointments()
    }, 30000)

    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [locationId, barberId])

  const loadInitialData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await Promise.all([
        loadAppointments(),
        loadBarbers(),
        loadServices()
      ])
    } catch (err) {
      console.error('Error loading initial data:', err)
      setError('Failed to load calendar data')
      toast.error('Failed to load calendar data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAppointments = async () => {
    try {
      // Check if we're in demo mode
      if (isDemoMode()) {
        // Generate comprehensive demo data including drag & drop test scenarios
        const comprehensiveData = generateComprehensiveDemoData()
        setAppointments(comprehensiveData)
        return
      }

      // Get appointments for the current period
      const today = new Date()
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)

      const filters = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        ...(barberId && { barber_id: barberId }),
        ...(locationId && { location_id: locationId })
      }

      const apiAppointments = await appointmentsService.getAppointments(filters)
      const calendarAppointments = apiAppointments.map(convertToCalendarAppointment)

      setAppointments(calendarAppointments)
    } catch (err) {
      console.error('Error loading appointments:', err)
      throw err
    }
  }

  const loadBarbers = async () => {
    try {
      // Use mock data in demo mode
      if (isDemoMode()) {
        setBarbers(getMockBarbers())
        return
      }

      if (locationId) {
        const response = await bookingService.getBarbers(locationId)
        const barbersData = response.data.map((barber: any) => ({
          id: barber.id,
          name: barber.name,
          specialties: barber.specialties || [],
          rating: barber.rating
        }))
        setBarbers(barbersData)
      } else {
        // Default barbers if no location specified
        setBarbers([
          { id: 1, name: 'Marcus Johnson', specialties: ['Fades', 'Beard Styling'], rating: 4.9 },
          { id: 2, name: 'Sarah Mitchell', specialties: ['Classic Cuts', 'Kids Cuts'], rating: 4.8 }
        ])
      }
    } catch (err) {
      console.error('Error loading barbers:', err)
      // Set default barbers on error
      setBarbers([
        { id: 1, name: 'Marcus Johnson', specialties: ['Fades', 'Beard Styling'], rating: 4.9 },
        { id: 2, name: 'Sarah Mitchell', specialties: ['Classic Cuts', 'Kids Cuts'], rating: 4.8 }
      ])
    }
  }

  const loadServices = async () => {
    try {
      // Use mock data in demo mode
      if (isDemoMode()) {
        setServices(getMockServices())
        return
      }

      const response = await bookingService.getServices({
        ...(barberId && { barber_id: barberId }),
        active_only: true
      })

      const servicesData = response.data.map((service: any) => ({
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price,
        description: service.description
      }))

      setServices(servicesData)
    } catch (err) {
      console.error('Error loading services:', err)
      // Set default services on error
      setServices([
        { id: 1, name: 'Classic Haircut', duration: 45, price: 35, description: 'Traditional scissors cut with styling' },
        { id: 2, name: 'Fade Cut', duration: 60, price: 45, description: 'Modern fade with blend styling' },
        { id: 3, name: 'Beard Trim', duration: 30, price: 25, description: 'Professional beard shaping and styling' },
        { id: 4, name: 'Premium Cut & Beard', duration: 75, price: 65, description: 'Complete grooming experience' }
      ])
    }
  }

  // Event handlers
  const handleTimeSlotClick = useCallback((date: string, time: string) => {
    setCreateModalData({ date, time })
    setShowCreateModal(true)
  }, [])

  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment)
    setShowDetailsModal(true)
  }, [])

  const handleCreateAppointment = useCallback(async (formData: AppointmentFormData) => {
    try {
      const appointmentData = {
        barber_id: formData.barberId,
        client_name: formData.clientName,
        client_email: formData.clientEmail,
        client_phone: formData.clientPhone,
        appointment_date: formData.date,
        appointment_time: formData.startTime,
        service_name: services.find(s => s.id === formData.serviceId)?.name || '',
        service_duration: formData.duration,
        service_price: formData.price,
        notes: formData.notes || ''
      }

      const newAppointment = await appointmentsService.createAppointment(appointmentData)
      const calendarAppointment = convertToCalendarAppointment(newAppointment)

      setAppointments(prev => [...prev, calendarAppointment])
      onAppointmentCreate?.(calendarAppointment)

      toast.success('Appointment created successfully!')
      setShowCreateModal(false)
    } catch (err) {
      console.error('Error creating appointment:', err)
      toast.error('Failed to create appointment')
      throw err
    }
  }, [services, onAppointmentCreate])

  const handleUpdateAppointment = useCallback(async (updatedAppointment: CalendarAppointment) => {
    try {
      const updateData = {
        appointment_date: updatedAppointment.date,
        appointment_time: updatedAppointment.startTime,
        service_revenue: updatedAppointment.price,
        notes: updatedAppointment.notes
      }

      await appointmentsService.updateAppointment(parseInt(updatedAppointment.id), updateData)

      setAppointments(prev =>
        prev.map(apt => apt.id === updatedAppointment.id ? updatedAppointment : apt)
      )

      onAppointmentUpdate?.(updatedAppointment)
      toast.success('Appointment updated successfully!')
      setShowDetailsModal(false)
    } catch (err) {
      console.error('Error updating appointment:', err)
      toast.error('Failed to update appointment')
      throw err
    }
  }, [onAppointmentUpdate])

  const handleDeleteAppointment = useCallback(async (appointmentId: string) => {
    try {
      await appointmentsService.cancelAppointment(parseInt(appointmentId))

      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
      onAppointmentDelete?.(appointmentId)

      toast.success('Appointment deleted successfully!')
      setShowDetailsModal(false)
    } catch (err) {
      console.error('Error deleting appointment:', err)
      toast.error('Failed to delete appointment')
      throw err
    }
  }, [onAppointmentDelete])

  const handleStatusChange = useCallback(async (appointmentId: string, newStatus: CalendarAppointment['status']) => {
    try {
      await appointmentsService.updateAppointment(parseInt(appointmentId), { status: newStatus })

      setAppointments(prev =>
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: newStatus } : apt)
      )

      toast.success(`Appointment status updated to ${newStatus}`)
    } catch (err) {
      console.error('Error updating appointment status:', err)
      toast.error('Failed to update appointment status')
      throw err
    }
  }, [])

  const handleAppointmentMove = useCallback(async (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => {
    try {
      const updateData = {
        appointment_date: newDate,
        appointment_time: newTime
      }

      await appointmentsService.updateAppointment(parseInt(appointmentId), updateData)

      setAppointments(prev =>
        prev.map(apt => {
          if (apt.id === appointmentId) {
            return {
              ...apt,
              date: newDate,
              startTime: newTime,
              endTime: calculateEndTime(newTime, apt.duration)
            }
          }
          return apt
        })
      )

      toast.success('Appointment moved successfully!')
    } catch (err) {
      console.error('Error moving appointment:', err)
      toast.error('Failed to move appointment')
      throw err
    }
  }, [])

  if (error) {
    return (
      <div className="p-6 bg-gray-900 rounded-xl text-center">
        <div className="text-red-400 mb-4">
          <p className="text-lg font-semibold">Error Loading Calendar</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={loadInitialData}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Demo Mode Indicator */}
      {isDemoMode() && (
        <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-400/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
            <span className="text-violet-300 text-sm font-medium">
              Demo Mode - Showing sample appointment data
            </span>
          </div>
        </div>
      )}

      {/* Calendar Component */}
      {enableDragDrop ? (
        <DragDropCalendar
          appointments={appointments}
          onAppointmentClick={handleAppointmentClick}
          onTimeSlotClick={handleTimeSlotClick}
          onCreateAppointment={handleTimeSlotClick}
          onAppointmentMove={handleAppointmentMove}
          initialView={initialView}
          initialDate={initialDate}
          darkMode={darkMode}
          isLoading={isLoading}
          barbers={barbers}
          services={services}
          enableDragDrop={enableDragDrop}
        />
      ) : (
        <PremiumCalendar
          appointments={appointments}
          onAppointmentClick={handleAppointmentClick}
          onTimeSlotClick={handleTimeSlotClick}
          onCreateAppointment={handleTimeSlotClick}
          initialView={initialView}
          initialDate={initialDate}
          darkMode={darkMode}
          isLoading={isLoading}
          barbers={barbers}
          services={services}
        />
      )}

      {/* Create Appointment Modal */}
      <AppointmentCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAppointment}
        initialDate={createModalData.date}
        initialTime={createModalData.time}
        barbers={barbers}
        services={services}
        isLoading={isLoading}
      />

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        appointment={selectedAppointment}
        onUpdate={handleUpdateAppointment}
        onDelete={handleDeleteAppointment}
        onStatusChange={handleStatusChange}
        barbers={barbers}
        services={services}
        isLoading={isLoading}
        canEdit={true}
        canDelete={true}
      />
    </div>
  )
}
