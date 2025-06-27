/**
 * Main API service exports
 */
export { authService } from './auth'
export { usersService } from './users'
export { locationsService } from './locations'
export { analyticsService } from './analytics'
export { appointmentsService } from './appointments'
export { trainingService } from './training'
export { notificationsService } from './notifications'
export { bookingService } from './bookings'

// Enhanced services
export { calendarService } from './calendar'
export { servicesService } from './services'
export { barbersService } from './barbers'

// Re-export types
export type {
  User,
  Location,
  Barber,
  Appointment,
  TrainingModule,
  ApiResponse,
  PaginatedResponse,
  ErrorResponse
} from './client'

// Re-export booking types
export type {
  Booking,
  BookingRequest,
  Service,
  ServiceAddon,
  ServiceCategory,
  AvailabilitySlot,
  BarberAvailability,
  AvailabilityRequest
} from './bookings'

// Re-export calendar types
export type {
  CalendarEvent,
  CalendarAppointment,
  CalendarAvailability,
  TimeSlot,
  CalendarViewOptions,
  CalendarFilters,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  CreateAvailabilityRequest,
  BulkOperationRequest,
  CalendarStats,
  ConflictCheck
} from './calendar'

// Re-export enhanced appointment types
export type {
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentFilter,
  BarberAvailability as EnhancedBarberAvailability,
  AppointmentStats,
  AppointmentConflict,
  RescheduleSuggestion,
  AppointmentReminder
} from './appointments'

// Re-export service types
export type {
  ServiceCategory as EnhancedServiceCategory,
  Service as EnhancedService,
  ServiceAddon as EnhancedServiceAddon,
  ServicePackage,
  PricingRule,
  ServiceAvailability,
  ServiceFilter,
  ServiceStats,
  CreateServiceRequest,
  UpdateServiceRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest
} from './services'

// Re-export barber types
export type {
  BarberProfile,
  BarberCertification,
  BarberGalleryItem,
  BarberSchedule,
  BarberAvailabilityBlock,
  BarberTimeSlot,
  BarberStats,
  BarberFilter,
  CreateBarberRequest,
  UpdateBarberRequest,
  ScheduleTemplate
} from './barbers'

// Re-export location types
export type {
  ExtendedLocation,
  LocationHours,
  SpecialHours,
  LocationBookingSettings,
  LocationImage,
  LocationStats,
  LocationFilter,
  CreateLocationRequest,
  UpdateLocationRequest
} from './locations'

// Gift certificates service
export { giftCertificatesApi } from './gift-certificates'

// Re-export utilities
export { TimezoneHelper } from '../utils/datetime'
