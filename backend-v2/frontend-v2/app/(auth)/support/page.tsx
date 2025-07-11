'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  QuestionMarkCircleIcon, 
  BookOpenIcon, 
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const faqs = [
    {
      id: 'booking',
      question: 'How do I manage appointments?',
      answer: 'You can manage appointments through the Calendar page. Click on any time slot to create a new appointment, or click on existing appointments to view details, reschedule, or cancel.'
    },
    {
      id: 'payments',
      question: 'How do payment processing and payouts work?',
      answer: 'BookedBarber uses Stripe Connect for secure payment processing. Clients pay through the platform, and barbers receive automatic payouts based on their configured schedule (daily, weekly, or monthly).'
    },
    {
      id: 'clients',
      question: 'How do I add new clients?',
      answer: 'Navigate to the Clients page and click "Add Client". You can also add clients directly when creating appointments. Client information is automatically saved for future bookings.'
    },
    {
      id: 'availability',
      question: 'How do I set my working hours?',
      answer: 'Go to Calendar & Scheduling > Availability to set your regular working hours, breaks, and days off. You can also add blackout dates for vacations or holidays.'
    },
    {
      id: 'notifications',
      question: 'How do automated reminders work?',
      answer: 'BookedBarber automatically sends SMS and email reminders to clients before their appointments. You can configure reminder timing and messages in Settings > Notifications.'
    },
    {
      id: 'analytics',
      question: 'Where can I view my business performance?',
      answer: 'The Analytics page provides comprehensive insights into your revenue, client retention, booking patterns, and growth trends based on the Six Figure Barber methodology.'
    }
  ]

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id)
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-gray-600">Get help with BookedBarber and find answers to common questions</p>
      </div>

      {/* Quick Help Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <Card className="p-6">
          <BookOpenIcon className="h-8 w-8 text-blue-500 mb-3" />
          <h3 className="font-semibold mb-2">Getting Started Guide</h3>
          <p className="text-sm text-gray-600 mb-4">
            New to BookedBarber? Learn the basics and get your barbershop up and running.
          </p>
          <Button variant="outline" className="w-full">View Guide</Button>
        </Card>

        <Card className="p-6">
          <DocumentTextIcon className="h-8 w-8 text-green-500 mb-3" />
          <h3 className="font-semibold mb-2">Documentation</h3>
          <p className="text-sm text-gray-600 mb-4">
            Detailed documentation for all features and integrations.
          </p>
          <Button variant="outline" className="w-full">Browse Docs</Button>
        </Card>

        <Card className="p-6">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-purple-500 mb-3" />
          <h3 className="font-semibold mb-2">Video Tutorials</h3>
          <p className="text-sm text-gray-600 mb-4">
            Watch step-by-step video tutorials for common tasks.
          </p>
          <Button variant="outline" className="w-full">Watch Videos</Button>
        </Card>
      </div>

      {/* FAQs */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-6 flex items-center">
          <QuestionMarkCircleIcon className="h-6 w-6 mr-2" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card key={faq.id} className="overflow-hidden">
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-center"
              >
                <span className="font-medium">{faq.question}</span>
                <span className="text-gray-400">
                  {expandedFaq === faq.id ? '−' : '+'}
                </span>
              </button>
              {expandedFaq === faq.id && (
                <div className="px-4 pb-4 text-gray-600">
                  {faq.answer}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <Card className="p-8 bg-gray-50">
        <h2 className="text-2xl font-semibold mb-4">Need More Help?</h2>
        <p className="text-gray-600 mb-6">
          Our support team is here to help you succeed with BookedBarber.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Button variant="outline" className="flex items-center justify-center">
            <EnvelopeIcon className="h-5 w-5 mr-2" />
            Email Support
          </Button>
          <Button variant="outline" className="flex items-center justify-center">
            <PhoneIcon className="h-5 w-5 mr-2" />
            Schedule a Call
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Support hours: Monday - Friday, 9 AM - 6 PM EST
        </p>
      </Card>
    </div>
  )
}