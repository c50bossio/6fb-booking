/**
 * Component Registry
 * 
 * This file maintains a registry of all allowed components in the application.
 * Components not listed here will trigger build warnings.
 * 
 * This helps prevent:
 * - Component sprawl
 * - Duplicate components
 * - Unauthorized third-party components
 * - Inconsistent component usage
 */

export interface ComponentRegistryEntry {
  name: string;
  path: string;
  category: 'ui' | 'layout' | 'form' | 'feedback' | 'data' | 'navigation' | 'utility';
  description: string;
  deprecated?: boolean;
  replacement?: string;
}

export const componentRegistry: ComponentRegistryEntry[] = [
  // UI Components
  {
    name: 'Button',
    path: '@/components/ui/button',
    category: 'ui',
    description: 'Primary button component with variants'
  },
  {
    name: 'Card',
    path: '@/components/ui/card',
    category: 'ui',
    description: 'Container component for content grouping'
  },
  {
    name: 'Dialog',
    path: '@/components/ui/dialog',
    category: 'ui',
    description: 'Modal dialog component'
  },
  {
    name: 'Badge',
    path: '@/components/ui/badge',
    category: 'ui',
    description: 'Status and label badges'
  },
  {
    name: 'Avatar',
    path: '@/components/ui/avatar',
    category: 'ui',
    description: 'User avatar display'
  },
  {
    name: 'Separator',
    path: '@/components/ui/separator',
    category: 'ui',
    description: 'Visual separator line'
  },
  {
    name: 'Skeleton',
    path: '@/components/ui/skeleton',
    category: 'ui',
    description: 'Loading placeholder component'
  },
  {
    name: 'Tooltip',
    path: '@/components/ui/tooltip',
    category: 'ui',
    description: 'Hover tooltip component'
  },

  // Form Components
  {
    name: 'Form',
    path: '@/components/ui/form',
    category: 'form',
    description: 'Form wrapper with validation'
  },
  {
    name: 'Input',
    path: '@/components/ui/input',
    category: 'form',
    description: 'Text input field'
  },
  {
    name: 'Label',
    path: '@/components/ui/label',
    category: 'form',
    description: 'Form field label'
  },
  {
    name: 'Select',
    path: '@/components/ui/select',
    category: 'form',
    description: 'Dropdown select component'
  },
  {
    name: 'Textarea',
    path: '@/components/ui/textarea',
    category: 'form',
    description: 'Multi-line text input'
  },
  {
    name: 'Checkbox',
    path: '@/components/ui/checkbox',
    category: 'form',
    description: 'Checkbox input'
  },
  {
    name: 'RadioGroup',
    path: '@/components/ui/radio-group',
    category: 'form',
    description: 'Radio button group'
  },
  {
    name: 'Switch',
    path: '@/components/ui/switch',
    category: 'form',
    description: 'Toggle switch component'
  },

  // Layout Components
  {
    name: 'Layout',
    path: '@/app/layout',
    category: 'layout',
    description: 'Root application layout'
  },
  {
    name: 'DashboardLayout',
    path: '@/components/layouts/DashboardLayout',
    category: 'layout',
    description: 'Dashboard page layout'
  },
  {
    name: 'AuthLayout',
    path: '@/components/layouts/AuthLayout',
    category: 'layout',
    description: 'Authentication pages layout'
  },

  // Navigation Components
  {
    name: 'Navbar',
    path: '@/components/navigation/Navbar',
    category: 'navigation',
    description: 'Main navigation bar'
  },
  {
    name: 'Sidebar',
    path: '@/components/navigation/Sidebar',
    category: 'navigation',
    description: 'Side navigation menu'
  },
  {
    name: 'Breadcrumb',
    path: '@/components/ui/breadcrumb',
    category: 'navigation',
    description: 'Breadcrumb navigation'
  },
  {
    name: 'Tabs',
    path: '@/components/ui/tabs',
    category: 'navigation',
    description: 'Tab navigation component'
  },

  // Feedback Components
  {
    name: 'Alert',
    path: '@/components/ui/alert',
    category: 'feedback',
    description: 'Alert message component'
  },
  {
    name: 'Toast',
    path: '@/components/ui/toast',
    category: 'feedback',
    description: 'Toast notification component'
  },
  {
    name: 'Progress',
    path: '@/components/ui/progress',
    category: 'feedback',
    description: 'Progress bar component'
  },
  {
    name: 'Spinner',
    path: '@/components/ui/spinner',
    category: 'feedback',
    description: 'Loading spinner'
  },

  // Data Display Components
  {
    name: 'Table',
    path: '@/components/ui/table',
    category: 'data',
    description: 'Data table component'
  },
  {
    name: 'DataTable',
    path: '@/components/ui/data-table',
    category: 'data',
    description: 'Advanced data table with sorting and filtering'
  },
  {
    name: 'Calendar',
    path: '@/components/ui/calendar',
    category: 'data',
    description: 'Calendar component for date selection and display'
  },
  {
    name: 'Chart',
    path: '@/components/ui/chart',
    category: 'data',
    description: 'Chart component for data visualization'
  },

  // Business-Specific Components
  {
    name: 'BookingCalendar',
    path: '@/components/booking/BookingCalendar',
    category: 'utility',
    description: 'Booking-specific calendar component'
  },
  {
    name: 'AppointmentCard',
    path: '@/components/appointments/AppointmentCard',
    category: 'utility',
    description: 'Appointment display card'
  },
  {
    name: 'ServiceSelector',
    path: '@/components/booking/ServiceSelector',
    category: 'utility',
    description: 'Service selection component'
  },
  {
    name: 'BarberCard',
    path: '@/components/barbers/BarberCard',
    category: 'utility',
    description: 'Barber profile card'
  },
  {
    name: 'PaymentForm',
    path: '@/components/payment/PaymentForm',
    category: 'utility',
    description: 'Payment processing form'
  },
  {
    name: 'AnalyticsChart',
    path: '@/components/analytics/AnalyticsChart',
    category: 'utility',
    description: 'Analytics data visualization'
  },

  // Deprecated Components
  {
    name: 'OldCalendar',
    path: '@/components/OldCalendar',
    category: 'data',
    description: 'Deprecated calendar component',
    deprecated: true,
    replacement: 'Calendar'
  }
];

// Export allowed component names for validation
export const allowedComponents = componentRegistry
  .filter(c => !c.deprecated)
  .map(c => c.name);

// Helper function to check if a component is allowed
export function isComponentAllowed(componentName: string): boolean {
  return allowedComponents.includes(componentName);
}

// Helper function to get component info
export function getComponentInfo(componentName: string): ComponentRegistryEntry | undefined {
  return componentRegistry.find(c => c.name === componentName);
}

// Helper function to get deprecated components
export function getDeprecatedComponents(): ComponentRegistryEntry[] {
  return componentRegistry.filter(c => c.deprecated);
}

// Helper function to get components by category
export function getComponentsByCategory(category: ComponentRegistryEntry['category']): ComponentRegistryEntry[] {
  return componentRegistry.filter(c => c.category === category && !c.deprecated);
}