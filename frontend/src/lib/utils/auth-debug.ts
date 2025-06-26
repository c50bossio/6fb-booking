/**
 * Auth debugging utilities for development
 */

interface AuthState {
  hasUser: boolean
  isLoading: boolean
  pathname: string
}

export const debugAuthState = (component: string, state: AuthState) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${component}] Auth State:`, {
      hasUser: state.hasUser,
      isLoading: state.isLoading,
      pathname: state.pathname,
      timestamp: new Date().toISOString()
    })
  }
}

export const debugRedirect = (
  component: string,
  fromPath: string,
  toPath: string,
  reason: string
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${component}] Redirect:`, {
      from: fromPath,
      to: toPath,
      reason,
      timestamp: new Date().toISOString()
    })
  }
}

export default { debugAuthState, debugRedirect }
