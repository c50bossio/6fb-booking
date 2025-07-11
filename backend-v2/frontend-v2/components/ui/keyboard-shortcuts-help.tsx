'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { formatShortcut, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

export function KeyboardShortcutsHelp({
  shortcuts,
  isOpen,
  onClose,
  title = 'Keyboard Shortcuts',
  className,
}: KeyboardShortcutsHelpProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimate(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-50 transition-opacity',
          animate ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'bg-white dark:bg-gray-800 rounded-lg shadow-xl',
          'w-full max-w-2xl max-h-[80vh] overflow-hidden',
          'transition-all duration-200 ease-out',
          animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
          className
        )}
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 id="shortcuts-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close shortcuts help"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {shortcut.description}
                      </span>
                      <kbd className={cn(
                        'inline-flex items-center gap-1 px-2 py-1',
                        'bg-gray-100 dark:bg-gray-700 rounded',
                        'text-xs font-mono text-gray-700 dark:text-gray-300',
                        'border border-gray-300 dark:border-gray-600'
                      )}>
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
}

// Shortcut badge component for inline display
export function ShortcutBadge({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <kbd className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5',
      'bg-gray-100 dark:bg-gray-700 rounded',
      'text-xs font-mono text-gray-600 dark:text-gray-400',
      'border border-gray-200 dark:border-gray-600'
    )}>
      {formatShortcut(shortcut)}
    </kbd>
  );
}

// Hook for managing help dialog state
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}