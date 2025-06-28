// Security page - server component
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security - 6FB Booking Platform',
  description: 'Security measures and practices of the 6FB Booking Platform',
}

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Security & Data Protection</h1>

      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6 text-lg">
          At 6FB Booking Platform, we take security seriously. Your data and privacy are
          protected with industry-leading security measures and best practices.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Data Encryption</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• <strong>In Transit:</strong> All data is encrypted using TLS 1.3 during transmission</li>
          <li>• <strong>At Rest:</strong> Sensitive data is encrypted in our databases using AES-256</li>
          <li>• <strong>Payment Data:</strong> Never stored on our servers - handled directly by Stripe (PCI DSS Level 1)</li>
          <li>• <strong>Password Security:</strong> All passwords are hashed using bcrypt with salt</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Authentication & Access Control</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• <strong>JWT Tokens:</strong> Secure, time-limited access tokens with refresh capability</li>
          <li>• <strong>Role-Based Access:</strong> Granular permissions system for different user types</li>
          <li>• <strong>Session Management:</strong> Automatic logout and session timeout protection</li>
          <li>• <strong>Rate Limiting:</strong> Protection against brute force and DDoS attacks</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Infrastructure Security</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• <strong>Cloud Security:</strong> Hosted on secure, SOC 2 compliant infrastructure</li>
          <li>• <strong>Database Security:</strong> Regular backups, point-in-time recovery, and access controls</li>
          <li>• <strong>Network Security:</strong> Firewalls, VPNs, and network segmentation</li>
          <li>• <strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Application Security</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• <strong>Input Validation:</strong> All user inputs are validated and sanitized</li>
          <li>• <strong>SQL Injection Protection:</strong> Parameterized queries and ORM usage</li>
          <li>• <strong>XSS Protection:</strong> Content Security Policy and output encoding</li>
          <li>• <strong>CSRF Protection:</strong> Anti-forgery tokens on all forms</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Compliance & Certifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">GDPR Compliance</h3>
            <p className="text-gray-600 text-sm">
              Full compliance with EU General Data Protection Regulation, including data subject rights
              and privacy by design principles.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">CCPA Compliance</h3>
            <p className="text-gray-600 text-sm">
              Compliant with California Consumer Privacy Act, providing transparency and control
              over personal information.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">PCI DSS</h3>
            <p className="text-gray-600 text-sm">
              Payment processing through Stripe ensures PCI DSS Level 1 compliance for all
              payment card data handling.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">SOC 2 Type II</h3>
            <p className="text-gray-600 text-sm">
              Our infrastructure partners maintain SOC 2 Type II compliance for security,
              availability, and confidentiality.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Data Privacy</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• <strong>Data Minimization:</strong> We only collect data necessary for service functionality</li>
          <li>• <strong>Retention Limits:</strong> Data is automatically deleted according to retention policies</li>
          <li>• <strong>Access Controls:</strong> Strict internal access controls with audit logging</li>
          <li>• <strong>Data Portability:</strong> Export your data at any time in standard formats</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Security Practices</h2>
        <ul className="text-gray-600 mb-6 space-y-2">
          <li>• <strong>Regular Audits:</strong> Quarterly security assessments and penetration testing</li>
          <li>• <strong>Vulnerability Management:</strong> Automated scanning and prompt patching</li>
          <li>• <strong>Incident Response:</strong> Defined procedures for security incident handling</li>
          <li>• <strong>Employee Training:</strong> Regular security awareness training for all staff</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Your Security Responsibilities</h2>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-teal-900">Best Practices for Users:</h3>
          <ul className="text-teal-700 space-y-2">
            <li>• Use strong, unique passwords for your account</li>
            <li>• Keep your login credentials confidential</li>
            <li>• Log out when using shared or public computers</li>
            <li>• Report any suspicious activity immediately</li>
            <li>• Keep your contact information up to date</li>
          </ul>
        </div>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Reporting Security Issues</h2>
        <p className="text-gray-600 mb-4">
          If you discover a security vulnerability or have security concerns, please contact us immediately:
        </p>
        <ul className="text-gray-600 mb-6 space-y-1">
          <li><strong>Security Team:</strong> security@6fb.com</li>
          <li><strong>Response Time:</strong> Within 24 hours</li>
          <li><strong>Bug Bounty:</strong> We have a responsible disclosure program</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Security Updates</h2>
        <p className="text-gray-600">
          We continuously monitor security threats and update our systems accordingly.
          Critical security updates are applied immediately, and users are notified of
          any changes that affect their accounts or data.
        </p>
      </div>
    </div>
  )
}
