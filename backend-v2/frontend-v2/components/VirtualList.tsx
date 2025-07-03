'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface VirtualListItem {
  id: string | number
  height?: number
}

interface VirtualListProps<T extends VirtualListItem> {
  items: T[]
  itemHeight?: number
  containerHeight?: number
  overscan?: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  onScroll?: (scrollTop: number) => void
  className?: string
  style?: React.CSSProperties
  estimatedItemHeight?: number
  maintainScrollPosition?: boolean
  onScrollToTop?: () => void
  onScrollToBottom?: () => void
  getItemHeight?: (item: T, index: number) => number
}

interface ScrollState {
  scrollTop: number
  isScrolling: boolean
}

export default function VirtualList<T extends VirtualListItem>({
  items,
  itemHeight = 100,
  containerHeight = 400,
  overscan = 5,
  renderItem,
  onScroll,
  className = '',
  style = {},
  estimatedItemHeight,
  maintainScrollPosition = false,
  onScrollToTop,
  onScrollToBottom,
  getItemHeight
}: VirtualListProps<T>) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollTop: 0,
    isScrolling: false
  })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const isScrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousItemsLength = useRef(items.length)
  const itemHeights = useRef<Map<number, number>>(new Map())
  
  // Calculate dynamic item heights
  const actualItemHeight = useMemo(() => {
    return estimatedItemHeight || itemHeight
  }, [estimatedItemHeight, itemHeight])

  // Get height for a specific item
  const getHeight = useCallback((item: T, index: number): number => {
    if (getItemHeight) {
      return getItemHeight(item, index)
    }
    
    // If item has specific height, use it
    if (item.height) {
      return item.height
    }
    
    // Check cached height
    if (itemHeights.current.has(index)) {
      return itemHeights.current.get(index)!
    }
    
    return actualItemHeight
  }, [getItemHeight, actualItemHeight])

  // Calculate total height and item positions
  const { totalHeight, itemPositions } = useMemo(() => {
    let runningHeight = 0
    const positions: number[] = []
    
    for (let i = 0; i < items.length; i++) {
      positions[i] = runningHeight
      runningHeight += getHeight(items[i], i)
    }
    
    return {
      totalHeight: runningHeight,
      itemPositions: positions
    }
  }, [items, getHeight])

  // Find visible range based on scroll position
  const visibleRange = useMemo(() => {
    const { scrollTop } = scrollState
    
    // Binary search for start index
    let startIndex = 0
    let endIndex = items.length - 1
    
    while (startIndex <= endIndex) {
      const middleIndex = Math.floor((startIndex + endIndex) / 2)
      const itemTop = itemPositions[middleIndex]
      const itemBottom = itemTop + getHeight(items[middleIndex], middleIndex)
      
      if (itemBottom <= scrollTop) {
        startIndex = middleIndex + 1
      } else if (itemTop > scrollTop) {
        endIndex = middleIndex - 1
      } else {
        startIndex = middleIndex
        break
      }
    }
    
    // Find end index
    let endIdx = startIndex
    let currentTop = itemPositions[startIndex] || 0
    
    while (endIdx < items.length && currentTop < scrollTop + containerHeight) {
      currentTop += getHeight(items[endIdx], endIdx)
      endIdx++
    }
    
    // Apply overscan
    const start = Math.max(0, startIndex - overscan)
    const end = Math.min(items.length - 1, endIdx + overscan)
    
    return { start, end }
  }, [scrollState.scrollTop, items.length, itemPositions, containerHeight, overscan, getHeight])

  // Visible items with their styles
  const visibleItems = useMemo(() => {
    const result: Array<{
      item: T
      index: number
      style: React.CSSProperties
    }> = []
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i >= 0 && i < items.length) {
        const item = items[i]
        const top = itemPositions[i]
        const height = getHeight(item, i)
        
        result.push({
          item,
          index: i,
          style: {
            position: 'absolute',
            top: `${top}px`,
            left: 0,
            right: 0,
            height: `${height}px`,
            width: '100%'
          }
        })
      }
    }
    
    return result
  }, [visibleRange, items, itemPositions, getHeight])

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop
    
    setScrollState(prev => ({
      ...prev,
      scrollTop,
      isScrolling: true
    }))
    
    // Clear existing timeout
    if (isScrollingTimeoutRef.current) {
      clearTimeout(isScrollingTimeoutRef.current)
    }
    
    // Set scrolling to false after a delay
    isScrollingTimeoutRef.current = setTimeout(() => {
      setScrollState(prev => ({
        ...prev,
        isScrolling: false
      }))
    }, 150)
    
    // Call external scroll handler
    onScroll?.(scrollTop)
    
    // Handle scroll to top/bottom
    if (scrollTop === 0 && onScrollToTop) {
      onScrollToTop()
    }
    
    const scrollElement = event.currentTarget
    const isNearBottom = scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 100
    if (isNearBottom && onScrollToBottom) {
      onScrollToBottom()
    }
  }, [onScroll, onScrollToTop, onScrollToBottom])

  // Maintain scroll position when items change
  useEffect(() => {
    if (maintainScrollPosition && items.length !== previousItemsLength.current) {
      const scrollElement = scrollElementRef.current
      if (scrollElement) {
        // If items were added at the beginning, adjust scroll position
        const itemsAdded = items.length - previousItemsLength.current
        if (itemsAdded > 0) {
          const addedHeight = itemsAdded * actualItemHeight
          scrollElement.scrollTop = scrollState.scrollTop + addedHeight
        }
      }
    }
    previousItemsLength.current = items.length
  }, [items.length, maintainScrollPosition, actualItemHeight, scrollState.scrollTop])

  // Public methods via ref
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const scrollElement = scrollElementRef.current
    if (!scrollElement || index < 0 || index >= items.length) return
    
    const itemTop = itemPositions[index]
    const itemHeight = getHeight(items[index], index)
    
    let scrollTop: number
    
    switch (align) {
      case 'start':
        scrollTop = itemTop
        break
      case 'center':
        scrollTop = itemTop - (containerHeight - itemHeight) / 2
        break
      case 'end':
        scrollTop = itemTop - containerHeight + itemHeight
        break
      default:
        scrollTop = itemTop
    }
    
    scrollElement.scrollTop = Math.max(0, Math.min(scrollTop, totalHeight - containerHeight))
  }, [items, itemPositions, getHeight, containerHeight, totalHeight])

  const scrollToTop = useCallback(() => {
    const scrollElement = scrollElementRef.current
    if (scrollElement) {
      scrollElement.scrollTop = 0
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    const scrollElement = scrollElementRef.current
    if (scrollElement) {
      scrollElement.scrollTop = totalHeight
    }
  }, [totalHeight])

  // Expose methods via ref
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).scrollToIndex = scrollToIndex;
      (containerRef.current as any).scrollToTop = scrollToTop;
      (containerRef.current as any).scrollToBottom = scrollToBottom;
    }
  }, [scrollToIndex, scrollToTop, scrollToBottom])

  // Cleanup
  useEffect(() => {
    return () => {
      if (isScrollingTimeoutRef.current) {
        clearTimeout(isScrollingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`}
      style={{
        position: 'relative',
        height: containerHeight,
        overflow: 'hidden',
        ...style
      }}
    >
      <div
        ref={scrollElementRef}
        className="virtual-list-scroll-container"
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
        onScroll={handleScroll}
      >
        <div
          className="virtual-list-content"
          style={{
            position: 'relative',
            height: `${totalHeight}px`,
            width: '100%'
          }}
        >
          {visibleItems.map(({ item, index, style: itemStyle }) => (
            <div
              key={item.id}
              className="virtual-list-item"
              style={itemStyle}
            >
              {renderItem(item, index, itemStyle)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Hook for easier virtual list management
export function useVirtualList<T extends VirtualListItem>(
  items: T[],
  options: {
    itemHeight?: number
    containerHeight?: number
    overscan?: number
    estimatedItemHeight?: number
  } = {}
) {
  const {
    itemHeight = 100,
    containerHeight = 400,
    overscan = 5,
    estimatedItemHeight
  } = options

  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const actualHeight = estimatedItemHeight || itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / actualHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / actualHeight) + overscan
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, containerHeight, itemHeight, estimatedItemHeight, overscan, items.length])

  return {
    visibleRange,
    scrollTop,
    isScrolling,
    setScrollTop,
    setIsScrolling,
    totalHeight: items.length * (estimatedItemHeight || itemHeight)
  }
}

// Performance-optimized memo component for list items
export const VirtualListItem = React.memo<{
  children: React.ReactNode
  style: React.CSSProperties
  className?: string
}>(({ children, style, className = '' }) => (
  <div className={`virtual-list-item ${className}`} style={style}>
    {children}
  </div>
))

VirtualListItem.displayName = 'VirtualListItem'