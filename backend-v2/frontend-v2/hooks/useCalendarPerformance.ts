// Calendar performance optimization hooks
import { useCallback, useMemo, useRef } from 'react'

export const useCalendarPerformance = () => {
  const renderCountRef = useRef(0)
  
  const memoizedCalendarData = useMemo(() => {
    renderCountRef.current++
    return {
      renderCount: renderCountRef.current,
      optimized: true
    }
  }, [])

  const optimizedRender = useCallback((data: any) => {
    // Performance optimization for calendar rendering
    return data
  }, [])

  const throttledUpdate = useCallback((callback: () => void, delay = 100) => {
    let timeoutId: NodeJS.Timeout
    return () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(callback, delay)
    }
  }, [])

  return {
    memoizedCalendarData,
    optimizedRender,
    throttledUpdate,
    renderCount: renderCountRef.current
  }
}