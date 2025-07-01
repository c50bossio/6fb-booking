'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function RemoveDarkSlateBar() {
  const pathname = usePathname()
  
  useEffect(() => {
    // Only run on the homepage
    if (pathname !== '/') return
    
    // Function to remove any dark slate bar with BookBarber text
    const removeSlateBar = () => {
      // Look for any element with BookBarber text that's not in the sidebar
      const allElements = document.querySelectorAll('*')
      
      allElements.forEach(element => {
        // Skip if it's part of the sidebar
        if (element.closest('.sidebar-dark') || 
            element.closest('.sidebar-light') || 
            element.closest('.sidebar-charcoal') ||
            element.closest('[class*="w-72"]') ||
            element.closest('[class*="w-20"]')) {
          return
        }
        
        // Check if this specific element has the text (not its children)
        const directText = Array.from(element.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join('')
        
        if (directText.includes('BookBarber') || directText.includes('BookedBarber')) {
          // Get the top-level container
          let container = element as HTMLElement
          while (container.parentElement && container.parentElement !== document.body) {
            container = container.parentElement
          }
          
          // Check if it's styled like a dark slate bar
          const style = window.getComputedStyle(container)
          const bgColor = style.backgroundColor
          const isDarkSlate = 
            bgColor.includes('rgb(71, 85, 105)') || // slate-600
            bgColor.includes('rgb(51, 65, 85)') ||  // slate-700
            bgColor.includes('rgb(30, 41, 59)') ||  // slate-800
            bgColor.includes('rgb(15, 23, 42)') ||  // slate-900
            bgColor.includes('rgb(100, 116, 139)') || // slate-500
            container.className.includes('slate') ||
            container.className.includes('bg-slate')
          
          // Check if it's positioned at the top
          const isTopBar = 
            container.offsetTop === 0 || 
            style.position === 'fixed' || 
            style.position === 'sticky' ||
            container.getBoundingClientRect().top <= 50
          
          if (isDarkSlate && isTopBar) {
            console.log('Found and removing dark slate bar with BookBarber text:', {
              text: directText.trim(),
              className: container.className,
              bgColor: bgColor,
              position: style.position,
              top: container.getBoundingClientRect().top
            })
            container.style.display = 'none'
            container.remove()
            return
          }
        }
      })
      
      // Also look for any dark slate colored bar at the very top
      const topElements = Array.from(document.body.children).slice(0, 3)
      topElements.forEach(element => {
        const el = element as HTMLElement
        if (el.className.includes('slate') || 
            el.className.includes('bg-slate') ||
            window.getComputedStyle(el).backgroundColor.includes('rgb(')) {
          const rect = el.getBoundingClientRect()
          if (rect.height < 100 && rect.top <= 0 && 
              !el.querySelector('nav') && 
              !el.querySelector('header')) {
            console.log('Removing potential slate bar at top:', el.className)
            el.remove()
          }
        }
      })
    }
    
    // Run immediately
    removeSlateBar()
    
    // Run again after a short delay to catch dynamically added elements
    const timeout = setTimeout(removeSlateBar, 100)
    
    // Also run when DOM changes
    const observer = new MutationObserver(() => {
      removeSlateBar()
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    // Cleanup
    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [])
  
  return null
}