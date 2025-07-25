/**
 * Appointments Widget Component
 * 
 * Displays appointment metrics, schedule overview, and booking insights
 */

'use client';

import React from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  startTime: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';
  revenue?: number;
  clientAvatar?: string;
}

interface AppointmentsData {
  appointments: Appointment[];
  stats: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
}

interface AppointmentsWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data: AppointmentsData;
  config: {
    view?: 'today' | 'upcoming' | 'history';
    limit?: number;
    showRevenue?: boolean;
  };
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function AppointmentsWidget({
  id,
  title,
  size,
  data,
  config,
  isLoading,
  error,
  className
}: AppointmentsWidgetProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      case 'pending': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const renderStats = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div className="text-center">
        <div className="text-lg font-semibold text-blue-600">{data.stats.confirmed}</div>
        <div className="text-xs text-gray-500">Confirmed</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-green-600">{data.stats.completed}</div>
        <div className="text-xs text-gray-500">Completed</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-red-600">{data.stats.cancelled}</div>
        <div className="text-xs text-gray-500">Cancelled</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">{data.stats.total}</div>
        <div className="text-xs text-gray-500">Total</div>
      </div>
    </div>
  );

  const renderAppointmentList = () => {
    const appointments = data.appointments.slice(0, config.limit || 5);

    if (appointments.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No appointments</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
            <Avatar className="w-8 h-8">
              <AvatarImage src={appointment.clientAvatar} />
              <AvatarFallback className="text-xs">
                {appointment.clientName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {appointment.clientName}
                </p>
                <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
                  {getStatusIcon(appointment.status)}
                  <span className="ml-1 capitalize">{appointment.status}</span>
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{appointment.serviceName}</span>
                <span>{format(new Date(appointment.startTime), 'h:mm a')}</span>
              </div>
              
              {config.showRevenue && appointment.revenue && (
                <div className="text-xs font-medium text-green-600">
                  ${appointment.revenue}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <BaseWidget
      id={id}
      title={title}
      size={size}
      isLoading={isLoading}
      error={error}
      className={className}
      showControls={true}
    >
      <div className="space-y-4">
        {size !== 'small' && renderStats()}
        {renderAppointmentList()}
      </div>
    </BaseWidget>
  );
}

export default AppointmentsWidget;