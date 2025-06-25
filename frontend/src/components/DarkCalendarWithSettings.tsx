'use client'

import { useState, useEffect } from 'react'
import { generateMockCalendarData, generateTodayAppointments } from '../utils/mockCalendarData'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  XMarkIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  PaintBrushIcon,
  BellIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface CalendarSettings {
  theme: 'dark' | 'light' | 'auto'
  accentColor: string
  timeFormat: '12h' | '24h'
  weekStart: 'sunday' | 'monday'
  defaultView: 'day' | 'week' | 'month'
  density: 'compact' | 'comfortable' | 'spacious'
  animations: boolean
  showWeekNumbers: boolean
  showDeclinedEvents: boolean
  colorByStatus: boolean
  quickActions: boolean
}

interface Appointment {
  id: string
  title: string
  client: string
  barber: string
  startTime: string
  endTime: string
  service: string
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  date: string
}

const accentColors = [
  { name: 'Violet', value: 'violet', gradient: 'from-violet-600 to-purple-600' },
  { name: 'Blue', value: 'blue', gradient: 'from-blue-600 to-indigo-600' },
  { name: 'Emerald', value: 'emerald', gradient: 'from-emerald-600 to-teal-600' },
  { name: 'Rose', value: 'rose', gradient: 'from-rose-600 to-pink-600' },
  { name: 'Amber', value: 'amber', gradient: 'from-amber-600 to-orange-600' },
  { name: 'Cyan', value: 'cyan', gradient: 'from-cyan-600 to-sky-600' }
]

// Generate rich mock appointments for the demo
const generateMockAppointments = (): Appointment[] => {
  const mockData = generateMockCalendarData(25)
  const todayData = generateTodayAppointments()

  // Convert to the format expected by this component
  return [...todayData, ...mockData].map(appointment => ({
    id: appointment.id,
    title: appointment.service,
    client: appointment.client,
    barber: appointment.barber,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    service: appointment.service,
    price: appointment.price,
    status: appointment.status,
    date: appointment.date
  }))
}

export default function DarkCalendarWithSettings() {
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('appearance')
  const [settings, setSettings] = useState<CalendarSettings>({
    theme: 'dark',
    accentColor: 'violet',
    timeFormat: '12h',
    weekStart: 'sunday',
    defaultView: 'week',
    density: 'comfortable',
    animations: true,
    showWeekNumbers: false,
    showDeclinedEvents: false,
    colorByStatus: true,
    quickActions: true
  })

  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>(settings.defaultView)
  const [mockAppointments] = useState<Appointment[]>(() => generateMockAppointments())

  const updateSetting = <K extends keyof CalendarSettings>(key: K, value: CalendarSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const getAccentColor = () => accentColors.find(c => c.value === settings.accentColor) || accentColors[0]

  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8
    return settings.timeFormat === '12h'
      ? `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`
      : `${hour.toString().padStart(2, '0')}:00`
  })

  const weekDays = settings.weekStart === 'sunday'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const densityStyles = {
    compact: 'min-h-[50px] p-1',
    comfortable: 'min-h-[70px] p-2',
    spacious: 'min-h-[90px] p-3'
  }

  const getStatusStyle = (status: string) => {
    if (!settings.colorByStatus) {
      return `bg-gradient-to-r ${getAccentColor().gradient}`
    }

    const styles = {
      confirmed: 'bg-gradient-to-r from-emerald-600 to-teal-600',
      pending: 'bg-gradient-to-r from-amber-600 to-orange-600',
      completed: 'bg-gradient-to-r from-blue-600 to-indigo-600',
      cancelled: 'bg-gradient-to-r from-red-600 to-rose-600'
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  const settingsTabs = [
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
    { id: 'calendar', label: 'Calendar', icon: CalendarDaysIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'integrations', label: 'Integrations', icon: GlobeAltIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon }
  ]

  return (
    <div className="relative">
      {/* Main Calendar */}
      <div className="bg-gray-900/50 backdrop-blur rounded-2xl p-6 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Schedule</h2>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="bg-gray-800/50 backdrop-blur rounded-lg p-1 flex">
              {(['day', 'week', 'month'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    currentView === view
                      ? `bg-gradient-to-r ${getAccentColor().gradient} text-white shadow-lg`
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-gray-800/50 backdrop-blur border border-gray-700 hover:border-gray-600 transition-all group"
            >
              <Cog6ToothIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900/30">
          {/* Week Header */}
          <div className="grid grid-cols-8 border-b border-gray-700 bg-gray-800/50">
            <div className="p-3 text-sm font-medium text-gray-400">Time</div>
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-sm font-medium text-gray-200 text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="divide-y divide-gray-800">
            {timeSlots.map((time, hourIndex) => (
              <div key={time} className="grid grid-cols-8">
                <div className="p-3 text-sm font-medium text-gray-400 bg-gray-800/30">
                  {time}
                </div>
                {weekDays.map((_, dayIndex) => {
                  // Get appointments for this time slot and day
                  const currentHour = hourIndex + 8; // Start from 8 AM
                  const appointmentsForSlot = mockAppointments.filter(appointment => {
                    const appointmentHour = parseInt(appointment.startTime.split(':')[0]);
                    const appointmentDate = new Date(appointment.date);
                    const today = new Date();

                    // Calculate which day this slot represents (0 = today, 1 = tomorrow, etc.)
                    const slotDate = new Date(today);
                    slotDate.setDate(today.getDate() + dayIndex);

                    return appointmentHour === currentHour &&
                           appointmentDate.toDateString() === slotDate.toDateString();
                  });

                  return (
                    <div
                      key={`${time}-${dayIndex}`}
                      className={`relative border-r border-gray-800 transition-all hover:bg-gray-800/50 cursor-pointer ${densityStyles[settings.density]}`}
                    >
                      {/* Render appointments for this slot */}
                      {appointmentsForSlot.map((appointment, index) => (
                        <motion.div
                          key={appointment.id}
                          initial={settings.animations ? { opacity: 0, scale: 0.9 } : {}}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`absolute inset-x-1 ${getStatusStyle(appointment.status)} text-white rounded-lg p-2 shadow-lg cursor-pointer ${
                            index > 0 ? 'mt-2' : ''
                          }`}
                          style={{ top: index * 30 }}
                        >
                          <div className="text-xs font-medium truncate">{appointment.client}</div>
                          <div className="text-xs opacity-90 truncate">{appointment.service}</div>
                          {settings.density !== 'compact' && (
                            <div className="text-xs opacity-75">${appointment.price}</div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden border border-gray-700"
            >
              {/* Settings Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-2xl font-bold text-white">Calendar Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Settings Content */}
              <div className="flex h-[calc(80vh-88px)]">
                {/* Sidebar */}
                <div className="w-64 bg-gray-800/50 p-4 border-r border-gray-700">
                  {settingsTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2 ${
                        activeTab === tab.id
                          ? `bg-gradient-to-r ${getAccentColor().gradient} text-white shadow-lg`
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Settings Panel */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {activeTab === 'appearance' && (
                    <div className="space-y-6">
                      {/* Theme Selection */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Theme</h3>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { value: 'dark', icon: MoonIcon, label: 'Dark' },
                            { value: 'light', icon: SunIcon, label: 'Light' },
                            { value: 'auto', icon: ComputerDesktopIcon, label: 'Auto' }
                          ].map((theme) => (
                            <button
                              key={theme.value}
                              onClick={() => updateSetting('theme', theme.value as any)}
                              className={`p-4 rounded-lg border transition-all ${
                                settings.theme === theme.value
                                  ? 'border-violet-500 bg-violet-500/20'
                                  : 'border-gray-700 hover:border-gray-600'
                              }`}
                            >
                              <theme.icon className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                              <span className="text-sm text-gray-300">{theme.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Accent Color */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Accent Color</h3>
                        <div className="grid grid-cols-3 gap-3">
                          {accentColors.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => updateSetting('accentColor', color.value)}
                              className={`p-4 rounded-lg border transition-all ${
                                settings.accentColor === color.value
                                  ? 'border-white'
                                  : 'border-gray-700 hover:border-gray-600'
                              }`}
                            >
                              <div className={`h-8 w-full rounded-lg bg-gradient-to-r ${color.gradient} mb-2`} />
                              <span className="text-sm text-gray-300">{color.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Density */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Display Density</h3>
                        <div className="space-y-2">
                          {[
                            { value: 'compact', label: 'Compact', desc: 'More information in less space' },
                            { value: 'comfortable', label: 'Comfortable', desc: 'Balanced spacing' },
                            { value: 'spacious', label: 'Spacious', desc: 'Extra breathing room' }
                          ].map((density) => (
                            <label
                              key={density.value}
                              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                                settings.density === density.value
                                  ? 'border-violet-500 bg-violet-500/20'
                                  : 'border-gray-700 hover:border-gray-600'
                              }`}
                            >
                              <div>
                                <div className="font-medium text-white">{density.label}</div>
                                <div className="text-sm text-gray-400">{density.desc}</div>
                              </div>
                              <input
                                type="radio"
                                checked={settings.density === density.value}
                                onChange={() => updateSetting('density', density.value as any)}
                                className="text-violet-600 focus:ring-violet-500"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Animations */}
                      <div>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              <SparklesIcon className="w-5 h-5" />
                              Animations
                            </div>
                            <div className="text-sm text-gray-400">Smooth transitions and effects</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.animations}
                            onChange={(e) => updateSetting('animations', e.target.checked)}
                            className="w-5 h-5 text-violet-600 focus:ring-violet-500 rounded"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {activeTab === 'calendar' && (
                    <div className="space-y-6">
                      {/* Time Format */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Time Format</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => updateSetting('timeFormat', '12h')}
                            className={`p-4 rounded-lg border transition-all ${
                              settings.timeFormat === '12h'
                                ? 'border-violet-500 bg-violet-500/20'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <div className="font-medium text-white">12-hour</div>
                            <div className="text-sm text-gray-400">9:00 AM</div>
                          </button>
                          <button
                            onClick={() => updateSetting('timeFormat', '24h')}
                            className={`p-4 rounded-lg border transition-all ${
                              settings.timeFormat === '24h'
                                ? 'border-violet-500 bg-violet-500/20'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <div className="font-medium text-white">24-hour</div>
                            <div className="text-sm text-gray-400">21:00</div>
                          </button>
                        </div>
                      </div>

                      {/* Week Start */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Week Starts On</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => updateSetting('weekStart', 'sunday')}
                            className={`p-4 rounded-lg border transition-all ${
                              settings.weekStart === 'sunday'
                                ? 'border-violet-500 bg-violet-500/20'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <span className="text-white">Sunday</span>
                          </button>
                          <button
                            onClick={() => updateSetting('weekStart', 'monday')}
                            className={`p-4 rounded-lg border transition-all ${
                              settings.weekStart === 'monday'
                                ? 'border-violet-500 bg-violet-500/20'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <span className="text-white">Monday</span>
                          </button>
                        </div>
                      </div>

                      {/* Calendar Options */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white mb-4">Display Options</h3>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                          <div className="font-medium text-white">Show Week Numbers</div>
                          <input
                            type="checkbox"
                            checked={settings.showWeekNumbers}
                            onChange={(e) => updateSetting('showWeekNumbers', e.target.checked)}
                            className="w-5 h-5 text-violet-600 focus:ring-violet-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                          <div className="font-medium text-white">Show Declined Events</div>
                          <input
                            type="checkbox"
                            checked={settings.showDeclinedEvents}
                            onChange={(e) => updateSetting('showDeclinedEvents', e.target.checked)}
                            className="w-5 h-5 text-violet-600 focus:ring-violet-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                          <div className="font-medium text-white">Color by Status</div>
                          <input
                            type="checkbox"
                            checked={settings.colorByStatus}
                            onChange={(e) => updateSetting('colorByStatus', e.target.checked)}
                            className="w-5 h-5 text-violet-600 focus:ring-violet-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                          <div className="font-medium text-white">Enable Quick Actions</div>
                          <input
                            type="checkbox"
                            checked={settings.quickActions}
                            onChange={(e) => updateSetting('quickActions', e.target.checked)}
                            className="w-5 h-5 text-violet-600 focus:ring-violet-500 rounded"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Other tabs content */}
                  {activeTab === 'notifications' && (
                    <div className="text-center py-12">
                      <BellIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Notification settings coming soon</p>
                    </div>
                  )}

                  {activeTab === 'integrations' && (
                    <div className="text-center py-12">
                      <GlobeAltIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Integration settings coming soon</p>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="text-center py-12">
                      <ShieldCheckIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Security settings coming soon</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
