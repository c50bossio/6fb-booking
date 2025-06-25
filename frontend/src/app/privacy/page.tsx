// Privacy Policy page - server component
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - 6FB Booking Platform',
  description: 'Privacy Policy for the 6FB Booking Platform',
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <p className="text-gray-600 mb-6">
          This Privacy Policy describes how 6FB Booking Platform ("we", "our", or "us") collects, 
          uses, and protects your personal information when you use our service.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Information We Collect</h2>
        <h3 className="text-xl font-semibold mb-3 text-gray-900">Personal Information</h3>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• Name, email address, and contact information</li>
          <li>• Business information and professional credentials</li>
          <li>• Payment and billing information (processed securely via Stripe)</li>
          <li>• Profile photos and business images</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 text-gray-900">Usage Information</h3>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• Appointment and booking data</li>
          <li>• Platform usage analytics and performance metrics</li>
          <li>• Device information and IP addresses</li>
          <li>• Log files and technical data</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">How We Use Your Information</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• To provide and maintain our booking platform service</li>
          <li>• To process payments and manage your account</li>
          <li>• To send important notifications about your bookings and account</li>
          <li>• To improve our platform and develop new features</li>
          <li>• To comply with legal obligations and prevent fraud</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Information Sharing</h2>
        <p className="text-gray-600 mb-4">
          We do not sell, rent, or share your personal information with third parties except:
        </p>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• With your explicit consent</li>
          <li>• With service providers who help us operate our platform (Stripe, Google, etc.)</li>
          <li>• When required by law or to protect our legal rights</li>
          <li>• In connection with a business transfer or acquisition</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Data Security</h2>
        <p className="text-gray-600 mb-6">
          We implement industry-standard security measures to protect your information, including:
        </p>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• SSL/TLS encryption for data transmission</li>
          <li>• Secure password hashing and authentication</li>
          <li>• Regular security audits and monitoring</li>
          <li>• Limited access to personal data on a need-to-know basis</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Your Rights</h2>
        <p className="text-gray-600 mb-4">You have the right to:</p>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• Access and review your personal information</li>
          <li>• Correct inaccurate or incomplete data</li>
          <li>• Delete your account and associated data</li>
          <li>• Export your data in a portable format</li>
          <li>• Opt out of non-essential communications</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Data Retention</h2>
        <p className="text-gray-600 mb-6">
          We retain your personal information only as long as necessary to provide our services 
          and comply with legal obligations. Booking and payment data may be retained for up to 
          7 years for tax and legal compliance purposes.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Cookies and Tracking</h2>
        <p className="text-gray-600 mb-6">
          We use cookies and similar technologies to improve your experience, analyze usage patterns, 
          and provide personalized content. You can control cookie settings through your browser.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Contact Us</h2>
        <p className="text-gray-600 mb-4">
          If you have questions about this Privacy Policy or want to exercise your rights, 
          please contact us at:
        </p>
        <ul className="text-gray-600 mb-6 space-y-1">
          <li><strong>Email:</strong> privacy@6fb.com</li>
          <li><strong>Address:</strong> [Company Address]</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Changes to This Policy</h2>
        <p className="text-gray-600">
          We may update this Privacy Policy from time to time. We will notify you of any 
          material changes by email or through our platform. Your continued use of our 
          service after such changes constitutes acceptance of the updated policy.
        </p>
      </div>
    </div>
  )
}