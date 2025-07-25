/**
 * Adaptive Dashboard Component
 * 
 * This unified dashboard component consolidates multiple dashboard layouts into a single,
 * configurable component that adapts to different user roles, screen sizes, and business needs.
 * 
 * Consolidates:
 * - EnhancedAnalyticsDashboard.tsx
 * - SixFigureAnalyticsDashboard.tsx
 * - AdvancedAnalyticsDashboard.tsx
 * - TrackingAnalyticsDashboard.tsx
 * - MarketingAnalyticsDashboard.tsx
 * - BusinessIntelligenceDashboard.tsx
 * - GoalTrackingDashboard.tsx
 * - PricingOptimizationDashboard.tsx
 * 
 * Features:
 * - Role-based dashboard configuration
 * - Responsive layout system
 * - Configurable widget system
 * - Real-time data updates
 * - Six Figure Barber methodology integration
 * - Performance optimized with lazy loading
 * - Accessibility compliant
 * - Mobile-first responsive design
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Target,
  Brain,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Grid,
  Layout,
  Smartphone,
  Monitor,
  RefreshCw
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Dashboard widgets
import { RevenueWidget } from './widgets/RevenueWidget';
import { AppointmentsWidget } from './widgets/AppointmentsWidget';
import { ClientsWidget } from './widgets/ClientsWidget';
import { GoalsWidget } from './widgets/GoalsWidget';
import { SixFigureWidget } from './widgets/SixFigureWidget';
import { AIInsightsWidget } from './widgets/AIInsightsWidget';
import { MarketingWidget } from './widgets/MarketingWidget';
import { PerformanceWidget } from './widgets/PerformanceWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { NotificationsWidget } from './widgets/NotificationsWidget';

// Hooks and utilities
import { useResponsive } from '@/hooks/useResponsive';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUserRole } from '@/hooks/useUserRole';

// Types
type UserRole = 'CLIENT' | 'BARBER' | 'SHOP_OWNER' | 'ENTERPRISE_OWNER';
type DashboardLayout = 'grid' | 'list' | 'cards' | 'compact';
type WidgetSize = 'small' | 'medium' | 'large' | 'full';

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: WidgetSize;
  position: { x: number; y: number };
  visible: boolean;
  config: Record<string, any>;
  requiredRole?: UserRole[];
  mobileHidden?: boolean;
}

interface DashboardConfig {
  layout: DashboardLayout;
  showSixFigure: boolean;
  showAI: boolean;
  showMarketing: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  compactMode: boolean;
  darkMode: boolean;
}

interface AdaptiveDashboardProps {
  userRole?: UserRole;
  userId?: string;
  organizationId?: string;
  initialConfig?: Partial<DashboardConfig>;
  customWidgets?: DashboardWidget[];
  onConfigChange?: (config: DashboardConfig) => void;
  className?: string;
}

// Default widget configurations by role
const DEFAULT_WIDGETS: Record<UserRole, DashboardWidget[]> = {
  CLIENT: [
    {
      id: 'upcoming-appointments',
      type: 'appointments',
      title: 'Upcoming Appointments',
      size: 'large',
      position: { x: 0, y: 0 },
      visible: true,
      config: { view: 'upcoming', limit: 5 }
    },
    {
      id: 'booking-history',
      type: 'appointments',
      title: 'Booking History',
      size: 'medium',
      position: { x: 1, y: 0 },
      visible: true,
      config: { view: 'history', limit: 3 }
    },
    {
      id: 'quick-actions',
      type: 'quick-actions',
      title: 'Quick Actions',
      size: 'small',
      position: { x: 0, y: 1 },
      visible: true,
      config: { actions: ['book', 'reschedule', 'cancel'] }
    }
  ],
  BARBER: [
    {
      id: 'revenue-overview',
      type: 'revenue',
      title: 'Revenue Overview',
      size: 'large',
      position: { x: 0, y: 0 },
      visible: true,
      config: { period: 'week', showGoals: true }
    },
    {
      id: 'daily-appointments',
      type: 'appointments',
      title: 'Today\'s Schedule',
      size: 'medium',
      position: { x: 1, y: 0 },
      visible: true,
      config: { view: 'today', showRevenue: true }
    },
    {
      id: 'six-figure-progress',
      type: 'six-figure',
      title: 'Six Figure Progress',
      size: 'medium',
      position: { x: 0, y: 1 },
      visible: true,
      config: { targetIncome: 100000 }
    },
    {
      id: 'ai-insights',
      type: 'ai-insights',
      title: 'AI Insights',
      size: 'medium',
      position: { x: 1, y: 1 },
      visible: true,
      config: { showRecommendations: true }
    },
    {
      id: 'client-insights',
      type: 'clients',
      title: 'Client Insights',
      size: 'small',
      position: { x: 0, y: 2 },
      visible: true,
      config: { showRetention: true, showLTV: true }
    },
    {
      id: 'quick-actions',
      type: 'quick-actions',
      title: 'Quick Actions',
      size: 'small',
      position: { x: 1, y: 2 },
      visible: true,
      config: { actions: ['new-appointment', 'block-time', 'client-notes'] }
    }
  ],
  SHOP_OWNER: [
    {
      id: 'business-overview',
      type: 'revenue',
      title: 'Business Overview',
      size: 'full',
      position: { x: 0, y: 0 },
      visible: true,
      config: { period: 'month', showComparison: true, showForecast: true }
    },
    {
      id: 'barber-performance',
      type: 'performance',
      title: 'Barber Performance',
      size: 'large',
      position: { x: 0, y: 1 },
      visible: true,
      config: { showCommissions: true, showGoals: true }
    },
    {
      id: 'marketing-roi',
      type: 'marketing',
      title: 'Marketing ROI',
      size: 'medium',
      position: { x: 1, y: 1 },
      visible: true,
      config: { showChannels: true, showConversions: true }
    },
    {
      id: 'six-figure-methodology',
      type: 'six-figure',
      title: '6FB Methodology',
      size: 'medium',
      position: { x: 0, y: 2 },
      visible: true,
      config: { showTeamProgress: true, targetIncome: 250000 }
    },
    {
      id: 'ai-business-insights',
      type: 'ai-insights',
      title: 'Business Intelligence',
      size: 'medium',
      position: { x: 1, y: 2 },
      visible: true,
      config: { showPredictions: true, showOptimizations: true }
    }
  ],
  ENTERPRISE_OWNER: [
    {
      id: 'enterprise-overview',
      type: 'revenue',
      title: 'Enterprise Overview',
      size: 'full',
      position: { x: 0, y: 0 },
      visible: true,
      config: { 
        period: 'quarter', 
        showMultiLocation: true, 
        showComparison: true, 
        showForecast: true 
      }
    },
    {
      id: 'location-performance',
      type: 'performance',
      title: 'Location Performance',
      size: 'large',
      position: { x: 0, y: 1 },
      visible: true,
      config: { showLocations: true, showComparisons: true }
    },
    {
      id: 'marketing-analytics',
      type: 'marketing',
      title: 'Marketing Analytics',
      size: 'large',
      position: { x: 1, y: 1 },
      visible: true,
      config: { 
        showChannels: true, 
        showROI: true, 
        showAttribution: true 
      }
    },
    {
      id: 'six-figure-enterprise',
      type: 'six-figure',
      title: '6FB Enterprise Metrics',
      size: 'medium',
      position: { x: 0, y: 2 },
      visible: true,
      config: { 
        showEnterpriseGoals: true, 
        targetIncome: 1000000,
        showLocationBreakdown: true
      }
    },
    {
      id: 'ai-enterprise-insights',
      type: 'ai-insights',
      title: 'Enterprise Intelligence',
      size: 'medium',
      position: { x: 1, y: 2 },
      visible: true,
      config: { 
        showMarketAnalysis: true, 
        showExpansionOpportunities: true,
        showCompetitiveIntelligence: true
      }
    }
  ]
};

const DEFAULT_CONFIG: DashboardConfig = {
  layout: 'grid',
  showSixFigure: true,
  showAI: true,
  showMarketing: true,
  autoRefresh: true,
  refreshInterval: 300000, // 5 minutes
  compactMode: false,
  darkMode: false
};

export function AdaptiveDashboard({
  userRole = 'BARBER',
  userId,
  organizationId,
  initialConfig = {},
  customWidgets,
  onConfigChange,
  className = ''
}: AdaptiveDashboardProps) {
  
  // State management
  const [config, setConfig] = useState<DashboardConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  
  const [widgets, setWidgets] = useState<DashboardWidget[]>(
    customWidgets || DEFAULT_WIDGETS[userRole] || []
  );
  
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hooks
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { role: detectedRole } = useUserRole();
  const effectiveRole = userRole || detectedRole || 'BARBER';

  // Dashboard data
  const {
    data,
    isLoading,
    error,
    refresh
  } = useDashboardData({
    userId,
    organizationId,
    role: effectiveRole,
    refreshInterval: config.autoRefresh ? config.refreshInterval : 0
  });

  // Effective layout based on screen size
  const effectiveLayout = useMemo(() => {
    if (isMobile) return 'list';
    if (isTablet && config.compactMode) return 'compact';
    return config.layout;
  }, [isMobile, isTablet, config.layout, config.compactMode]);

  // Visible widgets based on screen size and config
  const visibleWidgets = useMemo(() => {
    return widgets.filter(widget => {
      if (!widget.visible) return false;
      if (isMobile && widget.mobileHidden) return false;
      if (widget.requiredRole && !widget.requiredRole.includes(effectiveRole)) return false;
      
      // Filter based on config
      if (widget.type === 'six-figure' && !config.showSixFigure) return false;
      if (widget.type === 'ai-insights' && !config.showAI) return false;
      if (widget.type === 'marketing' && !config.showMarketing) return false;
      
      return true;
    });
  }, [widgets, isMobile, effectiveRole, config]);

  // Configuration handlers
  const handleConfigChange = useCallback((newConfig: Partial<DashboardConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    onConfigChange?.(updated);
  }, [config, onConfigChange]);

  const handleWidgetToggle = useCallback((widgetId: string, visible: boolean) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId ? { ...widget, visible } : widget
    ));
  }, []);

  const handleWidgetResize = useCallback((widgetId: string, size: WidgetSize) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId ? { ...widget, size } : widget
    ));
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Render widget based on type
  const renderWidget = useCallback((widget: DashboardWidget) => {
    const widgetProps = {
      key: widget.id,
      id: widget.id,
      title: widget.title,
      size: widget.size,
      config: widget.config,
      data: data[widget.type],
      isLoading: isLoading[widget.type],
      error: error[widget.type],
      className: getWidgetClassName(widget.size, effectiveLayout)
    };

    switch (widget.type) {
      case 'revenue':
        return <RevenueWidget {...widgetProps} />;
      case 'appointments':
        return <AppointmentsWidget {...widgetProps} />;
      case 'clients':
        return <ClientsWidget {...widgetProps} />;
      case 'goals':
        return <GoalsWidget {...widgetProps} />;
      case 'six-figure':
        return <SixFigureWidget {...widgetProps} />;
      case 'ai-insights':
        return <AIInsightsWidget {...widgetProps} />;
      case 'marketing':
        return <MarketingWidget {...widgetProps} />;
      case 'performance':
        return <PerformanceWidget {...widgetProps} />;
      case 'quick-actions':
        return <QuickActionsWidget {...widgetProps} />;
      case 'notifications':
        return <NotificationsWidget {...widgetProps} />;
      default:
        return null;
    }
  }, [data, isLoading, error, effectiveLayout]);

  // Get widget CSS classes based on size and layout
  const getWidgetClassName = (size: WidgetSize, layout: DashboardLayout): string => {
    const baseClasses = 'dashboard-widget';
    
    if (layout === 'list') {
      return `${baseClasses} w-full mb-4`;
    }
    
    if (layout === 'compact') {
      return `${baseClasses} w-full sm:w-1/2 lg:w-1/3 p-2`;
    }
    
    // Grid layout
    const sizeClasses = {
      small: 'col-span-1 row-span-1',
      medium: 'col-span-1 sm:col-span-2 row-span-1',
      large: 'col-span-1 sm:col-span-2 lg:col-span-3 row-span-2',
      full: 'col-span-full row-span-1'
    };
    
    return `${baseClasses} ${sizeClasses[size]}`;
  };

  // Configuration dialog
  const renderConfigDialog = () => (
    <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dashboard Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Layout Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Layout</h3>
            <Select 
              value={config.layout} 
              onValueChange={(layout: DashboardLayout) => 
                handleConfigChange({ layout })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid Layout</SelectItem>
                <SelectItem value="list">List Layout</SelectItem>
                <SelectItem value="cards">Card Layout</SelectItem>
                <SelectItem value="compact">Compact Layout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Feature Toggles */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Features</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-six-figure">Six Figure Barber Metrics</Label>
              <Switch
                id="show-six-figure"
                checked={config.showSixFigure}
                onCheckedChange={(showSixFigure) => 
                  handleConfigChange({ showSixFigure })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-ai">AI Insights</Label>
              <Switch
                id="show-ai"
                checked={config.showAI}
                onCheckedChange={(showAI) => 
                  handleConfigChange({ showAI })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-marketing">Marketing Analytics</Label>
              <Switch
                id="show-marketing"
                checked={config.showMarketing}
                onCheckedChange={(showMarketing) => 
                  handleConfigChange({ showMarketing })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <Switch
                id="compact-mode"
                checked={config.compactMode}
                onCheckedChange={(compactMode) => 
                  handleConfigChange({ compactMode })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
              <Switch
                id="auto-refresh"
                checked={config.autoRefresh}
                onCheckedChange={(autoRefresh) => 
                  handleConfigChange({ autoRefresh })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Widget Visibility */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Visible Widgets</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {widgets.map(widget => (
                <div key={widget.id} className="flex items-center justify-between">
                  <Label htmlFor={`widget-${widget.id}`} className="text-sm">
                    {widget.title}
                  </Label>
                  <Switch
                    id={`widget-${widget.id}`}
                    checked={widget.visible}
                    onCheckedChange={(visible) => 
                      handleWidgetToggle(widget.id, visible)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Header with controls
  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold">
          {effectiveRole === 'CLIENT' && 'My Dashboard'}
          {effectiveRole === 'BARBER' && 'Barber Dashboard'}
          {effectiveRole === 'SHOP_OWNER' && 'Shop Dashboard'}
          {effectiveRole === 'ENTERPRISE_OWNER' && 'Enterprise Dashboard'}
        </h1>
        
        <Badge variant="outline" className="capitalize">
          {effectiveRole.toLowerCase().replace('_', ' ')}
        </Badge>
        
        {config.showSixFigure && (
          <Badge variant="secondary">
            6FB Methodology
          </Badge>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfigDialog(true)}
          className="p-2"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // Main render
  return (
    <div className={`adaptive-dashboard h-full flex flex-col ${className}`}>
      {renderHeader()}
      
      <div className="flex-1 overflow-auto p-4">
        {effectiveLayout === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
            {visibleWidgets.map(renderWidget)}
          </div>
        )}

        {effectiveLayout === 'list' && (
          <div className="space-y-4">
            {visibleWidgets.map(renderWidget)}
          </div>
        )}

        {effectiveLayout === 'compact' && (
          <div className="flex flex-wrap -m-2">
            {visibleWidgets.map(renderWidget)}
          </div>
        )}

        {effectiveLayout === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleWidgets.map(renderWidget)}
          </div>
        )}

        {visibleWidgets.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Layout className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No widgets visible
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Configure your dashboard to show relevant widgets
              </p>
              <Button onClick={() => setShowConfigDialog(true)}>
                Configure Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>

      {renderConfigDialog()}
    </div>
  );
}

export default AdaptiveDashboard;