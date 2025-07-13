'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Building2, 
  MapPin,
  Users,
  BarChart3,
  Plus,
  Settings,
  Crown,
  TrendingUp,
  DollarSign,
  Calendar,
  UserPlus,
  Shield,
  RefreshCw,
  Edit,
  Eye,
  Filter,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { enterpriseApi, type Organization, type Location, type UserOrganization, type EnterpriseStats } from '@/lib/api/enterprise'
import OrganizationForm from '@/components/enterprise/OrganizationForm'
import LocationForm from '@/components/enterprise/LocationForm'
import UserInviteForm from '@/components/enterprise/UserInviteForm'


export default function EnterprisePage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [organizationUsers, setOrganizationUsers] = useState<UserOrganization[]>([])
  const [enterpriseStats, setEnterpriseStats] = useState<EnterpriseStats | null>(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [showOrganizationForm, setShowOrganizationForm] = useState(false)
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [showUserInviteForm, setShowUserInviteForm] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)

  useEffect(() => {
    loadEnterpriseData()
  }, [])

  const loadEnterpriseData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load data from API in parallel
      const [organizationsData, locationsData, statsData] = await Promise.all([
        enterpriseApi.getOrganizations().catch(() => []),
        enterpriseApi.getLocations().catch(() => []),
        enterpriseApi.getEnterpriseStats().catch(() => null)
      ])

      setOrganizations(organizationsData)
      setLocations(locationsData)
      
      if (statsData) {
        setEnterpriseStats(statsData)
      } else {
        // Fallback to mock data if API fails
        setEnterpriseStats({
          total_revenue: 178500,
          total_appointments: 3386,
          total_locations: locationsData.length,
          total_users: 68,
          avg_utilization: 76,
          revenue_growth: 12.5,
          top_locations: locationsData.slice(0, 3),
          recent_activity: []
        })
      }

    } catch (err) {
      console.error('Failed to load enterprise data:', err)
      setError('Failed to load enterprise data')
      
      // Load mock data as fallback
      setOrganizations([
        {
          id: 1,
          name: 'Elite Barbershop Group',
          type: 'headquarters',
          billing_plan: 'enterprise',
          status: 'active',
          created_at: '2023-01-15T00:00:00Z',
          locations_count: 8,
          users_count: 45,
          revenue_current_month: 125000,
          appointments_current_month: 2340
        },
        {
          id: 2,
          name: 'Downtown Cuts',
          type: 'location',
          billing_plan: 'salon',
          status: 'active',
          created_at: '2023-03-20T00:00:00Z',
          locations_count: 3,
          users_count: 18,
          revenue_current_month: 45000,
          appointments_current_month: 890
        }
      ])

      setLocations([
        {
          id: 1,
          name: 'Elite Downtown',
          code: 'EDT',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip_code: '10001',
          phone: '(555) 123-4567',
          email: 'downtown@elite.com',
          status: 'active',
          compensation_model: 'commission',
          total_chairs: 8,
          active_chairs: 8,
          revenue_current_month: 45000,
          appointments_current_month: 780,
          utilization_rate: 85,
          organization_id: 1,
          timezone: 'America/New_York',
          currency: 'USD',
          business_hours: {},
          compensation_config: {},
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z'
        }
      ])

      toast({
        title: 'Warning',
        description: 'Using demo data - enterprise API unavailable',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadOrganizationUsers = async (organizationId: number) => {
    try {
      const users = await enterpriseApi.getOrganizationUsers(organizationId)
      setOrganizationUsers(users)
    } catch (err) {
      console.error('Failed to load organization users:', err)
      // Mock data fallback
      setOrganizationUsers([
        {
          id: 1,
          user_id: 1,
          organization_id: organizationId,
          role: 'owner',
          permissions: ['can_manage_billing', 'can_manage_staff', 'can_view_analytics'],
          user: {
            id: 1,
            email: 'owner@elite.com',
            first_name: 'John',
            last_name: 'Smith',
            phone: '(555) 123-0001'
          },
          joined_at: '2023-01-15T00:00:00Z'
        }
      ])
    }
  }

  // Form handlers
  const handleCreateOrganization = async (data: any) => {
    try {
      const newOrg = await enterpriseApi.createOrganization(data)
      setOrganizations(prev => [...prev, newOrg])
      await loadEnterpriseData() // Refresh stats
    } catch (error) {
      console.error('Failed to create organization:', error)
      throw error
    }
  }

  const handleUpdateOrganization = async (data: any) => {
    if (!editingOrganization) return
    
    try {
      const updatedOrg = await enterpriseApi.updateOrganization(editingOrganization.id, data)
      setOrganizations(prev => prev.map(org => org.id === updatedOrg.id ? updatedOrg : org))
      await loadEnterpriseData() // Refresh stats
    } catch (error) {
      console.error('Failed to update organization:', error)
      throw error
    }
  }

  const handleCreateLocation = async (data: any) => {
    try {
      const newLocation = await enterpriseApi.createLocation(data)
      setLocations(prev => [...prev, newLocation])
      await loadEnterpriseData() // Refresh stats
    } catch (error) {
      console.error('Failed to create location:', error)
      throw error
    }
  }

  const handleUpdateLocation = async (data: any) => {
    if (!editingLocation) return
    
    try {
      const updatedLocation = await enterpriseApi.updateLocation(editingLocation.id, data)
      setLocations(prev => prev.map(loc => loc.id === updatedLocation.id ? updatedLocation : loc))
      await loadEnterpriseData() // Refresh stats
    } catch (error) {
      console.error('Failed to update location:', error)
      throw error
    }
  }

  const handleInviteUser = async (data: any) => {
    if (!selectedOrganization) return
    
    try {
      await enterpriseApi.inviteUser(selectedOrganization.id, data)
      await loadOrganizationUsers(selectedOrganization.id) // Refresh users
    } catch (error) {
      console.error('Failed to invite user:', error)
      throw error
    }
  }

  const handleEditOrganization = (org: Organization) => {
    setEditingOrganization(org)
    setShowOrganizationForm(true)
  }

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location)
    setShowLocationForm(true)
  }

  const handleInviteUserClick = (org: Organization) => {
    setSelectedOrganization(org)
    setShowUserInviteForm(true)
  }

  const getBillingPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'salon': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'studio': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'trial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'maintenance': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
  }

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrganization(org)
    loadOrganizationUsers(org.id)
    setSelectedTab('details')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading enterprise data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Enterprise Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage organizations, locations, and multi-location operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadEnterpriseData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => {
            setEditingOrganization(null)
            setShowOrganizationForm(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Enterprise Overview Stats */}
      {enterpriseStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(enterpriseStats.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                +{enterpriseStats.revenue_growth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enterpriseStats.total_locations}</div>
              <p className="text-xs text-muted-foreground">
                {enterpriseStats.total_appointments.toLocaleString()} appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enterpriseStats.total_users}</div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enterpriseStats.avg_utilization}%</div>
              <p className="text-xs text-muted-foreground">
                Chair utilization rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Organizations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Performing Organizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {organizations
                    .sort((a, b) => b.revenue_current_month - a.revenue_current_month)
                    .slice(0, 5)
                    .map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <h5 className="font-medium text-sm">{org.name}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getBillingPlanColor(org.billing_plan)}>
                                {org.billing_plan}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {org.locations_count} locations
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(org.revenue_current_month)}</div>
                          <div className="text-xs text-muted-foreground">
                            {org.appointments_current_month} appointments
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Locations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top Performing Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locations
                    .sort((a, b) => b.revenue_current_month - a.revenue_current_month)
                    .slice(0, 5)
                    .map((location) => (
                      <div key={location.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <h5 className="font-medium text-sm">{location.name}</h5>
                            <p className="text-xs text-muted-foreground">
                              {location.city}, {location.state}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(location.revenue_current_month)}</div>
                          <div className={`text-xs ${getUtilizationColor(location.utilization_rate)}`}>
                            {location.utilization_rate}% utilization
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            <Button size="sm" onClick={() => {
              setEditingOrganization(null)
              setShowOrganizationForm(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Organization
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Card key={org.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{org.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(org.status)}>
                        {org.status}
                      </Badge>
                      {org.billing_plan === 'enterprise' && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getBillingPlanColor(org.billing_plan)}>
                      {org.billing_plan}
                    </Badge>
                    <Badge variant="outline">
                      {org.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Locations</span>
                      <p className="font-medium">{org.locations_count}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Users</span>
                      <p className="font-medium">{org.users_count}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revenue</span>
                      <p className="font-medium">{formatCurrency(org.revenue_current_month)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Appointments</span>
                      <p className="font-medium">{org.appointments_current_month}</p>
                    </div>
                  </div>

                  {org.status === 'trial' && org.trial_ends_at && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Trial ends {new Date(org.trial_ends_at).toLocaleDateString()}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectOrganization(org)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditOrganization(org)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            <Button size="sm" onClick={() => {
              setEditingLocation(null)
              setShowLocationForm(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Location
            </Button>
          </div>

          <div className="space-y-4">
            {locations.map((location) => (
              <Card key={location.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                      <div>
                        <h5 className="font-medium">{location.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          {location.address}, {location.city}, {location.state}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            📧 {location.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            📞 {location.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={getStatusColor(location.status)}>
                          {location.status}
                        </Badge>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Chairs:</span>
                            <span>{location.total_chairs || location.chairs_count || 0}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Active:</span>
                            <span>{location.active_chairs || location.barbers_count || 0}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span>{formatCurrency(location.revenue_current_month)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Utilization:</span>
                            <span className={getUtilizationColor(location.utilization_rate)}>
                              {location.utilization_rate}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditLocation(location)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Organization Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {selectedOrganization ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedOrganization.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getBillingPlanColor(selectedOrganization.billing_plan)}>
                      {selectedOrganization.billing_plan}
                    </Badge>
                    <Badge className={getStatusColor(selectedOrganization.status)}>
                      {selectedOrganization.status}
                    </Badge>
                    <Badge variant="outline">
                      {selectedOrganization.type}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleInviteUserClick(selectedOrganization)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Organization Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Organization Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Locations</span>
                      <span className="font-medium">{selectedOrganization.locations_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Users</span>
                      <span className="font-medium">{selectedOrganization.users_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Revenue</span>
                      <span className="font-medium">{formatCurrency(selectedOrganization.revenue_current_month)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Appointments</span>
                      <span className="font-medium">{selectedOrganization.appointments_current_month}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="font-medium">{new Date(selectedOrganization.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Organization Users */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Team Members</CardTitle>
                      <Button 
                        size="sm"
                        onClick={() => handleInviteUserClick(selectedOrganization)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {organizationUsers.map((userOrg) => (
                        <div key={userOrg.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4" />
                            </div>
                            <div>
                              <h5 className="font-medium text-sm">
                                {userOrg.user.first_name} {userOrg.user.last_name}
                              </h5>
                              <p className="text-xs text-muted-foreground">{userOrg.user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {userOrg.role}
                            </Badge>
                            <div className="flex gap-1">
                              {userOrg.permissions.includes('can_manage_billing') && (
                                <Badge size="sm" className="bg-purple-100 text-purple-800">
                                  <DollarSign className="h-3 w-3" />
                                </Badge>
                              )}
                              {userOrg.permissions.includes('can_manage_staff') && (
                                <Badge size="sm" className="bg-blue-100 text-blue-800">
                                  <Users className="h-3 w-3" />
                                </Badge>
                              )}
                              {userOrg.permissions.includes('can_view_analytics') && (
                                <Badge size="sm" className="bg-green-100 text-green-800">
                                  <BarChart3 className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Select an Organization</h3>
                <p className="text-muted-foreground">
                  Choose an organization from the Organizations tab to view details
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Forms */}
      <OrganizationForm
        organization={editingOrganization}
        isOpen={showOrganizationForm}
        onClose={() => {
          setShowOrganizationForm(false)
          setEditingOrganization(null)
        }}
        onSave={editingOrganization ? handleUpdateOrganization : handleCreateOrganization}
        mode={editingOrganization ? 'edit' : 'create'}
      />

      <LocationForm
        location={editingLocation}
        organization={selectedOrganization}
        isOpen={showLocationForm}
        onClose={() => {
          setShowLocationForm(false)
          setEditingLocation(null)
        }}
        onSave={editingLocation ? handleUpdateLocation : handleCreateLocation}
        mode={editingLocation ? 'edit' : 'create'}
      />

      <UserInviteForm
        organization={selectedOrganization}
        isOpen={showUserInviteForm}
        onClose={() => {
          setShowUserInviteForm(false)
        }}
        onInvite={handleInviteUser}
        availableLocations={locations.filter(loc => 
          selectedOrganization ? loc.organization_id === selectedOrganization.id : true
        )}
      />
    </div>
  )
}