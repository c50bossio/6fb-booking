// Terms of Service page - server component
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - 6FB Booking Platform',
  description: 'Terms of Service for the 6FB Booking Platform',
}

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <p className="text-gray-600 mb-6">
          These Terms of Service ("Terms") govern your use of the 6FB Booking Platform
          ("Service") operated by 6FB Booking Platform ("us", "we", or "our").
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Acceptance of Terms</h2>
        <p className="text-gray-600 mb-6">
          By accessing and using our Service, you accept and agree to be bound by the terms
          and provision of this agreement. If you do not agree to abide by the above,
          please do not use this service.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Description of Service</h2>
        <p className="text-gray-600 mb-6">
          6FB Booking Platform provides a comprehensive booking and business management system
          for barber shops, including appointment scheduling, payment processing, client management,
          and business analytics.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">User Accounts</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• You are responsible for maintaining the confidentiality of your account credentials</li>
          <li>• You agree to provide accurate and complete information when creating your account</li>
          <li>• You are responsible for all activities that occur under your account</li>
          <li>• You must notify us immediately of any unauthorized use of your account</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Acceptable Use</h2>
        <p className="text-gray-600 mb-4">You agree not to use the Service to:</p>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• Violate any applicable laws or regulations</li>
          <li>• Infringe on the rights of others</li>
          <li>• Upload malicious code or engage in hacking activities</li>
          <li>• Spam or send unsolicited communications</li>
          <li>• Impersonate other individuals or entities</li>
          <li>• Interfere with the normal operation of the Service</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Payment Terms</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• Subscription fees are billed in advance on a monthly or annual basis</li>
          <li>• All payments are processed securely through Stripe</li>
          <li>• Refunds are subject to our refund policy</li>
          <li>• We reserve the right to change pricing with 30 days notice</li>
          <li>• Transaction fees may apply for payment processing</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Intellectual Property</h2>
        <p className="text-gray-600 mb-6">
          The Service and its original content, features, and functionality are and will remain
          the exclusive property of 6FB Booking Platform and its licensors. The Service is
          protected by copyright, trademark, and other laws.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Data Ownership</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• You retain ownership of all data you input into the Service</li>
          <li>• We may use aggregated, anonymized data to improve our Service</li>
          <li>• You can export your data at any time</li>
          <li>• Upon account termination, your data will be deleted according to our retention policy</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Service Availability</h2>
        <p className="text-gray-600 mb-6">
          We strive to maintain 99.9% uptime but do not guarantee uninterrupted access to the Service.
          We reserve the right to modify, suspend, or discontinue the Service with reasonable notice.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Limitation of Liability</h2>
        <p className="text-gray-600 mb-6">
          In no event shall 6FB Booking Platform, nor its directors, employees, partners, agents,
          suppliers, or affiliates, be liable for any indirect, incidental, special, consequential,
          or punitive damages, including without limitation, loss of profits, data, use, goodwill,
          or other intangible losses.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Indemnification</h2>
        <p className="text-gray-600 mb-6">
          You agree to defend, indemnify, and hold harmless 6FB Booking Platform and its licensee
          and licensors from and against any and all claims, damages, obligations, losses, liabilities,
          costs or debt, and expenses (including but not limited to attorney's fees).
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Termination</h2>
        <p className="text-gray-600 mb-6">
          We may terminate or suspend your account and bar access to the Service immediately,
          without prior notice or liability, under our sole discretion, for any reason whatsoever
          and without limitation, including but not limited to a breach of the Terms.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Governing Law</h2>
        <p className="text-gray-600 mb-6">
          These Terms shall be interpreted and governed by the laws of [Jurisdiction], without
          regard to its conflict of law provisions. Our failure to enforce any right or provision
          of these Terms will not be considered a waiver of those rights.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Changes to Terms</h2>
        <p className="text-gray-600 mb-6">
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
          If a revision is material, we will try to provide at least 30 days notice prior to any
          new terms taking effect.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Contact Information</h2>
        <p className="text-gray-600">
          If you have any questions about these Terms of Service, please contact us at:
        </p>
        <ul className="text-gray-600 mt-4 space-y-1">
          <li><strong>Email:</strong> legal@6fb.com</li>
          <li><strong>Address:</strong> [Company Address]</li>
        </ul>
      </div>
    </div>
  )
}
