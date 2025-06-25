/**
 * Calendar Grid Types and Utilities
 *
 * This file exports the core types and helper functions used by the RobustCalendar
 * grid rendering system for easy integration and testing.
 */

export interface GridPosition {
  width: string
  left: string
  zIndex: number
}

export interface TimeSlotData {
  date: string
  time: string
  appointments: CalendarAppointment[]
  isAvailable: boolean
  conflicts: CalendarAppointment[]
}

export interface CalendarViewConfig {
  type: 'month' | 'week' | 'day'
  timeSlots: string[]
  workingHours: { start: string; end: string }
  slotDuration: number
  showWeekends: boolean
}

export interface DragDropState {
  isDragging: boolean
  draggedItem: CalendarAppointment | null
  dropTarget: { date: string; time: string } | null
  isValidDrop: boolean
  conflicts: CalendarAppointment[]
}

export interface CalendarAppointment {
  id: string
  title: string
  client: string
  clientId?: number
  barber: string
  barberId: number
  startTime: string
  endTime: string
  service: string
  serviceId?: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  date: string
  notes?: string
  duration: number
  clientPhone?: string
  clientEmail?: string
  paymentStatus?: 'paid' | 'unpaid' | 'partial' | 'refunded'
  tags?: string[]
}

export interface CalendarGridProps {
  selectedView: 'month' | 'week' | 'day'
  timeSlots: string[]
  weekDays: Date[]
  appointments: CalendarAppointment[]
  onTimeSlotClick: (date: string, time: string) => void
  onAppointmentClick: (appointment: CalendarAppointment) => void
  onAppointmentMove?: (appointment: CalendarAppointment, newDate: string, newTime: string) => void
  enableDragDrop?: boolean
  showConflicts?: boolean
  allowConflicts?: boolean
  workingHours: { start: string; end: string }
  timeSlotDuration: number
  theme: any
  colors: any
}

// Utility Functions
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const generateTimeSlots = (start: string, end: string, duration: number = 30): string[] => {
  const slots: string[] = []
  const startTime = new Date(`2024-01-01 ${start}`)
  const endTime = new Date(`2024-01-01 ${end}`)

  let current = new Date(startTime)
  while (current < endTime) {
    slots.push(current.toTimeString().slice(0, 5))
    current.setMinutes(current.getMinutes() + duration)
  }

  return slots
}

export const calculateAppointmentCollisions = (
  appointment: CalendarAppointment,
  allAppointments: CalendarAppointment[],
  newDate: string,
  newTime: string
): CalendarAppointment[] => {
  const appointmentDuration = appointment.duration
  const newStartTime = new Date(`2024-01-01 ${newTime}`)
  const newEndTime = new Date(newStartTime.getTime() + appointmentDuration * 60000)

  return allAppointments.filter(apt => {
    if (apt.id === appointment.id || apt.date !== newDate) return false

    const aptStartTime = new Date(`2024-01-01 ${apt.startTime}`)
    const aptEndTime = new Date(`2024-01-01 ${apt.endTime}`)

    // Check for time overlap
    return (newStartTime < aptEndTime && newEndTime > aptStartTime)
  })
}

export const getWeekDays = (date: Date): Date[] => {
  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day
  startOfWeek.setDate(diff)

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })
}

export const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export const getMonthDates = (currentDate: Date): Date[] => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)

  // Start from Sunday of the week containing the first day
  const startDayOfWeek = firstDay.getDay()
  startDate.setDate(firstDay.getDate() - startDayOfWeek)

  const dates = []
  const current = new Date(startDate)

  // Generate 6 weeks (42 days) to fill the calendar grid
  for (let i = 0; i < 42; i++) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}
