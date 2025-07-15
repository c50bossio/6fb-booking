'use client'

import React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  ExternalLink
} from 'lucide-react'

interface FooterProps {
  variant?: 'default' | 'minimal'
  showSocial?: boolean
  className?: string
}

const Footer: React.FC<FooterProps> = ({ 
  variant = 'default', 
  showSocial = true,
  className = ''
}) => {
  const currentYear = new Date().getFullYear()

  if (variant === 'minimal') {
    return (
      <footer className={`bg-gray-900 text-white py-8 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-sm text-gray-400">
              © {currentYear} BookedBarber. All rights reserved.
            </div>

            {/* Legal Links */}
            <div className="flex gap-6 text-sm">
              <Link 
                href="/privacy" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link 
                href="/cookies" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className={`bg-gray-900 text-white ${className}`}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-2">BookedBarber</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                The ultimate booking and business management platform for barbershops. 
                Own the chair. Own the brand.
              </p>
            </div>
            
            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="h-4 w-4" />
                <a 
                  href="mailto:support@bookedbarber.com" 
                  className="hover:text-white transition-colors"
                >
                  support@bookedbarber.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="h-4 w-4" />
                <a 
                  href="tel:+1-555-0123" 
                  className="hover:text-white transition-colors"
                >
                  +1 (555) 012-3456
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>123 Business St, Suite 100<br />Your City, ST 12345</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Product</h3>
            <nav className="space-y-2">
              <Link 
                href="/features" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Features
              </Link>
              <Link 
                href="/pricing" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Pricing
              </Link>
              <Link 
                href="/integrations" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Integrations
              </Link>
              <Link 
                href="/api" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                API Docs
              </Link>
              <Link 
                href="/security" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Security
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Resources</h4>
            <nav className="space-y-2">
              <Link 
                href="/help" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Help Center
              </Link>
              <Link 
                href="/blog" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Blog
              </Link>
              <Link 
                href="/tutorials" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Tutorials
              </Link>
              <Link 
                href="/webinars" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Webinars
              </Link>
              <Link 
                href="/case-studies" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Case Studies
              </Link>
              <Link 
                href="/status" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                System Status
                <ExternalLink className="h-3 w-3 inline ml-1" />
              </Link>
            </nav>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Company</h4>
            <nav className="space-y-2">
              <Link 
                href="/about" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                About Us
              </Link>
              <Link 
                href="/careers" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Careers
              </Link>
              <Link 
                href="/press" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Press Kit
              </Link>
              <Link 
                href="/partners" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Partners
              </Link>
              <Link 
                href="/contact" 
                className="block text-gray-400 hover:text-white transition-colors text-sm"
              >
                Contact
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Legal Links */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-sm">
              <Link 
                href="/privacy" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link 
                href="/cookies" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cookie Policy
              </Link>
              <Link 
                href="/accessibility" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Accessibility
              </Link>
              <Link 
                href="/sitemap" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Sitemap
              </Link>
            </div>

            {/* Social Links */}
            {showSocial && (
              <div className="flex gap-4">
                <a
                  href="https://facebook.com/bookedbarber"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Follow us on Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com/bookedbarber"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Follow us on Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com/bookedbarber"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://linkedin.com/company/bookedbarber"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Follow us on LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            )}

            {/* Copyright */}
            <div className="text-sm text-gray-400 order-first lg:order-last">
              © {currentYear} BookedBarber. All rights reserved.
            </div>
          </div>

          {/* Compliance Statement */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center lg:text-left">
              BookedBarber is committed to protecting your privacy and ensuring GDPR, CCPA, and other 
              applicable privacy law compliance. We use cookies and similar technologies to enhance your 
              experience. You can manage your preferences in our{' '}
              <Link href="/cookies" className="text-gray-400 hover:text-white underline">
                Cookie Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer