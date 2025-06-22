'use client'

export default function TestDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">Test Dashboard</h1>
      <p>If you can see this, the app is working!</p>
      <a href="/dashboard" className="text-blue-500 underline">Go to real dashboard</a>
    </div>
  )
}
