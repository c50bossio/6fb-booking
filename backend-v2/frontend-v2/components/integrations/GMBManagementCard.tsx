'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, 
  MapPin, 
  Star, 
  MessageSquare, 
  TrendingUp, 
  Eye,
  ExternalLink,
  RefreshCw,
  Calendar,
  Users,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { IntegrationResponse } from '@/types/integration'

interface GMBLocation {
  location_id: string
  name: string
  address: string
  phone?: string
  website?: string
  category?: string
  is_verified: boolean
  is_published: boolean
  rating?: number
  review_count?: number
}

interface GMBStats {
  total_reviews: number
  average_rating: number
  new_reviews_this_month: number
  response_rate: number
  locations_count: number
}

interface GMBManagementCardProps {
  integration: IntegrationResponse
  onHealthCheck?: (integrationId: number) => void
}

export default function GMBManagementCard({ integration, onHealthCheck }: GMBManagementCardProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [locations, setLocations] = useState<GMBLocation[]>([])
  const [stats, setStats] = useState<GMBStats | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  useEffect(() => {
    if (integration.is_connected && integration.is_active) {
      loadGMBData()
    }
  }, [integration])

  const loadGMBData = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, these would call actual API endpoints
      // For now, we'll use mock data to demonstrate the interface
      
      // Mock locations data
      const mockLocations: GMBLocation[] = [
        {
          location_id: 'loc_1',
          name: 'Downtown Barbershop',
          address: '123 Main St, Downtown, NY 10001',
          phone: '(555) 123-4567',
          website: 'https://downtownbarbershop.com',
          category: 'Barber shop',
          is_verified: true,
          is_published: true,
          rating: 4.8,
          review_count: 127
        },
        {
          location_id: 'loc_2', 
          name: 'Uptown Hair Studio',
          address: '456 Oak Ave, Uptown, NY 10002',
          phone: '(555) 987-6543',
          category: 'Hair salon',
          is_verified: true,
          is_published: true,
          rating: 4.6,
          review_count: 89
        }
      ]

      // Mock stats data
      const mockStats: GMBStats = {
        total_reviews: 216,
        average_rating: 4.7,
        new_reviews_this_month: 23,
        response_rate: 85,
        locations_count: 2
      }

      setLocations(mockLocations)
      setStats(mockStats)
      
      if (mockLocations.length > 0) {
        setSelectedLocation(mockLocations[0].location_id)
      }

    } catch (error) {
      console.error('Failed to load GMB data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load Google My Business data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncReviews = async () => {
    setIsLoading(true)
    try {
      // Mock sync operation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: 'Reviews Synced',
        description: 'Successfully synced 5 new reviews from Google My Business.'
      })
      
      onHealthCheck?.(integration.id)
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync reviews. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getLocationBadge = (location: GMBLocation) => {
    if (location.is_verified && location.is_published) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Verified</Badge>
    } else if (location.is_verified) {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Verified</Badge>
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>
    }
  }

  if (!integration.is_connected) {
    return (
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertDescription>
          Connect your Google My Business account to manage your business profile and reviews.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_reviews}</p>
                  <p className="text-xs text-muted-foreground">Total Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.average_rating}</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.new_reviews_this_month}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.response_rate}%</p>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Locations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Business Locations
              </CardTitle>
              <CardDescription>
                Manage your Google My Business locations and reviews
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncReviews}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Sync Reviews
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading locations...</span>
            </div>
          ) : locations.length > 0 ? (
            <div className="space-y-4">
              {locations.map((location) => (
                <div 
                  key={location.location_id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedLocation === location.location_id ? 'border-primary bg-muted/30' : ''
                  }`}
                  onClick={() => setSelectedLocation(location.location_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{location.name}</h3>
                        {getLocationBadge(location)}
                        {location.rating && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{location.rating}</span>
                            <span className="text-sm text-muted-foreground">
                              ({location.review_count} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3 h-3" />
                          <span>{location.address}</span>
                        </div>
                        {location.phone && (
                          <div className="flex items-center space-x-2">
                            <span>📞</span>
                            <span>{location.phone}</span>
                          </div>
                        )}
                        {location.category && (
                          <div className="flex items-center space-x-2">
                            <span>🏷️</span>
                            <span>{location.category}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {location.website && (
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation()
                          window.open(location.website, '_blank')
                        }}>
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Visit
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.stopPropagation()
                        // Navigate to reviews management for this location
                        window.open(`/marketing/reviews?location=${location.location_id}`, '_blank')
                      }}>
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Reviews
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No business locations found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure your Google My Business account has verified locations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.open('/marketing/reviews', '_blank')}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm">Respond to Reviews</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.open('/marketing/analytics', '_blank')}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm">View Analytics</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Schedule Posts</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">Customer Insights</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm">
                Status: <span className="font-medium text-green-600">Connected</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Last synced: {integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : 'Never'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onHealthCheck?.(integration.id)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Health
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}