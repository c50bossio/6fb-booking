import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category?: string;
  action: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  ignoreInputElements?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    ignoreInputElements = true,
  } = options;

  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if focus is on input elements (unless explicitly allowed)
      if (ignoreInputElements) {
        const target = event.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          target.contentEditable === 'true'
        ) {
          return;
        }
      }

      const matchingShortcut = shortcutsRef.current.find((shortcut) => {
        if (shortcut.enabled === false) return false;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !shortcut.ctrl || event.ctrlKey === shortcut.ctrl;
        const shiftMatch = !shortcut.shift || event.shiftKey === shortcut.shift;
        const altMatch = !shortcut.alt || event.altKey === shortcut.alt;
        const metaMatch = !shortcut.meta || event.metaKey === shortcut.meta;

        return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
      });

      if (matchingShortcut) {
        if (preventDefault || matchingShortcut.preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        matchingShortcut.action();
      }
    },
    [enabled, preventDefault, stopPropagation, ignoreInputElements]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

// Helper function to format shortcut display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.meta) parts.push('⌘');
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  
  // Format the key
  const key = shortcut.key.length === 1 
    ? shortcut.key.toUpperCase() 
    : shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);
  
  parts.push(key);
  
  return parts.join('+');
}

// Common shortcut patterns
export const SHORTCUT_PATTERNS = {
  navigation: {
    next: { key: 'ArrowRight', description: 'Next' },
    previous: { key: 'ArrowLeft', description: 'Previous' },
    up: { key: 'ArrowUp', description: 'Up' },
    down: { key: 'ArrowDown', description: 'Down' },
    pageUp: { key: 'PageUp', description: 'Page up' },
    pageDown: { key: 'PageDown', description: 'Page down' },
    home: { key: 'Home', description: 'Beginning' },
    end: { key: 'End', description: 'End' },
  },
  actions: {
    create: { key: 'n', description: 'New' },
    edit: { key: 'e', description: 'Edit' },
    delete: { key: 'Delete', description: 'Delete' },
    save: { key: 's', ctrl: true, description: 'Save' },
    cancel: { key: 'Escape', description: 'Cancel/Close' },
    search: { key: '/', description: 'Search' },
    help: { key: '?', description: 'Help' },
    select: { key: ' ', description: 'Select' },
    open: { key: 'Enter', description: 'Open' },
  },
  calendar: {
    today: { key: 't', description: 'Go to today' },
    dayView: { key: 'd', description: 'Day view' },
    weekView: { key: 'w', description: 'Week view' },
    monthView: { key: 'm', description: 'Month view' },
    refresh: { key: 'r', description: 'Refresh' },
    nextPeriod: { key: 'j', description: 'Next period' },
    prevPeriod: { key: 'k', description: 'Previous period' },
  },
};