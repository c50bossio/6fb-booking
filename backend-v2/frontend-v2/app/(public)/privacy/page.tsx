'use client'

import React from 'react'

const PrivacyPolicyPage = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="flex flex-col space-y-1.5 pb-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            Privacy Policy
          </h3>
          <p className="text-sm text-gray-600">
            How we collect, use, and protect your personal information
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Quick Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-blue-800 mb-4">Privacy at a Glance</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h5 className="font-medium text-blue-800 mb-2">We collect minimal data</h5>
                <p className="text-sm text-blue-700">Only what's necessary to provide our booking service</p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-2">You have control</h5>
                <p className="text-sm text-blue-700">Access, export, or delete your data anytime</p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Transparent cookies</h5>
                <p className="text-sm text-blue-700">Clear choices about analytics and marketing tracking</p>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-2">GDPR compliant</h5>
                <p className="text-sm text-blue-700">Full compliance with data protection regulations</p>
              </div>
            </div>
          </div>

          {/* Your Rights */}
          <div className="border rounded-lg p-6">
            <h4 className="text-lg font-medium mb-4">Your Privacy Rights</h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="h-8 w-8 text-green-500 mx-auto mb-2">👁️</div>
                <h5 className="font-medium mb-1">Access</h5>
                <p className="text-sm text-gray-600">See what data we have about you</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="h-8 w-8 text-blue-500 mx-auto mb-2">📥</div>
                <h5 className="font-medium mb-1">Export</h5>
                <p className="text-sm text-gray-600">Download your data in a portable format</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="h-8 w-8 text-orange-500 mx-auto mb-2">🔒</div>
                <h5 className="font-medium mb-1">Correct</h5>
                <p className="text-sm text-gray-600">Update or fix incorrect information</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="h-8 w-8 text-red-500 mx-auto mb-2">🗑️</div>
                <h5 className="font-medium mb-1">Delete</h5>
                <p className="text-sm text-gray-600">Remove your data permanently</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <a href="/settings/privacy" className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Manage Your Privacy Settings
              </a>
            </div>
          </div>

          {/* Main Content Sections */}
          <section>
            <h4 className="text-lg font-medium mb-3">1. Introduction</h4>
            <p className="text-gray-600 mb-4">
              Welcome to BookedBarber. We respect your privacy and are committed to protecting your personal data. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">2. Information We Collect</h4>
            
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">Account Information</h5>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Name and contact details (email, phone number)</li>
                  <li>• Username and password</li>
                  <li>• Profile picture (optional)</li>
                  <li>• Business information (for barbers/shop owners)</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">Booking Information</h5>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Appointment dates and times</li>
                  <li>• Service preferences</li>
                  <li>• Booking history</li>
                  <li>• Special requests or notes</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">Payment Information</h5>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Payment method details (processed by Stripe)</li>
                  <li>• Transaction history</li>
                  <li>• Billing address</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">3. How We Use Your Information</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Process and manage bookings</li>
              <li>• Facilitate payments</li>
              <li>• Send appointment reminders</li>
              <li>• Provide customer support</li>
              <li>• Improve our services</li>
              <li>• Send marketing communications (with consent)</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">4. Data Sharing</h4>
            <p className="text-gray-600 mb-2">We share data with:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Stripe</strong>: Payment processing</li>
              <li>• <strong>SendGrid</strong>: Email delivery</li>
              <li>• <strong>Twilio</strong>: SMS messaging</li>
              <li>• <strong>Google</strong>: Calendar integration, analytics</li>
              <li>• Barbershops you book with</li>
              <li>• Law enforcement (when legally required)</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">5. Data Security</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Encryption in transit (TLS/SSL)</li>
              <li>• Encryption at rest (AES-256)</li>
              <li>• Secure password storage</li>
              <li>• Regular security audits</li>
              <li>• Limited access controls</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">6. Your Rights</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Access</strong>: Request copy of your data</li>
              <li>• <strong>Rectification</strong>: Correct inaccurate data</li>
              <li>• <strong>Erasure</strong>: Request deletion of data</li>
              <li>• <strong>Portability</strong>: Receive data in structured format</li>
              <li>• <strong>Object</strong>: Object to direct marketing</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">7. Contact Information</h4>
            <p className="text-gray-600">
              For privacy questions or to exercise your rights, contact us at{' '}
              <a href="mailto:privacy@bookedbarber.com" className="text-blue-600 hover:underline">
                privacy@bookedbarber.com
              </a>
            </p>
          </section>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-center text-blue-800 font-medium">
            Your privacy is important to us. This policy reflects our commitment to protecting your personal data and respecting your privacy rights.
          </p>
        </div>
      </div>
    </div>
  )
}
      {/* Quick Summary */}
      <Card className="mb-8 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Privacy at a Glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">We collect minimal data</h4>
              <p className="text-sm text-blue-700">Only what's necessary to provide our booking service</p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">You have control</h4>
              <p className="text-sm text-blue-700">Access, export, or delete your data anytime</p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Transparent cookies</h4>
              <p className="text-sm text-blue-700">Clear choices about analytics and marketing tracking</p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">GDPR compliant</h4>
              <p className="text-sm text-blue-700">Full compliance with data protection regulations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Rights */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Your Privacy Rights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <Eye className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Access</h4>
              <p className="text-sm text-gray-600">See what data we have about you</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Download className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Export</h4>
              <p className="text-sm text-gray-600">Download your data in a portable format</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Lock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Correct</h4>
              <p className="text-sm text-gray-600">Update or fix incorrect information</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Trash2 className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Delete</h4>
              <p className="text-sm text-gray-600">Remove your data permanently</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <a href="/settings/privacy">Manage Your Privacy Settings</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <LegalSection title="1. Introduction">
        <p>
          Welcome to BookedBarber. We respect your privacy and are committed to protecting your personal data. 
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">2.1 Information You Provide</h4>
            
            <div className="ml-4 space-y-3">
              <div>
                <h5 className="font-medium text-sm mb-1">Account Information</h5>
                <LegalList items={[
                  'Name and contact details (email, phone number)',
                  'Username and password',
                  'Profile picture (optional)',
                  'Date of birth (for age verification)',
                  'Business information (for barbers/shop owners)'
                ]} />
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">Booking Information</h5>
                <LegalList items={[
                  'Appointment dates and times',
                  'Service preferences',
                  'Booking history',
                  'Special requests or notes'
                ]} />
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">Payment Information</h5>
                <LegalList items={[
                  'Payment method details (processed by Stripe)',
                  'Transaction history',
                  'Billing address',
                  'Tax identification (for business accounts)'
                ]} />
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">Communications</h5>
                <LegalList items={[
                  'Messages between clients and barbers',
                  'Support tickets and inquiries',
                  'Feedback and reviews',
                  'Survey responses'
                ]} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">2.2 Information Collected Automatically</h4>
            
            <div className="ml-4 space-y-3">
              <div>
                <h5 className="font-medium text-sm mb-1">Device Information</h5>
                <LegalList items={[
                  'IP address',
                  'Browser type and version',
                  'Operating system',
                  'Device identifiers',
                  'Mobile network information'
                ]} />
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">Usage Data</h5>
                <LegalList items={[
                  'Pages visited and features used',
                  'Click patterns and navigation paths',
                  'Search queries',
                  'Time spent on pages',
                  'Referring websites'
                ]} />
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">Location Data</h5>
                <LegalList items={[
                  'GPS location (with permission)',
                  'IP-based location',
                  'Shop location preferences'
                ]} />
              </div>

              <div>
                <h5 className="font-medium text-sm mb-1">Cookies and Tracking</h5>
                <LegalList items={[
                  'Session cookies',
                  'Preference cookies',
                  'Analytics cookies',
                  'Marketing cookies (with consent)'
                ]} />
              </div>
            </div>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="3. How We Use Your Information">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">3.1 Service Delivery</h4>
            <LegalList items={[
              'Process and manage bookings',
              'Facilitate payments',
              'Send appointment reminders',
              'Provide customer support',
              'Manage user accounts'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">3.2 Communications</h4>
            <LegalList items={[
              'Transactional emails/SMS (confirmations, reminders)',
              'Service updates and announcements',
              'Marketing communications (with consent)',
              'Security alerts'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">3.3 Business Operations</h4>
            <LegalList items={[
              'Analytics and performance monitoring',
              'Service improvements and feature development',
              'Fraud prevention and security',
              'Legal compliance',
              'Business reporting for shop owners'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">3.4 Marketing and Personalization</h4>
            <LegalList items={[
              'Personalized recommendations',
              'Targeted promotions (with consent)',
              'Customer segmentation',
              'A/B testing'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="4. Legal Basis for Processing (GDPR)">
        <p>We process personal data based on:</p>
        
        <div className="space-y-4 mt-4">
          <div>
            <h4 className="font-medium mb-2">4.1 Contract Performance</h4>
            <LegalList items={[
              'Account creation and management',
              'Booking services',
              'Payment processing'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">4.2 Legitimate Interests</h4>
            <LegalList items={[
              'Service improvements',
              'Security and fraud prevention',
              'Direct marketing (with opt-out)',
              'Analytics'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">4.3 Legal Obligations</h4>
            <LegalList items={[
              'Tax and financial reporting',
              'Law enforcement requests',
              'Dispute resolution'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">4.4 Consent</h4>
            <LegalList items={[
              'Marketing communications',
              'Cookie placement',
              'Location tracking',
              'Special category data'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="5. Data Sharing and Disclosure">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">5.1 Service Providers</h4>
            <p>We share data with:</p>
            <LegalList items={[
              '<strong>Stripe</strong>: Payment processing',
              '<strong>SendGrid</strong>: Email delivery',
              '<strong>Twilio</strong>: SMS messaging',
              '<strong>Google</strong>: Calendar integration, analytics',
              '<strong>Amazon Web Services</strong>: Cloud hosting',
              '<strong>Sentry</strong>: Error tracking'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">5.2 Business Partners</h4>
            <LegalList items={[
              'Barbershops you book with',
              'Third-party integrations you authorize',
              'Marketing platforms (with consent)'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">5.3 Legal Requirements</h4>
            <p>We may disclose data to:</p>
            <LegalList items={[
              'Law enforcement (with valid requests)',
              'Courts (legal proceedings)',
              'Regulators (compliance)',
              'Professional advisors'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">5.4 Business Transfers</h4>
            <p>In case of merger, acquisition, or sale, data may be transferred to the new entity.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">5.5 Aggregated Data</h4>
            <p>We share anonymized, aggregated data for:</p>
            <LegalList items={[
              'Industry insights',
              'Marketing analysis',
              'Academic research'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="6. Data Security">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">6.1 Technical Measures</h4>
            <LegalList items={[
              'Encryption in transit (TLS/SSL)',
              'Encryption at rest (AES-256)',
              'Secure password storage (bcrypt)',
              'Regular security audits',
              'Intrusion detection systems'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">6.2 Organizational Measures</h4>
            <LegalList items={[
              'Limited access controls',
              'Employee training',
              'Confidentiality agreements',
              'Incident response procedures',
              'Regular security reviews'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">6.3 Payment Security</h4>
            <LegalList items={[
              'PCI DSS compliance through Stripe',
              'No storage of card details',
              'Tokenized payment methods',
              'Fraud detection systems'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">7.1 Retention Periods</h4>
            <LegalList items={[
              '<strong>Account data</strong>: Duration of account + 1 year',
              '<strong>Booking history</strong>: 7 years (tax compliance)',
              '<strong>Payment records</strong>: 7 years (financial regulations)',
              '<strong>Marketing data</strong>: Until consent withdrawn',
              '<strong>Analytics data</strong>: 2 years',
              '<strong>Support tickets</strong>: 3 years'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">7.2 Deletion Process</h4>
            <LegalList items={[
              'Automated deletion after retention period',
              'Manual deletion upon request',
              'Anonymization for historical data'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="8. Your Rights">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">8.1 Access Rights</h4>
            <LegalList items={[
              'Request copy of your data',
              'Understand how it\'s processed',
              'Verify lawfulness of processing'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">8.2 Rectification</h4>
            <LegalList items={[
              'Correct inaccurate data',
              'Complete incomplete data',
              'Update outdated information'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">8.3 Erasure ("Right to be Forgotten")</h4>
            <LegalList items={[
              'Request deletion of data',
              'Exceptions for legal obligations',
              'Removal from marketing lists'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">8.4 Restriction</h4>
            <LegalList items={[
              'Limit processing in certain circumstances',
              'Dispute accuracy of data',
              'Object to processing'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">8.5 Data Portability</h4>
            <LegalList items={[
              'Receive data in structured format',
              'Transfer to another service',
              'Machine-readable format'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">8.6 Objection</h4>
            <LegalList items={[
              'Object to direct marketing',
              'Object to profiling',
              'Object to legitimate interests'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="9. International Data Transfers">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">9.1 Transfer Mechanisms</h4>
            <LegalList items={[
              'Standard Contractual Clauses',
              'Adequacy decisions',
              'Privacy Shield (where applicable)'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">9.2 Safeguards</h4>
            <LegalList items={[
              'Encryption during transfer',
              'Access controls',
              'Contractual protections'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="10. Children's Privacy">
        <LegalList items={[
          'Service not intended for under 18',
          'No knowing collection from minors',
          'Parental consent required if discovered'
        ]} />
      </LegalSection>

      <LegalSection title="11. California Privacy Rights (CCPA)">
        <p>California residents have additional rights:</p>
        <LegalList items={[
          'Know what information is collected',
          'Know if information is sold',
          'Opt-out of sale',
          'Non-discrimination for exercising rights'
        ]} />

        <div className="mt-4">
          <h4 className="font-medium mb-2">11.1 Categories of Information</h4>
          <LegalList items={[
            'Identifiers',
            'Commercial information',
            'Internet activity',
            'Geolocation data',
            'Professional information'
          ]} />
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">11.2 Do Not Sell</h4>
          <p>We do not sell personal information. To opt-out of sharing for advertising: privacy@bookedbarber.com</p>
        </div>
      </LegalSection>

      <LegalSection title="12. Cookie Policy">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">12.1 Types of Cookies</h4>
            <LegalList items={[
              '<strong>Essential</strong>: Required for service operation',
              '<strong>Functional</strong>: Remember preferences',
              '<strong>Analytics</strong>: Understand usage patterns',
              '<strong>Marketing</strong>: Deliver targeted ads'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">12.2 Cookie Management</h4>
            <LegalList items={[
              'Browser settings control',
              'Cookie consent banner',
              'Opt-out links',
              'Privacy settings dashboard'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">12.3 Third-Party Cookies</h4>
            <LegalList items={[
              'Google Analytics',
              'Meta Pixel',
              'Marketing platforms',
              'Social media widgets'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="13. Changes to Privacy Policy">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">13.1 Notification</h4>
            <LegalList items={[
              'Email notification for material changes',
              'In-app notifications',
              '30-day notice period'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">13.2 Consent</h4>
            <LegalList items={[
              'Continued use implies acceptance',
              'Explicit consent for significant changes',
              'Right to close account if disagreeing'
            ]} />
          </div>
        </div>
      </LegalSection>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-center text-blue-800 font-medium">
          Your privacy is important to us. This policy reflects our commitment to protecting your personal data and respecting your privacy rights.
        </p>
      </div>
    </LegalDocument>
  )
}

export default PrivacyPolicyPage