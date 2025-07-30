import React from 'react';

const PerformanceDashboard: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Performance Dashboard</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Load Time</p>
            <p className="text-2xl font-bold text-blue-600">0ms</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">FCP</p>
            <p className="text-2xl font-bold text-green-600">0ms</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">LCP</p>
            <p className="text-2xl font-bold text-orange-600">0ms</p>
          </div>
        </div>
        <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">Performance Metrics Placeholder</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;