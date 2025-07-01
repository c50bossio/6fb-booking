'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { format, addDays } from 'date-fns';
import { Repeat, Calendar, Clock, Trash2, Play, Pause } from 'lucide-react';

interface RecurringPattern {
  id: number;
  pattern_type: string;
  preferred_time: string;
  duration_minutes: number;
  start_date: string;
  end_date?: string;
  occurrences?: number;
  days_of_week?: number[];
  day_of_month?: number;
  week_of_month?: number;
  is_active: boolean;
  service_name?: string;
  barber_id?: number;
  created_at: string;
}

interface UpcomingAppointment {
  appointment_id?: number;
  pattern_id: number;
  date: string;
  time: string;
  duration_minutes: number;
  status: string;
  pattern_type: string;
}

const PATTERN_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const SERVICES = [
  { value: 'Haircut', label: 'Haircut' },
  { value: 'Shave', label: 'Shave' },
  { value: 'Haircut & Shave', label: 'Haircut & Shave' }
];

export default function RecurringAppointmentsPage() {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  // const { toast } = useToast(); // TODO: Implement toast system

  // Form state
  const [newPattern, setNewPattern] = useState({
    pattern_type: 'weekly',
    preferred_time: '14:00',
    duration_minutes: 30,
    start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    occurrences: 4,
    days_of_week: [1], // Default to Tuesday
    service_name: 'Haircut'
  });

  useEffect(() => {
    fetchPatterns();
    fetchUpcomingAppointments();
  }, []);

  const fetchPatterns = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(`${apiUrl}/api/v1/recurring-appointments/patterns`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPatterns(data);
      } else {
        throw new Error('Failed to fetch patterns');
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
      console.log({
        title: 'Error',
        description: 'Failed to load recurring patterns',
        variant: 'destructive',
      });
    }
  };

  const fetchUpcomingAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(`${apiUrl}/api/v1/recurring-appointments/upcoming?days_ahead=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUpcomingAppointments(data.upcoming_appointments);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
      setLoading(false);
    }
  };

  const createPattern = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(`${apiUrl}/api/v1/recurring-appointments/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPattern)
      });

      if (response.ok) {
        const pattern = await response.json();
        setPatterns([pattern, ...patterns]);
        
        // Reset form
        setNewPattern({
          pattern_type: 'weekly',
          preferred_time: '14:00',
          duration_minutes: 30,
          start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          occurrences: 4,
          days_of_week: [1],
          service_name: 'Haircut'
        });

        console.log({
          title: 'Success',
          description: 'Recurring pattern created successfully',
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create pattern');
      }
    } catch (error) {
      console.error('Error creating pattern:', error);
      console.log({
        title: 'Error',
        description: 'Failed to create recurring pattern',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const generateAppointments = async (patternId: number) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/patterns/${patternId}/generate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log({
          title: 'Success',
          description: `Generated ${result.total_generated} appointments`,
        });
        fetchUpcomingAppointments();
      } else {
        throw new Error('Failed to generate appointments');
      }
    } catch (error) {
      console.error('Error generating appointments:', error);
      console.log({
        title: 'Error',
        description: 'Failed to generate appointments',
        variant: 'destructive',
      });
    }
  };

  const deletePattern = async (patternId: number) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      const response = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/patterns/${patternId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.ok) {
        setPatterns(patterns.filter(p => p.id !== patternId));
        console.log({
          title: 'Success',
          description: 'Recurring pattern deleted',
        });
      } else {
        throw new Error('Failed to delete pattern');
      }
    } catch (error) {
      console.error('Error deleting pattern:', error);
      console.log({
        title: 'Error',
        description: 'Failed to delete pattern',
        variant: 'destructive',
      });
    }
  };

  const formatDaysOfWeek = (days: number[]) => {
    return days.map(day => DAYS_OF_WEEK[day]).join(', ');
  };

  const getPatternDescription = (pattern: RecurringPattern) => {
    let desc = `${pattern.pattern_type} on `;
    
    if (pattern.days_of_week) {
      desc += formatDaysOfWeek(pattern.days_of_week);
    }
    
    if (pattern.day_of_month) {
      desc += `day ${pattern.day_of_month} of each month`;
    }
    
    desc += ` at ${pattern.preferred_time}`;
    
    if (pattern.occurrences) {
      desc += ` (${pattern.occurrences} times)`;
    }
    
    return desc;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Recurring Appointments</h1>

      <Tabs defaultValue="patterns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patterns">My Patterns</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns">
          <div className="grid gap-4">
            {patterns.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <Repeat className="mx-auto h-12 w-12 mb-4" />
                    <p>No recurring patterns yet. Create one to get started!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              patterns.map((pattern) => (
                <Card key={pattern.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Repeat className="h-5 w-5" />
                          {pattern.service_name || 'Recurring Appointment'}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            pattern.is_active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {pattern.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </CardTitle>
                        <CardDescription>
                          {getPatternDescription(pattern)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => generateAppointments(pattern.id)}
                          disabled={!pattern.is_active}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePattern(pattern.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-500">Duration</Label>
                        <p>{pattern.duration_minutes} minutes</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Start Date</Label>
                        <p>{format(new Date(pattern.start_date), 'MMM d, yyyy')}</p>
                      </div>
                      {pattern.end_date && (
                        <div>
                          <Label className="text-gray-500">End Date</Label>
                          <p>{format(new Date(pattern.end_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-gray-500">Created</Label>
                        <p>{format(new Date(pattern.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Recurring Pattern</CardTitle>
              <CardDescription>Set up a recurring appointment schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pattern_type">Pattern Type</Label>
                  <Select
                    value={newPattern.pattern_type}
                    onChange={(value) => setNewPattern({...newPattern, pattern_type: value as string})}
                    options={PATTERN_TYPES}
                  />
                </div>

                <div>
                  <Label htmlFor="service_name">Service</Label>
                  <Select
                    value={newPattern.service_name}
                    onChange={(value) => setNewPattern({...newPattern, service_name: value as string})}
                    options={SERVICES}
                  />
                </div>

                <div>
                  <Label htmlFor="preferred_time">Time</Label>
                  <Input
                    id="preferred_time"
                    type="time"
                    value={newPattern.preferred_time}
                    onChange={(e) => setNewPattern({...newPattern, preferred_time: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="15"
                    max="240"
                    step="15"
                    value={newPattern.duration_minutes}
                    onChange={(e) => setNewPattern({...newPattern, duration_minutes: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newPattern.start_date}
                    onChange={(e) => setNewPattern({...newPattern, start_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="occurrences">Number of Occurrences</Label>
                  <Input
                    id="occurrences"
                    type="number"
                    min="1"
                    max="52"
                    value={newPattern.occurrences}
                    onChange={(e) => setNewPattern({...newPattern, occurrences: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              {(newPattern.pattern_type === 'weekly' || newPattern.pattern_type === 'biweekly') && (
                <div>
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS_OF_WEEK.map((day, index) => (
                      <Label key={day} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPattern.days_of_week.includes(index)}
                          onChange={(e) => {
                            const days = [...newPattern.days_of_week];
                            if (e.target.checked) {
                              days.push(index);
                            } else {
                              const idx = days.indexOf(index);
                              if (idx > -1) days.splice(idx, 1);
                            }
                            setNewPattern({...newPattern, days_of_week: days});
                          }}
                        />
                        <span className="text-sm">{day}</span>
                      </Label>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={createPattern} 
                disabled={creating}
                className="w-full"
              >
                {creating ? 'Creating...' : 'Create Recurring Pattern'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <div className="grid gap-4">
            {upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <Calendar className="mx-auto h-12 w-12 mb-4" />
                    <p>No upcoming recurring appointments</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              upcomingAppointments.map((appointment, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">
                            {format(new Date(appointment.date), 'EEEE, MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.time} ({appointment.duration_minutes} min) • {appointment.pattern_type}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        appointment.status === 'scheduled' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : appointment.status === 'pending_creation'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {appointment.status === 'pending_creation' ? 'Pending' : appointment.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}