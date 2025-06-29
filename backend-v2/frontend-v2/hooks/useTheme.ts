'use client';

import { useState, useEffect } from 'react';
import { useThemeContext } from '../lib/theme-provider';

export function useTheme() {
  return useThemeContext();
}

// Additional theme utilities
export const themeUtils = {
  // Check if current theme is dark
  isDark: (resolvedTheme: 'light' | 'dark') => resolvedTheme === 'dark',
  
  // Check if current theme is light
  isLight: (resolvedTheme: 'light' | 'dark') => resolvedTheme === 'light',
  
  // Get theme-aware class names
  getThemeClass: (lightClass: string, darkClass: string, resolvedTheme: 'light' | 'dark') => {
    return resolvedTheme === 'dark' ? darkClass : lightClass;
  },
  
  // Get theme-aware colors
  getThemeColor: (lightColor: string, darkColor: string, resolvedTheme: 'light' | 'dark') => {
    return resolvedTheme === 'dark' ? darkColor : lightColor;
  },
  
  // Get system theme preference
  getSystemTheme: (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  
  // Check if system supports dark mode
  supportsColorScheme: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme)').matches;
  },
  
  // Get theme-appropriate text color classes
  getTextColors: (resolvedTheme: 'light' | 'dark') => ({
    primary: resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900',
    secondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    muted: resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500',
    accent: resolvedTheme === 'dark' ? 'text-primary-400' : 'text-primary-600',
  }),
  
  // Get theme-appropriate background color classes
  getBackgroundColors: (resolvedTheme: 'light' | 'dark') => ({
    primary: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    secondary: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    card: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
    hover: resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
    accent: resolvedTheme === 'dark' ? 'bg-primary-900' : 'bg-primary-50',
  }),
  
  // Get theme-appropriate border color classes
  getBorderColors: (resolvedTheme: 'light' | 'dark') => ({
    default: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    light: resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-100',
    accent: resolvedTheme === 'dark' ? 'border-primary-500' : 'border-primary-300',
  }),
};

// Hook for theme-aware styling
export function useThemeStyles() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use light theme as default during SSR
  const safeResolvedTheme = mounted ? resolvedTheme : 'light';
  
  return {
    resolvedTheme: safeResolvedTheme,
    isDark: mounted ? themeUtils.isDark(resolvedTheme) : false,
    isLight: mounted ? themeUtils.isLight(resolvedTheme) : true,
    colors: {
      text: themeUtils.getTextColors(safeResolvedTheme),
      background: themeUtils.getBackgroundColors(safeResolvedTheme),
      border: themeUtils.getBorderColors(safeResolvedTheme),
    },
    getClass: (lightClass: string, darkClass: string) => 
      themeUtils.getThemeClass(lightClass, darkClass, safeResolvedTheme),
    getColor: (lightColor: string, darkColor: string) => 
      themeUtils.getThemeColor(lightColor, darkColor, safeResolvedTheme),
  };
}

// Hook for system theme detection
export function useSystemTheme() {
  const systemTheme = themeUtils.getSystemTheme();
  const supportsColorScheme = themeUtils.supportsColorScheme();
  
  return {
    systemTheme,
    supportsColorScheme,
    isDarkSystem: systemTheme === 'dark',
    isLightSystem: systemTheme === 'light',
  };
}

// Hook for theme persistence
export function useThemePersistence(storageKey: string = 'theme') {
  const saveTheme = (theme: 'light' | 'dark' | 'system') => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  };
  
  const loadTheme = (): 'light' | 'dark' | 'system' | null => {
    try {
      return localStorage.getItem(storageKey) as 'light' | 'dark' | 'system' | null;
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
      return null;
    }
  };
  
  const clearTheme = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear theme from localStorage:', error);
    }
  };
  
  return {
    saveTheme,
    loadTheme,
    clearTheme,
  };
}