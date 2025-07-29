'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamic import wrapper for Chart.js to prevent SSR issues
export const ChartJS = dynamic(
  () => import('chart.js').then(mod => ({ default: mod.Chart })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
  }
);

// Chart.js components
export const CategoryScale = dynamic(() => import('chart.js').then(mod => ({ default: mod.CategoryScale })), { ssr: false });
export const LinearScale = dynamic(() => import('chart.js').then(mod => ({ default: mod.LinearScale })), { ssr: false });
export const PointElement = dynamic(() => import('chart.js').then(mod => ({ default: mod.PointElement })), { ssr: false });
export const LineElement = dynamic(() => import('chart.js').then(mod => ({ default: mod.LineElement })), { ssr: false });
export const BarElement = dynamic(() => import('chart.js').then(mod => ({ default: mod.BarElement })), { ssr: false });
export const Title = dynamic(() => import('chart.js').then(mod => ({ default: mod.Title })), { ssr: false });
export const Tooltip = dynamic(() => import('chart.js').then(mod => ({ default: mod.Tooltip })), { ssr: false });
export const Legend = dynamic(() => import('chart.js').then(mod => ({ default: mod.Legend })), { ssr: false });
export const ArcElement = dynamic(() => import('chart.js').then(mod => ({ default: mod.ArcElement })), { ssr: false });
export const Filler = dynamic(() => import('chart.js').then(mod => ({ default: mod.Filler })), { ssr: false });

// React Chart.js 2 components
export const Line = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Line })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading line chart...</div>
  }
);

export const Bar = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Bar })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading bar chart...</div>
  }
);

export const Doughnut = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading doughnut chart...</div>
  }
);

export const Pie = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Pie })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading pie chart...</div>
  }
);

export const Radar = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Radar })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading radar chart...</div>
  }
);

export const PolarArea = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.PolarArea })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading polar area chart...</div>
  }
);

export const Bubble = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Bubble })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading bubble chart...</div>
  }
);

export const Scatter = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Scatter })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading scatter chart...</div>
  }
);

// Export types for TypeScript compatibility
export type ChartOptions = any; // Dynamic type import
export type ChartData = any; // Dynamic type import