'use client'

import { ReactNode, memo } from 'react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/LoadingStates'
import { cn } from '@/lib/utils'

interface ModalLayoutProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  loading?: boolean
  submitDisabled?: boolean
  submitLabel?: string
  onSubmit?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  className?: string
}

export const ModalLayout = memo(function ModalLayout({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  loading = false,
  submitDisabled = false,
  submitLabel = 'Save',
  onSubmit,
  size = '2xl',
  className
}: ModalLayoutProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      variant="default"
      position="center"
      className={cn('max-h-[95vh]', className)}
    >
      <div className="flex flex-col h-full">
        <ModalBody className="flex-1 overflow-y-auto">
          {children}
        </ModalBody>
        
        {(footer || onSubmit) && (
          <ModalFooter>
            {footer || (
              <DefaultFooter
                onClose={onClose}
                onSubmit={onSubmit}
                loading={loading}
                submitDisabled={submitDisabled}
                submitLabel={submitLabel}
              />
            )}
          </ModalFooter>
        )}
      </div>
    </Modal>
  )
})

// Default footer with Cancel and Submit buttons
const DefaultFooter = memo(function DefaultFooter({
  onClose,
  onSubmit,
  loading,
  submitDisabled,
  submitLabel
}: {
  onClose: () => void
  onSubmit?: () => void
  loading: boolean
  submitDisabled: boolean
  submitLabel: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 w-full">
      <Button
        variant="outline"
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </Button>
      
      {onSubmit && (
        <LoadingButton
          onClick={onSubmit}
          loading={loading}
          disabled={submitDisabled}
          className="min-w-[140px]"
        >
          {submitLabel}
        </LoadingButton>
      )}
    </div>
  )
})

// Premium modal layout with gradient header
export const PremiumModalLayout = memo(function PremiumModalLayout({
  isOpen,
  onClose,
  title,
  description,
  icon,
  gradient,
  children,
  footer,
  size = '2xl',
  className
}: ModalLayoutProps & {
  icon?: ReactNode
  gradient?: string
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      variant="premium"
      position="center"
      className={cn('max-h-[95vh]', className)}
    >
      <div className="flex flex-col h-full">
        {/* Premium Header */}
        <div className={cn(
          'relative p-6 border-b border-gray-200 dark:border-gray-700',
          gradient || 'bg-gradient-to-r from-primary-500 to-primary-600'
        )}>
          <div className="flex items-start gap-4">
            {icon && (
              <div className="p-3 rounded-xl bg-white/20 dark:bg-black/20">
                {icon}
              </div>
            )}
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-white/80">
                  {description}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <ModalBody className="flex-1 overflow-y-auto">
          {children}
        </ModalBody>
        
        {footer && (
          <ModalFooter>
            {footer}
          </ModalFooter>
        )}
      </div>
    </Modal>
  )
})