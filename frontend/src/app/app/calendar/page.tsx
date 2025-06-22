'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User, DollarSign, Calendar as CalendarIcon, Filter, X, Check, AlertCircle } from 'lucide-react';

// Types
type ViewType = 'month' | 'week' | 'day';
type AppointmentStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  color: string;
}

interface Barber {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface Appointment {
  id: string;
  barberId: string;
  clientId: string;
  serviceId: string;
  date: Date;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// Demo Data
const services: Service[] = [
  { id: '1', name: 'Haircut', duration: 30, price: 35, color: 'bg-blue-500' },
  { id: '2', name: 'Beard Trim', duration: 20, price: 25, color: 'bg-green-500' },
  { id: '3', name: 'Hair Color', duration: 90, price: 85, color: 'bg-purple-500' },
  { id: '4', name: 'Hot Towel Shave', duration: 45, price: 45, color: 'bg-red-500' },
  { id: '5', name: 'Hair & Beard Combo', duration: 50, price: 55, color: 'bg-yellow-500' },
];

const barbers: Barber[] = [
  { id: '1', name: 'Marcus Johnson', avatar: '👨🏾‍🦱', color: 'border-blue-500' },
  { id: '2', name: 'Tony Rodriguez', avatar: '👨🏽‍🦱', color: 'border-green-500' },
  { id: '3', name: 'James Williams', avatar: '👨🏿‍🦱', color: 'border-purple-500' },
  { id: '4', name: 'David Chen', avatar: '👨🏻‍🦱', color: 'border-red-500' },
];

const clients: Client[] = [
  { id: '1', name: 'John Davis', phone: '555-0101', email: 'john@example.com' },
  { id: '2', name: 'Michael Brown', phone: '555-0102', email: 'michael@example.com' },
  { id: '3', name: 'Robert Wilson', phone: '555-0103', email: 'robert@example.com' },
  { id: '4', name: 'William Garcia', phone: '555-0104', email: 'william@example.com' },
  { id: '5', name: 'James Anderson', phone: '555-0105', email: 'james@example.com' },
  { id: '6', name: 'Charles Thomas', phone: '555-0106', email: 'charles@example.com' },
  { id: '7', name: 'Christopher Lee', phone: '555-0107', email: 'chris@example.com' },
  { id: '8', name: 'Daniel Martinez', phone: '555-0108', email: 'daniel@example.com' },
];

// Generate demo appointments
const generateDemoAppointments = (): Appointment[] => {
  const appointments: Appointment[] = [];
  const today = new Date();
  const statuses: AppointmentStatus[] = ['confirmed', 'pending', 'completed', 'cancelled'];
  
  // Generate appointments for the past 7 days and next 14 days
  for (let dayOffset = -7; dayOffset <= 14; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    
    // Skip Sundays
    if (date.getDay() === 0) continue;
    
    // Generate 8-12 appointments per day
    const appointmentsPerDay = Math.floor(Math.random() * 5) + 8;
    
    for (let i = 0; i < appointmentsPerDay; i++) {
      const barberId = barbers[Math.floor(Math.random() * barbers.length)].id;
      const clientId = clients[Math.floor(Math.random() * clients.length)].id;
      const serviceId = services[Math.floor(Math.random() * services.length)].id;
      const service = services.find(s => s.id === serviceId)!;
      
      // Random time between 9 AM and 7 PM
      const hour = Math.floor(Math.random() * 10) + 9;
      const minute = Math.random() < 0.5 ? 0 : 30;
      
      const appointmentDate = new Date(date);
      appointmentDate.setHours(hour, minute, 0, 0);
      
      // Past appointments are mostly completed, future are confirmed/pending
      let status: AppointmentStatus;
      if (dayOffset < 0) {
        status = Math.random() < 0.8 ? 'completed' : 'cancelled';
      } else if (dayOffset === 0) {
        const currentHour = new Date().getHours();
        if (hour < currentHour) {
          status = 'completed';
        } else {
          status = Math.random() < 0.9 ? 'confirmed' : 'pending';
        }
      } else {
        status = Math.random() < 0.8 ? 'confirmed' : 'pending';
      }
      
      appointments.push({
        id: `apt-${Date.now()}-${i}-${dayOffset}`,
        barberId,
        clientId,
        serviceId,
        date: appointmentDate,
        duration: service.duration,
        status,
        notes: Math.random() < 0.3 ? 'Regular client, prefers short on sides' : undefined,
      });
    }
  }
  
  return appointments;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string>('all');
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  
  // Initialize demo appointments
  useEffect(() => {
    setAppointments(generateDemoAppointments());
  }, []);
  
  // Navigation functions
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewType) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Get calendar data based on view type
  const getCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewType === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      const days = [];
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
      
      const current = new Date(startDate);
      while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      
      return days;
    } else if (viewType === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      
      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(day);
      }
      
      return days;
    } else {
      return [new Date(currentDate)];
    }
  }, [currentDate, viewType]);
  
  // Get appointments for a specific date
  const getAppointmentsForDate = useCallback((date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return (
        aptDate.getFullYear() === date.getFullYear() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getDate() === date.getDate() &&
        (selectedBarber === 'all' || apt.barberId === selectedBarber)
      );
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, selectedBarber]);
  
  // Format date for display
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  // Check for appointment conflicts
  const hasConflict = (barberId: string, date: Date, duration: number, excludeId?: string) => {
    const endTime = new Date(date.getTime() + duration * 60000);
    
    return appointments.some(apt => {
      if (apt.id === excludeId || apt.barberId !== barberId) return false;
      if (apt.status === 'cancelled') return false;
      
      const aptStart = new Date(apt.date);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
      
      return (
        (date >= aptStart && date < aptEnd) ||
        (endTime > aptStart && endTime <= aptEnd) ||
        (date <= aptStart && endTime >= aptEnd)
      );
    });
  };
  
  // Get available time slots for a date and barber
  const getAvailableSlots = (date: Date, barberId: string, duration: number): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const workStart = 9; // 9 AM
    const workEnd = 19; // 7 PM
    
    for (let hour = workStart; hour < workEnd; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotDate = new Date(date);
        slotDate.setHours(hour, minute, 0, 0);
        
        // Don't show past slots for today
        if (date.toDateString() === new Date().toDateString() && slotDate < new Date()) {
          continue;
        }
        
        const available = !hasConflict(barberId, slotDate, duration);
        
        slots.push({
          time: formatTime(slotDate),
          available,
        });
      }
    }
    
    return slots;
  };
  
  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, date: Date, hour?: number) => {
    e.preventDefault();
    
    if (!draggedAppointment) return;
    
    const newDate = new Date(date);
    if (hour !== undefined) {
      newDate.setHours(hour, 0, 0, 0);
    } else {
      // Keep the same time if dropping on a day
      const originalTime = new Date(draggedAppointment.date);
      newDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
    }
    
    // Check for conflicts
    if (hasConflict(draggedAppointment.barberId, newDate, draggedAppointment.duration, draggedAppointment.id)) {
      alert('Cannot move appointment - time slot conflict!');
      return;
    }
    
    // Update appointment
    setAppointments(prev => prev.map(apt => 
      apt.id === draggedAppointment.id
        ? { ...apt, date: newDate }
        : apt
    ));
    
    setDraggedAppointment(null);
  };
  
  // Render appointment in calendar
  const renderAppointment = (appointment: Appointment) => {
    const service = services.find(s => s.id === appointment.serviceId)!;
    const barber = barbers.find(b => b.id === appointment.barberId)!;
    const client = clients.find(c => c.id === appointment.clientId)!;
    
    const statusColors = {
      confirmed: 'bg-green-100 text-green-800 border-green-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      completed: 'bg-gray-100 text-gray-600 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300 line-through',
    };
    
    return (
      <div
        key={appointment.id}
        draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
        onDragStart={(e) => handleDragStart(e, appointment)}
        onClick={() => {
          setSelectedAppointment(appointment);
          setShowDetailModal(true);
        }}
        className={`p-1 mb-1 rounded text-xs cursor-pointer transition-all hover:shadow-md ${
          statusColors[appointment.status]
        } border ${barber.color}`}
      >
        <div className="font-semibold">{formatTime(new Date(appointment.date))}</div>
        <div className="truncate">{client.name}</div>
        <div className="truncate">{service.name}</div>
      </div>
    );
  };
  
  // Add new appointment
  const addAppointment = (formData: {
    barberId: string;
    clientId: string;
    serviceId: string;
    date: Date;
    time: string;
    notes?: string;
  }) => {
    const [hour, minute] = formData.time.split(':').map(Number);
    const appointmentDate = new Date(formData.date);
    appointmentDate.setHours(hour, minute, 0, 0);
    
    const service = services.find(s => s.id === formData.serviceId)!;
    
    // Check for conflicts
    if (hasConflict(formData.barberId, appointmentDate, service.duration)) {
      alert('Cannot book appointment - time slot conflict!');
      return;
    }
    
    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      barberId: formData.barberId,
      clientId: formData.clientId,
      serviceId: formData.serviceId,
      date: appointmentDate,
      duration: service.duration,
      status: 'pending',
      notes: formData.notes,
    };
    
    setAppointments(prev => [...prev, newAppointment]);
    setShowAddModal(false);
  };
  
  // Update appointment status
  const updateAppointmentStatus = (appointmentId: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(apt => 
      apt.id === appointmentId ? { ...apt, status } : apt
    ));
  };
  
  // Get period label
  const getPeriodLabel = () => {
    const options: Intl.DateTimeFormatOptions = viewType === 'month' 
      ? { month: 'long', year: 'numeric' }
      : viewType === 'week'
      ? { month: 'short', day: 'numeric' }
      : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    
    if (viewType === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    
    return currentDate.toLocaleDateString('en-US', options);
  };
  
  // Calculate stats
  const todayAppointments = getAppointmentsForDate(new Date()).filter(apt => apt.status !== 'cancelled');
  const thisWeekAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return aptDate >= weekStart && aptDate <= weekEnd && apt.status !== 'cancelled';
  });
  
  const cancellationRate = appointments.length > 0 
    ? (appointments.filter(apt => apt.status === 'cancelled').length / appointments.length * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">6FB Platform</h1>
              <nav className="ml-10 flex space-x-4">
                <a href="/app" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="/app/calendar" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Calendar
                </a>
                <a href="/app/analytics" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Analytics
                </a>
                <a href="/app/barbers" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Barbers
                </a>
                <a href="/app/payments" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Payments
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Demo Mode</span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                D
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Calendar</h2>
              <p className="text-gray-600 mt-1">Manage appointments and schedules</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigatePeriod('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-semibold text-gray-900">{getPeriodLabel()}</h3>
              <button
                onClick={() => navigatePeriod('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              >
                Today
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Barber Filter */}
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Barbers</option>
                {barbers.map(barber => (
                  <option key={barber.id} value={barber.id}>{barber.name}</option>
                ))}
              </select>
              
              {/* View Type Selector */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {(['month', 'week', 'day'] as ViewType[]).map(view => (
                  <button
                    key={view}
                    onClick={() => setViewType(view)}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      viewType === view
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          {viewType === 'month' && (
            <>
              {/* Month View */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
                    {day}
                  </div>
                ))}
                
                {getCalendarDays.map((date, index) => {
                  const dayAppointments = getAppointmentsForDate(date);
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`bg-white p-2 min-h-[120px] cursor-pointer hover:bg-gray-50 transition-colors ${
                        !isCurrentMonth ? 'text-gray-400' : ''
                      } ${
                        isToday ? 'bg-violet-50 border-2 border-violet-200' : ''
                      }`}
                      onClick={() => {
                        setSelectedDate(date);
                        setShowAddModal(true);
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, date)}
                    >
                      <div className={`text-sm mb-1 ${
                        isToday ? 'font-bold text-violet-600' : 'font-medium'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 3).map(appointment => renderAppointment(appointment))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayAppointments.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {viewType === 'week' && (
            <>
              {/* Week View */}
              <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-2"></div>
                {getCalendarDays.map((date, index) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div key={index} className={`bg-gray-50 p-2 text-center ${
                      isToday ? 'bg-violet-100 text-violet-700 font-semibold' : ''
                    }`}>
                      <div className="text-sm font-medium">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg">{date.getDate()}</div>
                    </div>
                  );
                })}
                
                {/* Time slots */}
                {Array.from({ length: 10 }, (_, hour) => hour + 9).map(hour => (
                  <React.Fragment key={hour}>
                    <div className="bg-white p-2 text-sm text-gray-500 border-r">
                      {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </div>
                    {getCalendarDays.map((date, dayIndex) => {
                      const hourAppointments = getAppointmentsForDate(date).filter(apt => {
                        const aptHour = new Date(apt.date).getHours();
                        return aptHour === hour;
                      });
                      
                      return (
                        <div
                          key={`${dayIndex}-${hour}`}
                          className="bg-white p-1 min-h-[60px] border-r cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            const newDate = new Date(date);
                            newDate.setHours(hour, 0, 0, 0);
                            setSelectedDate(newDate);
                            setShowAddModal(true);
                          }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, date, hour)}
                        >
                          {hourAppointments.map(appointment => renderAppointment(appointment))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}

          {viewType === 'day' && (
            <>
              {/* Day View */}
              <div className="bg-white rounded-lg">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatDate(currentDate)}
                  </h3>
                </div>
                
                <div className="grid grid-cols-12 gap-px bg-gray-200">
                  <div className="col-span-2 bg-gray-50 p-2">
                    <div className="text-sm font-medium text-gray-700">Time</div>
                  </div>
                  {barbers.map(barber => (
                    <div key={barber.id} className={`col-span-2 bg-gray-50 p-2 border-l-4 ${barber.color}`}>
                      <div className="text-sm font-medium text-gray-700">
                        {barber.avatar} {barber.name}
                      </div>
                    </div>
                  ))}
                  
                  {/* Time slots */}
                  {Array.from({ length: 10 }, (_, hour) => hour + 9).map(hour => (
                    <React.Fragment key={hour}>
                      <div className="col-span-2 bg-white p-2 text-sm text-gray-500">
                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                      {barbers.map(barber => {
                        const hourAppointments = getAppointmentsForDate(currentDate).filter(apt => {
                          const aptHour = new Date(apt.date).getHours();
                          return aptHour === hour && apt.barberId === barber.id;
                        });
                        
                        return (
                          <div
                            key={`${barber.id}-${hour}`}
                            className="col-span-2 bg-white p-1 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              const newDate = new Date(currentDate);
                              newDate.setHours(hour, 0, 0, 0);
                              setSelectedDate(newDate);
                              setShowAddModal(true);
                            }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, currentDate, hour)}
                          >
                            {hourAppointments.map(appointment => renderAppointment(appointment))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{todayAppointments.length}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{thisWeekAppointments.length}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${todayAppointments.reduce((sum, apt) => {
                    const service = services.find(s => s.id === apt.serviceId);
                    return sum + (service?.price || 0);
                  }, 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancellation Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{cancellationRate}%</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>
      </main>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <AddAppointmentModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedDate(null);
          }}
          onAdd={addAppointment}
          selectedDate={selectedDate}
          barbers={barbers}
          clients={clients}
          services={services}
          getAvailableSlots={getAvailableSlots}
        />
      )}

      {/* Appointment Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <AppointmentDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          barber={barbers.find(b => b.id === selectedAppointment.barberId)!}
          client={clients.find(c => c.id === selectedAppointment.clientId)!}
          service={services.find(s => s.id === selectedAppointment.serviceId)!}
          onStatusUpdate={updateAppointmentStatus}
        />
      )}
    </div>
  );
}

// Add Appointment Modal Component
interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (formData: {
    barberId: string;
    clientId: string;
    serviceId: string;
    date: Date;
    time: string;
    notes?: string;
  }) => void;
  selectedDate: Date | null;
  barbers: Barber[];
  clients: Client[];
  services: Service[];
  getAvailableSlots: (date: Date, barberId: string, duration: number) => TimeSlot[];
}

function AddAppointmentModal({
  isOpen,
  onClose,
  onAdd,
  selectedDate,
  barbers,
  clients,
  services,
  getAvailableSlots
}: AddAppointmentModalProps) {
  const [formData, setFormData] = useState({
    barberId: '',
    clientId: '',
    serviceId: '',
    date: selectedDate || new Date(),
    time: '',
    notes: ''
  });
  
  const selectedService = services.find(s => s.id === formData.serviceId);
  const availableSlots = formData.barberId && selectedService
    ? getAvailableSlots(formData.date, formData.barberId, selectedService.duration)
    : [];
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.barberId || !formData.clientId || !formData.serviceId || !formData.time) {
      alert('Please fill in all required fields');
      return;
    }
    
    onAdd(formData);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">New Appointment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date.toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barber</label>
            <select
              value={formData.barberId}
              onChange={(e) => setFormData({ ...formData, barberId: e.target.value, time: '' })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Select a barber</option>
              {barbers.map(barber => (
                <option key={barber.id} value={barber.id}>{barber.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <select
              value={formData.serviceId}
              onChange={(e) => setFormData({ ...formData, serviceId: e.target.value, time: '' })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Select a service</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} - ${service.price} ({service.duration}min)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Select a client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          
          {formData.barberId && selectedService && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Times</label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setFormData({ ...formData, time: slot.time })}
                    className={`p-2 text-sm rounded-md transition-colors ${
                      !slot.available
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : formData.time === slot.time
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={3}
              placeholder="Any special requests or notes..."
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              Book Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Appointment Detail Modal Component
interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  barber: Barber;
  client: Client;
  service: Service;
  onStatusUpdate: (appointmentId: string, status: AppointmentStatus) => void;
}

function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  barber,
  client,
  service,
  onStatusUpdate
}: AppointmentDetailModalProps) {
  if (!isOpen) return null;
  
  const statusColors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-800',
  };
  
  const endTime = new Date(appointment.date.getTime() + appointment.duration * 60000);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[appointment.status]}`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">{barber.avatar}</div>
              <div>
                <div className="font-medium text-gray-900">{barber.name}</div>
                <div className="text-sm text-gray-600">Barber</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mb-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">{client.name}</div>
                <div className="text-sm text-gray-600">{client.phone}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mb-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">{service.name}</div>
                <div className="text-sm text-gray-600">
                  {appointment.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {appointment.date.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                  })} - {endTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true 
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mb-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">${service.price}</div>
                <div className="text-sm text-gray-600">{service.duration} minutes</div>
              </div>
            </div>
            
            {appointment.notes && (
              <div className="bg-gray-50 rounded-md p-3 mt-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
                <div className="text-sm text-gray-600">{appointment.notes}</div>
              </div>
            )}
          </div>
          
          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Actions</div>
              <div className="flex space-x-2">
                {appointment.status === 'pending' && (
                  <button
                    onClick={() => {
                      onStatusUpdate(appointment.id, 'confirmed');
                      onClose();
                    }}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Check className="h-4 w-4" />
                    <span>Confirm</span>
                  </button>
                )}
                {appointment.status === 'confirmed' && (
                  <button
                    onClick={() => {
                      onStatusUpdate(appointment.id, 'completed');
                      onClose();
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Check className="h-4 w-4" />
                    <span>Complete</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onStatusUpdate(appointment.id, 'cancelled');
                    onClose();
                  }}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-1"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}