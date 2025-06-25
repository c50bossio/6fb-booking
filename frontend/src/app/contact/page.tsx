// Contact page - server component
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us - 6FB Booking Platform',
  description: 'Get in touch with our support team',
}

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="text-gray-600 mb-4">
        For support, please email us at support@6fb.com
      </p>
      <p className="text-gray-600">
        We typically respond within 24 hours.
      </p>
    </div>
  )
}
