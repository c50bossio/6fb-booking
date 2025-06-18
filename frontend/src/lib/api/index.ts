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