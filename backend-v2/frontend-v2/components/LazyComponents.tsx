'use client'

import dynamic from 'next/dynamic'
import { CardLoading, LoadingSpinner } from './ui/LoadingStates'

// Simple loading component for lazy imports
const SimpleLoading = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <LoadingSpinner size="md" />
  </div>
)

// Calendar Components - Heavy components that benefit from lazy loading
export const CalendarWeekView = dynamic(() => import('./CalendarWeekView'), {
  loading: () => <CardLoading className="h-[600px]" />,
  ssr: false,
})

export const CalendarDayView = dynamic(() => import('./CalendarDayView'), {
  loading: () => <CardLoading className="h-[600px]" />,
  ssr: false,
})

export const CalendarMonthView = dynamic(() => import('./CalendarMonthView'), {
  loading: () => <CardLoading className="h-[600px]" />,
  ssr: false,
})

export const CalendarSync = dynamic(() => import('./CalendarSync'), {
  loading: () => <CardLoading />,
  ssr: false,
})

export const CalendarConflictResolver = dynamic(() => import('./CalendarConflictResolver'), {
  loading: () => <CardLoading />,
  ssr: false,
})

// Analytics Components - Chart.js is heavy
export const RevenueChart = dynamic(() => import('./analytics/RevenueChart'), {
  loading: () => <SimpleLoading />,
  ssr: false,
})

export const ClientRetentionChart = dynamic(() => import('./analytics/ClientRetentionChart'), {
  loading: () => <SimpleLoading />,
  ssr: false,
})

export const PerformanceMetrics = dynamic(() => import('./analytics/PerformanceMetrics'), {
  loading: () => <SimpleLoading />,
  ssr: false,
})

export const SixFigureAnalyticsDashboard = dynamic(() => import('./analytics/SixFigureAnalyticsDashboard'), {
  loading: () => <CardLoading className="h-[800px]" />,
  ssr: false,
})

// Payment Components - Stripe is heavy
export const PaymentForm = dynamic(() => import('./PaymentForm'), {
  loading: () => <CardLoading />,
  ssr: false,
})

export const StripeConnectOnboarding = dynamic(() => import('./StripeConnectOnboarding'), {
  loading: () => <CardLoading />,
  ssr: false,
})

export const RefundManager = dynamic(() => import('./RefundManager'), {
  loading: () => <CardLoading />,
  ssr: false,
})

// Marketing Components
export const CampaignCard = dynamic(() => import('./marketing/CampaignCard'), {
  loading: () => <SimpleLoading />,
  ssr: false,
})

export const TemplateEditor = dynamic(() => import('./marketing/TemplateEditor'), {
  loading: () => <CardLoading />,
  ssr: false,
})

// Import/Export Components
export const ImportWizard = dynamic(() => import('./import/ImportWizard'), {
  loading: () => <CardLoading />,
  ssr: false,
})

export const ExportBuilder = dynamic(() => import('./export/ExportBuilder'), {
  loading: () => <CardLoading />,
  ssr: false,
})

// Booking Components
export const EmbedCodeGenerator = dynamic(() => import('./booking/EmbedCodeGenerator').then(mod => ({ default: mod.EmbedCodeGenerator })), {
  loading: () => <CardLoading />,
  ssr: false,
})

export const QRCodeGenerator = dynamic(() => import('./booking/QRCodeGenerator'), {
  loading: () => <SimpleLoading />,
  ssr: false,
})

// Modal Components - Only load when needed
export const CreateAppointmentModal = dynamic(() => import('./modals/CreateAppointmentModal'), {
  loading: () => <CardLoading />,
  ssr: false,
})

export const ClientDetailModal = dynamic(() => import('./modals/ClientDetailModal'), {
  loading: () => <CardLoading />,
  ssr: false,
})

export const ConflictResolutionModal = dynamic(() => import('./modals/ConflictResolutionModal'), {
  loading: () => <CardLoading />,
  ssr: false,
})

// Heavy utility components
export const VirtualList = dynamic(() => import('./VirtualList'), {
  loading: () => <SimpleLoading />,
  ssr: false,
})

export const WebhookConfiguration = dynamic(() => import('./WebhookConfiguration'), {
  loading: () => <CardLoading />,
  ssr: false,
})

// Charts with better loading states
export const ServiceRevenueChart = dynamic(() => import('./analytics/ServiceRevenueChart'), {
  loading: () => <CardLoading className="h-[300px]" />,
  ssr: false,
})

export const AppointmentPatterns = dynamic(() => import('./analytics/AppointmentPatterns'), {
  loading: () => <CardLoading className="h-[250px]" />,
  ssr: false,
})

// Pre-loading utilities for critical components
export const preloadCalendarComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload calendar components on user interaction
    const preload = () => {
      import('./CalendarWeekView')
      import('./CalendarDayView')
      import('./CalendarMonthView')
    }
    
    // Preload on first user interaction
    const events = ['mousedown', 'touchstart', 'keydown']
    const removeListeners = () => {
      events.forEach(event => {
        document.removeEventListener(event, preload)
      })
    }
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        preload()
        removeListeners()
      }, { once: true })
    })
  }
}

export const preloadPaymentComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload payment components when user shows intent to pay
    import('./PaymentForm')
    import('./StripeConnectOnboarding')
  }
}

export const preloadAnalyticsComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload analytics when user navigates to dashboard
    import('./analytics/RevenueChart')
    import('./analytics/PerformanceMetrics')
  }
}