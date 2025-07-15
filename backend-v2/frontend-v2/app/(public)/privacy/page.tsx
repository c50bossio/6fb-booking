'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, Shield, Settings, Mail, Download, Trash2, FileText, Lock } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            How we collect, use, and protect your personal information
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Last updated: July 2025
          </p>
        </div>

        {/* Privacy at a Glance */}
        <Card className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">Privacy at a Glance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">We collect minimal data</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Only what's necessary to provide our booking service</p>
              </div>
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">You have control</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Access, export, or delete your data anytime</p>
              </div>
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Transparent cookies</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Clear choices about analytics and marketing tracking</p>
              </div>
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">GDPR compliant</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Full compliance with data protection regulations</p>
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
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Access Your Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Request a complete copy of your personal data we store</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Correct Your Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Update or correct any inaccurate information</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Export Your Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Download your data in a portable format</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Delete Your Data</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Request complete deletion of your account and data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Object to Processing</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Opt out of marketing communications and data processing</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Data Portability</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Transfer your data to another service provider</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Collection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What Data We Collect</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Account Information</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name, email address, phone number, and profile photo (optional)</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Booking Data</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Appointment dates, services, preferences, and payment information</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Usage Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">How you interact with our platform to improve your experience (with your consent)</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Communication</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Messages, support tickets, and feedback you send us</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              How We Protect Your Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Encryption</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">All data transmitted using industry-standard SSL/TLS encryption</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Access Controls</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Strict employee access controls and regular security audits</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Data Minimization</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">We only collect and store data that's necessary for our service</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Regular Audits</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Continuous monitoring and third-party security assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cookies & Tracking */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cookies & Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Essential Cookies</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Required for basic site functionality, login sessions, and security</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Analytics Cookies (Optional)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Help us understand how you use our site to improve performance</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Marketing Cookies (Optional)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Used for personalized advertising and measuring campaign effectiveness</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can control your cookie preferences at any time through our{' '}
                  <a href="/cookies" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    Cookie Settings
                  </a>
                  {' '}page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Payment Processing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Stripe handles all payment processing. We never store your full credit card information.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Email Services</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">SendGrid for transactional emails like booking confirmations and reminders.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Google Analytics (optional) to understand site usage and improve user experience.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="mb-8 bg-gray-50 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Questions About Your Privacy?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We're committed to protecting your privacy. If you have any questions about this policy or how we handle your data, please contact us.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Email:</strong> privacy@bookedbarber.com
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Response Time:</strong> Within 48 hours for privacy inquiries
              </p>
            </div>
            <div className="mt-4">
              <a 
                href="/contact" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Contact Privacy Team
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Legal Compliance */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-500">
          <p>
            This privacy policy complies with GDPR, CCPA, and other applicable data protection regulations.
          </p>
          <p className="mt-2">
            For detailed legal information, see our{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Terms of Service
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}