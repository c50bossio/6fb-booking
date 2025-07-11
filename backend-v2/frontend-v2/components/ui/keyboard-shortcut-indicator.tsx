'use client';

import React, { useState, useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardShortcutIndicatorProps {
  show?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  onClick?: () => void;
}

export function KeyboardShortcutIndicator({
  show = true,
  position = 'bottom-right',
  className,
  onClick,
}: KeyboardShortcutIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the indicator
    const dismissed = localStorage.getItem('keyboard-shortcuts-indicator-dismissed');
    if (dismissed === 'true') {
      setHasBeenDismissed(true);
    } else {
      setIsVisible(show);
    }
  }, [show]);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    localStorage.setItem('keyboard-shortcuts-indicator-dismissed', 'true');
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  if (!isVisible || hasBeenDismissed) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-500',
        positionClasses[position],
        className
      )}
    >
      <button
        onClick={handleClick}
        className={cn(
          'group relative flex items-center gap-2 px-3 py-2',
          'bg-white dark:bg-gray-800 rounded-lg shadow-lg',
          'border border-gray-200 dark:border-gray-700',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'transition-all duration-200 hover:scale-105'
        )}
        aria-label="Keyboard shortcuts available. Press ? for help"
      >
        <Keyboard className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Press <kbd className="px-1.5 py-0.5 mx-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">?</kbd> for shortcuts
        </span>
        
        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Dismiss keyboard shortcuts indicator"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Pulse animation to draw attention */}
        <div className="absolute -inset-0.5 bg-blue-400 dark:bg-blue-600 rounded-lg opacity-20 animate-pulse" />
      </button>

      {/* Tooltip on hover */}
      <div className={cn(
        'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
        'pointer-events-none'
      )}>
        <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          Navigate faster with keyboard shortcuts
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      </div>
    </div>
  );
}

// Hook to manage indicator visibility
export function useKeyboardShortcutIndicator() {
  const [showIndicator, setShowIndicator] = useState(true);

  useEffect(() => {
    // Hide indicator after user has used any keyboard shortcut
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if it's a shortcut key (not typing in input)
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      
      if (!isInput && (e.key === '?' || e.ctrlKey || e.metaKey || e.altKey)) {
        setShowIndicator(false);
        localStorage.setItem('keyboard-shortcuts-used', 'true');
      }
    };

    // Check if user has used shortcuts before
    const hasUsedShortcuts = localStorage.getItem('keyboard-shortcuts-used');
    if (hasUsedShortcuts === 'true') {
      setShowIndicator(false);
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return { showIndicator, setShowIndicator };
}