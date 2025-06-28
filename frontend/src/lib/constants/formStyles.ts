/**
 * Consistent form styling constants to ensure proper text visibility
 * and consistent appearance across the application
 */

export const formStyles = {
  // Base input styles with proper text color
  input: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900 bg-white placeholder:text-gray-400',

  // Textarea styles
  textarea: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900 bg-white placeholder:text-gray-400',

  // Select/dropdown styles
  select: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900 bg-white',

  // Checkbox styles
  checkbox: 'h-4 w-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500',

  // Radio button styles
  radio: 'h-4 w-4 text-slate-600 border-gray-300 focus:ring-slate-500',

  // Label styles
  label: 'block text-sm font-medium text-gray-700 mb-2',

  // Error message styles
  error: 'mt-1 text-sm text-red-600',

  // Helper text styles
  helper: 'mt-1 text-sm text-gray-500',

  // Form group wrapper
  formGroup: 'space-y-4',

  // Button styles
  button: {
    primary: 'w-full px-6 py-3 bg-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'w-full px-6 py-3 bg-gray-200 text-gray-900 text-lg font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'w-full px-6 py-3 border-2 border-slate-700 text-slate-700 text-lg font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  }
} as const

// Utility function to combine class names
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ')
}
