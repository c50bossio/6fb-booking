import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'

// Google Calendar API Types
export interface GoogleCalendarEvent {
  id?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
  created?: string
  updated?: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  creator?: {
    email?: string
    displayName?: string
    self?: boolean
  }
  organizer?: {
    email?: string
    displayName?: string
    self?: boolean
  }
  start?: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  end?: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  endTimeUnspecified?: boolean
  recurrence?: string[]
  recurringEventId?: string
  originalStartTime?: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  transparency?: 'opaque' | 'transparent'
  visibility?: 'default' | 'public' | 'private' | 'confidential'
  iCalUID?: string
  sequence?: number
  attendees?: GoogleCalendarAttendee[]
  attendeesOmitted?: boolean
  extendedProperties?: {
    private?: { [key: string]: string }
    shared?: { [key: string]: string }
  }
  hangoutLink?: string
  conferenceData?: GoogleConferenceData
  gadget?: any
  anyoneCanAddSelf?: boolean
  guestsCanInviteOthers?: boolean
  guestsCanModify?: boolean
  guestsCanSeeOtherGuests?: boolean
  privateCopy?: boolean
  locked?: boolean
  reminders?: {
    useDefault?: boolean
    overrides?: GoogleCalendarReminder[]
  }
  source?: {
    url?: string
    title?: string
  }
  attachments?: GoogleCalendarAttachment[]
  eventType?: 'default' | 'outOfOffice' | 'focusTime'
}

export interface GoogleCalendarAttendee {
  id?: string
  email?: string
  displayName?: string
  organizer?: boolean
  self?: boolean
  resource?: boolean
  optional?: boolean
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  comment?: string
  additionalGuests?: number
}

export interface GoogleConferenceData {
  createRequest?: {
    requestId?: string
    conferenceSolutionKey?: {
      type?: string
    }
    status?: {
      statusCode?: string
    }
  }
  entryPoints?: Array<{
    entryPointType?: string
    uri?: string
    label?: string
    pin?: string
    accessCode?: string
    meetingCode?: string
    passcode?: string
    password?: string
  }>
  conferenceSolution?: {
    key?: {
      type?: string
    }
    name?: string
    iconUri?: string
  }
  conferenceId?: string
  signature?: string
  notes?: string
}

export interface GoogleCalendarReminder {
  method?: 'email' | 'popup' | 'sms'
  minutes?: number
}

export interface GoogleCalendarAttachment {
  fileUrl?: string
  title?: string
  mimeType?: string
  iconLink?: string
  fileId?: string
}

export interface GoogleCalendarList {
  kind?: string
  etag?: string
  nextPageToken?: string
  nextSyncToken?: string
  items?: GoogleCalendar[]
}

export interface GoogleCalendar {
  kind?: string
  etag?: string
  id?: string
  summary?: string
  description?: string
  location?: string
  timeZone?: string
  summaryOverride?: string
  colorId?: string
  backgroundColor?: string
  foregroundColor?: string
  hidden?: boolean
  selected?: boolean
  accessRole?: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner'
  defaultReminders?: GoogleCalendarReminder[]
  notificationSettings?: {
    notifications?: Array<{
      type?: string
      method?: string
    }>
  }
  primary?: boolean
  deleted?: boolean
  conferenceProperties?: {
    allowedConferenceSolutionTypes?: string[]
  }
}

// Sync-related types
export interface GoogleCalendarSyncState {
  isAuthenticated: boolean
  isLoading: boolean
  isSyncing: boolean
  lastSyncTime?: Date
  syncError?: string
  syncedCalendars: SyncedCalendar[]
  syncQueue: SyncQueueItem[]
  conflictQueue: ConflictItem[]
  syncStats: SyncStats
}

export interface SyncedCalendar {
  id: string
  summary: string
  description?: string
  backgroundColor?: string
  foregroundColor?: string
  isEnabled: boolean
  lastSyncToken?: string
  syncDirection: 'both' | 'to-google' | 'from-google'
}

export interface SyncQueueItem {
  id: string
  operation: 'create' | 'update' | 'delete'
  entityType: 'appointment' | 'event'
  entityId: string
  data?: CalendarAppointment | GoogleCalendarEvent
  retryCount: number
  createdAt: Date
  lastAttemptAt?: Date
  error?: string
}

export interface ConflictItem {
  id: string
  localData: CalendarAppointment
  googleData: GoogleCalendarEvent
  detectedAt: Date
  resolution?: 'local' | 'google' | 'manual'
  resolvedAt?: Date
}

export interface SyncStats {
  totalSynced: number
  created: number
  updated: number
  deleted: number
  conflicts: number
  errors: number
  lastFullSync?: Date
  nextScheduledSync?: Date
}

// Auth-related types
export interface GoogleAuthTokens {
  accessToken: string
  refreshToken?: string
  expiryDate: number
  scope: string
  tokenType: string
}

export interface GoogleAuthState {
  isSignedIn: boolean
  isLoading: boolean
  user?: GoogleUser
  tokens?: GoogleAuthTokens
  error?: string
}

export interface GoogleUser {
  id: string
  email: string
  name: string
  givenName?: string
  familyName?: string
  imageUrl?: string
}

// Mapping functions
export function mapAppointmentToGoogleEvent(appointment: CalendarAppointment): GoogleCalendarEvent {
  const startDateTime = `${appointment.date}T${appointment.startTime}:00`
  const endDateTime = `${appointment.date}T${appointment.endTime}:00`

  return {
    summary: appointment.title || `${appointment.service} - ${appointment.client}`,
    description: [
      `Client: ${appointment.client}`,
      `Service: ${appointment.service}`,
      `Barber: ${appointment.barber}`,
      `Price: $${appointment.price}`,
      appointment.notes ? `Notes: ${appointment.notes}` : '',
      appointment.clientPhone ? `Phone: ${appointment.clientPhone}` : '',
      appointment.clientEmail ? `Email: ${appointment.clientEmail}` : ''
    ].filter(Boolean).join('\n'),
    start: {
      dateTime: startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    status: appointment.status === 'pending' ? 'tentative' :
            appointment.status === 'cancelled' || appointment.status === 'no_show' ? 'cancelled' :
            'confirmed',
    extendedProperties: {
      private: {
        appointmentId: appointment.id,
        barberId: appointment.barberId.toString(),
        clientId: appointment.clientId?.toString() || '',
        serviceId: appointment.serviceId?.toString() || '',
        appointmentStatus: appointment.status
      }
    },
    attendees: appointment.clientEmail ? [{
      email: appointment.clientEmail,
      displayName: appointment.client
    }] : undefined
  }
}

export function mapGoogleEventToAppointment(event: GoogleCalendarEvent): Partial<CalendarAppointment> | null {
  if (!event.start?.dateTime || !event.end?.dateTime) return null

  const startDate = new Date(event.start.dateTime)
  const endDate = new Date(event.end.dateTime)

  const appointment: Partial<CalendarAppointment> = {
    title: event.summary || 'Untitled Event',
    date: startDate.toISOString().split('T')[0],
    startTime: startDate.toTimeString().slice(0, 5),
    endTime: endDate.toTimeString().slice(0, 5),
    duration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
    status: event.status === 'cancelled' ? 'cancelled' :
            event.status === 'tentative' ? 'pending' :
            'confirmed',
    notes: event.description
  }

  // Extract from extended properties if available
  if (event.extendedProperties?.private) {
    const props = event.extendedProperties.private
    if (props.appointmentId) appointment.id = props.appointmentId
    if (props.barberId) appointment.barberId = parseInt(props.barberId)
    if (props.clientId) appointment.clientId = parseInt(props.clientId)
    if (props.serviceId) appointment.serviceId = parseInt(props.serviceId)
    if (props.appointmentStatus) appointment.status = props.appointmentStatus as any
  }

  return appointment
}
