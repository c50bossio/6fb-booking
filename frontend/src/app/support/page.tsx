// Support page - server component
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support - 6FB Booking Platform',
  description: 'Get help and support for the 6FB Booking Platform',
}

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Support Center</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Contact Support</h2>
          <p className="text-gray-600 mb-4">
            Need help? Our support team is here to assist you.
          </p>
          <ul className="text-gray-600 space-y-2">
            <li><strong>Email:</strong> support@6fb.com</li>
            <li><strong>Response Time:</strong> Within 24 hours</li>
            <li><strong>Phone:</strong> Available for Pro and Enterprise plans</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Common Issues</h2>
          <ul className="text-gray-600 space-y-3">
            <li>• <strong>Appointment Scheduling:</strong> Check calendar sync settings</li>
            <li>• <strong>Payment Issues:</strong> Verify Stripe account connection</li>
            <li>• <strong>Client Management:</strong> Ensure proper permissions are set</li>
            <li>• <strong>Analytics Not Showing:</strong> Allow 24-48 hours for data processing</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Getting Started</h2>
          <p className="text-gray-600 mb-4">
            New to the platform? Here's how to get started:
          </p>
          <ol className="text-gray-600 space-y-2">
            <li>1. Complete your profile setup</li>
            <li>2. Connect your Stripe account for payments</li>
            <li>3. Set up your service menu and pricing</li>
            <li>4. Configure your availability</li>
            <li>5. Start accepting bookings!</li>
          </ol>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Resources</h2>
          <ul className="text-gray-600 space-y-2">
            <li>• <a href="/docs" className="text-teal-600 hover:underline">Platform Documentation</a></li>
            <li>• <a href="/tutorials" className="text-teal-600 hover:underline">Video Tutorials</a></li>
            <li>• <a href="/api" className="text-teal-600 hover:underline">API Documentation</a></li>
            <li>• <a href="/community" className="text-teal-600 hover:underline">Community Forum</a></li>
          </ul>
        </div>
      </div>

      <div className="mt-8 bg-teal-50 border border-teal-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2 text-teal-900">Need Immediate Help?</h2>
        <p className="text-teal-700 mb-4">
          For urgent issues affecting your business operations, please email us at
          <a href="mailto:urgent@6fb.com" className="font-semibold underline ml-1">urgent@6fb.com</a>
        </p>
        <p className="text-teal-600 text-sm">
          We prioritize urgent requests and aim to respond within 4 hours during business hours.
        </p>
      </div>
    </div>
  )
}
