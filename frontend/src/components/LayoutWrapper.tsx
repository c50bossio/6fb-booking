'use client'

import React from 'react'
import { useAuth } from '@/components/AuthProvider'
import { ConditionalLayout } from '@/components/layouts'

interface LayoutWrapperProps {
  children: React.ReactNode
}

/**
 * LayoutWrapper component that bridges the server-side layout with client-side auth data
 * This component is necessary because:
 * 1. Root layout is a server component
 * 2. ConditionalLayout needs client-side auth data from useAuth hook
 * 3. We need to pass user data and logout function to ConditionalLayout
 */
export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { user, logout } = useAuth()

  return (
    <ConditionalLayout
      user={user ? {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        role: user.role || ''
      } : undefined}
      onLogout={logout}
    >
      {children}
    </ConditionalLayout>
  )
}
