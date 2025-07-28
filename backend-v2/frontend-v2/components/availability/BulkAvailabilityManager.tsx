"use client";

/**
 * Bulk Availability Management Component
 * Supports bulk operations for multiple barbers and time periods
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Copy, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  barberAvailabilityService, 
  BarberAvailability, 
  BulkAvailabilityUpdate 
} from '@/services/barber-availability';

interface BulkAvailabilityManagerProps {
  barbers: Array<{ id: number; name: string; role: string }>;
  onBulkUpdate?: (updates: BulkAvailabilityUpdate[]) => void;
}

interface BulkOperation {
  id: string;
  type: 'update_schedule' | 'copy_schedule' | 'apply_template' | 'mass_time_off';
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  affectedBarbers: number[];
  errors?: string[];
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

export function BulkAvailabilityManager({ barbers, onBulkUpdate }: BulkAvailabilityManagerProps) {
  // State
  const [selectedBarbers, setSelectedBarbers] = useState<number[]>([]);
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [scheduleTemplates, setScheduleTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for different bulk operations
  const [bulkScheduleForm, setBulkScheduleForm] = useState({
    selectedDays: [] as number[],
    startTime: '09:00',
    endTime: '17:00',
    overwriteExisting: true,
    applyToDateRange: false,
    startDate: '',
    endDate: ''
  });

  const [copyScheduleForm, setCopyScheduleForm] = useState({
    sourceBarberId: 0,
    targetBarberIds: [] as number[],
    overwriteExisting: true,
    selectedDays: [] as number[]
  });

  const [templateForm, setTemplateForm] = useState({
    selectedTemplateId: 0,
    targetBarberIds: [] as number[],
    overwriteExisting: true
  });

  // Load templates on mount
  useEffect(() => {
    loadScheduleTemplates();
  }, []);

  const loadScheduleTemplates = async () => {
    try {
      const templates = await barberAvailabilityService.getScheduleTemplates();
      setScheduleTemplates(templates);
    } catch (err) {
      console.error('Failed to load schedule templates:', err);
    }
  };

  // Barber selection functions
  const toggleBarberSelection = (barberId: number) => {
    setSelectedBarbers(prev => 
      prev.includes(barberId) 
        ? prev.filter(id => id !== barberId)
        : [...prev, barberId]
    );
  };

  const selectAllBarbers = () => {
    setSelectedBarbers(barbers.map(b => b.id));
  };

  const clearSelection = () => {
    setSelectedBarbers([]);
  };

  // Bulk schedule update
  const handleBulkScheduleUpdate = async () => {
    if (selectedBarbers.length === 0 || bulkScheduleForm.selectedDays.length === 0) {
      setError('Please select barbers and days');
      return;
    }

    const operationId = `bulk_update_${Date.now()}`;
    const operation: BulkOperation = {
      id: operationId,
      type: 'update_schedule',
      title: 'Bulk Schedule Update',
      description: `Updating ${bulkScheduleForm.selectedDays.length} days for ${selectedBarbers.length} barbers`,
      status: 'running',
      progress: 0,
      affectedBarbers: selectedBarbers
    };

    setOperations(prev => [...prev, operation]);
    setLoading(true);

    try {
      const updates: BulkAvailabilityUpdate[] = [];
      
      for (const barberId of selectedBarbers) {
        for (const dayOfWeek of bulkScheduleForm.selectedDays) {
          updates.push({
            barber_id: barberId,
            day_of_week: dayOfWeek,
            start_time: bulkScheduleForm.startTime,
            end_time: bulkScheduleForm.endTime,
            date_range: bulkScheduleForm.applyToDateRange ? {
              start_date: bulkScheduleForm.startDate,
              end_date: bulkScheduleForm.endDate
            } : undefined
          });
        }
      }

      const totalUpdates = updates.length;
      let completedUpdates = 0;

      // Process updates in batches
      const batchSize = 5;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await barberAvailabilityService.bulkUpdateAvailability(batch);
        
        completedUpdates += batch.length;
        const progress = (completedUpdates / totalUpdates) * 100;
        
        setOperations(prev => prev.map(op => 
          op.id === operationId 
            ? { ...op, progress }
            : op
        ));
      }

      // Mark as completed
      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { ...op, status: 'completed', progress: 100 }
          : op
      ));

      if (onBulkUpdate) {
        onBulkUpdate(updates);
      }

    } catch (err) {
      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { 
              ...op, 
              status: 'failed', 
              errors: [err instanceof Error ? err.message : 'Unknown error'] 
            }
          : op
      ));
      setError(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setLoading(false);
    }
  };

  // Copy schedule between barbers
  const handleCopySchedule = async () => {
    if (!copyScheduleForm.sourceBarberId || copyScheduleForm.targetBarberIds.length === 0) {
      setError('Please select source and target barbers');
      return;
    }

    const operationId = `copy_schedule_${Date.now()}`;
    const operation: BulkOperation = {
      id: operationId,
      type: 'copy_schedule',
      title: 'Copy Schedule',
      description: `Copying schedule from barber ${copyScheduleForm.sourceBarberId} to ${copyScheduleForm.targetBarberIds.length} barbers`,
      status: 'running',
      progress: 0,
      affectedBarbers: [copyScheduleForm.sourceBarberId, ...copyScheduleForm.targetBarberIds]
    };

    setOperations(prev => [...prev, operation]);
    setLoading(true);

    try {
      await barberAvailabilityService.cloneWeeklySchedule(
        copyScheduleForm.sourceBarberId,
        copyScheduleForm.targetBarberIds,
        copyScheduleForm.overwriteExisting
      );

      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { ...op, status: 'completed', progress: 100 }
          : op
      ));

    } catch (err) {
      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { 
              ...op, 
              status: 'failed',
              errors: [err instanceof Error ? err.message : 'Unknown error']
            }
          : op
      ));
      setError(err instanceof Error ? err.message : 'Schedule copy failed');
    } finally {
      setLoading(false);
    }
  };

  // Apply template to multiple barbers
  const handleApplyTemplate = async () => {
    if (!templateForm.selectedTemplateId || templateForm.targetBarberIds.length === 0) {
      setError('Please select template and target barbers');
      return;
    }

    const operationId = `apply_template_${Date.now()}`;
    const operation: BulkOperation = {
      id: operationId,
      type: 'apply_template',
      title: 'Apply Template',
      description: `Applying template to ${templateForm.targetBarberIds.length} barbers`,
      status: 'running',
      progress: 0,
      affectedBarbers: templateForm.targetBarberIds
    };

    setOperations(prev => [...prev, operation]);
    setLoading(true);

    try {
      await barberAvailabilityService.applyScheduleTemplate(
        templateForm.selectedTemplateId,
        templateForm.targetBarberIds,
        templateForm.overwriteExisting
      );

      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { ...op, status: 'completed', progress: 100 }
          : op
      ));

    } catch (err) {
      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { 
              ...op, 
              status: 'failed',
              errors: [err instanceof Error ? err.message : 'Unknown error']
            }
          : op
      ));
      setError(err instanceof Error ? err.message : 'Template application failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getOperationIcon = (type: BulkOperation['type']) => {
    switch (type) {
      case 'update_schedule': return <Settings className="h-4 w-4" />;
      case 'copy_schedule': return <Copy className="h-4 w-4" />;
      case 'apply_template': return <Save className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: BulkOperation['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Bulk Availability Manager</h2>
            <p className="text-gray-600">Manage multiple barber schedules efficiently</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Barber Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Select Barbers</span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={selectAllBarbers}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {barbers.map(barber => (
              <div key={barber.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  checked={selectedBarbers.includes(barber.id)}
                  onCheckedChange={() => toggleBarberSelection(barber.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{barber.name}</div>
                  <div className="text-sm text-gray-500 capitalize">{barber.role}</div>
                </div>
              </div>
            ))}
          </div>
          
          {selectedBarbers.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900">
                {selectedBarbers.length} barber{selectedBarbers.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">Bulk Schedule Update</TabsTrigger>
          <TabsTrigger value="copy">Copy Schedule</TabsTrigger>
          <TabsTrigger value="template">Apply Template</TabsTrigger>
        </TabsList>

        {/* Bulk Schedule Update */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Schedule Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Days</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-day-${day.value}`}
                        checked={bulkScheduleForm.selectedDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkScheduleForm(prev => ({
                              ...prev,
                              selectedDays: [...prev.selectedDays, day.value]
                            }));
                          } else {
                            setBulkScheduleForm(prev => ({
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
                  <Select 
                    value={bulkScheduleForm.startTime} 
                    onValueChange={(v) => setBulkScheduleForm(prev => ({ ...prev, startTime: v }))}
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
                    value={bulkScheduleForm.endTime} 
                    onValueChange={(v) => setBulkScheduleForm(prev => ({ ...prev, endTime: v }))}
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={bulkScheduleForm.overwriteExisting}
                  onCheckedChange={(checked) => 
                    setBulkScheduleForm(prev => ({ ...prev, overwriteExisting: !!checked }))
                  }
                />
                <Label>Overwrite existing schedules</Label>
              </div>

              <Button 
                onClick={handleBulkScheduleUpdate}
                disabled={selectedBarbers.length === 0 || bulkScheduleForm.selectedDays.length === 0 || loading}
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Update {selectedBarbers.length} Barber{selectedBarbers.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Copy Schedule */}
        <TabsContent value="copy">
          <Card>
            <CardHeader>
              <CardTitle>Copy Schedule Between Barbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Source Barber</Label>
                <Select 
                  value={copyScheduleForm.sourceBarberId.toString()} 
                  onValueChange={(v) => setCopyScheduleForm(prev => ({ ...prev, sourceBarberId: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source barber" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map(barber => (
                      <SelectItem key={barber.id} value={barber.id.toString()}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target Barbers</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {barbers
                    .filter(b => b.id !== copyScheduleForm.sourceBarberId)
                    .map(barber => (
                    <div key={barber.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={copyScheduleForm.targetBarberIds.includes(barber.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCopyScheduleForm(prev => ({
                              ...prev,
                              targetBarberIds: [...prev.targetBarberIds, barber.id]
                            }));
                          } else {
                            setCopyScheduleForm(prev => ({
                              ...prev,
                              targetBarberIds: prev.targetBarberIds.filter(id => id !== barber.id)
                            }));
                          }
                        }}
                      />
                      <Label className="text-sm">{barber.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={copyScheduleForm.overwriteExisting}
                  onCheckedChange={(checked) => 
                    setCopyScheduleForm(prev => ({ ...prev, overwriteExisting: !!checked }))
                  }
                />
                <Label>Overwrite existing schedules</Label>
              </div>

              <Button 
                onClick={handleCopySchedule}
                disabled={!copyScheduleForm.sourceBarberId || copyScheduleForm.targetBarberIds.length === 0 || loading}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Schedule to {copyScheduleForm.targetBarberIds.length} Barber{copyScheduleForm.targetBarberIds.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apply Template */}
        <TabsContent value="template">
          <Card>
            <CardHeader>
              <CardTitle>Apply Schedule Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Template</Label>
                <Select 
                  value={templateForm.selectedTemplateId.toString()} 
                  onValueChange={(v) => setTemplateForm(prev => ({ ...prev, selectedTemplateId: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule template" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-gray-500">{template.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target Barbers</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {barbers.map(barber => (
                    <div key={barber.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={templateForm.targetBarberIds.includes(barber.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTemplateForm(prev => ({
                              ...prev,
                              targetBarberIds: [...prev.targetBarberIds, barber.id]
                            }));
                          } else {
                            setTemplateForm(prev => ({
                              ...prev,
                              targetBarberIds: prev.targetBarberIds.filter(id => id !== barber.id)
                            }));
                          }
                        }}
                      />
                      <Label className="text-sm">{barber.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={templateForm.overwriteExisting}
                  onCheckedChange={(checked) => 
                    setTemplateForm(prev => ({ ...prev, overwriteExisting: !!checked }))
                  }
                />
                <Label>Overwrite existing schedules</Label>
              </div>

              <Button 
                onClick={handleApplyTemplate}
                disabled={!templateForm.selectedTemplateId || templateForm.targetBarberIds.length === 0 || loading}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Apply Template to {templateForm.targetBarberIds.length} Barber{templateForm.targetBarberIds.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Operation Status */}
      {operations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {operations.slice(-3).map(operation => (
                <div key={operation.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getOperationIcon(operation.type)}
                      <span className="font-medium">{operation.title}</span>
                      <Badge variant={operation.status === 'completed' ? 'default' : 'secondary'}>
                        {operation.status}
                      </Badge>
                    </div>
                    <div className={`text-sm ${getStatusColor(operation.status)}`}>
                      {operation.progress}%
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {operation.description}
                  </div>
                  
                  <Progress value={operation.progress} className="mb-2" />
                  
                  {operation.errors && operation.errors.length > 0 && (
                    <div className="text-sm text-red-600">
                      Errors: {operation.errors.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}