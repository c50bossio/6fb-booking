import React from 'react'
import { cn } from '@/lib/utils'
import { useResponsive } from '@/hooks/useResponsive'

// Mobile-optimized card that stacks on small screens
export function ResponsiveCard({ 
  children, 
  className = '',
  stackOnMobile = true
}: { 
  children: React.ReactNode
  className?: string
  stackOnMobile?: boolean
}) {
  const { isMobile } = useResponsive()
  
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
      stackOnMobile && isMobile ? "p-4" : "p-6",
      className
    )}>
      {children}
    </div>
  )
}

// Mobile-optimized grid that adjusts columns
export function ResponsiveGrid({
  children,
  className = '',
  cols = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4
  }
}: {
  children: React.ReactNode
  className?: string
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
    wide?: number
  }
}) {
  return (
    <div className={cn(
      "grid gap-4 md:gap-6",
      `grid-cols-${cols.mobile || 1}`,
      cols.tablet && `md:grid-cols-${cols.tablet}`,
      cols.desktop && `lg:grid-cols-${cols.desktop}`,
      cols.wide && `xl:grid-cols-${cols.wide}`,
      className
    )}>
      {children}
    </div>
  )
}

// Mobile-friendly button group
export function ButtonGroup({
  buttons,
  className = '',
  stackOnMobile = true
}: {
  buttons: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'ghost'
    disabled?: boolean
    loading?: boolean
  }>
  className?: string
  stackOnMobile?: boolean
}) {
  const { isMobile } = useResponsive()
  
  return (
    <div className={cn(
      "flex",
      stackOnMobile && isMobile ? "flex-col gap-2" : "flex-row gap-2",
      className
    )}>
      {buttons.map((button, index) => (
        <button
          key={index}
          onClick={button.onClick}
          disabled={button.disabled || button.loading}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-colors",
            stackOnMobile && isMobile && "w-full",
            button.variant === 'primary' && "bg-primary-600 text-white hover:bg-primary-700",
            button.variant === 'secondary' && "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
            button.variant === 'ghost' && "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
            (button.disabled || button.loading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {button.loading ? 'Loading...' : button.label}
        </button>
      ))}
    </div>
  )
}

// Pull-to-refresh component for mobile
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80
}: {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
}) {
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [startY, setStartY] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY)
    }
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY && !isRefreshing && containerRef.current?.scrollTop === 0) {
      const currentY = e.touches[0].clientY
      const distance = Math.max(0, currentY - startY)
      setPullDistance(Math.min(distance, threshold * 1.5))
    }
  }
  
  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
    setStartY(0)
  }
  
  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
        style={{
          height: pullDistance,
          opacity: pullDistance / threshold
        }}
      >
        <div className={cn(
          "rounded-full p-2",
          isRefreshing ? "animate-spin" : ""
        )}>
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  )
}

// Swipeable tabs for mobile
export function SwipeableTabs({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}: {
  tabs: Array<{
    id: string
    label: string
    content: React.ReactNode
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}) {
  const [touchStart, setTouchStart] = React.useState(0)
  const [touchEnd, setTouchEnd] = React.useState(0)
  
  const minSwipeDistance = 50
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0)
    setTouchStart(e.targetTouches[0].clientX)
  }
  
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
    
    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1].id)
    }
    
    if (isRightSwipe && currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1].id)
    }
  }
  
  return (
    <div className={className}>
      {/* Tab headers */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab content with swipe */}
      <div
        className="relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "transition-all duration-300",
              activeTab === tab.id ? "block" : "hidden"
            )}
          >
            {tab.content}
          </div>
        ))}
      </div>
      
      {/* Tab indicators */}
      <div className="flex justify-center mt-4 gap-1">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={cn(
              "h-1 rounded-full transition-all",
              activeTab === tab.id
                ? "w-8 bg-primary-600 dark:bg-primary-400"
                : "w-2 bg-gray-300 dark:bg-gray-600"
            )}
          />
        ))}
      </div>
    </div>
  )
}

// Floating action button for mobile
export function FloatingActionButton({
  onClick,
  icon,
  label,
  position = 'bottom-right',
  className = ''
}: {
  onClick: () => void
  icon: React.ReactNode
  label?: string
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  className?: string
}) {
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2'
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed z-40 bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all",
        "flex items-center justify-center",
        label ? "px-6 py-3" : "w-14 h-14",
        positionClasses[position],
        className
      )}
      aria-label={label}
    >
      {icon}
      {label && <span className="ml-2 font-medium">{label}</span>}
    </button>
  )
}