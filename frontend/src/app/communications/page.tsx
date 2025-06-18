'use client';

import React, { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { NotificationPreferences, CommunicationHistory, TestNotifications } from '@/components/communications';
import { Settings, History, TestTube } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function CommunicationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('preferences');

  const tabItems = [
    {
      value: 'preferences',
      label: (
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Preferences
        </div>
      ),
      content: <NotificationPreferences />
    },
    {
      value: 'history',
      label: (
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          History
        </div>
      ),
      content: <CommunicationHistory />
    }
  ];

  // Add test notifications tab for admins
  if (user && ['admin', 'super_admin'].includes(user.role)) {
    tabItems.push({
      value: 'test',
      label: (
        <div className="flex items-center gap-2">
          <TestTube className="w-4 h-4" />
          Test
        </div>
      ),
      content: <TestNotifications />
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Communications</h1>
        <p className="text-gray-600">
          Manage your notification preferences and view communication history
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={tabItems}
      />
    </div>
  );
}