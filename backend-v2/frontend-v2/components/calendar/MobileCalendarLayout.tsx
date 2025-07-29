/**
 * Mobile Calendar Layout
 * Fresha-inspired touch-optimized calendar for mobile devices
 * Vertical scrolling, native-like gestures, and Six Figure Barber optimization
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { format, addDays, subDays, isSameDay, startOfWeek, addMinutes, isToday } from 'date-fns';
import { Calendar, Clock, DollarSign, User, Plus, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMobileCalendarGestures } from '@/hooks/useMobileCalendarGestures';
import { offlineCalendarManager, OfflineAppointment } from '@/lib/offline-calendar-manager';
import { pushNotificationManager } from '@/lib/push-notifications';
import { PullToRefresh } from './PullToRefresh';
import { SwipeNavigation } from './SwipeNavigation';
import { MobileAppointmentDrawer } from './MobileAppointmentDrawer';

interface MobileCalendarLayoutProps {
  barberId?: string;
  barberName?: string;
  initialDate?: Date;
  onAppointmentSelect?: (appointment: OfflineAppointment) => void;
  onCreateAppointment?: (timeSlot: string) => void;
  isOffline?: boolean;
  className?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  appointment?: OfflineAppointment;
  revenue?: number;
}

interface DayStats {
  totalAppointments: number;
  totalRevenue: number;
  completedAppointments: number;
  availableSlots: number;
}

const SLOT_HEIGHT = 80; // Height of each time slot in pixels
const HEADER_HEIGHT = 120; // Height of the header
const TIME_SLOTS_START = 8; // 8 AM
const TIME_SLOTS_END = 20; // 8 PM
const SLOT_INTERVAL = 30; // 30 minutes

export function MobileCalendarLayout({
  barberId,
  barberName = 'Barber',
  initialDate = new Date(),
  onAppointmentSelect,
  onCreateAppointment,
  isOffline = false,
  className = ''
}: MobileCalendarLayoutProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [appointments, setAppointments] = useState<OfflineAppointment[]>([]);
  const [dayStats, setDayStats] = useState<DayStats>({ totalAppointments: 0, totalRevenue: 0, completedAppointments: 0, availableSlots: 0 });
  const [selectedAppointment, setSelectedAppointment] = useState<OfflineAppointment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'schedule' | 'availability'>('schedule');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todaySlotRef = useRef<HTMLDivElement>(null);

  // Initialize mobile gestures
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleLongPress,
    triggerHapticFeedback
  } = useMobileCalendarGestures({
    onSwipeLeft: () => handleDateChange(addDays(selectedDate, 1)),
    onSwipeRight: () => handleDateChange(subDays(selectedDate, 1)),
    onDoubleTap: handleQuickBooking,
    onLongPress: (target) => handleLongPressAction(target)
  });

  // Generate time slots for the day
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const startHour = TIME_SLOTS_START;
    const endHour = TIME_SLOTS_END;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const appointment = appointments.find(apt => 
          format(new Date(apt.startTime), 'HH:mm') === timeString
        );
        
        slots.push({
          time: timeString,
          available: !appointment,
          appointment,
          revenue: appointment?.price || 0
        });
      }
    }
    
    return slots;
  }, [appointments]);

  // Load appointments when date changes
  useEffect(() => {
    loadAppointments();
  }, [selectedDate, barberId]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (isToday(selectedDate) && todaySlotRef.current && scrollContainerRef.current) {
      const scrollTop = todaySlotRef.current.offsetTop - HEADER_HEIGHT - 40;
      scrollContainerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [selectedDate, timeSlots]);

  const loadAppointments = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const dayAppointments = await offlineCalendarManager.getAppointments(
        dateStr,
        dateStr,
        barberId
      );
      
      setAppointments(dayAppointments);
      calculateDayStats(dayAppointments);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const calculateDayStats = (appointments: OfflineAppointment[]) => {
    const stats: DayStats = {
      totalAppointments: appointments.length,
      totalRevenue: appointments.reduce((sum, apt) => sum + apt.price, 0),
      completedAppointments: appointments.filter(apt => apt.status === 'completed').length,
      availableSlots: timeSlots.filter(slot => slot.available).length
    };
    
    setDayStats(stats);
  };

  const handleDateChange = (newDate: Date) => {
    triggerHapticFeedback('light');
    setSelectedDate(newDate);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerHapticFeedback('medium');
    
    try {
      await offlineCalendarManager.syncPendingAppointments();
      await loadAppointments();
      
      // Show success notification
      await pushNotificationManager.showNotification({
        id: 'calendar_refreshed',
        title: '📅 Calendar Updated',
        body: 'Your schedule has been refreshed',
        tag: 'calendar_update'
      });
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAppointmentPress = (appointment: OfflineAppointment) => {
    triggerHapticFeedback('medium');
    setSelectedAppointment(appointment);
    setIsDrawerOpen(true);
    onAppointmentSelect?.(appointment);
  };

  const handleTimeSlotPress = (timeSlot: TimeSlot) => {
    if (timeSlot.available) {
      triggerHapticFeedback('light');
      onCreateAppointment?.(timeSlot.time);
    }
  };

  const handleQuickBooking = (event: React.TouchEvent) => {
    // Double tap to quick book
    const target = event.target as HTMLElement;
    const timeSlot = target.getAttribute('data-time');
    
    if (timeSlot) {
      triggerHapticFeedback('heavy');
      onCreateAppointment?.(timeSlot);
    }
  };

  const handleLongPressAction = (target: EventTarget | null) => {
    const element = target as HTMLElement;
    const appointmentId = element?.getAttribute('data-appointment-id');
    
    if (appointmentId) {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment) {
        triggerHapticFeedback('heavy');
        setSelectedAppointment(appointment);
        setIsDrawerOpen(true);
      }
    }
  };

  const getCurrentTimeIndicator = () => {
    if (!isToday(selectedDate)) return null;
    
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Calculate position based on time
    const slotIndex = timeSlots.findIndex(slot => slot.time >= timeString);
    if (slotIndex === -1) return null;
    
    const topPosition = slotIndex * SLOT_HEIGHT + HEADER_HEIGHT;
    
    return (
      <motion.div
        className="absolute left-0 right-0 z-10 pointer-events-none"
        style={{ top: topPosition }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <div className="flex-1 h-0.5 bg-red-500" />
        </div>
        <div className="text-xs text-red-500 font-medium mt-1 ml-3">
          {format(currentTime, 'h:mm a')}
        </div>
      </motion.div>
    );
  };

  const getAppointmentColor = (appointment: OfflineAppointment) => {
    switch (appointment.status) {
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'no-show':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatRevenue = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const weekDays = useMemo(() => {
    const startDate = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [selectedDate]);

  return (
    <div className={`h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <motion.div 
        className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700"
        style={{ height: HEADER_HEIGHT }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Date Navigation */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDateChange(subDays(selectedDate, 1))}
            className="p-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(selectedDate, 'EEEE, MMM d')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {barberName}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDateChange(addDays(selectedDate, 1))}
            className="p-2"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Week View */}
        <div className="flex px-4 pb-2">
          {weekDays.map((day, index) => (
            <motion.button
              key={index}
              className={`flex-1 py-2 px-1 text-center rounded-lg transition-colors ${
                isSameDay(day, selectedDate)
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => handleDateChange(day)}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-xs font-medium">
                {format(day, 'EEE')}
              </div>
              <div className={`text-sm font-semibold ${
                isToday(day) ? 'text-blue-500' : ''
              }`}>
                {format(day, 'd')}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="flex px-4 pb-2 space-x-4">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {dayStats.totalAppointments}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatRevenue(dayStats.totalRevenue)}
            </span>
          </div>
          {isOffline && (
            <Badge variant="secondary" className="text-xs">
              Offline
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Pull to Refresh */}
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        {/* Schedule View */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative">
            {/* Current Time Indicator */}
            {getCurrentTimeIndicator()}
            
            {/* Time Slots */}
            <div className="px-4 py-2">
              {timeSlots.map((slot, index) => {
                const isCurrentSlot = isToday(selectedDate) && 
                  format(currentTime, 'HH:mm') === slot.time;
                
                return (
                  <motion.div
                    key={slot.time}
                    ref={isCurrentSlot ? todaySlotRef : undefined}
                    className={`flex items-center py-2 border-b border-gray-100 dark:border-gray-800 ${
                      isCurrentSlot ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    style={{ minHeight: SLOT_HEIGHT }}
                    data-time={slot.time}
                    data-appointment-id={slot.appointment?.id}
                    onClick={() => slot.appointment 
                      ? handleAppointmentPress(slot.appointment)
                      : handleTimeSlotPress(slot)
                    }
                    whileTap={{ scale: 0.98 }}
                    onLongPress={() => slot.appointment && handleLongPressAction}
                  >
                    {/* Time */}
                    <div className="w-16 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {format(addMinutes(new Date().setHours(0, 0, 0, 0), 
                        parseInt(slot.time.split(':')[0]) * 60 + parseInt(slot.time.split(':')[1])
                      ), 'h:mm a')}
                    </div>

                    {/* Content */}
                    <div className="flex-1 ml-4">
                      {slot.appointment ? (
                        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${getAppointmentColor(slot.appointment)}`} />
                                  <h3 className="font-medium text-gray-900 dark:text-white">
                                    {slot.appointment.clientName}
                                  </h3>
                                  {slot.appointment.syncStatus === 'pending' && (
                                    <Badge variant="outline" className="text-xs">
                                      Sync Pending
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {slot.appointment.serviceName} • {slot.appointment.duration}min
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                    {formatRevenue(slot.appointment.price)}
                                  </span>
                                  <Badge 
                                    variant={slot.appointment.status === 'completed' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {slot.appointment.status}
                                  </Badge>
                                </div>
                              </div>
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <motion.div
                          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Plus className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Available
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Swipe Navigation */}
      <SwipeNavigation
        onSwipeLeft={() => handleDateChange(addDays(selectedDate, 1))}
        onSwipeRight={() => handleDateChange(subDays(selectedDate, 1))}
      />

      {/* Mobile Appointment Drawer */}
      <MobileAppointmentDrawer
        appointment={selectedAppointment}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppointment(null);
        }}
        onUpdate={(updatedAppointment) => {
          // Update appointment in state
          setAppointments(prev => 
            prev.map(apt => apt.id === updatedAppointment.id ? updatedAppointment : apt)
          );
          setIsDrawerOpen(false);
          setSelectedAppointment(null);
        }}
        onDelete={(appointmentId) => {
          // Remove appointment from state
          setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
          setIsDrawerOpen(false);
          setSelectedAppointment(null);
        }}
      />
    </div>
  );
}

// Default export for compatibility
export default MobileCalendarLayout;