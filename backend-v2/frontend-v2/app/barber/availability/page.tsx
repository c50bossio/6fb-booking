'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Clock, CalendarOff, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';

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

export default function BarberAvailabilityPage() {
  const [regularAvailability, setRegularAvailability] = useState<RegularAvailability[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOff[]>([]);
  const [specialAvailability, setSpecialAvailability] = useState<SpecialAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  // const { toast } = useToast(); // TODO: Implement toast system

  // Get current user (barber) info
  const [barberId, setBarberId] = useState<number | null>(null);

  useEffect(() => {
    // Get current user info from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      setBarberId(user.id);
      fetchAvailabilityData(user.id);
    } else {
      console.log({
        title: 'Error',
        description: 'User information not found',
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, []);

  const fetchAvailabilityData = async (barberId: number) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // Fetch regular availability
      const regularResponse = await fetch(`${apiUrl}/barber-availability/availability/${barberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (regularResponse.ok) {
        const data = await regularResponse.json();
        // Initialize all days of week with existing data or defaults
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

      setLoading(false);
    } catch (error) {
      console.error('Error fetching availability data:', error);
      console.log({
        title: 'Error',
        description: 'Failed to load availability data',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const updateRegularAvailability = async (dayIndex: number, updates: Partial<RegularAvailability>) => {
    if (!barberId) return;

    const updatedDay = { ...regularAvailability[dayIndex], ...updates };
    const newAvailability = [...regularAvailability];
    newAvailability[dayIndex] = updatedDay;
    setRegularAvailability(newAvailability);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      if (updatedDay.id) {
        // Update existing
        await fetch(`${apiUrl}/barber-availability/availability/${updatedDay.id}`, {
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
        }
      }

      console.log({
        title: 'Success',
        description: 'Availability updated successfully',
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      console.log({
        title: 'Error',
        description: 'Failed to update availability',
        variant: 'destructive',
      });
      // Revert changes
      fetchAvailabilityData(barberId);
    }
  };

  const addTimeOffRequest = async () => {
    if (!barberId || !selectedDate) return;

    const newTimeOff: TimeOff = {
      start_date: format(selectedDate, 'yyyy-MM-dd'),
      end_date: format(selectedDate, 'yyyy-MM-dd'),
      reason: 'Personal',
      notes: ''
    };

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

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
        console.log({
          title: 'Success',
          description: 'Time off request created',
        });
      }
    } catch (error) {
      console.error('Error creating time off:', error);
      console.log({
        title: 'Error',
        description: 'Failed to create time off request',
        variant: 'destructive',
      });
    }
  };

  const addSpecialAvailability = async () => {
    if (!barberId || !selectedDate) return;

    const newSpecial: SpecialAvailability = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '17:00',
      availability_type: 'additional',
      notes: ''
    };

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(`${apiUrl}/barber-availability/special/${barberId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newSpecial)
      });

      if (response.ok) {
        const created = await response.json();
        setSpecialAvailability([...specialAvailability, created]);
        console.log({
          title: 'Success',
          description: 'Special availability created',
        });
      }
    } catch (error) {
      console.error('Error creating special availability:', error);
      console.log({
        title: 'Error',
        description: 'Failed to create special availability',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Manage Your Availability</h1>

      <Tabs defaultValue="regular" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="regular">Regular Schedule</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="special">Special Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="regular">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>Set your regular working hours for each day of the week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {regularAvailability.map((day, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Switch
                    checked={day.is_active}
                    onCheckedChange={(checked: boolean) => updateRegularAvailability(index, { is_active: checked })}
                  />
                  <Label className="w-24">{DAYS_OF_WEEK[index]}</Label>
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                      type="time"
                      value={day.start_time}
                      onChange={(e) => updateRegularAvailability(index, { start_time: e.target.value })}
                      disabled={!day.is_active}
                      className="w-32 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <span className="text-gray-900 dark:text-white">to</span>
                    <Input
                      type="time"
                      value={day.end_time}
                      onChange={(e) => updateRegularAvailability(index, { end_time: e.target.value })}
                      disabled={!day.is_active}
                      className="w-32 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeoff">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Time Off</CardTitle>
                <CardDescription>Block out dates when you won't be available</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
                <Button 
                  onClick={addTimeOffRequest} 
                  disabled={!selectedDate}
                  className="w-full"
                >
                  <CalendarOff className="mr-2 h-4 w-4" />
                  Add Time Off
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Time Off</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeOffRequests.length === 0 ? (
                    <p className="text-sm text-gray-500">No time off scheduled</p>
                  ) : (
                    timeOffRequests.map((timeOff, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">
                            {format(new Date(timeOff.start_date), 'MMM d, yyyy')}
                            {timeOff.end_date !== timeOff.start_date && 
                              ` - ${format(new Date(timeOff.end_date), 'MMM d, yyyy')}`
                            }
                          </p>
                          {timeOff.reason && <p className="text-sm text-gray-500">{timeOff.reason}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="special">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Special Availability</CardTitle>
                <CardDescription>Add extra working hours for specific dates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
                <Button 
                  onClick={addSpecialAvailability} 
                  disabled={!selectedDate}
                  className="w-full"
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Add Special Hours
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Special Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {specialAvailability.length === 0 ? (
                    <p className="text-sm text-gray-500">No special availability scheduled</p>
                  ) : (
                    specialAvailability.map((special, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">
                            {format(new Date(special.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {special.start_time} - {special.end_time}
                          </p>
                          {special.notes && <p className="text-sm text-gray-500">{special.notes}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}