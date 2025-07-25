/**
 * Enhanced Mobile Calendar Demo
 * Interactive showcase of PWA features and mobile calendar functionality
 * Fresha-inspired design with Six Figure Barber methodology
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Bell, 
  Download, 
  Share, 
  Calendar,
  Zap,
  TouchPadOff,
  Vibrate,
  Star,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileCalendarLayout } from '@/components/calendar/MobileCalendarLayout';
import { HomeScreenWidget } from '@/components/pwa/HomeScreenWidget';
import { pushNotificationManager } from '@/lib/push-notifications';
import { offlineCalendarManager } from '@/lib/offline-calendar-manager';

interface DemoFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  demo: () => void;
  status: 'available' | 'demo' | 'disabled';
}

export default function MobileCalendarDemo() {
  const [currentDemo, setCurrentDemo] = useState<string>('overview');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [selectedDate] = useState(new Date());

  // Check PWA installation status
  useEffect(() => {
    const checkPWAInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebApps = (window.navigator as any).standalone === true;
      setIsPWAInstalled(isStandalone || isInWebApps);
    };

    checkPWAInstallation();

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      setIsPWAInstalled(true);
    });
  }, []);

  // Initialize push notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      if ('Notification' in window) {
        const permission = await pushNotificationManager.getPermissionStatus();
        setNotificationsEnabled(permission === 'granted');
      }
    };

    initializeNotifications();
  }, []);

  const demoFeatures: DemoFeature[] = [
    {
      id: 'offline',
      title: 'Offline Calendar',
      description: 'Works without internet connection',
      icon: <WifiOff className="h-5 w-5" />,
      demo: () => toggleOfflineMode(),
      status: 'available'
    },
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: 'Real-time appointment alerts',
      icon: <Bell className="h-5 w-5" />,
      demo: () => demoNotification(),
      status: notificationsEnabled ? 'available' : 'disabled'
    },
    {
      id: 'gestures',
      title: 'Touch Gestures',
      description: 'Swipe, long press, haptic feedback',
      icon: <TouchPadOff className="h-5 w-5" />,
      demo: () => demoGestures(),
      status: 'demo'
    },
    {
      id: 'pwa',
      title: 'Install App',
      description: 'Add to home screen',
      icon: <Download className="h-5 w-5" />,
      demo: () => demoInstallPWA(),
      status: isPWAInstalled ? 'available' : 'demo'
    },
    {
      id: 'haptic',
      title: 'Haptic Feedback',
      description: 'Native-like vibration feedback',
      icon: <Vibrate className="h-5 w-5" />,
      demo: () => demoHapticFeedback(),
      status: hapticEnabled ? 'available' : 'disabled'
    },
    {
      id: 'sync',
      title: 'Background Sync',
      description: 'Auto-sync when back online',
      icon: <Zap className="h-5 w-5" />,
      demo: () => demoBackgroundSync(),
      status: 'demo'
    }
  ];

  const toggleOfflineMode = () => {
    setIsOfflineMode(!isOfflineMode);
    // Simulate offline mode
    if (!isOfflineMode) {
      console.log('📵 Offline mode enabled - demonstrating offline functionality');
    } else {
      console.log('📶 Back online - syncing data');
    }
  };

  const demoNotification = async () => {
    if (!notificationsEnabled) {
      const permission = await pushNotificationManager.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission !== 'granted') {
        alert('Please enable notifications to see this demo');
        return;
      }
    }

    await pushNotificationManager.showNotification({
      id: 'demo_notification',
      title: '📅 Demo Appointment Reminder',
      body: 'John Doe appointment in 15 minutes - Haircut & Style',
      tag: 'appointment_reminder',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  };

  const demoGestures = () => {
    setCurrentDemo('gestures');
    setDemoRunning(true);
    
    // Auto-stop demo after 10 seconds
    setTimeout(() => {
      setDemoRunning(false);
    }, 10000);
  };

  const demoInstallPWA = async () => {
    if (isPWAInstalled) {
      alert('PWA is already installed! Look for the BookedBarber icon on your home screen.');
      return;
    }

    // Check for beforeinstallprompt event
    const deferredPrompt = (window as any).deferredPrompt;
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsPWAInstalled(true);
      }
    } else {
      alert('To install this app:\n\n1. Tap the browser menu\n2. Select "Add to Home Screen"\n3. Follow the prompts');
    }
  };

  const demoHapticFeedback = () => {
    if ('vibrate' in navigator && hapticEnabled) {
      // Different vibration patterns
      navigator.vibrate([50, 100, 50]); // Light feedback
      setTimeout(() => navigator.vibrate([100]), 300); // Medium
      setTimeout(() => navigator.vibrate([200]), 600); // Heavy
    } else {
      alert('Haptic feedback is not available on this device');
    }
  };

  const demoBackgroundSync = async () => {
    alert('Background Sync Demo:\n\n1. Create an appointment offline\n2. Go offline\n3. Come back online\n4. Changes sync automatically');
    
    // Simulate background sync
    console.log('🔄 Demonstrating background sync...');
    await offlineCalendarManager.syncPendingAppointments();
  };

  const handleAppointmentSelect = (appointment: any) => {
    console.log('Selected appointment:', appointment);
  };

  const handleCreateAppointment = (timeSlot: string) => {
    console.log('Creating appointment at:', timeSlot);
    alert(`Demo: Creating appointment at ${timeSlot}`);
  };

  const handleNavigate = (path: string) => {
    console.log('Navigate to:', path);
    alert(`Demo: Navigate to ${path}`);
  };

  const getFeatureStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'demo':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'disabled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Mobile PWA Demo
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fresha-inspired Calendar
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isPWAInstalled && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Download className="h-3 w-3 mr-1" />
                  Installed
                </Badge>
              )}
              {isOfflineMode ? (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              )}
            </div>
          </div>

          {/* Demo Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isOfflineMode}
                  onCheckedChange={toggleOfflineMode}
                  id="offline-mode"
                />
                <label htmlFor="offline-mode" className="text-sm">
                  Offline Mode
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={hapticEnabled}
                  onCheckedChange={setHapticEnabled}
                  id="haptic-feedback"
                />
                <label htmlFor="haptic-feedback" className="text-sm">
                  Haptic Feedback
                </label>
              </div>
            </div>

            {demoRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDemoRunning(false)}
              >
                <Pause className="h-4 w-4 mr-1" />
                Stop Demo
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <div className="p-4">
        <Tabs value={currentDemo} onValueChange={setCurrentDemo}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="widget">Widget</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4">
              {demoFeatures.map((feature) => (
                <motion.div
                  key={feature.id}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={feature.demo}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          {feature.icon}
                        </div>
                        <Badge className={`text-xs ${getFeatureStatusColor(feature.status)} border`}>
                          {feature.status}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Demo Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Mobile Experience:</strong> This demo works best on mobile devices. Try pinch-to-zoom, swipe gestures, and long-press interactions.
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>PWA Features:</strong> Install the app to your home screen for the full native experience with offline support.
                  </p>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    <strong>Offline Mode:</strong> Toggle offline mode to see how the app works without internet connectivity.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mobile Calendar Layout</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Touch-optimized calendar with vertical scrolling
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div style={{ height: '600px' }}>
                    <MobileCalendarLayout
                      barberId="demo-barber"
                      barberName="Demo Barber"
                      initialDate={selectedDate}
                      onAppointmentSelect={handleAppointmentSelect}
                      onCreateAppointment={handleCreateAppointment}
                      isOffline={isOfflineMode}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {demoRunning && currentDemo === 'gestures' && (
              <motion.div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="w-full max-w-sm">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TouchPadOff className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Try These Gestures
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <p>• Swipe left/right to change dates</p>
                      <p>• Long press on appointments</p>
                      <p>• Double tap to quick book</p>
                      <p>• Pull down to refresh</p>
                      <p>• Pinch to zoom time slots</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="widget" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Home Screen Widget</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Quick access dashboard for PWA home screen
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div style={{ height: '600px', overflow: 'auto' }}>
                    <HomeScreenWidget
                      barberId="demo-barber"
                      barberName="Demo Barber"
                      onNavigate={handleNavigate}
                      className="p-4"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="space-y-4">
              {demoFeatures.map((feature) => (
                <Card key={feature.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          {feature.icon}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getFeatureStatusColor(feature.status)} border`}>
                          {feature.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={feature.demo}
                          disabled={feature.status === 'disabled'}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Demo
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Back to App Button */}
      <div className="fixed bottom-4 left-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
          className="bg-white dark:bg-gray-800 shadow-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to App
        </Button>
      </div>

      {/* PWA Install Prompt */}
      {!isPWAInstalled && (
        <div className="fixed bottom-4 right-4">
          <Button
            onClick={demoInstallPWA}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Download className="h-4 w-4 mr-1" />
            Install App
          </Button>
        </div>
      )}
    </div>
  );
}