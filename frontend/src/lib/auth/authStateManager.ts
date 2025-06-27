/**
 * Authentication State Manager
 *
 * Singleton manager to handle authentication state, prevent race conditions,
 * and provide centralized auth state management with event-based notifications.
 */

import { User } from '@/types/user';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastChecked: Date | null;
}

type AuthStateListener = (state: AuthState) => void;

class AuthStateManager {
  private static instance: AuthStateManager;
  private authState: AuthState;
  private listeners: Set<AuthStateListener>;
  private authCheckPromise: Promise<AuthState> | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 300; // ms
  private readonly MIN_CHECK_INTERVAL = 1000; // ms

  private constructor() {
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      lastChecked: null,
    };
    this.listeners = new Set();
  }

  static getInstance(): AuthStateManager {
    if (!AuthStateManager.instance) {
      AuthStateManager.instance = new AuthStateManager();
    }
    return AuthStateManager.instance;
  }

  /**
   * Get current authentication state
   */
  getAuthState(): Readonly<AuthState> {
    return { ...this.authState };
  }

  /**
   * Check authentication status (ensures only one check runs at a time)
   */
  async checkAuthOnce(authCheckFn: () => Promise<User | null>): Promise<AuthState> {
    // If a check is already in progress, return the existing promise
    if (this.authCheckPromise) {
      return this.authCheckPromise;
    }

    // Check if we recently performed an auth check
    if (this.authState.lastChecked) {
      const timeSinceLastCheck = Date.now() - this.authState.lastChecked.getTime();
      if (timeSinceLastCheck < this.MIN_CHECK_INTERVAL) {
        return this.authState;
      }
    }

    // Start new auth check
    this.authCheckPromise = this.performAuthCheck(authCheckFn);

    try {
      const result = await this.authCheckPromise;
      return result;
    } finally {
      this.authCheckPromise = null;
    }
  }

  private async performAuthCheck(authCheckFn: () => Promise<User | null>): Promise<AuthState> {
    // Update loading state
    this.updateState({ isLoading: true });

    try {
      const user = await authCheckFn();

      const newState: AuthState = {
        user,
        isAuthenticated: !!user,
        isLoading: false,
        lastChecked: new Date(),
      };

      this.updateState(newState);
      return newState;
    } catch (error) {
      console.error('Auth check failed:', error);

      const errorState: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        lastChecked: new Date(),
      };

      this.updateState(errorState);
      return errorState;
    }
  }

  /**
   * Debounce authentication state changes to prevent rapid updates
   */
  debounceAuthChange(newState: Partial<AuthState>): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.updateState(newState);
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribeToAuthChanges(listener: AuthStateListener): () => void {
    this.listeners.add(listener);

    // Immediately notify the new listener of current state
    listener(this.getAuthState());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear authentication state safely
   */
  clearAuthState(): void {
    // Cancel any pending debounced updates
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Cancel any in-progress auth checks
    this.authCheckPromise = null;

    const clearedState: AuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      lastChecked: new Date(),
    };

    this.updateState(clearedState);
  }

  /**
   * Force update authentication state (bypasses debouncing)
   */
  forceUpdateState(newState: Partial<AuthState>): void {
    // Cancel any pending debounced updates
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.updateState(newState);
  }

  /**
   * Update state and notify listeners
   */
  private updateState(newState: Partial<AuthState>): void {
    const previousState = { ...this.authState };
    this.authState = { ...this.authState, ...newState };

    // Only notify if state actually changed
    if (this.hasStateChanged(previousState, this.authState)) {
      this.notifyListeners();
    }
  }

  /**
   * Check if state has materially changed
   */
  private hasStateChanged(prev: AuthState, current: AuthState): boolean {
    return (
      prev.isAuthenticated !== current.isAuthenticated ||
      prev.isLoading !== current.isLoading ||
      prev.user?.id !== current.user?.id
    );
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const currentState = this.getAuthState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Get singleton instance (convenience method)
   */
  static get(): AuthStateManager {
    return AuthStateManager.getInstance();
  }
}

// Export singleton instance
export const authStateManager = AuthStateManager.getInstance();

// Export convenience functions
export const checkAuthOnce = (authCheckFn: () => Promise<User | null>) =>
  authStateManager.checkAuthOnce(authCheckFn);

export const debounceAuthChange = (newState: Partial<AuthState>) =>
  authStateManager.debounceAuthChange(newState);

export const subscribeToAuthChanges = (listener: AuthStateListener) =>
  authStateManager.subscribeToAuthChanges(listener);

export const getAuthState = () =>
  authStateManager.getAuthState();

export const clearAuthState = () =>
  authStateManager.clearAuthState();

export const forceUpdateAuthState = (newState: Partial<AuthState>) =>
  authStateManager.forceUpdateState(newState);
