/**
 * Dynamic Chart Component - Lazy loaded to reduce bundle size
 * Uses recharts for optimal performance and bundle size
 */
import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

// Dynamic import for recharts components
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

const PieChart = dynamic(() => import('recharts').then(mod => ({ default: mod.PieChart })), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

// Dynamic import for recharts utilities
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), {
  ssr: false
});

const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), {
  ssr: false
});

const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), {
  ssr: false
});

const Pie = dynamic(() => import('recharts').then(mod => ({ default: mod.Pie })), {
  ssr: false
});

const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), {
  ssr: false
});

const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), {
  ssr: false
});

const CartesianGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), {
  ssr: false
});

const Tooltip = dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), {
  ssr: false
});

const Legend = dynamic(() => import('recharts').then(mod => ({ default: mod.Legend })), {
  ssr: false
});

const Cell = dynamic(() => import('recharts').then(mod => ({ default: mod.Cell })), {
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
  data: any[];
  options?: {
    colors?: string[];
    theme?: 'light' | 'dark';
    showGrid?: boolean;
    showLegend?: boolean;
    dataKey?: string;
    xAxisKey?: string;
    yAxisKey?: string;
    height?: number;
  };
  className?: string;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ 
  type, 
  data, 
  options = {}, 
  className = "" 
}) => {
  const {
    colors = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444'],
    theme = 'light',
    showGrid = true,
    showLegend = true,
    dataKey = 'value',
    xAxisKey = 'name',
    height = 300
  } = options;

  const textColor = theme === 'dark' ? '#d1d5db' : '#374151';
  const gridColor = theme === 'dark' ? 'rgba(209, 213, 219, 0.1)' : 'rgba(55, 65, 81, 0.1)';

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12, fill: textColor }}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: textColor }}
                axisLine={{ stroke: gridColor }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }}
              />
              {showLegend && <Legend />}
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={colors[0]} 
                strokeWidth={2}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12, fill: textColor }}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: textColor }}
                axisLine={{ stroke: gridColor }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }}
              />
              {showLegend && <Legend />}
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={height * 0.3}
                paddingAngle={2}
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  border: `1px solid ${gridColor}`,
                  borderRadius: '8px',
                  color: textColor
                }}
              />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div className="text-center text-gray-500 py-8">Unsupported chart type</div>;
    }
  };

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <div className={className}>
        {renderChart()}
      </div>
    </Suspense>
  );
};

export default DynamicChart;