// Business logic constants

export const APPOINTMENT_DURATIONS = {
  QUICK: 15,
  SHORT: 30,
  STANDARD: 45,
  LONG: 60,
  EXTENDED: 90,
  CUSTOM: 0
} as const;

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded'
} as const;

export const BOOKING_RULES = {
  MIN_ADVANCE_BOOKING_HOURS: 1,
  MAX_ADVANCE_BOOKING_DAYS: 90,
  CANCELLATION_DEADLINE_HOURS: 24,
  MAX_APPOINTMENTS_PER_DAY: 20,
  BUFFER_TIME_MINUTES: 15
} as const;

export const SIX_FIGURE_METRICS = {
  TARGET_CLIENTS_PER_DAY: 8,
  TARGET_AVERAGE_TICKET: 50,
  TARGET_DAYS_PER_WEEK: 5,
  TARGET_WEEKS_PER_YEAR: 50,
  TARGET_ANNUAL_REVENUE: 100000,
  IDEAL_SERVICE_TIME_MINUTES: 45,
  IDEAL_RETENTION_RATE: 0.8,
  IDEAL_REBOOK_RATE: 0.7
} as const;

export const COMMISSION_RATES = {
  STANDARD: 0.6, // 60% to barber
  SENIOR: 0.65,
  MASTER: 0.7,
  BOOTH_RENTAL: 1.0 // 100% to barber
} as const;