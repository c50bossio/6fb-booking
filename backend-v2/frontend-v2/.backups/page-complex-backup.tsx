'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';  
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';  
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarOff, CalendarCheck, Calendar as CalendarIcon, User, DollarSign, Edit, Trash2, AlertCircle, Plus } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { getMyBookings, type BookingResponse } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface RegularAvailability {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface TimeOff {
  id?: number;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  notes?: string;
}

interface SpecialAvailability {
  id?: number;
  date: string;
  start_time: string;
  end_time: string;
  availability_type: 'additional' | 'override';
  notes?: string;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function MySchedulePage() {
  // Client-side only check
  const [isClient, setIsClient] = useState(false);
  
  // Availability state
  const [regularAvailability, setRegularAvailability] = useState<RegularAvailability[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOff[]>([]);
  const [specialAvailability, setSpecialAvailability] = useState<SpecialAvailability[]>([]);
  
  // Bookings state
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  
  // UI state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);
  const [barberId, setBarberId] = useState<number | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [addingTimeOff, setAddingTimeOff] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState<number | null>(null);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOff | null>(null);
  const [timeOffType, setTimeOffType] = useState<'full_day' | 'partial'>('full_day');
  const [timeOffStartTime, setTimeOffStartTime] = useState('09:00');
  const [timeOffEndTime, setTimeOffEndTime] = useState('17:00');
  const [timeOffReason, setTimeOffReason] = useState('Personal');
  const [timeOffNotes, setTimeOffNotes] = useState('');
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Ensure client-side only execution
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return; // Only run on client side
    
    // Get current user info from localStorage or use demo mode
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        setBarberId(user.id);
        fetchAllData(user.id);
      } else {
        // Demo mode - load sample data
        setIsDemoMode(true);
        loadDemoData();
      }
    } catch (error) {
      console.log('Authentication not available, loading demo data:', error);
      setIsDemoMode(true);
      loadDemoData();
    }
  }, [isClient]);

  const loadDemoData = () => {
    console.log('Loading demo data for my-schedule page');
    
    // Demo barber ID
    setBarberId(1);
    
    // Demo regular availability (Monday-Friday 9-5, weekends off)
    const demoAvailability: RegularAvailability[] = [
      { id: 1, day_of_week: 0, start_time: '09:00', end_time: '17:00', is_active: true }, // Monday
      { id: 2, day_of_week: 1, start_time: '09:00', end_time: '17:00', is_active: true }, // Tuesday  
      { id: 3, day_of_week: 2, start_time: '09:00', end_time: '17:00', is_active: true }, // Wednesday
      { id: 4, day_of_week: 3, start_time: '09:00', end_time: '17:00', is_active: true }, // Thursday
      { id: 5, day_of_week: 4, start_time: '09:00', end_time: '17:00', is_active: true }, // Friday
      { id: 6, day_of_week: 5, start_time: '10:00', end_time: '16:00', is_active: false }, // Saturday - off
      { id: 7, day_of_week: 6, start_time: '10:00', end_time: '16:00', is_active: false }  // Sunday - off
    ];
    setRegularAvailability(demoAvailability);
    
    // Demo time off requests
    const today = new Date();
    const nextWeek = addDays(today, 7);
    const demoTimeOff: TimeOff[] = [
      {
        id: 1,
        start_date: format(nextWeek, 'yyyy-MM-dd'),
        end_date: format(nextWeek, 'yyyy-MM-dd'),
        reason: 'Personal',
        notes: 'Doctor appointment'
      }
    ];
    setTimeOffRequests(demoTimeOff);
    
    // Demo bookings (sample appointments)
    const demoBookings: BookingResponse[] = [
      {
        id: 1,
        service_name: 'Premium Haircut',
        client_name: 'John Smith',
        start_time: format(today.setHours(10, 0, 0, 0), "yyyy-MM-dd'T'HH:mm:ss"),
        appointment_date: format(today, 'yyyy-MM-dd'),
        created_at: new Date().toISOString(),
        price: '45'
      },
      {
        id: 2,
        service_name: 'Beard Trim & Style',
        client_name: 'Mike Wilson',
        start_time: format(today.setHours(14, 0, 0, 0), "yyyy-MM-dd'T'HH:mm:ss"),
        appointment_date: format(today, 'yyyy-MM-dd'),
        created_at: new Date().toISOString(),
        price: '25'
      },
      {
        id: 3,
        service_name: 'Haircut & Wash',
        client_name: 'David Chen',
        start_time: format(addDays(today, 1).setHours(11, 30, 0, 0), "yyyy-MM-dd'T'HH:mm:ss"),
        appointment_date: format(addDays(today, 1), 'yyyy-MM-dd'),
        created_at: new Date().toISOString(),
        price: '35'
      }
    ];
    setBookings(demoBookings);
    
    setLoading(false);
  };

  const fetchAllData = async (barberId: number) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAvailabilityData(barberId),
        fetchBookingsData()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schedule data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailabilityData = async (barberId: number) => {
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      // Fetch regular availability
      const regularResponse = await fetch(`${apiUrl}/barber-availability/availability/${barberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (regularResponse.ok) {
        const data = await regularResponse.json();
        const availabilityByDay = new Map(data.map((av: RegularAvailability) => [av.day_of_week, av]));
        const allDays: RegularAvailability[] = Array.from({ length: 7 }, (_, i): RegularAvailability => {
          const existing = availabilityByDay.get(i);
          if (existing) {
            return existing as RegularAvailability;
          }
          return {
            day_of_week: i,
            start_time: '09:00',
            end_time: '17:00',
            is_active: false
          };
        });
        setRegularAvailability(allDays);
      }

      // Fetch time off requests
      const timeOffResponse = await fetch(`${apiUrl}/barber-availability/time-off/${barberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (timeOffResponse.ok) {
        const data = await timeOffResponse.json();
        setTimeOffRequests(data);
      }

      // Fetch special availability
      const specialResponse = await fetch(`${apiUrl}/barber-availability/special/${barberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (specialResponse.ok) {
        const data = await specialResponse.json();
        setSpecialAvailability(data);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const fetchBookingsData = async () => {
    try {
      const response = await getMyBookings();
      setBookings(response.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const addTimeOffRequest = async () => {
    if (!barberId || !selectedDate || addingTimeOff) return;

    setAddingTimeOff(true);
    const endDate = selectedEndDate || selectedDate;
    const newTimeOff: TimeOff = {
      start_date: format(selectedDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      start_time: timeOffType === 'partial' ? timeOffStartTime : undefined,
      end_time: timeOffType === 'partial' ? timeOffEndTime : undefined,
      reason: timeOffReason,
      notes: timeOffNotes
    };

    if (isDemoMode) {
      // Demo mode - simulate adding time off
      const demoTimeOff = { ...newTimeOff, id: Date.now() };
      setTimeOffRequests([...timeOffRequests, demoTimeOff]);
      const dateRange = selectedEndDate && selectedEndDate !== selectedDate 
        ? `${format(selectedDate, 'MMM d')} - ${format(selectedEndDate, 'MMM d, yyyy')}`
        : format(selectedDate, 'MMM d, yyyy');
      toast({
        title: 'Demo Mode',
        description: `Time off would be added for ${dateRange} (demo data)`,
      });
      resetTimeOffForm();
      setAddingTimeOff(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/barber-availability/time-off/${barberId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTimeOff)
      });

      if (response.ok) {
        const created = await response.json();
        setTimeOffRequests([...timeOffRequests, created]);
        const dateRange = selectedEndDate && selectedEndDate !== selectedDate 
          ? `${format(selectedDate, 'MMM d')} - ${format(selectedEndDate, 'MMM d, yyyy')}`
          : format(selectedDate, 'MMM d, yyyy');
        toast({
          title: 'Success',
          description: `Time off added for ${dateRange}`,
        });
        resetTimeOffForm();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating time off:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create time off request',
        variant: 'destructive',
      });
    } finally {
      setAddingTimeOff(false);
    }
  };

  const resetTimeOffForm = () => {
    setSelectedDate(undefined);
    setSelectedEndDate(undefined);
    setTimeOffType('full_day');
    setTimeOffStartTime('09:00');
    setTimeOffEndTime('17:00');
    setTimeOffReason('Personal');
    setTimeOffNotes('');
    setShowTimeOffForm(false);
    setEditingTimeOff(null);
  };

  const deleteTimeOffRequest = async (timeOffId: number) => {
    if (!barberId) return;

    if (isDemoMode) {
      // Demo mode - simulate deleting time off
      setTimeOffRequests(timeOffRequests.filter(to => to.id !== timeOffId));
      toast({
        title: 'Demo Mode',
        description: 'Time off request would be deleted (demo data)',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/barber-availability/time-off/${timeOffId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setTimeOffRequests(timeOffRequests.filter(to => to.id !== timeOffId));
        toast({
          title: 'Success',
          description: 'Time off request deleted',
        });
      } else {
        throw new Error('Failed to delete time off request');
      }
    } catch (error) {
      console.error('Error deleting time off:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete time off request',
        variant: 'destructive',
      });
    }
  };

  const updateRegularAvailability = async (dayIndex: number, updates: Partial<RegularAvailability>) => {
    if (!barberId || updatingAvailability === dayIndex) return;

    setUpdatingAvailability(dayIndex);
    const originalAvailability = [...regularAvailability];
    const updatedDay = { ...regularAvailability[dayIndex], ...updates };
    const newAvailability = [...regularAvailability];
    newAvailability[dayIndex] = updatedDay;
    
    // Optimistic update
    setRegularAvailability(newAvailability);

    if (isDemoMode) {
      // Demo mode - simulate updating availability
      setTimeout(() => {
        toast({
          title: 'Demo Mode',
          description: `${DAYS_OF_WEEK[dayIndex]} availability would be updated (demo data)`,
        });
        setUpdatingAvailability(null);
      }, 500);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      if (updatedDay.id) {
        // Update existing
        const response = await fetch(`${apiUrl}/barber-availability/availability/${updatedDay.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            start_time: updatedDay.start_time,
            end_time: updatedDay.end_time,
            is_active: updatedDay.is_active
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }
      } else if (updatedDay.is_active) {
        // Create new (only if active)
        const response = await fetch(`${apiUrl}/barber-availability/availability/${barberId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            day_of_week: updatedDay.day_of_week,
            start_time: updatedDay.start_time,
            end_time: updatedDay.end_time
          })
        });

        if (response.ok) {
          const created = await response.json();
          newAvailability[dayIndex] = { ...updatedDay, id: created.id };
          setRegularAvailability(newAvailability);
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }
      }
      
      toast({
        title: 'Success',
        description: `${DAYS_OF_WEEK[dayIndex]} availability updated`,
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      // Revert to original state on error
      setRegularAvailability(originalAvailability);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update availability',
        variant: 'destructive',
      });
    } finally {
      setUpdatingAvailability(null);
    }
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(parseISO(booking.start_time), date)
    );
  };

  const getAvailabilityForDate = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    return regularAvailability[dayOfWeek];
  };

  const isDateBlocked = (date: Date) => {
    return timeOffRequests.some(timeOff => {
      const startDate = parseISO(timeOff.start_date);
      const endDate = parseISO(timeOff.end_date);
      return date >= startDate && date <= endDate;
    });
  };

  const getTodaysSchedule = () => {
    const today = new Date();
    const todaysBookings = getBookingsForDate(today);
    const todaysAvailability = getAvailabilityForDate(today);
    const isBlocked = isDateBlocked(today);
    
    return {
      bookings: todaysBookings,
      availability: todaysAvailability,
      isBlocked
    };
  };

  const renderWeeklyCalendarView = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayBookings = getBookingsForDate(date);
      const dayAvailability = getAvailabilityForDate(date);
      const isBlocked = isDateBlocked(date);
      
      days.push(
        <div key={i} className="border rounded-lg p-3 min-h-[200px] hover:shadow-md transition-shadow bg-white">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">{format(date, &apos;EEE d&apos;)}</h3>
            <div className="text-xs">
              {isBlocked ? (
                <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                  <CalendarOff className="h-3 w-3 mr-1" />
                  Time Off
                </Badge>
              ) : dayAvailability?.is_active ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {dayAvailability.start_time} - {dayAvailability.end_time}
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
                  Unavailable
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            {dayBookings.map(booking => (
              <div key={booking.id} className="text-xs p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded border-l-4 border-blue-500 hover:shadow-sm transition-shadow">
                <div className="font-semibold text-blue-900">{format(parseISO(booking.start_time), &apos;HH:mm&apos;)}</div>
                <div className="text-blue-700 font-medium">{booking.service_name}</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1 text-blue-600">
                    <User className="h-3 w-3" />
                    <span className="truncate">{booking.client_name || &apos;Client&apos;}</span>
                  </div>
                  {booking.price && (
                    <div className="text-green-600 font-medium">
                      <DollarSign className="h-3 w-3 inline" />
                      {booking.price}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {dayBookings.length === 0 && dayAvailability?.is_active && !isBlocked && (
              <div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded border border-dashed border-gray-200 text-center">
                <CalendarCheck className="h-3 w-3 inline mr-1" />
                Available for bookings
              </div>
            )}
            {dayBookings.length === 0 && !dayAvailability?.is_active && !isBlocked && (
              <div className="text-xs text-gray-400 p-2 text-center">
                Not working today
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
        {days}
      </div>
    );
  };

  // Show loading during SSR or data loading
  if (!isClient || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const todaysSchedule = getTodaysSchedule();

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">My Schedule</h1>
            {isDemoMode && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Demo Mode
              </Badge>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {isDemoMode 
              ? 'Viewing demo schedule data - login to access your real schedule'
              : 'Manage your availability, working hours, and time off'
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
          >
            Previous Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(new Date())}
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
          >
            Next Week
          </Button>
          <div className="hidden sm:flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Quick action: Mark today as unavailable
                const today = new Date().getDay();
                const dayIndex = (today + 6) % 7; // Convert to Monday=0
                updateRegularAvailability(dayIndex, { is_active: false });
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <CalendarOff className="h-4 w-4 mr-1" />
              Block Today
            </Button>
          </div>
        </div>
      </div>

      {/* Help Card */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">How to Block Time Off</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Use the <strong>Time Off</strong> tab in the sidebar to block dates when you&apos;re unavailable</p>
                <p>• You can block single days, date ranges, or partial days (morning/afternoon)</p>
                <p>• Already blocked dates show in red on the calendar and can be deleted</p>
                <p>• Use <strong>Working Hours</strong> to set your regular weekly schedule</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar View */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Week of {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span>Your availability and scheduled appointments</span>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                    <span>Time Off</span>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderWeeklyCalendarView()}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 order-1 lg:order-2">
          {/* Today's Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaysSchedule.isBlocked ? (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                  <CalendarOff className="h-4 w-4 text-red-600" />
                  <span className="text-red-800 font-medium">Time off today</span>
                </div>
              ) : todaysSchedule.availability?.is_active ? (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 font-medium">{todaysSchedule.availability.start_time} - {todaysSchedule.availability.end_time}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <CalendarOff className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Not available today</span>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                {todaysSchedule.bookings.length} appointments scheduled
              </div>
              
              {todaysSchedule.bookings.length > 0 && (
                <div className="space-y-2">
                  {todaysSchedule.bookings.slice(0, 3).map(booking => (
                    <div key={booking.id} className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-blue-900">
                          {format(parseISO(booking.start_time), 'HH:mm')} - {booking.service_name}
                        </div>
                        {booking.price && (
                          <div className="text-green-600 font-medium">
                            ${booking.price}
                          </div>
                        )}
                      </div>
                      <div className="text-blue-600 mt-1">
                        {booking.client_name || 'Client'}
                      </div>
                    </div>
                  ))}
                  {todaysSchedule.bookings.length > 3 && (
                    <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded">
                      +{todaysSchedule.bookings.length - 3} more appointments...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Availability Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="hours" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="hours">Hours</TabsTrigger>
                  <TabsTrigger value="timeoff">Time Off</TabsTrigger>
                </TabsList>
                
                <TabsContent value="hours" className="space-y-3">
                  <div className="text-sm font-medium">Working Hours</div>
                  {regularAvailability.slice(0, 7).map((day, index) => (
                    <div key={index} className={`flex items-center justify-between ${updatingAvailability === index ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={day.is_active}
                          onCheckedChange={(checked) => updateRegularAvailability(index, { is_active: checked })}
                          className="scale-75"
                          disabled={updatingAvailability === index}
                        />
                        <Label className="text-xs">{DAYS_OF_WEEK[index].slice(0, 3)}</Label>
                        {updatingAvailability === index && (
                          <div className="animate-spin rounded-full h-2 w-2 border-b border-current"></div>
                        )}
                      </div>
                      {day.is_active && (
                        <div className="text-xs text-gray-500">
                          {day.start_time}-{day.end_time}
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="timeoff" className="space-y-4">
                  {/* Existing Time Off Requests */}
                  {timeOffRequests.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Current Time Off</div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {timeOffRequests.map((timeOff) => (
                          <div key={timeOff.id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                            <div className="flex-1">
                              <div className="text-xs font-medium text-red-800">
                                {timeOff.start_date === timeOff.end_date 
                                  ? format(parseISO(timeOff.start_date), 'MMM d')
                                  : `${format(parseISO(timeOff.start_date), 'MMM d')} - ${format(parseISO(timeOff.end_date), 'MMM d')}`
                                }
                                {timeOff.start_time && timeOff.end_time && (
                                  <span className="ml-1">({timeOff.start_time}-{timeOff.end_time})</span>
                                )}
                              </div>
                              <div className="text-xs text-red-600">{timeOff.reason}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                              onClick={() => deleteTimeOffRequest(timeOff.id!)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Time Off */}
                  {!showTimeOffForm ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowTimeOffForm(true)}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Block Time Off
                    </Button>
                  ) : (
                    <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Block Time Off</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={resetTimeOffForm}
                        >
                          ×
                        </Button>
                      </div>

                      {/* Date Selection */}
                      <div className="space-y-2">
                        <Label className="text-xs">Select Date(s)</Label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="rounded-md border scale-75 origin-top bg-white"
                          modifiers={{
                            blocked: timeOffRequests.map(to => parseISO(to.start_date))
                          }}
                          modifiersStyles={{
                            blocked: { backgroundColor: '#fee2e2', color: '#dc2626' }
                          }}
                        />
                      </div>

                      {/* Date Range Toggle */}
                      {selectedDate && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!!selectedEndDate}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEndDate(addDays(selectedDate, 1));
                                } else {
                                  setSelectedEndDate(undefined);
                                }
                              }}
                              className="scale-75"
                            />
                            <Label className="text-xs">Multiple days</Label>
                          </div>
                          
                          {selectedEndDate && (
                            <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded border">
                              Blocking: {format(selectedDate, 'MMM d')} - {format(selectedEndDate, 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Time Type Selection */}
                      <div className="space-y-2">
                        <Label className="text-xs">Block Type</Label>
                        <Select value={timeOffType} onValueChange={(value: 'full_day' | 'partial') => setTimeOffType(value)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_day">Full Day</SelectItem>
                            <SelectItem value="partial">Partial Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Partial Day Time Selection */}
                      {timeOffType === 'partial' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">From</Label>
                            <Input
                              type="time"
                              value={timeOffStartTime}
                              onChange={(e) => setTimeOffStartTime(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">To</Label>
                            <Input
                              type="time"
                              value={timeOffEndTime}
                              onChange={(e) => setTimeOffEndTime(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Reason Selection */}
                      <div className="space-y-2">
                        <Label className="text-xs">Reason</Label>
                        <Select value={timeOffReason} onValueChange={setTimeOffReason}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Personal">Personal</SelectItem>
                            <SelectItem value="Vacation">Vacation</SelectItem>
                            <SelectItem value="Sick">Sick Day</SelectItem>
                            <SelectItem value="Family">Family Emergency</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label className="text-xs">Notes (optional)</Label>
                        <Textarea
                          value={timeOffNotes}
                          onChange={(e) => setTimeOffNotes(e.target.value)}
                          placeholder="Add any additional notes..."
                          className="h-16 text-xs resize-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <Button 
                        size="sm" 
                        className="w-full"
                        disabled={!selectedDate || addingTimeOff}
                        onClick={addTimeOffRequest}
                      >
                        {addingTimeOff ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <CalendarOff className="mr-2 h-3 w-3" />
                            Block Time Off
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}