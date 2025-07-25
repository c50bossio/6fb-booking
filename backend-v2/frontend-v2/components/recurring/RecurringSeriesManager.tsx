'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Settings, 
  Pause, 
  Play, 
  RotateCcw, 
  X, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Edit3,
  Eye
} from 'lucide-react';

interface RecurringSeries {
  id: number;
  pattern_id: number;
  user_id: number;
  series_name?: string;
  series_description?: string;
  payment_type: string;
  total_series_price?: number;
  paid_amount: number;
  payment_status: string;
  total_planned: number;
  total_completed: number;
  total_cancelled: number;
  total_rescheduled: number;
  series_status: string;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface Appointment {
  appointment_id: number;
  start_time: string;
  status: string;
  sequence: number;
  barber_name?: string;
  service_name?: string;
  is_recurring_instance: boolean;
  original_scheduled_date?: string;
}

interface SeriesAction {
  action: 'reschedule' | 'cancel' | 'modify' | 'complete';
  appointment_id?: number;
  apply_to_series: boolean;
  new_date?: string;
  new_time?: string;
  new_barber_id?: number;
  reason?: string;
}

const PAYMENT_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-red-100 text-red-800'
};

const SERIES_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  in_progress: 'bg-orange-100 text-orange-800'
};

const APPOINTMENT_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
  rescheduled: 'bg-purple-100 text-purple-800'
};

interface RecurringSeriesManagerProps {
  seriesId?: number;
  onSeriesUpdate?: (series: RecurringSeries) => void;
}

export default function RecurringSeriesManager({ 
  seriesId, 
  onSeriesUpdate 
}: RecurringSeriesManagerProps) {
  const [allSeries, setAllSeries] = useState<RecurringSeries[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<RecurringSeries | null>(null);
  const [seriesAppointments, setSeriesAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<SeriesAction['action'] | ''>('');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionData, setActionData] = useState<Partial<SeriesAction>>({});

  useEffect(() => {
    fetchAllSeries();
  }, []);

  useEffect(() => {
    if (seriesId) {
      const series = allSeries.find(s => s.id === seriesId);
      if (series) {
        setSelectedSeries(series);
        fetchSeriesAppointments(seriesId);
      }
    }
  }, [seriesId, allSeries]);

  const fetchAllSeries = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(`${apiUrl}/api/v2/recurring-appointments/series`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAllSeries(data);
        
        if (!selectedSeries && data.length > 0) {
          setSelectedSeries(data[0]);
          fetchSeriesAppointments(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching series:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeriesAppointments = async (seriesId: number) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Get series pattern to find appointments
      const seriesResponse = await fetch(
        `${apiUrl}/api/v2/recurring-appointments/series/${seriesId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!seriesResponse.ok) return;

      const series = await seriesResponse.json();

      // Get appointments for this pattern
      const appointmentsResponse = await fetch(
        `${apiUrl}/api/v2/appointments?recurring_pattern_id=${series.pattern_id}&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (appointmentsResponse.ok) {
        const appointments = await appointmentsResponse.json();
        setSeriesAppointments(appointments.filter((apt: any) => apt.recurring_series_id === seriesId));
      }
    } catch (error) {
      console.error('Error fetching series appointments:', error);
    }
  };

  const handleSeriesAction = async (action: string, seriesId: number) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      let endpoint = '';
      let method = 'PUT';
      let body: any = {};

      switch (action) {
        case 'pause':
          endpoint = `${apiUrl}/api/v2/recurring-appointments/series/${seriesId}`;
          body = { series_status: 'paused' };
          break;
        case 'resume':
          endpoint = `${apiUrl}/api/v2/recurring-appointments/series/${seriesId}`;
          body = { series_status: 'active' };
          break;
        case 'cancel':
          endpoint = `${apiUrl}/api/v2/recurring-appointments/series/${seriesId}`;
          body = { series_status: 'cancelled' };
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const updatedSeries = await response.json();
        setSelectedSeries(updatedSeries);
        
        // Update in the list
        setAllSeries(prev => 
          prev.map(s => s.id === seriesId ? updatedSeries : s)
        );

        if (onSeriesUpdate) {
          onSeriesUpdate(updatedSeries);
        }
      }
    } catch (error) {
      console.error('Error performing series action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAppointmentAction = async (actionData: SeriesAction) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(
        `${apiUrl}/api/v2/recurring-appointments/appointments/manage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(actionData)
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        // Refresh appointments
        if (selectedSeries) {
          await fetchSeriesAppointments(selectedSeries.id);
        }
        
        setShowActionDialog(false);
        setSelectedAppointments([]);
        setActionData({});
        
      }
    } catch (error) {
      console.error('Error performing appointment action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedAppointments.length === 0) return;

    setActionData({
      action: bulkAction,
      appointment_id: selectedAppointments[0],
      apply_to_series: selectedAppointments.length > 1
    });
    setShowActionDialog(true);
  };

  const getStatusBadge = (status: string, type: 'payment' | 'series' | 'appointment') => {
    const colorMap = type === 'payment' ? PAYMENT_STATUS_COLORS : 
                    type === 'series' ? SERIES_STATUS_COLORS : 
                    APPOINTMENT_STATUS_COLORS;
    
    return (
      <Badge className={colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const renderSeriesOverview = () => {
    if (!selectedSeries) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completion</p>
                <p className="text-2xl font-bold">{selectedSeries.completion_percentage.toFixed(0)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={selectedSeries.completion_percentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold">
                  {selectedSeries.total_completed}/{selectedSeries.total_planned}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Payment Status</p>
                <div className="mt-1">
                  {getStatusBadge(selectedSeries.payment_status, 'payment')}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            {selectedSeries.total_series_price && (
              <p className="text-sm text-gray-500 mt-1">
                ${selectedSeries.paid_amount.toFixed(2)} / ${selectedSeries.total_series_price.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Series Status</p>
                <div className="mt-1">
                  {getStatusBadge(selectedSeries.series_status, 'series')}
                </div>
              </div>
              <Settings className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSeriesActions = () => {
    if (!selectedSeries) return null;

    return (
      <div className="flex space-x-2 mb-4">
        {selectedSeries.series_status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSeriesAction('pause', selectedSeries.id)}
            disabled={actionLoading}
          >
            <Pause className="h-4 w-4 mr-1" />
            Pause Series
          </Button>
        )}
        
        {selectedSeries.series_status === 'paused' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSeriesAction('resume', selectedSeries.id)}
            disabled={actionLoading}
          >
            <Play className="h-4 w-4 mr-1" />
            Resume Series
          </Button>
        )}
        
        {(selectedSeries.series_status === 'active' || selectedSeries.series_status === 'paused') && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleSeriesAction('cancel', selectedSeries.id)}
            disabled={actionLoading}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel Series
          </Button>
        )}
      </div>
    );
  };

  const renderAppointmentsList = () => {
    return (
      <div className="space-y-4">
        {selectedAppointments.length > 0 && (
          <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium">
              {selectedAppointments.length} appointment(s) selected
            </p>
            
            <Select
              value={bulkAction}
              onValueChange={(value) => setBulkAction(value as SeriesAction['action'])}
              placeholder="Choose action..."
            >
              <option value="">Choose action...</option>
              <option value="reschedule">Reschedule</option>
              <option value="cancel">Cancel</option>
              <option value="complete">Mark Complete</option>
            </Select>
            
            <Button
              size="sm"
              onClick={handleBulkAction}
              disabled={!bulkAction}
            >
              Apply Action
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAppointments([])}
            >
              Clear Selection
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {seriesAppointments.map((appointment) => (
            <Card key={appointment.appointment_id} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedAppointments.includes(appointment.appointment_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAppointments(prev => [...prev, appointment.appointment_id]);
                        } else {
                          setSelectedAppointments(prev => 
                            prev.filter(id => id !== appointment.appointment_id)
                          );
                        }
                      }}
                      className="w-4 h-4"
                    />
                    
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">
                          {format(parseISO(appointment.start_time), 'EEEE, MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(appointment.start_time), 'h:mm a')}
                          {appointment.sequence && ` • #${appointment.sequence}`}
                        </p>
                        {appointment.original_scheduled_date && (
                          <p className="text-xs text-orange-600">
                            Originally scheduled: {format(parseISO(appointment.original_scheduled_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(appointment.status, 'appointment')}
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActionData({
                            action: 'reschedule',
                            appointment_id: appointment.appointment_id,
                            apply_to_series: false
                          });
                          setShowActionDialog(true);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to appointment details
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderActionDialog = () => (
    <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionData.action?.charAt(0).toUpperCase() + actionData.action?.slice(1)} Appointment
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {actionData.action === 'reschedule' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new_date">New Date</Label>
                  <Input
                    id="new_date"
                    type="date"
                    value={actionData.new_date || ''}
                    onChange={(e) => setActionData(prev => ({ ...prev, new_date: e.target.value }))}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                
                <div>
                  <Label htmlFor="new_time">New Time</Label>
                  <Input
                    id="new_time"
                    type="time"
                    value={actionData.new_time || ''}
                    onChange={(e) => setActionData(prev => ({ ...prev, new_time: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}
          
          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              value={actionData.reason || ''}
              onChange={(e) => setActionData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason for this change..."
            />
          </div>
          
          {selectedAppointments.length > 1 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="apply_to_series"
                checked={actionData.apply_to_series || false}
                onChange={(e) => setActionData(prev => ({ 
                  ...prev, 
                  apply_to_series: e.target.checked 
                }))}
              />
              <Label htmlFor="apply_to_series">
                Apply to all selected appointments
              </Label>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAppointmentAction(actionData as SeriesAction)}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading series...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Recurring Series Management</h2>
        
        {allSeries.length > 1 && (
          <Select
            value={selectedSeries?.id.toString() || ''}
            onValueChange={(value) => {
              const series = allSeries.find(s => s.id === parseInt(value));
              if (series) {
                setSelectedSeries(series);
                fetchSeriesAppointments(series.id);
              }
            }}
          >
            {allSeries.map(series => (
              <option key={series.id} value={series.id.toString()}>
                {series.series_name || `Series #${series.id}`}
              </option>
            ))}
          </Select>
        )}
      </div>

      {selectedSeries ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{selectedSeries.series_name || `Recurring Series #${selectedSeries.id}`}</CardTitle>
              {selectedSeries.series_description && (
                <CardDescription>{selectedSeries.series_description}</CardDescription>
              )}
            </CardHeader>
          </Card>

          {renderSeriesOverview()}
          {renderSeriesActions()}

          <Card>
            <CardHeader>
              <CardTitle>Appointments in Series</CardTitle>
              <CardDescription>
                Manage individual appointments or perform bulk actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderAppointmentsList()}
            </CardContent>
          </Card>

          {renderActionDialog()}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recurring series found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}