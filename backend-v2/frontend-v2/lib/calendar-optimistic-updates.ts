/**
 * Calendar Optimistic Updates Manager
 * Handles optimistic updates for calendar operations with proper rollback
 */

import { requestDeduplicationManager, type RequestConfig } from './request-deduplication'
import type { Appointment } from '@/types/calendar'
import type { BookingResponse } from '@/lib/api'

export interface CalendarOperation {
  type: 'create' | 'update' | 'delete' | 'reschedule' | 'cancel'
  appointmentId?: number
  appointment?: Partial<Appointment>
  originalAppointment?: Appointment
  optimisticData?: any
}

export interface CalendarState {
  appointments: BookingResponse[]
  loading: boolean
  error: string | null
  lastUpdated: number
}

/**
 * Calendar Optimistic Updates Manager
 */
export class CalendarOptimisticManager {
  private static instance: CalendarOptimisticManager
  private stateSubscribers = new Set<(state: CalendarState) => void>()
  private currentState: CalendarState = {
    appointments: [],
    loading: false,
    error: null,
    lastUpdated: Date.now()
  }

  private constructor() {}

  static getInstance(): CalendarOptimisticManager {
    if (!CalendarOptimisticManager.instance) {
      CalendarOptimisticManager.instance = new CalendarOptimisticManager()
    }
    return CalendarOptimisticManager.instance
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: CalendarState) => void): () => void {
    this.stateSubscribers.add(callback)
    return () => this.stateSubscribers.delete(callback)
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(updates: Partial<CalendarState>): void {
    this.currentState = {
      ...this.currentState,
      ...updates,
      lastUpdated: Date.now()
    }
    
    this.stateSubscribers.forEach(callback => {
      try {
        callback(this.currentState)
      } catch (error) {
        }
    })
  }

  /**
   * Get current state
   */
  getState(): CalendarState {
    return { ...this.currentState }
  }

  /**
   * Set initial appointments
   */
  setAppointments(appointments: BookingResponse[]): void {
    this.updateState({ appointments, error: null })
  }

  /**
   * Create appointment with optimistic update
   */
  async createAppointment(
    appointmentData: Partial<Appointment>,
    apiCall: () => Promise<BookingResponse>
  ): Promise<BookingResponse> {
    const tempId = Date.now() // Temporary ID for optimistic update
    const optimisticAppointment = {
      id: tempId,
      user_id: 0, // Will be set by server
      start_time: appointmentData.start_time || new Date().toISOString(),
      end_time: appointmentData.end_time || new Date().toISOString(),
      status: 'pending',
      price: appointmentData.price || 0,
      duration_minutes: appointmentData.duration_minutes || 60,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service_name: appointmentData.service_name || 'New Service',
      barber_name: appointmentData.barber_name || 'Unknown Barber',
      client_name: appointmentData.client_name || 'New Client',
      client_email: appointmentData.client_email || '',
      client_phone: appointmentData.client_phone || '',
      notes: appointmentData.notes || '',
      ...appointmentData
    } as BookingResponse

    // Store original state for rollback
    const originalAppointments = [...this.currentState.appointments]

    return requestDeduplicationManager.executeRequest<BookingResponse>(
      {
        key: `create-appointment-${Date.now()}`,
        endpoint: '/appointments',
        method: 'POST',
        data: appointmentData,
        optimistic: true
      },
      apiCall,
      // Optimistic update
      () => {
        const updatedAppointments = [...this.currentState.appointments, optimisticAppointment]
        this.updateState({ 
          appointments: updatedAppointments,
          loading: true,
          error: null 
        })
        },
      // Rollback
      () => {
        this.updateState({ 
          appointments: originalAppointments,
          loading: false,
          error: 'Failed to create appointment'
        })
        }
    ).then(result => {
      // Replace optimistic appointment with real one
      const updatedAppointments = this.currentState.appointments.map(apt => 
        apt.id === tempId ? result : apt
      )
      
      this.updateState({ 
        appointments: updatedAppointments,
        loading: false,
        error: null 
      })
      
      return result
    })
  }

  /**
   * Update appointment with optimistic update
   */
  async updateAppointment(
    appointmentId: number,
    updates: Partial<Appointment>,
    apiCall: () => Promise<BookingResponse>
  ): Promise<BookingResponse> {
    // Find original appointment
    const originalAppointment = this.currentState.appointments.find(apt => apt.id === appointmentId)
    if (!originalAppointment) {
      throw new Error('Appointment not found')
    }

    // Create optimistic updated appointment
    const optimisticAppointment = { ...originalAppointment, ...updates }
    const originalAppointments = [...this.currentState.appointments]

    return requestDeduplicationManager.executeRequest<BookingResponse>(
      {
        key: `update-appointment-${appointmentId}`,
        endpoint: `/appointments/${appointmentId}`,
        method: 'PUT',
        data: updates,
        optimistic: true
      },
      apiCall,
      // Optimistic update
      () => {
        const updatedAppointments = this.currentState.appointments.map(apt =>
          apt.id === appointmentId ? optimisticAppointment : apt
        )
        this.updateState({ 
          appointments: updatedAppointments,
          loading: true,
          error: null 
        })
        },
      // Rollback
      () => {
        this.updateState({ 
          appointments: originalAppointments,
          loading: false,
          error: 'Failed to update appointment'
        })
        }
    ).then(result => {
      // Update with real result
      const updatedAppointments = this.currentState.appointments.map(apt =>
        apt.id === appointmentId ? result : apt
      )
      
      this.updateState({ 
        appointments: updatedAppointments,
        loading: false,
        error: null 
      })
      
      return result
    })
  }

  /**
   * Delete appointment with optimistic update
   */
  async deleteAppointment(
    appointmentId: number,
    apiCall: () => Promise<void>
  ): Promise<void> {
    // Find original appointment
    const originalAppointment = this.currentState.appointments.find(apt => apt.id === appointmentId)
    if (!originalAppointment) {
      throw new Error('Appointment not found')
    }

    const originalAppointments = [...this.currentState.appointments]

    return requestDeduplicationManager.executeRequest<void>(
      {
        key: `delete-appointment-${appointmentId}`,
        endpoint: `/appointments/${appointmentId}`,
        method: 'DELETE',
        optimistic: true
      },
      apiCall,
      // Optimistic update
      () => {
        const updatedAppointments = this.currentState.appointments.filter(apt => apt.id !== appointmentId)
        this.updateState({ 
          appointments: updatedAppointments,
          loading: true,
          error: null 
        })
        },
      // Rollback
      () => {
        this.updateState({ 
          appointments: originalAppointments,
          loading: false,
          error: 'Failed to delete appointment'
        })
        }
    ).then(() => {
      // Confirm deletion
      this.updateState({ 
        loading: false,
        error: null 
      })
    })
  }

  /**
   * Reschedule appointment with optimistic update
   */
  async rescheduleAppointment(
    appointmentId: number,
    newStartTime: string,
    apiCall: () => Promise<BookingResponse>,
    newEndTime?: string
  ): Promise<BookingResponse> {
    // Find original appointment
    const originalAppointment = this.currentState.appointments.find(apt => apt.id === appointmentId)
    if (!originalAppointment) {
      throw new Error('Appointment not found')
    }

    // Create optimistic rescheduled appointment
    const optimisticAppointment = {
      ...originalAppointment,
      start_time: newStartTime,
      end_time: newEndTime || this.calculateEndTime(newStartTime, originalAppointment),
      updated_at: new Date().toISOString()
    }

    const originalAppointments = [...this.currentState.appointments]

    return requestDeduplicationManager.executeRequest<BookingResponse>(
      {
        key: `reschedule-appointment-${appointmentId}`,
        endpoint: `/appointments/${appointmentId}/reschedule`,
        method: 'POST',
        data: { start_time: newStartTime, end_time: newEndTime },
        optimistic: true
      },
      apiCall,
      // Optimistic update
      () => {
        const updatedAppointments = this.currentState.appointments.map(apt =>
          apt.id === appointmentId ? optimisticAppointment : apt
        )
        this.updateState({ 
          appointments: updatedAppointments,
          loading: true,
          error: null 
        })
        },
      // Rollback
      () => {
        this.updateState({ 
          appointments: originalAppointments,
          loading: false,
          error: 'Failed to reschedule appointment'
        })
        }
    ).then(result => {
      // Update with real result
      const updatedAppointments = this.currentState.appointments.map(apt =>
        apt.id === appointmentId ? result : apt
      )
      
      this.updateState({ 
        appointments: updatedAppointments,
        loading: false,
        error: null 
      })
      
      return result
    })
  }

  /**
   * Cancel appointment with optimistic update
   */
  async cancelAppointment(
    appointmentId: number,
    apiCall: () => Promise<BookingResponse>
  ): Promise<BookingResponse> {
    // Find original appointment
    const originalAppointment = this.currentState.appointments.find(apt => apt.id === appointmentId)
    if (!originalAppointment) {
      throw new Error('Appointment not found')
    }

    // Create optimistic cancelled appointment
    const optimisticAppointment = {
      ...originalAppointment,
      status: 'cancelled' as const,
      updated_at: new Date().toISOString()
    }

    const originalAppointments = [...this.currentState.appointments]

    return requestDeduplicationManager.executeRequest<BookingResponse>(
      {
        key: `cancel-appointment-${appointmentId}`,
        endpoint: `/appointments/${appointmentId}/cancel`,
        method: 'POST',
        optimistic: true
      },
      apiCall,
      // Optimistic update
      () => {
        const updatedAppointments = this.currentState.appointments.map(apt =>
          apt.id === appointmentId ? optimisticAppointment : apt
        )
        this.updateState({ 
          appointments: updatedAppointments,
          loading: true,
          error: null 
        })
        },
      // Rollback
      () => {
        this.updateState({ 
          appointments: originalAppointments,
          loading: false,
          error: 'Failed to cancel appointment'
        })
        }
    ).then(result => {
      // Update with real result
      const updatedAppointments = this.currentState.appointments.map(apt =>
        apt.id === appointmentId ? result : apt
      )
      
      this.updateState({ 
        appointments: updatedAppointments,
        loading: false,
        error: null 
      })
      
      return result
    })
  }

  /**
   * Refresh appointments (clears optimistic updates)
   */
  async refreshAppointments(apiCall: () => Promise<{ bookings: BookingResponse[] }>): Promise<void> {
    this.updateState({ loading: true, error: null })

    try {
      const result = await requestDeduplicationManager.executeRequest(
        {
          key: 'get-appointments',
          endpoint: '/my-bookings',
          method: 'GET'
        },
        apiCall
      )

      this.updateState({
        appointments: result.bookings || [],
        loading: false,
        error: null
      })
    } catch (error) {
      this.updateState({
        loading: false,
        error: 'Failed to refresh appointments'
      })
      throw error
    }
  }

  /**
   * Batch operations with optimistic updates
   */
  async batchOperations(
    operations: Array<{
      type: 'create' | 'update' | 'delete'
      appointmentId?: number
      data?: any
      apiCall: () => Promise<any>
    }>
  ): Promise<any[]> {
    const originalAppointments = [...this.currentState.appointments]
    const results: any[] = []

    try {
      this.updateState({ loading: true, error: null })

      // Apply all optimistic updates first
      let currentAppointments = [...originalAppointments]
      
      operations.forEach((op, index) => {
        switch (op.type) {
          case 'create':
            const tempAppointment = {
              id: Date.now() + index, // Unique temp ID
              ...op.data,
              status: 'pending'
            } as BookingResponse
            currentAppointments.push(tempAppointment)
            break
            
          case 'update':
            currentAppointments = currentAppointments.map(apt =>
              apt.id === op.appointmentId ? { ...apt, ...op.data } : apt
            )
            break
            
          case 'delete':
            currentAppointments = currentAppointments.filter(apt => apt.id !== op.appointmentId)
            break
        }
      })

      this.updateState({ appointments: currentAppointments })

      // Execute all API calls
      for (const operation of operations) {
        try {
          const result = await operation.apiCall()
          results.push(result)
        } catch (error) {
          // Rollback all changes on any failure
          this.updateState({ 
            appointments: originalAppointments,
            loading: false,
            error: 'Batch operation failed'
          })
          throw error
        }
      }

      // Success - refresh to get accurate state
      await this.refreshAppointments(() => 
        Promise.resolve({ bookings: currentAppointments })
      )

      return results

    } catch (error) {
      // Rollback on error
      this.updateState({ 
        appointments: originalAppointments,
        loading: false,
        error: 'Batch operation failed'
      })
      throw error
    }
  }

  /**
   * Helper to calculate end time based on start time and original appointment
   */
  private calculateEndTime(startTime: string, originalAppointment: BookingResponse): string {
    const start = new Date(startTime)
    
    // If original appointment has end_time, calculate based on duration
    if (originalAppointment.end_time) {
      const originalStart = new Date(originalAppointment.start_time)
      const originalEnd = new Date(originalAppointment.end_time)
      const duration = originalEnd.getTime() - originalStart.getTime()
      return new Date(start.getTime() + duration).toISOString()
    }
    
    // Otherwise use duration_minutes if available, default to 60 minutes
    const durationMinutes = originalAppointment.duration_minutes || 60
    return new Date(start.getTime() + durationMinutes * 60000).toISOString()
  }
}

// Export singleton instance
export const calendarOptimisticManager = CalendarOptimisticManager.getInstance()

// React hook for using optimistic updates
import { useState, useEffect } from 'react'

export function useCalendarOptimisticUpdates() {
  const [state, setState] = useState<CalendarState>(() => calendarOptimisticManager.getState())

  useEffect(() => {
    const unsubscribe = calendarOptimisticManager.subscribe(setState)
    return unsubscribe
  }, [])

  return {
    ...state,
    createAppointment: calendarOptimisticManager.createAppointment.bind(calendarOptimisticManager),
    updateAppointment: calendarOptimisticManager.updateAppointment.bind(calendarOptimisticManager),
    deleteAppointment: calendarOptimisticManager.deleteAppointment.bind(calendarOptimisticManager),
    rescheduleAppointment: calendarOptimisticManager.rescheduleAppointment.bind(calendarOptimisticManager),
    cancelAppointment: calendarOptimisticManager.cancelAppointment.bind(calendarOptimisticManager),
    refreshAppointments: calendarOptimisticManager.refreshAppointments.bind(calendarOptimisticManager),
    setAppointments: calendarOptimisticManager.setAppointments.bind(calendarOptimisticManager)
  }
}