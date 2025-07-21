'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { ThemeToggle, SimpleThemeToggle } from '@/components/ThemeToggle';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

/**
 * Comprehensive Toggle Component Testing Suite
 * Verifies sophisticated toggles with teal active states and grey inactive states
 * Tests the design system consistency and advanced UI elements
 */
export default function UITestPage() {
  const [switches, setSwitches] = useState({
    basic: false,
    notifications: true,
    privacy: false,
    analytics: true,
    marketing: false,
    twoFactor: true,
    autoSave: false,
    darkMode: false,
  });

  const handleSwitchChange = (key: string) => (checked: boolean) => {
    setSwitches(prev => ({ ...prev, [key]: checked }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Toggle Components Test Suite
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Verifying sophisticated toggle switches with teal active states and grey inactive states
          </p>
          <Badge variant="outline" className="mt-4">
            Design System Verification
          </Badge>
        </div>

        {/* Theme Toggle Section */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Theme Toggle Components
          </h2>
          <div className="space-y-6">
            {/* Default iOS-style Switch */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Default iOS-style Toggle (Multi-state)
              </h3>
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ThemeToggle showLabel={true} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cycles through Light → Dark → System. Uses teal active state for dark mode.
              </p>
            </div>

            {/* Button Variant */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Button Variant Theme Toggle
              </h3>
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ThemeToggle variant="buttons" showLabel={true} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Button-style toggle with primary-600 active states (teal).
              </p>
            </div>

            {/* Dropdown Variant */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Dropdown Variant Theme Toggle
              </h3>
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ThemeToggle variant="dropdown" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select dropdown with focus states using primary-500 (teal).
              </p>
            </div>

            {/* Simple Toggle */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Simple Theme Toggle
              </h3>
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <SimpleThemeToggle />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Minimal icon-only toggle for headers and navigation.
              </p>
            </div>
          </div>
        </Card>

        {/* Basic Switch Components */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Basic Switch Components
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Small Switches */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Small Size
              </h3>
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="basic-sm">Basic Toggle</Label>
                  <Switch
                    id="basic-sm"
                    size="sm"
                    checked={switches.basic}
                    onCheckedChange={handleSwitchChange('basic')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications-sm">Notifications</Label>
                  <Switch
                    id="notifications-sm"
                    size="sm"
                    checked={switches.notifications}
                    onCheckedChange={handleSwitchChange('notifications')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="privacy-sm">Privacy Mode</Label>
                  <Switch
                    id="privacy-sm"
                    size="sm"
                    checked={switches.privacy}
                    onCheckedChange={handleSwitchChange('privacy')}
                  />
                </div>
              </div>
            </div>

            {/* Medium Switches (Default) */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Medium Size (Default)
              </h3>
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="analytics-md">Analytics</Label>
                  <Switch
                    id="analytics-md"
                    checked={switches.analytics}
                    onCheckedChange={handleSwitchChange('analytics')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketing-md">Marketing</Label>
                  <Switch
                    id="marketing-md"
                    checked={switches.marketing}
                    onCheckedChange={handleSwitchChange('marketing')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="2fa-md">Two-Factor Auth</Label>
                  <Switch
                    id="2fa-md"
                    checked={switches.twoFactor}
                    onCheckedChange={handleSwitchChange('twoFactor')}
                  />
                </div>
              </div>
            </div>

            {/* Large Switches */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Large Size
              </h3>
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autosave-lg">Auto Save</Label>
                  <Switch
                    id="autosave-lg"
                    size="lg"
                    checked={switches.autoSave}
                    onCheckedChange={handleSwitchChange('autoSave')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="dark-mode-lg">Dark Mode</Label>
                  <Switch
                    id="dark-mode-lg"
                    size="lg"
                    checked={switches.darkMode}
                    onCheckedChange={handleSwitchChange('darkMode')}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Design System Analysis */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Design System Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Color Verification */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Color System
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-500 rounded-md shadow-sm"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Primary-500 (Active State)
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      #14b8a6 - Teal
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-600 rounded-md shadow-sm"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Primary-600 (Dark Active)
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      #0d9488 - Darker Teal
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-md shadow-sm"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Gray (Inactive State)
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Light: #e5e7eb, Dark: #374151
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Animation Testing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Animation & Transitions
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Switch Animation Test
                  </p>
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={switches.basic}
                      onCheckedChange={handleSwitchChange('basic')}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Click to test 200ms transition
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* State Summary */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Current Toggle States
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(switches).map(([key, value]) => (
              <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize mb-1">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      value ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {value ? 'Active (Teal)' : 'Inactive (Grey)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Separator />

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Toggle Component Verification Complete - All components show teal active states and grey inactive states
          </p>
        </div>
      </div>
    </div>
  );
}