'use client'

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import chart components with SSR disabled
const RevenueChart = dynamic(() => import('./RevenueChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
    </div>
  ),
});

const ClientMetricsChart = dynamic(() => import('./ClientMetricsChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
    </div>
  ),
});

const ServicePerformanceChart = dynamic(() => import('./ServicePerformanceChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
    </div>
  ),
});

const PerformanceChart = dynamic(() => import('./PerformanceChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
    </div>
  ),
});

const SixFBScoreChart = dynamic(() => import('./SixFBScoreChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
    </div>
  ),
});

const ClientAnalyticsChart = dynamic(() => import('./ClientAnalyticsChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
    </div>
  ),
});

// Export SSR-safe versions of all chart components
export {
  RevenueChart as SSRSafeRevenueChart,
  ClientMetricsChart as SSRSafeClientMetricsChart,
  ServicePerformanceChart as SSRSafeServicePerformanceChart,
  PerformanceChart as SSRSafePerformanceChart,
  SixFBScoreChart as SSRSafeSixFBScoreChart,
  ClientAnalyticsChart as SSRSafeClientAnalyticsChart,
};

// Default export for generic chart usage
export default RevenueChart;