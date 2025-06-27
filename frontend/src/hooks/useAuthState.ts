import { useEffect, useState, useCallback } from 'react';
import { authStateManager, subscribeToAuthChanges, type AuthState } from '@/lib/auth/authStateManager';
import { authService } from '@/lib/api/auth';

/**
 * Hook for using the centralized auth state manager
 * Provides stable auth state and methods to interact with it
 */
export function useAuthState() {
  const [authState, setAuthState] = useState<AuthState>(authStateManager.getAuthState());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges((newState) => {
      setAuthState(newState);
    });

    // Get initial state
    setAuthState(authStateManager.getAuthState());

    return unsubscribe;
  }, []);

  const checkAuth = useCallback(async () => {
    setIsChecking(true);
    try {
      const state = await authStateManager.checkAuthOnce(async () => {
        try {
          // Check if we have a token
          if (!authService.isAuthenticated()) {
            return null;
          }

          // Try to get current user
          const user = await authService.getCurrentUser();
          return {
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          };
        } catch (error: any) {
          console.error('[useAuthState] Auth check failed:', error);

          // Don't clear auth on network errors
          if (error.isNetworkError) {
            throw error; // Let the manager handle it
          }

          // For 401, user is not authenticated
          if (error.response?.status === 401) {
            return {
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Session expired'
            };
          }

          throw error;
        }
      });

      return state;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    authStateManager.debounceAuthChange(updates);
  }, []);

  const clearAuth = useCallback(() => {
    authStateManager.clearAuthState();
  }, []);

  const forceUpdate = useCallback((state: Partial<AuthState>) => {
    authStateManager.forceUpdateState(state);
  }, []);

  return {
    ...authState,
    isChecking,
    checkAuth,
    updateAuthState,
    clearAuth,
    forceUpdate
  };
}

/**
 * Hook for checking auth only once on mount
 * Useful for pages that need to verify auth state
 */
export function useAuthCheck() {
  const { checkAuth, isChecking } = useAuthState();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!hasChecked && !isChecking) {
      setHasChecked(true);
      checkAuth().catch(console.error);
    }
  }, [hasChecked, isChecking, checkAuth]);

  return { isChecking };
}

/**
 * Hook for requiring authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, isLoading, checkAuth } = useAuthState();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true);

      // Try one more auth check before redirecting
      checkAuth().then((state) => {
        if (!state?.isAuthenticated) {
          window.location.href = redirectTo;
        } else {
          setIsRedirecting(false);
        }
      });
    }
  }, [isLoading, isAuthenticated, isRedirecting, checkAuth, redirectTo]);

  return { isRedirecting };
}
