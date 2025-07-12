// Authentication error handling utilities

export const handleAuthError = (
  error: any, 
  router?: any, 
  options?: {
    clearTokens?: boolean
    redirectToLogin?: boolean
    skipPublicRoutes?: boolean
  }
) => {
  console.error('Auth error:', error)
  
  // Handle different types of auth errors
  if (error.status === 401) {
    // Unauthorized - redirect to login
    if (options?.redirectToLogin && router) {
      router.push('/login')
    } else {
      window.location.href = '/login'
    }
    return
  }
  
  if (error.status === 403) {
    // Forbidden - show access denied
    console.log('Access denied')
    return
  }
  
  // Generic error handling
  console.log('Authentication error occurred')
}

export const isProtectedRoute = (pathname: string): boolean => {
  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/calendar',
    '/clients',
    '/analytics',
    '/settings',
    '/appointments'
  ]
  
  return protectedRoutes.some(route => pathname.startsWith(route))
}

export const shouldRedirectToLogin = (pathname: string): boolean => {
  return isProtectedRoute(pathname)
}

export const getRedirectUrl = (pathname: string): string => {
  if (isProtectedRoute(pathname)) {
    return `/login?redirect=${encodeURIComponent(pathname)}`
  }
  return '/login'
}