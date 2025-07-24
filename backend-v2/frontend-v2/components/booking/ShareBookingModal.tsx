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
  WrenchScrewdriverIcon,
  BoltIcon,
  ChartBarIcon,
  ArrowTopRightOnSquareIcon,
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

  // Generate embed code
  const generateEmbedCode = () => {
    const embedCode = `<iframe 
  src="${bookingUrl}?embed=true" 
  width="100%" 
  height="600" 
  frameborder="0" 
  title="${businessName} Booking">
</iframe>`
    copyToClipboard(embedCode, 'embed')
  }

  // Generate email content
  const generateEmailContent = () => {
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

  // Share via Web Share API or fallback
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
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(`${shareData.text} - ${shareData.url}`, 'social')
    }
  }

  // Navigate to booking links management page
  const openLinksManager = () => {
    router.push('/marketing/booking-links')
    onClose()
  }

  const shareOptions: ShareOption[] = [
    {
      id: 'set-parameters',
      title: 'Set Appointment Parameters',
      description: 'Configure services, barbers, dates, and constraints',
      icon: WrenchScrewdriverIcon,
      action: () => {
        setCustomizerMode('set-parameters')
        setShowLinkCustomizer(true)
      },
    },
    {
      id: 'get-immediately',
      title: 'Get immediately',
      description: 'Generate a standard booking link right now',
      icon: BoltIcon,
      action: () => {
        setCustomizerMode('quick')
        setShowLinkCustomizer(true)
      },
    },
    {
      id: 'share-link',
      title: 'Copy Booking Link',
      description: 'Instantly copy your booking page URL to clipboard',
      icon: LinkIcon,
      action: () => copyToClipboard(bookingUrl, 'share-link'),
    },
    {
      id: 'embed',
      title: 'Embed',
      description: 'Create HTML code to embed on your website',
      icon: CodeBracketIcon,
      action: generateEmbedCode,
    },
    {
      id: 'qr-code',
      title: 'QR Code',
      description: 'Generate a QR code for easy mobile access',
      icon: QrCodeIcon,
      action: generateQRCode,
    },
    {
      id: 'email',
      title: 'Email',
      description: 'Pre-written email content ready to send',
      icon: EnvelopeIcon,
      action: generateEmailContent,
    },
    {
      id: 'social',
      title: 'Social Media',
      description: 'Share directly to social platforms',
      icon: ShareIcon,
      action: shareViaSocial,
    },
    {
      id: 'manage-links',
      title: 'Manage All Links & QR Codes',
      description: 'Open the full links and QR codes management dashboard',
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
        className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={option.action}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Icon */}
          <div className="relative">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-500/30 transition-colors duration-200">
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : isCopied ? (
                <CheckIcon className="w-6 h-6 text-green-500" />
              ) : (
                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-300" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {option.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {option.description}
            </p>
          </div>

          {/* Copy indicator */}
          {isCopied && (
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Copied!</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
    {/* Custom positioned modal with working click-outside-to-close */}
    {isOpen && (
      <div 
        className="fixed inset-0 flex items-start justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[2147483647] p-4 pt-24"
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Share Booking
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Description */}
            <div className="mb-8">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Choose a way in which you want to share your availability with the customers using one of the options below.
              </p>
            </div>

            {/* Share Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {shareOptions.map(renderOptionCard)}
            </div>

            {/* Current booking URL display */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Current Booking URL
                  </p>
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 dark:text-primary-300 font-mono hover:text-primary-700 dark:hover:text-primary-200 hover:underline transition-colors duration-200 cursor-pointer flex items-center gap-2 group"
                    title="Click to open booking page in new tab"
                  >
                    <span className="truncate flex-1">{bookingUrl}</span>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
                  </a>
                </div>
                <button
                  onClick={() => copyToClipboard(bookingUrl, 'url-display')}
                  className="ml-3 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  title="Copy URL"
                >
                  {copiedOption === 'url-display' ? (
                    <CheckIcon className="w-4 h-4 text-success-500" />
                  ) : (
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

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
  </>
  )
}

export default ShareBookingModal