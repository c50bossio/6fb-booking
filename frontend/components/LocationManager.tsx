'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building,
  Users,
  TrendingUp,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Calendar,
  BarChart3,
  Settings,
  UserPlus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'

interface LocationDetails {
  id: number
  name: string
  location_code: string
  address: string
  phone: string
  email: string
  franchise_type: string
  is_active: boolean
  mentor_id?: number
  mentor_name?: string
  manager_name?: string
  operating_hours: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
  created_at: string
}

interface LocationBarber {
  id: number
  name: string
  email: string
  phone: string
  role: string
  certification_level: string
  hire_date: string
  status: string
  sixfb_score: number
  monthly_revenue: number
  appointments_this_week: number
}

interface LocationAnalytics {
  total_revenue: number
  total_appointments: number
  avg_6fb_score: number
  client_retention_rate: number
  booking_efficiency: number
  revenue_growth: number
  top_services: Array<{
    name: string
    count: number
    revenue: number
  }>
  monthly_trends: Array<{
    month: string
    revenue: number
    appointments: number
  }>
}

export default function LocationManager() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null)
  const [locationBarbers, setLocationBarbers] = useState<LocationBarber[]>([])
  const [locationAnalytics, setLocationAnalytics] = useState<LocationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    loadLocationData(selectedLocation)
  }, [selectedLocation])

  const loadLocationData = async (locationId: number) => {
    setLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockLocationDetails: LocationDetails = {
        id: locationId,
        name: 'Downtown Location',
        location_code: 'DTN001',
        address: '123 Main Street, Downtown, NY 10001',
        phone: '(555) 123-4567',
        email: 'downtown@6fb.com',
        franchise_type: 'company_owned',
        is_active: true,
        mentor_id: 1,
        mentor_name: 'John Mentor',
        manager_name: 'Sarah Manager',
        operating_hours: {
          monday: '9:00 AM - 8:00 PM',
          tuesday: '9:00 AM - 8:00 PM',
          wednesday: '9:00 AM - 8:00 PM',
          thursday: '9:00 AM - 8:00 PM',
          friday: '9:00 AM - 9:00 PM',
          saturday: '8:00 AM - 9:00 PM',
          sunday: '10:00 AM - 6:00 PM'
        },
        created_at: '2024-01-15'
      }

      const mockLocationBarbers: LocationBarber[] = [
        {
          id: 1,
          name: 'Mike Johnson',
          email: 'mike@6fb.com',
          phone: '(555) 234-5678',
          role: 'senior_barber',
          certification_level: 'gold',
          hire_date: '2024-02-01',
          status: 'active',
          sixfb_score: 92.5,
          monthly_revenue: 8500,
          appointments_this_week: 28
        },
        {
          id: 2,
          name: 'Sarah Williams',
          email: 'sarah@6fb.com',
          phone: '(555) 345-6789',
          role: 'barber',
          certification_level: 'silver',
          hire_date: '2024-03-15',
          status: 'active',
          sixfb_score: 78.3,
          monthly_revenue: 5200,
          appointments_this_week: 22
        },
        {
          id: 3,
          name: 'David Chen',
          email: 'david@6fb.com',
          phone: '(555) 456-7890',
          role: 'barber',
          certification_level: 'bronze',
          hire_date: '2024-04-01',
          status: 'active',
          sixfb_score: 84.7,
          monthly_revenue: 6800,
          appointments_this_week: 25
        }
      ]

      const mockLocationAnalytics: LocationAnalytics = {
        total_revenue: 20500,
        total_appointments: 185,
        avg_6fb_score: 85.2,
        client_retention_rate: 87.5,
        booking_efficiency: 92.1,
        revenue_growth: 15.3,
        top_services: [
          { name: 'Haircut & Style', count: 95, revenue: 9500 },
          { name: 'Beard Trim', count: 48, revenue: 2400 },
          { name: 'Hot Towel Shave', count: 32, revenue: 3200 },
          { name: 'Hair Wash', count: 28, revenue: 1400 }
        ],
        monthly_trends: [
          { month: 'Jan', revenue: 18200, appointments: 165 },
          { month: 'Feb', revenue: 19100, appointments: 172 },
          { month: 'Mar', revenue: 19800, appointments: 178 },
          { month: 'Apr', revenue: 20500, appointments: 185 }
        ]
      }

      setLocationDetails(mockLocationDetails)
      setLocationBarbers(mockLocationBarbers)
      setLocationAnalytics(mockLocationAnalytics)
    } catch (error) {
      console.error('Error loading location data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditLocation = () => {
    setEditMode(true)
  }

  const handleSaveLocation = () => {
    setEditMode(false)
    console.log('Save location changes')
  }

  const handleAddBarber = () => {
    console.log('Add new barber')
  }

  const handleRemoveBarber = (barberId: number) => {
    console.log('Remove barber:', barberId)
  }

  const handleEditBarber = (barberId: number) => {
    console.log('Edit barber:', barberId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading location data...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Location Manager</h1>
                <p className="text-gray-600">{locationDetails?.name} - {locationDetails?.location_code}</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={handleEditLocation}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Location
                </Button>
                <Button onClick={handleAddBarber}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Barber
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {locationAnalytics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${locationAnalytics.total_revenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">+{locationAnalytics.revenue_growth}% from last month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{locationAnalytics.total_appointments}</div>
                      <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Team Score</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{locationAnalytics.avg_6fb_score}</div>
                      <p className="text-xs text-muted-foreground">Average 6FB score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{locationAnalytics.booking_efficiency}%</div>
                      <p className="text-xs text-muted-foreground">Booking efficiency</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Services</CardTitle>
                      <CardDescription>Most popular services this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {locationAnalytics.top_services.map((service, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{service.name}</div>
                              <div className="text-sm text-gray-500">{service.count} bookings</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${service.revenue.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Location Details</CardTitle>
                      <CardDescription>Basic information and contact details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {locationDetails && (
                        <div className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <MapPin className="w-4 h-4 mt-1 text-gray-500" />
                            <div>
                              <div className="font-medium">Address</div>
                              <div className="text-sm text-gray-600">{locationDetails.address}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="font-medium">Phone</div>
                              <div className="text-sm text-gray-600">{locationDetails.phone}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="font-medium">Email</div>
                              <div className="text-sm text-gray-600">{locationDetails.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="font-medium">Mentor</div>
                              <div className="text-sm text-gray-600">{locationDetails.mentor_name || 'Unassigned'}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Team Management</h2>
              <Button onClick={handleAddBarber}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {locationBarbers.map((barber) => (
                <Card key={barber.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{barber.name}</CardTitle>
                        <CardDescription>{barber.role.replace('_', ' ')}</CardDescription>
                      </div>
                      <Badge variant={barber.status === 'active' ? 'default' : 'secondary'}>
                        {barber.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Email:</span>
                        <span>{barber.email}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Phone:</span>
                        <span>{barber.phone}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Certification:</span>
                        <Badge variant={barber.certification_level === 'gold' ? 'default' : 'secondary'}>
                          {barber.certification_level}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">6FB Score:</span>
                        <span className="font-medium">{barber.sixfb_score}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Monthly Revenue:</span>
                        <span className="font-medium">${barber.monthly_revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">This Week:</span>
                        <span>{barber.appointments_this_week} appointments</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Hire Date:</span>
                        <span>{barber.hire_date}</span>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEditBarber(barber.id)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRemoveBarber(barber.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Performance Analytics</h2>

            {locationAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Client Retention Rate</span>
                          <span>{locationAnalytics.client_retention_rate}%</span>
                        </div>
                        <Progress value={locationAnalytics.client_retention_rate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Booking Efficiency</span>
                          <span>{locationAnalytics.booking_efficiency}%</span>
                        </div>
                        <Progress value={locationAnalytics.booking_efficiency} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Average 6FB Score</span>
                          <span>{locationAnalytics.avg_6fb_score}</span>
                        </div>
                        <Progress value={locationAnalytics.avg_6fb_score} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                    <CardDescription>Monthly performance overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {locationAnalytics.monthly_trends.map((trend, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{trend.month}</div>
                            <div className="text-sm text-gray-500">{trend.appointments} appointments</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${trend.revenue.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold">Location Settings</h2>

            {locationDetails && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Location details and contact information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="location-name">Location Name</Label>
                        <Input
                          id="location-name"
                          value={locationDetails.name}
                          disabled={!editMode}
                        />
                      </div>
                      <div>
                        <Label htmlFor="location-code">Location Code</Label>
                        <Input
                          id="location-code"
                          value={locationDetails.location_code}
                          disabled={!editMode}
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={locationDetails.address}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={locationDetails.phone}
                            disabled={!editMode}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={locationDetails.email}
                            disabled={!editMode}
                          />
                        </div>
                      </div>
                      {editMode && (
                        <div className="flex space-x-2">
                          <Button onClick={handleSaveLocation}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={() => setEditMode(false)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Operating Hours</CardTitle>
                    <CardDescription>Business hours for each day of the week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(locationDetails.operating_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between items-center">
                          <span className="capitalize font-medium">{day}</span>
                          <span className="text-sm text-gray-600">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
