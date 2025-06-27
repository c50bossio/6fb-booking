"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/lib/api/auth";
import type { User } from "@/lib/api/client";
import { smartStorage } from "@/lib/utils/storage";
import { authMigration } from "@/lib/utils/auth-migration";
import { debugAuthState, debugRedirect } from "@/lib/utils/auth-debug";
import { isPublicRoute, isDashboardRoute } from "@/utils/routeClassification";
import { authStateManager } from "@/lib/auth/authStateManager";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  authError: string | null;
  backendAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  enableDemoMode: (reason?: string) => void;
  disableDemoMode: () => void;
  clearAuthError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Track if component is mounted to prevent state updates on unmounted components
  const isMountedRef = React.useRef(true);

  // Safe state update wrapper
  const safeSetState = <T extends any>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    value: T | ((prev: T) => T),
    name: string,
  ) => {
    if (isMountedRef.current && typeof setter === "function") {
      try {
        setter(value);
      } catch (error) {
        console.error(`[AuthProvider] Failed to update ${name}:`, error);
      }
    } else if (!isMountedRef.current) {
      console.warn(
        `[AuthProvider] Attempted to update ${name} on unmounted component`,
      );
    } else {
      console.error(
        `[AuthProvider] State setter for ${name} is not a function`,
      );
    }
  };

  useEffect(() => {
    setIsClient(true);

    // Check if demo mode was previously enabled
    if (typeof window !== "undefined") {
      const demoMode = sessionStorage.getItem("demo_mode") === "true";
      safeSetState(setIsDemoMode, demoMode, "isDemoMode");
      if (demoMode) {
        safeSetState(setAuthError, null, "authError"); // Clear errors in demo mode
      }
    }

    // Cleanup function
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;

      // Clear any pending auth restore timeouts
      if ((window as any)._authRestoreTimeout) {
        clearTimeout((window as any)._authRestoreTimeout);
        delete (window as any)._authRestoreTimeout;
      }
      // Reset auth restore flag
      if ((window as any)._authSessionRestoreInProgress) {
        (window as any)._authSessionRestoreInProgress = false;
      }

      // Clear any pending debounced auth state updates
      authStateManager.clearAuthState();
    };
  }, []);

  useEffect(() => {
    if (isClient) {
      checkAuth();
      setupEventListeners();

      // Subscribe to auth state changes
      const unsubscribe = authStateManager.subscribeToAuthChanges(
        (authState) => {
          // Update local state when auth state changes
          safeSetState(setUser, authState.user, "user");
          safeSetState(setLoading, authState.isLoading, "loading");

          // Clear auth error if we have a valid user
          if (authState.user && authState.isAuthenticated) {
            safeSetState(setAuthError, null, "authError");
          }
        },
      );

      return () => {
        unsubscribe();
      };
    }
  }, [isClient]);

  // Setup event listeners for API error handling
  const setupEventListeners = () => {
    if (typeof window === "undefined") return;

    const handleAuthError = (event: CustomEvent) => {
      console.log("Auth error event received:", event.detail);

      // Clear auth state in the manager
      authStateManager.clearAuthState();

      safeSetState(setAuthError, event.detail.message, "authError");
      safeSetState(setUser, null, "user");
      smartStorage.removeItem("user");
    };

    const handleBackendUnavailable = (event: CustomEvent) => {
      console.log("Backend unavailable event received:", event.detail);
      safeSetState(setBackendAvailable, false, "backendAvailable");
      safeSetState(setIsDemoMode, true, "isDemoMode");
      safeSetState(
        setAuthError,
        "Backend service is unavailable. You are now in demo mode.",
        "authError",
      );
      sessionStorage.setItem("demo_mode", "true");
    };

    const handleServerError = (event: CustomEvent) => {
      console.log("Server error event received:", event.detail);
      safeSetState(
        setAuthError,
        `Server error: ${event.detail.message}`,
        "authError",
      );
    };

    const handleDemoModeEnabled = (event: CustomEvent) => {
      console.log("Demo mode enabled event received:", event.detail);
      safeSetState(setIsDemoMode, true, "isDemoMode");
      safeSetState(setUser, null, "user");
      safeSetState(
        setAuthError,
        event.detail.reason
          ? `Demo mode: ${event.detail.reason}`
          : "Demo mode enabled",
        "authError",
      );
    };

    window.addEventListener("auth-error", handleAuthError as EventListener);
    window.addEventListener(
      "backend-unavailable",
      handleBackendUnavailable as EventListener,
    );
    window.addEventListener("server-error", handleServerError as EventListener);
    window.addEventListener(
      "demo-mode-enabled",
      handleDemoModeEnabled as EventListener,
    );

    return () => {
      window.removeEventListener(
        "auth-error",
        handleAuthError as EventListener,
      );
      window.removeEventListener(
        "backend-unavailable",
        handleBackendUnavailable as EventListener,
      );
      window.removeEventListener(
        "server-error",
        handleServerError as EventListener,
      );
      window.removeEventListener(
        "demo-mode-enabled",
        handleDemoModeEnabled as EventListener,
      );
    };
  };

  useEffect(() => {
    // Skip redirection during SSR
    if (!isClient) return;

    // CRITICAL: Never redirect from the landing page
    if (pathname === "/" || window.location.pathname === "/") {
      console.log("[AuthProvider] On landing page, skipping auth redirect");
      return;
    }

    // CRITICAL: Skip customer routes - let CustomerAuthProvider handle them
    if (pathname?.startsWith("/customer")) {
      console.log(
        "[AuthProvider] On customer route, skipping auth redirect:",
        pathname,
      );
      return;
    }

    // Skip redirect logic if still loading authentication state
    if (loading) {
      console.log(
        "[AuthProvider] Authentication still loading, skipping redirect check",
      );
      return;
    }

    // Get the current pathname, with fallback
    const currentPath = pathname || window.location.pathname || "/";

    // Double-check we're not on the landing page
    if (currentPath === "/") {
      console.log(
        "[AuthProvider] Detected landing page in timeout, skipping redirect",
      );
      return;
    }

    // Check if current route is public using the centralized route classification
    const isPublic = isPublicRoute(currentPath);

    // Debug logging for deployment
    console.log("[AuthProvider] Route check:", {
      pathname: currentPath,
      isPublicRoute: isPublic,
      isDashboardRoute: isDashboardRoute(currentPath),
      loading,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      isDemoMode,
      windowPathname: window.location.pathname,
      hasAccessToken: !!smartStorage.getItem("access_token"),
      authInProgress: (window as any)._authSessionRestoreInProgress,
    });

    // Only redirect if:
    // 1. Not loading
    // 2. No authenticated user
    // 3. Not in demo mode
    // 4. Not on a public route
    // 5. Not already on login page
    // 6. Not already restoring session
    if (
      !loading &&
      !user &&
      !isDemoMode &&
      !isPublic &&
      !currentPath.includes("/login") &&
      !(window as any)._authSessionRestoreInProgress
    ) {
      console.log(
        "[AuthProvider] User not authenticated, checking token validity before redirect",
      );

      // Check if we have a stored token and try to validate it
      const hasStoredToken = smartStorage.getItem("access_token");
      if (hasStoredToken) {
        console.log("[AuthProvider] Found stored token, validating session");

        // Mark that we're restoring session to prevent multiple attempts
        (window as any)._authSessionRestoreInProgress = true;

        // Don't redirect immediately - give time to restore session
        const restoreTimeout = setTimeout(async () => {
          try {
            // First check if the token is still valid by making a quick auth check
            const authResult = await authService.getCurrentUser();
            if (authResult) {
              console.log(
                "[AuthProvider] Session successfully restored, user:",
                authResult.email,
              );

              // Use debounced auth state update
              authStateManager.debounceAuthChange({
                user: authResult,
                isAuthenticated: true,
                isLoading: false,
              });

              safeSetState(setUser, authResult, "user");
              safeSetState(setAuthError, null, "authError");
              (window as any)._authSessionRestoreInProgress = false;
              return;
            }
          } catch (error: any) {
            console.log(
              "[AuthProvider] Token validation failed:",
              error.response?.status,
            );

            // If it's not a 401 (unauthorized), it might be a network issue
            if (error.response?.status !== 401) {
              console.log(
                "[AuthProvider] Non-auth error during validation, keeping session",
              );
              (window as any)._authSessionRestoreInProgress = false;
              return;
            }
          }

          // Only redirect if token is definitely invalid (401) or doesn't exist
          if (!smartStorage.getItem("access_token")) {
            console.log(
              "[AuthProvider] No valid token found, redirecting to login from:",
              currentPath,
            );
            debugRedirect(
              "AuthProvider",
              currentPath,
              "/login",
              "Invalid or missing token",
            );
            smartStorage.setItem("redirect_after_login", currentPath);
            router.push("/login");
          }

          (window as any)._authSessionRestoreInProgress = false;
        }, 300); // Increased timeout for better stability

        // Store timeout reference for cleanup
        (window as any)._authRestoreTimeout = restoreTimeout;
      } else {
        // No stored token, immediate redirect
        console.log(
          "[AuthProvider] No stored token, redirecting to login from:",
          currentPath,
        );
        debugRedirect("AuthProvider", currentPath, "/login", "No stored token");
        smartStorage.setItem("redirect_after_login", currentPath);
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router, isClient, isDemoMode]);

  const checkAuth = async () => {
    try {
      // Mark that we're checking authentication
      (window as any)._authSessionRestoreInProgress = true;

      // Check if we're in demo mode first
      const demoMode = sessionStorage.getItem("demo_mode") === "true";
      if (demoMode) {
        console.log("[AuthProvider] Demo mode active, skipping auth check");
        safeSetState(setIsDemoMode, true, "isDemoMode");
        safeSetState(setUser, null, "user");
        safeSetState(setLoading, false, "loading");
        (window as any)._authSessionRestoreInProgress = false;
        return;
      }

      // Perform auth migration from localStorage to cookies
      authMigration.migrate();

      // Check backend health first
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const healthCheck = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/health`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!healthCheck.ok) {
          throw new Error("Backend health check failed");
        }
        safeSetState(setBackendAvailable, true, "backendAvailable");
      } catch (healthError) {
        console.warn(
          "[AuthProvider] Backend health check failed:",
          healthError,
        );
        safeSetState(setBackendAvailable, false, "backendAvailable");
        safeSetState(
          setAuthError,
          "Backend service appears to be unavailable. Some features may be limited.",
          "authError",
        );
      }

      // Use centralized auth state manager for auth checking
      const authState = await authStateManager.checkAuthOnce(async () => {
        // Check if user is authenticated (has user data and token)
        if (authService.isAuthenticated() && backendAvailable) {
          console.log(
            "[AuthProvider] User is authenticated, fetching current user",
          );
          try {
            const currentUser = await authService.getCurrentUser();
            console.log(
              "[AuthProvider] Successfully restored user session:",
              currentUser.email,
            );
            return currentUser;
          } catch (error: any) {
            console.error("Failed to get current user:", error);

            // Check if it's a network/backend error
            if (!error.response || error.response.status >= 500) {
              safeSetState(
                setAuthError,
                "Unable to verify authentication. Backend may be unavailable.",
                "authError",
              );
              safeSetState(setBackendAvailable, false, "backendAvailable");
            } else {
              safeSetState(
                setAuthError,
                "Authentication expired. Please log in again.",
                "authError",
              );
            }

            // Clear user data if fetching fails
            smartStorage.removeItem("user");
            throw error;
          }
        } else if (authService.isAuthenticated()) {
          // We have a token but backend is unavailable - use stored user data
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            console.log(
              "[AuthProvider] Backend unavailable, using stored user data",
            );
            safeSetState(
              setAuthError,
              "Backend service is temporarily unavailable. Using cached data.",
              "authError",
            );
            return storedUser;
          }
        } else {
          // Check if we have stored user data but no token
          // This might happen after server restart or token expiration
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            console.log(
              "[AuthProvider] Found stored user but no valid session",
            );
            smartStorage.removeItem("user");
            safeSetState(
              setAuthError,
              "Session expired. Please log in again.",
              "authError",
            );
          }
        }
        return null;
      });

      // Update local state with the auth state from the manager
      safeSetState(setUser, authState.user, "user");
      safeSetState(setLoading, authState.isLoading, "loading");
      if (!authState.user && !authState.isLoading) {
        safeSetState(
          setAuthError,
          authState.user
            ? null
            : "Authentication check failed. You may continue in demo mode.",
          "authError",
        );
      }

      (window as any)._authSessionRestoreInProgress = false;
    } catch (error) {
      console.error("Auth check failed:", error);
      safeSetState(
        setAuthError,
        "Authentication check failed. You may continue in demo mode.",
        "authError",
      );
      safeSetState(setLoading, false, "loading");
      (window as any)._authSessionRestoreInProgress = false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      safeSetState(setAuthError, null, "authError"); // Clear previous errors
      const response = await authService.login({ username: email, password });

      // Update auth state manager with the new user
      authStateManager.forceUpdateState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        lastChecked: new Date(),
      });

      safeSetState(setUser, response.user, "user");
      safeSetState(setIsDemoMode, false, "isDemoMode"); // Exit demo mode on successful login
      sessionStorage.removeItem("demo_mode");

      // Check for redirect after login
      const redirectPath = smartStorage.getItem("redirect_after_login");
      if (redirectPath) {
        smartStorage.removeItem("redirect_after_login");
        router.push(redirectPath);
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Login failed:", error);

      // Provide helpful error messages
      if (!error.response) {
        safeSetState(
          setAuthError,
          "Unable to connect to authentication service. Please check your connection or try demo mode.",
          "authError",
        );
        safeSetState(setBackendAvailable, false, "backendAvailable");
      } else if (error.response.status === 401) {
        safeSetState(
          setAuthError,
          "Invalid email or password. Please try again.",
          "authError",
        );
      } else if (error.response.status >= 500) {
        safeSetState(
          setAuthError,
          "Authentication service is temporarily unavailable. Please try again later or use demo mode.",
          "authError",
        );
        safeSetState(setBackendAvailable, false, "backendAvailable");
      } else {
        safeSetState(
          setAuthError,
          error.response?.data?.detail || "Login failed. Please try again.",
          "authError",
        );
      }

      throw error;
    }
  };

  const logout = async () => {
    try {
      if (backendAvailable && !isDemoMode) {
        await authService.logout();
      }
    } catch (error) {
      console.warn("Logout API call failed:", error);
      // Continue with local logout even if API fails
    }

    // Clear auth state in the manager
    authStateManager.clearAuthState();

    // Always clear local state
    safeSetState(setUser, null, "user");
    safeSetState(setAuthError, null, "authError");
    safeSetState(setIsDemoMode, false, "isDemoMode");
    sessionStorage.removeItem("demo_mode");
    smartStorage.removeItem("user");
    smartStorage.removeItem("access_token");

    router.push("/login");
  };

  const enableDemoMode = (reason?: string) => {
    console.log("[AuthProvider] Enabling demo mode:", reason);
    safeSetState(setIsDemoMode, true, "isDemoMode");
    safeSetState(setUser, null, "user");
    safeSetState(setAuthError, reason || "Demo mode enabled", "authError");
    sessionStorage.setItem("demo_mode", "true");
    if (reason) {
      sessionStorage.setItem("demo_mode_reason", reason);
    }
  };

  const disableDemoMode = () => {
    console.log("[AuthProvider] Disabling demo mode");
    safeSetState(setIsDemoMode, false, "isDemoMode");
    safeSetState(setAuthError, null, "authError");
    sessionStorage.removeItem("demo_mode");
    sessionStorage.removeItem("demo_mode_reason");
    // Trigger auth check
    checkAuth();
  };

  const clearAuthError = () => {
    safeSetState(setAuthError, null, "authError");
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "super_admin") return true;
    return user.permissions?.includes(permission) || false;
  };

  const value = {
    user,
    isLoading: loading,
    isAuthenticated: !!user && !isDemoMode,
    isDemoMode,
    authError,
    backendAvailable,
    login,
    logout,
    enableDemoMode,
    disableDemoMode,
    clearAuthError,
    hasPermission,
    hasRole,
  };

  // Debug authentication state changes
  useEffect(() => {
    if (isClient) {
      debugAuthState("AuthProvider", {
        hasUser: !!user,
        isLoading: loading,
        pathname: pathname,
      });
    }
  }, [user, loading, pathname, isClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
