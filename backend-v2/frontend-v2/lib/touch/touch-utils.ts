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
  
  // Enhanced multi-touch support
  private multiTouchState = {
    touchPoints: new Map<number, TouchPosition>(),
    isPinching: false,
    initialPinchDistance: 0,
    currentScale: 1,
    magneticSnapZones: [] as HTMLElement[]
  }
  
  // Magnetic snap zones configuration
  private snapConfig = {
    enabled: true,
    snapDistance: 25, // pixels
    snapAnimation: true,
    magneticStrength: 0.3 // 0-1, how strongly it pulls to snap zones
  }

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
            if ('vibrate' in navigator) {
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

      // Handle multi-touch gestures
      if (this.handleMultiTouchGesture(e.touches)) {
        e.preventDefault()
        return
      }

      // Handle drag movement if already dragging
      if (this.dragState.isDragging) {
        this.updateDragWithSnapping(currentPosition, options.getDropTarget)
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

    // Create enhanced ghost element for visual feedback
    this.createEnhancedGhostElement(element, position)

    // Add visual feedback to original element
    element.style.opacity = '0.5'
    element.style.transform = 'scale(0.95)'
    element.classList.add('touch-dragging')

    // Add global styles for drag state
    document.body.classList.add('touch-drag-active')
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
    document.body.classList.remove('touch-drag-active')
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

    document.body.appendChild(ghost)
    this.ghostElement = ghost
  }

  private getElementUnderPoint(position: TouchPosition): HTMLElement | null {
    // Temporarily hide ghost element to get element underneath
    const originalDisplay = this.ghostElement?.style.display
    if (this.ghostElement) {
      this.ghostElement.style.display = 'none'
    }

    const element = document.elementFromPoint(position.clientX, position.clientY) as HTMLElement

    // Restore ghost element
    if (this.ghostElement && originalDisplay !== undefined) {
      this.ghostElement.style.display = originalDisplay
    }

    return element
  }

  /**
   * Add magnetic snap zone for enhanced drag targeting
   */
  addMagneticSnapZone(element: HTMLElement): void {
    if (!this.multiTouchState.magneticSnapZones.includes(element)) {
      this.multiTouchState.magneticSnapZones.push(element)
      element.classList.add('appointment-magnetic-snap')
    }
  }

  /**
   * Remove magnetic snap zone
   */
  removeMagneticSnapZone(element: HTMLElement): void {
    const index = this.multiTouchState.magneticSnapZones.indexOf(element)
    if (index > -1) {
      this.multiTouchState.magneticSnapZones.splice(index, 1)
      element.classList.remove('appointment-magnetic-snap', 'snap-active')
    }
  }

  /**
   * Find nearest magnetic snap zone
   */
  private findMagneticSnapZone(position: TouchPosition): HTMLElement | null {
    if (!this.snapConfig.enabled) return null

    let closestZone: HTMLElement | null = null
    let closestDistance = this.snapConfig.snapDistance

    for (const zone of this.multiTouchState.magneticSnapZones) {
      const rect = zone.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const distance = Math.sqrt(
        Math.pow(position.clientX - centerX, 2) + 
        Math.pow(position.clientY - centerY, 2)
      )

      if (distance < closestDistance) {
        closestDistance = distance
        closestZone = zone
      }
    }

    // Apply magnetic snapping effect
    if (closestZone) {
      const rect = closestZone.getBoundingClientRect()
      const magneticStrength = this.snapConfig.magneticStrength
      
      // Calculate magnetic pull
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const adjustedPosition = {
        ...position,
        clientX: position.clientX + (centerX - position.clientX) * magneticStrength,
        clientY: position.clientY + (centerY - position.clientY) * magneticStrength
      }

      return closestZone
    }

    return null
  }

  /**
   * Enhanced updateDrag with magnetic snapping
   */
  private updateDragWithSnapping(position: TouchPosition, getDropTarget?: (position: TouchPosition) => HTMLElement | null) {
    if (!this.dragState.isDragging || !this.ghostElement) return

    // Check for magnetic snap zones first
    const snapZone = this.findMagneticSnapZone(position)
    let finalPosition = position

    if (snapZone) {
      // Apply magnetic snapping
      const rect = snapZone.getBoundingClientRect()
      finalPosition = {
        ...position,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      }
      
      // Add visual feedback
      snapZone.classList.add('snap-active')
      
      // Provide haptic feedback for snap
      if ('vibrate' in navigator) {
        navigator.vibrate(15)
      }
    }

    // Update ghost element position
    this.ghostElement.style.left = `${finalPosition.clientX - 50}px`
    this.ghostElement.style.top = `${finalPosition.clientY - 25}px`

    // Find drop target
    const previousDropTarget = this.dragState.dropTarget
    this.dragState.dropTarget = snapZone || getDropTarget?.(finalPosition) || this.getElementUnderPoint(finalPosition)

    // Update drop target visual feedback
    if (previousDropTarget !== this.dragState.dropTarget) {
      // Clear previous snap states
      this.multiTouchState.magneticSnapZones.forEach(zone => {
        zone.classList.remove('snap-active')
      })
      
      if (previousDropTarget) {
        previousDropTarget.classList.remove('touch-drag-over')
      }
      if (this.dragState.dropTarget) {
        this.dragState.dropTarget.classList.add('touch-drag-over')
        if (snapZone) {
          snapZone.classList.add('snap-active')
        }
      }
    }
  }

  /**
   * Multi-touch gesture support
   */
  private handleMultiTouchGesture(touches: TouchList): boolean {
    if (touches.length === 2) {
      const touch1 = touches[0]
      const touch2 = touches[1]
      
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )

      if (!this.multiTouchState.isPinching) {
        this.multiTouchState.isPinching = true
        this.multiTouchState.initialPinchDistance = currentDistance
      }

      const scale = currentDistance / this.multiTouchState.initialPinchDistance
      this.multiTouchState.currentScale = Math.max(0.5, Math.min(3.0, scale))

      // Emit pinch event if needed
      return true
    } else {
      this.multiTouchState.isPinching = false
    }
    
    return false
  }

  /**
   * Enhanced createGhostElement with better visual feedback
   */
  private createEnhancedGhostElement(element: HTMLElement, position: TouchPosition) {
    const ghost = element.cloneNode(true) as HTMLElement
    
    // Enhanced styling for premium feel
    ghost.style.position = 'fixed'
    ghost.style.left = `${position.clientX - 50}px`
    ghost.style.top = `${position.clientY - 25}px`
    ghost.style.width = `${element.offsetWidth}px`
    ghost.style.height = `${element.offsetHeight}px`
    ghost.style.pointerEvents = 'none'
    ghost.style.zIndex = '9999'
    ghost.style.opacity = '0.9'
    ghost.style.transform = 'scale(1.05) rotate(2deg)'
    ghost.style.borderRadius = '8px'
    ghost.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.25)'
    ghost.style.filter = 'brightness(1.1) saturate(1.2)'
    ghost.style.border = '2px solid rgba(59, 130, 246, 0.5)'
    ghost.classList.add('touch-drag-ghost')

    // Add pulsing animation
    ghost.style.animation = 'ghost-pulse 0.4s ease-in-out infinite alternate'

    document.body.appendChild(ghost)
    this.ghostElement = ghost
  }

  /**
   * Check if device supports touch
   */
  static isTouchDevice(): boolean {
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