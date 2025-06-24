'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/components/AuthProvider';
import {
  Bell,
  Mail,
  MessageSquare,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  History,
  TestTube
} from 'lucide-react';
import { notificationService, NotificationHistory } from '@/lib/notifications/notification-service';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'email' | 'sms' | 'push'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const history = await notificationService.getNotificationHistory(user!.id);
      setNotifications(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'push':
        return <Bell className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (selectedTab === 'all') return true;
    return notification.type === selectedTab;
  });

  const getNotificationStats = () => {
    const total = notifications.length;
    const sent = notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length;
    const failed = notifications.filter(n => n.status === 'failed').length;
    const pending = notifications.filter(n => n.status === 'pending').length;

    return { total, sent, failed, pending };
  };

  const stats = getNotificationStats();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchNotifications} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Center</h2>
          <p className="text-gray-600">Manage and view your notification history</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={refreshNotifications}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => window.location.href = '/settings/notifications'}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <History className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Sent</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <X className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Button
              variant={selectedTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab('all')}
            >
              All
            </Button>
            <Button
              variant={selectedTab === 'email' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab('email')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              variant={selectedTab === 'sms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab('sms')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </Button>
            <Button
              variant={selectedTab === 'push' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab('push')}
            >
              <Bell className="w-4 h-4 mr-2" />
              Push
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No notifications found</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(notification.type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{notification.template.replace('_', ' ')}</p>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        To: {notification.recipient}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(notification.sentAt).toLocaleString()}
                      </p>
                      {notification.error && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {notification.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(notification.status)}
                    {notification.retryCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Retry {notification.retryCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
