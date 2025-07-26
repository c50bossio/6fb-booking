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

import React, { useState } from 'react'
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
  LinkIcon,
  CodeBracketIcon,
  QrCodeIcon,
  EnvelopeIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  CogIcon,
  ChartBarIcon,
  ClipboardDocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CalendarIcon,
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
  const [customLinkName, setCustomLinkName] = useState('')
  const [linkExpiration, setLinkExpiration] = useState<string>('')
  const [enableExpiration, setEnableExpiration] = useState(false)
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
      
      // Save to recent links if it's a custom link
      if (customLinkName) {
        saveToRecentLinks(text, customLinkName)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Generate custom URL with proper logic
  const getCustomUrl = () => {
    let url = bookingUrl
    
    // If custom link name is provided, append it as a parameter
    if (customLinkName.trim()) {
      const separator = url.includes('?') ? '&' : '?'
      const cleanName = customLinkName.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
      url = `${url}${separator}ref=${cleanName}`
    }
    
    // If expiration is enabled and date is set, add expiration parameter
    if (enableExpiration && linkExpiration) {
      const separator = url.includes('?') ? '&' : '?'
      const expiryTimestamp = new Date(linkExpiration).getTime()
      url = `${url}${separator}expires=${expiryTimestamp}`
    }
    
    return url
  }

  // Check if link is expired
  const isLinkExpired = () => {
    if (!enableExpiration || !linkExpiration) return false
    const expiryDate = new Date(linkExpiration)
    const now = new Date()
    return now > expiryDate
  }

  // Get expiration status display
  const getExpirationStatus = () => {
    if (!enableExpiration || !linkExpiration) return null
    
    const expiryDate = new Date(linkExpiration)
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffTime < 0) {
      return { type: 'expired', message: 'Link expired', class: 'text-red-600 dark:text-red-400' }
    } else if (diffDays <= 1) {
      return { type: 'expiring', message: 'Expires today', class: 'text-amber-600 dark:text-amber-400' }
    } else if (diffDays <= 3) {
      return { type: 'expiring', message: `Expires in ${diffDays} days`, class: 'text-amber-600 dark:text-amber-400' }
    } else {
      return { type: 'valid', message: `Expires ${expiryDate.toLocaleDateString()}`, class: 'text-green-600 dark:text-green-400' }
    }
  }

  // Save to recent links (localStorage)
  const saveToRecentLinks = (url: string, name: string) => {
    const recent = getRecentLinks()
    const newLink = { 
      url, 
      name, 
      date: new Date().toISOString(),
      customName: customLinkName || null,
      expirationDate: enableExpiration && linkExpiration ? linkExpiration : null
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
      {/* Primary Actions */}
      <div className="space-y-4">
        {/* Enhanced Booking Link Section */}
        <div className="space-y-4">
          {/* Custom Link Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom link name (optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={customLinkName}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow alphanumeric characters and hyphens
                  const sanitized = value.replace(/[^a-zA-Z0-9-\s]/g, '').substring(0, 50)
                  setCustomLinkName(sanitized)
                }}
                placeholder="e.g., summer-special, downtown-location"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {customLinkName.length > 40 && (
                <div className="absolute right-2 top-2 text-xs text-amber-600 dark:text-amber-400">
                  {customLinkName.length}/50
                </div>
              )}
            </div>
            {customLinkName.trim() && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Preview: {getCustomUrl()}
              </p>
            )}
          </div>

          {/* Link Expiration */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enableExpiration}
                onChange={(e) => setEnableExpiration(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Set expiration date</span>
            </label>
            {enableExpiration && (
              <div className="flex-1">
                <input
                  type="date"
                  value={linkExpiration}
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                  onChange={(e) => setLinkExpiration(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {linkExpiration && new Date(linkExpiration) < new Date() && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Expiration date cannot be in the past
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Main Link Display with Actions */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Your booking link
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                {shareCount > 0 && <span>Shared {shareCount} times</span>}
                {customLinkName.trim() && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                    Custom: {customLinkName}
                  </span>
                )}
                {getExpirationStatus() && (
                  <span className={`flex items-center space-x-1 ${getExpirationStatus()?.class}`}>
                    <CalendarIcon className="w-3 h-3" />
                    <span>{getExpirationStatus()?.message}</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex-1 min-w-0">
                <a
                  href={getCustomUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 truncate block underline decoration-dotted underline-offset-2 transition-colors duration-200"
                  title={getCustomUrl()}
                >
                  {getCustomUrl()}
                </a>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-1">
                {/* Quick QR Button */}
                <button
                  onClick={() => setShowQuickQR(true)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                  title="Quick QR code"
                >
                  <QrCodeIcon className="w-4 h-4" />
                </button>

                {/* Copy Button */}
                <button
                  onClick={() => copyToClipboard(getCustomUrl(), 'copy-link')}
                  disabled={isLinkExpired()}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isLinkExpired() 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                  title={isLinkExpired() ? "Link has expired" : "Copy URL"}
                >
                  {isLinkExpired() ? (
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Expired</span>
                    </div>
                  ) : copiedOption === 'copy-link' ? (
                    <div className="flex items-center space-x-1">
                      <CheckIcon className="w-4 h-4" />
                      <span>Copied!</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      <span>Copy</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

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
        </div>

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
      </div>

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