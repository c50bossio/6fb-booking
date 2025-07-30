/**
 * Lazy Analytics Components - Code split for better performance
 */
import dynamic from 'next/dynamic';
import React from 'react';

const AnalyticsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white p-6 rounded-lg shadow">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Lazy load analytics components
export const RevenueAnalytics = dynamic(
  () => import('./RevenueAnalytics').catch(() => ({ default: () => <div>Component not found</div> })),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false
  }
);

export const BookingAnalytics = dynamic(
  () => import('./BookingAnalytics').catch(() => ({ default: () => <div>Component not found</div> })),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false
  }
);

export const ClientAnalytics = dynamic(
  () => import('./ClientAnalytics').catch(() => ({ default: () => <div>Component not found</div> })),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false
  }
);

export const PerformanceAnalytics = dynamic(
  () => import('./PerformanceAnalytics').catch(() => ({ default: () => <div>Component not found</div> })),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false
  }
);

export default {
  RevenueAnalytics,
  BookingAnalytics,
  ClientAnalytics,
  PerformanceAnalytics
};