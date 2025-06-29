/**
 * Contrast-safe utility classes and functions
 * 
 * This file provides improved color classes that ensure proper contrast ratios
 * for both light and dark modes, meeting WCAG accessibility standards.
 */

// Contrast-safe text color classes that replace problematic ones
export const contrastSafeClasses = {
  // Replace text-gray-400 with these safer options
  secondary: 'text-gray-700 dark:text-gray-300',
  muted: 'text-gray-600 dark:text-gray-400', 
  subtle: 'text-gray-800 dark:text-gray-200',
  
  // For loading states and placeholders
  loading: 'text-gray-800 dark:text-gray-200',
  placeholder: 'text-gray-700 dark:text-gray-300',
  
  // For labels and descriptions
  label: 'text-gray-900 dark:text-gray-100',
  description: 'text-gray-700 dark:text-gray-300',
  
  // For status indicators
  success: 'text-green-700 dark:text-green-300',
  warning: 'text-yellow-700 dark:text-yellow-300',
  error: 'text-red-700 dark:text-red-300',
  info: 'text-blue-700 dark:text-blue-300',
} as const

// Helper function to get contrast-safe class
export function getContrastSafeClass(type: keyof typeof contrastSafeClasses): string {
  return contrastSafeClasses[type]
}

// Common problematic patterns and their replacements
export const contrastReplacements = {
  // Text classes that commonly cause issues
  'text-gray-400': contrastSafeClasses.secondary,
  'text-gray-400 dark:text-gray-500': contrastSafeClasses.secondary,
  'text-gray-500': contrastSafeClasses.muted,
  'text-gray-600 dark:text-gray-300': contrastSafeClasses.loading,
  'text-gray-300': contrastSafeClasses.subtle,
  
  // Opacity-based issues
  'opacity-50': 'opacity-75', // Increase minimum opacity
  'opacity-40': 'opacity-70',
  'opacity-30': 'opacity-60',
} as const

// Utility to replace problematic classes in className strings
export function improveContrast(className: string): string {
  let improved = className
  
  Object.entries(contrastReplacements).forEach(([problematic, replacement]) => {
    improved = improved.replace(new RegExp(problematic, 'g'), replacement)
  })
  
  return improved
}

// Pre-defined contrast-safe component classes
export const contrastSafeComponents = {
  cardSubtitle: contrastSafeClasses.description,
  cardDescription: contrastSafeClasses.muted,
  buttonSecondary: contrastSafeClasses.secondary,
  inputLabel: contrastSafeClasses.label,
  inputDescription: contrastSafeClasses.description,
  loadingText: contrastSafeClasses.loading,
  metricLabel: contrastSafeClasses.label,
  metricDescription: contrastSafeClasses.description,
}

export default contrastSafeClasses