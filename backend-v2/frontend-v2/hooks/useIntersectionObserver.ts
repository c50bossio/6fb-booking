import { useEffect, useRef, useState, useCallback } from 'react'

interface UseIntersectionObserverOptions {
  rootMargin?: string
  threshold?: number | number[]
  triggerOnce?: boolean
  enabled?: boolean
}

interface IntersectionObserverEntry {
  isIntersecting: boolean
  target: Element
  intersectionRatio: number
  boundingClientRect: DOMRectReadOnly
  rootBounds: DOMRectReadOnly | null
  time: number
}

export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    rootMargin = '0px',
    threshold = 0.1,
    triggerOnce = false,
    enabled = true
  } = options

  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const targetRef = useRef<T>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const startObserving = useCallback(() => {
    if (!enabled || !targetRef.current || typeof window === 'undefined') {
      return
    }

    // Stop previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        const isCurrentlyIntersecting = entry.isIntersecting

        setIsIntersecting(isCurrentlyIntersecting)

        if (isCurrentlyIntersecting && !hasIntersected) {
          setHasIntersected(true)
          
          if (triggerOnce) {
            observerRef.current?.disconnect()
          }
        }
      },
      {
        rootMargin,
        threshold
      }
    )

    observerRef.current.observe(targetRef.current)
  }, [enabled, rootMargin, threshold, triggerOnce, hasIntersected])

  const stopObserving = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [])

  useEffect(() => {
    startObserving()

    return () => {
      stopObserving()
    }
  }, [startObserving, stopObserving])

  // Reset observation when triggerOnce changes
  useEffect(() => {
    if (!triggerOnce && hasIntersected) {
      setHasIntersected(false)
      startObserving()
    }
  }, [triggerOnce, hasIntersected, startObserving])

  return {
    ref: targetRef,
    isIntersecting,
    hasIntersected,
    startObserving,
    stopObserving
  }
}

// Hook for lazy loading calendar events
export function useCalendarLazyLoading(
  onLoadMore: () => void,
  options: {
    enabled?: boolean
    loadMoreThreshold?: string
    debounceMs?: number
  } = {}
) {
  const {
    enabled = true,
    loadMoreThreshold = '100px',
    debounceMs = 250
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin: loadMoreThreshold,
    threshold: 0,
    enabled
  })

  // Debounced load more function
  const debouncedLoadMore = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }

    loadingTimeoutRef.current = setTimeout(() => {
      if (!isLoading) {
        setIsLoading(true)
        onLoadMore()
        
        // Reset loading state after a delay
        setTimeout(() => {
          setIsLoading(false)
        }, 500)
      }
    }, debounceMs)
  }, [onLoadMore, isLoading, debounceMs])

  useEffect(() => {
    if (isIntersecting && enabled && !isLoading) {
      debouncedLoadMore()
    }
  }, [isIntersecting, enabled, isLoading, debouncedLoadMore])

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])

  return {
    ref,
    isIntersecting,
    isLoading,
    setIsLoading
  }
}

// Hook for lazy loading calendar items within a specific container
export function useCalendarItemLazyLoading(
  items: any[],
  onItemVisible: (item: any, index: number) => void,
  options: {
    threshold?: number
    rootMargin?: string
    triggerOnce?: boolean
  } = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options

  const itemRefs = useRef<Map<number, HTMLElement>>(new Map())
  const observedItems = useRef<Set<number>>(new Set())

  const setItemRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(index, element)
    } else {
      itemRefs.current.delete(index)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Find the index of the intersecting element
            const element = entry.target as HTMLElement
            let itemIndex = -1
            
            itemRefs.current.forEach((ref, index) => {
              if (ref === element) {
                itemIndex = index
              }
            })

            if (itemIndex !== -1 && !observedItems.current.has(itemIndex)) {
              const item = items[itemIndex]
              if (item) {
                onItemVisible(item, itemIndex)
                
                if (triggerOnce) {
                  observedItems.current.add(itemIndex)
                  observer.unobserve(element)
                }
              }
            }
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    // Observe all current item refs
    itemRefs.current.forEach((element) => {
      observer.observe(element)
    })

    return () => {
      observer.disconnect()
    }
  }, [items, onItemVisible, threshold, rootMargin, triggerOnce])

  // Clean up observed items when items change
  useEffect(() => {
    const currentItemCount = items.length
    const observedIndices = Array.from(observedItems.current)
    
    // Remove observed items that are beyond the current item count
    observedIndices.forEach(index => {
      if (index >= currentItemCount) {
        observedItems.current.delete(index)
      }
    })
  }, [items.length])

  return {
    setItemRef,
    observedItems: observedItems.current
  }
}

// Hook for preloading calendar data based on scroll position
export function useCalendarPreloader(
  onPreload: (direction: 'previous' | 'next', offset: number) => void,
  options: {
    preloadDistance?: string
    enabled?: boolean
  } = {}
) {
  const {
    preloadDistance = '200px',
    enabled = true
  } = options

  const previousTriggerRef = useRef<HTMLDivElement>(null)
  const nextTriggerRef = useRef<HTMLDivElement>(null)

  const { isIntersecting: isPreviousIntersecting } = useIntersectionObserver({
    rootMargin: preloadDistance,
    threshold: 0,
    enabled
  })

  const { isIntersecting: isNextIntersecting } = useIntersectionObserver({
    rootMargin: preloadDistance,
    threshold: 0,
    enabled
  })

  useEffect(() => {
    if (isPreviousIntersecting && enabled) {
      onPreload('previous', 1)
    }
  }, [isPreviousIntersecting, enabled, onPreload])

  useEffect(() => {
    if (isNextIntersecting && enabled) {
      onPreload('next', 1)
    }
  }, [isNextIntersecting, enabled, onPreload])

  return {
    previousTriggerRef,
    nextTriggerRef
  }
}