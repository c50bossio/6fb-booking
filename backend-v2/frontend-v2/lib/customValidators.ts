import { ValidationRule } from '@/hooks/useFormValidation';

/**
 * Custom validators for BookedBarber forms
 */

// Validate US ZIP code
export const zipCode = (message = 'Please enter a valid 5-digit ZIP code'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(value);
  },
  message,
});

// Validate credit card number using Luhn algorithm
export const creditCard = (message = 'Please enter a valid credit card number'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Check length
    if (digits.length < 13 || digits.length > 19) return false;
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  },
  message,
});

// Validate time in HH:MM format
export const time = (message = 'Please enter a valid time (HH:MM)'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(value);
  },
  message,
});

// Validate date is not in the past
export const futureDate = (message = 'Date must be in the future'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  },
  message,
});

// Validate date is within a range
export const dateRange = (minDays: number, maxDays: number, message?: string): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    const date = new Date(value);
    const today = new Date();
    const minDate = new Date(today);
    const maxDate = new Date(today);
    
    minDate.setDate(minDate.getDate() + minDays);
    maxDate.setDate(maxDate.getDate() + maxDays);
    
    return date >= minDate && date <= maxDate;
  },
  message: message || `Date must be between ${minDays} and ${maxDays} days from today`,
});

// Validate business hours
export const businessHours = (message = 'Please enter valid business hours'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    
    // Expected format: "9:00 AM - 5:00 PM"
    const hoursRegex = /^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)\s*-\s*(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)$/i;
    if (!hoursRegex.test(value)) return false;
    
    // Parse times and ensure open time is before close time
    const match = value.match(hoursRegex);
    if (!match) return false;
    
    const openHour = parseInt(match[1], 10);
    const openMinute = parseInt(match[2], 10);
    const openPeriod = match[3].toUpperCase();
    const closeHour = parseInt(match[4], 10);
    const closeMinute = parseInt(match[5], 10);
    const closePeriod = match[6].toUpperCase();
    
    // Convert to 24-hour format
    let openTime = openHour === 12 ? 0 : openHour;
    if (openPeriod === 'PM') openTime += 12;
    openTime = openTime * 60 + openMinute;
    
    let closeTime = closeHour === 12 ? 0 : closeHour;
    if (closePeriod === 'PM') closeTime += 12;
    closeTime = closeTime * 60 + closeMinute;
    
    return openTime < closeTime;
  },
  message,
});

// Validate URL
export const url = (message = 'Please enter a valid URL'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  message,
});

// Validate Instagram handle
export const instagram = (message = 'Please enter a valid Instagram handle'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    const igRegex = /^@?[a-zA-Z0-9_.]{1,30}$/;
    return igRegex.test(value);
  },
  message,
});

// Validate price format
export const price = (message = 'Please enter a valid price'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    const priceRegex = /^\d+(\.\d{1,2})?$/;
    return priceRegex.test(value) && parseFloat(value) >= 0;
  },
  message,
});

// Validate percentage
export const percentage = (message = 'Please enter a valid percentage (0-100)'): ValidationRule => ({
  validate: (value) => {
    if (!value && value !== 0) return true; // Let required validator handle empty values
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  },
  message,
});

// Validate at least one checkbox is selected
export const atLeastOne = (fieldNames: string[], message = 'Please select at least one option'): ValidationRule => ({
  validate: (value, formState) => {
    if (!formState) return true;
    
    // Check if current field is true
    if (value === true) return true;
    
    // Check if any other specified fields are true
    return fieldNames.some(fieldName => formState[fieldName]?.value === true);
  },
  message,
});

// Validate booking slot duration
export const duration = (minMinutes: number, maxMinutes: number, message?: string): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    const minutes = parseInt(value, 10);
    return !isNaN(minutes) && minutes >= minMinutes && minutes <= maxMinutes;
  },
  message: message || `Duration must be between ${minMinutes} and ${maxMinutes} minutes`,
});

// Validate barber license number
export const licenseNumber = (message = 'Please enter a valid license number'): ValidationRule => ({
  validate: (value) => {
    if (!value) return true; // Let required validator handle empty values
    // This is a generic pattern - adjust based on your state's requirements
    const licenseRegex = /^[A-Z0-9]{6,12}$/;
    return licenseRegex.test(value.toUpperCase());
  },
  message,
});