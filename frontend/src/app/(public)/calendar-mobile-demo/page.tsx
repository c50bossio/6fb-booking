'use client'

/**
 * Mobile Calendar Demo Page
 *
 * Demonstrates the mobile-optimized calendar with all touch features
 * and native mobile interactions.
 */

import React, { useState, useCallback } from 'react'
import MobileOptimizedCalendar from '@/components/calendar/MobileOptimizedCalendar'
import MobileAppointmentSheet from '@/components/mobile/MobileAppointmentSheet'
import MobileTimeSlotPicker, { generateTimeSlots, TimeSlotPresets } from '@/components/mobile/MobileTimeSlotPicker'
import MobileBottomSheet from '@/components/mobile/MobileBottomSheet'
import { CalendarAppointment, Barber, Service } from '@/components/calendar/RobustCalendar'
import { useTheme } from '@/contexts/ThemeContext'
import { motion } from 'framer-motion'
import {
  DevicePhoneMobileIcon,
  SparklesIcon,
  HandRaisedIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

// Demo data
const demoBarbers: Barber[] = [
  { id: 1, name: 'Marcus Johnson', color: '#8b5cf6', specialties: ['Fades', 'Beard Styling'] },
  { id: 2, name: 'Sarah Mitchell', color: '#06b6d4', specialties: ['Modern Cuts', 'Hair Design'] },
  { id: 3, name: 'Tony Rodriguez', color: '#f59e0b', specialties: ['Classic Cuts', 'Hot Shaves'] }
]

const demoServices: Service[] = [
  { id: 1, name: 'Premium Cut & Beard', duration: 60, price: 85, category: 'Premium' },
  { id: 2, name: 'Classic Fade', duration: 45, price: 45, category: 'Standard' },
  { id: 3, name: 'Beard Trim', duration: 30, price: 35, category: 'Grooming' },
  { id: 4, name: 'Kids Cut', duration: 30, price: 25, category: 'Special' }
]

const demoAppointments: CalendarAppointment[] = [
  {
    id: '1',
    title: 'Premium Cut & Beard',
    client: 'John Smith',
    clientId: 1,
    barber: 'Marcus Johnson',
    barberId: 1,
    startTime: '09:00',
    endTime: '10:00',
    service: 'Premium Cut & Beard',
    serviceId: 1,
    price: 85,
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    clientPhone: '+1 (555) 123-4567',
    clientEmail: 'john.smith@email.com',
    notes: 'Regular client, prefers low fade',
    paymentStatus: 'paid'
  },
  {
    id: '2',
    title: 'Classic Fade',
    client: 'Mike Johnson',
    clientId: 2,
    barber: 'Sarah Mitchell',
    barberId: 2,
    startTime: '10:30',
    endTime: '11:15',
    service: 'Classic Fade',
    serviceId: 2,
    price: 45,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    duration: 45,
    clientPhone: '+1 (555) 234-5678',
    paymentStatus: 'unpaid'
  },
  {
    id: '3',
    title: 'Beard Trim',
    client: 'David Lee',
    clientId: 3,
    barber: 'Tony Rodriguez',
    barberId: 3,
    startTime: '14:00',
    endTime: '14:30',
    service: 'Beard Trim',
    serviceId: 3,
    price: 35,
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0],
    duration: 30,
    paymentStatus: 'paid'
  }
]

const FEATURES = [
  {
    icon: HandRaisedIcon,
    title: 'Touch Gestures',
    description: 'Swipe to navigate, pinch to zoom, long-press for options'
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Native Feel',
    description: 'Platform-specific UI with haptic feedback'
  },
  {
    icon: SparklesIcon,
    title: '60fps Animations',
    description: 'Smooth, responsive interactions'
  }
]

export default function CalendarMobileDemoPage() {
  const { theme } = useTheme()
  const [appointments, setAppointments] = useState(demoAppointments)
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)
  const [showAppointmentSheet, setShowAppointmentSheet] = useState(false)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState<string>()
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'desktop'>('phone')
  const [showFeatures, setShowFeatures] = useState(true)

  // Generate time slots for the picker
  const timeSlots = generateTimeSlots(
    TimeSlotPresets.barber.start,
    TimeSlotPresets.barber.end,
    TimeSlotPresets.barber.interval,
    appointments.map(apt => apt.startTime)
  )

  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentSheet(true)
  }, [])

  const handleTimeSlotClick = useCallback((date: string, time: string) => {
    setSelectedDate(new Date(date))
    setSelectedTime(time)
    setShowCreateSheet(true)
  }, [])

  const handleCreateAppointment = useCallback(async (appointment: Partial<CalendarAppointment>) => {
    const newAppointment: CalendarAppointment = {
      id: Date.now().toString(),
      title: appointment.service || '',
      client: appointment.client || '',
      barber: appointment.barber || '',
      barberId: appointment.barberId || 1,
      startTime: appointment.startTime || '',
      endTime: appointment.endTime || '',
      service: appointment.service || '',
      serviceId: appointment.serviceId || 1,
      price: appointment.price || 0,
      status: 'pending',
      date: appointment.date || '',
      duration: appointment.duration || 30,
      paymentStatus: 'unpaid'
    }

    setAppointments(prev => [...prev, newAppointment])
    setShowCreateSheet(false)
  }, [])

  const handleDeleteAppointment = useCallback((appointmentId: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
    setShowAppointmentSheet(false)
  }, [])

  const handleRefresh = useCallback(async () => {
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Calendar refreshed!')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mobile Calendar Demo
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Experience native mobile interactions
              </p>
            </div>

            {/* Device selector */}
            <div className="flex space-x-2">
              <button
                onClick={() => setDeviceType('phone')}
                className={`p-2 rounded-lg transition-colors ${
                  deviceType === 'phone'
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <DevicePhoneMobileIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeviceType('tablet')}
                className={`p-2 rounded-lg transition-colors ${
                  deviceType === 'tablet'
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <DeviceTabletIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeviceType('desktop')}
                className={`p-2 rounded-lg transition-colors ${
                  deviceType === 'desktop'
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <ComputerDesktopIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features banner */}
      <AnimatePresence>
        {showFeatures && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800"
          >
            <div className="max-w-7xl mx-auto px-4 py-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-violet-900 dark:text-violet-100">
                  Mobile Features
                </h2>
                <button
                  onClick={() => setShowFeatures(false)}
                  className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FEATURES.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3"
                  >
                    <div className="flex-shrink-0 p-2 bg-violet-100 dark:bg-violet-800/30 rounded-lg">
                      <feature.icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-violet-900 dark:text-violet-100">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-violet-700 dark:text-violet-300 mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-violet-100 dark:bg-violet-800/30 rounded-lg">
                <p className="text-sm text-violet-800 dark:text-violet-200">
                  <strong>Try it out:</strong> Swipe left/right to navigate dates, pinch to zoom calendar density,
                  and long-press appointments for quick actions.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device frame */}
      <div className="flex items-center justify-center p-8">
        <div
          className={`relative bg-black rounded-[2.5rem] shadow-2xl transition-all duration-500 ${
            deviceType === 'phone'
              ? 'w-[375px] h-[812px]'
              : deviceType === 'tablet'
                ? 'w-[768px] h-[1024px]'
                : 'w-full max-w-[1200px] h-[800px] rounded-xl'
          }`}
        >
          {/* Device bezel */}
          {deviceType !== 'desktop' && (
            <>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl" />
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gray-800 rounded-full" />
            </>
          )}

          {/* Screen */}
          <div className={`bg-white dark:bg-gray-900 overflow-hidden ${
            deviceType === 'desktop' ? 'rounded-xl' : 'rounded-[2rem] m-3'
          }`}>
            <MobileOptimizedCalendar
              appointments={appointments}
              barbers={demoBarbers}
              services={demoServices}
              onAppointmentClick={handleAppointmentClick}
              onTimeSlotClick={handleTimeSlotClick}
              onCreateAppointment={handleCreateAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              onRefresh={handleRefresh}

              // Mobile features
              enableSwipeNavigation={true}
              enablePinchToZoom={true}
              enablePullToRefresh={true}
              enableBottomSheetModals={true}
              enableHapticFeedback={true}
              enableMomentumScrolling={true}
              enableElasticBoundaries={true}

              // Responsive
              phoneMaxWidth={768}
              tabletMaxWidth={1024}

              // UI preferences
              showMobileToolbar={deviceType !== 'desktop'}
              mobileToolbarPosition="bottom"
              compactMobileMode={deviceType === 'phone'}
            />
          </div>
        </div>
      </div>

      {/* Mobile sheets */}
      <MobileAppointmentSheet
        isOpen={showAppointmentSheet}
        onClose={() => {
          setShowAppointmentSheet(false)
          setSelectedAppointment(null)
        }}
        appointment={selectedAppointment}
        barbers={demoBarbers}
        services={demoServices}
        onEdit={(appointment) => {
          console.log('Edit appointment:', appointment)
          setShowAppointmentSheet(false)
        }}
        onDelete={handleDeleteAppointment}
        onCall={(phone) => console.log('Call:', phone)}
        onEmail={(email) => console.log('Email:', email)}
        enableHapticFeedback={true}
      />

      {/* Create appointment sheet */}
      <MobileBottomSheet
        isOpen={showCreateSheet}
        onClose={() => {
          setShowCreateSheet(false)
          setSelectedTime(undefined)
        }}
        title="New Appointment"
        height="auto"
        maxHeight={80}
      >
        <div className="p-4">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
          </div>

          <MobileTimeSlotPicker
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onTimeSelect={setSelectedTime}
            timeSlots={timeSlots}
            enableHapticFeedback={true}
            autoScroll={true}
            snapToSlot={true}
          />

          {selectedTime && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                handleCreateAppointment({
                  date: selectedDate.toISOString().split('T')[0],
                  startTime: selectedTime,
                  endTime: selectedTime, // Would calculate based on service
                  client: 'New Client',
                  service: 'Classic Fade',
                  serviceId: 2,
                  barber: 'Marcus Johnson',
                  barberId: 1,
                  price: 45,
                  duration: 45
                })
              }}
              className="w-full mt-6 py-3 px-4 bg-violet-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2"
            >
              <CheckIcon className="h-5 w-5" />
              <span>Continue</span>
            </motion.button>
          )}
        </div>
      </MobileBottomSheet>

      {/* Instructions */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Mobile Interaction Guide
          </h3>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Swipe Navigation</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Swipe left or right to navigate between days, weeks, or months
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Pinch to Zoom</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pinch in/out to change calendar density (compact, normal, expanded)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Long Press</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Long press on appointments for quick actions and details
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">4</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Pull to Refresh</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pull down from the top to refresh calendar data
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
