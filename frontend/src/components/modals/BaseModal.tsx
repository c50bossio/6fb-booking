'use client'

import { Fragment, ReactNode, useEffect, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'
  showCloseButton?: boolean
  className?: string
  overlayClassName?: string
  panelClassName?: string
  closeOnOverlayClick?: boolean
  preventScroll?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm mx-4 sm:mx-auto',
  md: 'max-w-md mx-4 sm:mx-auto',
  lg: 'max-w-lg mx-4 sm:mx-auto',
  xl: 'max-w-xl mx-4 sm:mx-auto',
  '2xl': 'max-w-2xl mx-4 sm:mx-auto',
  '3xl': 'max-w-3xl mx-4 sm:mx-auto',
  '4xl': 'max-w-4xl mx-4 sm:mx-auto',
  full: 'max-w-full mx-4'
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  showCloseButton = true,
  className = '',
  overlayClassName = '',
  panelClassName = '',
  closeOnOverlayClick = true,
  preventScroll = true
}: BaseModalProps) {
  const initialFocusRef = useRef(null)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!preventScroll) return

    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, preventScroll])

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onClose}
        initialFocus={initialFocusRef}
      >
        {/* Backdrop with blur effect */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${overlayClassName}`}
            onClick={handleOverlayClick}
          />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel
                className={`
                  w-full ${sizeClasses[size]} transform overflow-hidden
                  rounded-2xl bg-white dark:bg-[#1A1B23] text-left align-middle transition-all
                  border border-gray-200 dark:border-[#2C2D3A]
                  shadow-2xl dark:shadow-2xl
                  ${panelClassName}
                  ${className}
                `}
                ref={initialFocusRef}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#2C2D3A]">
                    {title && (
                      <Dialog.Title
                        as="h3"
                        className="text-xl font-semibold leading-6 text-gray-900 dark:text-[#FFFFFF]"
                      >
                        {title}
                      </Dialog.Title>
                    )}

                    {showCloseButton && (
                      <button
                        type="button"
                        className="rounded-lg p-2 min-h-[44px] min-w-[44px] text-gray-400 dark:text-[#8B92A5] hover:text-gray-600 dark:hover:text-[#FFFFFF] hover:bg-gray-100 dark:hover:bg-[#24252E] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#20D9D2]/20"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="px-4 sm:px-6 py-4">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
