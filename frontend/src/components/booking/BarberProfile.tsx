'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { bookingService } from '@/lib/api/bookings'
import { cn } from '@/lib/utils'
import { Star, Clock, Calendar, MapPin, Award, Scissors } from 'lucide-react'

export interface BarberProfileProps {
  barberId: number
  onBookService?: (serviceId: number) => void
  showBookingButton?: boolean
  className?: string
}

interface BarberDetails {
  id: number
  name: string
  email: string
  phone?: string
  bio?: string
  years_experience?: number
  specialties?: string[]
  location: {
    id: number
    name: string
    address: string
    city: string
    state: string
  }
  rating: number
  total_reviews: number
  services: Service[]
  availability: WeeklyAvailability
  gallery?: GalleryImage[]
  certifications?: Certification[]
}

interface Service {
  id: number
  name: string
  description?: string
  duration: number
  price: number
  category: string
}

interface WeeklyAvailability {
  [key: string]: {
    start: string
    end: string
    breaks?: Array<{ start: string; end: string }>
  }
}

interface Review {
  id: number
  client_name: string
  rating: number
  comment: string
  service_name: string
  created_at: string
}

interface GalleryImage {
  id: number
  url: string
  caption?: string
}

interface Certification {
  id: number
  name: string
  issuer: string
  date: string
}

const BarberProfile: React.FC<BarberProfileProps> = ({
  barberId,
  onBookService,
  showBookingButton = true,
  className
}) => {
  const [barber, setBarber] = useState<BarberDetails | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('services')

  useEffect(() => {
    loadBarberDetails()
    loadReviews()
  }, [barberId])

  const loadBarberDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await bookingService.getBarberDetails(barberId)
      setBarber(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load barber details')
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    try {
      const response = await bookingService.getBarberReviews(barberId)
      setReviews(response.data.data)
    } catch (err) {
      console.error('Failed to load reviews:', err)
    }
  }

  const formatAvailability = (day: string, hours: any) => {
    if (!hours) return 'Closed'
    return `${formatTime(hours.start)} - ${formatTime(hours.end)}`
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const formattedHour = hour % 12 || 12
    return `${formattedHour}:${minutes} ${ampm}`
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'h-4 w-4',
          i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        )}
      />
    ))
  }

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !barber) {
    return (
      <div className={cn('text-center p-8', className)}>
        <p className="text-red-600 mb-4">{error || 'Barber not found'}</p>
        <Button onClick={loadBarberDetails} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Image Placeholder */}
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
              <Scissors className="h-12 w-12 text-gray-400" />
            </div>
            
            {/* Barber Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold">{barber.name}</h2>
                <div className="flex items-center mt-2 space-x-4">
                  <div className="flex items-center">
                    {renderStars(barber.rating)}
                    <span className="ml-2 text-sm text-gray-600">
                      {barber.rating.toFixed(1)} ({barber.total_reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {barber.years_experience && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {barber.years_experience} years experience
                  </Badge>
                )}
                <Badge variant="secondary">
                  <MapPin className="h-3 w-3 mr-1" />
                  {barber.location.name}
                </Badge>
              </div>
              
              {barber.bio && (
                <p className="text-gray-600">{barber.bio}</p>
              )}
              
              {barber.specialties && barber.specialties.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Specialties:</p>
                  <div className="flex flex-wrap gap-1">
                    {barber.specialties.map((specialty, index) => (
                      <Badge key={index} variant="outline">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Services Offered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  barber.services.reduce((acc, service) => {
                    if (!acc[service.category]) acc[service.category] = []
                    acc[service.category].push(service)
                    return acc
                  }, {} as Record<string, Service[]>)
                ).map(([category, services]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                    <div className="space-y-2">
                      {services.map(service => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{service.name}</p>
                            {service.description && (
                              <p className="text-sm text-gray-600">{service.description}</p>
                            )}
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {service.duration} min
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${service.price}</p>
                            {showBookingButton && onBookService && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onBookService(service.id)}
                                className="mt-1"
                              >
                                Book
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <div key={day} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{day}</span>
                    <span className="text-gray-600">
                      {formatAvailability(day.toLowerCase(), barber.availability[day.toLowerCase()])}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{review.client_name}</p>
                          <div className="flex items-center mt-1">
                            {renderStars(review.rating)}
                            <span className="ml-2 text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline">{review.service_name}</Badge>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              {!barber.gallery || barber.gallery.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No portfolio images yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {barber.gallery.map(image => (
                    <div key={image.id} className="relative aspect-square">
                      <img
                        src={image.url}
                        alt={image.caption || 'Portfolio image'}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {image.caption && (
                        <p className="mt-1 text-xs text-gray-600">{image.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certifications */}
      {barber.certifications && barber.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barber.certifications.map(cert => (
                <div key={cert.id} className="flex items-start space-x-3">
                  <Award className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{cert.name}</p>
                    <p className="text-sm text-gray-600">{cert.issuer}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(cert.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default BarberProfile