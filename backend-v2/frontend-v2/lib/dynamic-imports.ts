/**
 * Dynamic Import Utilities for Performance Optimization
 * Centralized lazy loading with consistent loading states
 */
import dynamic from 'next/dynamic';
import React from 'react';

// Loading components
export const PageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 animate-pulse">
    <div className="bg-white shadow">
      <div className="h-16 bg-gray-200"></div>
    </div>
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const ComponentSkeleton = ({ height = 'h-64' }: { height?: string }) => (
  <div className={`${height} bg-gray-100 rounded-lg animate-pulse flex items-center justify-center`}>
    <div className="text-gray-400 text-sm">Loading...</div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
    <div className="flex justify-center space-x-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
      <div className="h-4 bg-gray-200 rounded w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-12"></div>
    </div>
  </div>
);

// Dynamic imports for heavy components
export const DynamicAIDashboard = dynamic(
  () => import('@/app/ai-dashboard/page'),
  {
    loading: () => <PageSkeleton />,
    ssr: false
  }
);

export const DynamicCalendar = dynamic(
  () => import('@/components/calendar/Calendar'),
  {
    loading: () => <ComponentSkeleton height="h-96" />,
    ssr: false
  }
);

export const DynamicAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard'),
  {
    loading: () => <PageSkeleton />,
    ssr: false
  }
);

export const DynamicRevenueChart = dynamic(
  () => import('@/components/charts/RevenueChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export const DynamicClientMetricsChart = dynamic(
  () => import('@/components/charts/ClientMetricsChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export const DynamicChart = dynamic(
  () => import('@/components/charts/DynamicChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

// PDF generation (heavy dependency)
export const DynamicPDFGenerator = dynamic(
  () => import('@/lib/pdf-generator'),
  {
    loading: () => <div className="text-center py-4 text-gray-500">Loading PDF generator...</div>,
    ssr: false
  }
);

// QR Code generation
export const DynamicQRGenerator = dynamic(
  () => import('@/components/QRGenerator'),
  {
    loading: () => <div className="w-32 h-32 bg-gray-200 animate-pulse rounded"></div>,
    ssr: false
  }
);

// Marketing components (likely heavy)
export const DynamicMarketingDashboard = dynamic(
  () => import('@/components/marketing/MarketingDashboard'),
  {
    loading: () => <PageSkeleton />,
    ssr: false
  }
);

// Admin components
export const DynamicAdminDashboard = dynamic(
  () => import('@/components/admin/AdminDashboard'),
  {
    loading: () => <PageSkeleton />,
    ssr: false
  }
);

// Enterprise components
export const DynamicEnterpriseDashboard = dynamic(
  () => import('@/components/enterprise/EnterpriseDashboard'),
  {
    loading: () => <PageSkeleton />,
    ssr: false
  }
);

// Performance monitoring
export const DynamicPerformanceMonitor = dynamic(
  () => import('@/components/dev/PerformanceMonitor'),
  {
    loading: () => <div className="text-xs text-gray-400">Loading performance monitor...</div>,
    ssr: false
  }
);

// Error monitoring
export const DynamicErrorMonitoring = dynamic(
  () => import('@/components/ErrorMonitoringDashboard'),
  {
    loading: () => <ComponentSkeleton />,
    ssr: false
  }
);

// High-level utility for creating dynamic components
export const createDynamicComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  loadingComponent?: React.ComponentType,
  options: { ssr?: boolean } = {}
) => {
  return dynamic(importFunc, {
    loading: loadingComponent || (() => <ComponentSkeleton />),
    ssr: options.ssr ?? false
  });
};

// Pre-configured dynamic imports for common patterns
export const withDynamicImport = {
  page: (importFunc: () => Promise<any>) => 
    dynamic(importFunc, { loading: () => <PageSkeleton />, ssr: false }),
  
  component: (importFunc: () => Promise<any>) => 
    dynamic(importFunc, { loading: () => <ComponentSkeleton />, ssr: false }),
  
  chart: (importFunc: () => Promise<any>) => 
    dynamic(importFunc, { loading: () => <ChartSkeleton />, ssr: false }),
  
  modal: (importFunc: () => Promise<any>) => 
    dynamic(importFunc, { loading: () => null, ssr: false }),
};