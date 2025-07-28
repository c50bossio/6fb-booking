'use client'

/**
 * Real-time Conflict Resolver Component
 * 
 * Provides intelligent conflict detection and resolution for scheduling conflicts
 * with real-time updates, automated suggestions, and manual resolution options.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { useConflictManagement } from '@/hooks/useRealtimeCalendar';
import { CalendarConflict } from '@/lib/realtime-calendar';
import {
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Shield,
  Brain,
  Target,
  TrendingUp,
  AlertCircle,
  User,
  CalendarDays,
  Timer,
  Shuffle,
} from 'lucide-react';

interface RealtimeConflictResolverProps {
  barberId?: number;
  autoResolve?: boolean;
  showPreventive?: boolean;
  onConflictResolved?: (conflictId: string, resolution: string) => void;
  onConflictEscalated?: (conflictId: string) => void;
  className?: string;
}

interface ConflictResolution {
  id: string;
  type: 'reschedule' | 'reassign' | 'cancel' | 'split' | 'extend';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  estimatedTime: number; // minutes to implement
  automaticApplicable: boolean;
  steps: string[];
  appointmentId?: number;
  newTime?: string;
  newBarberId?: number;
  newDuration?: number;
}

export function RealtimeConflictResolver({
  barberId,
  autoResolve = false,
  showPreventive = true,
  onConflictResolved,
  onConflictEscalated,
  className = '',
}: RealtimeConflictResolverProps) {
  const conflicts = useConflictManagement();
  const [selectedConflict, setSelectedConflict] = useState<CalendarConflict | null>(null);
  const [resolutionInProgress, setResolutionInProgress] = useState<Set<string>>(new Set());
  const [autoResolveEnabled, setAutoResolveEnabled] = useState(autoResolve);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);

  // Auto-resolve conflicts when enabled
  useEffect(() => {
    if (!autoResolveEnabled) return;

    const autoResolvableConflicts = conflicts.activeConflicts.filter(
      conflict => conflict.severity !== 'high' && canAutoResolve(conflict)
    );

    autoResolvableConflicts.forEach(conflict => {
      const resolution = generateResolutions(conflict)[0];
      if (resolution && resolution.automaticApplicable) {
        handleAutoResolve(conflict, resolution);
      }
    });
  }, [conflicts.activeConflicts, autoResolveEnabled]);

  const canAutoResolve = (conflict: CalendarConflict): boolean => {
    // Only auto-resolve simple conflicts with high-confidence solutions
    return (
      conflict.severity !== 'high' &&
      conflict.type !== 'resource_conflict' &&
      conflict.suggestedResolutions.length > 0
    );
  };

  const generateResolutions = (conflict: CalendarConflict): ConflictResolution[] => {
    const resolutions: ConflictResolution[] = [];

    // Generate context-aware resolutions based on conflict type
    switch (conflict.type) {
      case 'time_overlap':
        resolutions.push({
          id: `reschedule_${conflict.id}`,
          type: 'reschedule',
          title: 'Reschedule Later Appointment',
          description: 'Move the later appointment to the next available slot',
          confidence: 85,
          impact: 'low',
          estimatedTime: 2,
          automaticApplicable: true,
          steps: [
            'Identify the later appointment',
            'Find next available slot',
            'Send notification to client',
            'Update calendar'
          ],
          appointmentId: conflict.appointmentIds[1],
          newTime: calculateNextAvailableSlot(conflict.conflictTime),
        });

        resolutions.push({
          id: `split_${conflict.id}`,
          type: 'split',
          title: 'Split Service Time',
          description: 'Reduce service duration to eliminate overlap',
          confidence: 60,
          impact: 'medium',
          estimatedTime: 5,
          automaticApplicable: false,
          steps: [
            'Review service requirements',
            'Negotiate with client',
            'Adjust service scope',
            'Update appointment duration'
          ],
          newDuration: 45, // Reduced from standard duration
        });
        break;

      case 'double_booking':
        resolutions.push({
          id: `reassign_${conflict.id}`,
          type: 'reassign',
          title: 'Reassign to Available Barber',
          description: 'Move one appointment to another available barber',
          confidence: 90,
          impact: 'low',
          estimatedTime: 3,
          automaticApplicable: true,
          steps: [
            'Check barber availability',
            'Verify skill compatibility',
            'Notify client of change',
            'Update assignment'
          ],
          newBarberId: findAvailableBarber(conflict.conflictTime),
        });

        resolutions.push({
          id: `reschedule_priority_${conflict.id}`,
          type: 'reschedule',
          title: 'Reschedule Lower Priority',
          description: 'Reschedule the appointment with lower priority or newer booking',
          confidence: 75,
          impact: 'medium',
          estimatedTime: 4,
          automaticApplicable: false,
          steps: [
            'Determine appointment priority',
            'Contact client for rescheduling',
            'Offer compensation if needed',
            'Update calendar'
          ],
        });
        break;

      case 'availability_conflict':
        resolutions.push({
          id: `extend_hours_${conflict.id}`,
          type: 'extend',
          title: 'Extend Business Hours',
          description: 'Temporarily extend hours to accommodate appointment',
          confidence: 70,
          impact: 'high',
          estimatedTime: 10,
          automaticApplicable: false,
          steps: [
            'Check staff availability',
            'Calculate overtime costs',
            'Get management approval',
            'Notify affected parties'
          ],
        });
        break;

      case 'resource_conflict':
        resolutions.push({
          id: `reschedule_resource_${conflict.id}`,
          type: 'reschedule',
          title: 'Reschedule for Resource Availability',
          description: 'Move appointment to when required resources are available',
          confidence: 80,
          impact: 'medium',
          estimatedTime: 5,
          automaticApplicable: false,
          steps: [
            'Check resource availability',
            'Find suitable time slot',
            'Coordinate with client',
            'Reserve resources'
          ],
        });
        break;
    }

    // Add cancellation as last resort
    resolutions.push({
      id: `cancel_${conflict.id}`,
      type: 'cancel',
      title: 'Cancel Conflicting Appointment',
      description: 'Cancel one of the conflicting appointments',
      confidence: 50,
      impact: 'high',
      estimatedTime: 2,
      automaticApplicable: false,
      steps: [
        'Determine which appointment to cancel',
        'Contact client with apology',
        'Offer rescheduling options',
        'Process any refunds'
      ],
    });

    // Sort by confidence and impact
    return resolutions.sort((a, b) => {
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      const impactOrder = { low: 1, medium: 2, high: 3 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  };

  const calculateNextAvailableSlot = (conflictTime: string): string => {
    // Simulate finding next available slot - in production would query actual availability
    const conflictDate = new Date(conflictTime);
    const nextSlot = new Date(conflictDate.getTime() + 60 * 60 * 1000); // +1 hour
    return nextSlot.toISOString();
  };

  const findAvailableBarber = (conflictTime: string): number => {
    // Simulate finding available barber - in production would query barber schedules
    return Math.floor(Math.random() * 3) + 1; // Random barber ID 1-3
  };

  const handleAutoResolve = async (conflict: CalendarConflict, resolution: ConflictResolution) => {
    setResolutionInProgress(prev => new Set(prev).add(conflict.id));

    try {
      // Simulate API call for auto-resolution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      conflicts.resolveConflict(conflict.id);
      onConflictResolved?.(conflict.id, resolution.type);

      toast({
        title: '🤖 Conflict Auto-Resolved',
        description: `${resolution.title} applied successfully`,
        duration: 4000,
      });

    } catch (error) {
      console.error('Auto-resolution failed:', error);
      toast({
        title: 'Auto-Resolution Failed',
        description: 'Manual intervention required',
        variant: 'destructive',
      });
    } finally {
      setResolutionInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(conflict.id);
        return newSet;
      });
    }
  };

  const handleManualResolve = async (conflict: CalendarConflict, resolution: ConflictResolution) => {
    setResolutionInProgress(prev => new Set(prev).add(conflict.id));

    try {
      // Simulate API call for manual resolution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      conflicts.resolveConflict(conflict.id);
      onConflictResolved?.(conflict.id, resolution.type);
      setShowResolutionDialog(false);

      toast({
        title: '✅ Conflict Resolved',
        description: `${resolution.title} completed successfully`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Manual resolution failed:', error);
      toast({
        title: 'Resolution Failed',
        description: 'Please try again or escalate to management',
        variant: 'destructive',
      });
    } finally {
      setResolutionInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(conflict.id);
        return newSet;
      });
    }
  };

  const handleEscalate = (conflict: CalendarConflict) => {
    onConflictEscalated?.(conflict.id);
    toast({
      title: '📢 Conflict Escalated',
      description: 'Management has been notified',
      duration: 3000,
    });
  };

  const getConflictIcon = (type: CalendarConflict['type']) => {
    switch (type) {
      case 'time_overlap': return <Clock className="w-5 h-5" />;
      case 'double_booking': return <Users className="w-5 h-5" />;
      case 'availability_conflict': return <Calendar className="w-5 h-5" />;
      case 'resource_conflict': return <Shield className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getResolutionIcon = (type: ConflictResolution['type']) => {
    switch (type) {
      case 'reschedule': return <CalendarDays className="w-4 h-4" />;
      case 'reassign': return <Shuffle className="w-4 h-4" />;
      case 'cancel': return <XCircle className="w-4 h-4" />;
      case 'split': return <Timer className="w-4 h-4" />;
      case 'extend': return <TrendingUp className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (!conflicts.hasActiveConflicts && !showPreventive) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Conflict Summary */}
      {conflicts.hasActiveConflicts && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 flex items-center gap-2">
            Scheduling Conflicts Detected
            <Badge variant="destructive">
              {conflicts.activeConflicts.length}
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-red-700">
            <div className="mt-2 flex items-center gap-4">
              <span>Immediate attention required</span>
              
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoResolveEnabled}
                    onChange={(e) => setAutoResolveEnabled(e.target.checked)}
                    className="rounded"
                  />
                  Auto-resolve simple conflicts
                </label>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Conflicts */}
      {conflicts.activeConflicts.length > 0 && (
        <Card className="sfb-card-premium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-red-600" />
                Active Conflicts
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {conflicts.highPriorityConflicts.length} high priority
                </Badge>
                
                {conflicts.activeConflicts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={conflicts.clearAllConflicts}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <AnimatePresence>
              {conflicts.activeConflicts.map((conflict, index) => {
                const resolutions = generateResolutions(conflict);
                const isResolving = resolutionInProgress.has(conflict.id);

                return (
                  <motion.div
                    key={conflict.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${getSeverityColor(conflict.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-white/50">
                          {getConflictIcon(conflict.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{conflict.description}</h4>
                            <Badge variant={conflict.severity === 'high' ? 'destructive' : 'secondary'}>
                              {conflict.severity}
                            </Badge>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-4">
                              <span>Time: {formatTime(conflict.conflictTime)}</span>
                              <span>Appointments: {conflict.appointmentIds.length}</span>
                            </div>
                            
                            {conflict.barberId && (
                              <div>Barber ID: {conflict.barberId}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Quick auto-resolve for simple conflicts */}
                        {resolutions[0]?.automaticApplicable && !isResolving && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAutoResolve(conflict, resolutions[0])}
                            className="flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            Auto-Fix
                          </Button>
                        )}
                        
                        {/* Manual resolution dialog */}
                        <Dialog 
                          open={showResolutionDialog && selectedConflict?.id === conflict.id}
                          onOpenChange={(open) => {
                            setShowResolutionDialog(open);
                            if (open) setSelectedConflict(conflict);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isResolving}
                            >
                              {isResolving ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                'Resolve'
                              )}
                            </Button>
                          </DialogTrigger>
                          
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {getConflictIcon(conflict.type)}
                                Resolve Scheduling Conflict
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                              {/* Conflict Details */}
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium mb-2">Conflict Details</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Type:</span>
                                    <div className="font-medium">{conflict.type.replace('_', ' ')}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Severity:</span>
                                    <div className="font-medium capitalize">{conflict.severity}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Time:</span>
                                    <div className="font-medium">{formatTime(conflict.conflictTime)}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Affected Appointments:</span>
                                    <div className="font-medium">{conflict.appointmentIds.length}</div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Resolution Options */}
                              <Tabs defaultValue="recommended" className="w-full">
                                <TabsList className="grid grid-cols-2 w-full">
                                  <TabsTrigger value="recommended">Recommended Solutions</TabsTrigger>
                                  <TabsTrigger value="all">All Options</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="recommended" className="space-y-4">
                                  {resolutions.slice(0, 2).map((resolution) => (
                                    <ResolutionCard
                                      key={resolution.id}
                                      resolution={resolution}
                                      conflict={conflict}
                                      onResolve={handleManualResolve}
                                      isResolving={isResolving}
                                    />
                                  ))}
                                </TabsContent>
                                
                                <TabsContent value="all" className="space-y-4">
                                  {resolutions.map((resolution) => (
                                    <ResolutionCard
                                      key={resolution.id}
                                      resolution={resolution}
                                      conflict={conflict}
                                      onResolve={handleManualResolve}
                                      isResolving={isResolving}
                                    />
                                  ))}
                                </TabsContent>
                              </Tabs>
                              
                              {/* Escalation Option */}
                              <Separator />
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">Need Help?</h4>
                                  <p className="text-sm text-gray-600">
                                    Escalate complex conflicts to management
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => handleEscalate(conflict)}
                                >
                                  Escalate to Manager
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Preventive Insights */}
      {showPreventive && (
        <Card className="sfb-card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Conflict Prevention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <div className="font-medium text-green-800">
                  {24 - conflicts.activeConflicts.length} Hours Clear
                </div>
                <div className="text-sm text-green-600">No conflicts detected</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Brain className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <div className="font-medium text-blue-800">AI Prevention</div>
                <div className="text-sm text-blue-600">Active monitoring</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingUp className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                <div className="font-medium text-purple-800">95% Success Rate</div>
                <div className="text-sm text-purple-600">Auto-resolution</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Resolution Card Component
function ResolutionCard({
  resolution,
  conflict,
  onResolve,
  isResolving,
}: {
  resolution: ConflictResolution;
  conflict: CalendarConflict;
  onResolve: (conflict: CalendarConflict, resolution: ConflictResolution) => void;
  isResolving: boolean;
}) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            {getResolutionIcon(resolution.type)}
          </div>
          <div>
            <h4 className="font-medium">{resolution.title}</h4>
            <p className="text-sm text-gray-600">{resolution.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getImpactColor(resolution.impact)}>
            {resolution.impact} impact
          </Badge>
          <Badge variant="outline">
            {resolution.confidence}% confidence
          </Badge>
        </div>
      </div>
      
      {/* Implementation Steps */}
      <div className="mb-4">
        <h5 className="text-sm font-medium mb-2">Implementation Steps:</h5>
        <ol className="text-sm space-y-1 ml-4">
          {resolution.steps.map((step, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-gray-400">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      
      {/* Action Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Estimated time: {resolution.estimatedTime} minutes
        </div>
        
        <Button
          onClick={() => onResolve(conflict, resolution)}
          disabled={isResolving}
          variant={resolution.automaticApplicable ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          {isResolving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {getResolutionIcon(resolution.type)}
              Apply Solution
            </>
          )}
        </Button>
      </div>
    </div>
  );
}