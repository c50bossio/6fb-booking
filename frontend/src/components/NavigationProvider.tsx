'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface NavigationContextValue {
  activePage: string
  setActivePage: (page: string) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [activePage, setActivePage] = useState('/')
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setActivePage(pathname)
  }, [pathname])

  return (
    <NavigationContext.Provider value={{ 
      activePage, 
      setActivePage, 
      isCollapsed, 
      setIsCollapsed 
    }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}