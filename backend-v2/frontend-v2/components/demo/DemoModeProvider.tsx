'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { generateMockData } from '@/lib/demo/mockData'

interface DemoUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  timezone: string
}

interface DemoContextType {
  user: DemoUser
  mockData: ReturnType<typeof generateMockData>
  resetData: () => void
  isDemo: boolean
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

export function useDemoMode() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider')
  }
  return context
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [mockData, setMockData] = useState(() => generateMockData())

  // Demo user with barber role for full access
  const demoUser: DemoUser = {
    id: 1,
    email: 'demo@6fb.com',
    first_name: 'Demo',
    last_name: 'Barber',
    role: 'barber',
    timezone: 'America/New_York'
  }

  const resetData = () => {
    setMockData(generateMockData())
  }

  // Show demo notification on mount
  useEffect(() => {
    console.log('🎭 Demo Mode Active - Using mock data')
  }, [])

  return (
    <DemoContext.Provider
      value={{
        user: demoUser,
        mockData,
        resetData,
        isDemo: true
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}