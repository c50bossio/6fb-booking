'use client'

import { useState, useCallback, useRef } from 'react'

interface UseDebounceOptions {
  /** Delay in milliseconds before allowing the action again (default: 300ms) */
  delay?: number
}

/**
 * Custom hook for debouncing function calls, particularly useful for click handlers.
 * Prevents rapid successive calls by ignoring subsequent calls within the delay period.
 * 
 * @param callback The function to debounce
 * @param options Configuration options for debouncing
 * @returns Debounced function and state information
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  options: UseDebounceOptions = {}
) {
  const { delay = 300 } = options
  
  const [isDebouncing, setIsDebouncing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    // If already debouncing, ignore the call
    if (isDebouncing) {
      return
    }

    // Execute the callback immediately
    callback(...args)
    
    // Set debouncing state
    setIsDebouncing(true)

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set timeout to reset debouncing state
    timeoutRef.current = setTimeout(() => {
      setIsDebouncing(false)
      timeoutRef.current = null
    }, delay)
  }, [callback, delay, isDebouncing])

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsDebouncing(false)
  }, [])

  return {
    debouncedCallback,
    isDebouncing,
    cleanup
  }
}

/**
 * Simplified debounce hook for click handlers specifically.
 * Provides a clean interface for preventing rapid button clicks.
 */
export function useClickDebounce(
  callback: () => void,
  delay: number = 300
) {
  return useDebounce(callback, { delay })
}

export default useDebounce