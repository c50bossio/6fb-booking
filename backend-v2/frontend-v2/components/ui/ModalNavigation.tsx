'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

// Define page types
export type ModalPageType = 'internal' | 'public' | 'external'

export interface ModalPage {
  id: string
  title: string
  component: React.ComponentType<any>
  props?: any
  type: ModalPageType
  canNavigateBack?: boolean
}

export interface ModalNavigationState {
  pages: ModalPage[]
  currentPageIndex: number
  isNavigating: boolean
}

export interface ModalNavigationContextType {
  state: ModalNavigationState
  navigateTo: (page: ModalPage) => void
  navigateBack: () => void
  canGoBack: boolean
  getCurrentPage: () => ModalPage | null
  reset: () => void
  setNavigating: (navigating: boolean) => void
}

const ModalNavigationContext = createContext<ModalNavigationContextType | null>(null)

interface ModalNavigationProviderProps {
  children: React.ReactNode
  initialPage?: ModalPage
  onExternalNavigation?: (url: string) => void
  onClose?: () => void
}

export function ModalNavigationProvider({ 
  children, 
  initialPage,
  onExternalNavigation,
  onClose 
}: ModalNavigationProviderProps) {
  const [state, setState] = useState<ModalNavigationState>({
    pages: initialPage ? [initialPage] : [],
    currentPageIndex: 0,
    isNavigating: false
  })

  const navigateTo = useCallback((page: ModalPage) => {
    // Handle external pages by closing modal and navigating outside
    if (page.type === 'external' || page.type === 'public') {
      if (onExternalNavigation) {
        onExternalNavigation(page.id) // page.id should be the URL for external pages
      } else {
        // Fallback: open in new window
        window.open(page.id, '_blank')
      }
      return
    }

    // Handle internal pages by adding to navigation stack
    setState(prev => ({
      ...prev,
      pages: [...prev.pages, page],
      currentPageIndex: prev.pages.length,
      isNavigating: true
    }))

    // Reset navigating state after animation
    setTimeout(() => {
      setState(prev => ({ ...prev, isNavigating: false }))
    }, 300)
  }, [onExternalNavigation])

  const navigateBack = useCallback(() => {
    setState(prev => {
      if (prev.currentPageIndex > 0) {
        return {
          ...prev,
          currentPageIndex: prev.currentPageIndex - 1,
          isNavigating: true
        }
      }
      return prev
    })

    // Reset navigating state after animation
    setTimeout(() => {
      setState(prev => ({ ...prev, isNavigating: false }))
    }, 300)
  }, [])

  const canGoBack = state.currentPageIndex > 0 && 
    (state.pages[state.currentPageIndex]?.canNavigateBack !== false)

  const getCurrentPage = useCallback(() => {
    return state.pages[state.currentPageIndex] || null
  }, [state.pages, state.currentPageIndex])

  const reset = useCallback(() => {
    setState({
      pages: initialPage ? [initialPage] : [],
      currentPageIndex: 0,
      isNavigating: false
    })
  }, [initialPage])

  const setNavigating = useCallback((navigating: boolean) => {
    setState(prev => ({ ...prev, isNavigating: navigating }))
  }, [])

  const contextValue: ModalNavigationContextType = {
    state,
    navigateTo,
    navigateBack,
    canGoBack,
    getCurrentPage,
    reset,
    setNavigating
  }

  return (
    <ModalNavigationContext.Provider value={contextValue}>
      {children}
    </ModalNavigationContext.Provider>
  )
}

export function useModalNavigation() {
  const context = useContext(ModalNavigationContext)
  if (!context) {
    throw new Error('useModalNavigation must be used within a ModalNavigationProvider')
  }
  return context
}

// Navigation header component for modals
interface ModalNavigationHeaderProps {
  showBackButton?: boolean
  title?: string
  onClose?: () => void
  customBackAction?: () => void
  rightActions?: React.ReactNode
  className?: string
}

export function ModalNavigationHeader({ 
  showBackButton = true,
  title,
  onClose,
  customBackAction,
  rightActions,
  className = ""
}: ModalNavigationHeaderProps) {
  const { navigateBack, canGoBack, getCurrentPage } = useModalNavigation()
  
  const currentPage = getCurrentPage()
  const displayTitle = title || currentPage?.title || "Page"
  
  const handleBack = customBackAction || (canGoBack ? navigateBack : undefined)

  return (
    <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center space-x-3">
        {showBackButton && handleBack && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {displayTitle}
        </h2>
      </div>
      
      <div className="flex items-center space-x-2">
        {rightActions}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// Content container with navigation animations
interface ModalNavigationContentProps {
  children: React.ReactNode
  className?: string
  showNavigationHeader?: boolean
  headerProps?: Omit<ModalNavigationHeaderProps, 'onClose'>
  onClose?: () => void
}

export function ModalNavigationContent({ 
  children, 
  className = "",
  showNavigationHeader = true,
  headerProps = {},
  onClose
}: ModalNavigationContentProps) {
  const { state, getCurrentPage } = useModalNavigation()
  const currentPage = getCurrentPage()

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showNavigationHeader && (
        <ModalNavigationHeader 
          {...headerProps}
          onClose={onClose}
        />
      )}
      
      <div className="flex-1 relative overflow-hidden">
        <div 
          className={`h-full transition-transform duration-300 ease-out ${
            state.isNavigating ? 'transform -translate-x-full' : 'transform translate-x-0'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Hook for easy navigation within components
export function useModalPageNavigation() {
  const { navigateTo } = useModalNavigation()

  const navigateToPage = useCallback((
    id: string,
    title: string,
    component: React.ComponentType<any>,
    props?: any,
    type: ModalPageType = 'internal'
  ) => {
    navigateTo({
      id,
      title,
      component,
      props,
      type
    })
  }, [navigateTo])

  const navigateToUrl = useCallback((url: string, title?: string) => {
    const isPublicPage = url.startsWith('http') || 
      url.includes('/register') || 
      url.includes('/login') || 
      url.includes('/public')
    
    navigateTo({
      id: url,
      title: title || 'External Page',
      component: () => null, // Won't be used for external navigation
      type: isPublicPage ? 'public' : 'external'
    })
  }, [navigateTo])

  return {
    navigateToPage,
    navigateToUrl
  }
}