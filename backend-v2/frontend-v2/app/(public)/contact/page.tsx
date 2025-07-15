import type { Metadata } from 'next'
import ContactPageComponent from './ContactPageComponent'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with BookedBarber support team. Contact us for sales inquiries, technical support, billing questions, and partnership opportunities. Fast response times guaranteed.',
  keywords: ['contact', 'support', 'help', 'customer service', 'booking platform support', 'barbershop software help'],
  openGraph: {
    title: 'Contact BookedBarber Support',
    description: 'Get in touch with our expert support team for help with your barbershop booking platform.',
    type: 'website',
  },
  alternates: {
    canonical: '/contact',
  },
}

export default function ContactPage() {
  return <ContactPageComponent />
}