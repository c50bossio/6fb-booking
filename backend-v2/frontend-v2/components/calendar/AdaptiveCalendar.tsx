/**
 * Adaptive Calendar Component
 * 
 * This unified calendar component consolidates multiple calendar layouts into a single,
 * configurable component that adapts to different screen sizes, use cases, and features.
 * 
 * Consolidates:
 * - UnifiedCalendar.tsx (main calendar)
 * - MobileCalendarLayout.tsx (mobile-optimized)
 * - FreshaCalendarLayout.tsx (Fresha-inspired design)
 * - AIEnhancedCalendarLayout.tsx (AI-powered features)
 * - ResponsiveMobileCalendar.tsx (mobile responsive)
 * - SixFigureCalendarView.tsx (Six Figure Barber methodology)
 * 
 * Features:
 * - Responsive design that adapts to screen size
 * - Multiple view modes (day, week, month, agenda)
 * - AI-powered insights and recommendations
 * - Six Figure Barber methodology integration
 * - Mobile touch gestures and interactions
 * - Accessibility features and keyboard navigation
 * - Offline capability and PWA support
 * - Performance optimization and lazy loading
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addDays, 
  subDays, 
  isSameDay, 
  isToday,
  startOfWeek, 
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  parseISO
} from 'date-fns';

// Icons
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  SparklesIcon,
  ChartBarIcon,
  BoltIcon,
  EyeIcon,
  EyeSlashIcon,
  Grid3X3,
  List,
  Smartphone,
  Monitor
} from 'lucide-react';

import {
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Calendar-specific components
import { CalendarHeader } from './CalendarHeader';
import { CalendarKeyboardNavigation } from './CalendarKeyboardNavigation';
import { CalendarA11yProvider } from './CalendarAccessibility';
import { CalendarEmptyState, CalendarLoadingManager } from './CalendarLoadingStates';
import { CalendarErrorBoundary } from './CalendarErrorBoundary';
import SmartTimeSuggestions from './SmartTimeSuggestions';
import AIInsightsSidebar from './AIInsightsSidebar';
import { PullToRefresh } from './PullToRefresh';
import { SwipeNavigation } from './SwipeNavigation';
import { MobileAppointmentDrawer } from './MobileAppointmentDrawer';

// Hooks and utilities
import { useMobileCalendarGestures } from '@/hooks/useMobileCalendarGestures';
import { useResponsive } from '@/hooks/useResponsive';
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility';
import { useCalendarState } from '@/hooks/useCalendarState';
import { useCalendarDragAndDrop } from '@/hooks/useCalendarDragAndDrop';

// Managers and services
import { offlineCalendarManager, OfflineAppointment } from '@/lib/offline-calendar-manager';
import { pushNotificationManager } from '@/lib/push-notifications';
import { aiSchedulingEngine } from '@/lib/ai-scheduling-engine';
import { businessIntelligence } from '@/lib/business-intelligence';
import { revenueOptimization } from '@/lib/revenue-optimization';

// Types
import type { BookingResponse } from '@/lib/api';

// Calendar view types
export type CalendarView = 'day' | 'week' | 'month' | 'agenda';
export type CalendarLayout = 'standard' | 'mobile' | 'fresha' | 'ai-enhanced' | 'six-figure';
export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

// Extended appointment interface
interface Appointment extends BookingResponse {
  height?: number;
  client_tier?: 'new' | 'regular' | 'vip' | 'platinum';
  is_recurring?: boolean;
  ai_score?: number;
  revenue_potential?: number;
  six_figure_score?: number;
}

interface Barber {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar?: string;
  specialties?: string[];
  role?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  appointment?: Appointment;
  revenue?: number;
  ai_recommendation?: 'optimal' | 'good' | 'suboptimal';
}

interface DayStats {
  totalAppointments: number;
  totalRevenue: number;
  completedAppointments: number;
  availableSlots: number;
  aiOptimizationScore?: number;
  sixFigureScore?: number;
}

// Configuration interface
interface AdaptiveCalendarConfig {
  view: CalendarView;
  layout: CalendarLayout;
  showAI: boolean;
  showSixFigure: boolean;
  showRevenue: boolean;
  showInsights: boolean;
  enableOffline: boolean;
  enableGestures: boolean;
  enableKeyboardNav: boolean;
  autoLayout: boolean; // Automatically choose layout based on screen size
}

interface AdaptiveCalendarProps {
  barberId?: string;
  barberName?: string;
  barbers?: Barber[];
  appointments?: Appointment[];
  initialDate?: Date;
  initialConfig?: Partial<AdaptiveCalendarConfig>;
  onAppointmentSelect?: (appointment: Appointment) => void;
  onAppointmentCreate?: (timeSlot: string, date: Date) => void;
  onAppointmentUpdate?: (appointment: Appointment) => void;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
  onConfigChange?: (config: AdaptiveCalendarConfig) => void;
  isLoading?: boolean;
  isOffline?: boolean;
  className?: string;
}

const DEFAULT_CONFIG: AdaptiveCalendarConfig = {
  view: 'week',
  layout: 'standard',
  showAI: true,
  showSixFigure: true,
  showRevenue: true,
  showInsights: true,
  enableOffline: true,
  enableGestures: true,
  enableKeyboardNav: true,
  autoLayout: true
};

const TIME_SLOTS_START = 8; // 8 AM
const TIME_SLOTS_END = 20; // 8 PM
const SLOT_HEIGHT = 80;

export function AdaptiveCalendar({
  barberId,
  barberName,
  barbers = [],
  appointments = [],
  initialDate = new Date(),
  initialConfig = {},
  onAppointmentSelect,
  onAppointmentCreate,
  onAppointmentUpdate,
  onDateChange,
  onViewChange,
  onConfigChange,
  isLoading = false,
  isOffline = false,
  className = ''
}: AdaptiveCalendarProps) {
  
  // State management
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [config, setConfig] = useState<AdaptiveCalendarConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [sixFigureMetrics, setSixFigureMetrics] = useState<any>(null);

  // Responsive detection
  const { isMobile, isTablet, isDesktop, screenSize } = useResponsive();
  
  // Determine effective layout
  const effectiveLayout = useMemo(() => {
    if (!config.autoLayout) return config.layout;
    
    // Auto-select layout based on screen size and features
    if (isMobile) {
      return config.showAI ? 'ai-enhanced' : 'mobile';
    }
    if (isTablet) {
      return config.showSixFigure ? 'six-figure' : 'fresha';
    }
    return config.showAI ? 'ai-enhanced' : 'standard';
  }, [config.autoLayout, config.layout, config.showAI, config.showSixFigure, isMobile, isTablet]);

  // Calendar state and handlers
  const {
    timeSlots,
    dayStats,
    refreshData,
    isRefreshing
  } = useCalendarState(currentDate, appointments, barberId);

  // Mobile gestures
  const mobileGestures = useMobileCalendarGestures({
    onSwipeLeft: () => navigateDate(1),
    onSwipeRight: () => navigateDate(-1),
    onPullRefresh: refreshData,
    enabled: config.enableGestures && (isMobile || isTablet)
  });

  // Accessibility
  const a11y = useCalendarAccessibility({
    enabled: config.enableKeyboardNav,
    currentDate,
    selectedAppointment,
    onDateChange: handleDateChange,
    onAppointmentSelect: handleAppointmentSelect
  });

  // Drag and drop
  const dragAndDrop = useCalendarDragAndDrop({
    enabled: !isMobile,
    onAppointmentMove: handleAppointmentUpdate,
    onAppointmentResize: handleAppointmentUpdate
  });

  // Event handlers
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
    onDateChange?.(date);
  }, [onDateChange]);

  const handleViewChange = useCallback((view: CalendarView) => {
    setConfig(prev => ({ ...prev, view }));
    onViewChange?.(view);
  }, [onViewChange]);

  const handleConfigChange = useCallback((newConfig: Partial<AdaptiveCalendarConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    onConfigChange?.(updated);
  }, [config, onConfigChange]);

  const handleAppointmentSelect = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    onAppointmentSelect?.(appointment);
  }, [onAppointmentSelect]);

  const handleAppointmentUpdate = useCallback((appointment: Appointment) => {
    onAppointmentUpdate?.(appointment);
  }, [onAppointmentUpdate]);

  const navigateDate = useCallback((direction: number) => {
    let newDate: Date;
    
    switch (config.view) {
      case 'day':
        newDate = direction > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1);
        break;
      case 'week':
        newDate = direction > 0 ? addWeeks(currentDate, 1) : addWeeks(currentDate, -1);
        break;
      case 'month':
        newDate = direction > 0 ? addMonths(currentDate, 1) : addMonths(currentDate, -1);
        break;
      default:
        newDate = direction > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1);
    }
    
    handleDateChange(newDate);
  }, [config.view, currentDate, handleDateChange]);

  // AI and business intelligence effects
  useEffect(() => {
    if (config.showAI && appointments.length > 0) {
      aiSchedulingEngine.generateInsights(appointments, currentDate)
        .then(setAiInsights)
        .catch(console.error);
    }
  }, [config.showAI, appointments, currentDate]);

  useEffect(() => {
    if (config.showSixFigure && appointments.length > 0) {
      businessIntelligence.calculateSixFigureScore(appointments, currentDate)
        .then(setSixFigureMetrics)
        .catch(console.error);
    }
  }, [config.showSixFigure, appointments, currentDate]);

  // Render configuration dialog
  const renderConfigDialog = () => (
    <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Calendar Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* View Selection */}
          <div className="space-y-2">
            <Label>Calendar View</Label>
            <Select value={config.view} onValueChange={(view: CalendarView) => 
              handleConfigChange({ view })
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
                <SelectItem value="month">Month View</SelectItem>
                <SelectItem value="agenda">Agenda View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout Selection */}
          <div className="space-y-2">
            <Label>Layout Style</Label>
            <Select value={config.layout} onValueChange={(layout: CalendarLayout) => 
              handleConfigChange({ layout, autoLayout: false })
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="mobile">Mobile Optimized</SelectItem>
                <SelectItem value="fresha">Fresha Inspired</SelectItem>
                <SelectItem value="ai-enhanced">AI Enhanced</SelectItem>
                <SelectItem value="six-figure">Six Figure Barber</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-layout">Auto Layout</Label>
              <Switch
                id="auto-layout"
                checked={config.autoLayout}
                onCheckedChange={(autoLayout) => handleConfigChange({ autoLayout })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-ai">AI Insights</Label>
              <Switch
                id="show-ai"
                checked={config.showAI}
                onCheckedChange={(showAI) => handleConfigChange({ showAI })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-six-figure">Six Figure Metrics</Label>
              <Switch
                id="show-six-figure"
                checked={config.showSixFigure}
                onCheckedChange={(showSixFigure) => handleConfigChange({ showSixFigure })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-revenue">Revenue Display</Label>
              <Switch
                id="show-revenue"
                checked={config.showRevenue}
                onCheckedChange={(showRevenue) => handleConfigChange({ showRevenue })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-gestures">Touch Gestures</Label>
              <Switch
                id="enable-gestures"
                checked={config.enableGestures}
                onCheckedChange={(enableGestures) => handleConfigChange({ enableGestures })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-keyboard">Keyboard Navigation</Label>
              <Switch
                id="enable-keyboard"
                checked={config.enableKeyboardNav}
                onCheckedChange={(enableKeyboardNav) => handleConfigChange({ enableKeyboardNav })}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render header with controls
  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate(-1)}
            className="p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentDate, config.view === 'month' ? 'MMMM yyyy' : 'MMM dd, yyyy')}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate(1)}
            className="p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDateChange(new Date())}
        >
          Today
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        {/* View toggles */}
        <Tabs value={config.view} onValueChange={handleViewChange}>
          <TabsList className="hidden sm:flex">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Mobile view selector */}
        <Select value={config.view} onValueChange={handleViewChange}>
          <SelectTrigger className="w-24 sm:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="agenda">Agenda</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={isRefreshing}
          className="p-2"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>

        {/* Settings button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfigDialog(true)}
          className="p-2"
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // Main render
  return (
    <CalendarErrorBoundary>
      <CalendarA11yProvider enabled={config.enableKeyboardNav}>
        <div className={`adaptive-calendar ${className}`} {...mobileGestures}>
          {renderHeader()}
          
          <div className="flex-1 flex overflow-hidden">
            {/* Main calendar area */}
            <div className="flex-1 relative">
              {config.enableGestures && isMobile && (
                <PullToRefresh onRefresh={refreshData} isRefreshing={isRefreshing} />
              )}
              
              <CalendarLoadingManager
                isLoading={isLoading}
                isEmpty={appointments.length === 0}
                currentDate={currentDate}
                view={config.view}
                layout={effectiveLayout}
                appointments={appointments}
                timeSlots={timeSlots}
                onAppointmentSelect={handleAppointmentSelect}
                onAppointmentCreate={onAppointmentCreate}
                onDateChange={handleDateChange}
                config={config}
                dragAndDropProps={dragAndDrop}
              />

              {config.enableGestures && (isMobile || isTablet) && (
                <SwipeNavigation
                  onSwipeLeft={() => navigateDate(1)}
                  onSwipeRight={() => navigateDate(-1)}
                />
              )}
            </div>

            {/* AI Insights Sidebar (desktop only) */}
            {config.showAI && isDesktop && config.showInsights && (
              <AIInsightsSidebar
                insights={aiInsights}
                sixFigureMetrics={sixFigureMetrics}
                currentDate={currentDate}
                appointments={appointments}
                className="w-80 border-l bg-gray-50 dark:bg-gray-800"
              />
            )}
          </div>

          {/* Mobile AI drawer */}
          {config.showAI && config.showInsights && (isMobile || isTablet) && (
            <MobileAppointmentDrawer
              appointment={selectedAppointment}
              insights={aiInsights}
              sixFigureMetrics={sixFigureMetrics}
              onClose={() => setSelectedAppointment(null)}
            />
          )}

          {/* Configuration dialog */}
          {renderConfigDialog()}

          {/* Keyboard navigation */}
          {config.enableKeyboardNav && (
            <CalendarKeyboardNavigation
              currentDate={currentDate}
              view={config.view}
              appointments={appointments}
              onDateChange={handleDateChange}
              onAppointmentSelect={handleAppointmentSelect}
              {...a11y}
            />
          )}

          {config.showAI && (
            <SmartTimeSuggestions
              currentDate={currentDate}
              appointments={appointments}
              insights={aiInsights}
              onTimeSelect={(time) => onAppointmentCreate?.(time, currentDate)}
            />
          )}
        </div>
      </CalendarA11yProvider>
    </CalendarErrorBoundary>
  );
}

export default AdaptiveCalendar;