'use client'

import React from 'react'

const TermsOfServicePage = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="flex flex-col space-y-1.5 pb-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            Terms of Service
          </h3>
          <p className="text-sm text-gray-600">
            Last updated: July 2, 2025 | Effective: July 2, 2025
          </p>
        </div>
        
        <div className="space-y-6">
          <section>
            <h4 className="text-lg font-medium mb-3">1. Agreement to Terms</h4>
            <p className="text-gray-600">
              By accessing or using BookedBarber ("the Service"), operated by [Your Company Name] ("we," "us," or "our"), 
              you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, 
              you do not have permission to access the Service.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">2. Description of Service</h4>
            <p className="text-gray-600 mb-3">
              BookedBarber is a comprehensive booking and business management platform for barbershops that provides:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Online appointment scheduling and management</li>
              <li>Payment processing through Stripe</li>
              <li>Business analytics and reporting</li>
              <li>Client management tools</li>
              <li>Calendar integration</li>
              <li>SMS/Email communications</li>
              <li>Multi-location support</li>
              <li>Marketing and review management tools</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">3. User Accounts</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">3.1 Account Creation</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>You must provide accurate, complete, and current information</li>
                  <li>You must be at least 18 years old to create an account</li>
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>You must notify us immediately of any unauthorized access</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">3.2 Account Types</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Clients</strong>: Book appointments and manage their booking history</li>
                  <li><strong>Barbers</strong>: Manage their schedule, clients, and receive payments</li>
                  <li><strong>Shop Owners/Admins</strong>: Full access to shop management features</li>
                  <li><strong>Super Admins</strong>: Platform-wide administrative access</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">3.3 Account Termination</h5>
                <p className="text-gray-600 mb-2">We reserve the right to suspend or terminate accounts that:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Violate these Terms</li>
                  <li>Engage in fraudulent or illegal activities</li>
                  <li>Abuse the platform or other users</li>
                  <li>Remain inactive for extended periods</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">4. Booking and Cancellation Policies</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">4.1 Appointment Booking</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Appointments are subject to barber availability</li>
                  <li>Booking confirmations are sent via email/SMS</li>
                  <li>Prices displayed are set by individual barbershops</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">4.2 Cancellations and No-Shows</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Cancellation policies are set by individual barbershops</li>
                  <li>Late cancellations may incur fees as determined by the shop</li>
                  <li>Repeated no-shows may result in booking restrictions</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">4.3 Modifications</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Appointment modifications are subject to availability</li>
                  <li>Changes must be made within the timeframe set by the shop</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">5. Payments and Fees</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">5.1 Payment Processing</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>All payments are processed securely through Stripe</li>
                  <li>We do not store credit card information</li>
                  <li>Payment disputes are handled according to Stripe's policies</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">5.2 Service Fees</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Platform usage fees apply as outlined in your subscription plan</li>
                  <li>Transaction fees may apply to payment processing</li>
                  <li>Fees are subject to change with 30 days notice</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">5.3 Barber Payouts</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Payouts are processed according to the agreed schedule</li>
                  <li>Barbers must maintain valid Stripe Connect accounts</li>
                  <li>We are not responsible for banking delays</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">5.4 Refunds</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Refund policies are determined by individual barbershops</li>
                  <li>Platform fees are non-refundable</li>
                  <li>Disputed charges follow Stripe's resolution process</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">6. Acceptable Use Policy</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">6.1 Prohibited Activities</h5>
                <p className="text-gray-600 mb-2">You agree not to:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Use the Service for illegal purposes</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Attempt to breach security systems</li>
                  <li>Scrape or data mine the platform</li>
                  <li>Create fake accounts or bookings</li>
                  <li>Interfere with Service operations</li>
                  <li>Violate intellectual property rights</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">6.2 Content Standards</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>All uploaded content must be appropriate and legal</li>
                  <li>No offensive, discriminatory, or harmful content</li>
                  <li>You retain ownership of your content</li>
                  <li>You grant us license to use content for Service operation</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">7. Intellectual Property</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">7.1 Platform Ownership</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>BookedBarber and its features are our exclusive property</li>
                  <li>All trademarks, logos, and branding belong to us</li>
                  <li>The Six Figure Barber methodology is proprietary</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">7.2 User Content</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>You retain rights to content you upload</li>
                  <li>You grant us license to use, display, and distribute your content</li>
                  <li>We may use anonymized data for analytics and improvements</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">8. Privacy and Data Protection</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">8.1 Data Collection</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>We collect and process data as outlined in our Privacy Policy</li>
                  <li>You consent to data collection necessary for Service operation</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">8.2 Data Security</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>We implement industry-standard security measures</li>
                  <li>No system is 100% secure; use at your own risk</li>
                  <li>Report security concerns to security@bookedbarber.com</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">8.3 GDPR Compliance</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>EU users have additional rights under GDPR</li>
                  <li>Data portability and deletion requests honored</li>
                  <li>See Privacy Policy for detailed information</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">9. Third-Party Services</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">9.1 Integrated Services</h5>
                <p className="text-gray-600 mb-2">The Service integrates with:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Stripe (payment processing)</li>
                  <li>Google Calendar</li>
                  <li>Google My Business</li>
                  <li>SendGrid (email)</li>
                  <li>Twilio (SMS)</li>
                  <li>Various marketing platforms</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">9.2 Third-Party Terms</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>You must comply with third-party service terms</li>
                  <li>We are not responsible for third-party service issues</li>
                  <li>Integration availability may change</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">10. Disclaimers and Limitations</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">10.1 Service Availability</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Service provided "as is" without warranties</li>
                  <li>We don't guarantee uninterrupted access</li>
                  <li>Scheduled maintenance will be communicated</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">10.2 Limitation of Liability</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>We are not liable for indirect or consequential damages</li>
                  <li>Our liability is limited to fees paid in the last 12 months</li>
                  <li>Some jurisdictions don't allow liability limitations</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">10.3 Indemnification</h5>
                <p className="text-gray-600 mb-2">You agree to indemnify us against claims arising from:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Your use of the Service</li>
                  <li>Violation of these Terms</li>
                  <li>Infringement of third-party rights</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">11. Dispute Resolution</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">11.1 Governing Law</h5>
                <p className="text-gray-600">These Terms are governed by [Your State/Country] law.</p>
              </div>

              <div>
                <h5 className="font-medium mb-2">11.2 Arbitration</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Disputes resolved through binding arbitration</li>
                  <li>Class action waiver applies</li>
                  <li>Small claims court exception</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">11.3 Notice Period</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>30-day notice required before initiating disputes</li>
                  <li>Good faith attempt to resolve required</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">12. Changes to Terms</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">12.1 Modifications</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>We may update these Terms at any time</li>
                  <li>Material changes communicated via email</li>
                  <li>Continued use constitutes acceptance</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">12.2 Notification</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Email notification for significant changes</li>
                  <li>30-day notice for fee changes</li>
                  <li>Terms history available upon request</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">13. Communications</h4>
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">13.1 Service Communications</h5>
                <p className="text-gray-600 mb-2">By using the Service, you consent to receive:</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Transactional emails and SMS</li>
                  <li>Service updates and announcements</li>
                  <li>Security and account notices</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">13.2 Marketing Communications</h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Optional marketing communications</li>
                  <li>Unsubscribe available at any time</li>
                  <li>Managed through account preferences</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">14. Accessibility</h4>
            <p className="text-gray-600">
              We strive to make our Service accessible to all users. If you encounter accessibility issues, 
              please contact support@bookedbarber.com.
            </p>
          </section>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-center text-blue-800 font-medium">
            By using BookedBarber, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TermsOfServicePage