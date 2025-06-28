"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/lib/api/auth";
import type { User } from "@/lib/api/client";
import { smartStorage } from "@/lib/utils/storage";
import { isPublicRoute } from "@/utils/routeClassification";
import { calendarService } from "@/lib/api/calendar";

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

  useEffect(() => {
    setIsClient(true);
    
    // Check if demo mode was previously enabled
    if (typeof window !== "undefined") {
      const demoMode = sessionStorage.getItem("demo_mode") === "true";
      setIsDemoMode(demoMode);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      checkAuth();
    }
  }, [isClient]);

  // Simple redirect logic
  useEffect(() => {
    if (!isClient || loading) return;

    // Never redirect from landing page or customer routes
    if (pathname === "/" || pathname?.startsWith("/customer")) {
      return;
    }

    const currentPath = pathname || "/";
    const isPublic = isPublicRoute(currentPath);

    // Simple check: if no user and not on public route, redirect to login
    if (!user && !isDemoMode && !isPublic && !currentPath.includes("/login")) {
      const hasToken = smartStorage.getItem("access_token");
      
      if (!hasToken) {
        console.log("[AuthProvider] No token, redirecting to login");
        smartStorage.setItem("redirect_after_login", currentPath);
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router, isClient, isDemoMode]);

  const checkAuth = async () => {
    try {
      // Check demo mode first
      const demoMode = sessionStorage.getItem("demo_mode") === "true";
      if (demoMode) {
        setIsDemoMode(true);
        setUser(null);
        setLoading(false);
        return;
      }

      // Check if we have a token and get current user
      if (authService.isAuthenticated()) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          setAuthError(null);
          
          // Notify calendar service that authentication is ready
          console.log("[AuthProvider] User authenticated, notifying calendar service");
          calendarService.onAuthReady();
        } catch (error: any) {
          console.error("Failed to get current user:", error);
          
          // If unauthorized, clear token and redirect
          if (error.response?.status === 401) {
            smartStorage.removeItem("access_token");
            smartStorage.removeItem("user");
            setAuthError("Session expired. Please log in again.");
            
            // Notify calendar service that authentication is lost
            console.log("[AuthProvider] Session expired, notifying calendar service");
            calendarService.onAuthStateChanged(false);
          } else {
            setAuthError("Unable to verify authentication.");
          }
          setUser(null);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Auth check failed:", error);
      setAuthError("Authentication check failed.");
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthError(null);
      const response = await authService.login({ username: email, password });

      setUser(response.user);
      setIsDemoMode(false);
      sessionStorage.removeItem("demo_mode");

      // Notify calendar service that authentication is ready
      console.log("[AuthProvider] User logged in, notifying calendar service");
      calendarService.onAuthReady();

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

      if (!error.response) {
        setAuthError("Unable to connect to authentication service.");
        setBackendAvailable(false);
      } else if (error.response.status === 401) {
        setAuthError("Invalid email or password. Please try again.");
      } else if (error.response.status >= 500) {
        setAuthError("Authentication service is temporarily unavailable.");
        setBackendAvailable(false);
      } else {
        setAuthError(error.response?.data?.detail || "Login failed. Please try again.");
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
    }

    // Clear local state
    setUser(null);
    setAuthError(null);
    setIsDemoMode(false);
    sessionStorage.removeItem("demo_mode");
    smartStorage.removeItem("user");
    smartStorage.removeItem("access_token");

    // Notify calendar service that authentication is lost
    console.log("[AuthProvider] User logged out, notifying calendar service");
    calendarService.onAuthStateChanged(false);

    router.push("/login");
  };

  const enableDemoMode = (reason?: string) => {
    setIsDemoMode(true);
    setUser(null);
    setAuthError(reason || "Demo mode enabled");
    sessionStorage.setItem("demo_mode", "true");
  };

  const disableDemoMode = () => {
    setIsDemoMode(false);
    setAuthError(null);
    sessionStorage.removeItem("demo_mode");
    checkAuth();
  };

  const clearAuthError = () => {
    setAuthError(null);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
