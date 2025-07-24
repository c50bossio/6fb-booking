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
        className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-5 cursor-pointer hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 min-h-[140px] flex flex-col justify-center hover:bg-gradient-to-br hover:from-gray-50 hover:to-white dark:hover:from-gray-700 dark:hover:to-gray-800 hover:border-primary-300 dark:hover:border-primary-400"
        onClick={option.action}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Enhanced Icon with better visual hierarchy */}
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-600/30 flex items-center justify-center group-hover:from-primary-200 group-hover:to-primary-300 dark:group-hover:from-primary-500/30 dark:group-hover:to-primary-600/40 transition-all duration-300 shadow-sm group-hover:shadow-md">
              {isLoading ? (
                <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : isCopied ? (
                <CheckIcon className="w-7 h-7 text-green-500" />
              ) : (
                <Icon className="w-7 h-7 text-primary-600 dark:text-primary-300 group-hover:scale-110 transition-transform duration-300" />
              )}
            </div>
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
          </div>

          {/* Enhanced Content with better typography */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-300">
              {option.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
              {option.description}
            </p>
          </div>

          {/* Enhanced Copy indicator with animation */}
          {isCopied && (
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400 animate-bounce">
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span className="text-xs font-semibold">Copied!</span>
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
      size="4xl"
      position="center"
      variant="default"
      className="max-w-5xl"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <ModalBody className="max-h-[75vh] overflow-y-auto">
        {/* Enhanced Description with better typography */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Choose how you want to share your availability with customers using one of the options below.
          </p>
        </div>

        {/* Improved Share Options Grid with better spacing and responsiveness */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {shareOptions.map(renderOptionCard)}
        </div>

        {/* Enhanced Current booking URL display with premium styling */}
        <div className="mt-10 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 uppercase tracking-wide">
                Current Booking URL
              </p>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 dark:text-primary-300 font-mono hover:text-primary-700 dark:hover:text-primary-200 hover:underline transition-all duration-200 cursor-pointer flex items-center gap-2 group bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-400"
                title="Click to open booking page in new tab"
              >
                <span className="truncate flex-1">{bookingUrl}</span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
              </a>
            </div>
            <button
              onClick={() => copyToClipboard(bookingUrl, 'url-display')}
              className="ml-4 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-white dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-400 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Copy URL to clipboard"
            >
              {copiedOption === 'url-display' ? (
                <CheckIcon className="w-5 h-5 text-green-500" />
              ) : (
                <DocumentDuplicateIcon className="w-5 h-5" />
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
  </>
  )
}

export default ShareBookingModal