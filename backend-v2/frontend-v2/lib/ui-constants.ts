// UI Constants and Design System Configuration
// This file centralizes all UI-related constants for consistency across the application

// Loading States
export const LOADING_MESSAGES = {
  default: 'Loading...',
  fetchingData: 'Fetching data...',
  savingChanges: 'Saving changes...',
  deletingItem: 'Deleting item...',
  uploadingFile: 'Uploading file...',
  processingRequest: 'Processing request...',
  loadingBookings: 'Loading your bookings...',
  loadingClients: 'Loading clients...',
  loadingAnalytics: 'Loading analytics...',
  loadingCalendar: 'Loading calendar...',
  authenticating: 'Authenticating...',
  sendingEmail: 'Sending email...',
  generatingReport: 'Generating report...',
} as const

// Empty States
export const EMPTY_STATES = {
  bookings: {
    title: 'No bookings yet',
    description: "You haven't made any bookings yet. Book your first appointment now!",
    action: 'Book Now',
    icon: '📅'
  },
  clients: {
    title: 'No clients found',
    description: 'Start building your client base by adding your first client.',
    action: 'Add Client',
    icon: '👥'
  },
  products: {
    title: 'No products available',
    description: 'Add products to your inventory to start selling.',
    action: 'Add Product',
    icon: '📦'
  },
  services: {
    title: 'No services configured',
    description: 'Set up your services to start accepting bookings.',
    action: 'Add Service',
    icon: '✂️'
  },
  appointments: {
    title: 'No appointments scheduled',
    description: 'Your calendar is clear. Time to book some appointments!',
    action: 'View Available Times',
    icon: '🗓️'
  },
  reviews: {
    title: 'No reviews yet',
    description: 'Reviews from happy clients will appear here.',
    action: 'Request Reviews',
    icon: '⭐'
  },
  analytics: {
    title: 'No data available',
    description: 'Analytics data will appear once you start getting bookings.',
    action: 'Learn More',
    icon: '📊'
  },
  notifications: {
    title: 'All caught up!',
    description: 'You have no new notifications.',
    action: null,
    icon: '🔔'
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.',
    action: 'Clear Search',
    icon: '🔍'
  }
} as const

// Error Messages
export const ERROR_MESSAGES = {
  generic: 'Something went wrong. Please try again.',
  network: 'Unable to connect to the server. Please check your internet connection.',
  timeout: 'The request took too long. Please try again.',
  notFound: 'The requested resource was not found.',
  unauthorized: 'You need to be logged in to access this.',
  forbidden: "You don't have permission to perform this action.",
  serverError: 'Server error. Our team has been notified.',
  validation: 'Please check your input and try again.',
  fileUpload: 'Failed to upload file. Please try again.',
  payment: 'Payment processing failed. Please try again.',
  booking: 'Unable to complete booking. Please try again.',
  cancellation: 'Unable to cancel appointment. Please try again.',
  dataLoad: 'Failed to load data. Please refresh the page.',
  save: 'Failed to save changes. Please try again.',
  delete: 'Failed to delete item. Please try again.',
  emailVerification: 'Please verify your email address before signing in.',
  sessionExpired: 'Your session has expired. Please log in again.',
  rateLimited: 'Too many requests. Please wait a moment and try again.'
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  saved: 'Changes saved successfully!',
  deleted: 'Item deleted successfully!',
  created: 'Created successfully!',
  updated: 'Updated successfully!',
  bookingConfirmed: 'Booking confirmed successfully!',
  bookingCancelled: 'Booking cancelled successfully.',
  bookingRescheduled: 'Appointment rescheduled successfully!',
  paymentComplete: 'Payment completed successfully!',
  emailSent: 'Email sent successfully!',
  fileuploaded: 'File uploaded successfully!',
  profileUpdated: 'Profile updated successfully!',
  passwordChanged: 'Password changed successfully!',
  verificationSent: 'Verification email sent!',
  copied: 'Copied to clipboard!',
  reviewSubmitted: 'Review submitted successfully!'
} as const

// Confirmation Messages
export const CONFIRMATION_MESSAGES = {
  delete: {
    title: 'Delete Confirmation',
    message: 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  },
  cancel: {
    title: 'Cancel Appointment',
    message: 'Are you sure you want to cancel this appointment?',
    confirmText: 'Yes, Cancel',
    cancelText: 'Keep Appointment'
  },
  unsavedChanges: {
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to leave?',
    confirmText: 'Leave',
    cancelText: 'Stay'
  },
  logout: {
    title: 'Logout',
    message: 'Are you sure you want to logout?',
    confirmText: 'Logout',
    cancelText: 'Cancel'
  },
  bulkDelete: {
    title: 'Bulk Delete',
    message: 'Are you sure you want to delete {count} items? This action cannot be undone.',
    confirmText: 'Delete All',
    cancelText: 'Cancel'
  }
} as const

// Form Labels
export const FORM_LABELS = {
  email: 'Email Address',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  firstName: 'First Name',
  lastName: 'Last Name',
  phone: 'Phone Number',
  address: 'Address',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP Code',
  country: 'Country',
  date: 'Date',
  time: 'Time',
  service: 'Service',
  barber: 'Barber',
  notes: 'Notes',
  price: 'Price',
  duration: 'Duration',
  status: 'Status',
  paymentMethod: 'Payment Method',
  cardNumber: 'Card Number',
  expiryDate: 'Expiry Date',
  cvv: 'CVV',
  timezone: 'Timezone'
} as const

// Placeholder Text
export const PLACEHOLDERS = {
  email: 'Enter your email',
  password: 'Enter your password',
  search: 'Search...',
  firstName: 'John',
  lastName: 'Doe',
  phone: '(555) 123-4567',
  notes: 'Add any special instructions or notes...',
  filter: 'Filter by...',
  selectOption: 'Select an option',
  date: 'MM/DD/YYYY',
  time: 'HH:MM AM/PM',
  price: '0.00',
  duration: '30 minutes'
} as const

// Button Text
export const BUTTON_TEXT = {
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  update: 'Update',
  submit: 'Submit',
  confirm: 'Confirm',
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
  retry: 'Try Again',
  refresh: 'Refresh',
  loadMore: 'Load More',
  viewAll: 'View All',
  close: 'Close',
  apply: 'Apply',
  reset: 'Reset',
  export: 'Export',
  import: 'Import',
  download: 'Download',
  upload: 'Upload',
  share: 'Share',
  print: 'Print',
  copy: 'Copy',
  login: 'Login',
  logout: 'Logout',
  signup: 'Sign Up',
  forgotPassword: 'Forgot Password?',
  resetPassword: 'Reset Password',
  changePassword: 'Change Password',
  bookNow: 'Book Now',
  reschedule: 'Reschedule',
  cancelBooking: 'Cancel Booking',
  viewDetails: 'View Details',
  addNew: 'Add New',
  sendInvite: 'Send Invite',
  resendEmail: 'Resend Email'
} as const

// Accessibility Labels
export const ARIA_LABELS = {
  closeModal: 'Close modal',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  previousPage: 'Go to previous page',
  nextPage: 'Go to next page',
  selectAll: 'Select all items',
  deselectAll: 'Deselect all items',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  filter: 'Filter results',
  search: 'Search',
  loading: 'Loading content',
  error: 'Error message',
  success: 'Success message',
  warning: 'Warning message',
  info: 'Information message',
  required: 'Required field',
  optional: 'Optional field',
  expandRow: 'Expand row',
  collapseRow: 'Collapse row',
  viewMore: 'View more options',
  viewLess: 'View less options',
  mainNavigation: 'Main navigation',
  userMenu: 'User menu',
  breadcrumb: 'Breadcrumb navigation',
  pagination: 'Pagination controls',
  calendar: 'Calendar navigation',
  timeSlot: 'Available time slot'
} as const

// Validation Messages
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  minLength: 'Must be at least {min} characters',
  maxLength: 'Must be no more than {max} characters',
  minValue: 'Must be at least {min}',
  maxValue: 'Must be no more than {max}',
  pattern: 'Please enter a valid format',
  passwordMatch: 'Passwords do not match',
  futureDate: 'Please select a future date',
  pastDate: 'Please select a past date',
  invalidDate: 'Please enter a valid date',
  invalidTime: 'Please enter a valid time',
  fileSize: 'File size must be less than {size}',
  fileType: 'File type must be {types}',
  unique: 'This value already exists',
  url: 'Please enter a valid URL',
  alphanumeric: 'Only letters and numbers are allowed',
  numeric: 'Only numbers are allowed',
  alphabetic: 'Only letters are allowed'
} as const

// File Upload
export const FILE_UPLOAD = {
  maxSize: 5 * 1024 * 1024, // 5MB
  acceptedTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
  },
  messages: {
    dragDrop: 'Drag and drop files here or click to browse',
    uploading: 'Uploading... {progress}%',
    processing: 'Processing file...',
    complete: 'Upload complete',
    error: 'Upload failed. Please try again.'
  }
} as const

// Date/Time Formats
export const DATE_TIME_FORMATS = {
  date: {
    short: 'MM/DD/YY',
    medium: 'MMM D, YYYY',
    long: 'MMMM D, YYYY',
    full: 'EEEE, MMMM D, YYYY'
  },
  time: {
    short: 'h:mm A',
    medium: 'h:mm:ss A',
    long: 'h:mm:ss A z'
  },
  dateTime: {
    short: 'MM/DD/YY h:mm A',
    medium: 'MMM D, YYYY h:mm A',
    long: 'MMMM D, YYYY at h:mm A',
    full: 'EEEE, MMMM D, YYYY at h:mm A'
  }
} as const

// Animation Durations
export const ANIMATION_DURATIONS = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 1000
} as const

// Z-Index Layers
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
  debug: 90
} as const

// Mobile Breakpoints
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
  ultrawide: 1536
} as const