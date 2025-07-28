'use client'

/**
 * Real-time Calendar Manager Component
 * 
 * Provides visual feedback and notifications for real-time calendar updates
 * with smooth animations, toast notifications, and conflict alerts.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { 
  useRealtimeCalendar, 
  useRealtimeCalendarView, 
  useConflictManagement 
} from '@/hooks/useRealtimeCalendar';
import { AppointmentEvent, CalendarConflict } from '@/lib/realtime-calendar';
import {
  Calendar,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  Users,
  Activity,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertCircle,
  TrendingUp,
  Signal,
} from 'lucide-react';

interface RealtimeCalendarManagerProps {
  barberId?: number;
  showConnectionStatus?: boolean;
  showEventFeed?: boolean;
  showConflictAlerts?: boolean;
  showPerformanceMetrics?: boolean;
  compact?: boolean;
  className?: string;
}

export function RealtimeCalendarManager({
  barberId,
  showConnectionStatus = true,
  showEventFeed = true,
  showConflictAlerts = true,
  showPerformanceMetrics = false,
  compact = false,
  className = '',
}: RealtimeCalendarManagerProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [enableSounds, setEnableSounds] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Use the appropriate hook based on whether we're filtering by barber
  const calendar = barberId 
    ? useRealtimeCalendarView(barberId)
    : useRealtimeCalendar({ enableSoundNotifications: enableSounds });
    
  const conflicts = useConflictManagement();
  
  const { state, actions } = calendar;
  
  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    eventsPerMinute: 0,
    avgLatency: 0,
    connectionUptime: 0,
  });
  
  // Calculate performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const recentEvents = actions.getRecentEvents(1); // Last minute
      const uptime = state.connectionStatus.lastPing 
        ? Date.now() - new Date(state.connectionStatus.lastPing).getTime() 
        : 0;
        
      setPerformanceMetrics({
        eventsPerMinute: recentEvents.length,
        avgLatency: Math.random() * 100 + 50, // Simulated - would be real in production
        connectionUptime: uptime / 1000 / 60, // Convert to minutes
      });
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [actions, state.connectionStatus.lastPing]);

  const getConnectionStatusColor = () => {
    switch (state.connectionStatus.status) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'connecting': return 'text-yellow-600 bg-yellow-50';
      case 'reconnecting': return 'text-orange-600 bg-orange-50';
      case 'disconnected': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConnectionIcon = () => {
    switch (state.connectionStatus.status) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'connecting': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'reconnecting': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'disconnected': return <WifiOff className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  const getEventTypeIcon = (type: AppointmentEvent['type']) => {
    switch (type) {
      case 'created': return <Calendar className="w-4 h-4" />;
      case 'updated': return <RefreshCw className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      case 'rescheduled': return <Clock className="w-4 h-4" />;
      case 'check_in': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'no_show': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: AppointmentEvent['type']) => {
    switch (type) {
      case 'created': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'updated': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      case 'rescheduled': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'check_in': return 'text-green-600 bg-green-50 border-green-200';
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'no_show': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusMessage = () => {
    const status = state.connectionStatus.status;
    const attempts = state.connectionStatus.reconnectAttempts;
    
    switch (status) {
      case 'connected': return 'Live updates active';
      case 'connecting': return 'Establishing connection...';
      case 'reconnecting': return `Reconnecting... (attempt ${attempts})`;
      case 'disconnected': return 'Updates paused';
      case 'error': return 'Connection failed';
      default: return 'Unknown status';
    }
  };

  if (compact && !isExpanded) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="relative"
        >
          <div className={`w-2 h-2 rounded-full mr-2 ${
            state.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          Live Updates
          {state.eventCount > 0 && (
            <Badge className="ml-2 sfb-badge-teal">
              {state.eventCount}
            </Badge>
          )}
        </Button>
        
        {conflicts.hasActiveConflicts && (
          <Badge variant="destructive" className="animate-pulse">
            {conflicts.activeConflicts.length} Conflicts
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <Card className="sfb-card-premium">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getConnectionStatusColor()}`}>
                  {getConnectionIcon()}
                </div>
                <div>
                  <h3 className="font-medium sfb-heading-secondary">Real-time Calendar</h3>
                  <p className="text-sm sfb-text-premium">{getStatusMessage()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Settings */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnableSounds(!enableSounds)}
                  className="p-2"
                >
                  {enableSounds ? (
                    <Bell className="w-4 h-4 text-blue-600" />
                  ) : (
                    <BellOff className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="p-2"
                >
                  {showDetails ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                
                {/* Connection actions */}
                {!state.isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={actions.reconnect}
                    disabled={state.connectionStatus.status === 'connecting'}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reconnect
                  </Button>
                )}
                
                {compact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="p-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Connection details */}
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <div className="font-medium">{state.connectionStatus.status}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Events:</span>
                    <div className="font-medium">{state.eventCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Conflicts:</span>
                    <div className="font-medium text-red-600">{state.conflictCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Pending:</span>
                    <div className="font-medium">{state.pendingUpdates}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {showPerformanceMetrics && state.isConnected && (
        <Card className="sfb-card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {performanceMetrics.eventsPerMinute}
                </div>
                <div className="text-sm text-gray-500">Events/min</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(performanceMetrics.avgLatency)}ms
                </div>
                <div className="text-sm text-gray-500">Avg Latency</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(performanceMetrics.connectionUptime)}m
                </div>
                <div className="text-sm text-gray-500">Uptime</div>
              </div>
            </div>
            
            {/* Connection quality indicator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Connection Quality</span>
                <Signal className="w-4 h-4 text-green-600" />
              </div>
              <Progress 
                value={state.isConnected ? 95 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflict Alerts */}
      {showConflictAlerts && conflicts.hasActiveConflicts && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">
            {conflicts.activeConflicts.length} Active Conflicts Detected
          </AlertTitle>
          <AlertDescription className="text-red-700">
            <div className="mt-2 space-y-2">
              {conflicts.activeConflicts.slice(0, 3).map((conflict) => (
                <div key={conflict.id} className="flex items-center justify-between">
                  <span className="text-sm">{conflict.description}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => conflicts.resolveConflict(conflict.id)}
                    className="text-red-600 border-red-300 hover:bg-red-100"
                  >
                    Resolve
                  </Button>
                </div>
              ))}
              {conflicts.activeConflicts.length > 3 && (
                <div className="text-sm text-red-600">
                  +{conflicts.activeConflicts.length - 3} more conflicts
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Event Feed */}
      {showEventFeed && (
        <Card className="sfb-card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5" />
                Recent Activity
                {state.pendingUpdates > 0 && (
                  <Badge className="sfb-badge-teal animate-pulse">
                    {state.pendingUpdates} pending
                  </Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {state.eventCount} total
                </Badge>
                
                {state.eventCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={actions.clearEvents}
                    className="text-gray-500 hover:text-red-600"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {state.events.length > 0 ? (
                state.events.slice(0, 10).map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${getEventColor(event.type)}`}
                  >
                    <div className="p-1 rounded">
                      {getEventTypeIcon(event.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {event.clientName} • {event.serviceName}
                        </span>
                        <Badge 
                          variant={event.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {event.priority}
                        </Badge>
                      </div>
                      
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-4">
                          <span>Barber: {event.barberName}</span>
                          <span>Type: {event.type}</span>
                        </div>
                        
                        {event.type === 'rescheduled' && event.originalTime && event.newTime && (
                          <div className="text-purple-600">
                            Moved from {event.originalTime} to {event.newTime}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="sfb-text-premium">No recent events</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Real-time updates will appear here
                  </p>
                </div>
              )}
            </AnimatePresence>
            
            {state.events.length > 10 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(true)}>
                  View all {state.events.length} events
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Simplified version for inline use
export function RealtimeStatusIndicator({ 
  barberId, 
  className = "" 
}: { 
  barberId?: number; 
  className?: string; 
}) {
  const { state } = barberId 
    ? useRealtimeCalendarView(barberId)
    : useRealtimeCalendar();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        state.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      }`} />
      <span className="text-sm text-gray-600">
        {state.isConnected ? 'Live' : 'Offline'}
      </span>
      {state.eventCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {state.eventCount}
        </Badge>
      )}
    </div>
  );
}

// Event count badge component
export function RealtimeEventBadge({ 
  barberId, 
  className = "" 
}: { 
  barberId?: number; 
  className?: string; 
}) {
  const { state } = barberId 
    ? useRealtimeCalendarView(barberId)
    : useRealtimeCalendar();

  if (state.eventCount === 0) return null;

  return (
    <Badge className={`sfb-badge-teal animate-pulse ${className}`}>
      {state.eventCount} updates
    </Badge>
  );
}