/**
 * Centralized authentication error handling
 * Provides consistent behavior across components when auth fails
 */

import { NextRouter } from 'next/router'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export interface AuthError extends Error {
  status?: number
  response?: {
    status: number
  }
}

/**
 * Checks if an error is an authentication/authorization error
 */
export function isAuthError(error: any): boolean {
  if (!error) return false
  
  // Check status codes
  if (error.status === 401 || error.status === 403) return true
  if (error.response?.status === 401 || error.response?.status === 403) return true
  
  // Check error messages
  if (typeof error.message === 'string') {
    return error.message.includes('401') || 
           error.message.includes('403') ||
           error.message.includes('Authentication failed') ||
           error.message.includes('Access denied')
  }
  
  return false
}

/**
 * Handles authentication errors consistently across the app
 * Clears tokens and redirects to login when appropriate
 */
export function handleAuthError(
  error: any, 
  router: AppRouterInstance | NextRouter,
  options: {
    clearTokens?: boolean
    redirectToLogin?: boolean
    skipPublicRoutes?: boolean
  } = {}
): boolean {
  const {
    clearTokens = true,
    redirectToLogin = true,
    skipPublicRoutes = true
  } = options

  if (!isAuthError(error)) {
    return false
  }


  // Clear stored tokens and role information
  if (clearTokens && typeof window !== 'undefined') {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    // Clear cookies too
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
  }

  // Check if we should skip redirect for public routes
  if (skipPublicRoutes && typeof window !== 'undefined') {
    const publicRoutes = ['/', '/login', '/register', '/check-email', '/verify-email', '/book', '/privacy', '/terms', '/agents']
    const currentPath = window.location.pathname
    
    if (publicRoutes.includes(currentPath) || currentPath.startsWith('/agents/') || currentPath.startsWith('/verify-email/')) {
      return true
    }
  }

  // Redirect to login
  if (redirectToLogin) {
    const loginUrl = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
    router.push(loginUrl)
  }

  return true
}

/**
 * Creates a safe auth state for unauthenticated users
 * Returns null instead of fake user data
 */
export function createUnauthenticatedState() {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: 'Authentication required'
  }
}

/**
 * Checks if a route requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/login', 
    '/register',
    '/check-email',
    '/verify-email',
    '/book',
    '/privacy',
    '/terms',
    '/about',
    '/agents'
  ]
  
  return !publicRoutes.includes(pathname) && !pathname.startsWith('/agents/') && !pathname.startsWith('/verify-email/')
}

/**
 * Higher-order function to wrap async functions with auth error handling
 */
export function withAuthErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  router: AppRouterInstance | NextRouter
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args)
    } catch (error) {
      if (handleAuthError(error, router)) {
        return null
      }
      throw error
    }
  }
}