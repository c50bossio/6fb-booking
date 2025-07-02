'use client'

import dynamic from 'next/dynamic'
import { LoadingCard, LoadingSkeleton } from './ui/LoadingStates'

// Calendar Components - Heavy components that benefit from lazy loading
export const CalendarWeekView = dynamic(() => import('./CalendarWeekView'), {
  loading: () => <LoadingCard title="Loading calendar..." className="h-[600px]" />,
  ssr: false,
})

export const CalendarDayView = dynamic(() => import('./CalendarDayView'), {
  loading: () => <LoadingCard title="Loading day view..." className="h-[600px]" />,
  ssr: false,
})

export const CalendarMonthView = dynamic(() => import('./CalendarMonthView'), {
  loading: () => <LoadingCard title="Loading month view..." className="h-[600px]" />,
  ssr: false,
})

export const CalendarSync = dynamic(() => import('./CalendarSync'), {
  loading: () => <LoadingCard title="Loading calendar sync..." />,
  ssr: false,
})

export const CalendarConflictResolver = dynamic(() => import('./CalendarConflictResolver'), {
  loading: () => <LoadingCard title="Loading conflict resolver..." />,
  ssr: false,
})

// Analytics Components - Chart.js is heavy
export const RevenueChart = dynamic(() => import('./analytics/RevenueChart'), {
  loading: () => <LoadingSkeleton type="card" className="h-[400px]" />,
  ssr: false,
})

export const ClientRetentionChart = dynamic(() => import('./analytics/ClientRetentionChart'), {
  loading: () => <LoadingSkeleton type="card" className="h-[400px]" />,
  ssr: false,
})

export const PerformanceMetrics = dynamic(() => import('./analytics/PerformanceMetrics'), {
  loading: () => <LoadingSkeleton type="card" className="h-[300px]" />,
  ssr: false,
})

export const SixFigureAnalyticsDashboard = dynamic(() => import('./analytics/SixFigureAnalyticsDashboard'), {
  loading: () => <LoadingCard title="Loading analytics dashboard..." className="h-[800px]" />,
  ssr: false,
})

// Payment Components - Stripe is heavy
export const PaymentForm = dynamic(() => import('./PaymentForm'), {
  loading: () => <LoadingCard title="Loading payment form..." />,
  ssr: false,
})

export const StripeConnectOnboarding = dynamic(() => import('./StripeConnectOnboarding'), {
  loading: () => <LoadingCard title="Loading Stripe setup..." />,
  ssr: false,
})

export const RefundManager = dynamic(() => import('./RefundManager'), {
  loading: () => <LoadingCard title="Loading refund manager..." />,
  ssr: false,
})

// Marketing Components
export const CampaignCard = dynamic(() => import('./marketing/CampaignCard'), {
  loading: () => <LoadingSkeleton type="card" />,
  ssr: false,
})

export const TemplateEditor = dynamic(() => import('./marketing/TemplateEditor'), {
  loading: () => <LoadingCard title="Loading template editor..." />,
  ssr: false,
})

// Import/Export Components
export const ImportWizard = dynamic(() => import('./import/ImportWizard'), {
  loading: () => <LoadingCard title="Loading import wizard..." />,
  ssr: false,
})

export const ExportBuilder = dynamic(() => import('./export/ExportBuilder'), {
  loading: () => <LoadingCard title="Loading export builder..." />,
  ssr: false,
})

// Booking Components
export const EmbedCodeGenerator = dynamic(() => import('./booking/EmbedCodeGenerator'), {
  loading: () => <LoadingCard title="Loading embed generator..." />,
  ssr: false,
})

export const QRCodeGenerator = dynamic(() => import('./booking/QRCodeGenerator'), {
  loading: () => <LoadingSkeleton type="card" />,
  ssr: false,
})

// Modal Components - Only load when needed
export const CreateAppointmentModal = dynamic(() => import('./modals/CreateAppointmentModal'), {
  loading: () => <LoadingCard title="Loading appointment form..." />,
  ssr: false,
})

export const ClientDetailModal = dynamic(() => import('./modals/ClientDetailModal'), {
  loading: () => <LoadingCard title="Loading client details..." />,
  ssr: false,
})

export const ConflictResolutionModal = dynamic(() => import('./modals/ConflictResolutionModal'), {
  loading: () => <LoadingCard title="Loading conflict resolver..." />,
  ssr: false,
})

// Heavy utility components
export const VirtualList = dynamic(() => import('./VirtualList'), {
  loading: () => <LoadingSkeleton type="card" count={5} />,
  ssr: false,
})

export const WebhookConfiguration = dynamic(() => import('./WebhookConfiguration'), {
  loading: () => <LoadingCard title="Loading webhook configuration..." />,
  ssr: false,
})

// Charts with better loading states
export const ServiceRevenueChart = dynamic(() => import('./analytics/ServiceRevenueChart'), {
  loading: () => (
    <div className="card">
      <div className="card-header">
        <LoadingSkeleton type="text" className="w-1/3" />
      </div>
      <div className="card-content">
        <div className="h-[300px] flex items-center justify-center">
          <LoadingSkeleton type="card" />
        </div>
      </div>
    </div>
  ),
  ssr: false,
})

export const AppointmentPatterns = dynamic(() => import('./analytics/AppointmentPatterns'), {
  loading: () => (
    <div className="card">
      <div className="card-header">
        <LoadingSkeleton type="text" className="w-1/2" />
      </div>
      <div className="card-content">
        <div className="h-[250px] flex items-center justify-center">
          <LoadingSkeleton type="card" />
        </div>
      </div>
    </div>
  ),
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