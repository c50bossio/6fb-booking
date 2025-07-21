'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getTierDashboardMetrics,
  getClientTierAnalysis,
  updateClientTier,
  bulkCalculateClientTiers,
  type TierDashboardMetrics,
  type ClientTierAnalysis,
  type BulkTierAnalysisResult
} from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface UseClientTiersOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useClientTiers(options: UseClientTiersOptions = {}) {
  const { autoRefresh = false, refreshInterval = 300000 } = options // 5 minutes default
  const { toast } = useToast()

  // State management
  const [dashboardMetrics, setDashboardMetrics] = useState<TierDashboardMetrics | null>(null)
  const [clientTierCache, setClientTierCache] = useState<Map<number, ClientTierAnalysis>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Individual operation states
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [loadingClientAnalysis, setLoadingClientAnalysis] = useState<Set<number>>(new Set())
  const [updatingTier, setUpdatingTier] = useState<Set<number>>(new Set())
  const [recalculating, setRecalculating] = useState(false)

  // Load dashboard metrics
  const loadDashboardMetrics = useCallback(async () => {
    try {
      setLoadingDashboard(true)
      setError(null)
      const metrics = await getTierDashboardMetrics()
      setDashboardMetrics(metrics)
      return metrics
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load dashboard metrics'
      setError(errorMessage)
      console.error('Dashboard metrics error:', err)
      throw err
    } finally {
      setLoadingDashboard(false)
    }
  }, [])

  // Get client tier analysis with caching
  const getClientTier = useCallback(async (clientId: number, forceRefresh = false): Promise<ClientTierAnalysis> => {
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && clientTierCache.has(clientId)) {
      return clientTierCache.get(clientId)!
    }

    try {
      setLoadingClientAnalysis(prev => new Set(prev).add(clientId))
      setError(null)
      
      const analysis = await getClientTierAnalysis(clientId)
      
      // Update cache
      setClientTierCache(prev => new Map(prev).set(clientId, analysis))
      
      return analysis
    } catch (err: any) {
      const errorMessage = err?.message || `Failed to load tier analysis for client ${clientId}`
      setError(errorMessage)
      console.error('Client tier analysis error:', err)
      throw err
    } finally {
      setLoadingClientAnalysis(prev => {
        const updated = new Set(prev)
        updated.delete(clientId)
        return updated
      })
    }
  }, [clientTierCache])

  // Update client tier in database
  const updateClientTierInDB = useCallback(async (clientId: number) => {
    try {
      setUpdatingTier(prev => new Set(prev).add(clientId))
      setError(null)
      
      const result = await updateClientTier(clientId)
      
      // Invalidate cache for this client to force refresh
      setClientTierCache(prev => {
        const updated = new Map(prev)
        updated.delete(clientId)
        return updated
      })
      
      // Refresh dashboard metrics
      await loadDashboardMetrics()
      
      toast({
        title: 'Success',
        description: `Client tier updated to ${result.primary_tier} (${result.confidence_score} confidence)`,
      })
      
      return result
    } catch (err: any) {
      const errorMessage = err?.message || `Failed to update tier for client ${clientId}`
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw err
    } finally {
      setUpdatingTier(prev => {
        const updated = new Set(prev)
        updated.delete(clientId)
        return updated
      })
    }
  }, [loadDashboardMetrics, toast])

  // Bulk recalculate all client tiers
  const recalculateAllTiers = useCallback(async (clientIds?: number[]): Promise<BulkTierAnalysisResult> => {
    try {
      setRecalculating(true)
      setError(null)
      
      const result = await bulkCalculateClientTiers(clientIds)
      
      // Clear cache to force refresh of all data
      setClientTierCache(new Map())
      
      // Refresh dashboard metrics
      await loadDashboardMetrics()
      
      toast({
        title: 'Bulk Calculation Complete',
        description: `Processed ${result.total_processed} clients. ${result.successful_analyses} successful, ${result.errors} errors.`,
      })
      
      return result
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to recalculate client tiers'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw err
    } finally {
      setRecalculating(false)
    }
  }, [loadDashboardMetrics, toast])

  // Preload client tiers for multiple clients
  const preloadClientTiers = useCallback(async (clientIds: number[]) => {
    const uncachedIds = clientIds.filter(id => !clientTierCache.has(id))
    
    if (uncachedIds.length === 0) return
    
    try {
      setLoading(true)
      
      // Load in batches to avoid overwhelming the API
      const batchSize = 10
      for (let i = 0; i < uncachedIds.length; i += batchSize) {
        const batch = uncachedIds.slice(i, i + batchSize)
        const promises = batch.map(id => getClientTier(id))
        await Promise.allSettled(promises)
      }
    } catch (err) {
      console.error('Error preloading client tiers:', err)
    } finally {
      setLoading(false)
    }
  }, [clientTierCache, getClientTier])

  // Clear cache for specific clients or all
  const clearCache = useCallback((clientIds?: number[]) => {
    if (clientIds) {
      setClientTierCache(prev => {
        const updated = new Map(prev)
        clientIds.forEach(id => updated.delete(id))
        return updated
      })
    } else {
      setClientTierCache(new Map())
    }
  }, [])

  // Get cached tier data without making API calls
  const getCachedTierData = useCallback((clientId: number) => {
    return clientTierCache.get(clientId) || null
  }, [clientTierCache])

  // Get tier statistics from dashboard metrics
  const getTierStats = useCallback(() => {
    if (!dashboardMetrics) return null
    
    return {
      totalClients: dashboardMetrics.total_clients,
      distribution: dashboardMetrics.tier_distribution,
      highValueClients: dashboardMetrics.high_value_clients,
      newClients: dashboardMetrics.new_clients,
      totalGrowthOpportunity: dashboardMetrics.total_growth_opportunity,
      topOpportunities: dashboardMetrics.revenue_opportunities,
      averageConfidence: dashboardMetrics.average_confidence
    }
  }, [dashboardMetrics])

  // Initial load and auto-refresh setup
  useEffect(() => {
    loadDashboardMetrics()
    
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(loadDashboardMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [loadDashboardMetrics, autoRefresh, refreshInterval])

  return {
    // Data
    dashboardMetrics,
    clientTierCache,
    error,
    
    // Loading states
    loading: loading || loadingDashboard,
    loadingDashboard,
    loadingClientAnalysis,
    updatingTier,
    recalculating,
    
    // Methods
    loadDashboardMetrics,
    getClientTier,
    updateClientTierInDB,
    recalculateAllTiers,
    preloadClientTiers,
    clearCache,
    getCachedTierData,
    getTierStats,
    
    // Helper methods
    isLoadingClient: (clientId: number) => loadingClientAnalysis.has(clientId),
    isUpdatingClient: (clientId: number) => updatingTier.has(clientId),
    hasCachedData: (clientId: number) => clientTierCache.has(clientId),
    cacheSize: clientTierCache.size
  }
}

export default useClientTiers