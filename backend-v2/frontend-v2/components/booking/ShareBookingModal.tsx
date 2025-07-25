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
} from '@heroicons/react/24/outline'

interface ShareBookingModalProps {
  isOpen: boolean
  onClose: () => void
  bookingUrl?: string
  businessName?: string
  services?: any[]
  barbers?: any[]
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
  barbers = []
}) => {
  const router = useRouter()
  const [copiedOption, setCopiedOption] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [showLinkCustomizer, setShowLinkCustomizer] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [customizerMode, setCustomizerMode] = useState<'set-parameters' | 'quick'>('set-parameters')

  // Open QR Code Generator Modal
  const generateQRCode = () => {
    setShowQRGenerator(true)
  }

  // Copy to clipboard utility
  const copyToClipboard = async (text: string, optionId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedOption(optionId)
      setTimeout(() => setCopiedOption(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Navigate to embed page or copy embed code (quick action)
  const handleEmbedAction = (mode: 'navigate' | 'quick' = 'quick') => {
    if (mode === 'navigate') {
      router.push('/embed')
      onClose()
    } else {
      // Quick action: generate and copy embed code
      const embedCode = `<iframe 
  src="${bookingUrl}?embed=true" 
  width="100%" 
  height="600" 
  frameborder="0" 
  title="${businessName} Booking">
</iframe>`
      copyToClipboard(embedCode, 'embed')
    }
  }

  // Navigate to email campaigns or copy email content (quick action)
  const handleEmailAction = (mode: 'navigate' | 'quick' = 'quick') => {
    if (mode === 'navigate') {
      router.push('/marketing/campaigns')
      onClose()
    } else {
      // Quick action: generate and copy email content
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
  }

  // Comprehensive share handler
  const handleShareAction = () => {
    setShowShareMenu(true)
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
    setShowShareMenu(false)
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
    setShowShareMenu(false)
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
    setShowShareMenu(false)
  }

  // Navigate to booking links management page
  const openLinksManager = () => {
    router.push('/marketing/booking-links')
    onClose()
  }

  // Simplified share options - only essential actions
  const shareOptions: ShareOption[] = [
    {
      id: 'copy-link',
      title: 'Copy Link',
      description: 'Copy your booking URL to clipboard',
      icon: LinkIcon,
      action: () => copyToClipboard(bookingUrl, 'copy-link'),
    },
    {
      id: 'qr-code',
      title: 'QR Code',
      description: 'Generate QR code for mobile scanning',
      icon: QrCodeIcon,
      action: generateQRCode,
    },
    {
      id: 'customize',
      title: 'Customize Link',
      description: 'Set specific services, dates, or barbers',
      icon: CogIcon,
      action: () => {
        setCustomizerMode('set-parameters')
        setShowLinkCustomizer(true)
      },
    },
    {
      id: 'share',
      title: 'Share',
      description: 'Email, social media, or embed on website',
      icon: ShareIcon,
      action: handleShareAction,
    },
    {
      id: 'manage',
      title: 'Manage Links',
      description: 'View all links and analytics',
      icon: ChartBarIcon,
      action: openLinksManager,
    },
  ]

  const renderOptionCard = (option: ShareOption) => {
    const Icon = option.icon
    const isCopied = copiedOption === option.id
    const isLoading = isGenerating === option.id

    return (
      <div
        key={option.id}
        className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary-400 dark:hover:border-primary-500 transition-all duration-200 ease-out h-[90px] flex flex-col justify-center transform-gpu"
        onClick={option.action}
      >
        <div className="flex items-center space-x-3">
          {/* Clean icon design */}
          <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors duration-200 flex-shrink-0">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            ) : isCopied ? (
              <CheckIcon className="w-5 h-5 text-green-500" />
            ) : (
              <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-200">
              {option.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {option.description}
            </p>
          </div>

          {/* Copy indicator */}
          {isCopied && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <CheckIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
    {/* Standardized Modal with improved UI and reliable click-outside behavior */}
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Booking"
      size="2xl"
      position="center"
      variant="default"
      closeOnOverlayClick={true}
      closeOnEscape={true}
      adaptivePositioning={true}
      zIndex={10000}
      className="max-w-lg sm:max-w-xl mx-4 sm:mx-6"
    >
      <ModalBody className="p-4 sm:p-6">

        {/* Share Options - Single column for clarity */}
        <div className="space-y-3 max-w-md mx-auto">
          {shareOptions.map(renderOptionCard)}
        </div>

        {/* Current booking URL - Compact display */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Your booking URL
              </p>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
                {bookingUrl}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(bookingUrl, 'url-display')}
              className="ml-3 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              title="Copy URL"
            >
              {copiedOption === 'url-display' ? (
                <CheckIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
            </button>
          </div>
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

    {/* QR Code Generator Modal */}
    {showQRGenerator && (
      <Modal
        isOpen={showQRGenerator}
        onClose={() => setShowQRGenerator(false)}
        title="QR Code Generator"
        size="lg"
        position="center"
        variant="default"
        className="max-w-2xl"
      >
        <ModalBody className="pb-8">
          <QRCodeGenerator
            bookingUrl={bookingUrl}
            title={`${businessName} Booking QR Code`}
            description="Scan this QR code to book an appointment"
            defaultSize="medium"
            showSizeSelector={true}
            showDownloadButton={true}
            showShareButton={true}
            showCopyButton={true}
          />
        </ModalBody>
      </Modal>
    )}

    {/* Share Options Modal */}
    {showShareMenu && (
      <Modal
        isOpen={showShareMenu}
        onClose={() => setShowShareMenu(false)}
        title="Share Your Booking Link"
        size="sm"
        position="center"
        variant="default"
      >
        <ModalBody className="p-4">
          <div className="space-y-3">
            <button
              onClick={shareViaEmail}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <EnvelopeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">Email</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Copy email template with link</p>
              </div>
            </button>

            <button
              onClick={shareViaSocial}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <ShareIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">Social Media</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Share on social platforms</p>
              </div>
            </button>

            <button
              onClick={shareViaEmbed}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <CodeBracketIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">Embed Code</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Get HTML code for websites</p>
              </div>
            </button>
          </div>
        </ModalBody>
      </Modal>
    )}
  </>
  )
}

export default ShareBookingModal