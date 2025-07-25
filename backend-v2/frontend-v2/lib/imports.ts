/**
 * Centralized Import Management
 * 
 * This module provides centralized import paths and utilities for the frontend,
 * making it easier to maintain and refactor import statements.
 */

// Core utilities from backend
export { 
  StringUtils, 
  DateTimeUtils, 
  MoneyUtils, 
  SecurityUtils,
  CollectionUtils,
  AsyncUtils,
  ValidationUtils,
  JSONUtils,
  ErrorUtils
} from '@/core/utils';

// Exception classes
export * from '@/core/exceptions';

// Configuration
export { ConfigFactory, get_settings } from '@/core/config';

// Dependency injection
export { container, inject, injectable, singleton } from '@/core/container';

// Interfaces
export * from '@/core/interfaces';

// Re-export commonly used utilities with shorter names
export const {
  generateId,
  slugify,
  truncate,
  maskEmail,
  maskPhone,
  validateEmail,
  validatePhone,
  formatPhone
} = StringUtils;

export const {
  nowUtc,
  toTimezone,
  formatDuration,
  businessHoursOnly,
  roundToNearestMinute,
  getWeekRange,
  getMonthRange
} = DateTimeUtils;

export const {
  roundCurrency,
  formatCurrency,
  centsToDollars,
  dollarsToCents,
  calculatePercentage,
  calculateTax,
  calculateTip
} = MoneyUtils;

export const {
  generateToken,
  generateVerificationCode,
  hashString,
  verifyHash,
  sanitizeFilename
} = SecurityUtils;

export const {
  chunkList,
  flattenList,
  groupBy,
  uniqueBy,
  safeGet
} = CollectionUtils;

export const {
  gatherWithLimit,
  retryAsync
} = AsyncUtils;

export const {
  validateUuid,
  validatePrice,
  validateTimeSlot,
  validateDateRange
} = ValidationUtils;