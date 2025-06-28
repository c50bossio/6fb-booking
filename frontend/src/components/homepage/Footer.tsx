'use client'

import React from 'react'
import Link from 'next/link'
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

interface FooterLinkProps {
  href: string
  children: React.ReactNode
}

const FooterLink = React.memo(({ href, children }: FooterLinkProps) => (
  <Link
    href={href}
    className="text-gray-300 hover:text-white transition-colors duration-200 font-medium"
  >
    {children}
  </Link>
))

FooterLink.displayName = 'FooterLink'

interface FooterSectionProps {
  title: string
  links: { href: string; label: string }[]
}

const FooterSection = React.memo(({ title, links }: FooterSectionProps) => (
  <div>
    <h3 className="text-white font-semibold mb-4">{title}</h3>
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <FooterLink href={link.href}>{link.label}</FooterLink>
        </li>
      ))}
    </ul>
  </div>
))

FooterSection.displayName = 'FooterSection'

const footerSections = [
  {
    title: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#pricing', label: 'Pricing' },
      { href: '/signup', label: 'Start Free Trial' }
    ]
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/support', label: 'Support' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/security', label: 'Security' }
    ]
  }
]

interface FooterProps {
  className?: string
}

const Footer = React.memo(({ className = '' }: FooterProps) => {
  return (
    <footer className={`bg-gray-900 py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="h-6 w-6 text-teal-500" />
              <span className="ml-2 text-xl font-bold text-white">Booked Barber</span>
            </div>
            <p className="text-gray-400 font-medium">
              Automated payout solutions for modern barbers.
            </p>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <FooterSection key={section.title} {...section} />
          ))}
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-400 font-medium">
            &copy; 2024 Booked Barber. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
})

Footer.displayName = 'Footer'

export default Footer
