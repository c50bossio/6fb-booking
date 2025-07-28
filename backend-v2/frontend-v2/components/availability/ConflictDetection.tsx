"use client";

/**
 * Conflict Detection Integration Component
 * Integrates with appointment scheduling to detect and resolve conflicts
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  User,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  barberAvailabilityService, 
  BarberAvailability 
} from '@/services/barber-availability';
import { useConflictDetection } from '@/hooks/useBarberAvailability';

interface ConflictDetectionProps {
  barberId: number;
  proposedSchedule?: BarberAvailability[];
  onConflictResolved?: (conflicts: any[]) => void;
  realTimeMode?: boolean;
}

interface ScheduleConflict {
  id: string;
  type: 'appointment_overlap' | 'availability_gap' | 'time_off_conflict' | 'capacity_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affected_dates: string[];
  affected_appointments?: any[];
  suggestions: ConflictSuggestion[];
  auto_resolvable: boolean;
}

interface ConflictSuggestion {
  type: 'reschedule' | 'extend_hours' | 'reduce_capacity' | 'cancel_appointment';
  description: string;
  impact: string;
  confidence: number;
}

interface ConflictResolution {
  conflictId: string;
  action: 'auto_resolve' | 'manual_resolve' | 'ignore';
  details?: any;
}

export function ConflictDetection({ 
  barberId, 
  proposedSchedule, 
  onConflictResolved,
  realTimeMode = false 
}: ConflictDetectionProps) {
  // State
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [resolving, setResolving] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ScheduleConflict | null>(null);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [resolutionProgress, setResolutionProgress] = useState(0);

  // Hook for conflict detection
  const { 
    checking, 
    detectConflicts, 
    clearConflicts, 
    hasConflicts, 
    criticalConflicts 
  } = useConflictDetection();

  // Auto-detect conflicts when schedule changes
  useEffect(() => {
    if (proposedSchedule && proposedSchedule.length > 0) {
      handleConflictDetection();
    }
  }, [proposedSchedule]);

  // Real-time conflict monitoring
  useEffect(() => {
    if (realTimeMode) {
      const interval = setInterval(() => {
        handleConflictDetection();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [realTimeMode, barberId]);

  const handleConflictDetection = async () => {
    if (!proposedSchedule || proposedSchedule.length === 0) return;

    try {
      const detectedConflicts = await detectConflicts(barberId, proposedSchedule);
      
      // Transform API response to our conflict format
      const formattedConflicts: ScheduleConflict[] = detectedConflicts.map((conflict: any, index: number) => ({
        id: `conflict_${index}`,
        type: conflict.type || 'appointment_overlap',
        severity: conflict.severity || 'medium',
        title: conflict.title || 'Schedule Conflict',
        description: conflict.description || 'A scheduling conflict has been detected',
        affected_dates: conflict.affected_dates || [],
        affected_appointments: conflict.affected_appointments || [],
        suggestions: conflict.suggestions || [],
        auto_resolvable: conflict.auto_resolvable || false
      }));

      setConflicts(formattedConflicts);
    } catch (error) {
      console.error('Conflict detection failed:', error);
    }
  };

  const handleAutoResolve = async (conflict: ScheduleConflict) => {
    if (!conflict.auto_resolvable) return;

    setResolving(true);
    setResolutionProgress(0);

    try {
      // Simulate resolution progress
      const progressInterval = setInterval(() => {
        setResolutionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Implement auto-resolution logic based on conflict type
      switch (conflict.type) {
        case 'appointment_overlap':
          await resolveAppointmentOverlap(conflict);
          break;
        case 'availability_gap':
          await resolveAvailabilityGap(conflict);
          break;
        case 'time_off_conflict':
          await resolveTimeOffConflict(conflict);
          break;
        case 'capacity_exceeded':
          await resolveCapacityConflict(conflict);
          break;
      }

      clearInterval(progressInterval);
      setResolutionProgress(100);

      // Remove resolved conflict
      setConflicts(prev => prev.filter(c => c.id !== conflict.id));

      // Callback
      if (onConflictResolved) {
        onConflictResolved(conflicts.filter(c => c.id !== conflict.id));
      }

    } catch (error) {
      console.error('Auto-resolution failed:', error);
    } finally {
      setTimeout(() => {
        setResolving(false);
        setResolutionProgress(0);
      }, 1000);
    }
  };

  const resolveAppointmentOverlap = async (conflict: ScheduleConflict) => {
    // Logic to resolve appointment overlaps
    // This would integrate with the appointment service
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
  };

  const resolveAvailabilityGap = async (conflict: ScheduleConflict) => {
    // Logic to resolve availability gaps
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const resolveTimeOffConflict = async (conflict: ScheduleConflict) => {
    // Logic to resolve time off conflicts
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const resolveCapacityConflict = async (conflict: ScheduleConflict) => {
    // Logic to resolve capacity conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleManualResolve = (conflict: ScheduleConflict) => {
    setSelectedConflict(conflict);
    setShowResolutionDialog(true);
  };

  const dismissConflict = (conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  };

  const getConflictIcon = (type: ScheduleConflict['type']) => {
    switch (type) {
      case 'appointment_overlap':
        return <Calendar className="h-5 w-5 text-red-600" />;
      case 'availability_gap':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'time_off_conflict':
        return <User className="h-5 w-5 text-orange-600" />;
      case 'capacity_exceeded':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: ScheduleConflict['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-red-300 bg-red-25';
      case 'medium':
        return 'border-yellow-300 bg-yellow-25';
      case 'low':
        return 'border-blue-300 bg-blue-25';
      default:
        return 'border-gray-300 bg-gray-25';
    }
  };

  const getSeverityBadgeColor = (severity: ScheduleConflict['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (checking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p>Checking for schedule conflicts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className={`h-6 w-6 ${hasConflicts ? 'text-red-600' : 'text-green-600'}`} />
          <div>
            <h3 className="text-lg font-semibold">
              Schedule Conflict Detection
            </h3>
            <p className="text-sm text-gray-600">
              {conflicts.length === 0 
                ? 'No conflicts detected' 
                : `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} found`
              }
              {criticalConflicts.length > 0 && (
                <span className="ml-2 text-red-600 font-medium">
                  ({criticalConflicts.length} critical)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          {realTimeMode && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Zap className="h-3 w-3 mr-1" />
              Real-time
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleConflictDetection}
            disabled={checking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            Scan
          </Button>
        </div>
      </div>

      {/* Resolution Progress */}
      {resolving && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3 mb-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span className="font-medium">Resolving conflicts...</span>
            </div>
            <Progress value={resolutionProgress} className="h-2" />
            <div className="text-sm text-gray-600 mt-2">
              {resolutionProgress < 100 ? 'Processing...' : 'Complete!'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflicts List */}
      {conflicts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Conflicts Detected</h3>
            <p className="text-gray-500">
              Your schedule is clear of conflicts. All appointments and availability are properly aligned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conflicts.map(conflict => (
            <Card key={conflict.id} className={`border-l-4 ${getSeverityColor(conflict.severity)}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getConflictIcon(conflict.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{conflict.title}</h4>
                        <Badge variant={getSeverityBadgeColor(conflict.severity)}>
                          {conflict.severity}
                        </Badge>
                        {conflict.auto_resolvable && (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            Auto-resolvable
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{conflict.description}</p>
                      
                      {conflict.affected_dates.length > 0 && (
                        <div className="text-xs text-gray-500 mb-2">
                          Affected dates: {conflict.affected_dates.join(', ')}
                        </div>
                      )}

                      {conflict.suggestions.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-700 mb-1">Suggestions:</div>
                          <div className="space-y-1">
                            {conflict.suggestions.slice(0, 2).map((suggestion, index) => (
                              <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                                {suggestion.description}
                                <span className="ml-2 text-blue-600">
                                  ({suggestion.confidence}% confidence)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {conflict.auto_resolvable && (
                      <Button
                        size="sm"
                        onClick={() => handleAutoResolve(conflict)}
                        disabled={resolving}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-Fix
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualResolve(conflict)}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissConflict(conflict.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Critical Conflicts Alert */}
      {criticalConflicts.length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <div className="font-medium mb-1">Critical Conflicts Detected</div>
            <div>
              {criticalConflicts.length} critical conflict{criticalConflicts.length !== 1 ? 's' : ''} 
              {' '}require immediate attention to prevent scheduling issues.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Manual Resolution Dialog */}
      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Conflict Manually</DialogTitle>
          </DialogHeader>
          
          {selectedConflict && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  {getConflictIcon(selectedConflict.type)}
                  <span className="font-medium">{selectedConflict.title}</span>
                  <Badge variant={getSeverityBadgeColor(selectedConflict.severity)}>
                    {selectedConflict.severity}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm">{selectedConflict.description}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Resolution Options</h4>
                <div className="space-y-2">
                  {selectedConflict.suggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="font-medium text-sm">{suggestion.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Impact: {suggestion.impact} | Confidence: {suggestion.confidence}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowResolutionDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => {
                  dismissConflict(selectedConflict.id);
                  setShowResolutionDialog(false);
                }}>
                  Apply Resolution
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}