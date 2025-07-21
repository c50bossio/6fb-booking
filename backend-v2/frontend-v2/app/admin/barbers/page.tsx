'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, User, Calendar, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Types for barber profile data
interface BarberProfile {
  id: number
  user_id: number
  bio?: string
  years_experience?: number
  profile_image_url?: string
  instagram_handle?: string
  website_url?: string
  specialties?: string[]
  certifications?: string[]
  hourly_rate?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface BarberProfileResponse {
  profiles: BarberProfile[]
  total: number
  active_count: number
  inactive_count: number
}

export default function AdminBarbersPage() {
  const [profiles, setProfiles] = useState<BarberProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active_count: 0,
    inactive_count: 0
  })

  useEffect(() => {
    fetchBarberProfiles()
  }, [])

  const fetchBarberProfiles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('No access token found')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v2/barbers/profiles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch profiles: ${response.status}`)
      }

      const data: BarberProfileResponse = await response.json()
      setProfiles(data.profiles)
      setStats({
        total: data.total,
        active_count: data.active_count,
        inactive_count: data.inactive_count
      })
    } catch (error) {
      console.error('Error fetching barber profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfile = () => {
    // TODO: Open create profile modal or navigate to create page
    console.log('Create new barber profile')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading barber profiles...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barber Management</h1>
          <p className="text-muted-foreground">
            Manage barber profiles, availability, and settings
          </p>
        </div>
        <Button onClick={handleCreateProfile} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Barber Profile
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All barber profiles in system
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Profiles</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active_count}</div>
            <p className="text-xs text-muted-foreground">
              Currently accepting bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Profiles</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inactive_count}</div>
            <p className="text-xs text-muted-foreground">
              Not currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profiles List */}
      <Card>
        <CardHeader>
          <CardTitle>Barber Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No barber profiles found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first barber profile.
              </p>
              <Button onClick={handleCreateProfile} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Profile
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Barber #{profile.user_id}</h3>
                      <p className="text-sm text-muted-foreground">
                        {profile.years_experience ? `${profile.years_experience} years experience` : 'No experience listed'}
                      </p>
                      {profile.specialties && profile.specialties.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {profile.specialties.slice(0, 3).map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {profile.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.specialties.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {profile.hourly_rate && (
                      <div className="text-right">
                        <div className="text-sm font-semibold">${profile.hourly_rate}/hr</div>
                      </div>
                    )}
                    <Badge variant={profile.is_active ? "default" : "secondary"}>
                      {profile.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}