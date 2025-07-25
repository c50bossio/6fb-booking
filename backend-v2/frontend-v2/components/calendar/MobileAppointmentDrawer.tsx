/**
 * Mobile Appointment Drawer
 * Bottom sheet interface for appointment management on mobile
 * Native-like interaction with Six Figure Barber optimization
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { format, addMinutes } from 'date-fns';
import { 
  X, 
  Edit, 
  Trash2, 
  Phone, 
  MessageSquare, 
  Clock, 
  DollarSign, 
  User,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Share,
  Copy,
  CreditCard,
  Star,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OfflineAppointment } from '@/lib/offline-calendar-manager';
import { pushNotificationManager } from '@/lib/push-notifications';

interface MobileAppointmentDrawerProps {
  appointment: OfflineAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (appointment: OfflineAppointment) => void;
  onDelete: (appointmentId: string) => void;
  onContactClient?: (phone: string) => void;
  onMessageClient?: (phone: string) => void;
  onStartService?: (appointment: OfflineAppointment) => void;
  onCompleteService?: (appointment: OfflineAppointment) => void;
  className?: string;
}

const DRAWER_STATES = {
  CLOSED: 0,
  PEEK: 200,
  HALF: 400,
  FULL: 600
};

export function MobileAppointmentDrawer({
  appointment,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onContactClient,
  onMessageClient,
  onStartService,
  onCompleteService,
  className = ''
}: MobileAppointmentDrawerProps) {
  const [drawerHeight, setDrawerHeight] = useState(DRAWER_STATES.CLOSED);
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const drawerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Auto-expand drawer when appointment is selected
  useEffect(() => {
    if (isOpen && appointment) {
      setDrawerHeight(DRAWER_STATES.HALF);
      setIsExpanded(false);
    } else {
      setDrawerHeight(DRAWER_STATES.CLOSED);
      setIsExpanded(false);
    }
  }, [isOpen, appointment]);

  const handleDragStart = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    startY.current = info.point.y;
    currentY.current = drawerHeight;
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const deltaY = info.point.y - startY.current;
    const newHeight = Math.max(0, Math.min(DRAWER_STATES.FULL, currentY.current - deltaY));
    setDrawerHeight(newHeight);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const threshold = 50;

    if (velocity > threshold) {
      // Swiping down - close or minimize
      if (drawerHeight > DRAWER_STATES.HALF) {
        setDrawerHeight(DRAWER_STATES.HALF);
        setIsExpanded(false);
      } else {
        onClose();
      }
    } else if (velocity < -threshold) {
      // Swiping up - expand
      setDrawerHeight(DRAWER_STATES.FULL);
      setIsExpanded(true);
    } else {
      // Snap to nearest state
      if (drawerHeight < DRAWER_STATES.PEEK) {
        onClose();
      } else if (drawerHeight < DRAWER_STATES.HALF + 50) {
        setDrawerHeight(DRAWER_STATES.HALF);
        setIsExpanded(false);
      } else {
        setDrawerHeight(DRAWER_STATES.FULL);
        setIsExpanded(true);
      }
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!appointment) return;

    setActionLoading(action);
    
    try {
      switch (action) {
        case 'complete':
          const completedAppointment = { ...appointment, status: 'completed' as const };
          onUpdate(completedAppointment);
          onCompleteService?.(completedAppointment);
          
          // Show completion notification
          await pushNotificationManager.showNotification({
            id: `completed_${appointment.id}`,
            title: '✅ Service Completed',
            body: `${appointment.clientName} appointment completed successfully`,
            tag: 'appointment_completed'
          });
          break;

        case 'start':
          const startedAppointment = { ...appointment, status: 'scheduled' as const };
          onUpdate(startedAppointment);
          onStartService?.(startedAppointment);
          break;

        case 'cancel':
          const cancelledAppointment = { ...appointment, status: 'cancelled' as const };
          onUpdate(cancelledAppointment);
          break;

        case 'no-show':
          const noShowAppointment = { ...appointment, status: 'no-show' as const };
          onUpdate(noShowAppointment);
          break;

        case 'contact':
          if (appointment.clientPhone) {
            onContactClient?.(appointment.clientPhone);
          }
          break;

        case 'message':
          if (appointment.clientPhone) {
            onMessageClient?.(appointment.clientPhone);
          }
          break;

        case 'share':
          if (navigator.share) {
            await navigator.share({
              title: 'Appointment Details',
              text: `${appointment.clientName} - ${appointment.serviceName}`,
              url: window.location.href
            });
          }
          break;

        case 'copy':
          const appointmentText = `${appointment.clientName}\n${appointment.serviceName}\n${format(new Date(appointment.startTime), 'PPP p')}\n$${appointment.price}`;
          await navigator.clipboard.writeText(appointmentText);
          break;
      }
    } catch (error) {
      console.error('Quick action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    
    setActionLoading('delete');
    
    try {
      onDelete(appointment.id);
      setShowConfirmDelete(false);
      onClose();
      
      // Show deletion notification
      await pushNotificationManager.showNotification({
        id: `deleted_${appointment.id}`,
        title: '🗑️ Appointment Deleted',
        body: `${appointment.clientName} appointment has been removed`,
        tag: 'appointment_deleted'
      });
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no-show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'no-show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!appointment) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl z-50 ${className}`}
            style={{ height: drawerHeight }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full cursor-grab active:cursor-grabbing" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {appointment.clientName}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {appointment.serviceName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge className={`${getStatusColor(appointment.status)} border`}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(appointment.status)}
                    <span className="capitalize">{appointment.status}</span>
                  </div>
                </Badge>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="rounded-full p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 flex-1 overflow-y-auto">
              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {appointment.status === 'scheduled' && (
                  <>
                    <motion.button
                      className="flex flex-col items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                      onClick={() => handleQuickAction('complete')}
                      disabled={actionLoading === 'complete'}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mb-1" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        Complete
                      </span>
                    </motion.button>

                    <motion.button
                      className="flex flex-col items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                      onClick={() => handleQuickAction('cancel')}
                      disabled={actionLoading === 'cancel'}
                      whileTap={{ scale: 0.95 }}
                    >
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 mb-1" />
                      <span className="text-xs font-medium text-red-700 dark:text-red-300">
                        Cancel
                      </span>
                    </motion.button>
                  </>
                )}

                {appointment.clientPhone && (
                  <>
                    <motion.button
                      className="flex flex-col items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                      onClick={() => handleQuickAction('contact')}
                      disabled={actionLoading === 'contact'}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-1" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        Call
                      </span>
                    </motion.button>

                    <motion.button
                      className="flex flex-col items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                      onClick={() => handleQuickAction('message')}
                      disabled={actionLoading === 'message'}
                      whileTap={{ scale: 0.95 }}
                    >
                      <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-1" />
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        Message
                      </span>
                    </motion.button>
                  </>
                )}

                <motion.button
                  className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  onClick={() => handleQuickAction('share')}
                  disabled={actionLoading === 'share'}
                  whileTap={{ scale: 0.95 }}
                >
                  <Share className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-1" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Share
                  </span>
                </motion.button>
              </div>

              {/* Appointment Details */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Time & Duration */}
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(appointment.startTime), 'EEEE, MMMM d')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(appointment.startTime), 'h:mm a')} - {format(addMinutes(new Date(appointment.startTime), appointment.duration), 'h:mm a')} ({appointment.duration} min)
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Service & Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {appointment.serviceName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Service
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg text-green-600 dark:text-green-400">
                        {formatCurrency(appointment.price)}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {(appointment.clientPhone || appointment.clientEmail) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {appointment.clientPhone && (
                          <div className="flex items-center space-x-3">
                            <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {appointment.clientPhone}
                            </span>
                          </div>
                        )}
                        {appointment.clientEmail && (
                          <div className="flex items-center space-x-3">
                            <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {appointment.clientEmail}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {appointment.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          Notes
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {appointment.notes}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Sync Status */}
                  {appointment.syncStatus === 'pending' && (
                    <>
                      <Separator />
                      <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Changes will sync when online
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Expanded Actions */}
              {isExpanded && (
                <motion.div
                  className="mt-6 space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {/* Handle edit */}}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Appointment
                  </Button>

                  {appointment.status === 'scheduled' && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleQuickAction('no-show')}
                      disabled={actionLoading === 'no-show'}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Mark No-Show
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('copy')}
                    disabled={actionLoading === 'copy'}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Details
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => setShowConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Appointment
                  </Button>
                </motion.div>
              )}

              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </div>
          </motion.div>

          {/* Delete Confirmation */}
          <AnimatePresence>
            {showConfirmDelete && (
              <motion.div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                >
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Delete Appointment
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete this appointment? This action cannot be undone.
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowConfirmDelete(false)}
                      disabled={actionLoading === 'delete'}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDelete}
                      disabled={actionLoading === 'delete'}
                    >
                      {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}