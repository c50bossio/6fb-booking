'use client'

import { useEffect } from 'react'

export function AuthDebugLoader() {
  useEffect(() => {
    // Load auth debug tools in development
    if (process.env.NODE_ENV === 'development') {
      import('@/lib/auth-debug').then(() => {
        console.log('Auth debug tools loaded. Use window.authDebug.checkStatus() to diagnose issues.')
      })
    }
  }, [])
  
  return null
}