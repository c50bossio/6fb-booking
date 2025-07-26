'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { usePermissions } from '@/components/ProtectedRoute'
import { FranchiseHierarchy } from '@/components/navigation/FranchiseHierarchySelector'
import FranchiseNetworkDashboard from '@/components/enterprise/FranchiseNetworkDashboard'
import FranchiseRegionDashboard from '@/components/enterprise/FranchiseRegionDashboard'
import {
  franchiseNetworksAPI,
  franchiseRegionsAPI,
  franchiseGroupsAPI,
  handleFranchiseAPIError
} from '@/lib/franchise-api'
import type { 
  FranchiseNetwork, 
  FranchiseRegion, 
  FranchiseGroup, 
  FranchiseLocation 
} from '@/components/navigation/FranchiseHierarchySelector'

export default function FranchiseDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Franchise hierarchy data
  const [networks, setNetworks] = useState<FranchiseNetwork[]>([])
  const [regions, setRegions] = useState<FranchiseRegion[]>([])
  const [groups, setGroups] = useState<FranchiseGroup[]>([])
  const [locations, setLocations] = useState<FranchiseLocation[]>([])

  // Current selection state
  const [currentSelection, setCurrentSelection] = useState<FranchiseHierarchy>({})

  const { isAdmin, isSuperAdmin } = usePermissions(user)

  // Load franchise hierarchy data
  const loadFranchiseData = async () => {
    try {
      setError(null)
      
      // Load all networks
      const networksData = await franchiseNetworksAPI.list({
        include_metrics: true
      })
      setNetworks(networksData)

      // If there's only one network, auto-select it
      if (networksData.length === 1) {
        const network = networksData[0]
        setCurrentSelection({ network })
        
        // Load regions for the selected network
        const regionsData = await franchiseRegionsAPI.list(network.id, {
          include_metrics: true
        })
        setRegions(regionsData)
      }
    } catch (err) {
      console.error('Failed to load franchise data:', err)
      setError(handleFranchiseAPIError(err).message)
    }
  }

  // Handle hierarchy selection changes
  const handleSelectionChange = async (newSelection: FranchiseHierarchy) => {
    try {
      setCurrentSelection(newSelection)

      // Load regions when network changes
      if (newSelection.network && newSelection.network.id !== currentSelection.network?.id) {
        const regionsData = await franchiseRegionsAPI.list(newSelection.network.id, {
          include_metrics: true
        })
        setRegions(regionsData)
        setGroups([]) // Clear groups when network changes
        setLocations([]) // Clear locations when network changes
      }

      // Load groups when region changes
      if (newSelection.region && newSelection.region.id !== currentSelection.region?.id) {
        const groupsData = await franchiseGroupsAPI.list(newSelection.region.id, {
          include_metrics: true
        })
        setGroups(groupsData)
        setLocations([]) // Clear locations when region changes
      }

      // Load locations when group changes
      if (newSelection.group && newSelection.group.id !== currentSelection.group?.id) {
        // TODO: Implement location loading based on group
        // This would typically call a locations API endpoint
        console.log('Loading locations for group:', newSelection.group.id)
      }
    } catch (err) {
      console.error('Failed to load hierarchy data:', err)
      setError(handleFranchiseAPIError(err).message)
    }
  }

  // Initial data loading
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        
        // Check authentication and authorization
        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        
        setUser(userData)
        
        // Check if user has franchise access (super_admin, admin, or franchise_admin)
        if (!['super_admin', 'admin', 'franchise_admin'].includes(userData.role)) {
          router.push('/dashboard')
          return
        }
        
        // Load franchise data
        await loadFranchiseData()
      } catch (err) {
        console.error('Failed to initialize franchise dashboard:', err)
        setError(handleFranchiseAPIError(err).message)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [router])

  if (loading) {
    return <PageLoading />
  }

  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={() => {
          setError(null)
          loadFranchiseData()
        }} 
      />
    )
  }

  if (!user) {
    return null
  }

  // Determine which dashboard to show based on current selection
  const renderDashboard = () => {
    if (currentSelection.region) {
      // Show region dashboard when region is selected
      return (
        <FranchiseRegionDashboard
          currentSelection={currentSelection}
          onSelectionChange={handleSelectionChange}
          networks={networks}
          regions={regions}
          groups={groups}
          locations={locations}
          enableRealTime={true}
        />
      )
    } else if (currentSelection.network) {
      // Show network dashboard when network is selected (but no region)
      return (
        <FranchiseNetworkDashboard
          currentSelection={currentSelection}
          onSelectionChange={handleSelectionChange}
          networks={networks}
          regions={regions}
          groups={groups}
          locations={locations}
          enableRealTime={true}
          enableForecasts={isSuperAdmin}
        />
      )
    } else {
      // Show network selection screen
      return (
        <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 p-3 bg-primary-100 dark:bg-primary-900 rounded-full">
                <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Franchise Network Management
              </h1>
              
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                Welcome to the enterprise franchise dashboard. Select a franchise network to begin monitoring 
                performance, compliance, and growth across your network.
              </p>

              {networks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No franchise networks found.
                  </p>
                  {isSuperAdmin && (
                    <button
                      onClick={() => router.push('/enterprise/franchise/setup')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Create Franchise Network
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {networks.map((network) => (
                    <div
                      key={network.id}
                      onClick={() => setCurrentSelection({ network })}
                      className="cursor-pointer group"
                    >
                      <div className="p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300 group-hover:scale-105">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                            <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            network.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          }`}>
                            {network.status}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {network.name}
                        </h3>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {network.brand} • {network.network_type.replace('_', ' ')}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Locations</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {network.current_locations_count || 0} / {network.total_locations_target || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Regions</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {network.total_regions || 0}
                            </p>
                          </div>
                        </div>
                        
                        {network.network_revenue_ytd && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">YTD Revenue</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(network.network_revenue_ytd)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }
  }

  return renderDashboard()
}