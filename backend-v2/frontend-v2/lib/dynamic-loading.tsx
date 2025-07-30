import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component for better UX during component loading
export const ComponentLoader = ({ 
  message = 'Loading...' 
}: { 
  message?: string 
}) => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">{message}</span>
  </div>
);

// Error component for failed dynamic imports
export const ComponentError = ({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry: () => void 
}) => (
  <div className="flex flex-col items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50">
    <p className="text-red-600 mb-4">Failed to load component</p>
    <button 
      onClick={retry}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Retry
    </button>
  </div>
);

// Dynamic component loader with optimized settings
export function createDynamicComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    loadingMessage?: string;
    ssr?: boolean;
  } = {}
) {
  return dynamic(importFn, {
    loading: () => <ComponentLoader message={options.loadingMessage} />,
    ssr: options.ssr ?? false, // Default to client-side only for performance
  });
}

// Pre-configured dynamic imports for common heavy components
export const DynamicAnalyticsDashboard = createDynamicComponent(
  () => import('../components/analytics/SixFigureAnalyticsDashboard'),
  { loadingMessage: 'Loading analytics...', ssr: false }
);

export const DynamicUnifiedCalendar = createDynamicComponent(
  () => import('../components/UnifiedCalendar'),
  { loadingMessage: 'Loading calendar...', ssr: false }
);

export const DynamicAdvancedAnalytics = createDynamicComponent(
  () => import('../components/analytics/AdvancedAnalyticsDashboard'),
  { loadingMessage: 'Loading advanced analytics...', ssr: false }
);

export const DynamicAppointmentWizard = createDynamicComponent(
  () => import('../components/appointments/AppointmentWizard'),
  { loadingMessage: 'Loading appointment wizard...', ssr: false }
);

export const DynamicBarberAvailabilityManager = createDynamicComponent(
  () => import('../components/BarberAvailabilityManager'),
  { loadingMessage: 'Loading availability manager...', ssr: false }
);

export const DynamicLinkCustomizer = createDynamicComponent(
  () => import('../components/booking/LinkCustomizer'),
  { loadingMessage: 'Loading link customizer...', ssr: false }
);

export const DynamicRevenueOptimizationPanel = createDynamicComponent(
  () => import('../components/calendar/RevenueOptimizationPanel'),
  { loadingMessage: 'Loading revenue optimization...', ssr: false }
);

export const DynamicTrackingPixelSettings = createDynamicComponent(
  () => import('../components/dashboard/TrackingPixelSettings'),
  { loadingMessage: 'Loading tracking settings...', ssr: false }
);

export const DynamicWorkflowManager = createDynamicComponent(
  () => import('../components/six-figure-barber/crm/WorkflowManager'),
  { loadingMessage: 'Loading workflow manager...', ssr: false }
);

export const DynamicClientCRMDetail = createDynamicComponent(
  () => import('../components/six-figure-barber/crm/ClientCRMDetail'),
  { loadingMessage: 'Loading client details...', ssr: false }
);

// Route-based dynamic components for better code splitting
export const DynamicDashboardRoute = createDynamicComponent(
  () => import('../app/dashboard/page'),
  { loadingMessage: 'Loading dashboard...', ssr: false }
);

export const DynamicAnalyticsRoute = createDynamicComponent(
  () => import('../app/analytics/page'),
  { loadingMessage: 'Loading analytics...', ssr: false }
);

export const DynamicCalendarRoute = createDynamicComponent(
  () => import('../app/calendar/page'),
  { loadingMessage: 'Loading calendar...', ssr: false }
);

// Preload function for critical components
export function preloadComponent(componentName: keyof typeof componentMap) {
  const component = componentMap[componentName];
  if (component && 'preload' in component) {
    (component as any).preload();
  }
}

const componentMap = {
  analyticsDashboard: DynamicAnalyticsDashboard,
  unifiedCalendar: DynamicUnifiedCalendar,
  advancedAnalytics: DynamicAdvancedAnalytics,
  appointmentWizard: DynamicAppointmentWizard,
  availabilityManager: DynamicBarberAvailabilityManager,
  linkCustomizer: DynamicLinkCustomizer,
  revenueOptimization: DynamicRevenueOptimizationPanel,
  trackingPixels: DynamicTrackingPixelSettings,
  workflowManager: DynamicWorkflowManager,
  clientCRM: DynamicClientCRMDetail,
};

export { componentMap };