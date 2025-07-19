'use client'

import React, { useState } from 'react'
import { Modal, ModalBody } from '../ui/Modal'
import { Card } from '@/components/ui/card'
import LinkCustomizer from './LinkCustomizer'
import { useToast } from '@/hooks/use-toast'
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
  const { toast } = useToast()
  const [copiedOption, setCopiedOption] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [showLinkCustomizer, setShowLinkCustomizer] = useState(false)
  const [customizerMode, setCustomizerMode] = useState<'set-parameters' | 'quick'>('set-parameters')

  // Generate QR Code (placeholder implementation)
  const generateQRCode = async () => {
    setIsGenerating('qr-code')
    // In a real implementation, this would generate a QR code
    setTimeout(() => {
      setIsGenerating(null)
      // Show QR code modal or download
      toast({
        title: "QR Code Ready",
        description: 'QR Code generated! (This would show the actual QR code in production)',
      })
    }, 1500)
  }

  // Copy to clipboard utility
  const copyToClipboard = async (text: string, optionId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedOption(optionId)
      setTimeout(() => setCopiedOption(null), 2000)
    } catch (err) {
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
        }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(`${shareData.text} - ${shareData.url}`, 'social')
    }
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
      title: 'Share Link',
      description: 'Copy the current booking page link',
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
  ]

  const renderOptionCard = (option: ShareOption) => {
    const Icon = option.icon
    const isCopied = copiedOption === option.id
    const isLoading = isGenerating === option.id

    return (
      <Card
        key={option.id}
        variant="elevated"
        padding="md"
        interactive
        className="group cursor-pointer hover:shadow-ios-lg hover:scale-[1.02] transition-all duration-200"
        onClick={option.action}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Icon */}
          <div className="relative">
            <div className="w-12 h-12 rounded-ios-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50 transition-colors duration-200">
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : isCopied ? (
                <CheckIcon className="w-6 h-6 text-success-500" />
              ) : (
                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            
          </div>

          {/* Content */}
          <div className="space-y-1">
            <h3 className="text-ios-headline font-semibold text-accent-900 dark:text-white">
              {option.title}
            </h3>
            <p className="text-ios-footnote text-ios-gray-600 dark:text-ios-gray-400 leading-relaxed">
              {option.description}
            </p>
          </div>

          {/* Copy indicator */}
          {isCopied && (
            <div className="flex items-center space-x-1 text-success-600 dark:text-success-400">
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span className="text-ios-caption1 font-medium">Copied!</span>
            </div>
          )}
        </div>
      </Card>
    )
  }

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Booking"
      size="lg"
      position="center"
      variant="default"
      className="max-w-2xl"
    >
      <ModalBody className="pb-8">
        {/* Description */}
        <div className="mb-8">
          <p className="text-ios-body text-ios-gray-600 dark:text-ios-gray-400 leading-relaxed">
            Choose a way in which you want to share your availability with the customers using one of the options below.
          </p>
        </div>

        {/* Share Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shareOptions.map(renderOptionCard)}
        </div>

        {/* Current booking URL display */}
        <div className="mt-8 p-4 bg-ios-gray-50 dark:bg-dark-surface-100 rounded-ios-lg border border-ios-gray-200 dark:border-ios-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-ios-caption1 font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-1">
                Current Booking URL
              </p>
              <code className="text-ios-footnote text-primary-600 dark:text-primary-400 font-mono truncate block">
                {bookingUrl}
              </code>
            </div>
            <button
              onClick={() => copyToClipboard(bookingUrl, 'url-display')}
              className="ml-3 p-2 rounded-ios text-ios-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-ios-gray-100 dark:hover:bg-ios-gray-800 transition-colors duration-200"
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