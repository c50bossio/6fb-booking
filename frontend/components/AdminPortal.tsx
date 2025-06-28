'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  MapPin,
  TrendingUp,
  GraduationCap,
  DollarSign,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  UserPlus,
  Building,
  Award,
  Calculator,
  Zap
} from 'lucide-react'

interface User {
  id: number
  email: string
  full_name: string
  role: string
  status: string
  created_at: string
  last_login?: string
  certification_level?: string
}

interface Location {
  id: number
  name: string
  location_code: string
  franchise_type: string
  is_active: boolean
  mentor_name?: string
  barber_count: number
  avg_score: number
  monthly_revenue: number
}

interface Analytics {
  total_locations: number
  total_barbers: number
  avg_network_score: number
  total_revenue: number
  growth_rate: number
  certification_progress: {
    bronze: number
    silver: number
    gold: number
    platinum: number
  }
}

interface TrainingModule {
  id: number
  title: string
  category: string
  completion_rate: number
  avg_score: number
  enrollments: number
}

interface Commission {
  location_name: string
  total_commission: number
  franchise_fee: number
  barber_count: number
  avg_payout: number
}

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockUsers: User[] = [
        {
          id: 1,
          email: 'admin@6fb.com',
          full_name: 'Admin User',
          role: 'admin',
          status: 'active',
          created_at: '2024-01-15',
          last_login: '2024-06-18',
          certification_level: 'platinum'
        },
        {
          id: 2,
          email: 'mentor@6fb.com',
          full_name: 'John Mentor',
          role: 'mentor',
          status: 'active',
          created_at: '2024-02-01',
          last_login: '2024-06-17',
          certification_level: 'gold'
        },
        {
          id: 3,
          email: 'barber1@6fb.com',
          full_name: 'Mike Barber',
          role: 'barber',
          status: 'active',
          created_at: '2024-03-10',
          last_login: '2024-06-18',
          certification_level: 'silver'
        }
      ]

      const mockLocations: Location[] = [
        {
          id: 1,
          name: 'Downtown Location',
          location_code: 'DTN001',
          franchise_type: 'company_owned',
          is_active: true,
          mentor_name: 'John Mentor',
          barber_count: 5,
          avg_score: 87.5,
          monthly_revenue: 45000
        },
        {
          id: 2,
          name: 'Uptown Barbershop',
          location_code: 'UPT002',
          franchise_type: 'franchisee',
          is_active: true,
          mentor_name: 'Jane Smith',
          barber_count: 3,
          avg_score: 92.1,
          monthly_revenue: 32000
        }
      ]

      const mockAnalytics: Analytics = {
        total_locations: 2,
        total_barbers: 8,
        avg_network_score: 89.8,
        total_revenue: 77000,
        growth_rate: 15.3,
        certification_progress: {
          bronze: 3,
          silver: 2,
          gold: 2,
          platinum: 1
        }
      }

      const mockTrainingModules: TrainingModule[] = [
        {
          id: 1,
          title: '6FB Methodology Foundation',
          category: 'basic',
          completion_rate: 95,
          avg_score: 86.7,
          enrollments: 20
        },
        {
          id: 2,
          title: 'Advanced Analytics',
          category: 'advanced',
          completion_rate: 67,
          avg_score: 91.2,
          enrollments: 12
        }
      ]

      const mockCommissions: Commission[] = [
        {
          location_name: 'Downtown Location',
          total_commission: 15750,
          franchise_fee: 3600,
          barber_count: 5,
          avg_payout: 3150
        },
        {
          location_name: 'Uptown Barbershop',
          total_commission: 11200,
          franchise_fee: 2560,
          barber_count: 3,
          avg_payout: 3733
        }
      ]

      setUsers(mockUsers)
      setLocations(mockLocations)
      setAnalytics(mockAnalytics)
      setTrainingModules(mockTrainingModules)
      setCommissions(mockCommissions)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    console.log('Create user clicked')
  }

  const handleCreateLocation = () => {
    console.log('Create location clicked')
  }

  const handleViewDetails = (type: string, id: number) => {
    console.log(`View ${type} details:`, id)
  }

  const handleExportData = () => {
    console.log('Export data clicked')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading admin portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
                <p className="text-gray-600">6FB Network Management Dashboard</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={handleExportData}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button onClick={handleCreateUser}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="locations">
              <MapPin className="w-4 h-4 mr-2" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="training">
              <GraduationCap className="w-4 h-4 mr-2" />
              Training
            </TabsTrigger>
            <TabsTrigger value="revenue">
              <DollarSign className="w-4 h-4 mr-2" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {analytics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.total_locations}</div>
                      <p className="text-xs text-muted-foreground">Active barbershops</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Barbers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.total_barbers}</div>
                      <p className="text-xs text-muted-foreground">Network professionals</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Network Score</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.avg_network_score}</div>
                      <p className="text-xs text-muted-foreground">Average 6FB score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${analytics.total_revenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">+{analytics.growth_rate}% from last month</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Certification Progress</CardTitle>
                      <CardDescription>Network-wide certification levels</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(analytics.certification_progress).map(([level, count]) => (
                          <div key={level} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Award className="w-4 h-4" />
                              <span className="capitalize">{level}</span>
                            </div>
                            <Badge variant={level === 'platinum' ? 'default' : 'secondary'}>
                              {count} barbers
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>Common administrative tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="justify-start" onClick={handleCreateUser}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add User
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={handleCreateLocation}>
                          <Building className="w-4 h-4 mr-2" />
                          Add Location
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Zap className="w-4 h-4 mr-2" />
                          Run Analytics
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Calculator className="w-4 h-4 mr-2" />
                          Process Payouts
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Management</h2>
              <Button onClick={handleCreateUser}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certification</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {user.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.certification_level && (
                              <Badge variant="outline">{user.certification_level}</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_login || 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails('user', user.id)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Location Management</h2>
              <Button onClick={handleCreateLocation}>
                <Building className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <Card key={location.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                        <CardDescription>{location.location_code}</CardDescription>
                      </div>
                      <Badge variant={location.is_active ? 'default' : 'secondary'}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Type:</span>
                        <span className="capitalize">{location.franchise_type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Mentor:</span>
                        <span>{location.mentor_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Barbers:</span>
                        <span>{location.barber_count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Avg Score:</span>
                        <Badge variant={location.avg_score >= 85 ? 'default' : 'secondary'}>
                          {location.avg_score}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Monthly Revenue:</span>
                        <span className="font-medium">${location.monthly_revenue.toLocaleString()}</span>
                      </div>
                      <Button
                        className="w-full mt-4"
                        variant="outline"
                        onClick={() => handleViewDetails('location', location.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <h2 className="text-2xl font-bold">Training Management</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {trainingModules.map((module) => (
                <Card key={module.id}>
                  <CardHeader>
                    <CardTitle>{module.title}</CardTitle>
                    <CardDescription>Category: {module.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Completion Rate:</span>
                        <span className="font-medium">{module.completion_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Average Score:</span>
                        <span className="font-medium">{module.avg_score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Enrollments:</span>
                        <span className="font-medium">{module.enrollments}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${module.completion_rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <h2 className="text-2xl font-bold">Revenue Management</h2>

            <Card>
              <CardHeader>
                <CardTitle>Commission Breakdown</CardTitle>
                <CardDescription>Monthly commission summary by location</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barbers</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Franchise Fee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Payout</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {commissions.map((commission, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{commission.location_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{commission.barber_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${commission.total_commission.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${commission.franchise_fee.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${commission.avg_payout.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold">System Settings</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Access Control</CardTitle>
                  <CardDescription>Manage roles and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Manage Roles
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Permission Matrix
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Security Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>Platform settings and automation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Platform Settings
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Zap className="w-4 h-4 mr-2" />
                      Automation Rules
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics Config
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
