'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { recurringBookingsService } from '@/lib/api/recurring-bookings';

interface AppointmentSeries {
  id: number;
  series_token: string;
  series_name?: string;
  client_name: string;
  barber_name: string;
  service_name: string;
  recurrence_pattern: string;
  preferred_time: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  payment_frequency: 'per_appointment' | 'monthly' | 'upfront';
  series_discount_percent: number;
  total_appointments_created: number;
  total_appointments_completed: number;
  next_appointment_date?: string;
  is_subscription_enabled: boolean;
}

export default function RecurringBookingsPage() {
  const [series, setSeries] = useState<AppointmentSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      setLoading(true);
      const data = await recurringBookingsService.getAllSeries();
      setSeries(data);
    } catch (error) {
      console.error('Failed to load recurring series:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseSeries = async (seriesId: number) => {
    try {
      await recurringBookingsService.pauseSeries(seriesId, 'Paused by admin');
      loadSeries();
    } catch (error) {
      console.error('Failed to pause series:', error);
    }
  };

  const handleResumeSeries = async (seriesId: number) => {
    try {
      await recurringBookingsService.resumeSeries(seriesId, 'Resumed by admin');
      loadSeries();
    } catch (error) {
      console.error('Failed to resume series:', error);
    }
  };

  const handleCancelSeries = async (seriesId: number) => {
    if (window.confirm('Are you sure you want to cancel this recurring series?')) {
      try {
        await recurringBookingsService.cancelSeries(seriesId, 'Cancelled by admin');
        loadSeries();
      } catch (error) {
        console.error('Failed to cancel series:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'monthly': return 'text-blue-600 bg-blue-100';
      case 'upfront': return 'text-green-600 bg-green-100';
      case 'per_appointment': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatRecurrencePattern = (pattern: string) => {
    switch (pattern) {
      case 'weekly': return 'Weekly';
      case 'biweekly': return 'Bi-weekly';
      case 'monthly': return 'Monthly';
      case 'every_4_weeks': return 'Every 4 weeks';
      case 'every_6_weeks': return 'Every 6 weeks';
      case 'every_8_weeks': return 'Every 8 weeks';
      default: return pattern;
    }
  };

  const filteredSeries = series.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const matchesSearch = searchTerm === '' ||
      s.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.barber_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recurring Bookings</h1>
        <p className="text-gray-600 mt-2">
          Manage recurring appointment series and subscription bookings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Series</p>
              <p className="text-2xl font-bold text-gray-900">
                {series.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">
                {series.reduce((sum, s) => sum + s.total_appointments_created, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">
                {series.filter(s => s.is_subscription_enabled).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {series.length > 0
                  ? Math.round((series.reduce((sum, s) => sum + s.total_appointments_completed, 0) /
                      series.reduce((sum, s) => sum + s.total_appointments_created, 0)) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex space-x-1">
              {['all', 'active', 'paused', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filter === status
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search series..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                New Series
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Series List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recurring Series ({filteredSeries.length})
          </h3>

          {filteredSeries.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No recurring series found</p>
              <p className="text-gray-400">Create a new recurring series to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSeries.map((seriesItem) => (
                <div
                  key={seriesItem.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {seriesItem.series_name || `${seriesItem.service_name} Series`}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(seriesItem.status)}`}>
                          {seriesItem.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentMethodColor(seriesItem.payment_frequency)}`}>
                          {seriesItem.payment_frequency.replace('_', ' ')}
                        </span>
                        {seriesItem.is_subscription_enabled && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full text-purple-600 bg-purple-100">
                            Subscription
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>{seriesItem.client_name} → {seriesItem.barber_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatRecurrencePattern(seriesItem.recurrence_pattern)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          <span>{seriesItem.preferred_time}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Start:</span> {seriesItem.start_date}
                        </div>
                        <div>
                          <span className="font-medium">Appointments:</span> {seriesItem.total_appointments_completed}/{seriesItem.total_appointments_created}
                        </div>
                        <div>
                          <span className="font-medium">Discount:</span> {seriesItem.series_discount_percent}%
                        </div>
                      </div>

                      {seriesItem.next_appointment_date && (
                        <div className="mt-3 text-sm">
                          <span className="font-medium text-gray-700">Next appointment:</span>
                          <span className="text-blue-600 ml-2">{seriesItem.next_appointment_date}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-6">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Edit Series"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>

                      {seriesItem.status === 'active' ? (
                        <button
                          onClick={() => handlePauseSeries(seriesItem.id)}
                          className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                          title="Pause Series"
                        >
                          <PauseIcon className="h-5 w-5" />
                        </button>
                      ) : seriesItem.status === 'paused' ? (
                        <button
                          onClick={() => handleResumeSeries(seriesItem.id)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Resume Series"
                        >
                          <PlayIcon className="h-5 w-5" />
                        </button>
                      ) : null}

                      {seriesItem.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelSeries(seriesItem.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Cancel Series"
                        >
                          <StopIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
