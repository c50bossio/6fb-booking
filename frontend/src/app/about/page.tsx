// About page - server component
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us - 6FB Booking Platform',
  description: 'Learn about the 6FB Booking Platform and our mission to help barbers succeed',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">About 6FB Booking Platform</h1>

      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6 text-lg">
          The 6FB Booking Platform is built on the Six Figure Barber methodology, designed to help
          barbers and barbershop owners build successful, profitable businesses.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Our Mission</h2>
        <p className="text-gray-600 mb-6">
          We empower barbers with the tools and systems they need to scale their income,
          streamline their operations, and achieve financial freedom through their craft.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Key Features</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• Automated appointment scheduling and management</li>
          <li>• Integrated payment processing with Stripe</li>
          <li>• Real-time analytics and performance tracking</li>
          <li>• Client management and history tracking</li>
          <li>• Automated payout system for barbers</li>
          <li>• Google Calendar integration</li>
          <li>• Mobile-responsive design</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Built for Success</h2>
        <p className="text-gray-600 mb-6">
          Our platform combines modern technology with proven business strategies to help
          barbers maximize their earning potential and create sustainable, growing businesses.
        </p>

        <p className="text-gray-600">
          Whether you're a solo barber or managing a multi-chair shop, the 6FB Booking Platform
          provides the foundation you need to scale your success.
        </p>
      </div>
    </div>
  )
}
