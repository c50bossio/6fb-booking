import type { Metadata } from 'next'
import FAQPageComponent from './FAQPageComponent'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions - BookedBarber',
  description: 'Find answers to common questions about BookedBarber booking platform. Get help with account setup, payments, scheduling, business features, and technical support.',
  keywords: [
    'faq',
    'help',
    'support',
    'booking software questions',
    'barbershop platform help',
    'appointment scheduling faq',
    'payment questions',
    'account setup help',
    'booking platform support'
  ],
  openGraph: {
    title: 'BookedBarber FAQ - Common Questions & Answers',
    description: 'Get instant answers to frequently asked questions about our barbershop booking platform. Comprehensive help for barbers and clients.',
    type: 'website',
  },
  alternates: {
    canonical: '/faq',
  },
}

export default function FAQPage() {
  return <FAQPageComponent />
}