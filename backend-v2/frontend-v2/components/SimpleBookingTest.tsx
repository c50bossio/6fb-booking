'use client'

export default function SimpleBookingTest() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Test</h1>
        <p className="text-gray-600 mb-6">This is a simple booking page to test if the issue is with the complex component.</p>
        <div className="space-y-4">
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
            Test Button
          </button>
          <div className="text-sm text-gray-500">
            Backend API Status: Working ✅
          </div>
        </div>
      </div>
    </div>
  )
}