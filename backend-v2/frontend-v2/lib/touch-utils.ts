/**
 * Enhanced touch and gesture utilities for mobile drag-and-drop support
 * Provides touch event handlers that work seamlessly with desktop drag-and-drop
 */

export interface TouchPosition {
  x: number
  y: number
  clientX: number
  clientY: number
}

export interface TouchDragState {
  isDragging: boolean
  startPosition: TouchPosition | null
  currentPosition: TouchPosition | null
  draggedElement: HTMLElement | null
  dropTarget: HTMLElement | null
}

export class TouchDragManager {
  private dragState: TouchDragState = {
    isDragging: false,
    startPosition: null,
    currentPosition: null,
    draggedElement: null,
    dropTarget: null
  }

  private dragThreshold = 10 // pixels
  private longPressDelay = 500 // milliseconds
  private longPressTimer: NodeJS.Timeout | null = null
  private ghostElement: HTMLElement | null = null

  /**
   * Initialize touch drag on an element
   */
  initializeTouchDrag(
    element: HTMLElement,
    options: {
      onDragStart?: (element: HTMLElement, position: TouchPosition) => boolean
      onDragMove?: (element: HTMLElement, position: TouchPosition, dropTarget: HTMLElement | null) => void
      onDragEnd?: (element: HTMLElement, dropTarget: HTMLElement | null) => void
      canDrag?: (element: HTMLElement) => boolean
      getDropTarget?: (position: TouchPosition) => HTMLElement | null
    }
  ) {
    const handleTouchStart = (e: TouchEvent) => {
      if (options.canDrag && !options.canDrag(element)) return

      const touch = e.touches[0]
      const position: TouchPosition = {
        x: touch.pageX,
        y: touch.pageY,
        clientX: touch.clientX,
        clientY: touch.clientY
      }

      this.dragState.startPosition = position
      this.dragState.draggedElement = element

      // Start long press timer for drag initiation
      this.longPressTimer = setTimeout(() => {
        if (this.dragState.startPosition && !this.dragState.isDragging) {
          const canStart = options.onDragStart?.(element, position) ?? true
          if (canStart) {
            this.startDrag(element, position)
            
            // Provide haptic feedback if available
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(50)
            }
          }
        }
      }, this.longPressDelay)

      // Prevent default to avoid scrolling during potential drag
      e.preventDefault()
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!this.dragState.startPosition) return

      const touch = e.touches[0]
      const currentPosition: TouchPosition = {
        x: touch.pageX,
        y: touch.pageY,
        clientX: touch.clientX,
        clientY: touch.clientY
      }

      this.dragState.currentPosition = currentPosition

      // Check if we've moved enough to cancel long press
      const deltaX = currentPosition.x - this.dragState.startPosition.x
      const deltaY = currentPosition.y - this.dragState.startPosition.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance > this.dragThreshold && this.longPressTimer) {
        clearTimeout(this.longPressTimer)
        this.longPressTimer = null
      }

      // Handle drag movement if already dragging
      if (this.dragState.isDragging) {
        this.updateDrag(currentPosition, options.getDropTarget)
        options.onDragMove?.(element, currentPosition, this.dragState.dropTarget)
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer)
        this.longPressTimer = null
      }

      if (this.dragState.isDragging) {
        options.onDragEnd?.(element, this.dragState.dropTarget)
        this.endDrag()
        e.preventDefault()
      }

      this.resetDragState()
    }

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false })

    // Return cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }

  private startDrag(element: HTMLElement, position: TouchPosition) {
    this.dragState.isDragging = true
    this.dragState.currentPosition = position

    // Create ghost element for visual feedback
    this.createGhostElement(element, position)

    // Add visual feedback to original element
    element.style.opacity = '0.5'
    element.style.transform = 'scale(0.95)'
    element.classList.add('touch-dragging')

    // Add global styles for drag state
    if (typeof document !== 'undefined') {
      document.body.classList.add('touch-drag-active')
    }
  }

  private updateDrag(position: TouchPosition, getDropTarget?: (position: TouchPosition) => HTMLElement | null) {
    if (!this.dragState.isDragging || !this.ghostElement) return

    // Update ghost element position
    this.ghostElement.style.left = `${position.clientX - 50}px`
    this.ghostElement.style.top = `${position.clientY - 25}px`

    // Find drop target
    const previousDropTarget = this.dragState.dropTarget
    this.dragState.dropTarget = getDropTarget?.(position) || this.getElementUnderPoint(position)

    // Update drop target visual feedback
    if (previousDropTarget !== this.dragState.dropTarget) {
      if (previousDropTarget) {
        previousDropTarget.classList.remove('touch-drag-over')
      }
      if (this.dragState.dropTarget) {
        this.dragState.dropTarget.classList.add('touch-drag-over')
      }
    }
  }

  private endDrag() {
    if (!this.dragState.isDragging) return

    // Remove visual feedback
    if (this.dragState.draggedElement) {
      this.dragState.draggedElement.style.opacity = ''
      this.dragState.draggedElement.style.transform = ''
      this.dragState.draggedElement.classList.remove('touch-dragging')
    }

    if (this.dragState.dropTarget) {
      this.dragState.dropTarget.classList.remove('touch-drag-over')
    }

    // Remove ghost element
    if (this.ghostElement) {
      this.ghostElement.remove()
      this.ghostElement = null
    }

    // Remove global styles
    if (typeof document !== 'undefined') {
      document.body.classList.remove('touch-drag-active')
    }
  }

  private resetDragState() {
    this.dragState = {
      isDragging: false,
      startPosition: null,
      currentPosition: null,
      draggedElement: null,
      dropTarget: null
    }
  }

  private createGhostElement(element: HTMLElement, position: TouchPosition) {
    const ghost = element.cloneNode(true) as HTMLElement
    ghost.style.position = 'fixed'
    ghost.style.left = `${position.clientX - 50}px`
    ghost.style.top = `${position.clientY - 25}px`
    ghost.style.width = `${element.offsetWidth}px`
    ghost.style.height = `${element.offsetHeight}px`
    ghost.style.pointerEvents = 'none'
    ghost.style.zIndex = '9999'
    ghost.style.opacity = '0.8'
    ghost.style.transform = 'scale(0.9) rotate(3deg)'
    ghost.style.borderRadius = '8px'
    ghost.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
    ghost.classList.add('touch-drag-ghost')

    if (typeof document !== 'undefined') {
      document.body.appendChild(ghost)
    }
    this.ghostElement = ghost
  }

  private getElementUnderPoint(position: TouchPosition): HTMLElement | null {
    // Temporarily hide ghost element to get element underneath
    const originalDisplay = this.ghostElement?.style.display
    if (this.ghostElement) {
      this.ghostElement.style.display = 'none'
    }

    const element = typeof document !== 'undefined' 
      ? document.elementFromPoint(position.clientX, position.clientY) as HTMLElement
      : null

    // Restore ghost element
    if (this.ghostElement && originalDisplay !== undefined) {
      this.ghostElement.style.display = originalDisplay
    }

    return element
  }

  /**
   * Check if device supports touch
   */
  static isTouchDevice(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false
    }
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  /**
   * Get current drag state
   */
  getDragState(): TouchDragState {
    return { ...this.dragState }
  }
}

// Global instance
export const touchDragManager = new TouchDragManager()

/**
 * Hook for React components to easily add touch drag support
 */
export function useTouchDrag(options: {
  onDragStart?: (element: HTMLElement, position: TouchPosition) => boolean
  onDragMove?: (element: HTMLElement, position: TouchPosition, dropTarget: HTMLElement | null) => void
  onDragEnd?: (element: HTMLElement, dropTarget: HTMLElement | null) => void
  canDrag?: (element: HTMLElement) => boolean
  getDropTarget?: (position: TouchPosition) => HTMLElement | null
}) {
  return (element: HTMLElement | null) => {
    if (!element || !TouchDragManager.isTouchDevice()) return

    return touchDragManager.initializeTouchDrag(element, options)
  }
}