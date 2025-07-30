/**
 * Dynamic Chart Component - Lazy loaded to reduce bundle size
 * Replaces direct Chart.js imports with code splitting
 */
import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

// Dynamic import for Chart.js components
const Chart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Chart })), {
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg animate-pulse">
      <div className="text-gray-500">Loading chart...</div>
    </div>
  ),
  ssr: false
});

const LineChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Line })), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

const BarChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Bar })), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

const PieChart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Pie })), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
    <div className="flex justify-center space-x-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
      <div className="h-4 bg-gray-200 rounded w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-12"></div>
    </div>
  </div>
);

interface DynamicChartProps {
  type: 'line' | 'bar' | 'pie';
  data: any;
  options?: any;
  className?: string;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ 
  type, 
  data, 
  options = {}, 
  className = "" 
}) => {
  const ChartComponent = React.useMemo(() => {
    switch (type) {
      case 'line':
        return LineChart;
      case 'bar':
        return BarChart;
      case 'pie':
        return PieChart;
      default:
        return LineChart;
    }
  }, [type]);

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <div className={className}>
        <ChartComponent data={data} options={options} />
      </div>
    </Suspense>
  );
};

export default DynamicChart;