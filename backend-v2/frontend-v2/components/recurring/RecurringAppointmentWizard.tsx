'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  Repeat,
  Settings
} from 'lucide-react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
}

interface RecurringPatternData {
  pattern_type: string;
  preferred_time: string;
  duration_minutes: number;
  start_date: string;
  end_date?: string;
  occurrences?: number;
  days_of_week?: number[];
  day_of_month?: number;
  week_of_month?: number;
  weekday_of_month?: number;
  barber_id?: number;
  service_id?: number;
  location_id?: number;
  
  // Advanced options
  exclude_holidays: boolean;
  exclude_weekends: boolean;
  reschedule_on_conflict: boolean;
  max_advance_days: number;
  buffer_time_before: number;
  buffer_time_after: number;
  
  // Series options
  series_name?: string;
  series_description?: string;
  payment_type: string;
  series_discount_percent?: number;
  series_price_override?: number;
}

interface Conflict {
  type: string;
  date: string;
  time: string;
  details: any;
  suggested_resolution?: string;
}

interface PreviewAppointment {
  date: string;
  time: string;
  duration_minutes: number;
  conflicts?: Conflict[];
  status: string;
}

const PATTERN_TYPES = [
  { value: 'weekly', label: 'Weekly', description: 'Repeat every week on selected days' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Repeat every two weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Repeat monthly on a specific date or weekday' },
  { value: 'custom', label: 'Custom', description: 'Custom interval pattern' }
];

const PAYMENT_TYPES = [
  { value: 'per_appointment', label: 'Pay Per Appointment', description: 'Payment collected for each appointment' },
  { value: 'series_upfront', label: 'Pay Upfront for Series', description: 'Single payment for entire series' },
  { value: 'subscription', label: 'Subscription', description: 'Recurring subscription billing' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday', short: 'M' },
  { value: 1, label: 'Tuesday', short: 'T' },
  { value: 2, label: 'Wednesday', short: 'W' },
  { value: 3, label: 'Thursday', short: 'T' },
  { value: 4, label: 'Friday', short: 'F' },
  { value: 5, label: 'Saturday', short: 'S' },
  { value: 6, label: 'Sunday', short: 'S' }
];

interface RecurringAppointmentWizardProps {
  onComplete?: (patternData: RecurringPatternData) => void;
  onCancel?: () => void;
  initialData?: Partial<RecurringPatternData>;
}

export default function RecurringAppointmentWizard({
  onComplete,
  onCancel,
  initialData
}: RecurringAppointmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [patternData, setPatternData] = useState<RecurringPatternData>({
    pattern_type: 'weekly',
    preferred_time: '14:00',
    duration_minutes: 30,
    start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    days_of_week: [1], // Default to Tuesday
    exclude_holidays: false,
    exclude_weekends: false,
    reschedule_on_conflict: true,
    max_advance_days: 90,
    buffer_time_before: 0,
    buffer_time_after: 0,
    payment_type: 'per_appointment',
    ...initialData
  });
  
  const [previewAppointments, setPreviewAppointments] = useState<PreviewAppointment[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps: WizardStep[] = [
    {
      id: 'basic',
      title: 'Basic Pattern',
      description: 'Define when and how often appointments repeat',
      isComplete: Boolean(patternData.pattern_type && patternData.preferred_time)
    },
    {
      id: 'schedule',
      title: 'Schedule Details',
      description: 'Set specific days, dates, and duration',
      isComplete: Boolean(patternData.duration_minutes && 
        (patternData.days_of_week?.length || patternData.day_of_month))
    },
    {
      id: 'advanced',
      title: 'Advanced Options',
      description: 'Configure holidays, conflicts, and buffers',
      isComplete: true // Always complete as these are optional
    },
    {
      id: 'payment',
      title: 'Payment & Series',
      description: 'Set pricing and series options',
      isComplete: Boolean(patternData.payment_type)
    },
    {
      id: 'preview',
      title: 'Preview & Confirm',
      description: 'Review appointments and resolve conflicts',
      isComplete: Boolean(previewAppointments.length > 0)
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    if (currentStep === steps.length - 1) {
      generatePreview();
    }
  }, [currentStep, patternData]);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

      // First create the pattern (preview mode)
      const patternResponse = await fetch(`${apiUrl}/api/v1/recurring-appointments/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(patternData)
      });

      if (!patternResponse.ok) {
        throw new Error('Failed to create pattern');
      }

      const pattern = await patternResponse.json();

      // Generate preview appointments
      const previewResponse = await fetch(
        `${apiUrl}/api/v1/recurring-appointments/patterns/${pattern.id}/generate-enhanced?preview_only=true&max_appointments=20`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!previewResponse.ok) {
        throw new Error('Failed to generate preview');
      }

      const result = await previewResponse.json();
      
      setPreviewAppointments(result.successful_appointments.map((apt: any) => ({
        date: new Date(apt.start_time).toISOString().split('T')[0],
        time: new Date(apt.start_time).toTimeString().split(' ')[0].slice(0, 5),
        duration_minutes: apt.duration_minutes,
        status: apt.status || 'pending'
      })));
      
      setConflicts(result.conflicts || []);

      // Clean up the temporary pattern
      await fetch(`${apiUrl}/api/v1/recurring-appointments/patterns/${pattern.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

    } catch (error) {
      console.error('Error generating preview:', error);
      setErrors({ preview: 'Failed to generate preview' });
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!patternData.pattern_type) {
        newErrors.pattern_type = 'Pattern type is required';
      }
      if (!patternData.preferred_time) {
        newErrors.preferred_time = 'Preferred time is required';
      }
    }

    if (currentStep === 1) {
      if (!patternData.duration_minutes || patternData.duration_minutes < 15) {
        newErrors.duration_minutes = 'Duration must be at least 15 minutes';
      }
      
      if (patternData.pattern_type === 'weekly' || patternData.pattern_type === 'biweekly') {
        if (!patternData.days_of_week?.length) {
          newErrors.days_of_week = 'Select at least one day of the week';
        }
      }
      
      if (patternData.pattern_type === 'monthly') {
        if (!patternData.day_of_month && !patternData.week_of_month) {
          newErrors.monthly = 'Select either a specific date or week pattern';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(patternData);
    }
  };

  const updatePatternData = (updates: Partial<RecurringPatternData>) => {
    setPatternData(prev => ({ ...prev, ...updates }));
    setErrors({});
  };

  const renderBasicPatternStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="pattern_type">Recurrence Pattern</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {PATTERN_TYPES.map((type) => (
            <Card 
              key={type.value}
              className={`cursor-pointer transition-colors ${
                patternData.pattern_type === type.value 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => updatePatternData({ pattern_type: type.value })}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem 
                    value={type.value} 
                    checked={patternData.pattern_type === type.value}
                  />
                  <div>
                    <h4 className="font-medium">{type.label}</h4>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {errors.pattern_type && (
          <p className="text-sm text-red-600 mt-1">{errors.pattern_type}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="preferred_time">Preferred Time</Label>
          <Input
            id="preferred_time"
            type="time"
            value={patternData.preferred_time}
            onChange={(e) => updatePatternData({ preferred_time: e.target.value })}
            className={errors.preferred_time ? 'border-red-500' : ''}
          />
          {errors.preferred_time && (
            <p className="text-sm text-red-600 mt-1">{errors.preferred_time}</p>
          )}
        </div>

        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={patternData.start_date}
            onChange={(e) => updatePatternData({ start_date: e.target.value })}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
      </div>

      <div>
        <Label>End Condition</Label>
        <RadioGroup
          value={patternData.end_date ? 'end_date' : 'occurrences'}
          onValueChange={(value) => {
            if (value === 'end_date') {
              updatePatternData({ 
                end_date: format(addMonths(new Date(patternData.start_date), 3), 'yyyy-MM-dd'),
                occurrences: undefined 
              });
            } else {
              updatePatternData({ 
                end_date: undefined,
                occurrences: 10 
              });
            }
          }}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="occurrences" id="occurrences" />
            <Label htmlFor="occurrences" className="flex-1">
              Number of appointments
            </Label>
            <Input
              type="number"
              min="1"
              max="52"
              value={patternData.occurrences || ''}
              onChange={(e) => updatePatternData({ occurrences: parseInt(e.target.value) })}
              className="w-20"
              disabled={!!patternData.end_date}
            />
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="end_date" id="end_date" />
            <Label htmlFor="end_date" className="flex-1">
              End date
            </Label>
            <Input
              type="date"
              value={patternData.end_date || ''}
              onChange={(e) => updatePatternData({ end_date: e.target.value })}
              className="w-40"
              disabled={!!patternData.occurrences}
              min={patternData.start_date}
            />
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderScheduleDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="duration_minutes">Appointment Duration (minutes)</Label>
        <Input
          id="duration_minutes"
          type="number"
          min="15"
          max="480"
          step="15"
          value={patternData.duration_minutes}
          onChange={(e) => updatePatternData({ duration_minutes: parseInt(e.target.value) })}
          className={errors.duration_minutes ? 'border-red-500' : ''}
        />
        {errors.duration_minutes && (
          <p className="text-sm text-red-600 mt-1">{errors.duration_minutes}</p>
        )}
      </div>

      {(patternData.pattern_type === 'weekly' || patternData.pattern_type === 'biweekly') && (
        <div>
          <Label>Days of Week</Label>
          <div className="grid grid-cols-7 gap-2 mt-2">
            {DAYS_OF_WEEK.map((day) => (
              <Button
                key={day.value}
                type="button"
                variant={patternData.days_of_week?.includes(day.value) ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  const currentDays = patternData.days_of_week || [];
                  const newDays = currentDays.includes(day.value)
                    ? currentDays.filter(d => d !== day.value)
                    : [...currentDays, day.value];
                  updatePatternData({ days_of_week: newDays });
                }}
                className="h-10 w-10 p-0"
              >
                {day.short}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {DAYS_OF_WEEK.filter(day => patternData.days_of_week?.includes(day.value))
              .map(day => (
                <span key={day.value} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {day.label}
                </span>
              ))}
          </div>
          {errors.days_of_week && (
            <p className="text-sm text-red-600 mt-1">{errors.days_of_week}</p>
          )}
        </div>
      )}

      {patternData.pattern_type === 'monthly' && (
        <div>
          <Label>Monthly Pattern</Label>
          <RadioGroup
            value={patternData.day_of_month ? 'day_of_month' : 'week_of_month'}
            onValueChange={(value) => {
              if (value === 'day_of_month') {
                updatePatternData({ 
                  day_of_month: 1, 
                  week_of_month: undefined,
                  weekday_of_month: undefined 
                });
              } else {
                updatePatternData({ 
                  day_of_month: undefined,
                  week_of_month: 1,
                  weekday_of_month: 1 
                });
              }
            }}
            className="mt-2 space-y-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="day_of_month" id="day_of_month_option" />
              <Label htmlFor="day_of_month_option">
                On day
              </Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={patternData.day_of_month || ''}
                onChange={(e) => updatePatternData({ day_of_month: parseInt(e.target.value) })}
                className="w-20"
                disabled={!!patternData.week_of_month}
              />
              <span className="text-sm text-gray-500">of each month</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="week_of_month" id="week_of_month_option" />
              <Label htmlFor="week_of_month_option">
                On the
              </Label>
              <Select
                value={patternData.week_of_month?.toString() || ''}
                onChange={(value) => updatePatternData({ week_of_month: parseInt(value as string) })}
                disabled={!!patternData.day_of_month}
                options={[
                  { value: '1', label: '1st' },
                  { value: '2', label: '2nd' },
                  { value: '3', label: '3rd' },
                  { value: '4', label: '4th' }
                ]}
              />
              <Select
                value={patternData.weekday_of_month?.toString() || ''}
                onChange={(value) => updatePatternData({ weekday_of_month: parseInt(value as string) })}
                disabled={!!patternData.day_of_month}
                options={DAYS_OF_WEEK.map(day => ({
                  value: day.value,
                  label: day.label
                }))}
              />
              <span className="text-sm text-gray-500">of each month</span>
            </div>
          </RadioGroup>
          {errors.monthly && (
            <p className="text-sm text-red-600 mt-1">{errors.monthly}</p>
          )}
        </div>
      )}
    </div>
  );

  const renderAdvancedOptionsStep = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Exclusion Rules</Label>
        <div className="space-y-3 mt-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude_holidays"
              checked={patternData.exclude_holidays}
              onCheckedChange={(checked) => 
                updatePatternData({ exclude_holidays: checked as boolean })
              }
            />
            <Label htmlFor="exclude_holidays" className="text-sm">
              Skip national holidays
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude_weekends"
              checked={patternData.exclude_weekends}
              onCheckedChange={(checked) => 
                updatePatternData({ exclude_weekends: checked as boolean })
              }
            />
            <Label htmlFor="exclude_weekends" className="text-sm">
              Skip weekends
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reschedule_on_conflict"
              checked={patternData.reschedule_on_conflict}
              onCheckedChange={(checked) => 
                updatePatternData({ reschedule_on_conflict: checked as boolean })
              }
            />
            <Label htmlFor="reschedule_on_conflict" className="text-sm">
              Automatically reschedule conflicts
            </Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="max_advance_days">Maximum days in advance</Label>
          <Input
            id="max_advance_days"
            type="number"
            min="1"
            max="365"
            value={patternData.max_advance_days}
            onChange={(e) => updatePatternData({ max_advance_days: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor="buffer_before">Buffer before (minutes)</Label>
          <Input
            id="buffer_before"
            type="number"
            min="0"
            max="60"
            step="5"
            value={patternData.buffer_time_before}
            onChange={(e) => updatePatternData({ buffer_time_before: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor="buffer_after">Buffer after (minutes)</Label>
          <Input
            id="buffer_after"
            type="number"
            min="0"
            max="60"
            step="5"
            value={patternData.buffer_time_after}
            onChange={(e) => updatePatternData({ buffer_time_after: parseInt(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div>
        <Label>Payment Type</Label>
        <div className="grid grid-cols-1 gap-4 mt-2">
          {PAYMENT_TYPES.map((type) => (
            <Card 
              key={type.value}
              className={`cursor-pointer transition-colors ${
                patternData.payment_type === type.value 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => updatePatternData({ payment_type: type.value })}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem 
                    value={type.value} 
                    checked={patternData.payment_type === type.value}
                  />
                  <div>
                    <h4 className="font-medium">{type.label}</h4>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="series_name">Series Name (Optional)</Label>
          <Input
            id="series_name"
            value={patternData.series_name || ''}
            onChange={(e) => updatePatternData({ series_name: e.target.value })}
            placeholder="e.g., Monthly Maintenance Cut"
          />
        </div>

        <div>
          <Label htmlFor="series_discount">Series Discount (%)</Label>
          <Input
            id="series_discount"
            type="number"
            min="0"
            max="50"
            step="5"
            value={patternData.series_discount_percent || ''}
            onChange={(e) => updatePatternData({ 
              series_discount_percent: e.target.value ? parseFloat(e.target.value) : undefined 
            })}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="series_description">Series Description (Optional)</Label>
        <Textarea
          id="series_description"
          value={patternData.series_description || ''}
          onChange={(e) => updatePatternData({ series_description: e.target.value })}
          placeholder="Describe this recurring appointment series..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Generating preview...</p>
        </div>
      ) : (
        <>
          {conflicts.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {conflicts.length} conflicts detected. Review the appointments below.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="text-lg font-medium mb-4">Preview Appointments</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {previewAppointments.map((appointment, index) => (
                <Card key={index} className={appointment.status === 'conflict' ? 'border-red-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">
                            {format(new Date(appointment.date), 'EEEE, MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.time} ({appointment.duration_minutes} min)
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        appointment.status === 'conflict' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {appointment.status === 'conflict' ? 'Conflict' : 'Available'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Appointments</p>
                <p className="font-medium">{previewAppointments.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Conflicts</p>
                <p className="font-medium text-red-600">{conflicts.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Pattern Type</p>
                <p className="font-medium capitalize">{patternData.pattern_type}</p>
              </div>
              <div>
                <p className="text-gray-500">Payment</p>
                <p className="font-medium">{PAYMENT_TYPES.find(t => t.value === patternData.payment_type)?.label}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderBasicPatternStep();
      case 1:
        return renderScheduleDetailsStep();
      case 2:
        return renderAdvancedOptionsStep();
      case 3:
        return renderPaymentStep();
      case 4:
        return renderPreviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Create Recurring Appointments
              </CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              {steps.map((step, index) => (
                <span 
                  key={step.id}
                  className={index <= currentStep ? 'text-blue-600 font-medium' : ''}
                >
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="min-h-[400px]">
            {renderCurrentStep()}
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleComplete}
                disabled={loading || (conflicts.length > 0 && !patternData.reschedule_on_conflict)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Create Recurring Pattern
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}