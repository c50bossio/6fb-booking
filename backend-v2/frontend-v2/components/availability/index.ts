/**
 * Barber Availability Management System - Component Exports
 * Comprehensive system for managing barber schedules, time off, and analytics
 */

export { BarberAvailabilityManager } from '../BarberAvailabilityManager';
export { BulkAvailabilityManager } from './BulkAvailabilityManager';
export { TimeOffApprovalWorkflow } from './TimeOffApprovalWorkflow';
export { AvailabilityAnalytics } from './AvailabilityAnalytics';
export { ConflictDetection } from './ConflictDetection';

// Re-export service and hooks
export { barberAvailabilityService } from '../../services/barber-availability';
export { 
  useBarberAvailability,
  useTimeOffRequests,
  useAvailabilityCheck,
  useBarberSchedule,
  useAvailabilityAnalytics,
  useConflictDetection,
  useCalendarIntegration,
  useRevenueOptimization
} from '../../hooks/useBarberAvailability';

// Type exports
export type {
  BarberAvailability,
  TimeOffRequest,
  SpecialAvailability,
  BarberSchedule,
  UtilizationAnalytics,
  AvailabilityCheck,
  BulkAvailabilityUpdate,
  CapacitySettings
} from '../../services/barber-availability';