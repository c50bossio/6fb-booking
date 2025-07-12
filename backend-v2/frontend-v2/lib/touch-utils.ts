// Touch utilities for calendar interactions

export class TouchDragManager {
  private startX = 0
  private startY = 0
  private currentX = 0
  private currentY = 0
  private isDragging = false
  private threshold = 10

  constructor(
    private onDragStart?: (x: number, y: number) => void,
    private onDragMove?: (deltaX: number, deltaY: number) => void,
    private onDragEnd?: (deltaX: number, deltaY: number) => void
  ) {}

  handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 1) return

    this.startX = e.touches[0].clientX
    this.startY = e.touches[0].clientY
    this.currentX = this.startX
    this.currentY = this.startY
    this.isDragging = false

    this.onDragStart?.(this.startX, this.startY)
  }

  handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 1) return

    this.currentX = e.touches[0].clientX
    this.currentY = e.touches[0].clientY

    const deltaX = this.currentX - this.startX
    const deltaY = this.currentY - this.startY

    if (!this.isDragging && (Math.abs(deltaX) > this.threshold || Math.abs(deltaY) > this.threshold)) {
      this.isDragging = true
    }

    if (this.isDragging) {
      e.preventDefault()
      this.onDragMove?.(deltaX, deltaY)
    }
  }

  handleTouchEnd = (e: TouchEvent) => {
    if (!this.isDragging) return

    const deltaX = this.currentX - this.startX
    const deltaY = this.currentY - this.startY

    this.onDragEnd?.(deltaX, deltaY)
    this.isDragging = false
  }

  attach(element: HTMLElement) {
    element.addEventListener('touchstart', this.handleTouchStart, { passive: true })
    element.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    element.addEventListener('touchend', this.handleTouchEnd, { passive: true })
  }

  detach(element: HTMLElement) {
    element.removeEventListener('touchstart', this.handleTouchStart)
    element.removeEventListener('touchmove', this.handleTouchMove)
    element.removeEventListener('touchend', this.handleTouchEnd)
  }
}

export const touchDragManager = new TouchDragManager()