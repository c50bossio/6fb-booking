'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

// Square Web Payments SDK types
interface SquareCard {
  tokenize(): Promise<{ token: string; details: any }>
}

interface SquarePayments {
  card(): Promise<SquareCard>
}

interface Square {
  payments(appId: string, locationId: string): SquarePayments
}

declare global {
  interface Window {
    Square?: Square
  }
}

interface SquareContextType {
  square: Square | null
  isLoaded: boolean
  error: string | null
}

const SquareContext = createContext<SquareContextType>({
  square: null,
  isLoaded: false,
  error: null,
})

interface SquareProviderProps {
  children: React.ReactNode
}

export function SquareProvider({ children }: SquareProviderProps) {
  const [square, setSquare] = useState<Square | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSquareSDK = async () => {
      try {
        // Check if Square is already loaded
        if (window.Square) {
          setSquare(window.Square)
          setIsLoaded(true)
          return
        }

        // Load Square Web Payments SDK
        const script = document.createElement('script')
        script.src = 'https://web.squarecdn.com/v1/square.js'
        script.async = true

        script.onload = () => {
          if (window.Square) {
            setSquare(window.Square)
            setIsLoaded(true)
          } else {
            setError('Square SDK failed to load')
          }
        }

        script.onerror = () => {
          setError('Failed to load Square SDK')
        }

        document.head.appendChild(script)

        // Cleanup function
        return () => {
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
        }
      } catch (err) {
        setError('Error loading Square SDK')
        console.error('Square SDK load error:', err)
      }
    }

    loadSquareSDK()
  }, [])

  const value = {
    square,
    isLoaded,
    error,
  }

  return (
    <SquareContext.Provider value={value}>
      {children}
    </SquareContext.Provider>
  )
}

export function useSquare() {
  const context = useContext(SquareContext)
  if (!context) {
    throw new Error('useSquare must be used within a SquareProvider')
  }
  return context
}

export { SquareContext }
