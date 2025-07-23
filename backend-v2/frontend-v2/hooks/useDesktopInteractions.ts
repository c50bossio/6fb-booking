'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useKeyboardShortcuts, type KeyboardShortcut } from './useKeyboardShortcuts'

interface ContextMenuItem {
  label: string
  action: () => void
  icon?: React.ComponentType<{ className?: string }>
  separator?: boolean
  disabled?: boolean
  shortcut?: string
}

interface DesktopInteractionsOptions {
  enableContextMenu?: boolean
  enableEnhancedHover?: boolean
  enableKeyboardNavigation?: boolean
  contextMenuItems?: ContextMenuItem[]
}

export function useDesktopInteractions(
  element: React.RefObject<HTMLElement>,
  options: DesktopInteractionsOptions = {}
) {
  const {
    enableContextMenu = true,
    enableEnhancedHover = true,
    enableKeyboardNavigation = true,
    contextMenuItems = []
  } = options

  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!enableContextMenu || contextMenuItems.length === 0) return

    e.preventDefault()
    
    const x = e.clientX
    const y = e.clientY
    
    // Ensure context menu stays within viewport
    const menuWidth = 200
    const menuHeight = contextMenuItems.length * 40
    
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y
    
    setContextMenuPosition({ x: adjustedX, y: adjustedY })
    setShowContextMenu(true)
  }, [enableContextMenu, contextMenuItems])

  // Handle mouse hover
  const handleMouseEnter = useCallback(() => {
    if (enableEnhancedHover) {
      setIsHovered(true)
    }
  }, [enableEnhancedHover])

  const handleMouseLeave = useCallback(() => {
    if (enableEnhancedHover) {
      setIsHovered(false)
    }
  }, [enableEnhancedHover])

  // Handle clicks outside context menu
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
      setShowContextMenu(false)
    }
  }, [])

  // Handle escape key
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showContextMenu) {
      setShowContextMenu(false)
    }
  }, [showContextMenu])

  // Set up event listeners
  useEffect(() => {
    const el = element.current
    if (!el) return

    if (enableContextMenu) {
      el.addEventListener('contextmenu', handleContextMenu)
    }
    
    if (enableEnhancedHover) {
      el.addEventListener('mouseenter', handleMouseEnter)
      el.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      el.removeEventListener('contextmenu', handleContextMenu)
      el.removeEventListener('mouseenter', handleMouseEnter)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [element, handleContextMenu, handleMouseEnter, handleMouseLeave, enableContextMenu, enableEnhancedHover])

  // Handle global clicks and escape when context menu is open
  useEffect(() => {
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
      
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [showContextMenu, handleClickOutside, handleEscapeKey])

  // Context menu component factory
  const createContextMenu = useCallback(() => {
    if (!showContextMenu || contextMenuItems.length === 0) return null

    const menuElement = document.createElement('div')
    menuElement.className = 'desktop-context-menu'
    menuElement.style.left = `${contextMenuPosition.x}px`
    menuElement.style.top = `${contextMenuPosition.y}px`
    menuElement.setAttribute('role', 'menu')
    menuElement.setAttribute('aria-label', 'Context menu')
    
    contextMenuItems.forEach((item, index) => {
      if (item.separator) {
        const separator = document.createElement('div')
        separator.className = 'context-menu-separator'
        menuElement.appendChild(separator)
      } else {
        const button = document.createElement('button')
        button.className = `context-menu-item ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`
        button.disabled = !!item.disabled
        button.setAttribute('role', 'menuitem')
        button.tabIndex = 0
        
        if (item.icon) {
          // For now, just add text content - in a real implementation, you'd render the icon
          button.textContent = item.label
        } else {
          button.textContent = item.label
        }
        
        if (item.shortcut) {
          const shortcut = document.createElement('kbd')
          shortcut.className = 'kbd-enhanced'
          shortcut.textContent = item.shortcut
          button.appendChild(shortcut)
        }
        
        button.onclick = () => {
          if (!item.disabled) {
            item.action()
            setShowContextMenu(false)
          }
        }
        
        menuElement.appendChild(button)
      }
    })
    
    return menuElement
  }, [showContextMenu, contextMenuItems, contextMenuPosition])

  // Context menu render function
  const ContextMenu = useCallback(() => {
    return null // Return null as we handle context menu via DOM manipulation
  }, [])

  return {
    isHovered,
    showContextMenu,
    ContextMenu,
    closeContextMenu: () => setShowContextMenu(false)
  }
}

// Enhanced keyboard navigation for lists and grids
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    itemSelector?: string
    direction?: 'horizontal' | 'vertical' | 'grid'
    loop?: boolean
    autoFocus?: boolean
  } = {}
) {
  const {
    itemSelector = '[tabindex]',
    direction = 'vertical',
    loop = true,
    autoFocus = false
  } = options

  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState<HTMLElement[]>([])

  // Update items list when container changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateItems = () => {
      const foundItems = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[]
      setItems(foundItems)
      
      if (autoFocus && foundItems.length > 0 && currentIndex < foundItems.length) {
        foundItems[currentIndex]?.focus()
      }
    }

    updateItems()
    
    // Use MutationObserver to watch for changes
    const observer = new MutationObserver(updateItems)
    observer.observe(container, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [containerRef, itemSelector, autoFocus, currentIndex])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (items.length === 0) return

    let nextIndex = currentIndex

    switch (e.key) {
      case 'ArrowDown':
        if (direction === 'vertical' || direction === 'grid') {
          e.preventDefault()
          nextIndex = currentIndex + 1
        }
        break
        
      case 'ArrowUp':
        if (direction === 'vertical' || direction === 'grid') {
          e.preventDefault()
          nextIndex = currentIndex - 1
        }
        break
        
      case 'ArrowRight':
        if (direction === 'horizontal' || direction === 'grid') {
          e.preventDefault()
          nextIndex = currentIndex + 1
        }
        break
        
      case 'ArrowLeft':
        if (direction === 'horizontal' || direction === 'grid') {
          e.preventDefault()
          nextIndex = currentIndex - 1
        }
        break
        
      case 'Home':
        e.preventDefault()
        nextIndex = 0
        break
        
      case 'End':
        e.preventDefault()
        nextIndex = items.length - 1
        break
    }

    // Handle looping or clamping
    if (nextIndex < 0) {
      nextIndex = loop ? items.length - 1 : 0
    } else if (nextIndex >= items.length) {
      nextIndex = loop ? 0 : items.length - 1
    }

    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex)
      items[nextIndex]?.focus()
    }
  }, [items, currentIndex, direction, loop])

  // Set up keyboard event listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, handleKeyDown])

  return {
    currentIndex,
    setCurrentIndex,
    items,
    focusItem: (index: number) => {
      if (index >= 0 && index < items.length) {
        setCurrentIndex(index)
        items[index]?.focus()
      }
    }
  }
}

// Global desktop interaction shortcuts
export function useGlobalDesktopShortcuts() {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'F1',
      action: () => {
        // Open help or keyboard shortcuts modal
        console.log('Help shortcuts')
      },
      description: 'Show keyboard shortcuts',
      section: 'Help'
    },
    {
      key: 'Tab',
      ctrlKey: true,
      action: () => {
        // Navigate between main sections
        console.log('Navigate sections')
      },
      description: 'Navigate between sections',
      section: 'Navigation'
    }
  ]

  // Return the hook result instead of calling it at module level
  return useKeyboardShortcuts(shortcuts, true)
}

export default useDesktopInteractions