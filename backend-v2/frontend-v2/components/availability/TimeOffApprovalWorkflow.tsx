"use client";

/**
 * Time Off Approval Workflow Component
 * Supports manager approval process for time off requests
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  MessageSquare,
  Filter,
  Search,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  barberAvailabilityService, 
  TimeOffRequest 
} from '@/services/barber-availability';
import { useTimeOffRequests } from '@/hooks/useBarberAvailability';

interface TimeOffApprovalWorkflowProps {
  managerId: number;
  barbers: Array<{ id: number; name: string; role: string }>;
  onRequestAction?: (requestId: number, action: 'approve' | 'deny', reason?: string) => void;
}

interface ApprovalAction {
  requestId: number;
  action: 'approve' | 'deny';
  reason?: string;
  notes?: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  slackNotifications: boolean;
  urgentOnly: boolean;
  dailyDigest: boolean;
}

export function TimeOffApprovalWorkflow({ 
  managerId, 
  barbers, 
  onRequestAction 
}: TimeOffApprovalWorkflowProps) {
  // State
  const [allRequests, setAllRequests] = useState<TimeOffRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    request: TimeOffRequest | null;
    action: 'approve' | 'deny' | null;
  }>({ open: false, request: null, action: null });

  // Filters
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'requested' | 'approved' | 'denied',
    barber: 'all',
    dateRange: 'all' as 'all' | 'upcoming' | 'this_month' | 'next_month',
    searchTerm: ''
  });

  // Approval form
  const [approvalForm, setApprovalForm] = useState({
    reason: '',
    notes: '',
    notifyBarber: true,
    addToCalendar: true
  });

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    slackNotifications: false,
    urgentOnly: false,
    dailyDigest: true
  });

  // Load all time off requests for managed barbers
  useEffect(() => {
    loadAllRequests();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [allRequests, filters]);

  const loadAllRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const requests: TimeOffRequest[] = [];
      
      // Load requests for all barbers under management
      for (const barber of barbers) {
        try {
          const barberRequests = await barberAvailabilityService.getTimeOffRequests(barber.id);
          requests.push(...barberRequests.map(req => ({ ...req, barber_name: barber.name })));
        } catch (err) {
          console.error(`Failed to load requests for barber ${barber.id}:`, err);
        }
      }

      setAllRequests(requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time off requests');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allRequests];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(req => req.status === filters.status);
    }

    // Barber filter
    if (filters.barber !== 'all') {
      filtered = filtered.filter(req => req.barber_id === parseInt(filters.barber));
    }

    // Date range filter
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    switch (filters.dateRange) {
      case 'upcoming':
        filtered = filtered.filter(req => new Date(req.start_date) >= now);
        break;
      case 'this_month':
        filtered = filtered.filter(req => 
          new Date(req.start_date) >= startOfMonth && new Date(req.start_date) < nextMonth
        );
        break;
      case 'next_month':
        const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1);
        filtered = filtered.filter(req => 
          new Date(req.start_date) >= nextMonth && new Date(req.start_date) < nextMonthEnd
        );
        break;
    }

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(req => 
        req.reason?.toLowerCase().includes(term) ||
        req.notes?.toLowerCase().includes(term) ||
        (req as any).barber_name?.toLowerCase().includes(term)
      );
    }

    // Sort by priority (requested first, then by date)
    filtered.sort((a, b) => {
      if (a.status === 'requested' && b.status !== 'requested') return -1;
      if (b.status === 'requested' && a.status !== 'requested') return 1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    setFilteredRequests(filtered);
  };

  const handleRequestAction = async (action: 'approve' | 'deny') => {
    if (!actionDialog.request) return;

    setLoading(true);
    setError(null);

    try {
      if (action === 'approve') {
        await barberAvailabilityService.approveTimeOffRequest(
          actionDialog.request.id,
          managerId,
          approvalForm.notes
        );
      } else {
        await barberAvailabilityService.denyTimeOffRequest(
          actionDialog.request.id,
          managerId,
          approvalForm.reason || 'Manager decision'
        );
      }

      // Refresh data
      await loadAllRequests();

      // Close dialog
      setActionDialog({ open: false, request: null, action: null });
      setApprovalForm({ reason: '', notes: '', notifyBarber: true, addToCalendar: true });

      // Callback
      if (onRequestAction) {
        onRequestAction(actionDialog.request.id, action, approvalForm.reason);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`);
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (request: TimeOffRequest, action: 'approve' | 'deny') => {
    setActionDialog({ open: true, request, action });
    setApprovalForm({ reason: '', notes: '', notifyBarber: true, addToCalendar: true });
  };

  const formatDateRange = (startDate: string, endDate: string, startTime?: string, endTime?: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const sameDay = start.toDateString() === end.toDateString();
    
    if (sameDay) {
      if (startTime && endTime) {
        return `${start.toLocaleDateString()} (${formatTime(startTime)} - ${formatTime(endTime)})`;
      }
      return start.toLocaleDateString();
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyLevel = (request: TimeOffRequest) => {
    const daysUntilStart = Math.ceil(
      (new Date(request.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilStart <= 3) return 'urgent';
    if (daysUntilStart <= 7) return 'high';
    if (daysUntilStart <= 14) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const pendingCount = filteredRequests.filter(req => req.status === 'requested').length;
  const urgentCount = filteredRequests.filter(req => 
    req.status === 'requested' && getUrgencyLevel(req) === 'urgent'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <CheckCircle className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Time Off Approvals</h2>
            <p className="text-gray-600">
              {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
              {urgentCount > 0 && (
                <span className="ml-2 text-red-600 font-medium">
                  ({urgentCount} urgent)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Bell className={`h-5 w-5 ${urgentCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          <Button variant="outline" size="sm" onClick={loadAllRequests} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v: any) => setFilters(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Barber</Label>
              <Select value={filters.barber} onValueChange={(v) => setFilters(prev => ({ ...prev, barber: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Barbers</SelectItem>
                  {barbers.map(barber => (
                    <SelectItem key={barber.id} value={barber.id.toString()}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={filters.dateRange} onValueChange={(v: any) => setFilters(prev => ({ ...prev, dateRange: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="next_month">Next Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500">No time off requests match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map(request => {
            const urgency = getUrgencyLevel(request);
            const barber = barbers.find(b => b.id === request.barber_id);
            
            return (
              <Card key={request.id} className={`${urgency === 'urgent' ? 'border-red-200' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <User className="h-5 w-5 text-gray-400" />
                        <span className="font-medium">{barber?.name || 'Unknown Barber'}</span>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        {urgency === 'urgent' && (
                          <Badge variant="destructive" className="animate-pulse">
                            URGENT
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDateRange(request.start_date, request.end_date, request.start_time, request.end_time)}</span>
                        </div>
                        <div className={`font-medium ${getUrgencyColor(urgency)}`}>
                          {Math.ceil((new Date(request.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days away
                        </div>
                      </div>

                      {request.reason && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </div>
                      )}

                      {request.notes && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Notes:</span> {request.notes}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Requested on {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {request.status === 'requested' && (
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(request, 'approve')}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(request, 'deny')}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => 
        setActionDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' ? 'Approve' : 'Deny'} Time Off Request
            </DialogTitle>
          </DialogHeader>
          
          {actionDialog.request && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium mb-2">
                  {barbers.find(b => b.id === actionDialog.request?.barber_id)?.name}'s Request
                </div>
                <div className="text-sm text-gray-600">
                  {formatDateRange(
                    actionDialog.request.start_date, 
                    actionDialog.request.end_date, 
                    actionDialog.request.start_time, 
                    actionDialog.request.end_time
                  )}
                </div>
                {actionDialog.request.reason && (
                  <div className="text-sm text-gray-600 mt-1">
                    Reason: {actionDialog.request.reason}
                  </div>
                )}
              </div>

              {actionDialog.action === 'deny' && (
                <div>
                  <Label>Reason for Denial *</Label>
                  <Input
                    value={approvalForm.reason}
                    onChange={(e) => setApprovalForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Enter reason for denial..."
                    required
                  />
                </div>
              )}

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  value={approvalForm.notes}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes for the barber..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setActionDialog({ open: false, request: null, action: null })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleRequestAction(actionDialog.action!)}
                  disabled={actionDialog.action === 'deny' && !approvalForm.reason}
                  className={
                    actionDialog.action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }
                >
                  {actionDialog.action === 'approve' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Request
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Deny Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}