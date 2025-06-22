// Main Calendar Components
export { default as PremiumCalendar } from './PremiumCalendar'
export { default as CalendarSystem } from './CalendarSystem'
export { default as ResponsiveCalendar } from './ResponsiveCalendar'
export { default as MobileCalendar } from './MobileCalendar'
export { default as DragDropCalendar } from './DragDropCalendar'

// Modal Components
export { default as AppointmentCreateModal } from './AppointmentCreateModal'
export { default as AppointmentDetailsModal } from './AppointmentDetailsModal'

// Types
export type { CalendarAppointment, CalendarProps } from './PremiumCalendar'
export type { AppointmentFormData, Service, Barber } from './AppointmentCreateModal'

// Hooks and Utilities
export { 
  useResponsiveCalendar, 
  BREAKPOINTS, 
  mediaQueries, 
  responsiveStyles 
} from './ResponsiveCalendar'
export { useDragDrop } from './DragDropCalendar'

// Re-export everything for convenience
export * from './PremiumCalendar'
export * from './AppointmentCreateModal'
export * from './AppointmentDetailsModal'
export * from './ResponsiveCalendar'
export * from './DragDropCalendar'