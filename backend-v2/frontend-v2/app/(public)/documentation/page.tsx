'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  BookOpenIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  UserGroupIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  CodeBracketIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  PlayIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { LogoFull } from '@/components/ui'

// Note: metadata removed due to 'use client' directive
// This page is client-side rendered for interactivity

interface NavigationItem {
  id: string
  title: string
  icon: React.ComponentType<any>
  subsections?: string[]
}

const DocumentationPage = () => {
  const [activeSection, setActiveSection] = useState('getting-started')

  const navigation: NavigationItem[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: PlayIcon,
      subsections: ['Account Setup', 'First Booking', 'Dashboard Tour']
    },
    {
      id: 'features',
      title: 'Features Overview',
      icon: BookOpenIcon,
      subsections: ['Calendar Management', 'Client Portal', 'Analytics Dashboard']
    },
    {
      id: 'booking-management',
      title: 'Booking Management',
      icon: CalendarDaysIcon,
      subsections: ['Creating Bookings', 'Managing Appointments', 'Recurring Appointments', 'Calendar Integration']
    },
    {
      id: 'payment-processing',
      title: 'Payment Processing',
      icon: CreditCardIcon,
      subsections: ['Stripe Setup', 'Payment Methods', 'Payouts', 'Refunds']
    },
    {
      id: 'client-management',
      title: 'Client Management',
      icon: UserGroupIcon,
      subsections: ['Client Profiles', 'Communication', 'History Tracking']
    },
    {
      id: 'notifications',
      title: 'Notifications & Reminders',
      icon: BellIcon,
      subsections: ['SMS Setup', 'Email Configuration', 'Automated Reminders']
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: ChartBarIcon,
      subsections: ['Revenue Tracking', 'Performance Metrics', 'Six Figure Barber Methodology']
    },
    {
      id: 'settings',
      title: 'Account Settings',
      icon: CogIcon,
      subsections: ['Profile Management', 'Business Information', 'Integrations']
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: QuestionMarkCircleIcon,
      subsections: ['Common Issues', 'Error Messages', 'Support Contacts']
    },
    {
      id: 'api-documentation',
      title: 'API Documentation',
      icon: CodeBracketIcon,
      subsections: ['Authentication', 'Endpoints', 'Webhooks', 'Rate Limits']
    }
  ]

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <LogoFull variant="auto" size="sm" href="/" />
              <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-700"></div>
              <h1 className="hidden sm:block text-lg font-semibold text-gray-900 dark:text-white">
                Documentation
              </h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Home
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-72 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Table of Contents
              </h2>
              <nav className="space-y-2">
                {navigation.map((item) => (
                  <div key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === item.id
                          ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </button>
                    {item.subsections && activeSection === item.id && (
                      <div className="ml-8 mt-2 space-y-1">
                        {item.subsections.map((subsection) => (
                          <button
                            key={subsection}
                            onClick={() => scrollToSection(`${item.id}-${subsection.toLowerCase().replace(/\s+/g, '-')}`)}
                            className="block w-full text-left px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            {subsection}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 space-y-12">
              
              {/* Hero Section */}
              <div className="text-center py-8 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  BookedBarber Documentation
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                  Everything you need to know to get the most out of BookedBarber - from basic setup to advanced features and API integration.
                </p>
              </div>

              {/* Quick Start Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center mb-4">
                    <PlayIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                    Quick Start Guide
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    Get up and running in less than 5 minutes with our step-by-step setup guide.
                  </p>
                  <button 
                    onClick={() => scrollToSection('getting-started')}
                    className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline"
                  >
                    Start Here →
                  </button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center mb-4">
                    <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Booking Basics
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    Learn how to create, manage, and optimize your booking system for maximum efficiency.
                  </p>
                  <button 
                    onClick={() => scrollToSection('booking-management')}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Learn More →
                  </button>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mb-4">
                    <CodeBracketIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">
                    API Reference
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                    Integrate BookedBarber with your existing systems using our comprehensive API.
                  </p>
                  <button 
                    onClick={() => scrollToSection('api-documentation')}
                    className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    View Docs →
                  </button>
                </div>
              </div>

              {/* Getting Started Section */}
              <section id="getting-started" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                  <PlayIcon className="w-8 h-8 mr-3 text-primary-600 dark:text-primary-400" />
                  Getting Started
                </h2>

                <div className="space-y-8">
                  <div id="getting-started-account-setup">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Account Setup
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
                          1
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Create Your Account</h4>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            Sign up with your email and create a secure password. Email verification required.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
                          2
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Business Information</h4>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            Enter your barbershop details, location, and service offerings.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
                          3
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Payment Setup</h4>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            Connect your Stripe account to start accepting payments immediately.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div id="getting-started-first-booking">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Your First Booking
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p>
                        Once your account is set up, creating your first booking is simple:
                      </p>
                      <ul>
                        <li>Navigate to your calendar dashboard</li>
                        <li>Click "New Appointment" or select a time slot</li>
                        <li>Add client information and service details</li>
                        <li>Set appointment duration and pricing</li>
                        <li>Send confirmation to your client</li>
                      </ul>
                    </div>
                  </div>

                  <div id="getting-started-dashboard-tour">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Dashboard Tour
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">Main Navigation</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• <strong>Calendar:</strong> Manage appointments and availability</li>
                          <li>• <strong>Clients:</strong> View and manage client information</li>
                          <li>• <strong>Analytics:</strong> Track revenue and performance</li>
                          <li>• <strong>Settings:</strong> Configure your business preferences</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">Quick Actions</h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Create new appointments</li>
                          <li>• View today's schedule</li>
                          <li>• Check payment status</li>
                          <li>• Send client reminders</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Features Overview Section */}
              <section id="features" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                  <BookOpenIcon className="w-8 h-8 mr-3 text-primary-600 dark:text-primary-400" />
                  Features Overview
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <CalendarDaysIcon className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Smart Calendar
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Intuitive scheduling with day, week, and month views. Real-time availability and conflict prevention.
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <UserGroupIcon className="w-10 h-10 text-green-600 dark:text-green-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Client Management
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Comprehensive client profiles with history, preferences, and communication tools.
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <CreditCardIcon className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Payment Processing
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Secure payments via Stripe with automatic payouts and detailed transaction tracking.
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <BellIcon className="w-10 h-10 text-orange-600 dark:text-orange-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Automated Reminders
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      SMS and email reminders that reduce no-shows by up to 80%.
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <ChartBarIcon className="w-10 h-10 text-red-600 dark:text-red-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Analytics Dashboard
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Track revenue, client retention, and business growth with Six Figure Barber methodology.
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <CogIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Integrations
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Connect with Google Calendar, SendGrid, Twilio, and other business tools.
                    </p>
                  </div>
                </div>
              </section>

              {/* Booking Management Section */}
              <section id="booking-management" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                  <CalendarDaysIcon className="w-8 h-8 mr-3 text-primary-600 dark:text-primary-400" />
                  Booking Management
                </h2>

                <div className="space-y-8">
                  <div id="booking-management-creating-bookings">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Creating Bookings
                    </h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                        Step-by-Step Booking Process
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                        <li>Select an available time slot on your calendar</li>
                        <li>Choose the service type and duration</li>
                        <li>Add client information (new or existing)</li>
                        <li>Set the appointment price</li>
                        <li>Add any special notes or requirements</li>
                        <li>Send confirmation via SMS/email</li>
                        <li>Process payment (if required upfront)</li>
                      </ol>
                    </div>
                  </div>

                  <div id="booking-management-managing-appointments">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Managing Appointments
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Appointment Actions
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Reschedule appointments</li>
                          <li>• Mark as completed or no-show</li>
                          <li>• Add service notes</li>
                          <li>• Process payments</li>
                          <li>• Send follow-up messages</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Status Management
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Confirmed (green)</li>
                          <li>• Pending (yellow)</li>
                          <li>• Cancelled (red)</li>
                          <li>• Completed (blue)</li>
                          <li>• No-show (gray)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div id="booking-management-recurring-appointments">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Recurring Appointments
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p>
                        Set up recurring appointments for regular clients to save time and ensure consistent bookings:
                      </p>
                      <ul>
                        <li><strong>Weekly:</strong> Same day and time each week</li>
                        <li><strong>Bi-weekly:</strong> Every two weeks</li>
                        <li><strong>Monthly:</strong> Same date each month</li>
                        <li><strong>Custom:</strong> Define your own pattern</li>
                      </ul>
                      <p>
                        Clients can modify or cancel individual appointments without affecting the entire series.
                      </p>
                    </div>
                  </div>

                  <div id="booking-management-calendar-integration">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Calendar Integration
                    </h3>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-3">
                        Google Calendar Sync
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                        Two-way synchronization with Google Calendar ensures you never double-book and can manage appointments from anywhere.
                      </p>
                      <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <p>• <strong>Real-time sync:</strong> Changes appear instantly</p>
                        <p>• <strong>Conflict prevention:</strong> Automatic blocking of busy times</p>
                        <p>• <strong>Mobile access:</strong> Manage from any device</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Payment Processing Section */}
              <section id="payment-processing" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                  <CreditCardIcon className="w-8 h-8 mr-3 text-primary-600 dark:text-primary-400" />
                  Payment Processing
                </h2>

                <div className="space-y-8">
                  <div id="payment-processing-stripe-setup">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Stripe Setup
                    </h3>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                      <div className="flex">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 shrink-0" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                            Important: Stripe Account Required
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                            You need a Stripe account to process payments. BookedBarber uses Stripe Connect for secure, PCI-compliant payment processing.
                          </p>
                          <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                            <p>1. Create a Stripe account at stripe.com</p>
                            <p>2. Complete business verification</p>
                            <p>3. Connect your account in BookedBarber settings</p>
                            <p>4. Test with Stripe's test cards before going live</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div id="payment-processing-payment-methods">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Payment Methods
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Supported Cards
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Visa</li>
                          <li>• Mastercard</li>
                          <li>• American Express</li>
                          <li>• Discover</li>
                          <li>• Diners Club</li>
                        </ul>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Digital Wallets
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Apple Pay</li>
                          <li>• Google Pay</li>
                          <li>• Link by Stripe</li>
                          <li>• ACH Bank Transfer</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div id="payment-processing-payouts">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Payouts
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p>
                        Stripe automatically transfers your earnings to your bank account:
                      </p>
                      <ul>
                        <li><strong>Daily payouts:</strong> Available for established accounts</li>
                        <li><strong>Weekly payouts:</strong> Default schedule for new accounts</li>
                        <li><strong>Manual payouts:</strong> Request transfers on-demand</li>
                      </ul>
                      <p>
                        Processing fees are automatically deducted (2.9% + 30¢ per transaction).
                      </p>
                    </div>
                  </div>

                  <div id="payment-processing-refunds">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Refunds
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Refund Process
                      </h4>
                      <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>Navigate to the payment in your transaction history</li>
                        <li>Click "Issue Refund"</li>
                        <li>Enter refund amount (partial or full)</li>
                        <li>Add reason for refund</li>
                        <li>Confirm refund</li>
                      </ol>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                        Refunds typically appear in the customer's account within 5-10 business days.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Troubleshooting Section */}
              <section id="troubleshooting" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                  <QuestionMarkCircleIcon className="w-8 h-8 mr-3 text-primary-600 dark:text-primary-400" />
                  Troubleshooting
                </h2>

                <div className="space-y-8">
                  <div id="troubleshooting-common-issues">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Common Issues
                    </h3>
                    
                    <div className="space-y-4">
                      <details className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <summary className="p-4 font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                          Can't log in to my account
                        </summary>
                        <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
                          <ul className="space-y-2">
                            <li>• Check if your email is correct and verified</li>
                            <li>• Try resetting your password</li>
                            <li>• Clear browser cache and cookies</li>
                            <li>• Disable browser extensions temporarily</li>
                            <li>• Contact support if issues persist</li>
                          </ul>
                        </div>
                      </details>

                      <details className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <summary className="p-4 font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                          Clients not receiving notifications
                        </summary>
                        <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
                          <ul className="space-y-2">
                            <li>• Verify client contact information is correct</li>
                            <li>• Check spam folders for emails</li>
                            <li>• Ensure SMS permissions are enabled</li>
                            <li>• Verify SendGrid/Twilio integration status</li>
                            <li>• Test notifications with your own contact info</li>
                          </ul>
                        </div>
                      </details>

                      <details className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <summary className="p-4 font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                          Payment processing errors
                        </summary>
                        <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
                          <ul className="space-y-2">
                            <li>• Verify Stripe account is active and verified</li>
                            <li>• Check if card information is correct</li>
                            <li>• Ensure sufficient funds on payment method</li>
                            <li>• Try a different payment method</li>
                            <li>• Contact Stripe support for payment issues</li>
                          </ul>
                        </div>
                      </details>

                      <details className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <summary className="p-4 font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                          Calendar sync issues
                        </summary>
                        <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
                          <ul className="space-y-2">
                            <li>• Reconnect Google Calendar in settings</li>
                            <li>• Check calendar permissions in Google account</li>
                            <li>• Verify correct calendar is selected</li>
                            <li>• Wait up to 15 minutes for sync to complete</li>
                            <li>• Contact support if sync remains broken</li>
                          </ul>
                        </div>
                      </details>
                    </div>
                  </div>

                  <div id="troubleshooting-error-messages">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Error Messages
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Error Code</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Description</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Solution</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-600 dark:text-gray-400">
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-3 px-4 font-mono">AUTH_001</td>
                            <td className="py-3 px-4">Invalid credentials</td>
                            <td className="py-3 px-4">Check email/password, reset if needed</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-3 px-4 font-mono">BOOK_002</td>
                            <td className="py-3 px-4">Double booking attempt</td>
                            <td className="py-3 px-4">Select different time slot</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-3 px-4 font-mono">PAY_003</td>
                            <td className="py-3 px-4">Payment declined</td>
                            <td className="py-3 px-4">Try different payment method</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-3 px-4 font-mono">SYNC_004</td>
                            <td className="py-3 px-4">Calendar sync failed</td>
                            <td className="py-3 px-4">Reconnect calendar integration</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div id="troubleshooting-support-contacts">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Support Contacts
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <EnvelopeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                          <h4 className="font-medium text-blue-800 dark:text-blue-200">
                            Email Support
                          </h4>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          For general questions and technical support
                        </p>
                        <a 
                          href="mailto:support@bookedbarber.com"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          support@bookedbarber.com
                        </a>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          Response time: 24-48 hours
                        </p>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <PhoneIcon className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
                          <h4 className="font-medium text-green-800 dark:text-green-200">
                            Phone Support
                          </h4>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                          For urgent issues and Enterprise customers
                        </p>
                        <a 
                          href="tel:+1-800-BOOKED-1"
                          className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline"
                        >
                          1-800-BOOKED-1
                        </a>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          Mon-Fri 9AM-6PM EST
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* API Documentation Section */}
              <section id="api-documentation" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                  <CodeBracketIcon className="w-8 h-8 mr-3 text-primary-600 dark:text-primary-400" />
                  API Documentation
                </h2>

                <div className="space-y-8">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      API Overview
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      The BookedBarber API allows you to integrate booking functionality into your existing systems. 
                      Our RESTful API uses JSON for data exchange and includes comprehensive authentication and rate limiting.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">Base URL</h4>
                        <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                          https://api.bookedbarber.com/v1
                        </code>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">Authentication</h4>
                        <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                          Bearer Token
                        </code>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">Rate Limit</h4>
                        <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                          100 requests/minute
                        </code>
                      </div>
                    </div>
                  </div>

                  <div id="api-documentation-authentication">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Authentication
                    </h3>
                    <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                      <pre className="text-green-400 text-sm">
                        <code>{`# Get your API key from Settings > API Keys
curl -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     https://api.bookedbarber.com/v1/appointments`}</code>
                      </pre>
                    </div>
                  </div>

                  <div id="api-documentation-endpoints">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Key Endpoints
                    </h3>
                    <div className="space-y-4">
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs font-mono">
                            GET
                          </span>
                          <span className="font-mono text-sm">/appointments</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Retrieve all appointments for the authenticated user
                        </p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-mono">
                            POST
                          </span>
                          <span className="font-mono text-sm">/appointments</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Create a new appointment
                        </p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs font-mono">
                            PUT
                          </span>
                          <span className="font-mono text-sm">/appointments/{'{id}'}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Update an existing appointment
                        </p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-mono">
                            DELETE
                          </span>
                          <span className="font-mono text-sm">/appointments/{'{id}'}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cancel an appointment
                        </p>
                      </div>
                    </div>
                  </div>

                  <div id="api-documentation-webhooks">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Webhooks
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p>
                        Webhooks allow you to receive real-time notifications when events occur in your BookedBarber account:
                      </p>
                      <ul>
                        <li><strong>appointment.created:</strong> New appointment booked</li>
                        <li><strong>appointment.updated:</strong> Appointment modified</li>
                        <li><strong>appointment.cancelled:</strong> Appointment cancelled</li>
                        <li><strong>payment.completed:</strong> Payment successfully processed</li>
                        <li><strong>payment.failed:</strong> Payment processing failed</li>
                      </ul>
                    </div>
                  </div>

                  <div id="api-documentation-rate-limits">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Rate Limits
                    </h3>
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
                      <div className="flex">
                        <InformationCircleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 mr-3 shrink-0" />
                        <div>
                          <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                            Rate Limiting Information
                          </h4>
                          <div className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
                            <p>• <strong>Standard:</strong> 100 requests per minute</p>
                            <p>• <strong>Professional:</strong> 500 requests per minute</p>
                            <p>• <strong>Enterprise:</strong> Custom limits available</p>
                            <p>• Rate limit headers included in all responses</p>
                            <p>• 429 status code returned when limit exceeded</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer CTA */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-8 text-center text-white">
                <h2 className="text-2xl font-bold mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
                  Join thousands of barbers using BookedBarber to grow their business. 
                  Set up your account in minutes and start accepting bookings today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/register">
                    <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                      Start Free Trial
                    </Button>
                  </Link>
                  <Link href="mailto:support@bookedbarber.com">
                    <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary-700">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default DocumentationPage