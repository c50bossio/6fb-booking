'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useCalendarInteraction } from './useCalendarInteraction'

interface CalendarAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'move' | 'reschedule'
  timestamp: number
  description: string
  undoData: any
  redoData: any
  appointmentId?: number
  affectedIds?: number[]
}

interface UndoRedoOptions {
  maxHistorySize?: number
  enableKeyboardShortcuts?: boolean
  enableNotifications?: boolean
  autoSave?: boolean
}

/**
 * Enhanced undo/redo system for calendar operations
 * Supports appointment creation, editing, deletion, and rescheduling
 */
export function useCalendarUndoRedo(
  onExecuteAction: (action: CalendarAction, isUndo: boolean) => Promise<void>,
  options: UndoRedoOptions = {}
) {
  const {
    maxHistorySize = 50,
    enableKeyboardShortcuts = true,
    enableNotifications = true,
    autoSave = true
  } = options

  const [history, setHistory] = useState<CalendarAction[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isProcessing, setIsProcessing] = useState(false)
  const processingActionRef = useRef<string | null>(null)

  const { announceToScreenReader } = useCalendarInteraction({
    announceChanges: enableNotifications
  })

  // Check if undo is available
  const canUndo = currentIndex >= 0 && !isProcessing
  
  // Check if redo is available  
  const canRedo = currentIndex < history.length - 1 && !isProcessing

  // Get current action for display
  const getCurrentUndoAction = useCallback((): CalendarAction | null => {
    return canUndo ? history[currentIndex] : null
  }, [canUndo, history, currentIndex])

  const getCurrentRedoAction = useCallback((): CalendarAction | null => {
    return canRedo ? history[currentIndex + 1] : null
  }, [canRedo, history, currentIndex])

  // Add action to history
  const addAction = useCallback((action: Omit<CalendarAction, 'id' | 'timestamp'>): void => {
    const newAction: CalendarAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    setHistory(prevHistory => {
      // Remove any actions after current index (clear redo history when new action is added)
      const truncatedHistory = prevHistory.slice(0, currentIndex + 1)
      
      // Add new action
      const newHistory = [...truncatedHistory, newAction]
      
      // Maintain max history size
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize)
      }
      
      return newHistory
    })

    setCurrentIndex(prev => {
      const newIndex = Math.min(prev + 1, maxHistorySize - 1)
      return newIndex
    })

    if (enableNotifications) {
      announceToScreenReader(`Action recorded: ${action.description}`)
    }
  }, [currentIndex, maxHistorySize, enableNotifications, announceToScreenReader])

  // Undo operation
  const undo = useCallback(async (): Promise<boolean> => {
    if (!canUndo || isProcessing) return false

    const actionToUndo = history[currentIndex]
    setIsProcessing(true)
    processingActionRef.current = actionToUndo.id

    try {
      await onExecuteAction(actionToUndo, true)
      
      setCurrentIndex(prev => prev - 1)
      
      if (enableNotifications) {
        announceToScreenReader(`Undid: ${actionToUndo.description}`)
      }
      
      return true
    } catch (error: any) {
      if (enableNotifications) {
        announceToScreenReader(`Failed to undo: ${error.message || 'Unknown error'}`)
      }
      return false
    } finally {
      setIsProcessing(false)
      processingActionRef.current = null
    }
  }, [canUndo, isProcessing, history, currentIndex, onExecuteAction, enableNotifications, announceToScreenReader])

  // Redo operation
  const redo = useCallback(async (): Promise<boolean> => {
    if (!canRedo || isProcessing) return false

    const actionToRedo = history[currentIndex + 1]
    setIsProcessing(true)
    processingActionRef.current = actionToRedo.id

    try {
      await onExecuteAction(actionToRedo, false)
      
      setCurrentIndex(prev => prev + 1)
      
      if (enableNotifications) {
        announceToScreenReader(`Redid: ${actionToRedo.description}`)
      }
      
      return true
    } catch (error: any) {
      if (enableNotifications) {
        announceToScreenReader(`Failed to redo: ${error.message || 'Unknown error'}`)
      }
      return false
    } finally {
      setIsProcessing(false)
      processingActionRef.current = null
    }
  }, [canRedo, isProcessing, history, currentIndex, onExecuteAction, enableNotifications, announceToScreenReader])

  // Clear history
  const clearHistory = useCallback((): void => {
    setHistory([])
    setCurrentIndex(-1)
    
    if (enableNotifications) {
      announceToScreenReader('Undo history cleared')
    }
  }, [enableNotifications, announceToScreenReader])

  // Get history summary for debugging/display
  const getHistorySummary = useCallback(() => {
    return {
      totalActions: history.length,
      currentIndex,
      canUndo,
      canRedo,
      undoAction: getCurrentUndoAction()?.description,
      redoAction: getCurrentRedoAction()?.description,
      isProcessing
    }
  }, [history.length, currentIndex, canUndo, canRedo, getCurrentUndoAction, getCurrentRedoAction, isProcessing])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if ((event.target as HTMLElement).tagName === 'INPUT' || 
          (event.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlKey = isMac ? event.metaKey : event.ctrlKey

      if (ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (ctrlKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault()
        redo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enableKeyboardShortcuts, undo, redo])

  // Auto-save history to localStorage
  useEffect(() => {
    if (autoSave && history.length > 0) {
      try {
        const historyData = {
          history: history.slice(-20), // Save only last 20 actions
          currentIndex: Math.max(currentIndex, -1),
          timestamp: Date.now()
        }
        localStorage.setItem('bb_calendar_history', JSON.stringify(historyData))
      } catch (error) {
        console.warn('Failed to save undo history:', error)
      }
    }
  }, [autoSave, history, currentIndex])

  // Load history from localStorage on mount
  useEffect(() => {
    if (autoSave) {
      try {
        const savedData = localStorage.getItem('bb_calendar_history')
        if (savedData) {
          const parsed = JSON.parse(savedData)
          const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000 // 24 hours
          
          if (isRecent && Array.isArray(parsed.history)) {
            setHistory(parsed.history)
            setCurrentIndex(parsed.currentIndex || -1)
            
            if (enableNotifications) {
              announceToScreenReader(`Loaded ${parsed.history.length} saved actions`)
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load undo history:', error)
      }
    }
  }, [autoSave, enableNotifications, announceToScreenReader])

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSave) {
        localStorage.removeItem('bb_calendar_history')
      }
    }
  }, [autoSave])

  return {
    // Core operations
    addAction,
    undo,
    redo,
    clearHistory,

    // State queries
    canUndo,
    canRedo,
    isProcessing,
    getCurrentUndoAction,
    getCurrentRedoAction,
    getHistorySummary,

    // History data
    history,
    currentIndex,
    
    // Utilities
    isCurrentlyProcessing: (actionId: string) => processingActionRef.current === actionId
  }
}