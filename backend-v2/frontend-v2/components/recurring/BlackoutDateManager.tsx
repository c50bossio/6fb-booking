'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { 
  CalendarX, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  MapPin,
  User,
  Repeat,
  Info,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface BlackoutDate {
  id: number;
  blackout_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  reason: string;
  blackout_type: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  allow_emergency_bookings: boolean;
  affects_existing_appointments: boolean;
  auto_reschedule: boolean;
  description?: string;
  location_id?: number;
  barber_id?: number;
  created_by_id: number;
  is_active: boolean;
  created_at: string;
}

interface BlackoutFormData {
  blackout_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  reason: string;
  blackout_type: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  allow_emergency_bookings: boolean;
  affects_existing_appointments: boolean;
  auto_reschedule: boolean;
  description?: string;
  location_id?: number;
  barber_id?: number;
}

interface ImpactReport {
  blackout_id: number;
  blackout_date: string;
  blackout_type: string;
  reason: string;
  total_affected: number;
  affected_appointments: Array<{
    appointment_id: number;
    start_time: string;
    duration_minutes: number;
    client_name: string;
    service_name: string;
    can_reschedule: boolean;
  }>;
  auto_reschedule_enabled: boolean;
}

const BLACKOUT_TYPES = [
  { value: 'full_day', label: 'Full Day', description: 'Block entire day' },
  { value: 'partial_day', label: 'Partial Day', description: 'Block specific time range' },
  { value: 'recurring', label: 'Recurring', description: 'Repeating blackout pattern' }
];

const RECURRENCE_PATTERNS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' }
];

const COMMON_REASONS = [
  'Vacation',
  'Training',
  'Maintenance',
  'Holiday',
  'Personal Day',
  'Sick Leave',
  'Conference',
  'Equipment Repair'
];

interface BlackoutDateManagerProps {
  locationId?: number;
  barberId?: number;
  onBlackoutChange?: (blackouts: BlackoutDate[]) => void;
}

export default function BlackoutDateManager({
  locationId,
  barberId,
  onBlackoutChange
}: BlackoutDateManagerProps) {
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBlackout, setEditingBlackout] = useState<BlackoutDate | null>(null);
  const [impactReport, setImpactReport] = useState<ImpactReport | null>(null);
  const [showImpactDialog, setShowImpactDialog] = useState(false);
  
  const [formData, setFormData] = useState<BlackoutFormData>({
    blackout_date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
    blackout_type: 'full_day',
    is_recurring: false,
    allow_emergency_bookings: false,
    affects_existing_appointments: true,
    auto_reschedule: false,
    location_id: locationId,
    barber_id: barberId
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBlackouts();
  }, [locationId, barberId]);

  const fetchBlackouts = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const params = new URLSearchParams();
      if (locationId) params.append('location_id', locationId.toString());
      if (barberId) params.append('barber_id', barberId.toString());
      params.append('include_recurring', 'true');

      const response = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/blackouts?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setBlackouts(data);
        if (onBlackoutChange) {
          onBlackoutChange(data);
        }
      }
    } catch (error) {
      console.error('Error fetching blackouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.blackout_date) {
      newErrors.blackout_date = 'Blackout date is required';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (formData.end_date && formData.end_date < formData.blackout_date) {
      newErrors.end_date = 'End date cannot be before start date';
    }

    if (formData.blackout_type === 'partial_day') {
      if (!formData.start_time || !formData.end_time) {
        newErrors.time_range = 'Start and end times are required for partial day blackouts';
      } else if (formData.end_time <= formData.start_time) {
        newErrors.time_range = 'End time must be after start time';
      }
    }

    if (formData.is_recurring) {
      if (!formData.recurrence_pattern) {
        newErrors.recurrence_pattern = 'Recurrence pattern is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createBlackout = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/blackouts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        await fetchBlackouts();
        setShowCreateDialog(false);
        resetForm();
        console.log('Blackout date created successfully');
      } else {
        const error = await response.json();
        console.error('Error creating blackout:', error);
      }
    } catch (error) {
      console.error('Error creating blackout:', error);
    }
  };

  const updateBlackout = async () => {
    if (!editingBlackout || !validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/blackouts/${editingBlackout.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        await fetchBlackouts();
        setEditingBlackout(null);
        resetForm();
        console.log('Blackout date updated successfully');
      } else {
        const error = await response.json();
        console.error('Error updating blackout:', error);
      }
    } catch (error) {
      console.error('Error updating blackout:', error);
    }
  };

  const deleteBlackout = async (blackoutId: number) => {
    if (!confirm('Are you sure you want to delete this blackout date?')) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/blackouts/${blackoutId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.ok) {
        await fetchBlackouts();
        console.log('Blackout date deleted successfully');
      } else {
        console.error('Error deleting blackout');
      }
    } catch (error) {
      console.error('Error deleting blackout:', error);
    }
  };

  const fetchImpactReport = async (blackoutId: number) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/blackouts/${blackoutId}/impact`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const report = await response.json();
        setImpactReport(report);
        setShowImpactDialog(true);
      }
    } catch (error) {
      console.error('Error fetching impact report:', error);
    }
  };

  const checkBlackoutConflict = async (date: string, time?: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const payload: any = {
        check_date: date,
        duration_minutes: 30,
        location_id: locationId,
        barber_id: barberId
      };

      if (time) {
        payload.check_time = time;
      }

      const response = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/blackouts/check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error('Error checking blackout conflict:', error);
    }
    return null;
  };

  const resetForm = () => {
    setFormData({
      blackout_date: format(new Date(), 'yyyy-MM-dd'),
      reason: '',
      blackout_type: 'full_day',
      is_recurring: false,
      allow_emergency_bookings: false,
      affects_existing_appointments: true,
      auto_reschedule: false,
      location_id: locationId,
      barber_id: barberId
    });
    setErrors({});
  };

  const startEdit = (blackout: BlackoutDate) => {
    setFormData({
      blackout_date: blackout.blackout_date,
      end_date: blackout.end_date,
      start_time: blackout.start_time,
      end_time: blackout.end_time,
      reason: blackout.reason,
      blackout_type: blackout.blackout_type,
      is_recurring: blackout.is_recurring,
      recurrence_pattern: blackout.recurrence_pattern,
      recurrence_end_date: blackout.recurrence_end_date,
      allow_emergency_bookings: blackout.allow_emergency_bookings,
      affects_existing_appointments: blackout.affects_existing_appointments,
      auto_reschedule: blackout.auto_reschedule,
      description: blackout.description,
      location_id: blackout.location_id,
      barber_id: blackout.barber_id
    });
    setEditingBlackout(blackout);
  };

  const getBlackoutStatusBadge = (blackout: BlackoutDate) => {
    const now = new Date();
    const blackoutDate = parseISO(blackout.blackout_date);
    const endDate = blackout.end_date ? parseISO(blackout.end_date) : blackoutDate;

    if (!blackout.is_active) {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
    
    if (isAfter(now, endDate)) {
      return <Badge className="bg-gray-100 text-gray-800">Past</Badge>;
    }
    
    if (isBefore(now, blackoutDate)) {
      return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
    }
    
    return <Badge className="bg-red-100 text-red-800">Active</Badge>;
  };

  const renderBlackoutForm = () => (
    <div className="space-y-6">
      <div>
        <Label>Blackout Type</Label>
        <RadioGroup
          value={formData.blackout_type}
          onValueChange={(value) => setFormData(prev => ({ ...prev, blackout_type: value }))}
          className="mt-2"
        >
          {BLACKOUT_TYPES.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <RadioGroupItem value={type.value} id={type.value} />
              <Label htmlFor={type.value} className="flex-1">
                <div>
                  <span className="font-medium">{type.label}</span>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="blackout_date">Start Date</Label>
          <Input
            id="blackout_date"
            type="date"
            value={formData.blackout_date}
            onChange={(e) => setFormData(prev => ({ ...prev, blackout_date: e.target.value }))}
            className={errors.blackout_date ? 'border-red-500' : ''}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
          {errors.blackout_date && (
            <p className="text-sm text-red-600 mt-1">{errors.blackout_date}</p>
          )}
        </div>

        <div>
          <Label htmlFor="end_date">End Date (Optional)</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value || undefined }))}
            className={errors.end_date ? 'border-red-500' : ''}
            min={formData.blackout_date}
          />
          {errors.end_date && (
            <p className="text-sm text-red-600 mt-1">{errors.end_date}</p>
          )}
        </div>
      </div>

      {formData.blackout_type === 'partial_day' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              className={errors.time_range ? 'border-red-500' : ''}
            />
          </div>

          <div>
            <Label htmlFor="end_time">End Time</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              className={errors.time_range ? 'border-red-500' : ''}
            />
          </div>
          {errors.time_range && (
            <p className="text-sm text-red-600 mt-1 col-span-2">{errors.time_range}</p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="reason">Reason</Label>
        <div className="flex space-x-2 mt-1">
          <Input
            id="reason"
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            className={errors.reason ? 'border-red-500' : ''}
            placeholder="Enter reason for blackout..."
          />
          <Select
            value=""
            onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
          >
            <option value="">Quick Select</option>
            {COMMON_REASONS.map(reason => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </Select>
        </div>
        {errors.reason && (
          <p className="text-sm text-red-600 mt-1">{errors.reason}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Additional details about this blackout..."
          rows={3}
        />
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="is_recurring"
            checked={formData.is_recurring}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, is_recurring: checked as boolean }))
            }
          />
          <Label htmlFor="is_recurring">Make this a recurring blackout</Label>
        </div>

        {formData.is_recurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
            <div>
              <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
              <Select
                value={formData.recurrence_pattern || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, recurrence_pattern: value }))}
              >
                <option value="">Select pattern</option>
                {RECURRENCE_PATTERNS.map(pattern => (
                  <option key={pattern.value} value={pattern.value}>{pattern.label}</option>
                ))}
              </Select>
              {errors.recurrence_pattern && (
                <p className="text-sm text-red-600 mt-1">{errors.recurrence_pattern}</p>
              )}
            </div>

            <div>
              <Label htmlFor="recurrence_end_date">Recurrence End Date</Label>
              <Input
                id="recurrence_end_date"
                type="date"
                value={formData.recurrence_end_date || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  recurrence_end_date: e.target.value || undefined 
                }))}
                min={formData.blackout_date}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Options</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allow_emergency_bookings"
            checked={formData.allow_emergency_bookings}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, allow_emergency_bookings: checked as boolean }))
            }
          />
          <Label htmlFor="allow_emergency_bookings" className="text-sm">
            Allow emergency bookings during this blackout
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="affects_existing_appointments"
            checked={formData.affects_existing_appointments}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, affects_existing_appointments: checked as boolean }))
            }
          />
          <Label htmlFor="affects_existing_appointments" className="text-sm">
            Affect existing appointments
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="auto_reschedule"
            checked={formData.auto_reschedule}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, auto_reschedule: checked as boolean }))
            }
          />
          <Label htmlFor="auto_reschedule" className="text-sm">
            Automatically reschedule conflicted appointments
          </Label>
        </div>
      </div>
    </div>
  );

  const renderBlackoutsList = () => (
    <div className="space-y-4">
      {blackouts.map((blackout) => (
        <Card key={blackout.id} className="transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <CalendarX className="h-5 w-5 text-red-500" />
                  <div>
                    <h4 className="font-medium">{blackout.reason}</h4>
                    <p className="text-sm text-gray-500">
                      {format(parseISO(blackout.blackout_date), 'MMM d, yyyy')}
                      {blackout.end_date && (
                        ` - ${format(parseISO(blackout.end_date), 'MMM d, yyyy')}`
                      )}
                      {blackout.blackout_type === 'partial_day' && blackout.start_time && blackout.end_time && (
                        ` • ${blackout.start_time} - ${blackout.end_time}`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {getBlackoutStatusBadge(blackout)}
                  
                  <Badge variant="outline" className="text-xs">
                    {blackout.blackout_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  
                  {blackout.is_recurring && (
                    <Badge variant="outline" className="text-xs">
                      <Repeat className="h-3 w-3 mr-1" />
                      {blackout.recurrence_pattern?.toUpperCase()}
                    </Badge>
                  )}
                  
                  {blackout.location_id && (
                    <span className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      Location
                    </span>
                  )}
                  
                  {blackout.barber_id && (
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      Barber
                    </span>
                  )}
                </div>

                {blackout.description && (
                  <p className="text-sm text-gray-600 mt-2">{blackout.description}</p>
                )}

                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  {blackout.allow_emergency_bookings && (
                    <span className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      Emergency bookings allowed
                    </span>
                  )}
                  
                  {blackout.auto_reschedule && (
                    <span className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1 text-blue-500" />
                      Auto-reschedule enabled
                    </span>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchImpactReport(blackout.id)}
                >
                  <Info className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(blackout)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteBlackout(blackout.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderImpactDialog = () => (
    <Dialog open={showImpactDialog} onOpenChange={setShowImpactDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Blackout Impact Report</DialogTitle>
        </DialogHeader>
        
        {impactReport && (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800">
                {impactReport.total_affected} appointment(s) affected
              </h4>
              <p className="text-sm text-yellow-600">
                Blackout: {impactReport.reason} on {format(parseISO(impactReport.blackout_date), 'MMM d, yyyy')}
              </p>
            </div>

            {impactReport.affected_appointments.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Affected Appointments</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {impactReport.affected_appointments.map((appointment) => (
                    <div key={appointment.appointment_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{appointment.client_name}</p>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(appointment.start_time), 'MMM d, yyyy h:mm a')} - {appointment.service_name}
                        </p>
                      </div>
                      {appointment.can_reschedule ? (
                        <Badge className="bg-blue-100 text-blue-800">Can Reschedule</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Manual Review Required</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {impactReport.auto_reschedule_enabled && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Auto-reschedule is enabled. Affected appointments will be automatically rescheduled when possible.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading blackout dates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Blackout Date Management</h2>
        
        <Dialog open={showCreateDialog || !!editingBlackout} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingBlackout(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Blackout Date
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBlackout ? 'Edit Blackout Date' : 'Create Blackout Date'}
              </DialogTitle>
            </DialogHeader>
            
            {renderBlackoutForm()}
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setEditingBlackout(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={editingBlackout ? updateBlackout : createBlackout}>
                {editingBlackout ? 'Update' : 'Create'} Blackout
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {blackouts.length > 0 ? (
        renderBlackoutsList()
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CalendarX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No blackout dates configured</p>
            <p className="text-sm text-gray-400 mt-1">
              Create blackout dates to prevent bookings on specific days or times
            </p>
          </CardContent>
        </Card>
      )}

      {renderImpactDialog()}
    </div>
  );
}