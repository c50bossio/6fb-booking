import { Appointment } from '@/types/appointment'
import { Service } from '@/types/service'
import { format } from 'date-fns'

/**
 * Calendar export utilities for BookedBarber V2
 */

interface CalendarEvent {
  title: string
  description: string
  location: string
  startDate: Date
  endDate: Date
  organizer?: string
  attendees?: string[]
}

/**
 * Convert appointment to calendar event format
 */
function appointmentToCalendarEvent(appointment: Appointment): CalendarEvent {
  const startDate = new Date(appointment.start_time)
  const endDate = new Date(appointment.end_time)
  
  return {
    title: `${appointment.service?.name || 'Appointment'} with ${appointment.client?.name || 'Client'}`,
    description: [
      appointment.service?.description || '',
      appointment.notes || '',
      `Price: $${appointment.total_price}`,
      appointment.status ? `Status: ${appointment.status}` : ''
    ].filter(Boolean).join('\n'),
    location: appointment.barber?.location || '',
    startDate,
    endDate,
    organizer: appointment.barber?.email,
    attendees: appointment.client?.email ? [appointment.client.email] : []
  }
}

/**
 * Generate iCal (.ics) format for a single appointment
 */
export function generateICalEvent(appointment: Appointment): string {
  const event = appointmentToCalendarEvent(appointment)
  
  // Format dates to iCal format (YYYYMMDDTHHMMSSZ)
  const formatICalDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  
  const uid = `${appointment.id}@bookedbarber.com`
  const now = new Date()
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookedBarber//Appointment Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(event.startDate)}`,
    `DTEND:${formatICalDate(event.endDate)}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    event.organizer ? `ORGANIZER:mailto:${event.organizer}` : '',
    ...event.attendees.map(email => `ATTENDEE:mailto:${email}`),
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')
  
  return icsContent
}

/**
 * Generate iCal (.ics) format for multiple appointments
 */
export function generateICalendar(appointments: Appointment[]): string {
  const now = new Date()
  const formatICalDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  
  const events = appointments.map(appointment => {
    const event = appointmentToCalendarEvent(appointment)
    const uid = `${appointment.id}@bookedbarber.com`
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICalDate(now)}`,
      `DTSTART:${formatICalDate(event.startDate)}`,
      `DTEND:${formatICalDate(event.endDate)}`,
      `SUMMARY:${event.title}`,
      event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
      event.location ? `LOCATION:${event.location}` : '',
      event.organizer ? `ORGANIZER:mailto:${event.organizer}` : '',
      ...event.attendees.map(email => `ATTENDEE:mailto:${email}`),
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n')
  })
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookedBarber//Appointment Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n')
  
  return icsContent
}

/**
 * Download iCal file
 */
export function downloadICalFile(appointments: Appointment[], filename: string = 'appointments.ics') {
  const icsContent = generateICalendar(appointments)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Generate Google Calendar URL for adding an event
 */
export function generateGoogleCalendarUrl(appointment: Appointment): string {
  const event = appointmentToCalendarEvent(appointment)
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${format(event.startDate, "yyyyMMdd'T'HHmmss")}/${format(event.endDate, "yyyyMMdd'T'HHmmss")}`,
    details: event.description,
    location: event.location,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate Outlook Calendar URL for adding an event
 */
export function generateOutlookCalendarUrl(appointment: Appointment): string {
  const event = appointmentToCalendarEvent(appointment)
  
  const params = new URLSearchParams({
    subject: event.title,
    body: event.description,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    location: event.location
  })
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Generate Apple Calendar (.ics) file for iOS/macOS
 */
export function generateAppleCalendarEvent(appointment: Appointment): string {
  // Apple Calendar uses the same iCal format but with some specific properties
  const event = appointmentToCalendarEvent(appointment)
  const uid = `${appointment.id}@bookedbarber.com`
  const now = new Date()
  
  const formatICalDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookedBarber//Appointment Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BookedBarber Appointments',
    'X-APPLE-CALENDAR-COLOR:#000000',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(event.startDate)}`,
    `DTEND:${formatICalDate(event.endDate)}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    event.organizer ? `ORGANIZER:mailto:${event.organizer}` : '',
    ...event.attendees.map(email => `ATTENDEE:mailto:${email}`),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')
  
  return icsContent
}

/**
 * Export appointments in CSV format
 */
export function exportAppointmentsToCSV(appointments: Appointment[]): string {
  const headers = [
    'Date',
    'Start Time',
    'End Time',
    'Client Name',
    'Service',
    'Price',
    'Status',
    'Notes',
    'Barber',
    'Location'
  ]
  
  const rows = appointments.map(appointment => {
    const startDate = new Date(appointment.start_time)
    const endDate = new Date(appointment.end_time)
    
    return [
      format(startDate, 'yyyy-MM-dd'),
      format(startDate, 'HH:mm'),
      format(endDate, 'HH:mm'),
      appointment.client?.name || '',
      appointment.service?.name || '',
      `$${appointment.total_price}`,
      appointment.status || '',
      appointment.notes || '',
      appointment.barber?.name || '',
      appointment.barber?.location || ''
    ]
  })
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  return csvContent
}

/**
 * Download CSV file
 */
export function downloadCSVFile(appointments: Appointment[], filename: string = 'appointments.csv') {
  const csvContent = exportAppointmentsToCSV(appointments)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Calendar export options interface
 */
export interface CalendarExportOptions {
  format: 'ical' | 'google' | 'outlook' | 'apple' | 'csv'
  appointments: Appointment[]
  filename?: string
}

/**
 * Main export function that handles all formats
 */
export function exportCalendar(options: CalendarExportOptions) {
  const { format, appointments, filename } = options
  
  switch (format) {
    case 'ical':
      downloadICalFile(appointments, filename || 'bookedbarber-appointments.ics')
      break
      
    case 'google':
      // For Google Calendar, open a new tab for each appointment (limit to 5)
      appointments.slice(0, 5).forEach(appointment => {
        const url = generateGoogleCalendarUrl(appointment)
        window.open(url, '_blank')
      })
      break
      
    case 'outlook':
      // For Outlook, open a new tab for each appointment (limit to 5)
      appointments.slice(0, 5).forEach(appointment => {
        const url = generateOutlookCalendarUrl(appointment)
        window.open(url, '_blank')
      })
      break
      
    case 'apple':
      // Apple Calendar uses iCal format with specific properties
      const appleIcs = appointments.length === 1
        ? generateAppleCalendarEvent(appointments[0])
        : generateICalendar(appointments)
      const blob = new Blob([appleIcs], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'bookedbarber-appointments.ics'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      break
      
    case 'csv':
      downloadCSVFile(appointments, filename || 'bookedbarber-appointments.csv')
      break
      
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}