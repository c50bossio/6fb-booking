'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
  containerId?: string
}

export function Portal({ children, containerId = 'portal-root' }: PortalProps) {
  const [mounted, setMounted] = useState(false)
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Create or get the portal container
    let element = document.getElementById(containerId)
    
    if (!element) {
      element = document.createElement('div')
      element.id = containerId
      element.style.position = 'absolute'
      element.style.top = '0'
      element.style.left = '0'
      element.style.zIndex = '99999'
      element.style.pointerEvents = 'none'
      document.body.appendChild(element)
    }
    
    setPortalElement(element)
    setMounted(true)

    return () => {
      // Don't remove the portal element on unmount as it might be used by other portals
    }
  }, [containerId])

  if (!mounted || !portalElement) {
    return null
  }

  return createPortal(
    <div style={{ pointerEvents: 'auto' }}>
      {children}
    </div>,
    portalElement
  )
}