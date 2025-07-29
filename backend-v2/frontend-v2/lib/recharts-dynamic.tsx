'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamic import wrapper for Recharts to prevent SSR issues
export const BarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
  }
);

export const LineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
  }
);

export const PieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
  }
);

export const AreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
  }
);

export const RadarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.RadarChart })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
  }
);

export const ComposedChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ComposedChart })),
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
  }
);

// Chart components
export const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false });
export const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false });
export const Area = dynamic(() => import('recharts').then(mod => ({ default: mod.Area })), { ssr: false });
export const Pie = dynamic(() => import('recharts').then(mod => ({ default: mod.Pie })), { ssr: false });
export const Radar = dynamic(() => import('recharts').then(mod => ({ default: mod.Radar })), { ssr: false });

// Axis components
export const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false });
export const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false });

// Grid and styling
export const CartesianGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false });
export const PolarGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.PolarGrid })), { ssr: false });
export const PolarAngleAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.PolarAngleAxis })), { ssr: false });
export const PolarRadiusAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.PolarRadiusAxis })), { ssr: false });

// Interactive components  
export const Tooltip = dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false });
export const Legend = dynamic(() => import('recharts').then(mod => ({ default: mod.Legend })), { ssr: false });
export const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });

// Additional components
export const Cell = dynamic(() => import('recharts').then(mod => ({ default: mod.Cell })), { ssr: false });
export const ReferenceLine = dynamic(() => import('recharts').then(mod => ({ default: mod.ReferenceLine })), { ssr: false });