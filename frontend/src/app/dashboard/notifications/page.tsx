'use client'

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  NotificationCenter,
  NotificationSettings,
  NotificationTesting,
  NotificationAnalytics
} from '@/components/notifications';
import { useAuth } from '@/components/AuthProvider';
import {
  Bell,
  Settings,
  TestTube,
  BarChart3,
  Mail,
  MessageSquare,
  Users,
  Calendar
} from 'lucide-react';

type TabType = 'center' | 'settings' | 'testing' | 'analytics';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('center');

  const tabs = [
    {
      id: 'center' as TabType,
      label: 'Notification Center',
      icon: Bell,
      description: 'View and manage notification history'
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      icon: Settings,
      description: 'Configure notification preferences'
    },
    {
      id: 'testing' as TabType,
      label: 'Testing',
      icon: TestTube,
      description: 'Test notification templates',
      adminOnly: true
    },
    {
      id: 'analytics' as TabType,
      label: 'Analytics',
      icon: BarChart3,
      description: 'View notification performance metrics',
      adminOnly: true
    }
  ];

  const availableTabs = tabs.filter(tab =>
    !tab.adminOnly || (user?.role === 'admin' || user?.role === 'shop_owner')
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'center':
        return <NotificationCenter />;
      case 'settings':
        return <NotificationSettings />;
      case 'testing':
        return <NotificationTesting />;
      case 'analytics':
        return <NotificationAnalytics />;
      default:
        return <NotificationCenter />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="mt-2 text-gray-600">
                Manage notification preferences, view history, and monitor delivery performance
              </p>
            </div>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-2">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-xs text-gray-500">94.2% delivered</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-2">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">SMS</p>
                <p className="text-xs text-gray-500">98.1% delivered</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-2">
                  <Bell className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Push</p>
                <p className="text-xs text-gray-500">89.7% delivered</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </Button>
                );
              })}
            </nav>

            {/* Tab descriptions */}
            <div className="mt-3">
              {availableTabs.map((tab) => (
                activeTab === tab.id && (
                  <p key={tab.id} className="text-sm text-gray-600">
                    {tab.description}
                  </p>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white">
          {renderTabContent()}
        </div>

        {/* Help Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Notification Settings</p>
                  <p className="text-sm text-gray-600">Configure when and how you receive notifications</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Client Preferences</p>
                  <p className="text-sm text-gray-600">Manage notification preferences for your clients</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Reminder Timing</p>
                  <p className="text-sm text-gray-600">Set up automated appointment reminders</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
