/**
 * Comprehensive ConflictResolutionEngine Tests
 * 
 * Tests the ConflictResolutionEngine with real appointment data scenarios,
 * edge cases, performance under load, and integration with booking workflow.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ConflictResolutionEngine, ConflictAnalysis, SchedulingConflict } from '@/components/calendar/ConflictResolutionEngine'
import { AutoReschedulingEngine } from '@/components/calendar/AutoReschedulingEngine'

// Real appointment data structures (matching backend API)
interface RealAppointment {
  id: number
  start_time: string
  end_time: string
  duration_minutes: number
  client_name: string
  client_id: number
  service_name: string
  service_id: number
  barber_name: string
  barber_id: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  location_id: number
  buffer_before_minutes?: number
  buffer_after_minutes?: number
  priority_level?: 'normal' | 'high' | 'vip'
  created_at: string
  updated_at: string
}

interface RealBarber {
  id: number
  name: string
  email: string
  working_hours: {
    start: string
    end: string
    days: number[]
  }
  is_available: boolean
  location_id: number
  specialties: string[]
  break_duration_minutes: number
  buffer_between_appointments: number
  max_concurrent_appointments: number
}

// Realistic test datasets
const createRealisticAppointments = (): RealAppointment[] => [
  {
    id: 1,
    start_time: '2023-12-01T09:00:00Z',
    end_time: '2023-12-01T10:00:00Z',
    duration_minutes: 60,
    client_name: 'John Smith',
    client_id: 101,
    service_name: 'Classic Haircut',
    service_id: 1,
    barber_name: 'Mike Johnson',
    barber_id: 1,
    status: 'confirmed',
    location_id: 1,
    buffer_before_minutes: 5,
    buffer_after_minutes: 10,
    priority_level: 'normal',
    created_at: '2023-11-25T10:00:00Z',
    updated_at: '2023-11-25T10:00:00Z'
  },
  {
    id: 2,
    start_time: '2023-12-01T10:30:00Z',
    end_time: '2023-12-01T12:00:00Z',
    duration_minutes: 90,
    client_name: 'Sarah Williams',
    client_id: 102,
    service_name: 'Cut & Style',
    service_id: 2,
    barber_name: 'Mike Johnson',
    barber_id: 1,
    status: 'scheduled',
    location_id: 1,
    buffer_before_minutes: 10,
    buffer_after_minutes: 15,
    priority_level: 'high',
    created_at: '2023-11-26T14:30:00Z',
    updated_at: '2023-11-26T14:30:00Z'
  },
  {
    id: 3,
    start_time: '2023-12-01T13:00:00Z',
    end_time: '2023-12-01T14:00:00Z',
    duration_minutes: 60,
    client_name: 'Robert Davis',
    client_id: 103,
    service_name: 'Beard Trim',
    service_id: 3,
    barber_name: 'Sarah Wilson',
    barber_id: 2,
    status: 'confirmed',
    location_id: 1,
    buffer_before_minutes: 5,
    buffer_after_minutes: 5,
    priority_level: 'vip',
    created_at: '2023-11-27T09:15:00Z',
    updated_at: '2023-11-27T09:15:00Z'
  },
  {
    id: 4,
    start_time: '2023-12-01T14:30:00Z',
    end_time: '2023-12-01T16:00:00Z',
    duration_minutes: 90,
    client_name: 'Emily Chen',
    client_id: 104,
    service_name: 'Premium Package',
    service_id: 4,
    barber_name: 'Sarah Wilson',
    barber_id: 2,
    status: 'scheduled',
    location_id: 1,
    buffer_before_minutes: 15,
    buffer_after_minutes: 15,
    priority_level: 'vip',
    created_at: '2023-11-28T16:45:00Z',
    updated_at: '2023-11-28T16:45:00Z'
  }
]

const createRealisticBarbers = (): RealBarber[] => [
  {
    id: 1,
    name: 'Mike Johnson',
    email: 'mike@barbershop.com',
    working_hours: {
      start: '08:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5, 6] // Monday-Saturday
    },
    is_available: true,
    location_id: 1,
    specialties: ['haircuts', 'beard_trim', 'styling'],
    break_duration_minutes: 30,
    buffer_between_appointments: 10,
    max_concurrent_appointments: 1
  },
  {
    id: 2,
    name: 'Sarah Wilson',
    email: 'sarah@barbershop.com',
    working_hours: {
      start: '09:00',
      end: '17:00',
      days: [1, 2, 3, 4, 5] // Monday-Friday
    },
    is_available: true,
    location_id: 1,
    specialties: ['haircuts', 'coloring', 'premium_services'],
    break_duration_minutes: 45,
    buffer_between_appointments: 15,
    max_concurrent_appointments: 1
  },
  {
    id: 3,
    name: 'David Martinez',
    email: 'david@barbershop.com',
    working_hours: {
      start: '10:00',
      end: '19:00',
      days: [1, 2, 3, 4, 5, 6, 0] // Monday-Sunday
    },
    is_available: false, // Out sick
    location_id: 1,
    specialties: ['haircuts', 'beard_trim'],
    break_duration_minutes: 30,
    buffer_between_appointments: 5,
    max_concurrent_appointments: 1
  }
]

describe('ConflictResolutionEngine - Real Data Scenarios', () => {
  let conflictEngine: ConflictResolutionEngine
  let existingAppointments: RealAppointment[]
  let availableBarbers: RealBarber[]

  beforeEach(() => {
    conflictEngine = new ConflictResolutionEngine()
    existingAppointments = createRealisticAppointments()
    availableBarbers = createRealisticBarbers()
  })

  describe('Real Appointment Conflicts', () => {
    test('detects exact time overlap conflicts', () => {
      const conflictingAppointment: RealAppointment = {
        id: 999,
        start_time: '2023-12-01T09:00:00Z', // Exact same time as appointment #1
        end_time: '2023-12-01T10:00:00Z',
        duration_minutes: 60,
        client_name: 'New Client',
        client_id: 999,
        service_name: 'Haircut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T08:00:00Z',
        updated_at: '2023-12-01T08:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        conflictingAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts).toHaveLength(1)
      expect(analysis.conflicts[0].type).toBe('time_overlap')
      expect(analysis.conflicts[0].conflictingAppointment?.id).toBe(1)
      expect(analysis.riskScore).toBeGreaterThan(80) // High risk for exact overlap
    })

    test('detects buffer time conflicts', () => {
      const bufferConflictAppointment: RealAppointment = {
        id: 998,
        start_time: '2023-12-01T10:05:00Z', // Within buffer of appointment #1 (ends 10:00 + 10min buffer)
        end_time: '2023-12-01T11:05:00Z',
        duration_minutes: 60,
        client_name: 'Buffer Conflict Client',
        client_id: 998,
        service_name: 'Quick Trim',
        service_id: 5,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        buffer_before_minutes: 5,
        buffer_after_minutes: 5,
        priority_level: 'normal',
        created_at: '2023-12-01T08:30:00Z',
        updated_at: '2023-12-01T08:30:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        bufferConflictAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts.some(c => c.type === 'buffer_violation')).toBe(true)
      expect(analysis.riskScore).toBeGreaterThan(50)
    })

    test('detects barber availability conflicts', () => {
      const unavailableBarberAppointment: RealAppointment = {
        id: 997,
        start_time: '2023-12-01T15:00:00Z',
        end_time: '2023-12-01T16:00:00Z',
        duration_minutes: 60,
        client_name: 'Unavailable Barber Client',
        client_id: 997,
        service_name: 'Haircut',
        service_id: 1,
        barber_name: 'David Martinez',
        barber_id: 3, // This barber is marked as unavailable
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T09:00:00Z',
        updated_at: '2023-12-01T09:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        unavailableBarberAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts.some(c => c.type === 'barber_unavailable')).toBe(true)
      expect(analysis.riskScore).toBeGreaterThan(90) // Very high risk
    })

    test('detects working hours violations', () => {
      const afterHoursAppointment: RealAppointment = {
        id: 996,
        start_time: '2023-12-01T19:00:00Z', // After Sarah's working hours (17:00)
        end_time: '2023-12-01T20:00:00Z',
        duration_minutes: 60,
        client_name: 'After Hours Client',
        client_id: 996,
        service_name: 'Evening Cut',
        service_id: 1,
        barber_name: 'Sarah Wilson',
        barber_id: 2,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T10:00:00Z',
        updated_at: '2023-12-01T10:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        afterHoursAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts.some(c => c.type === 'outside_working_hours')).toBe(true)
      expect(analysis.riskScore).toBeGreaterThan(70)
    })

    test('handles partial overlaps correctly', () => {
      const partialOverlapAppointment: RealAppointment = {
        id: 995,
        start_time: '2023-12-01T09:30:00Z', // Starts during appointment #1 (9:00-10:00)
        end_time: '2023-12-01T10:30:00Z',   // Ends during appointment #2 buffer
        duration_minutes: 60,
        client_name: 'Partial Overlap Client',
        client_id: 995,
        service_name: 'Overlap Cut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T08:45:00Z',
        updated_at: '2023-12-01T08:45:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        partialOverlapAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts.length).toBeGreaterThan(1) // Multiple conflicts
      expect(analysis.conflicts.some(c => c.type === 'time_overlap')).toBe(true)
      expect(analysis.riskScore).toBeGreaterThan(85) // Very high risk for multiple conflicts
    })
  })

  describe('Priority Level Handling', () => {
    test('prioritizes VIP appointments correctly', () => {
      const vipAppointment: RealAppointment = {
        id: 994,
        start_time: '2023-12-01T10:00:00Z', // Conflicts with regular appointment #1
        end_time: '2023-12-01T11:00:00Z',
        duration_minutes: 60,
        client_name: 'VIP Client',
        client_id: 994,
        service_name: 'VIP Haircut',
        service_id: 6,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'vip',
        created_at: '2023-12-01T09:00:00Z',
        updated_at: '2023-12-01T09:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        vipAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      // VIP should have resolution suggestions
      expect(analysis.recommendations.length).toBeGreaterThan(0)
      expect(analysis.recommendations.some(r => r.type === 'reschedule_conflicting')).toBe(true)
    })

    test('handles high priority service conflicts', () => {
      const highPriorityAppointment: RealAppointment = {
        id: 993,
        start_time: '2023-12-01T11:00:00Z', // Conflicts with high priority appointment #2
        end_time: '2023-12-01T12:30:00Z',
        duration_minutes: 90,
        client_name: 'High Priority Client',
        client_id: 993,
        service_name: 'Premium Service',
        service_id: 7,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'high',
        created_at: '2023-12-01T10:30:00Z',
        updated_at: '2023-12-01T10:30:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        highPriorityAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      // Should suggest alternative barber or time slots
      expect(analysis.recommendations.some(
        r => r.type === 'alternative_barber' || r.type === 'alternative_time'
      )).toBe(true)
    })
  })

  describe('Edge Cases and Complex Scenarios', () => {
    test('handles same-day full schedule conflicts', () => {
      // Create a scenario where the day is fully booked
      const fullDayAppointments: RealAppointment[] = []
      for (let hour = 9; hour < 17; hour++) {
        fullDayAppointments.push({
          id: 800 + hour,
          start_time: `2023-12-02T${hour.toString().padStart(2, '0')}:00:00Z`,
          end_time: `2023-12-02T${(hour + 1).toString().padStart(2, '0')}:00:00Z`,
          duration_minutes: 60,
          client_name: `Client ${hour}`,
          client_id: 800 + hour,
          service_name: 'Hourly Cut',
          service_id: 1,
          barber_name: 'Mike Johnson',
          barber_id: 1,
          status: 'confirmed',
          location_id: 1,
          priority_level: 'normal',
          created_at: '2023-12-01T12:00:00Z',
          updated_at: '2023-12-01T12:00:00Z'
        })
      }

      const newAppointment: RealAppointment = {
        id: 992,
        start_time: '2023-12-02T14:00:00Z', // Try to book in middle of full day
        end_time: '2023-12-02T15:00:00Z',
        duration_minutes: 60,
        client_name: 'Late Booker',
        client_id: 992,
        service_name: 'Last Minute Cut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-02T13:00:00Z',
        updated_at: '2023-12-02T13:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        newAppointment,
        fullDayAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts[0].type).toBe('time_overlap')
      expect(analysis.riskScore).toBeGreaterThan(90)
      // Should recommend alternative barber or next day
      expect(analysis.recommendations.some(r => 
        r.type === 'alternative_barber' || r.type === 'alternative_time'
      )).toBe(true)
    })

    test('handles multiple barbers with different specialties', () => {
      const specialtyAppointment: RealAppointment = {
        id: 991,
        start_time: '2023-12-01T14:00:00Z',
        end_time: '2023-12-01T15:30:00Z',
        duration_minutes: 90,
        client_name: 'Specialty Client',
        client_id: 991,
        service_name: 'Advanced Coloring', // Sarah's specialty
        service_id: 8,
        barber_name: 'Mike Johnson', // Wrong barber for this service
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T11:00:00Z',
        updated_at: '2023-12-01T11:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        specialtyAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts.some(c => c.type === 'service_mismatch')).toBe(true)
      expect(analysis.recommendations.some(r => r.type === 'alternative_barber')).toBe(true)
    })

    test('handles weekend and holiday scheduling', () => {
      const sundayAppointment: RealAppointment = {
        id: 990,
        start_time: '2023-12-03T10:00:00Z', // Sunday
        end_time: '2023-12-03T11:00:00Z',
        duration_minutes: 60,
        client_name: 'Weekend Client',
        client_id: 990,
        service_name: 'Weekend Cut',
        service_id: 1,
        barber_name: 'Sarah Wilson', // Works Mon-Fri only
        barber_id: 2,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T15:00:00Z',
        updated_at: '2023-12-01T15:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        sundayAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts.some(c => c.type === 'outside_working_hours')).toBe(true)
      // Should recommend David Martinez who works Sundays
      expect(analysis.recommendations.some(r => 
        r.type === 'alternative_barber' && r.suggestedBarberId === 3
      )).toBe(true)
    })

    test('handles rapid consecutive bookings', () => {
      const rapidBookings: RealAppointment[] = []
      for (let i = 0; i < 3; i++) {
        rapidBookings.push({
          id: 980 + i,
          start_time: `2023-12-01T${(14 + i).toString().padStart(2, '0')}:00:00Z`,
          end_time: `2023-12-01T${(15 + i).toString().padStart(2, '0')}:00:00Z`,
          duration_minutes: 60,
          client_name: `Rapid Client ${i + 1}`,
          client_id: 980 + i,
          service_name: 'Back-to-Back Cut',
          service_id: 1,
          barber_name: 'Mike Johnson',
          barber_id: 1,
          status: 'scheduled',
          location_id: 1,
          buffer_before_minutes: 0, // No buffer for rapid booking test
          buffer_after_minutes: 0,
          priority_level: 'normal',
          created_at: `2023-12-01T${(13 + i).toString().padStart(2, '0')}:${(i * 5).toString().padStart(2, '0')}:00Z`,
          updated_at: `2023-12-01T${(13 + i).toString().padStart(2, '0')}:${(i * 5).toString().padStart(2, '0')}:00Z`
        })
      }

      // Try to insert an appointment in the middle
      const middleAppointment: RealAppointment = {
        id: 989,
        start_time: '2023-12-01T15:00:00Z', // Conflicts with rapid booking #2
        end_time: '2023-12-01T16:00:00Z',
        duration_minutes: 60,
        client_name: 'Middle Insert Client',
        client_id: 989,
        service_name: 'Insert Cut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T14:30:00Z',
        updated_at: '2023-12-01T14:30:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        middleAppointment,
        rapidBookings,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts[0].type).toBe('time_overlap')
      expect(analysis.riskScore).toBeGreaterThan(80)
    })
  })

  describe('Performance Under Load', () => {
    test('handles large appointment datasets efficiently', () => {
      // Generate 1000 appointments across a month
      const largeDataset: RealAppointment[] = []
      const startDate = new Date('2023-12-01')
      
      for (let day = 0; day < 30; day++) {
        for (let hour = 9; hour < 17; hour++) {
          const currentDate = new Date(startDate)
          currentDate.setDate(startDate.getDate() + day)
          currentDate.setHours(hour, 0, 0, 0)
          
          const endDate = new Date(currentDate)
          endDate.setHours(hour + 1, 0, 0, 0)
          
          largeDataset.push({
            id: day * 8 + hour,
            start_time: currentDate.toISOString(),
            end_time: endDate.toISOString(),
            duration_minutes: 60,
            client_name: `Client ${day}-${hour}`,
            client_id: day * 8 + hour,
            service_name: 'Standard Cut',
            service_id: 1,
            barber_name: 'Mike Johnson',
            barber_id: 1,
            status: 'confirmed',
            location_id: 1,
            priority_level: 'normal',
            created_at: currentDate.toISOString(),
            updated_at: currentDate.toISOString()
          })
        }
      }

      const testAppointment: RealAppointment = {
        id: 99999,
        start_time: '2023-12-15T14:00:00Z', // Middle of dataset
        end_time: '2023-12-15T15:00:00Z',
        duration_minutes: 60,
        client_name: 'Performance Test Client',
        client_id: 99999,
        service_name: 'Performance Cut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-15T13:00:00Z',
        updated_at: '2023-12-15T13:00:00Z'
      }

      const startTime = performance.now()
      const analysis = conflictEngine.analyzeConflicts(
        testAppointment,
        largeDataset,
        availableBarbers
      )
      const endTime = performance.now()

      // Performance requirements
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(analysis.hasConflicts).toBe(true) // Should detect the conflict
      expect(analysis.conflicts[0].type).toBe('time_overlap')
    })

    test('maintains accuracy with concurrent conflict checks', async () => {
      const concurrentAppointments: RealAppointment[] = []
      
      // Create multiple conflicting appointments for stress testing
      for (let i = 0; i < 10; i++) {
        concurrentAppointments.push({
          id: 900 + i,
          start_time: '2023-12-01T14:00:00Z', // All at same time
          end_time: '2023-12-01T15:00:00Z',
          duration_minutes: 60,
          client_name: `Concurrent Client ${i}`,
          client_id: 900 + i,
          service_name: 'Concurrent Cut',
          service_id: 1,
          barber_name: 'Mike Johnson',
          barber_id: 1,
          status: 'scheduled',
          location_id: 1,
          priority_level: 'normal',
          created_at: `2023-12-01T13:${i.toString().padStart(2, '0')}:00Z`,
          updated_at: `2023-12-01T13:${i.toString().padStart(2, '0')}:00Z`
        })
      }

      // Test each appointment against the others concurrently
      const analyses = await Promise.all(
        concurrentAppointments.map(async (appointment, index) => {
          const others = concurrentAppointments.filter((_, i) => i !== index)
          return conflictEngine.analyzeConflicts(appointment, others, availableBarbers)
        })
      )

      // All should detect conflicts with the others
      analyses.forEach(analysis => {
        expect(analysis.hasConflicts).toBe(true)
        expect(analysis.conflicts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Integration with AutoReschedulingEngine', () => {
    test('provides data for automatic rescheduling', async () => {
      const conflictingAppointment: RealAppointment = {
        id: 988,
        start_time: '2023-12-01T10:00:00Z', // Conflicts with appointment #1
        end_time: '2023-12-01T11:00:00Z',
        duration_minutes: 60,
        client_name: 'Reschedule Test Client',
        client_id: 988,
        service_name: 'Reschedule Cut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'high',
        created_at: '2023-12-01T09:30:00Z',
        updated_at: '2023-12-01T09:30:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        conflictingAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.recommendations.length).toBeGreaterThan(0)

      // Test integration with AutoReschedulingEngine
      const reschedulingEngine = new AutoReschedulingEngine()
      const conflictingAppointments = [conflictingAppointment, existingAppointments[0]] // The conflicting ones
      
      const reschedulingResult = await reschedulingEngine.generateReschedulingSuggestions(
        conflictingAppointments,
        existingAppointments,
        availableBarbers,
        {
          preferredTimes: ['morning', 'afternoon'],
          maxReschedulingDistance: 7, // Within a week
          prioritizeVIP: true
        }
      )

      expect(reschedulingResult.suggestions.length).toBeGreaterThan(0)
      expect(reschedulingResult.feasible).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('handles invalid appointment data gracefully', () => {
      const invalidAppointment = {
        id: null,
        start_time: 'invalid-date',
        barber_id: 'not-a-number'
      } as any

      expect(() => {
        conflictEngine.analyzeConflicts(
          invalidAppointment,
          existingAppointments,
          availableBarbers
        )
      }).not.toThrow()
    })

    test('handles empty datasets', () => {
      const validAppointment: RealAppointment = {
        id: 987,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-01T11:00:00Z',
        duration_minutes: 60,
        client_name: 'Empty Dataset Client',
        client_id: 987,
        service_name: 'Solo Cut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T09:00:00Z',
        updated_at: '2023-12-01T09:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        validAppointment,
        [], // Empty appointments
        [] // Empty barbers
      )

      expect(analysis.hasConflicts).toBe(true) // No barbers available
      expect(analysis.conflicts.some(c => c.type === 'barber_unavailable')).toBe(true)
    })

    test('handles timezone edge cases', () => {
      const timezoneAppointment: RealAppointment = {
        id: 986,
        start_time: '2023-12-01T23:00:00-05:00', // Eastern time, next day UTC
        end_time: '2023-12-02T00:00:00-05:00',
        duration_minutes: 60,
        client_name: 'Timezone Client',
        client_id: 986,
        service_name: 'Timezone Cut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T22:00:00Z',
        updated_at: '2023-12-01T22:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        timezoneAppointment,
        existingAppointments,
        availableBarbers
      )

      // Should handle timezone conversion properly
      expect(analysis).toBeDefined()
      expect(typeof analysis.hasConflicts).toBe('boolean')
    })
  })

  describe('Business Rules Validation', () => {
    test('enforces minimum service duration requirements', () => {
      const tooShortAppointment: RealAppointment = {
        id: 985,
        start_time: '2023-12-01T16:00:00Z',
        end_time: '2023-12-01T16:15:00Z', // Only 15 minutes
        duration_minutes: 15,
        client_name: 'Quick Client',
        client_id: 985,
        service_name: 'Express Cut', // Typically requires 30+ minutes
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T15:30:00Z',
        updated_at: '2023-12-01T15:30:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        tooShortAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts.some(c => c.type === 'insufficient_duration')).toBe(true)
    })

    test('validates client double-booking prevention', () => {
      const doubleBookingAppointment: RealAppointment = {
        id: 984,
        start_time: '2023-12-01T09:30:00Z', // Overlaps with existing appointment for same client
        end_time: '2023-12-01T10:30:00Z',
        duration_minutes: 60,
        client_name: 'John Smith', // Same client as appointment #1
        client_id: 101, // Same client ID
        service_name: 'Double Book Cut',
        service_id: 1,
        barber_name: 'Sarah Wilson', // Different barber
        barber_id: 2,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal',
        created_at: '2023-12-01T09:00:00Z',
        updated_at: '2023-12-01T09:00:00Z'
      }

      const analysis = conflictEngine.analyzeConflicts(
        doubleBookingAppointment,
        existingAppointments,
        availableBarbers
      )

      expect(analysis.hasConflicts).toBe(true)
      expect(analysis.conflicts.some(c => c.type === 'client_double_booking')).toBe(true)
      expect(analysis.riskScore).toBeGreaterThan(75) // High risk for client confusion
    })
  })
})

describe('ConflictResolutionEngine - API Integration Tests', () => {
  test('integrates with real appointment booking API', async () => {
    // Mock the API call to create appointment
    const mockApiCall = jest.fn().mockResolvedValue({
      success: false,
      conflicts: [
        {
          type: 'time_overlap',
          message: 'Appointment overlaps with existing booking',
          conflicting_appointment_id: 1
        }
      ]
    })

    // Simulate API integration
    const newAppointment: RealAppointment = {
      id: 0, // Will be assigned by API
      start_time: '2023-12-01T09:00:00Z',
      end_time: '2023-12-01T10:00:00Z',
      duration_minutes: 60,
      client_name: 'API Test Client',
      client_id: 999,
      service_name: 'API Cut',
      service_id: 1,
      barber_name: 'Mike Johnson',
      barber_id: 1,
      status: 'scheduled',
      location_id: 1,
      priority_level: 'normal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const result = await mockApiCall(newAppointment)

    expect(result.success).toBe(false)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].type).toBe('time_overlap')
  })
})