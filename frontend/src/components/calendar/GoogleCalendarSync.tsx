"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';

interface GoogleCalendarSyncProps {
  appointmentId?: number;
  googleEventId?: string;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showBadge?: boolean;
  className?: string;
}

export default function GoogleCalendarSync({
  appointmentId,
  googleEventId,
  size = 'md',
  showStatus = true,
  showBadge = true,
  className = '',
}: GoogleCalendarSyncProps) {
  const {
    status,
    isConnected,
    canSync,
    loading,
    error,
    sync,
    loadStatus,
  } = useGoogleCalendar();

  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSync = async () => {
    if (!canSync) return;

    try {
      setSyncing(true);
      const result = await sync();

      if (result) {
        if (result.success) {
          setLastSyncResult(`Synced ${result.synced_count} appointments successfully`);
        } else {
          setLastSyncResult(`Sync failed: ${result.message}`);
        }
      }
    } catch (err) {
      setLastSyncResult('Sync failed: Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-base px-4 py-2';
      default:
        return 'text-sm px-3 py-1.5';
    }
  };

  const getStatusBadge = () => {
    if (!showBadge || !status) return null;

    if (googleEventId) {
      return <Badge className="bg-green-500 text-xs">Synced</Badge>;
    }

    if (!isConnected) {
      return <Badge className="bg-gray-500 text-xs">Not Connected</Badge>;
    }

    return <Badge className="bg-yellow-500 text-xs">Not Synced</Badge>;
  };

  const getStatusIcon = () => {
    if (loading || syncing) {
      return <LoadingSpinner className="w-4 h-4" />;
    }

    if (googleEventId) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }

    if (!isConnected) {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  };

  if (!showStatus && !canSync) {
    return null; // Don't show anything if not connected and status is hidden
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showStatus && (
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          {showBadge && getStatusBadge()}
        </div>
      )}

      {canSync && (
        <Button
          onClick={handleSync}
          disabled={syncing || loading}
          variant="outline"
          className={`${getSizeClasses()} border-blue-500 text-blue-500 hover:bg-blue-50`}
        >
          {syncing ? (
            <>
              <LoadingSpinner className="w-3 h-3 mr-1" />
              Syncing...
            </>
          ) : googleEventId ? (
            'Update in Calendar'
          ) : (
            'Add to Calendar'
          )}
        </Button>
      )}

      {!isConnected && showStatus && (
        <Button
          variant="outline"
          size="sm"
          className={`${getSizeClasses()} border-gray-400 text-gray-600 hover:bg-gray-50`}
          onClick={() => window.location.href = '/dashboard/settings?tab=google-calendar'}
        >
          Connect Calendar
        </Button>
      )}

      {lastSyncResult && (
        <div className="text-xs text-gray-600 max-w-xs truncate" title={lastSyncResult}>
          {lastSyncResult}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 max-w-xs truncate" title={error}>
          Error: {error}
        </div>
      )}
    </div>
  );
}

// Utility component for appointment cards
export function GoogleCalendarBadge({ googleEventId }: { googleEventId?: string }) {
  if (!googleEventId) return null;

  return (
    <Badge className="bg-green-500 text-xs flex items-center gap-1">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      Synced
    </Badge>
  );
}

// Utility component for quick sync status
export function QuickSyncStatus() {
  const { status, isConnected, loadStatus } = useGoogleCalendar();

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (!status) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Google Calendar:</span>
      </div>
      {isConnected ? (
        <Badge className="bg-green-500">Connected</Badge>
      ) : (
        <Badge className="bg-gray-500">Not Connected</Badge>
      )}
      {status.last_sync_date && (
        <span className="text-xs text-gray-500">
          Last sync: {new Date(status.last_sync_date).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
