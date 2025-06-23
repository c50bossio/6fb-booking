"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';

interface GoogleCalendarConnectionStatus {
  connected: boolean;
  status: string;
  message: string;
  google_email?: string;
  last_sync_date?: string;
  calendar_id?: string;
}

interface GoogleCalendarSettingsData {
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

interface SyncResponse {
  success: boolean;
  message: string;
  synced_count: number;
  failed_count: number;
  errors: string[];
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
  { value: 'default', label: 'Default' },
];

export default function GoogleCalendarSettings() {
  const [connectionStatus, setConnectionStatus] = useState<GoogleCalendarConnectionStatus | null>(null);
  const [settings, setSettings] = useState<GoogleCalendarSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);

  // Get auth token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  // Load connection status and settings
  useEffect(() => {
    loadConnectionStatus();
    loadSettings();
  }, []);

  const loadConnectionStatus = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/v1/google-calendar/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (error) {
      console.error('Error loading connection status:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/v1/google-calendar/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/v1/google-calendar/connect', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Error initiating connection:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will stop syncing your appointments.')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/v1/google-calendar/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadConnectionStatus();
        setSyncResult(null);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/v1/google-calendar/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSyncResult(data);
        await loadConnectionStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSettingsChange = (field: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value,
    });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/v1/google-calendar/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        // Show success message
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!connectionStatus) return null;

    switch (connectionStatus.status) {
      case 'active':
        return <Badge className="bg-green-500">Connected</Badge>;
      case 'expired':
        return <Badge className="bg-yellow-500">Needs Refresh</Badge>;
      case 'not_connected':
        return <Badge className="bg-gray-500">Not Connected</Badge>;
      default:
        return <Badge className="bg-red-500">Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Google Calendar Connection</h3>
          {getStatusBadge()}
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {connectionStatus?.message}
          </div>

          {connectionStatus?.google_email && (
            <div className="text-sm">
              <strong>Connected Account:</strong> {connectionStatus.google_email}
            </div>
          )}

          {connectionStatus?.last_sync_date && (
            <div className="text-sm">
              <strong>Last Sync:</strong> {new Date(connectionStatus.last_sync_date).toLocaleString()}
            </div>
          )}

          <div className="flex gap-2">
            {connectionStatus?.connected ? (
              <>
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {syncing ? <LoadingSpinner className="w-4 h-4" /> : 'Sync Now'}
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {connecting ? <LoadingSpinner className="w-4 h-4" /> : 'Connect Google Calendar'}
              </Button>
            )}
          </div>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div className={`mt-4 p-3 rounded-lg ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="text-sm">
              <strong>Sync Result:</strong> {syncResult.message}
              <br />
              <strong>Synced:</strong> {syncResult.synced_count} appointments
              {syncResult.failed_count > 0 && (
                <>
                  <br />
                  <strong>Failed:</strong> {syncResult.failed_count} appointments
                </>
              )}
            </div>
            {syncResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-600">
                <strong>Errors:</strong>
                <ul className="list-disc list-inside mt-1">
                  {syncResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Sync Settings */}
      {connectionStatus?.connected && settings && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sync Settings</h3>
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? <LoadingSpinner className="w-4 h-4" /> : 'Save Settings'}
            </Button>
          </div>

          <div className="space-y-6">
            {/* Basic Sync Options */}
            <div>
              <h4 className="font-medium mb-3">Automatic Sync</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.auto_sync_enabled}
                    onChange={(e) => handleSettingsChange('auto_sync_enabled', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Enable automatic sync</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.sync_on_create}
                    onChange={(e) => handleSettingsChange('sync_on_create', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Sync when appointments are created</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.sync_on_update}
                    onChange={(e) => handleSettingsChange('sync_on_update', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Sync when appointments are updated</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.sync_on_delete}
                    onChange={(e) => handleSettingsChange('sync_on_delete', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Remove from calendar when appointments are deleted</span>
                </label>
              </div>
            </div>

            {/* What to Sync */}
            <div>
              <h4 className="font-medium mb-3">What to Sync</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="sync_filter"
                    checked={settings.sync_all_appointments}
                    onChange={() => {
                      handleSettingsChange('sync_all_appointments', true);
                      handleSettingsChange('sync_only_confirmed', false);
                      handleSettingsChange('sync_only_paid', false);
                    }}
                  />
                  <span className="text-sm">All appointments</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="sync_filter"
                    checked={settings.sync_only_confirmed}
                    onChange={() => {
                      handleSettingsChange('sync_all_appointments', false);
                      handleSettingsChange('sync_only_confirmed', true);
                      handleSettingsChange('sync_only_paid', false);
                    }}
                  />
                  <span className="text-sm">Only confirmed appointments</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="sync_filter"
                    checked={settings.sync_only_paid}
                    onChange={() => {
                      handleSettingsChange('sync_all_appointments', false);
                      handleSettingsChange('sync_only_confirmed', false);
                      handleSettingsChange('sync_only_paid', true);
                    }}
                  />
                  <span className="text-sm">Only paid appointments</span>
                </label>
              </div>
            </div>

            {/* Event Information */}
            <div>
              <h4 className="font-medium mb-3">Event Information</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.show_client_name}
                    onChange={(e) => handleSettingsChange('show_client_name', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Show client name in event title</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.show_service_details}
                    onChange={(e) => handleSettingsChange('show_service_details', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Show service details</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.include_client_email}
                    onChange={(e) => handleSettingsChange('include_client_email', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Include client email in event</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.include_client_phone}
                    onChange={(e) => handleSettingsChange('include_client_phone', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Include client phone in description</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.include_service_price}
                    onChange={(e) => handleSettingsChange('include_service_price', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Include service price in description</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.include_notes}
                    onChange={(e) => handleSettingsChange('include_notes', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Include appointment notes</span>
                </label>
              </div>
            </div>

            {/* Reminders */}
            <div>
              <h4 className="font-medium mb-3">Reminders</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.enable_reminders}
                    onChange={(e) => handleSettingsChange('enable_reminders', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Enable reminders</span>
                </label>
                {settings.enable_reminders && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm w-32">Email reminder:</label>
                      <select
                        value={settings.reminder_email_minutes}
                        onChange={(e) => handleSettingsChange('reminder_email_minutes', parseInt(e.target.value))}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value={1440}>1 day before</option>
                        <option value={720}>12 hours before</option>
                        <option value={480}>8 hours before</option>
                        <option value={240}>4 hours before</option>
                        <option value={120}>2 hours before</option>
                        <option value={60}>1 hour before</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm w-32">Popup reminder:</label>
                      <select
                        value={settings.reminder_popup_minutes}
                        onChange={(e) => handleSettingsChange('reminder_popup_minutes', parseInt(e.target.value))}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value={30}>30 minutes before</option>
                        <option value={15}>15 minutes before</option>
                        <option value={10}>10 minutes before</option>
                        <option value={5}>5 minutes before</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy & Display */}
            <div>
              <h4 className="font-medium mb-3">Privacy & Display</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm w-32">Event visibility:</label>
                  <select
                    value={settings.event_visibility}
                    onChange={(e) => handleSettingsChange('event_visibility', e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {VISIBILITY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm w-32">Timezone:</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingsChange('timezone', e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {TIMEZONE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}