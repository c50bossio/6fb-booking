'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

interface FAQCategory {
  id: string
  name: string
  description: string
  icon: string
}

const FAQPageComponent = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const categories: FAQCategory[] = [
    {
      id: 'all',
      name: 'All Questions',
      description: 'Browse all frequently asked questions',
      icon: '📋'
    },
    {
      id: 'getting-started',
      name: 'Getting Started',
      description: 'New to BookedBarber? Start here',
      icon: '🚀'
    },
    {
      id: 'booking-scheduling',
      name: 'Booking & Scheduling',
      description: 'Appointments, calendar, availability',
      icon: '📅'
    },
    {
      id: 'payments-billing',
      name: 'Payments & Billing',
      description: 'Pricing, subscriptions, payment methods',
      icon: '💳'
    },
    {
      id: 'account-management',
      name: 'Account Management',
      description: 'Profile settings, permissions, security',
      icon: '👤'
    },
    {
      id: 'business-features',
      name: 'Business Features',
      description: 'Analytics, marketing, multi-location',
      icon: '📊'
    },
    {
      id: 'technical-issues',
      name: 'Technical Issues',
      description: 'Troubleshooting, integrations, API',
      icon: '🔧'
    }
  ]

  const faqItems: FAQItem[] = [
    // Getting Started
    {
      id: 'what-is-bookedbarber',
      question: 'What is BookedBarber and how does it work?',
      answer: 'BookedBarber is a comprehensive booking and business management platform designed specifically for barbershops. It allows barbers to manage appointments, process payments, track analytics, and grow their business all in one place. Clients can easily book appointments, manage their preferences, and communicate with their barber.',
      category: 'getting-started',
      tags: ['overview', 'platform', 'features']
    },
    {
      id: 'how-to-get-started',
      question: 'How do I get started with BookedBarber?',
      answer: 'Getting started is easy! Simply sign up for a free account, complete your profile setup, add your services and pricing, configure your availability, and start accepting bookings. Our onboarding wizard will guide you through each step. You can be up and running in under 10 minutes.',
      category: 'getting-started',
      tags: ['setup', 'onboarding', 'account']
    },
    {
      id: 'pricing-plans',
      question: 'What are the pricing plans available?',
      answer: 'We offer flexible pricing plans to suit different business sizes: Free Plan (basic features for solo barbers), Professional Plan ($29/month with advanced features), and Enterprise Plan ($99/month for multi-location businesses). All plans include unlimited bookings and 24/7 support. Check our pricing page for detailed feature comparisons.',
      category: 'getting-started',
      tags: ['pricing', 'plans', 'subscription']
    },
    {
      id: 'free-trial',
      question: 'Do you offer a free trial?',
      answer: 'Yes! We offer a 14-day free trial of our Professional Plan with no credit card required. This gives you access to all premium features so you can fully evaluate the platform. After the trial, you can choose to continue with a paid plan or downgrade to our free tier.',
      category: 'getting-started',
      tags: ['trial', 'free', 'evaluation']
    },

    // Booking & Scheduling
    {
      id: 'how-booking-works',
      question: 'How does the booking system work for clients?',
      answer: 'Clients can book appointments through your personalized booking page, which includes your available services, pricing, and real-time availability. They can select their preferred date and time, choose services, and pay securely online. Confirmation emails and SMS reminders are sent automatically.',
      category: 'booking-scheduling',
      tags: ['booking', 'clients', 'appointments']
    },
    {
      id: 'manage-availability',
      question: 'How do I manage my availability and working hours?',
      answer: 'You can set your regular working hours, block out time for breaks or personal appointments, and mark vacation days in your calendar settings. Changes are reflected in real-time on your booking page. You can also set different availability for different services or locations.',
      category: 'booking-scheduling',
      tags: ['availability', 'calendar', 'schedule']
    },
    {
      id: 'recurring-appointments',
      question: 'Can clients book recurring appointments?',
      answer: 'Yes! Clients can set up recurring appointments (weekly, bi-weekly, monthly) for regular services. The system automatically books future appointments and sends reminders. Both you and your clients can modify or cancel the recurring series at any time.',
      category: 'booking-scheduling',
      tags: ['recurring', 'regular', 'automatic']
    },
    {
      id: 'cancellation-policy',
      question: 'How do cancellations and reschedules work?',
      answer: 'You can set your own cancellation policy (e.g., 24-hour notice required). Clients can cancel or reschedule through their account or booking confirmation email up to your specified deadline. Late cancellations can be charged according to your policy settings.',
      category: 'booking-scheduling',
      tags: ['cancellation', 'reschedule', 'policy']
    },
    {
      id: 'google-calendar-sync',
      question: 'Does BookedBarber integrate with Google Calendar?',
      answer: 'Yes! We offer two-way sync with Google Calendar. Your BookedBarber appointments automatically appear in your Google Calendar, and personal events from Google Calendar block availability on your booking page. This prevents double-booking and keeps everything in sync.',
      category: 'booking-scheduling',
      tags: ['google', 'calendar', 'integration', 'sync']
    },

    // Payments & Billing
    {
      id: 'payment-processing',
      question: 'How does payment processing work?',
      answer: 'We use Stripe Connect for secure payment processing. Clients can pay with credit/debit cards, Apple Pay, or Google Pay. Payments are processed instantly and funds are automatically transferred to your bank account. We handle all PCI compliance and security.',
      category: 'payments-billing',
      tags: ['payments', 'stripe', 'security', 'processing']
    },
    {
      id: 'transaction-fees',
      question: 'What are the transaction fees?',
      answer: 'Transaction fees are 2.9% + 30¢ for online payments, which is the industry standard. There are no hidden fees, monthly processing fees, or setup costs. You only pay when you get paid. Enterprise plans have negotiated rates for high-volume businesses.',
      category: 'payments-billing',
      tags: ['fees', 'transaction', 'costs']
    },
    {
      id: 'payout-schedule',
      question: 'When do I receive my payments?',
      answer: 'Payments are automatically transferred to your bank account on a rolling 2-day basis (weekends excluded). For example, payments received on Monday are transferred on Wednesday. You can view detailed payout reports in your dashboard and track all transactions.',
      category: 'payments-billing',
      tags: ['payouts', 'transfers', 'banking']
    },
    {
      id: 'refunds-disputes',
      question: 'How are refunds and payment disputes handled?',
      answer: 'You can issue full or partial refunds directly from your dashboard. Refunds typically process within 3-5 business days. For payment disputes, we provide documentation and support throughout the process. Most disputes are resolved quickly with our detailed transaction records.',
      category: 'payments-billing',
      tags: ['refunds', 'disputes', 'chargebacks']
    },
    {
      id: 'taxes-reporting',
      question: 'Do you provide tax reporting and 1099 forms?',
      answer: 'Yes! We provide comprehensive tax reporting with exportable transaction data. For US-based businesses processing over $600 annually, we automatically generate and file 1099-K forms. You can access detailed financial reports anytime for tax preparation.',
      category: 'payments-billing',
      tags: ['taxes', '1099', 'reporting', 'financial']
    },

    // Account Management
    {
      id: 'profile-setup',
      question: 'How do I set up my barber profile?',
      answer: 'Complete your profile by adding your bio, specialties, years of experience, and professional photos. Include your certifications, awards, and what makes you unique. A complete profile builds trust and helps clients choose you. You can update your profile anytime.',
      category: 'account-management',
      tags: ['profile', 'bio', 'photos', 'certifications']
    },
    {
      id: 'service-pricing',
      question: 'How do I add services and set pricing?',
      answer: 'Navigate to Services in your dashboard to add haircuts, beard trims, styling, and other services. Set individual prices, durations, and descriptions for each service. You can create service packages, offer discounts, and set different pricing for different client types.',
      category: 'account-management',
      tags: ['services', 'pricing', 'packages', 'discounts']
    },
    {
      id: 'staff-management',
      question: 'Can I add staff members or other barbers?',
      answer: 'Yes! Enterprise plans support multiple barbers and staff members. You can set individual schedules, services, and pricing for each barber. Staff can have their own login to manage their bookings, while you maintain oversight and business analytics.',
      category: 'account-management',
      tags: ['staff', 'team', 'multi-barber', 'permissions']
    },
    {
      id: 'security-privacy',
      question: 'How secure is my data and my clients\' information?',
      answer: 'We take security seriously with bank-level encryption, secure data centers, and regular security audits. All client data is encrypted and we\'re fully GDPR and CCPA compliant. You and your clients have full control over data privacy settings and can export or delete data anytime.',
      category: 'account-management',
      tags: ['security', 'privacy', 'encryption', 'gdpr', 'ccpa']
    },

    // Business Features
    {
      id: 'analytics-reporting',
      question: 'What analytics and reporting features are available?',
      answer: 'Our analytics dashboard shows revenue trends, booking patterns, client retention, popular services, and growth metrics. You can track daily, weekly, monthly, and yearly performance. Export detailed reports for business planning and tax purposes.',
      category: 'business-features',
      tags: ['analytics', 'reporting', 'revenue', 'metrics']
    },
    {
      id: 'marketing-tools',
      question: 'What marketing tools do you provide?',
      answer: 'We include automated email and SMS marketing, review management, social media integration, and referral programs. Create campaigns for promotions, send appointment reminders, and manage your online reputation. Track campaign performance and ROI.',
      category: 'business-features',
      tags: ['marketing', 'email', 'sms', 'reviews', 'referrals']
    },
    {
      id: 'multi-location',
      question: 'Can I manage multiple barbershop locations?',
      answer: 'Yes! Enterprise plans support multiple locations with centralized management. Each location can have its own staff, services, and booking page while sharing client data and analytics. Perfect for franchises or growing businesses.',
      category: 'business-features',
      tags: ['multi-location', 'franchise', 'enterprise']
    },
    {
      id: 'client-database',
      question: 'How does the client management system work?',
      answer: 'Build a comprehensive client database with booking history, preferences, notes, and contact information. Track client lifetime value, visit frequency, and send personalized communications. Import existing client data easily.',
      category: 'business-features',
      tags: ['clients', 'database', 'crm', 'history']
    },

    // Technical Issues
    {
      id: 'mobile-app',
      question: 'Is there a mobile app available?',
      answer: 'Our platform is fully responsive and works perfectly on all mobile devices through your web browser. A dedicated mobile app is in development and will be available soon. You can add our web app to your phone\'s home screen for easy access.',
      category: 'technical-issues',
      tags: ['mobile', 'app', 'responsive', 'browser']
    },
    {
      id: 'api-integrations',
      question: 'Do you offer API integrations with other tools?',
      answer: 'Yes! We offer API access for integrations with POS systems, accounting software, marketing tools, and other business applications. Our API documentation is comprehensive and we provide developer support for custom integrations.',
      category: 'technical-issues',
      tags: ['api', 'integrations', 'pos', 'accounting']
    },
    {
      id: 'data-backup',
      question: 'How is my data backed up and protected?',
      answer: 'Your data is automatically backed up multiple times daily to secure cloud servers. We maintain redundant backups across different geographic locations. You can also export your data anytime for your own records.',
      category: 'technical-issues',
      tags: ['backup', 'data', 'cloud', 'export']
    },
    {
      id: 'system-requirements',
      question: 'What are the system requirements to use BookedBarber?',
      answer: 'BookedBarber works on any device with a modern web browser (Chrome, Firefox, Safari, Edge). No software installation required. For optimal experience, we recommend updated browsers and reliable internet connection.',
      category: 'technical-issues',
      tags: ['requirements', 'browser', 'compatibility']
    },
    {
      id: 'troubleshooting',
      question: 'What should I do if I encounter technical issues?',
      answer: 'First, try refreshing your browser or clearing cache. Check our status page for any known issues. If problems persist, contact our 24/7 support team with a description of the issue and any error messages. We typically respond within 30 minutes.',
      category: 'technical-issues',
      tags: ['troubleshooting', 'support', 'bugs', 'help']
    }
  ]

  const filteredFAQs = useMemo(() => {
    let filtered = faqItems

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [searchQuery, selectedCategory])

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const expandAll = () => {
    setExpandedItems(new Set(filteredFAQs.map(item => item.id)))
  }

  const collapseAll = () => {
    setExpandedItems(new Set())
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Page Header */}
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about BookedBarber. Can't find what you're looking for? 
            <a href="/contact" className="text-blue-600 hover:underline ml-1">Contact our support team</a>
          </p>
          
          {/* Quick Stats */}
          <div className="flex justify-center gap-6 mt-6 text-sm text-gray-500">
            <span>{faqItems.length} Questions</span>
            <span>•</span>
            <span>{categories.length - 1} Categories</span>
            <span>•</span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="max-w-md mx-auto">
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              }
              clearable
              onClear={() => setSearchQuery('')}
            />
          </div>

          {/* Category Filters */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Browse by Category</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h4 className="font-medium mb-1">{category.name}</h4>
                      <p className="text-xs text-gray-600">{category.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results and Controls */}
      <div className="flex items-center justify-between">
        <div className="text-gray-600">
          {searchQuery || selectedCategory !== 'all' ? (
            <p>
              Showing {filteredFAQs.length} of {faqItems.length} questions
              {selectedCategory !== 'all' && (
                <span className="ml-1">
                  in {categories.find(c => c.id === selectedCategory)?.name}
                </span>
              )}
            </p>
          ) : (
            <p>All {faqItems.length} questions</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredFAQs.length === 0 ? (
          <div className="rounded-lg border bg-white shadow-sm p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search terms or browse a different category.
            </p>
            <Button variant="outline" onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          filteredFAQs.map((item) => (
            <div key={item.id} className="rounded-lg border bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => toggleExpanded(item.id)}
                className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-medium text-gray-900 pr-4">
                    {item.question}
                  </h3>
                  <div className={`flex-shrink-0 transition-transform duration-200 ${
                    expandedItems.has(item.id) ? 'rotate-180' : ''
                  }`}>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>
              
              {expandedItems.has(item.id) && (
                <div className="px-6 pb-6 pt-0">
                  <div className="border-t pt-4">
                    <p className="text-gray-700 leading-relaxed">
                      {item.answer}
                    </p>
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Still Need Help Section */}
      <div className="rounded-lg border bg-blue-50 border-blue-200 p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-blue-800 mb-2">
            Still Need Help?
          </h3>
          <p className="text-blue-700 mb-6">
            Our support team is available 24/7 to help you with any questions or issues.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="primary" href="/contact">
              Contact Support
            </Button>
            <Button variant="outline" href="/documentation">
              View Documentation
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-white shadow-sm p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h4 className="font-medium mb-2">Getting Started Guide</h4>
          <p className="text-sm text-gray-600 mb-4">
            Step-by-step setup instructions for new users
          </p>
          <Button variant="outline" size="sm" href="/documentation">
            Read Guide
          </Button>
        </div>

        <div className="rounded-lg border bg-white shadow-sm p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-medium mb-2">Live Chat Support</h4>
          <p className="text-sm text-gray-600 mb-4">
            Chat with our support team in real-time
          </p>
          <Button variant="outline" size="sm" onClick={() => {
            // This would integrate with your live chat system
            alert('Live chat would open here')
          }}>
            Start Chat
          </Button>
        </div>

        <div className="rounded-lg border bg-white shadow-sm p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h4 className="font-medium mb-2">Video Tutorials</h4>
          <p className="text-sm text-gray-600 mb-4">
            Watch step-by-step video guides
          </p>
          <Button variant="outline" size="sm" href="/documentation#videos">
            Watch Videos
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FAQPageComponent