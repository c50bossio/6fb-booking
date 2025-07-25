'use client'

import { useState, useCallback, useEffect } from 'react'

export interface CalendarClientManagerState {
  isVisible: boolean
  selectedClient: any | null
  searchTerm: string
  filterStatus: 'all' | 'active' | 'vip' | 'new'
  sortBy: 'name' | 'last_appointment' | 'total_revenue' | 'total_appointments'
  activeTab: 'overview' | 'history' | 'notes'
}

export function useCalendarClientManager() {
  const [state, setState] = useState<CalendarClientManagerState>({
    isVisible: false,
    selectedClient: null,
    searchTerm: '',
    filterStatus: 'all',
    sortBy: 'name',
    activeTab: 'overview'
  })

  const updateState = useCallback((updates: Partial<CalendarClientManagerState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const showClientManager = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: true }))
  }, [])

  const hideClientManager = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }))
  }, [])

  const toggleClientManager = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: !prev.isVisible }))
  }, [])

  const selectClient = useCallback((client: any) => {
    setState(prev => ({ 
      ...prev, 
      selectedClient: client,
      activeTab: 'overview' // Reset to overview when selecting new client
    }))
  }, [])

  const clearSelectedClient = useCallback(() => {
    setState(prev => ({ ...prev, selectedClient: null }))
  }, [])

  const setActiveTab = useCallback((tab: 'overview' | 'history' | 'notes') => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }, [])

  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }))
  }, [])

  const setFilterStatus = useCallback((status: 'all' | 'active' | 'vip' | 'new') => {
    setState(prev => ({ ...prev, filterStatus: status }))
  }, [])

  const setSortBy = useCallback((sortBy: 'name' | 'last_appointment' | 'total_revenue' | 'total_appointments') => {
    setState(prev => ({ ...prev, sortBy }))
  }, [])

  // Auto-select client when appointment is selected
  const syncWithAppointment = useCallback((appointment: any) => {
    if (appointment?.client && appointment.client.id !== state.selectedClient?.id) {
      selectClient(appointment.client)
    }
  }, [state.selectedClient?.id, selectClient])

  return {
    state,
    updateState,
    showClientManager,
    hideClientManager,
    toggleClientManager,
    selectClient,
    clearSelectedClient,
    setActiveTab,
    setSearchTerm,
    setFilterStatus,
    setSortBy,
    syncWithAppointment
  }
}