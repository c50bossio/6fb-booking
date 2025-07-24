'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
  action: () => void;
  enabled?: boolean;
}

// Predefined shortcut patterns for common actions
export const SHORTCUT_PATTERNS = {
  navigation: {
    next: {
      keys: ['ArrowRight', 'n'],
      description: 'Navigate to next period'
    },
    previous: {
      keys: ['ArrowLeft', 'p'],
      description: 'Navigate to previous period'
    },
    today: {
      keys: ['t'],
      description: 'Go to today'
    }
  },
  views: {
    day: {
      keys: ['d'],
      description: 'Switch to day view'
    },
    week: {
      keys: ['w'],
      description: 'Switch to week view'
    },
    month: {
      keys: ['m'],
      description: 'Switch to month view'
    }
  },
  actions: {
    new: {
      keys: ['c', 'n'],
      description: 'Create new appointment'
    },
    search: {
      keys: ['/', 's'],
      description: 'Search appointments'
    },
    refresh: {
      keys: ['r'],
      description: 'Refresh calendar'
    },
    help: {
      keys: ['?', 'h'],
      description: 'Show keyboard shortcuts'
    }
  },
  appointment: {
    edit: {
      keys: ['e'],
      description: 'Edit selected appointment'
    },
    delete: {
      keys: ['Delete', 'Backspace'],
      description: 'Delete selected appointment'
    },
    selectNext: {
      keys: ['j', 'ArrowDown'],
      description: 'Select next appointment'
    },
    selectPrevious: {
      keys: ['k', 'ArrowUp'],
      description: 'Select previous appointment'
    }
  }
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    // Don't trigger shortcuts when modifier keys are pressed (except for specific combinations)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const pressedKey = event.key;
    
    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => 
      shortcut.enabled !== false && 
      shortcut.keys.includes(pressedKey)
    );

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return {
    shortcuts,
    enabled
  };
}