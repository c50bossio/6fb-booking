/**
 * Authentication hook
 */
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/api'
import type { User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = authService.getStoredUser()
    if (storedUser && authService.isAuthenticated()) {
      setUser(storedUser)
      // Optionally verify token is still valid
      authService.getCurrentUser()
        .then(setUser)
        .catch(() => {
          // Token invalid, clear auth
          authService.logout()
        })
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authService.login({ username: email, password })
    setUser(response.user)
    router.push('/')
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
    router.push('/login')
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    return authService.hasPermission(permission)
  }

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false
    return authService.hasRole(role)
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRole?: string | string[]
    requiredPermission?: string
    redirectTo?: string
  }
) {
  return function ProtectedComponent(props: P) {
    const { user, isLoading, hasRole, hasPermission } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading) {
        if (!user) {
          router.push(options?.redirectTo || '/login')
        } else if (options?.requiredRole && !hasRole(options.requiredRole)) {
          router.push('/unauthorized')
        } else if (options?.requiredPermission && !hasPermission(options.requiredPermission)) {
          router.push('/unauthorized')
        }
      }
    }, [user, isLoading, router])

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p>Loading...</p>
          </div>
        </div>
      )
    }

    if (!user) {
      return null
    }

    if (options?.requiredRole && !hasRole(options.requiredRole)) {
      return null
    }

    if (options?.requiredPermission && !hasPermission(options.requiredPermission)) {
      return null
    }

    return <Component {...props} />
  }
}