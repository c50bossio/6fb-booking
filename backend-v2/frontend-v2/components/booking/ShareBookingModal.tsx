'use client'

/**
 * ShareBookingModal - Comprehensive booking link sharing interface
 * 
 * MODAL BEHAVIOR:
 * ✅ Click outside modal → closes automatically (global default)
 * ✅ Press ESC key → closes automatically (global default)
 * ✅ All 8 sharing options visible with scroll support
 * ✅ Responsive grid layout: 1 col mobile, 2 col tablet, 4 col desktop
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, ModalBody } from '../ui/Modal'
import { Card } from '@/components/ui/card'
import LinkCustomizer from './LinkCustomizer'
import QRCodeGenerator from './QRCodeGenerator'
import { 
  ModalNavigationProvider, 
  ModalNavigationContent, 
  useModalPageNavigation,
  type ModalPageType 
} from '../ui/ModalNavigation'
import {
  CodeBracketIcon,
  QrCodeIcon,
  EnvelopeIcon,
  ShareIcon,
  CheckIcon,
  CogIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

type SubscriptionTier = 'basic' | 'professional' | 'enterprise'

interface ShareBookingModalProps {
  isOpen: boolean
  onClose: () => void
  bookingUrl?: string
  businessName?: string
  services?: any[]
  barbers?: any[]
  subscriptionTier?: SubscriptionTier
}

interface ShareOption {
  id: string
  title: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  action: () => void
  disabled?: boolean
}

const ShareBookingModal: React.FC<ShareBookingModalProps> = ({
  isOpen,
  onClose,
  bookingUrl = 'https://book.6fb.com/your-business',
  businessName = 'Your Business',
  services = [],
  barbers = [],
  subscriptionTier = 'basic'
}) => {
  const router = useRouter()
  const [copiedOption, setCopiedOption] = useState<string | null>(null)
  const [showLinkCustomizer, setShowLinkCustomizer] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [showShareMethods, setShowShareMethods] = useState(false)
  const [showQuickQR, setShowQuickQR] = useState(false)
  const [shareCount, setShareCount] = useState(0)
  const [showRecentLinks, setShowRecentLinks] = useState(false)
  const [customizerMode, setCustomizerMode] = useState<'set-parameters' | 'quick'>('set-parameters')


  // Feature availability - all features are now free
  const features = {
    qrCode: true, // Available to all
    customizeLink: true, // Available to all
    emailTemplate: true, // Available to all
    socialShare: true, // Available to all
    embedCode: true, // Available to all
    analytics: true, // Available to all
    customLinkName: true, // Available to all
    linkExpiration: true, // Available to all
    recentLinks: true, // Available to all
  }

  // Toggle QR Code section
  const toggleQRCode = () => {
    setShowQRCode(!showQRCode)
  }

  // Copy to clipboard utility
  const copyToClipboard = async (text: string, optionId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedOption(optionId)
      setShareCount(prev => prev + 1) // Increment share count
      setTimeout(() => setCopiedOption(null), 2000)
      
      // Note: Custom link creation moved to dedicated /marketing/links page
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Get current URL (simplified - just return the booking URL)
  const getCustomUrl = () => bookingUrl

  // Save to recent links (localStorage)
  const saveToRecentLinks = (url: string, name: string) => {
    const recent = getRecentLinks()
    const newLink = { 
      url, 
      name, 
      date: new Date().toISOString(),
      customName: customLinkName || null,
      expirationDate: enableExpiration && linkExpiration ? linkExpiration : null,
      isShortUrl: urlIsShort,
      businessName: businessName
    }
    const updated = [newLink, ...recent.filter(r => r.name !== name)].slice(0, 5)
    localStorage.setItem('recentBookingLinks', JSON.stringify(updated))
  }

  // Get recent links from localStorage
  const getRecentLinks = () => {
    try {
      const stored = localStorage.getItem('recentBookingLinks')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }


  // Toggle share methods section
  const toggleShareMethods = () => {
    setShowShareMethods(!showShareMethods)
  }


  // Share via different methods
  const shareViaEmail = () => {
    const emailContent = `Subject: Book Your Appointment with ${businessName}

Hi there!

I'd love to schedule an appointment with you. You can easily book online using the link below:

${bookingUrl}

Choose from available time slots that work best for your schedule.

Looking forward to seeing you soon!

Best regards,
${businessName}`
    
    copyToClipboard(emailContent, 'email')
  }

  const shareViaSocial = async () => {
    const shareData = {
      title: `Book with ${businessName}`,
      text: `Schedule your appointment with ${businessName}`,
      url: bookingUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
      }
    } else {
      copyToClipboard(`${shareData.text} - ${shareData.url}`, 'social')
    }
  }

  const shareViaEmbed = () => {
    const embedCode = `<iframe 
  src="${bookingUrl}?embed=true" 
  width="100%" 
  height="600" 
  frameborder="0" 
  title="${businessName} Booking">
</iframe>`
    copyToClipboard(embedCode, 'embed')
  }

  // Smart navigation handler for modal links
  const handleModalNavigation = (url: string, isInternal: boolean = true) => {
    if (isInternal) {
      // Keep internal pages within the modal system
      // For now, we use the existing modal-within-modal approach
      // In a future enhancement, this could be replaced with full navigation system
      return
    } else {
      // External/public pages should close modal and navigate
      onClose()
      router.push(url)
    }
  }

  // Check if a URL should be treated as internal (stays in modal) or external
  const isInternalPage = (url: string): boolean => {
    const internalPaths = [
      '/dashboard',
      '/calendar', 
      '/bookings',
      '/settings',
      '/analytics',
      '/marketing'
    ]
    
    const publicPaths = [
      '/register',
      '/login',
      '/public',
      '/booking', // Client booking pages
      'http', // External URLs
      'https'
    ]

    // Check if it's a public/external URL
    if (publicPaths.some(path => url.includes(path))) {
      return false
    }

    // Check if it's an internal path
    if (internalPaths.some(path => url.includes(path))) {
      return true
    }

    // Default: treat as internal if it's a relative path
    return !url.startsWith('http')
  }


  // Render the new hierarchical structure
  const renderContent = () => (
    <div className="space-y-6">
      {/* Primary Action - Booking Link Display */}
      <div className="space-y-4">
        {/* Simplified Link Display */}
        <div className="space-y-3">
            {/* Link Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Your Booking Link
                </h3>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                {shareCount > 0 && <span>Shared {shareCount} times</span>}
              </div>
            </div>

            {/* Link Display Card */}
            <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 min-w-0">
                    <a
                      href={getCustomUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-mono font-medium truncate block hover:underline transition-colors duration-200 text-gray-700 dark:text-gray-300"
                      title={getCustomUrl()}
                    >
                      {getCustomUrl()}
                    </a>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {/* Quick QR Button */}
                    <button
                      onClick={() => setShowQuickQR(true)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                      title="Quick QR code"
                    >
                      <QrCodeIcon className="w-5 h-5" />
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() => copyToClipboard(getCustomUrl(), 'copy-link')}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
                      title="Copy link to clipboard"
                    >
                      {copiedOption === 'copy-link' ? (
                        <div className="flex items-center space-x-1">
                          <CheckIcon className="w-4 h-4" />
                          <span>Copied!</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <ClipboardDocumentIcon className="w-4 h-4" />
                          <span>Copy Link</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status Message */}
                <div className="flex items-center space-x-2 text-sm">
                  <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                    <span>Secure booking URL ready to share</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Custom Link - Navigate to dedicated page */}
        <button
          onClick={() => {
            onClose()
            router.push('/marketing/booking-links')
          }}
          className="w-full flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 group"
        >
          <CogIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-300" />
          <div className="text-left flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-300">Create Custom Link</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Branded links, expiration dates, analytics & QR codes</p>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-300" />
        </button>

        {/* Recent Links Dropdown */}
        {getRecentLinks().length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowRecentLinks(!showRecentLinks)}
                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                <span>Recent links ({getRecentLinks().length})</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${showRecentLinks ? 'rotate-180' : ''}`} />
              </button>
              
              {showRecentLinks && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  <div className="space-y-2">
                    {getRecentLinks().map((link: any, index: number) => {
                      const isExpired = link.expirationDate && new Date(link.expirationDate) < new Date()
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {link.customName || link.name}
                              </p>
                              {link.isShortUrl && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  Short
                                </span>
                              )}
                              {link.expirationDate && (
                                <span className={`px-1.5 py-0.5 text-xs rounded ${
                                  isExpired 
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                }`}>
                                  {isExpired ? 'Expired' : 'Active'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{link.url}</p>
                            {link.expirationDate && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Expires: {new Date(link.expirationDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(link.url, `recent-${index}`)}
                            disabled={isExpired}
                            className={`ml-2 p-1 rounded ${
                              isExpired 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            title={isExpired ? 'Link expired' : 'Copy link'}
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
        )}

      {/* QR Code - Collapsible */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
        <button
          onClick={toggleQRCode}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <QrCodeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Generate QR Code</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">For mobile scanning and printing</p>
            </div>
          </div>
          <ChevronRightIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showQRCode ? 'rotate-90' : ''}`} />
        </button>
        
        {showQRCode && (
          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
            <div className="pt-4">
              <QRCodeGenerator
                bookingUrl={bookingUrl}
                title={`${businessName} Booking QR Code`}
                description="Scan this QR code to book an appointment"
                defaultSize="small"
                showSizeSelector={true}
                showColorSelector={true}
                showDownloadButton={true}
                showShareButton={false}
                showCopyButton={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Customize Link - Primary action */}
      <button
        onClick={() => {
          setCustomizerMode('set-parameters')
          setShowLinkCustomizer(true)
        }}
        className="w-full flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
      >
        <CogIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <div className="text-left">
          <p className="font-medium text-gray-900 dark:text-gray-100">Customize Link</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Set specific services, dates, or barbers</p>
        </div>
      </button>

      {/* Secondary Actions - Collapsible Share Methods */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
        <button
          onClick={toggleShareMethods}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <ShareIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Share Methods</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email, social media, or embed options</p>
            </div>
          </div>
          <ChevronRightIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showShareMethods ? 'rotate-90' : ''}`} />
        </button>
        
        {showShareMethods && (
          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
            <div className="pt-4 space-y-3">
              {/* Email Template */}
              <button
                onClick={shareViaEmail}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <EnvelopeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Email Template</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Copy email with booking link</p>
                </div>
              </button>

              {/* Social Media */}
              <button
                onClick={shareViaSocial}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <ShareIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Social Media</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Share on social platforms</p>
                </div>
              </button>

              {/* Embed Code */}
              <button
                onClick={shareViaEmbed}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <CodeBracketIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Embed Code</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">HTML for websites</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tertiary Actions - Text links */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            const url = '/marketing/booking-links'
            if (isInternalPage(url)) {
              // Internal page - keep user in the app but close modal for full page view
              onClose()
              router.push(url)
            } else {
              // External page - close modal and navigate
              handleModalNavigation(url, false)
            }
          }}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors duration-200"
        >
          View detailed analytics & manage all links →
        </button>
      </div>
    </div>
  )

  return (
    <>
    {/* Standardized Modal with improved UI and reliable click-outside behavior */}
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Booking"
      size="2xl"
      position="top"
      variant="default"
      closeOnOverlayClick={true}
      closeOnEscape={true}
      adaptivePositioning={true}
      zIndex={50}
      className="max-w-lg sm:max-w-xl mx-4 sm:mx-6"
      overlayClassName="cursor-pointer"
    >
      <ModalBody className="p-4 sm:p-6">
        {renderContent()}
      </ModalBody>
    </Modal>

    {/* Quick QR Code Modal */}
    <Modal
      isOpen={showQuickQR}
      onClose={() => setShowQuickQR(false)}
      title="Quick QR Code"
      size="sm"
      position="center"
      variant="default"
      closeOnOverlayClick={true}
      closeOnEscape={true}
      zIndex={60}
      className="max-w-sm mx-4"
    >
      <ModalBody className="p-4">
        <div className="text-center">
          <QRCodeGenerator
            bookingUrl={getCustomUrl()}
            title="Quick QR Code"
            description="Scan to book appointment"
            defaultSize="small"
            showSizeSelector={false}
            showDownloadButton={true}
            showShareButton={false}
            showCopyButton={false}
            className="border-0 p-0 bg-transparent"
          />
        </div>
      </ModalBody>
    </Modal>

    {/* Link Customizer Modal */}
    <LinkCustomizer
      isOpen={showLinkCustomizer}
      onClose={() => setShowLinkCustomizer(false)}
      onBack={() => setShowLinkCustomizer(false)}
      businessName={businessName}
      services={services}
      barbers={barbers}
      mode={customizerMode}
    />

  </>
  )
}

export default ShareBookingModal