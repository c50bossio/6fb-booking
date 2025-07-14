import { useState, useCallback } from 'react'

/**
 * Standard modal state management hook
 * Provides consistent API for modal state across the application
 */
export interface UseModalReturn<T = any> {
  isOpen: boolean
  data: T | null
  openModal: (data?: T) => void
  closeModal: () => void
  toggleModal: () => void
}

export function useModal<T = any>(initialData: T | null = null): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | null>(initialData)

  const openModal = useCallback((modalData?: T) => {
    if (modalData !== undefined) {
      setData(modalData)
    }
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    // Keep data until next open for better UX
  }, [])

  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    data,
    openModal,
    closeModal,
    toggleModal
  }
}

/**
 * Modal manager for complex modal flows
 * Handles modal stacks, transitions, and modal-to-modal navigation
 */
export interface ModalStackItem {
  id: string
  component: React.ComponentType<any>
  props: any
}

export interface UseModalManagerReturn {
  currentModal: ModalStackItem | null
  modalStack: ModalStackItem[]
  pushModal: (modal: ModalStackItem) => void
  popModal: () => void
  replaceModal: (modal: ModalStackItem) => void
  closeAllModals: () => void
  isModalOpen: (id: string) => boolean
}

export function useModalManager(): UseModalManagerReturn {
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([])

  const pushModal = useCallback((modal: ModalStackItem) => {
    setModalStack(prev => [...prev, modal])
  }, [])

  const popModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1))
  }, [])

  const replaceModal = useCallback((modal: ModalStackItem) => {
    setModalStack(prev => [...prev.slice(0, -1), modal])
  }, [])

  const closeAllModals = useCallback(() => {
    setModalStack([])
  }, [])

  const isModalOpen = useCallback((id: string) => {
    return modalStack.some(modal => modal.id === id)
  }, [modalStack])

  const currentModal = modalStack[modalStack.length - 1] || null

  return {
    currentModal,
    modalStack,
    pushModal,
    popModal,
    replaceModal,
    closeAllModals,
    isModalOpen
  }
}

/**
 * Hook for managing multiple modal states in a single component
 * Useful when a component needs to handle several different modals
 */
export interface UseMultiModalReturn {
  modals: Record<string, boolean>
  openModal: (modalName: string) => void
  closeModal: (modalName: string) => void
  toggleModal: (modalName: string) => void
  isModalOpen: (modalName: string) => boolean
  closeAllModals: () => void
}

export function useMultiModal(modalNames: string[]): UseMultiModalReturn {
  const [modals, setModals] = useState<Record<string, boolean>>(() => {
    return modalNames.reduce((acc, name) => {
      acc[name] = false
      return acc
    }, {} as Record<string, boolean>)
  })

  const openModal = useCallback((modalName: string) => {
    setModals(prev => ({ ...prev, [modalName]: true }))
  }, [])

  const closeModal = useCallback((modalName: string) => {
    setModals(prev => ({ ...prev, [modalName]: false }))
  }, [])

  const toggleModal = useCallback((modalName: string) => {
    setModals(prev => ({ ...prev, [modalName]: !prev[modalName] }))
  }, [])

  const isModalOpen = useCallback((modalName: string) => {
    return modals[modalName] || false
  }, [modals])

  const closeAllModals = useCallback(() => {
    const closedModals = { ...modals }
    Object.keys(closedModals).forEach(key => {
      closedModals[key] = false
    })
    setModals(closedModals)
  }, [modals])

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    isModalOpen,
    closeAllModals
  }
}

/**
 * Hook for modal workflows that require step-by-step navigation
 * Useful for multi-step modals like wizards or onboarding flows
 */
export interface UseModalWizardReturn {
  currentStep: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  resetWizard: () => void
  progress: number
}

export function useModalWizard(totalSteps: number): UseModalWizardReturn {
  const [currentStep, setCurrentStep] = useState(0)

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
  }, [totalSteps])

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
    }
  }, [totalSteps])

  const resetWizard = useCallback(() => {
    setCurrentStep(0)
  }, [])

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  return {
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    goToStep,
    resetWizard,
    progress
  }
}