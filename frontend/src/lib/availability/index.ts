/**
 * Real-time availability system exports
 */

// Core availability service
export {
  availabilityService,
  type AvailabilitySlot,
  type AvailabilityRequest,
  type AvailabilityResponse,
  type SlotRecommendation,
  type ConflictResolutionOptions
} from './availability-service'

// Conflict resolution system
export {
  conflictResolver,
  type SchedulingConflict,
  type ConflictContext,
  type ConflictResolution,
  type ReschedulingOptions,
  ConflictType,
  ConflictSeverity,
  ResolutionType
} from './conflict-resolver'

// React hooks
export {
  useAvailability,
  useConflictDetection,
  useSlotReservation,
  type UseAvailabilityState,
  type UseAvailabilityActions,
  type UseAvailabilityOptions,
  type UseAvailabilityReturn
} from '../../hooks/useAvailability'

// UI Components
export {
  AvailabilityIndicator as default,
  AvailabilityIndicator
} from '../../components/calendar/AvailabilityIndicator'
