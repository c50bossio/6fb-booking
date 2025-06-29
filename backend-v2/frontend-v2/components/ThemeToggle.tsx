'use client';

import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'switch' | 'buttons' | 'dropdown';
}

export function ThemeToggle({ 
  className = '', 
  showLabel = false,
  variant = 'switch'
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Theme:
          </span>
        )}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTheme('light')}
            className={`
              flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
              ${theme === 'light' 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }
            `}
            title="Light mode"
          >
            <SunIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`
              flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
              ${theme === 'system' 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }
            `}
            title="System mode"
          >
            <ComputerDesktopIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`
              flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
              ${theme === 'dark' 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }
            `}
            title="Dark mode"
          >
            <MoonIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          className="
            appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
            rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 dark:text-gray-300
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            cursor-pointer
          "
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    );
  }

  // Default iOS-style switch
  const isDark = theme === 'dark';
  const isLight = theme === 'light';

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Dark mode
        </span>
      )}
      
      {/* iOS-style toggle switch */}
      <button
        onClick={() => {
          if (theme === 'light') {
            setTheme('dark');
          } else if (theme === 'dark') {
            setTheme('system');
          } else {
            setTheme('light');
          }
        }}
        className="
          relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
          bg-gray-200 dark:bg-gray-700
        "
        role="switch"
        aria-checked={isDark}
        title={`Current: ${theme} mode. Click to cycle.`}
      >
        {/* Switch background */}
        <span
          className={`
            absolute inset-0 rounded-full transition-colors duration-200 ease-in-out
            ${isDark 
              ? 'bg-primary-600 dark:bg-primary-500' 
              : theme === 'system' 
                ? 'bg-blue-500' 
                : 'bg-gray-200'
            }
          `}
        />
        
        {/* Switch handle */}
        <span
          className={`
            relative inline-block w-4 h-4 rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out
            ${isDark 
              ? 'translate-x-6' 
              : theme === 'system' 
                ? 'translate-x-3' 
                : 'translate-x-1'
            }
          `}
        >
          {/* Icon inside handle */}
          <span className="absolute inset-0 flex items-center justify-center">
            {theme === 'light' && (
              <SunIcon className="w-2.5 h-2.5 text-yellow-500" />
            )}
            {theme === 'dark' && (
              <MoonIcon className="w-2.5 h-2.5 text-blue-600" />
            )}
            {theme === 'system' && (
              <ComputerDesktopIcon className="w-2.5 h-2.5 text-gray-600" />
            )}
          </span>
        </span>
      </button>

      {/* Theme indicator text */}
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium min-w-[50px]">
        {theme === 'light' && 'Light'}
        {theme === 'dark' && 'Dark'}
        {theme === 'system' && 'Auto'}
      </span>
    </div>
  );
}

// Simplified version for header/navbar use
export function SimpleThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg transition-colors duration-200
        text-gray-700 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${className}
      `}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  );
}