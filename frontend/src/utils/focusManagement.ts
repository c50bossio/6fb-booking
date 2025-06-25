/**
 * Focus Management Utilities for Calendar Keyboard Navigation
 */

export interface FocusableElement {
  element: HTMLElement
  type: 'timeSlot' | 'appointment' | 'control' | 'date'
  date?: string
  time?: string
  appointmentId?: string
  controlId?: string
  row?: number
  col?: number
}

/**
 * Get all focusable elements in the calendar
 */
export function getFocusableElements(container: HTMLElement): FocusableElement[] {
  const elements: FocusableElement[] = []

  // Time slots
  const timeSlots = container.querySelectorAll('[data-time-slot]')
  timeSlots.forEach((element) => {
    const data = (element as HTMLElement).dataset.timeSlot?.split('-') || []
    if (data.length >= 2) {
      elements.push({
        element: element as HTMLElement,
        type: 'timeSlot',
        date: data.slice(0, 3).join('-'),
        time: data.slice(3).join('-')
      })
    }
  })

  // Appointments
  const appointments = container.querySelectorAll('[data-appointment-id]')
  appointments.forEach((element) => {
    elements.push({
      element: element as HTMLElement,
      type: 'appointment',
      appointmentId: (element as HTMLElement).dataset.appointmentId
    })
  })

  // Controls (buttons, etc.)
  const controls = container.querySelectorAll('[data-control-id]')
  controls.forEach((element) => {
    elements.push({
      element: element as HTMLElement,
      type: 'control',
      controlId: (element as HTMLElement).dataset.controlId
    })
  })

  // Date cells
  const dates = container.querySelectorAll('[data-date]')
  dates.forEach((element) => {
    elements.push({
      element: element as HTMLElement,
      type: 'date',
      date: (element as HTMLElement).dataset.date
    })
  })

  return elements
}

/**
 * Build a 2D grid representation of focusable elements
 */
export function buildFocusGrid(elements: FocusableElement[]): FocusableElement[][] {
  // Group elements by their visual position
  const rows = new Map<number, FocusableElement[]>()

  elements.forEach((element) => {
    const rect = element.element.getBoundingClientRect()
    const rowKey = Math.floor(rect.top)

    if (!rows.has(rowKey)) {
      rows.set(rowKey, [])
    }

    rows.get(rowKey)!.push({
      ...element,
      row: rowKey,
      col: Math.floor(rect.left)
    })
  })

  // Sort rows by vertical position
  const sortedRows = Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([_, elements]) =>
      // Sort elements within each row by horizontal position
      elements.sort((a, b) => (a.col || 0) - (b.col || 0))
    )

  return sortedRows
}

/**
 * Navigate in a grid pattern
 */
export function navigateGrid(
  currentElement: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right',
  elements: FocusableElement[]
): HTMLElement | null {
  const grid = buildFocusGrid(elements)

  // Find current element in grid
  let currentRow = -1
  let currentCol = -1

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col].element === currentElement) {
        currentRow = row
        currentCol = col
        break
      }
    }
    if (currentRow !== -1) break
  }

  if (currentRow === -1) return null

  let newRow = currentRow
  let newCol = currentCol

  switch (direction) {
    case 'up':
      newRow = Math.max(0, currentRow - 1)
      break
    case 'down':
      newRow = Math.min(grid.length - 1, currentRow + 1)
      break
    case 'left':
      newCol = Math.max(0, currentCol - 1)
      break
    case 'right':
      newCol = Math.min(grid[newRow].length - 1, currentCol + 1)
      break
  }

  // Handle row changes for left/right navigation
  if (direction === 'left' && newCol === currentCol && currentCol === 0 && newRow > 0) {
    newRow--
    newCol = grid[newRow].length - 1
  } else if (direction === 'right' && newCol === currentCol && currentCol === grid[currentRow].length - 1 && newRow < grid.length - 1) {
    newRow++
    newCol = 0
  }

  return grid[newRow]?.[newCol]?.element || null
}

/**
 * Focus trap for modals
 */
export function createFocusTrap(container: HTMLElement) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ]

  const focusableElements = container.querySelectorAll(focusableSelectors.join(','))
  const firstFocusable = focusableElements[0] as HTMLElement
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

  // Focus first element
  firstFocusable?.focus()

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Restore focus after modal close
 */
export function restoreFocus(previouslyFocused: HTMLElement | null) {
  if (previouslyFocused && document.body.contains(previouslyFocused)) {
    previouslyFocused.focus()
  }
}

/**
 * Get the nearest focusable ancestor
 */
export function getNearestFocusable(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement

  while (current && current !== document.body) {
    if (
      current.tabIndex >= 0 ||
      current.tagName === 'BUTTON' ||
      current.tagName === 'A' ||
      current.tagName === 'INPUT' ||
      current.tagName === 'SELECT' ||
      current.tagName === 'TEXTAREA'
    ) {
      return current
    }
    current = current.parentElement
  }

  return null
}

/**
 * Announce to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const liveRegion = document.getElementById('calendar-live-region') || createLiveRegion()
  liveRegion.setAttribute('aria-live', priority)
  liveRegion.textContent = message

  // Clear after announcement
  setTimeout(() => {
    liveRegion.textContent = ''
  }, 1000)
}

/**
 * Create live region for announcements
 */
function createLiveRegion(): HTMLElement {
  const region = document.createElement('div')
  region.id = 'calendar-live-region'
  region.className = 'sr-only'
  region.setAttribute('aria-live', 'polite')
  region.setAttribute('aria-atomic', 'true')
  document.body.appendChild(region)
  return region
}

/**
 * Check if element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  )
}

/**
 * Scroll element into view if needed
 */
export function scrollIntoViewIfNeeded(element: HTMLElement, container?: HTMLElement) {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container?.getBoundingClientRect() || {
    top: 0,
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth
  }

  const isInView = (
    elementRect.top >= containerRect.top &&
    elementRect.bottom <= containerRect.bottom &&
    elementRect.left >= containerRect.left &&
    elementRect.right <= containerRect.right
  )

  if (!isInView) {
    element.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth'
    })
  }
}
