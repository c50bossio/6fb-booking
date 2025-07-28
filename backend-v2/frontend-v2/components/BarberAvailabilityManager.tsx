"use client";

/**
 * Comprehensive Barber Availability Management System
 * Supports Six Figure Barber methodology for efficient business operations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Settings, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Copy,
  Save,
  Download,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  barberAvailabilityService, 
  BarberAvailability, 
  TimeOffRequest, 
  SpecialAvailability,
  BarberSchedule,
  UtilizationAnalytics 
} from '@/services/barber-availability';

interface BarberAvailabilityManagerProps {
  barberId?: number;
  isManager?: boolean;
  canEditOthers?: boolean;
  onScheduleChange?: (barberId: number, schedule: BarberSchedule) => void;
}

interface WeeklySchedule {
  [key: number]: BarberAvailability | null; // 0-6 for Mon-Sun
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' }
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export function BarberAvailabilityManager({
  barberId,
  isManager = false,
  canEditOthers = false,
  onScheduleChange
}: BarberAvailabilityManagerProps) {
  // Core State
  const [selectedBarberId, setSelectedBarberId] = useState<number>(barberId || 0);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [specialAvailability, setSpecialAvailability] = useState<SpecialAvailability[]>([]);
  const [analytics, setAnalytics] = useState<UtilizationAnalytics | null>(null);
  const [barbers, setBarbers] = useState<any[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showSpecialAvailabilityModal, setShowSpecialAvailabilityModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Form State
  const [bulkEditData, setBulkEditData] = useState({
    selectedDays: [] as number[],
    startTime: '09:00',
    endTime: '17:00',
    applyToDateRange: false,
    startDate: '',
    endDate: ''
  });

  const [timeOffForm, setTimeOffForm] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: '',
    notes: '',
    isFullDay: true
  });

  const [specialAvailabilityForm, setSpecialAvailabilityForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    availabilityType: 'available' as 'available' | 'unavailable',
    notes: ''
  });

  // Load initial data
  useEffect(() => {
    if (selectedBarberId) {
      loadBarberData();
    }
    if (isManager || canEditOthers) {
      loadBarbersList();
    }
  }, [selectedBarberId]);

  const loadBarberData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load regular availability
      const availability = await barberAvailabilityService.getBarberAvailability(selectedBarberId);
      const scheduleMap: WeeklySchedule = {};
      availability.forEach(avail => {
        scheduleMap[avail.day_of_week] = avail;
      });
      setWeeklySchedule(scheduleMap);

      // Load time off requests
      const timeOff = await barberAvailabilityService.getTimeOffRequests(selectedBarberId);
      setTimeOffRequests(timeOff);

      // Load special availability
      const special = await barberAvailabilityService.getSpecialAvailability(selectedBarberId);
      setSpecialAvailability(special);

      // Load analytics if manager
      if (isManager) {
        try {
          const analyticsData = await barberAvailabilityService.getUtilizationAnalytics(
            selectedBarberId, 
            'month'
          );
          setAnalytics(analyticsData);
        } catch (err) {
          console.warn('Analytics not available:', err);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load barber data');
    } finally {
      setLoading(false);
    }
  };

  const loadBarbersList = async () => {
    try {
      // This would typically come from a barbers API endpoint
      // For now, using placeholder data
      setBarbers([
        { id: 1, name: 'John Smith', role: 'barber' },
        { id: 2, name: 'Sarah Johnson', role: 'barber' },
        { id: 3, name: 'Mike Wilson', role: 'admin' }
      ]);
    } catch (err) {
      console.error('Failed to load barbers list:', err);
    }
  };

  // Schedule Management
  const updateDaySchedule = async (dayOfWeek: number, startTime: string, endTime: string) => {
    try {
      setLoading(true);
      
      const existingSchedule = weeklySchedule[dayOfWeek];
      
      if (existingSchedule) {
        // Update existing
        const updated = await barberAvailabilityService.updateBarberAvailability(
          existingSchedule.id,
          { start_time: startTime, end_time: endTime }
        );
        setWeeklySchedule(prev => ({ ...prev, [dayOfWeek]: updated }));
      } else {
        // Create new
        const created = await barberAvailabilityService.createBarberAvailability(
          selectedBarberId,
          { day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, is_active: true }
        );
        setWeeklySchedule(prev => ({ ...prev, [dayOfWeek]: created }));
      }
      
      // Trigger callback
      if (onScheduleChange) {
        const schedule = await barberAvailabilityService.getBarberSchedule(
          selectedBarberId,
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        );
        onScheduleChange(selectedBarberId, schedule);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  const toggleDayAvailability = async (dayOfWeek: number) => {
    const existingSchedule = weeklySchedule[dayOfWeek];
    
    if (existingSchedule) {
      try {
        const updated = await barberAvailabilityService.updateBarberAvailability(
          existingSchedule.id,
          { is_active: !existingSchedule.is_active }
        );
        setWeeklySchedule(prev => ({ ...prev, [dayOfWeek]: updated }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to toggle availability');
      }
    } else {
      // Create default schedule if none exists
      await updateDaySchedule(dayOfWeek, '09:00', '17:00');
    }
  };

  // Bulk Operations
  const handleBulkUpdate = async () => {
    try {
      setLoading(true);
      
      const updates = bulkEditData.selectedDays.map(dayOfWeek => ({
        barber_id: selectedBarberId,
        day_of_week: dayOfWeek,
        start_time: bulkEditData.startTime,
        end_time: bulkEditData.endTime
      }));
      
      await barberAvailabilityService.bulkUpdateAvailability(updates);
      await loadBarberData(); // Refresh data
      setShowBulkEdit(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update availability');
    } finally {
      setLoading(false);
    }
  };

  const copyScheduleToOtherBarbers = async (targetBarberIds: number[]) => {
    try {
      setLoading(true);
      await barberAvailabilityService.cloneWeeklySchedule(
        selectedBarberId,
        targetBarberIds,
        true // overwrite existing
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy schedule');
    } finally {
      setLoading(false);
    }
  };

  // Time Off Management
  const handleTimeOffSubmit = async () => {
    try {
      setLoading(true);
      
      await barberAvailabilityService.createTimeOffRequest(selectedBarberId, {
        start_date: timeOffForm.startDate,
        end_date: timeOffForm.endDate,
        start_time: timeOffForm.isFullDay ? undefined : timeOffForm.startTime,
        end_time: timeOffForm.isFullDay ? undefined : timeOffForm.endTime,
        reason: timeOffForm.reason,
        notes: timeOffForm.notes
      });
      
      await loadBarberData(); // Refresh data
      setShowTimeOffModal(false);
      setTimeOffForm({
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        reason: '',
        notes: '',
        isFullDay: true
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit time off request');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOffAction = async (requestId: number, action: 'approve' | 'deny') => {
    if (!isManager) return;
    
    try {
      setLoading(true);
      
      if (action === 'approve') {
        await barberAvailabilityService.approveTimeOffRequest(requestId, 1); // Manager ID would come from context
      } else {
        await barberAvailabilityService.denyTimeOffRequest(requestId, 1, 'Manager decision');
      }
      
      await loadBarberData(); // Refresh data
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} time off request`);
    } finally {
      setLoading(false);
    }
  };

  // Special Availability
  const handleSpecialAvailabilitySubmit = async () => {
    try {
      setLoading(true);
      
      await barberAvailabilityService.createSpecialAvailability(selectedBarberId, {
        date: specialAvailabilityForm.date,
        start_time: specialAvailabilityForm.startTime,
        end_time: specialAvailabilityForm.endTime,
        availability_type: specialAvailabilityForm.availabilityType,
        notes: specialAvailabilityForm.notes
      });
      
      await loadBarberData(); // Refresh data
      setShowSpecialAvailabilityModal(false);
      setSpecialAvailabilityForm({
        date: '',
        startTime: '09:00',
        endTime: '17:00',
        availabilityType: 'available',
        notes: ''
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create special availability');
    } finally {
      setLoading(false);
    }
  };

  // Utility Functions
  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 75) return 'text-yellow-600';
    if (rate >= 50) return 'text-green-600';
    return 'text-blue-600';
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading && !weeklySchedule[0]) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading availability data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Availability Management</h1>
            <p className="text-gray-600">Professional schedule optimization for maximum revenue</p>
          </div>
        </div>
        
        {(isManager || canEditOthers) && (
          <Select value={selectedBarberId.toString()} onValueChange={(v) => setSelectedBarberId(parseInt(v))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select barber" />
            </SelectTrigger>
            <SelectContent>
              {barbers.map(barber => (
                <SelectItem key={barber.id} value={barber.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{barber.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
          </DialogTrigger>
        </Dialog>
        
        <Dialog open={showTimeOffModal} onOpenChange={setShowTimeOffModal}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Request Time Off
            </Button>
          </DialogTrigger>
        </Dialog>
        
        <Dialog open={showSpecialAvailabilityModal} onOpenChange={setShowSpecialAvailabilityModal}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Special Hours
            </Button>
          </DialogTrigger>
        </Dialog>
        
        {isManager && (
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(!showAnalytics)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        )}
        
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy Schedule
        </Button>
        
        <Button variant="outline" size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Performance Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.utilization_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Utilization Rate</div>
                <Progress value={analytics.utilization_rate} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${analytics.revenue_per_hour.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Revenue/Hour</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.total_available_hours.toFixed(0)}h
                </div>
                <div className="text-sm text-gray-600">Available Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.client_satisfaction_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="special">Special Hours</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        {/* Weekly Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regular Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DAYS_OF_WEEK.map(day => {
                  const schedule = weeklySchedule[day.value];
                  const isActive = schedule?.is_active ?? false;
                  
                  return (
                    <div key={day.value} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-20 font-medium">
                        {day.label}
                      </div>
                      
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleDayAvailability(day.value)}
                      />
                      
                      {isActive && schedule && (
                        <div className="flex items-center space-x-2 flex-1">
                          <Select
                            value={schedule.start_time}
                            onValueChange={(value) => updateDaySchedule(day.value, value, schedule.end_time)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(time => (
                                <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <span className="text-gray-500">to</span>
                          
                          <Select
                            value={schedule.end_time}
                            onValueChange={(value) => updateDaySchedule(day.value, schedule.start_time, value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(time => (
                                <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <div className="text-sm text-gray-600">
                            ({((new Date(`2000-01-01T${schedule.end_time}`) - new Date(`2000-01-01T${schedule.start_time}`)) / (1000 * 60 * 60)).toFixed(1)} hours)
                          </div>
                        </div>
                      )}
                      
                      {!isActive && (
                        <div className="flex-1 text-gray-500">Not available</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Off Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeOffRequests.map(request => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      </div>
                      {request.start_time && request.end_time && (
                        <div className="text-sm text-gray-600">
                          {formatTime(request.start_time)} - {formatTime(request.end_time)}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">{request.reason}</div>
                      {request.notes && (
                        <div className="text-sm text-gray-500 italic">{request.notes}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          request.status === 'approved' ? 'default' :
                          request.status === 'denied' ? 'destructive' :
                          request.status === 'cancelled' ? 'secondary' : 'outline'
                        }
                      >
                        {request.status}
                      </Badge>
                      
                      {isManager && request.status === 'requested' && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTimeOffAction(request.id, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTimeOffAction(request.id, 'deny')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {timeOffRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No time off requests
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Special Hours Tab */}
        <TabsContent value="special" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Special Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {specialAvailability.map(special => (
                  <div key={special.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {new Date(special.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatTime(special.start_time)} - {formatTime(special.end_time)}
                      </div>
                      {special.notes && (
                        <div className="text-sm text-gray-500 italic">{special.notes}</div>
                      )}
                    </div>
                    
                    <Badge 
                      variant={special.availability_type === 'available' ? 'default' : 'destructive'}
                    >
                      {special.availability_type}
                    </Badge>
                  </div>
                ))}
                
                {specialAvailability.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No special availability set
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Calendar View</h3>
                <p>Full calendar integration coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Edit Modal */}
      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Edit Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Days</Label>
              <div className="grid grid-cols-7 gap-2 mt-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`bulk-day-${day.value}`}
                      checked={bulkEditData.selectedDays.includes(day.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkEditData(prev => ({
                            ...prev,
                            selectedDays: [...prev.selectedDays, day.value]
                          }));
                        } else {
                          setBulkEditData(prev => ({
                            ...prev,
                            selectedDays: prev.selectedDays.filter(d => d !== day.value)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={`bulk-day-${day.value}`} className="text-sm">
                      {day.short}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Select value={bulkEditData.startTime} onValueChange={(v) => setBulkEditData(prev => ({ ...prev, startTime: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Time</Label>
                <Select value={bulkEditData.endTime} onValueChange={(v) => setBulkEditData(prev => ({ ...prev, endTime: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBulkEdit(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkUpdate}
                disabled={bulkEditData.selectedDays.length === 0}
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Time Off Modal */}
      <Dialog open={showTimeOffModal} onOpenChange={setShowTimeOffModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={timeOffForm.startDate}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={timeOffForm.endDate}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={timeOffForm.isFullDay}
                onCheckedChange={(checked) => setTimeOffForm(prev => ({ ...prev, isFullDay: checked }))}
              />
              <Label>Full day(s)</Label>
            </div>
            
            {!timeOffForm.isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={timeOffForm.startTime}
                    onChange={(e) => setTimeOffForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={timeOffForm.endTime}
                    onChange={(e) => setTimeOffForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
            )}
            
            <div>
              <Label>Reason</Label>
              <Input
                value={timeOffForm.reason}
                onChange={(e) => setTimeOffForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Vacation, sick day, personal, etc."
              />
            </div>
            
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={timeOffForm.notes}
                onChange={(e) => setTimeOffForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional details..."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTimeOffModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleTimeOffSubmit}>
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Special Availability Modal */}
      <Dialog open={showSpecialAvailabilityModal} onOpenChange={setShowSpecialAvailabilityModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Special Hours</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={specialAvailabilityForm.date}
                onChange={(e) => setSpecialAvailabilityForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Availability Type</Label>
              <Select 
                value={specialAvailabilityForm.availabilityType}
                onValueChange={(v: 'available' | 'unavailable') => 
                  setSpecialAvailabilityForm(prev => ({ ...prev, availabilityType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available (Override regular schedule)</SelectItem>
                  <SelectItem value="unavailable">Unavailable (Block time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Select 
                  value={specialAvailabilityForm.startTime}
                  onValueChange={(v) => setSpecialAvailabilityForm(prev => ({ ...prev, startTime: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Time</Label>
                <Select 
                  value={specialAvailabilityForm.endTime}
                  onValueChange={(v) => setSpecialAvailabilityForm(prev => ({ ...prev, endTime: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={specialAvailabilityForm.notes}
                onChange={(e) => setSpecialAvailabilityForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Reason for special hours..."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSpecialAvailabilityModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSpecialAvailabilitySubmit}>
                Save Special Hours
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}