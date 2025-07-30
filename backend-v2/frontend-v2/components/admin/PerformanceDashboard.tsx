/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics visualization
 */
import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../lib/performance-monitor';

interface PerformanceMetrics {
  renderTimes: { component: string; avgTime: number; count: number }[];
  memoryUsage: number;
  recommendations: string[];
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or for admin users
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const report = performanceMonitor.generateReport();
      setMetrics({
        renderTimes: report.metrics.renderTimes,
        memoryUsage: report.metrics.memoryUsage,
        recommendations: report.recommendations
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible || !metrics) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-3 text-xs">
        <div>
          <div className="font-medium">Memory Usage</div>
          <div className={`${metrics.memoryUsage > 150 ? 'text-red-600' : 'text-green-600'}`}>
            {metrics.memoryUsage.toFixed(1)}MB
          </div>
        </div>
        
        {metrics.renderTimes.length > 0 && (
          <div>
            <div className="font-medium">Slow Components</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {metrics.renderTimes
                .filter(r => r.avgTime > 50)
                .slice(0, 3)
                .map(r => (
                  <div key={r.component} className="text-yellow-600">
                    {r.component}: {r.avgTime.toFixed(1)}ms
                  </div>
                ))
              }
            </div>
          </div>
        )}
        
        {metrics.recommendations.length > 0 && (
          <div>
            <div className="font-medium">Recommendations</div>
            <div className="space-y-1 max-h-16 overflow-y-auto">
              {metrics.recommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="text-blue-600 text-xs">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;