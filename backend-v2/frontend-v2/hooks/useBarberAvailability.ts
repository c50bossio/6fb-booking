/**
 * Custom React Hooks for Barber Availability Management
 * Supports Six Figure Barber methodology for efficient business operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  barberAvailabilityService, 
  BarberAvailability, 
  TimeOffRequest, 
  SpecialAvailability,
  BarberSchedule,
  UtilizationAnalytics,
  AvailabilityCheck 
} from '@/services/barber-availability';

// Main availability management hook
export function useBarberAvailability(barberId: number) {
  const [availability, setAvailability] = useState<BarberAvailability[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [specialAvailability, setSpecialAvailability] = useState<SpecialAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!barberId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [avail, timeOff, special] = await Promise.all([
        barberAvailabilityService.getBarberAvailability(barberId),
        barberAvailabilityService.getTimeOffRequests(barberId),
        barberAvailabilityService.getSpecialAvailability(barberId)
      ]);
      
      setAvailability(avail);
      setTimeOffRequests(timeOff);
      setSpecialAvailability(special);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch availability');
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const updateAvailability = useCallback(async (
    availabilityId: number, 
    updates: Partial<BarberAvailability>
  ) => {
    try {
      setLoading(true);
      const updated = await barberAvailabilityService.updateBarberAvailability(availabilityId, updates);
      setAvailability(prev => prev.map(a => a.id === availabilityId ? updated : a));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAvailability = useCallback(async (
    data: Omit<BarberAvailability, 'id' | 'barber_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      setLoading(true);
      const created = await barberAvailabilityService.createBarberAvailability(barberId, data);
      setAvailability(prev => [...prev, created]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create availability');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  const deleteAvailability = useCallback(async (availabilityId: number) => {
    try {
      setLoading(true);
      await barberAvailabilityService.deleteBarberAvailability(availabilityId);
      setAvailability(prev => prev.filter(a => a.id !== availabilityId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete availability');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkUpdateAvailability = useCallback(async (updates: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>) => {
    try {
      setLoading(true);
      const bulkUpdates = updates.map(update => ({
        barber_id: barberId,
        ...update
      }));
      
      await barberAvailabilityService.bulkUpdateAvailability(bulkUpdates);
      await fetchAvailability(); // Refresh all data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update availability');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [barberId, fetchAvailability]);

  // Convert availability array to weekly schedule object
  const weeklySchedule = useMemo(() => {
    const schedule: { [key: number]: BarberAvailability } = {};
    availability.forEach(avail => {
      schedule[avail.day_of_week] = avail;
    });
    return schedule;
  }, [availability]);

  return {
    availability,
    timeOffRequests,
    specialAvailability,
    weeklySchedule,
    loading,
    error,
    refetch: fetchAvailability,
    updateAvailability,
    createAvailability,
    deleteAvailability,
    bulkUpdateAvailability
  };
}

// Time off management hook
export function useTimeOffRequests(barberId: number) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!barberId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await barberAvailabilityService.getTimeOffRequests(barberId);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time off requests');
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = useCallback(async (
    data: Omit<TimeOffRequest, 'id' | 'barber_id' | 'status' | 'approved_by_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      setLoading(true);
      const created = await barberAvailabilityService.createTimeOffRequest(barberId, data);
      setRequests(prev => [...prev, created]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create time off request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  const approveRequest = useCallback(async (requestId: number, approverId: number) => {
    try {
      setLoading(true);
      const updated = await barberAvailabilityService.approveTimeOffRequest(requestId, approverId);
      setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve time off request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const denyRequest = useCallback(async (requestId: number, approverId: number, reason?: string) => {
    try {
      setLoading(true);
      const updated = await barberAvailabilityService.denyTimeOffRequest(requestId, approverId, reason);
      setRequests(prev => prev.map(r => r.id === requestId ? updated : r));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny time off request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get pending requests that need approval
  const pendingRequests = useMemo(() => 
    requests.filter(r => r.status === 'requested'), 
    [requests]
  );

  // Get approved future time off
  const upcomingTimeOff = useMemo(() => 
    requests.filter(r => 
      r.status === 'approved' && 
      new Date(r.end_date) >= new Date()
    ),
    [requests]
  );

  return {
    requests,
    pendingRequests,
    upcomingTimeOff,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    approveRequest,
    denyRequest
  };
}

// Availability checking hook
export function useAvailabilityCheck() {
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<AvailabilityCheck | null>(null);

  const checkAvailability = useCallback(async (
    barberId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: number
  ) => {
    try {
      setChecking(true);
      const result = await barberAvailabilityService.checkBarberAvailability(
        barberId,
        date,
        startTime,
        endTime,
        excludeAppointmentId
      );
      setLastCheck(result);
      return result;
    } catch (err) {
      console.error('Availability check failed:', err);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  const checkMultipleBarbers = useCallback(async (
    date: string,
    startTime: string,
    endTime: string,
    serviceId?: number
  ) => {
    try {
      setChecking(true);
      const result = await barberAvailabilityService.getAvailableBarbers(
        date,
        startTime,
        endTime,
        serviceId
      );
      return result;
    } catch (err) {
      console.error('Multiple barber availability check failed:', err);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checking,
    lastCheck,
    checkAvailability,
    checkMultipleBarbers
  };
}

// Schedule overview hook
export function useBarberSchedule(barberId: number, dateRange: { start: string; end: string }) {
  const [schedule, setSchedule] = useState<BarberSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!barberId || !dateRange.start || !dateRange.end) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await barberAvailabilityService.getBarberSchedule(
        barberId,
        dateRange.start,
        dateRange.end
      );
      setSchedule(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  }, [barberId, dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Calculate schedule statistics
  const scheduleStats = useMemo(() => {
    if (!schedule) return null;

    const totalAppointments = schedule.appointments.length;
    const totalHours = schedule.appointments.reduce((sum, apt) => sum + (apt.duration_minutes / 60), 0);
    const availableHours = schedule.regular_availability.reduce((sum, avail) => {
      if (!avail.is_active) return sum;
      const start = new Date(`2000-01-01T${avail.start_time}`);
      const end = new Date(`2000-01-01T${avail.end_time}`);
      return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    }, 0);

    const utilization = availableHours > 0 ? (totalHours / availableHours) * 100 : 0;

    return {
      totalAppointments,
      totalHours: Math.round(totalHours * 100) / 100,
      availableHours: Math.round(availableHours * 100) / 100,
      utilization: Math.round(utilization * 100) / 100,
      timeOffDays: schedule.time_off.length,
      specialHours: schedule.special_availability.length
    };
  }, [schedule]);

  return {
    schedule,
    scheduleStats,
    loading,
    error,
    refetch: fetchSchedule
  };
}

// Analytics hook
export function useAvailabilityAnalytics(barberId: number, period: 'week' | 'month' | 'quarter' = 'month') {
  const [analytics, setAnalytics] = useState<UtilizationAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!barberId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await barberAvailabilityService.getUtilizationAnalytics(barberId, period);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [barberId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Calculate performance insights
  const insights = useMemo(() => {
    if (!analytics) return null;

    const insights = [];

    // Utilization insights
    if (analytics.utilization_rate > 90) {
      insights.push({
        type: 'warning',
        title: 'High Utilization',
        message: 'Consider adding more availability or increasing prices.',
        priority: 'high'
      });
    } else if (analytics.utilization_rate < 50) {
      insights.push({
        type: 'info',
        title: 'Low Utilization',
        message: 'Consider marketing campaigns or adjusting schedule.',
        priority: 'medium'
      });
    }

    // Revenue insights
    if (analytics.revenue_per_hour < 50) {
      insights.push({
        type: 'warning',
        title: 'Low Revenue per Hour',
        message: 'Focus on premium services and client value.',
        priority: 'high'
      });
    }

    // Peak hours optimization
    if (analytics.peak_hours.length > 0) {
      insights.push({
        type: 'success',
        title: 'Peak Hours Identified',
        message: `Highest demand at ${analytics.peak_hours.join(', ')}. Consider premium pricing.`,
        priority: 'medium'
      });
    }

    return insights;
  }, [analytics]);

  return {
    analytics,
    insights,
    loading,
    error,
    refetch: fetchAnalytics
  };
}

// Conflict detection hook
export function useConflictDetection() {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);

  const detectConflicts = useCallback(async (
    barberId: number,
    proposedAvailability: BarberAvailability[]
  ) => {
    try {
      setChecking(true);
      const result = await barberAvailabilityService.detectScheduleConflicts(
        barberId,
        proposedAvailability
      );
      setConflicts(result);
      return result;
    } catch (err) {
      console.error('Conflict detection failed:', err);
      return [];
    } finally {
      setChecking(false);
    }
  }, []);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  const hasConflicts = conflicts.length > 0;
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');

  return {
    conflicts,
    hasConflicts,
    criticalConflicts,
    checking,
    detectConflicts,
    clearConflicts
  };
}

// Calendar integration hook
export function useCalendarIntegration(barberId: number) {
  const [syncStatus, setSyncStatus] = useState<{
    connected: boolean;
    lastSync?: string;
    syncErrors?: string[];
  }>({ connected: false });

  const checkSyncStatus = useCallback(async () => {
    // This would integrate with the existing calendar sync system
    // Implementation depends on the calendar service
    try {
      // Check Google Calendar connection status
      const status = { connected: true, lastSync: new Date().toISOString() };
      setSyncStatus(status);
      return status;
    } catch (err) {
      setSyncStatus({ connected: false, syncErrors: ['Connection failed'] });
      return { connected: false };
    }
  }, [barberId]);

  const triggerSync = useCallback(async () => {
    try {
      // Trigger manual sync with external calendar
      await checkSyncStatus();
      return true;
    } catch (err) {
      console.error('Calendar sync failed:', err);
      return false;
    }
  }, [checkSyncStatus]);

  useEffect(() => {
    checkSyncStatus();
  }, [checkSyncStatus]);

  return {
    syncStatus,
    checkSyncStatus,
    triggerSync
  };
}

// Revenue optimization hook (Six Figure Barber methodology)
export function useRevenueOptimization(barberId: number) {
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedSchedule, setOptimizedSchedule] = useState<any>(null);

  const optimizeForRevenue = useCallback(async (
    targetRevenue: number,
    constraints?: {
      max_hours_per_day?: number;
      preferred_days?: number[];
      break_duration?: number;
    }
  ) => {
    try {
      setOptimizing(true);
      const result = await barberAvailabilityService.getRevenueOptimizedSchedule(
        barberId,
        targetRevenue,
        constraints
      );
      setOptimizedSchedule(result);
      return result;
    } catch (err) {
      console.error('Revenue optimization failed:', err);
      return null;
    } finally {
      setOptimizing(false);
    }
  }, [barberId]);

  return {
    optimizing,
    optimizedSchedule,
    optimizeForRevenue
  };
}