'use client'

import { useState, useCallback } from 'react'

/**
 * Custom hook for controlled tooltip behavior
 * Supports both hover and click interactions
 */
export function useControlledTooltip() {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(prev => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  return {
    isOpen,
    onToggle: handleToggle,
    onClose: handleClose,
    onOpen: handleOpen,
  }
}