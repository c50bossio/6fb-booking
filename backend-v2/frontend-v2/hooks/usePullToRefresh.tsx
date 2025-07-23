/**
 * Pull-to-refresh hook with smooth animations and customizable trigger distance
 * Provides native app-like refresh experience with haptic feedback
 */

import { useCallback, useRef, useState, useEffect } from 'react'

export interface PullToRefreshOptions {
  pullDistance?: number
  triggerDistance?: number
  refreshThreshold?: number
  disabled?: boolean
  onRefresh?: () => Promise<void> | void
  enableHaptic?: boolean
  pullResistance?: number
}

export interface PullToRefreshState {
  isPulling: boolean
  pullDistance: number
  isRefreshing: boolean
  canRefresh: boolean
}

const DEFAULT_OPTIONS: Required<PullToRefreshOptions> = {
  pullDistance: 80,
  triggerDistance: 60,
  refreshThreshold: 40,
  disabled: false,
  onRefresh: () => {},
  enableHaptic: true,
  pullResistance: 0.6
}

export function usePullToRefresh(
  elementRef: React.RefObject<HTMLElement>,
  options: PullToRefreshOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const touchState = useRef({
    startY: 0,
    currentY: 0,
    isPulling: false,
    pullStarted: false,
    lastHapticDistance: 0
  })

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false
  })

  // Check if element can be pulled (at top of scroll)
  const canStartPull = useCallback(() => {
    if (!elementRef.current) return false
    
    const element = elementRef.current
    const scrollTop = element.scrollTop
    const isAtTop = scrollTop <= 5 // Small tolerance for rounding
    
    return isAtTop && !config.disabled && !state.isRefreshing
  }, [elementRef, config.disabled, state.isRefreshing])

  // Calculate pull distance with resistance
  const calculatePullDistance = useCallback((deltaY: number): number => {
    if (deltaY <= 0) return 0
    
    // Apply pull resistance for rubber band effect
    const resistance = config.pullResistance
    const maxPull = config.pullDistance
    
    // Exponential resistance curve
    const resistedDistance = deltaY * resistance * (1 - (deltaY / (maxPull * 2)))
    
    return Math.max(0, Math.min(maxPull, resistedDistance))
  }, [config.pullResistance, config.pullDistance])

  // Provide haptic feedback based on pull distance
  const provideHapticFeedback = useCallback((distance: number) => {
    if (!config.enableHaptic || !('vibrate' in navigator)) return
    
    const lastDistance = touchState.current.lastHapticDistance
    
    // Trigger haptic at specific thresholds
    if (distance >= config.triggerDistance && lastDistance < config.triggerDistance) {
      navigator.vibrate(30) // Trigger threshold reached
      touchState.current.lastHapticDistance = distance
    } else if (distance >= config.refreshThreshold && lastDistance < config.refreshThreshold) {
      navigator.vibrate(15) // Pull threshold reached
      touchState.current.lastHapticDistance = distance
    }
  }, [config.enableHaptic, config.triggerDistance, config.refreshThreshold])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canStartPull()) return
    
    const touch = e.touches[0]
    touchState.current.startY = touch.clientY
    touchState.current.currentY = touch.clientY
    touchState.current.isPulling = false
    touchState.current.pullStarted = false
    touchState.current.lastHapticDistance = 0
  }, [canStartPull])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchState.current.startY) return
    
    const touch = e.touches[0]
    const deltaY = touch.clientY - touchState.current.startY
    touchState.current.currentY = touch.clientY
    
    // Only start pulling if moving downward and can pull
    if (deltaY > 10 && canStartPull() && !touchState.current.pullStarted) {
      touchState.current.pullStarted = true
      touchState.current.isPulling = true
    }
    
    if (touchState.current.isPulling) {
      const pullDistance = calculatePullDistance(deltaY)
      const canRefresh = pullDistance >= config.triggerDistance
      
      setState({
        isPulling: true,
        pullDistance,
        isRefreshing: false,
        canRefresh
      })
      
      // Provide haptic feedback
      provideHapticFeedback(pullDistance)
      
      // Prevent scrolling when pulling
      if (pullDistance > 0) {
        e.preventDefault()
      }
    }
  }, [canStartPull, calculatePullDistance, config.triggerDistance, provideHapticFeedback])

  // Handle touch end
  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!touchState.current.isPulling) return
    
    const shouldRefresh = state.canRefresh && state.pullDistance >= config.triggerDistance
    
    if (shouldRefresh) {
      // Trigger refresh
      setState(prev => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: config.triggerDistance // Keep pulled state during refresh
      }))
      
      // Strong haptic feedback for refresh trigger
      if (config.enableHaptic && 'vibrate' in navigator) {
        navigator.vibrate([40, 20, 60])
      }
      
      try {
        await config.onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
        
        // Error haptic feedback
        if (config.enableHaptic && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }
      } finally {
        // Animate back to resting state
        setState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
          canRefresh: false
        })
      }
    } else {
      // Release without refresh
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
        canRefresh: false
      })
    }
    
    // Reset touch state
    touchState.current = {
      startY: 0,
      currentY: 0,
      isPulling: false,
      pullStarted: false,
      lastHapticDistance: 0
    }
  }, [state.canRefresh, state.pullDistance, config.triggerDistance, config.enableHaptic, config.onRefresh])

  // Set up touch event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const options = { passive: false }
    
    element.addEventListener('touchstart', handleTouchStart, options)
    element.addEventListener('touchmove', handleTouchMove, options)
    element.addEventListener('touchend', handleTouchEnd, options)
    element.addEventListener('touchcancel', handleTouchEnd, options)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Manual refresh trigger
  const triggerRefresh = useCallback(async () => {
    if (state.isRefreshing || config.disabled) return
    
    setState(prev => ({ ...prev, isRefreshing: true }))
    
    try {
      await config.onRefresh()
    } catch (error) {
      console.error('Manual refresh failed:', error)
    } finally {
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
        canRefresh: false
      })
    }
  }, [state.isRefreshing, config.disabled, config.onRefresh])

  return {
    ...state,
    triggerRefresh,
    
    // Helper methods for rendering
    getPullStyles: useCallback(() => ({
      transform: `translateY(${state.pullDistance}px)`,
      transition: state.isPulling ? 'none' : 'transform 0.3s ease-out'
    }), [state.pullDistance, state.isPulling]),
    
    getPullIndicatorStyles: useCallback(() => ({
      opacity: state.pullDistance > 0 ? 1 : 0,
      transform: `translateY(${Math.max(0, state.pullDistance - 20)}px) rotate(${state.pullDistance * 2}deg)`,
      transition: state.isPulling ? 'none' : 'all 0.3s ease-out'
    }), [state.pullDistance, state.isPulling]),
    
    getProgressPercentage: useCallback(() => {
      return Math.min(100, (state.pullDistance / config.triggerDistance) * 100)
    }, [state.pullDistance, config.triggerDistance])
  }
}

// React component for pull-to-refresh indicator
export function PullToRefreshIndicator({ 
  state, 
  className = '',
  showText = true 
}: { 
  state: PullToRefreshState
  className?: string
  showText?: boolean
}) {
  const getIndicatorText = () => {
    if (state.isRefreshing) return 'Refreshing...'
    if (state.canRefresh) return 'Release to refresh'
    if (state.isPulling) return 'Pull to refresh'
    return ''
  }

  const getIndicatorIcon = () => {
    if (state.isRefreshing) {
      return (
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      )
    }
    
    return (
      <div className={`w-6 h-6 border-2 border-blue-600 rounded-full transition-transform duration-200 ${
        state.canRefresh ? 'rotate-180' : ''
      }`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-2 h-2 border-t-2 border-blue-600 transform rotate-45" />
        </div>
      </div>
    )
  }

  if (!state.isPulling && !state.isRefreshing) return null

  return (
    <div className={`flex flex-col items-center justify-center py-4 ${className}`}>
      <div className="flex items-center space-x-3">
        {getIndicatorIcon()}
        {showText && (
          <span className="text-sm text-gray-600 font-medium">
            {getIndicatorText()}
          </span>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="w-32 h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-200 ease-out"
          style={{ 
            width: `${Math.min(100, (state.pullDistance / 60) * 100)}%` 
          }}
        />
      </div>
    </div>
  )
}

export default usePullToRefresh