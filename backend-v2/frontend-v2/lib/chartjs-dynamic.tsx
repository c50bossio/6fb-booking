'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Loading component for charts
const ChartSkeleton = () => (
  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
    <div className="text-gray-400">Loading chart...</div>
  </div>
);

// Dynamic imports for recharts components (lighter and more performant)
export const LineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
);

export const Line = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Line })),
  { ssr: false }
);

export const BarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
);

export const Bar = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Bar })),
  { ssr: false }
);

export const PieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
);

export const Pie = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Pie })),
  { ssr: false }
);

export const AreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
);

export const Area = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Area })),
  { ssr: false }
);

export const ResponsiveContainer = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { ssr: false }
);

export const XAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.XAxis })),
  { ssr: false }
);

export const YAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.YAxis })),
  { ssr: false }
);

export const CartesianGrid = dynamic(
  () => import('recharts').then(mod => ({ default: mod.CartesianGrid })),
  { ssr: false }
);

export const Tooltip = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Tooltip })),
  { ssr: false }
);

export const Legend = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Legend })),
  { ssr: false }
);

export const Cell = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Cell })),
  { ssr: false }
);

// Backwards compatibility aliases for Chart.js migration
export const Chart = LineChart; // Default to LineChart
export const Doughnut = PieChart; // Doughnut is similar to Pie

// Mock Chart.js registration function for compatibility
export const register = (...args: any[]) => {
  // No-op for recharts compatibility
};

// Export ChartJS as alias for backwards compatibility
export const ChartJS = {
  register
};

// Compatibility scale exports (no-ops for recharts)
export const CategoryScale = () => null;
export const LinearScale = () => null;
export const PointElement = () => null;
export const LineElement = () => null;
export const BarElement = () => null;
export const ArcElement = () => null;
export const Title = () => null;
export const Filler = () => null;

// Export types for TypeScript compatibility
export type ChartOptions = any;
export type ChartData = {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    [key: string]: any;
  }>;
};

// Utility function to convert Chart.js data format to recharts format
export const convertChartJSDataToRecharts = (chartJSData: ChartData) => {
  const { labels, datasets } = chartJSData;
  
  return labels.map((label, index) => {
    const dataPoint: any = { name: label };
    
    datasets.forEach((dataset, datasetIndex) => {
      dataPoint[dataset.label || `dataset${datasetIndex}`] = dataset.data[index] || 0;
    });
    
    return dataPoint;
  });
};

// Default export for compatibility
export default {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  Chart,
  ChartJS,
  convertChartJSDataToRecharts
};