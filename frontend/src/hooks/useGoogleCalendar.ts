"use client";

import { useState, useEffect, useCallback } from 'react';
import { smartStorage } from '../lib/utils/storage';

export interface GoogleCalendarStatus {
  connected: boolean;
  status: string;
  message: string;
  google_email?: string;
  last_sync_date?: string;
  calendar_id?: string;
}

export interface GoogleCalendarSettings {
  auto_sync_enabled: boolean;
  sync_on_create: boolean;
  sync_on_update: boolean;
  sync_on_delete: boolean;
  sync_all_appointments: boolean;
  sync_only_confirmed: boolean;
  sync_only_paid: boolean;
  include_client_email: boolean;
  include_client_phone: boolean;
  include_service_price: boolean;
  include_notes: boolean;
  enable_reminders: boolean;
  reminder_email_minutes: number;
  reminder_popup_minutes: number;
  event_visibility: string;
  show_client_name: boolean;
  show_service_details: boolean;
  timezone: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  attendees: string[];
}

export interface SyncResponse {
  success: boolean;
  message: string;
  synced_count: number;
  failed_count: number;
  errors: string[];
}

interface SyncLog {
  id: number;
  appointment_id?: number;
  operation: string;
  direction: string;
  status: string;
  google_event_id?: string;
  error_message?: string;
  created_at: string;
  retry_count: number;
}

export function useGoogleCalendar() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [settings, setSettings] = useState<GoogleCalendarSettings | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get auth token from smartStorage
  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return smartStorage.getItem('access_token') || smartStorage.getItem('auth_token');
    }
    return null;
  }, []);

  // Generic API call function
  const apiCall = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }, [getAuthToken]);

  // Load connection status
  const loadStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await apiCall('/google-calendar/status');
      const data = await response.json();
      setStatus(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load status';
      setError(errorMessage);
      console.error('Error loading Google Calendar status:', err);
      return null;
    }
  }, [apiCall]);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setError(null);
      const response = await apiCall('/google-calendar/settings');
      const data = await response.json();
      setSettings(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      console.error('Error loading Google Calendar settings:', err);
      return null;
    }
  }, [apiCall]);

  // Connect to Google Calendar
  const connect = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiCall('/google-calendar/connect');
      const data = await response.json();

      // Redirect to Google OAuth
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      console.error('Error connecting to Google Calendar:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Disconnect from Google Calendar
  const disconnect = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiCall('/google-calendar/disconnect', {
        method: 'DELETE',
      });
      const data = await response.json();

      // Reload status and settings
      await Promise.all([loadStatus(), loadSettings()]);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(errorMessage);
      console.error('Error disconnecting from Google Calendar:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, loadStatus, loadSettings]);

  // Sync appointments
  const sync = useCallback(async (): Promise<SyncResponse | null> => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiCall('/google-calendar/sync', {
        method: 'POST',
      });
      const data = await response.json();

      // Reload status
      await loadStatus();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync';
      setError(errorMessage);
      console.error('Error syncing appointments:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, loadStatus]);

  // Update settings
  const updateSettings = useCallback(async (newSettings: GoogleCalendarSettings) => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiCall('/google-calendar/settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings),
      });
      const data = await response.json();

      // Update local settings
      setSettings(newSettings);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      console.error('Error updating settings:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Load calendar events
  const loadEvents = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setError(null);
      setLoading(true);

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const response = await apiCall(`/google-calendar/events?${params}`);
      const data = await response.json();
      setEvents(data);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
      setError(errorMessage);
      console.error('Error loading calendar events:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Load sync logs
  const loadSyncLogs = useCallback(async (limit = 50, offset = 0) => {
    try {
      setError(null);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await apiCall(`/google-calendar/sync-logs?${params}`);
      const data = await response.json();
      setSyncLogs(data.logs);

      return data.logs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sync logs';
      setError(errorMessage);
      console.error('Error loading sync logs:', err);
      return [];
    }
  }, [apiCall]);

  // Initialize data on mount
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadSettings()]);
      setLoading(false);
    };

    initialize();
  }, [loadStatus, loadSettings]);

  // Check for OAuth callback parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const connected = urlParams.get('google_calendar_connected');
      const error = urlParams.get('google_calendar_error');

      if (connected === 'true') {
        // Refresh status and settings after successful connection
        loadStatus();
        loadSettings();

        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete('google_calendar_connected');
        window.history.replaceState({}, '', url.toString());
      } else if (error) {
        setError(`Connection failed: ${error}`);

        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete('google_calendar_error');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [loadStatus, loadSettings]);

  return {
    // State
    status,
    settings,
    events,
    syncLogs,
    loading,
    error,

    // Actions
    connect,
    disconnect,
    sync,
    updateSettings,
    loadEvents,
    loadSyncLogs,
    loadStatus,
    loadSettings,

    // Computed values
    isConnected: status?.connected || false,
    canSync: status?.connected && status?.status === 'active',
  };
}
