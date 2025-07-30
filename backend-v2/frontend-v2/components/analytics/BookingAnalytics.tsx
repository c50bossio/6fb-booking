import React from 'react';

const BookingAnalytics: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Booking Analytics</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Bookings</p>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completion Rate</p>
            <p className="text-2xl font-bold text-green-600">0%</p>
          </div>
        </div>
        <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">Booking Chart Placeholder</p>
        </div>
      </div>
    </div>
  );
};

export default BookingAnalytics;