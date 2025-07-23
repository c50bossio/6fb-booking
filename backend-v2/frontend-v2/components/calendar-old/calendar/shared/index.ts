// Modal components
export { ModalLayout, PremiumModalLayout } from './ModalLayout'

// Form components
export { ClientSelector } from './ClientSelector'
export { ServiceSelector, groupServicesByCategory } from './ServiceSelector'
export { BarberSelector, sortBarbersByName } from './BarberSelector'
export { DateTimePicker } from './DateTimePicker'
export { RecurringOptions, getNextOccurrences } from './RecurringOptions'
export { NotificationPreferences, CompactNotificationPreferences } from './NotificationPreferences'

// Re-export types for convenience
export type { Service, Client, User, TimeSlot } from '@/lib/api'