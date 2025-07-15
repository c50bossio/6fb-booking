'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from "@/components/ui/Label";
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/Badge';
import { 
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Users,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: number;
  service_name: string;
  start_time: string;
  duration_minutes: number;
  price: number;
  status: string;
  barber_name?: string;
  location_name?: string;
}

interface CancellationDetails {
  policy_id?: number;
  refund_type: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'NO_REFUND' | 'CREDIT_ONLY';
  refund_percentage: number;
  refund_amount: number;
  cancellation_fee: number;
  net_refund_amount: number;
  hours_before_appointment: number;
  policy_rule_applied: string;
  is_emergency_exception: boolean;
  is_first_time_client_grace: boolean;
  requires_manual_approval?: boolean;
}

interface AppointmentCancellationProps {
  appointment: Appointment;
  onCancel?: () => void;
  onClose?: () => void;
}

const AppointmentCancellation: React.FC<AppointmentCancellationProps> = ({
  appointment,
  onCancel,
  onClose
}) => {
  const [step, setStep] = useState<'preview' | 'confirm' | 'complete'>('preview');
  const [cancellationDetails, setCancellationDetails] = useState<CancellationDetails | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [reasonDetails, setReasonDetails] = useState<string>('');
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [joinWaitlist, setJoinWaitlist] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cancellationReasons = [
    { value: 'schedule_conflict', label: 'Schedule Conflict', description: 'Something else came up' },
    { value: 'illness', label: 'Illness', description: 'Not feeling well' },
    { value: 'weather', label: 'Weather', description: 'Weather conditions' },
    { value: 'emergency', label: 'Emergency', description: 'Unexpected emergency situation' },
    { value: 'other', label: 'Other', description: 'Please specify in details' }
  ];

  useEffect(() => {
    fetchCancellationPreview();
  }, [isEmergency]);

  const fetchCancellationPreview = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/cancellation/appointments/${appointment.id}/preview?is_emergency=${isEmergency}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch cancellation details');
      
      const details = await response.json();
      setCancellationDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cancellation details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedReason) {
      setError('Please select a cancellation reason');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/cancellation/appointments/${appointment.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          reason_details: reasonDetails,
          is_emergency: isEmergency || selectedReason === 'emergency'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel appointment');
      }

      // If user wants to join waitlist, add them
      if (joinWaitlist) {
        try {
          await fetch('/api/v1/cancellation/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_name: appointment.service_name,
              preferred_date: appointment.start_time,
              flexible_on_time: true,
              flexible_on_date: true,
              notify_via_email: true,
              notify_via_sms: true
            })
          });
        } catch {
          // Don't fail cancellation if waitlist fails
        }
      }

      setStep('complete');
      onCancel?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (percentage: number) => `${(percentage * 100).toFixed(0)}%`;

  const getRefundTypeColor = (type: string) => {
    switch (type) {
      case 'FULL_REFUND': return 'bg-green-100 text-green-800';
      case 'PARTIAL_REFUND': return 'bg-yellow-100 text-yellow-800';
      case 'NO_REFUND': return 'bg-red-100 text-red-800';
      case 'CREDIT_ONLY': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRefundTypeLabel = (type: string) => {
    switch (type) {
      case 'FULL_REFUND': return 'Full Refund';
      case 'PARTIAL_REFUND': return 'Partial Refund';
      case 'NO_REFUND': return 'No Refund';
      case 'CREDIT_ONLY': return 'Store Credit Only';
      default: return type;
    }
  };

  const appointmentDate = new Date(appointment.start_time);
  const hoursUntilAppointment = cancellationDetails?.hours_before_appointment || 0;

  if (step === 'complete') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Appointment Cancelled</h3>
          <p className="text-gray-600 mb-4">
            Your appointment has been successfully cancelled.
          </p>
          
          {cancellationDetails && cancellationDetails.net_refund_amount > 0 && (
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-semibold text-green-800">
                  {formatCurrency(cancellationDetails.net_refund_amount)} Refund
                </span>
              </div>
              <p className="text-sm text-green-700">
                {cancellationDetails.requires_manual_approval 
                  ? 'Your refund will be processed within 24 hours after manual review.'
                  : 'Your refund has been processed and will appear in your account within 3-5 business days.'
                }
              </p>
            </div>
          )}

          {joinWaitlist && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-semibold text-blue-800">Added to Waitlist</span>
              </div>
              <p className="text-sm text-blue-700">
                We'll notify you if a similar appointment becomes available.
              </p>
            </div>
          )}

          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Appointment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Cancel Appointment
          </CardTitle>
          <CardDescription>
            Review your appointment details and cancellation terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Service:</span>
              <span className="font-medium">{appointment.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time:</span>
              <span className="font-medium">
                {format(appointmentDate, 'MMMM d, yyyy \'at\' h:mm a')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{appointment.duration_minutes} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-medium">{formatCurrency(appointment.price)}</span>
            </div>
            {appointment.barber_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Barber:</span>
                <span className="font-medium">{appointment.barber_name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Preview */}
      {cancellationDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Cancellation Terms
            </CardTitle>
            <CardDescription>
              {hoursUntilAppointment.toFixed(1)} hours until your appointment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Refund Type</div>
                  <div className="text-sm text-gray-600">
                    Based on {cancellationDetails.policy_rule_applied.replace('_', ' ')} policy
                  </div>
                </div>
                <Badge className={getRefundTypeColor(cancellationDetails.refund_type)}>
                  {getRefundTypeLabel(cancellationDetails.refund_type)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPercentage(cancellationDetails.refund_percentage)}
                  </div>
                  <div className="text-sm text-gray-600">Refund Rate</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(cancellationDetails.net_refund_amount)}
                  </div>
                  <div className="text-sm text-gray-600">Net Refund</div>
                </div>
              </div>

              {cancellationDetails.cancellation_fee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span>Cancellation Fee:</span>
                  <span className="text-red-600">-{formatCurrency(cancellationDetails.cancellation_fee)}</span>
                </div>
              )}

              {cancellationDetails.is_emergency_exception && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Emergency exception applied - enhanced refund terms
                  </AlertDescription>
                </Alert>
              )}

              {cancellationDetails.is_first_time_client_grace && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    First-time client grace period applied
                  </AlertDescription>
                </Alert>
              )}

              {cancellationDetails.requires_manual_approval && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This refund requires manual approval and will be processed within 24 hours.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Reason</CardTitle>
            <CardDescription>
              Please let us know why you're cancelling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedReason} onChange={setSelectedReason}>
              {cancellationReasons.map((reason) => (
                <RadioGroupItem key={reason.value} value={reason.value}>
                  <div>
                    <div className="font-medium">{reason.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{reason.description}</div>
                  </div>
                </RadioGroupItem>
              ))}
            </RadioGroup>

            {selectedReason === 'emergency' && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                <Checkbox 
                  id="emergency" 
                  checked={isEmergency}
                  onCheckedChange={(checked) => setIsEmergency(checked === true)}
                />
                <Label htmlFor="emergency" className="text-sm">
                  This is a genuine emergency (may qualify for additional refund)
                </Label>
              </div>
            )}

            <div>
              <Label htmlFor="details">Additional Details (Optional)</Label>
              <Textarea
                id="details"
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                placeholder="Please provide any additional information..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <Checkbox 
                id="waitlist" 
                checked={joinWaitlist}
                onCheckedChange={(checked) => setJoinWaitlist(checked === true)}
              />
              <Label htmlFor="waitlist" className="text-sm">
                Add me to the waitlist for similar appointments
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Keep Appointment
        </Button>
        
        {step === 'preview' && (
          <Button 
            onClick={() => setStep('confirm')}
            disabled={!selectedReason || loading}
            variant="destructive"
          >
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Review Cancellation
          </Button>
        )}

        {step === 'confirm' && (
          <>
            <Button variant="outline" onClick={() => setStep('preview')}>
              Back
            </Button>
            <Button 
              onClick={handleCancelAppointment}
              disabled={loading}
              variant="destructive"
            >
              {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Cancellation
            </Button>
          </>
        )}
      </div>

      {step === 'confirm' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Please confirm:</strong> You are about to cancel your appointment on{' '}
            {format(appointmentDate, 'MMMM d, yyyy \'at\' h:mm a')}. 
            {cancellationDetails && cancellationDetails.net_refund_amount > 0 
              ? ` You will receive a refund of ${formatCurrency(cancellationDetails.net_refund_amount)}.`
              : ' No refund will be issued.'
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AppointmentCancellation;