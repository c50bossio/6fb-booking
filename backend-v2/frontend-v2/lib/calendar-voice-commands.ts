/**
 * Calendar Voice Commands Integration
 * Voice control system specifically designed for calendar operations
 * Version: 1.0.0
 */

import { getVoiceCommandsSystem, VoiceCommand } from '@/lib/voice-commands-accessibility'

export interface CalendarVoiceAction {
  type: 'navigation' | 'booking' | 'scheduling' | 'search' | 'view'
  action: string
  parameters?: Record<string, any>
  confidence: number
  timestamp: number
}

export interface CalendarVoiceResult {
  success: boolean
  action: CalendarVoiceAction
  response: string
  data?: any
  error?: string
}

export interface CalendarContextState {
  currentView: 'day' | 'week' | 'month' | 'agenda'
  selectedDate: Date
  selectedAppointment?: any
  selectedBarber?: number
  isBookingMode: boolean
  searchQuery?: string
  lastAction?: CalendarVoiceAction
}

class CalendarVoiceCommandSystem {
  private voiceSystem = getVoiceCommandsSystem()
  private context: CalendarContextState
  private actionHandlers: Map<string, (params: any) => Promise<CalendarVoiceResult>>
  private listeners: Set<(result: CalendarVoiceResult) => void>

  constructor() {
    this.context = {
      currentView: 'week',
      selectedDate: new Date(),
      isBookingMode: false
    }
    
    this.actionHandlers = new Map()
    this.listeners = new Set()
    
    this.initializeCalendarCommands()
    this.setupVoiceCommandListener()
  }

  private initializeCalendarCommands(): void {
    const calendarCommands: VoiceCommand[] = [
      // Navigation Commands
      {
        id: 'calendar-next-week',
        patterns: ['next week', 'go to next week', 'forward one week'],
        action: 'calendar:navigate:next-week',
        parameters: [],
        description: 'Navigate to next week in calendar',
        examples: ['next week', 'go to next week'],
        category: 'navigation',
        accessibility: true
      },
      {
        id: 'calendar-previous-week',
        patterns: ['previous week', 'go to previous week', 'back one week', 'last week'],
        action: 'calendar:navigate:previous-week',
        parameters: [],
        description: 'Navigate to previous week in calendar',
        examples: ['previous week', 'last week'],
        category: 'navigation',
        accessibility: true
      },
      {
        id: 'calendar-today',
        patterns: ['today', 'go to today', 'show today', 'current day'],
        action: 'calendar:navigate:today',
        parameters: [],
        description: 'Navigate to today in calendar',
        examples: ['today', 'go to today'],
        category: 'navigation',
        accessibility: true
      },
      {
        id: 'calendar-view-month',
        patterns: ['month view', 'show month', 'monthly view', 'switch to month'],
        action: 'calendar:view:month',
        parameters: [],
        description: 'Switch to month view',
        examples: ['month view', 'show month'],
        category: 'view',
        accessibility: true
      },
      {
        id: 'calendar-view-week',
        patterns: ['week view', 'show week', 'weekly view', 'switch to week'],
        action: 'calendar:view:week',
        parameters: [],
        description: 'Switch to week view',
        examples: ['week view', 'show week'],
        category: 'view',
        accessibility: true
      },
      {
        id: 'calendar-view-day',
        patterns: ['day view', 'show day', 'daily view', 'switch to day'],
        action: 'calendar:view:day',
        parameters: [],
        description: 'Switch to day view',
        examples: ['day view', 'show day'],
        category: 'view',
        accessibility: true
      },
      
      // Booking Commands
      {
        id: 'calendar-new-appointment',
        patterns: [
          'new appointment', 
          'book appointment', 
          'schedule appointment',
          'add appointment',
          'create booking'
        ],
        action: 'calendar:booking:new',
        parameters: [],
        description: 'Start creating a new appointment',
        examples: ['new appointment', 'book appointment'],
        category: 'booking',
        accessibility: true
      },
      {
        id: 'calendar-book-service',
        patterns: [
          'book * service',
          'schedule * appointment',
          'I want a *',
          'book me for *'
        ],
        action: 'calendar:booking:service',
        parameters: ['service'],
        description: 'Book a specific service',
        examples: ['book haircut service', 'I want a beard trim'],
        category: 'booking',
        accessibility: true
      },
      {
        id: 'calendar-book-time',
        patterns: [
          'book at *',
          'schedule for *',
          'appointment at *',
          '* appointment'
        ],
        action: 'calendar:booking:time',
        parameters: ['time'],
        description: 'Book at specific time',
        examples: ['book at 2 PM', 'schedule for tomorrow'],
        category: 'booking',
        accessibility: true
      },
      {
        id: 'calendar-select-barber',
        patterns: [
          'with *',
          'barber *',
          'book with *',
          'I want *'
        ],
        action: 'calendar:booking:barber',
        parameters: ['barber'],
        description: 'Select specific barber',
        examples: ['with John', 'barber Maria'],
        category: 'booking',
        accessibility: true
      },
      
      // Appointment Management
      {
        id: 'calendar-cancel-appointment',
        patterns: [
          'cancel appointment',
          'cancel booking',
          'remove appointment',
          'delete appointment'
        ],
        action: 'calendar:appointment:cancel',
        parameters: [],
        description: 'Cancel selected appointment',
        examples: ['cancel appointment', 'remove appointment'],
        category: 'scheduling',
        accessibility: true
      },
      {
        id: 'calendar-reschedule-appointment',
        patterns: [
          'reschedule appointment',
          'change appointment',
          'move appointment',
          'reschedule booking'
        ],
        action: 'calendar:appointment:reschedule',
        parameters: [],
        description: 'Reschedule selected appointment',
        examples: ['reschedule appointment', 'change appointment'],
        category: 'scheduling',
        accessibility: true
      },
      {
        id: 'calendar-appointment-details',
        patterns: [
          'appointment details',
          'show details',
          'appointment info',
          'what\'s the appointment'
        ],
        action: 'calendar:appointment:details',
        parameters: [],
        description: 'Show appointment details',
        examples: ['appointment details', 'show details'],
        category: 'scheduling',
        accessibility: true
      },
      
      // Search Commands
      {
        id: 'calendar-search-client',
        patterns: [
          'find client *',
          'search for *',
          'show * appointments',
          'find * booking'
        ],
        action: 'calendar:search:client',
        parameters: ['client'],
        description: 'Search for client appointments',
        examples: ['find client John', 'search for Maria'],
        category: 'search',
        accessibility: true
      },
      {
        id: 'calendar-search-service',
        patterns: [
          'find * appointments',
          'show * bookings',
          'search * service'
        ],
        action: 'calendar:search:service',
        parameters: ['service'],
        description: 'Search for service appointments',
        examples: ['find haircut appointments', 'show beard trim bookings'],
        category: 'search',
        accessibility: true
      },
      {
        id: 'calendar-filter-barber',
        patterns: [
          'show * appointments',
          'filter by *',
          '* schedule',
          '* calendar'
        ],
        action: 'calendar:filter:barber',
        parameters: ['barber'],
        description: 'Filter appointments by barber',
        examples: ['show John appointments', 'Maria schedule'],
        category: 'search',
        accessibility: true
      },
      
      // Time-based Navigation
      {
        id: 'calendar-go-to-date',
        patterns: [
          'go to *',
          'show *',
          'navigate to *',
          'jump to *'
        ],
        action: 'calendar:navigate:date',
        parameters: ['date'],
        description: 'Navigate to specific date',
        examples: ['go to Monday', 'show next Tuesday'],
        category: 'navigation',
        accessibility: true
      },
      {
        id: 'calendar-next-day',
        patterns: ['next day', 'tomorrow', 'forward one day'],
        action: 'calendar:navigate:next-day',
        parameters: [],
        description: 'Navigate to next day',
        examples: ['next day', 'tomorrow'],
        category: 'navigation',
        accessibility: true
      },
      {
        id: 'calendar-previous-day',
        patterns: ['previous day', 'yesterday', 'back one day'],
        action: 'calendar:navigate:previous-day',
        parameters: [],
        description: 'Navigate to previous day',
        examples: ['previous day', 'yesterday'],
        category: 'navigation',
        accessibility: true
      },
      
      // Quick Actions
      {
        id: 'calendar-show-conflicts',
        patterns: [
          'show conflicts',
          'display conflicts',
          'check for conflicts',
          'find conflicts'
        ],
        action: 'calendar:conflicts:show',
        parameters: [],
        description: 'Display scheduling conflicts',
        examples: ['show conflicts', 'check for conflicts'],
        category: 'scheduling',
        accessibility: true
      },
      {
        id: 'calendar-optimize-schedule',
        patterns: [
          'optimize schedule',
          'improve schedule',
          'optimize calendar',
          'fix schedule'
        ],
        action: 'calendar:optimize:schedule',
        parameters: [],
        description: 'Run schedule optimization',
        examples: ['optimize schedule', 'improve schedule'],
        category: 'scheduling',
        accessibility: true
      },
      {
        id: 'calendar-availability',
        patterns: [
          'check availability',
          'show available times',
          'what\'s available',
          'free slots'
        ],
        action: 'calendar:availability:check',
        parameters: [],
        description: 'Check appointment availability',
        examples: ['check availability', 'show available times'],
        category: 'search',
        accessibility: true
      }
    ]

    // Add all calendar commands to the voice system
    calendarCommands.forEach(command => {
      this.voiceSystem.addCommand(command)
    })
  }

  private setupVoiceCommandListener(): void {
    this.voiceSystem.on('commandMatched', (match: any) => {
      if (match.command.action.startsWith('calendar:')) {
        this.handleCalendarCommand(match.command.action, match.parameters)
      }
    })
  }

  private async handleCalendarCommand(action: string, parameters: Record<string, string>): Promise<void> {
    const [, category, subAction] = action.split(':')
    
    const voiceAction: CalendarVoiceAction = {
      type: category as any,
      action: subAction,
      parameters,
      confidence: 0.9, // Would come from speech recognition
      timestamp: Date.now()
    }

    this.context.lastAction = voiceAction

    try {
      const handler = this.actionHandlers.get(action)
      let result: CalendarVoiceResult

      if (handler) {
        result = await handler(parameters)
      } else {
        result = await this.handleDefaultAction(voiceAction)
      }

      // Update context based on successful actions
      if (result.success) {
        this.updateContext(voiceAction, result.data)
      }

      // Provide voice feedback
      this.voiceSystem.speak(result.response)
      
      // Notify listeners
      this.notifyListeners(result)
      
    } catch (error) {
      const errorResult: CalendarVoiceResult = {
        success: false,
        action: voiceAction,
        response: 'Sorry, I encountered an error processing that command.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      
      this.voiceSystem.speak(errorResult.response)
      this.notifyListeners(errorResult)
    }
  }

  private async handleDefaultAction(action: CalendarVoiceAction): Promise<CalendarVoiceResult> {
    const { type, action: subAction, parameters } = action

    switch (`${type}:${subAction}`) {
      case 'navigation:next-week':
        return this.handleNextWeek()
      
      case 'navigation:previous-week':
        return this.handlePreviousWeek()
      
      case 'navigation:today':
        return this.handleToday()
      
      case 'navigation:next-day':
        return this.handleNextDay()
      
      case 'navigation:previous-day':
        return this.handlePreviousDay()
      
      case 'navigation:date':
        return this.handleGoToDate(parameters?.date)
      
      case 'view:month':
        return this.handleViewChange('month')
      
      case 'view:week':
        return this.handleViewChange('week')
      
      case 'view:day':
        return this.handleViewChange('day')
      
      case 'booking:new':
        return this.handleNewAppointment()
      
      case 'booking:service':
        return this.handleBookService(parameters?.service)
      
      case 'booking:time':
        return this.handleBookTime(parameters?.time)
      
      case 'booking:barber':
        return this.handleSelectBarber(parameters?.barber)
      
      case 'search:client':
        return this.handleSearchClient(parameters?.client)
      
      case 'search:service':
        return this.handleSearchService(parameters?.service)
      
      case 'filter:barber':
        return this.handleFilterBarber(parameters?.barber)
      
      case 'conflicts:show':
        return this.handleShowConflicts()
      
      case 'optimize:schedule':
        return this.handleOptimizeSchedule()
      
      case 'availability:check':
        return this.handleCheckAvailability()
      
      default:
        return {
          success: false,
          action,
          response: `I don't understand the command "${type}:${subAction}". Try saying "help" for available commands.`,
          error: 'Unknown command'
        }
    }
  }

  // Navigation Handlers
  private async handleNextWeek(): Promise<CalendarVoiceResult> {
    const nextWeek = new Date(this.context.selectedDate)
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Navigating to the week of ${nextWeek.toLocaleDateString()}`,
      data: { date: nextWeek, view: this.context.currentView }
    }
  }

  private async handlePreviousWeek(): Promise<CalendarVoiceResult> {
    const previousWeek = new Date(this.context.selectedDate)
    previousWeek.setDate(previousWeek.getDate() - 7)
    
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Navigating to the week of ${previousWeek.toLocaleDateString()}`,
      data: { date: previousWeek, view: this.context.currentView }
    }
  }

  private async handleToday(): Promise<CalendarVoiceResult> {
    const today = new Date()
    
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Showing today, ${today.toLocaleDateString()}`,
      data: { date: today, view: this.context.currentView }
    }
  }

  private async handleNextDay(): Promise<CalendarVoiceResult> {
    const nextDay = new Date(this.context.selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)
    
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Navigating to ${nextDay.toLocaleDateString()}`,
      data: { date: nextDay, view: 'day' }
    }
  }

  private async handlePreviousDay(): Promise<CalendarVoiceResult> {
    const previousDay = new Date(this.context.selectedDate)
    previousDay.setDate(previousDay.getDate() - 1)
    
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Navigating to ${previousDay.toLocaleDateString()}`,
      data: { date: previousDay, view: 'day' }
    }
  }

  private async handleGoToDate(dateString?: string): Promise<CalendarVoiceResult> {
    if (!dateString) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: 'Please specify a date to navigate to.',
        error: 'No date specified'
      }
    }

    // Simple date parsing - would use a more sophisticated parser in production
    const targetDate = this.parseNaturalDate(dateString)
    
    if (!targetDate) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: `I couldn't understand the date "${dateString}". Try saying "go to Monday" or "show next Tuesday".`,
        error: 'Invalid date format'
      }
    }

    return {
      success: true,
      action: this.context.lastAction!,
      response: `Navigating to ${targetDate.toLocaleDateString()}`,
      data: { date: targetDate, view: this.context.currentView }
    }
  }

  // View Change Handlers
  private async handleViewChange(view: 'day' | 'week' | 'month'): Promise<CalendarVoiceResult> {
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Switching to ${view} view`,
      data: { view, date: this.context.selectedDate }
    }
  }

  // Booking Handlers
  private async handleNewAppointment(): Promise<CalendarVoiceResult> {
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Starting new appointment booking. What service would you like to book?`,
      data: { bookingMode: true, step: 'service' }
    }
  }

  private async handleBookService(service?: string): Promise<CalendarVoiceResult> {
    if (!service) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: 'Please specify which service you want to book.',
        error: 'No service specified'
      }
    }

    return {
      success: true,
      action: this.context.lastAction!,
      response: `Booking ${service} service. When would you like to schedule this?`,
      data: { service, bookingMode: true, step: 'time' }
    }
  }

  private async handleBookTime(time?: string): Promise<CalendarVoiceResult> {
    if (!time) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: 'Please specify a time for your appointment.',
        error: 'No time specified'
      }
    }

    const appointmentTime = this.parseTime(time)
    if (!appointmentTime) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: `I couldn't understand the time "${time}". Try saying "2 PM" or "tomorrow at 10 AM".`,
        error: 'Invalid time format'
      }
    }

    return {
      success: true,
      action: this.context.lastAction!,
      response: `Scheduling appointment for ${appointmentTime.toLocaleString()}. Which barber would you prefer?`,
      data: { appointmentTime, bookingMode: true, step: 'barber' }
    }
  }

  private async handleSelectBarber(barber?: string): Promise<CalendarVoiceResult> {
    if (!barber) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: 'Please specify which barber you\'d like to book with.',
        error: 'No barber specified'
      }
    }

    return {
      success: true,
      action: this.context.lastAction!,
      response: `Great! I'll book you with ${barber}. Confirming your appointment details now.`,
      data: { barber, bookingMode: true, step: 'confirm' }
    }
  }

  // Search and Filter Handlers
  private async handleSearchClient(client?: string): Promise<CalendarVoiceResult> {
    if (!client) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: 'Please specify which client you want to search for.',
        error: 'No client specified'
      }
    }

    return {
      success: true,
      action: this.context.lastAction!,
      response: `Searching for appointments with ${client}...`,
      data: { searchQuery: client, searchType: 'client' }
    }
  }

  private async handleSearchService(service?: string): Promise<CalendarVoiceResult> {
    if (!service) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: 'Please specify which service you want to search for.',
        error: 'No service specified'
      }
    }

    return {
      success: true,
      action: this.context.lastAction!,
      response: `Searching for ${service} appointments...`,
      data: { searchQuery: service, searchType: 'service' }
    }
  }

  private async handleFilterBarber(barber?: string): Promise<CalendarVoiceResult> {
    if (!barber) {
      return {
        success: false,
        action: this.context.lastAction!,
        response: 'Please specify which barber\'s schedule you want to see.',
        error: 'No barber specified'
      }
    }

    return {
      success: true,
      action: this.context.lastAction!,
      response: `Showing ${barber}'s schedule`,
      data: { filterBarber: barber }
    }
  }

  // Utility Handlers
  private async handleShowConflicts(): Promise<CalendarVoiceResult> {
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Checking for scheduling conflicts...`,
      data: { showConflicts: true }
    }
  }

  private async handleOptimizeSchedule(): Promise<CalendarVoiceResult> {
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Running schedule optimization analysis...`,
      data: { optimizeSchedule: true }
    }
  }

  private async handleCheckAvailability(): Promise<CalendarVoiceResult> {
    return {
      success: true,
      action: this.context.lastAction!,
      response: `Checking available appointment slots...`,
      data: { checkAvailability: true }
    }
  }

  // Helper Methods
  private parseNaturalDate(dateString: string): Date | null {
    const today = new Date()
    const lower = dateString.toLowerCase()

    // Handle relative dates
    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      return tomorrow
    }

    if (lower.includes('yesterday')) {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      return yesterday
    }

    // Handle day names
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayIndex = dayNames.findIndex(day => lower.includes(day))
    
    if (dayIndex !== -1) {
      const targetDate = new Date(today)
      const currentDay = today.getDay()
      const daysUntilTarget = (dayIndex - currentDay + 7) % 7
      targetDate.setDate(today.getDate() + (daysUntilTarget || 7))
      return targetDate
    }

    // Handle "next [day]" and "this [day]"
    if (lower.includes('next')) {
      const dayMatch = dayNames.find(day => lower.includes(day))
      if (dayMatch) {
        const dayIndex = dayNames.indexOf(dayMatch)
        const targetDate = new Date(today)
        const currentDay = today.getDay()
        const daysUntilTarget = (dayIndex - currentDay + 7) % 7 || 7
        targetDate.setDate(today.getDate() + daysUntilTarget)
        return targetDate
      }
    }

    return null
  }

  private parseTime(timeString: string): Date | null {
    const today = new Date()
    const lower = timeString.toLowerCase()

    // Handle common time formats
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2] || '0')
      const period = timeMatch[3]

      if (period === 'pm' && hours !== 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0

      const appointmentTime = new Date(today)
      appointmentTime.setHours(hours, minutes, 0, 0)

      // If the time has passed today, assume tomorrow
      if (appointmentTime < today) {
        appointmentTime.setDate(today.getDate() + 1)
      }

      return appointmentTime
    }

    return null
  }

  private updateContext(action: CalendarVoiceAction, data: any): void {
    if (data.date) {
      this.context.selectedDate = data.date
    }
    
    if (data.view) {
      this.context.currentView = data.view
    }
    
    if (data.bookingMode !== undefined) {
      this.context.isBookingMode = data.bookingMode
    }
    
    if (data.searchQuery) {
      this.context.searchQuery = data.searchQuery
    }
  }

  private notifyListeners(result: CalendarVoiceResult): void {
    this.listeners.forEach(listener => {
      try {
        listener(result)
      } catch (error) {
        console.error('Error in voice command listener:', error)
      }
    })
  }

  // Public Methods
  public registerActionHandler(
    action: string, 
    handler: (params: any) => Promise<CalendarVoiceResult>
  ): void {
    this.actionHandlers.set(action, handler)
  }

  public addListener(listener: (result: CalendarVoiceResult) => void): void {
    this.listeners.add(listener)
  }

  public removeListener(listener: (result: CalendarVoiceResult) => void): void {
    this.listeners.delete(listener)
  }

  public getContext(): CalendarContextState {
    return { ...this.context }
  }

  public updateContext(updates: Partial<CalendarContextState>): void {
    this.context = { ...this.context, ...updates }
  }

  public startListening(): void {
    this.voiceSystem.startListening()
  }

  public stopListening(): void {
    this.voiceSystem.stopListening()
  }

  public isListening(): boolean {
    return this.voiceSystem.getStatus().isListening
  }

  public speak(text: string): void {
    this.voiceSystem.speak(text)
  }

  public getVoiceCommands(): VoiceCommand[] {
    return this.voiceSystem.getCommands().filter(cmd => 
      cmd.action.startsWith('calendar:')
    )
  }
}

// Export singleton instance
let calendarVoiceSystem: CalendarVoiceCommandSystem | null = null

export function getCalendarVoiceSystem(): CalendarVoiceCommandSystem {
  if (!calendarVoiceSystem) {
    calendarVoiceSystem = new CalendarVoiceCommandSystem()
  }
  return calendarVoiceSystem
}

export { CalendarVoiceCommandSystem }
export default getCalendarVoiceSystem