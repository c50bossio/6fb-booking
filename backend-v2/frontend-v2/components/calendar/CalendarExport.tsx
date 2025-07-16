/**
 * Calendar Export Component
 * Clean icon-only export button with popover format selection
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { BookingResponse } from '@/lib/api';

interface CalendarExportProps {
  className?: string;
  onExport?: (format: ExportFormat) => void;
  appointments?: BookingResponse[];
  selectedAppointments?: BookingResponse[];
}

export type ExportFormat = 'ical' | 'csv' | 'pdf' | 'json';

export function CalendarExport({ className = '', onExport, appointments = [], selectedAppointments = [] }: CalendarExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const exportFormats: { value: ExportFormat; label: string; description: string; icon: string }[] = [
    { value: 'ical', label: 'Calendar', description: 'Import into apps', icon: '📅' },
    { value: 'csv', label: 'Spreadsheet', description: 'Excel format', icon: '📊' },
    { value: 'pdf', label: 'PDF', description: 'Printable doc', icon: '📄' },
    { value: 'json', label: 'Data', description: 'Raw format', icon: '📋' }
  ];

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setIsOpen(false);
    try {
      await onExport?.(format);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative calendar-export ${className}`}>
      {/* Clean Export Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={`
          inline-flex items-center gap-2 px-3 py-2 text-sm font-medium
          border border-gray-300 dark:border-gray-600 rounded-md
          bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-200 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        `}
        title="Export calendar data"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        <span className="hidden sm:block">
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
      </button>

      {/* Format Selection Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`
            absolute right-0 top-full mt-2 w-64 z-50
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg ring-1 ring-black ring-opacity-5
            transform origin-top-right transition-all duration-200
            ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          `}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="export-menu"
        >
          <div className="p-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Choose export format
            </div>
            
            {/* 2x2 Grid Layout */}
            <div className="grid grid-cols-2 gap-2">
              {exportFormats.map(format => (
                <button
                  key={format.value}
                  onClick={() => handleExport(format.value)}
                  className={`
                    p-3 text-left rounded-lg border border-gray-200 dark:border-gray-600
                    hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500
                    transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                  role="menuitem"
                >
                  <div className="flex flex-col items-center text-center gap-1">
                    <span className="text-2xl" role="img" aria-hidden="true">
                      {format.icon}
                    </span>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {format.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {format.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarExport;