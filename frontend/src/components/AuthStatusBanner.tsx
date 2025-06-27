'use client'

import { useAuth } from './AuthProvider'
import { useTheme } from '@/contexts/ThemeContext'

interface AuthStatusBannerProps {
  showDemoModeInfo?: boolean
  showBackendStatus?: boolean
  className?: string
}

export default function AuthStatusBanner({
  showDemoModeInfo = true,
  showBackendStatus = true,
  className = ''
}: AuthStatusBannerProps) {
  // Since there's no demo mode, this component should always return null
  // Keeping it for compatibility but it does nothing
  return null
}
