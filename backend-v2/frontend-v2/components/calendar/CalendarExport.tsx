/**
 * Calendar Export Component
 * Handles exporting calendar data to various formats
 */

import React, { useState } from 'react';
import type { BookingResponse } from '@/lib/api';

interface CalendarExportProps {
  className?: string;
  onExport?: (format: ExportFormat) => void;
  appointments?: BookingResponse[];
  selectedAppointments?: BookingResponse[];
}

export type ExportFormat = 'ical' | 'csv' | 'pdf' | 'json';

export function CalendarExport({ className = '', onExport, appointments = [], selectedAppointments = [] }: CalendarExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('ical');

  const exportFormats: { value: ExportFormat; label: string; description: string }[] = [
    { value: 'ical', label: 'iCalendar (.ics)', description: 'Import into calendar apps' },
    { value: 'csv', label: 'CSV (.csv)', description: 'Spreadsheet format' },
    { value: 'pdf', label: 'PDF (.pdf)', description: 'Printable document' },
    { value: 'json', label: 'JSON (.json)', description: 'Data format' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport?.(selectedFormat);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`calendar-export ${className}`}>
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Export Calendar
        </h3>
        
        <div className="space-y-2">
          {exportFormats.map(format => (
            <label key={format.value} className="flex items-center space-x-3">
              <input
                type="radio"
                name="exportFormat"
                value={format.value}
                checked={selectedFormat === format.value}
                onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                className="text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {format.label}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {format.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md transition-colors"
        >
          {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}

export default CalendarExport;