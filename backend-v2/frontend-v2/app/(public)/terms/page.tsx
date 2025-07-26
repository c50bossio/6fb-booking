'use client'

import React from 'react'
import { Scale } from 'lucide-react'
import LegalDocument, { LegalSection, LegalList } from '@/components/LegalDocument'

const TermsOfServicePage = () => {
  const lastUpdated = new Date('2025-07-02')
  const effectiveDate = new Date('2025-07-02')

  const relatedDocuments = [
    {
      title: 'Privacy Policy',
      href: '/privacy',
      description: 'How we collect, use, and protect your personal information'
    },
    {
      title: 'Cookie Policy',
      href: '/cookies',
      description: 'Information about cookies and tracking technologies we use'
    }
  ]

  const contactInfo = {
    email: 'legal@bookedbarber.com',
    address: '[Your Company Address]',
    phone: '[Your Phone Number]'
  }

  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated={lastUpdated}
      effectiveDate={effectiveDate}
      icon={<Scale className="h-12 w-12 text-primary" />}
      relatedDocuments={relatedDocuments}
      contactInfo={contactInfo}
    >
      <LegalSection title="1. Agreement to Terms">
        <p>
          By accessing or using BookedBarber (&ldquo;the Service&rdquo;), operated by [Your Company Name] (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), 
          you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you disagree with any part of these terms, 
          you do not have permission to access the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <p>
          BookedBarber is a comprehensive booking and business management platform for barbershops that provides:
        </p>
        <LegalList items={[
          'Online appointment scheduling and management',
          'Payment processing through Stripe',
          'Business analytics and reporting',
          'Client management tools',
          'Calendar integration',
          'SMS/Email communications',
          'Multi-location support',
          'Marketing and review management tools'
        ]} />
      </LegalSection>

      <LegalSection title="3. User Accounts">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">3.1 Account Creation</h4>
            <LegalList items={[
              'You must provide accurate, complete, and current information',
              'You must be at least 18 years old to create an account',
              'You are responsible for maintaining the security of your account',
              'You must notify us immediately of any unauthorized access'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">3.2 Account Types</h4>
            <LegalList items={[
              '<strong>Clients</strong>: Book appointments and manage their booking history',
              '<strong>Barbers</strong>: Manage their schedule, clients, and receive payments',
              '<strong>Shop Owners/Admins</strong>: Full access to shop management features',
              '<strong>Super Admins</strong>: Platform-wide administrative access'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">3.3 Account Termination</h4>
            <p>We reserve the right to suspend or terminate accounts that:</p>
            <LegalList items={[
              'Violate these Terms',
              'Engage in fraudulent or illegal activities',
              'Abuse the platform or other users',
              'Remain inactive for extended periods'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="4. Booking and Cancellation Policies">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">4.1 Appointment Booking</h4>
            <LegalList items={[
              'Appointments are subject to barber availability',
              'Booking confirmations are sent via email/SMS',
              'Prices displayed are set by individual barbershops'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">4.2 Cancellations and No-Shows</h4>
            <LegalList items={[
              'Cancellation policies are set by individual barbershops',
              'Late cancellations may incur fees as determined by the shop',
              'Repeated no-shows may result in booking restrictions'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">4.3 Modifications</h4>
            <LegalList items={[
              'Appointment modifications are subject to availability',
              'Changes must be made within the timeframe set by the shop'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="5. Payments and Fees">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">5.1 Payment Processing</h4>
            <LegalList items={[
              'All payments are processed securely through Stripe',
              'We do not store credit card information',
              'Payment disputes are handled according to Stripe\'s policies'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">5.2 Service Fees</h4>
            <LegalList items={[
              'Platform usage fees apply as outlined in your subscription plan',
              'Transaction fees may apply to payment processing',
              'Fees are subject to change with 30 days notice'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">5.3 Barber Payouts</h4>
            <LegalList items={[
              'Payouts are processed according to the agreed schedule',
              'Barbers must maintain valid Stripe Connect accounts',
              'We are not responsible for banking delays'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">5.4 Refunds</h4>
            <LegalList items={[
              'Refund policies are determined by individual barbershops',
              'Platform fees are non-refundable',
              'Disputed charges follow Stripe\'s resolution process'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="6. Acceptable Use Policy">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">6.1 Prohibited Activities</h4>
            <p>You agree not to:</p>
            <LegalList items={[
              'Use the Service for illegal purposes',
              'Harass, abuse, or harm other users',
              'Attempt to breach security systems',
              'Scrape or data mine the platform',
              'Create fake accounts or bookings',
              'Interfere with Service operations',
              'Violate intellectual property rights'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">6.2 Content Standards</h4>
            <LegalList items={[
              'All uploaded content must be appropriate and legal',
              'No offensive, discriminatory, or harmful content',
              'You retain ownership of your content',
              'You grant us license to use content for Service operation'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="7. Intellectual Property">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">7.1 Platform Ownership</h4>
            <LegalList items={[
              'BookedBarber and its features are our exclusive property',
              'All trademarks, logos, and branding belong to us',
              'The Six Figure Barber methodology is proprietary'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">7.2 User Content</h4>
            <LegalList items={[
              'You retain rights to content you upload',
              'You grant us license to use, display, and distribute your content',
              'We may use anonymized data for analytics and improvements'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="8. Privacy and Data Protection">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">8.1 Data Collection</h4>
            <LegalList items={[
              'We collect and process data as outlined in our Privacy Policy',
              'You consent to data collection necessary for Service operation'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">8.2 Data Security</h4>
            <LegalList items={[
              'We implement industry-standard security measures',
              'No system is 100% secure; use at your own risk',
              'Report security concerns to security@bookedbarber.com'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">8.3 GDPR Compliance</h4>
            <LegalList items={[
              'EU users have additional rights under GDPR',
              'Data portability and deletion requests honored',
              'See Privacy Policy for detailed information'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="9. Third-Party Services">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">9.1 Integrated Services</h4>
            <p>The Service integrates with:</p>
            <LegalList items={[
              'Stripe (payment processing)',
              'Google Calendar',
              'Google My Business',
              'SendGrid (email)',
              'Twilio (SMS)',
              'Various marketing platforms'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">9.2 Third-Party Terms</h4>
            <LegalList items={[
              'You must comply with third-party service terms',
              'We are not responsible for third-party service issues',
              'Integration availability may change'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="10. Disclaimers and Limitations">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">10.1 Service Availability</h4>
            <LegalList items={[
              'Service provided "as is" without warranties',
              'We don\'t guarantee uninterrupted access',
              'Scheduled maintenance will be communicated'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">10.2 Limitation of Liability</h4>
            <LegalList items={[
              'We are not liable for indirect or consequential damages',
              'Our liability is limited to fees paid in the last 12 months',
              'Some jurisdictions don\'t allow liability limitations'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">10.3 Indemnification</h4>
            <p>You agree to indemnify us against claims arising from:</p>
            <LegalList items={[
              'Your use of the Service',
              'Violation of these Terms',
              'Infringement of third-party rights'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="11. Dispute Resolution">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">11.1 Governing Law</h4>
            <p>These Terms are governed by [Your State/Country] law.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">11.2 Arbitration</h4>
            <LegalList items={[
              'Disputes resolved through binding arbitration',
              'Class action waiver applies',
              'Small claims court exception'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">11.3 Notice Period</h4>
            <LegalList items={[
              '30-day notice required before initiating disputes',
              'Good faith attempt to resolve required'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="12. Changes to Terms">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">12.1 Modifications</h4>
            <LegalList items={[
              'We may update these Terms at any time',
              'Material changes communicated via email',
              'Continued use constitutes acceptance'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">12.2 Notification</h4>
            <LegalList items={[
              'Email notification for significant changes',
              '30-day notice for fee changes',
              'Terms history available upon request'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="13. Communications">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">13.1 Service Communications</h4>
            <p>By using the Service, you consent to receive:</p>
            <LegalList items={[
              'Transactional emails and SMS',
              'Service updates and announcements',
              'Security and account notices'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">13.2 Marketing Communications</h4>
            <LegalList items={[
              'Optional marketing communications',
              'Unsubscribe available at any time',
              'Managed through account preferences'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="14. Accessibility">
        <p>
          We strive to make our Service accessible to all users. If you encounter accessibility issues, 
          please contact support@bookedbarber.com.
        </p>
      </LegalSection>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-center text-blue-800 font-medium">
          By using BookedBarber, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </p>
      </div>
    </LegalDocument>
  )
}

export default TermsOfServicePage