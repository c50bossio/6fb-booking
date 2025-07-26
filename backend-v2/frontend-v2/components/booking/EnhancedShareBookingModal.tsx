'use client'

import React from 'react'
import { ModalNavigationProvider, ModalNavigationContent } from '../ui/ModalNavigation'
import { Modal } from '../ui/Modal'
import ShareBookingModal from './ShareBookingModal'
import { useRouter } from 'next/navigation'

interface EnhancedShareBookingModalProps {
  isOpen: boolean
  onClose: () => void
  bookingUrl?: string
  businessName?: string
  services?: any[]
  barbers?: any[]
  subscriptionTier?: 'basic' | 'professional' | 'enterprise'
}

/**
 * Enhanced ShareBookingModal with navigation system
 * 
 * This is a future-ready wrapper that demonstrates how modals can use
 * the navigation system for seamless internal page handling.
 * 
 * Currently delegated to the existing ShareBookingModal for compatibility,
 * but can be enhanced to provide full modal navigation in the future.
 */
const EnhancedShareBookingModal: React.FC<EnhancedShareBookingModalProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  const router = useRouter()

  const handleExternalNavigation = (url: string) => {
    // Handle external navigation by closing modal and navigating
    onClose()
    
    if (url.startsWith('http')) {
      // External URL - open in new tab
      window.open(url, '_blank')
    } else {
      // Internal URL - navigate in same tab
      router.push(url)
    }
  }

  return (
    <ModalNavigationProvider onExternalNavigation={handleExternalNavigation} onClose={onClose}>
      <ShareBookingModal
        isOpen={isOpen}
        onClose={onClose}
        {...props}
      />
    </ModalNavigationProvider>
  )
}

export default EnhancedShareBookingModal