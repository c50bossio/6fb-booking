'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import BaseModal from './BaseModal'
import { useTheme } from '@/contexts/ThemeContext'
import { clientsService, Client, ClientHistory } from '@/lib/api/clients'
import Notification from '@/components/Notification'
import {
  UserIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  DocumentArrowDownIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  MapPinIcon,
  TrophyIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'

// Message form validation schema
const messageSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  send_email: z.boolean().default(true),
  send_sms: z.boolean().default(false)
})

type MessageFormData = z.infer<typeof messageSchema>

interface Props {
  isOpen: boolean
  onClose: () => void
  client: Client | null
  initialTab?: TabType
}

type TabType = 'appointments' | 'statistics' | 'communication'

export default function ClientHistoryModal({ isOpen, onClose, client, initialTab }: Props) {
  const { theme, getThemeColors } = useTheme()
  const themeColors = getThemeColors()

  const [activeTab, setActiveTab] = useState<TabType>('appointments')
  const [clientHistory, setClientHistory] = useState<ClientHistory | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messageSuccess, setMessageSuccess] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      send_email: true,
      send_sms: false
    }
  })

  // Load client history when modal opens
  useEffect(() => {
    if (isOpen && client) {
      loadClientHistory()
      setActiveTab(initialTab || 'appointments')
      setMessageSuccess(false)
    }
  }, [isOpen, client, initialTab])

  const loadClientHistory = async () => {
    if (!client) return

    setIsLoadingHistory(true)
    try {
      const response = await clientsService.getClientHistory(client.id)
      setClientHistory(response.data)
    } catch (error) {
      console.error('Failed to load client history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const onSubmitMessage = async (data: MessageFormData) => {
    if (!client) return

    setIsSendingMessage(true)
    try {
      await clientsService.sendClientMessage(client.id, data)
      setMessageSuccess(true)
      reset()
      setTimeout(() => setMessageSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error notification for better user feedback
      setNotification({
        type: 'error',
        title: 'Failed to send message',
        message: 'Please try again later or contact support if the issue persists.'
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const [isExporting, setIsExporting] = useState(false)

  const exportHistory = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!client || isExporting) return

    setIsExporting(true)
    try {
      const blob = await clientsService.exportClients('csv')
      const url = window.URL.createObjectURL(blob as Blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${client.first_name}_${client.last_name}_history.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      setNotification({
        type: 'success',
        title: 'Export successful',
        message: `History for ${client.first_name} ${client.last_name} has been exported.`
      })
    } catch (error) {
      console.error('Failed to export history:', error)
      setNotification({
        type: 'error',
        title: 'Failed to export history',
        message: 'Please try again later or contact support if the issue persists.'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      completed: { color: '#047857', bg: '#d1fae5', label: 'Completed' },
      confirmed: { color: '#1d4ed8', bg: '#dbeafe', label: 'Confirmed' },
      pending: { color: '#b45309', bg: '#fef3c7', label: 'Pending' },
      cancelled: { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled' },
      no_show: { color: '#6b7280', bg: '#f3f4f6', label: 'No Show' }
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.pending
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isUp: false, isDown: false }
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      isUp: change > 0,
      isDown: change < 0
    }
  }

  const tabs = [
    { id: 'appointments', name: 'Appointments', icon: CalendarDaysIcon },
    { id: 'statistics', name: 'Statistics', icon: ChartBarIcon },
    { id: 'communication', name: 'Communication', icon: ChatBubbleLeftRightIcon }
  ]

  if (!client) return null

  const clientStatus = clientsService.getClientStatusDisplay(client)
  const clientValue = clientsService.getClientValueScore(client)

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      className="max-h-[90vh] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2C2D3A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gradient-to-br from-[#20D9D2] to-teal-600 rounded-full flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-[#FFFFFF]">
                {clientsService.getClientFullName(client)}
              </h2>
              <div className="flex items-center space-x-3 mt-1">
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: clientStatus.bgColor, color: clientStatus.color }}
                >
                  {clientStatus.label}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium`}
                      style={{ backgroundColor: `${clientValue.color}20`, color: clientValue.color }}>
                  {clientValue.level} Value
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 dark:bg-[#24252E] rounded-lg p-3">
              <div className="text-2xl font-bold text-[#20D9D2]">{client.total_visits}</div>
              <div className="text-xs text-gray-600 dark:text-[#8B92A5]">Visits</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#24252E] rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(client.total_spent)}</div>
              <div className="text-xs text-gray-600 dark:text-[#8B92A5]">Spent</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#24252E] rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(client.average_ticket)}</div>
              <div className="text-xs text-gray-600 dark:text-[#8B92A5]">Avg Ticket</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab(tab.id as TabType);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#20D9D2] text-white'
                    : 'text-gray-600 dark:text-[#8B92A5] hover:text-gray-900 dark:hover:text-[#FFFFFF] hover:bg-gray-100 dark:hover:bg-[#24252E]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[60vh]">
        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF]">
                Appointment History
              </h3>
              <button
                onClick={exportHistory}
                disabled={isExporting}
                className="premium-button-secondary text-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    <span>Export</span>
                  </>
                )}
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#20D9D2]"></div>
              </div>
            ) : clientHistory?.appointments.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-[#FFFFFF] mb-2">No appointments yet</h3>
                <p className="text-gray-600 dark:text-[#8B92A5]">
                  This client hasn't scheduled any appointments.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientHistory?.appointments.map((appointment) => {
                  const status = getStatusBadge(appointment.status)
                  return (
                    <div
                      key={appointment.id}
                      className="bg-white dark:bg-[#24252E] border border-gray-200 dark:border-[#2C2D3A] rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                            <div className="h-full w-full bg-white dark:bg-[#24252E] rounded-lg flex items-center justify-center m-0.5">
                              <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900 dark:text-[#FFFFFF]">
                                {appointment.service}
                              </h4>
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: status.bg, color: status.color }}
                              >
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-[#8B92A5] mt-1">
                              <span className="flex items-center space-x-1">
                                <CalendarDaysIcon className="h-4 w-4" />
                                <span>{formatDate(appointment.date)}</span>
                              </span>
                              {appointment.time && (
                                <span className="flex items-center space-x-1">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>{appointment.time}</span>
                                </span>
                              )}
                              <span className="flex items-center space-x-1">
                                <UserIcon className="h-4 w-4" />
                                <span>{appointment.barber}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(appointment.cost)}
                          </div>
                          {appointment.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-32 truncate">
                              {appointment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF]">
              Client Analytics
            </h3>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <TrophyIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Value Score</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {clientValue.score}/100
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">{clientValue.level}</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <HeartIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Loyalty</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {client.visit_frequency_days ? Math.round(30 / client.visit_frequency_days) : 0}x
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Per month</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <StarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Referrals</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {client.referral_count}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Total</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">No Shows</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {client.no_show_count}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {client.total_visits > 0 ? Math.round((client.no_show_count / client.total_visits) * 100) : 0}% rate
                  </div>
                </div>
              </div>
            </div>

            {/* Service Breakdown */}
            {clientHistory && (
              <div className="bg-white dark:bg-[#24252E] border border-gray-200 dark:border-[#2C2D3A] rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF] mb-4">
                  Service Preferences
                </h4>
                <div className="space-y-3">
                  {Object.entries(clientHistory.services_breakdown).map(([service, count]) => {
                    const percentage = Math.round((count / clientHistory.total_appointments) * 100)
                    return (
                      <div key={service} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-[#20D9D2] rounded-full"></div>
                          <span className="text-gray-900 dark:text-[#FFFFFF] font-medium">{service}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-[#2C2D3A] rounded-full h-2">
                            <div
                              className="bg-[#20D9D2] h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-[#8B92A5] w-12 text-right">
                            {count}x
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Timeline Metrics */}
            <div className="bg-white dark:bg-[#24252E] border border-gray-200 dark:border-[#2C2D3A] rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF] mb-4">
                Visit Timeline
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-[#8B92A5] mb-1">First Visit</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF]">
                    {formatDate(client.created_at)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-[#8B92A5] mb-1">Last Visit</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF]">
                    {client.last_visit_date ? formatDate(client.last_visit_date) : 'Never'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-[#8B92A5] mb-1">Visit Frequency</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF]">
                    {client.visit_frequency_days ? `${client.visit_frequency_days} days` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Communication Tab */}
        {activeTab === 'communication' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF]">
              Client Communication
            </h3>

            {/* Communication Preferences */}
            <div className="bg-white dark:bg-[#24252E] border border-gray-200 dark:border-[#2C2D3A] rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF] mb-4">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-[#8B92A5]">Email</div>
                    <div className="font-medium text-gray-900 dark:text-[#FFFFFF]">{client.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {client.email_enabled ? '✓ Enabled' : '✗ Disabled'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-[#8B92A5]">Phone</div>
                    <div className="font-medium text-gray-900 dark:text-[#FFFFFF]">{client.phone}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {client.sms_enabled ? '✓ SMS Enabled' : '✗ SMS Disabled'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Message Form */}
            <div className="bg-white dark:bg-[#24252E] border border-gray-200 dark:border-[#2C2D3A] rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <PaperAirplaneIcon className="h-5 w-5 text-[#20D9D2]" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF]">
                  Send Message
                </h4>
              </div>

              {messageSuccess && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-800 dark:text-green-200">Message sent successfully!</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmitMessage)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    {...register('subject')}
                    type="text"
                    className="premium-input w-full"
                    placeholder="Enter message subject"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.subject.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    {...register('message')}
                    rows={4}
                    className="premium-input w-full resize-none"
                    placeholder="Type your message here..."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      {...register('send_email')}
                      type="checkbox"
                      className="h-4 w-4 text-[#20D9D2] focus:ring-[#20D9D2] border-gray-300 rounded"
                      disabled={!client.email_enabled}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Send via Email {!client.email_enabled && '(Disabled)'}
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      {...register('send_sms')}
                      type="checkbox"
                      className="h-4 w-4 text-[#20D9D2] focus:ring-[#20D9D2] border-gray-300 rounded"
                      disabled={!client.sms_enabled}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Send via SMS {!client.sms_enabled && '(Disabled)'}
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSendingMessage}
                  className="premium-button flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Recent Communication History */}
            <div className="bg-white dark:bg-[#24252E] border border-gray-200 dark:border-[#2C2D3A] rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF] mb-4">
                Recent Communications
              </h4>
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-[#FFFFFF] mb-2">No recent messages</h3>
                <p className="text-gray-600 dark:text-[#8B92A5]">
                  Communication history will appear here once you start messaging this client.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-[#2C2D3A] bg-gray-50 dark:bg-[#1A1B23]">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-[#8B92A5]">
            Client since {formatDate(client.created_at)} • Last visit {clientsService.formatLastVisit(client)}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="premium-button-secondary"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </BaseModal>
  )
}
