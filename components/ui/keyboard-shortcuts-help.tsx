'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ shortcuts, isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <Button variant="ghost" onClick={onClose}>
            ×
          </Button>
        </CardHeader>
        <CardContent>
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="font-semibold mb-3 text-lg">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    show: () => setIsOpen(true),
    hide: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen)
  };
}