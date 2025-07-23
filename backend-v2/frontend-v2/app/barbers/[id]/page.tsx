'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { 
  MapPin, 
  Star, 
  Clock, 
  Scissors,
  User,
  Calendar,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  ArrowLeft,
  Share2,
  Heart,
  MessageCircle
} from 'lucide-react'
import type { BarberProfile } from '@/components/barber/BarberCard'
import { getBarberProfile, type BarberProfileData, getBarberAvailability, getNextAvailableSlot, appointmentsAPI } from '@/lib/api'
import { Metadata } from 'next'

const experienceLevels = {
  junior: { label: 'Junior Barber', description: 'New to the industry (0-2 years)', color: 'bg-blue-100 text-blue-800' },
  mid: { label: 'Mid-level Barber', description: 'Solid foundation and growing expertise (3-5 years)', color: 'bg-green-100 text-green-800' },
  senior: { label: 'Senior Barber', description: 'Experienced with advanced techniques (6-10 years)', color: 'bg-purple-100 text-purple-800' },
  expert: { label: 'Master Barber', description: 'Expert craftsman with specialized skills (10+ years)', color: 'bg-yellow-100 text-yellow-800' }
}

export default function BarberProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const barberId = params.id as string
  
  const [barber, setBarber] = useState<BarberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<any[]>([])
  const [dynamicPricing, setDynamicPricing] = useState<{[serviceName: string]: any}>({})
  
  useEffect(() => {
    const fetchBarberProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch real barber profile data and availability
        const [profileData, availabilityData] = await Promise.all([
          getBarberProfile(parseInt(barberId)),
          getBarberAvailability(parseInt(barberId)).catch(() => []) // Don't fail if availability is not available
        ])
        
        // Try to get next available slot
        let nextAvailableSlot = 'Contact for availability'
        try {
          const nextSlot = await getNextAvailableSlot(parseInt(barberId))
          if (nextSlot && nextSlot.slot_datetime) {
            const date = new Date(nextSlot.slot_datetime)
            const today = new Date()
            const isToday = date.toDateString() === today.toDateString()
            const isTomorrow = date.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString()
            
            if (isToday) {
              nextAvailableSlot = `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
            } else if (isTomorrow) {
              nextAvailableSlot = `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
            } else {
              nextAvailableSlot = date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            }
          }
        } catch (err) {
          console.log('Could not fetch next available slot:', err)
        }
        
        // Transform API data to match BarberProfile interface
        const transformedBarber: BarberProfile = {
          id: profileData.user_id,
          first_name: profileData.user_name.split(' ')[0] || 'Unknown',
          last_name: profileData.user_name.split(' ').slice(1).join(' ') || '',
          email: profileData.user_email,
          bio: profileData.bio || 'Professional barber dedicated to providing excellent service.',
          profileImageUrl: profileData.profile_image_url || '/api/placeholder/400/400',
          specialties: profileData.specialties || [],
          experienceLevel: profileData.years_experience ? (
            profileData.years_experience >= 10 ? 'expert' :
            profileData.years_experience >= 6 ? 'senior' :
            profileData.years_experience >= 3 ? 'mid' : 'junior'
          ) as 'junior' | 'mid' | 'senior' | 'expert' : 'mid',
          hourlyRate: profileData.hourly_rate || 60,
          location: 'Professional Barbershop', // TODO: Connect to location data
          rating: 4.5, // TODO: Calculate from reviews
          totalReviews: 25, // TODO: Count from reviews
          isActive: profileData.is_active,
          socialMedia: {
            instagram: profileData.instagram_handle ? `https://instagram.com/${profileData.instagram_handle}` : undefined
          },
          nextAvailableSlot,
          responseTime: '1 hour' // TODO: Calculate from historical data
        }
        
        // Store availability data for potential future use
        setAvailability(availabilityData)
        
        setBarber(transformedBarber)
        
        // Fetch Six Figure Barber pricing for common services
        const commonServices = ['haircut', 'haircut & beard', 'haircut & shave', 'beard trimming', 'straight razor shave']
        const pricingPromises = commonServices.map(async (serviceName) => {
          try {
            const pricing = await appointmentsAPI.calculateServicePrice(serviceName, barberId)
            return { serviceName, pricing }
          } catch (err) {
            console.log(`Could not fetch pricing for ${serviceName}:`, err)
            return { serviceName, pricing: null }
          }
        })
        
        const pricingResults = await Promise.all(pricingPromises)
        const pricingMap = pricingResults.reduce((acc, { serviceName, pricing }) => {
          if (pricing) {
            acc[serviceName] = pricing
          }
          return acc
        }, {} as {[serviceName: string]: any})
        
        setDynamicPricing(pricingMap)
        setLoading(false)
        
      } catch (err) {
        console.error('Failed to load barber profile:', err)
        setError('Failed to load barber profile. Please try again.')
        setLoading(false)
      }
    }

    if (barberId) {
      fetchBarberProfile()
    }
  }, [barberId])

  const handleBookNow = () => {
    // Build comprehensive booking URL with barber context
    const bookingParams = new URLSearchParams({
      barber: barberId,
      barberName: `${barber?.first_name} ${barber?.last_name}`,
      experience: barber?.experienceLevel || '',
      specialties: barber?.specialties?.slice(0, 3).join(',') || '', // Include top 3 specialties
      hourlyRate: barber?.hourlyRate?.toString() || ''
    })
    
    // Add Six Figure Barber context for premium pricing
    if (barber?.experienceLevel === 'expert' || (barber?.hourlyRate && barber.hourlyRate >= 80)) {
      bookingParams.append('tier', 'premium')
    }
    
    router.push(`/book?${bookingParams.toString()}`)
  }

  const handleServiceBooking = (service: string, suggestedPrice?: number) => {
    // Build service-specific booking URL
    const bookingParams = new URLSearchParams({
      barber: barberId,
      barberName: `${barber?.first_name} ${barber?.last_name}`,
      service: service,
      experience: barber?.experienceLevel || '',
      hourlyRate: barber?.hourlyRate?.toString() || ''
    })
    
    // Add suggested pricing for Six Figure Barber methodology
    if (suggestedPrice) {
      bookingParams.append('suggestedPrice', suggestedPrice.toString())
    }
    
    // Add premium tier for expert barbers
    if (barber?.experienceLevel === 'expert' || (barber?.hourlyRate && barber.hourlyRate >= 80)) {
      bookingParams.append('tier', 'premium')
    }
    
    router.push(`/book?${bookingParams.toString()}`)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${barber?.first_name} ${barber?.last_name} - BookedBarber`,
          text: `Check out ${barber?.first_name}'s barber profile`,
          url: window.location.href
        })
      } catch (err) {
        // Fallback to copy to clipboard
        navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Profile link copied!",
          description: "Share this link with others"
        })
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Profile link copied!",
        description: "Share this link with others"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header skeleton */}
          <div className="mb-6">
            <Skeleton className="h-6 w-20 mb-4" />
            <Skeleton className="h-8 w-64" />
          </div>
          
          {/* Profile skeleton */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex items-start gap-8">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-8 w-48 mb-4" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-16 w-full mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !barber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <User className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error || "This barber profile doesn't exist or is no longer available."}
            </p>
            <Button asChild>
              <Link href="/barbers">Browse All Barbers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fullName = `${barber.first_name} ${barber.last_name}`
  const experienceLevel = barber.experienceLevel ? experienceLevels[barber.experienceLevel] : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Meta Tags would be generated here */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Barber Profile</h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Main Profile Card */}
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-start gap-8">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage 
                    src={barber.profileImageUrl} 
                    alt={`${fullName} profile`}
                  />
                  <AvatarFallback className="bg-gray-100">
                    <User className="h-16 w-16 text-gray-600" />
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-3xl font-bold text-gray-900">{fullName}</h2>
                  {barber.isActive ? (
                    <Badge className="bg-green-100 text-green-800">Available</Badge>
                  ) : (
                    <Badge variant="secondary">Currently Away</Badge>
                  )}
                </div>

                {/* Rating */}
                {barber.rating && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">{barber.rating}</span>
                    </div>
                    <span className="text-gray-600">
                      ({barber.totalReviews} reviews)
                    </span>
                  </div>
                )}

                {/* Bio */}
                {barber.bio && (
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {barber.bio}
                  </p>
                )}

                {/* Experience Level */}
                {experienceLevel && (
                  <div className="mb-6">
                    <Badge className={cn('text-sm px-3 py-1', experienceLevel.color)}>
                      <Scissors className="h-4 w-4 mr-2" />
                      {experienceLevel.label}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      {experienceLevel.description}
                    </p>
                  </div>
                )}

                {/* Specialties */}
                {barber.specialties.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {barber.specialties.map((specialty) => (
                        <Badge key={specialty} variant="outline">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Service Booking */}
                {barber.isActive && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Quick Book Popular Services</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Haircut Service */}
                      {barber.specialties.some(s => s.toLowerCase().includes('haircut') || s.toLowerCase().includes('cut')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleServiceBooking('Haircut', dynamicPricing['haircut']?.final_price || 30)}
                          className="flex items-center justify-between p-4 h-auto"
                        >
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4" />
                            <span>Haircut</span>
                          </div>
                          <div className="text-right">
                            {dynamicPricing['haircut'] ? (
                              <>
                                <span className="text-sm font-semibold">
                                  ${dynamicPricing['haircut'].final_price}
                                </span>
                                {dynamicPricing['haircut'].six_figure_insights?.is_premium_positioning && (
                                  <div className="text-xs text-purple-600">Premium</div>
                                )}
                              </>
                            ) : (
                              <span className="text-sm font-semibold">$30</span>
                            )}
                          </div>
                        </Button>
                      )}
                      
                      {/* Beard Trimming Service */}
                      {barber.specialties.some(s => s.toLowerCase().includes('beard') || s.toLowerCase().includes('trim')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleServiceBooking('Beard Trimming', dynamicPricing['beard trimming']?.final_price || 20)}
                          className="flex items-center justify-between p-4 h-auto"
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Beard Trim</span>
                          </div>
                          <div className="text-right">
                            {dynamicPricing['beard trimming'] ? (
                              <>
                                <span className="text-sm font-semibold">
                                  ${dynamicPricing['beard trimming'].final_price}
                                </span>
                                {dynamicPricing['beard trimming'].six_figure_insights?.is_premium_positioning && (
                                  <div className="text-xs text-purple-600">Premium</div>
                                )}
                              </>
                            ) : (
                              <span className="text-sm font-semibold">$20</span>
                            )}
                          </div>
                        </Button>
                      )}
                      
                      {/* Full Service */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleServiceBooking('Haircut & Shave', dynamicPricing['haircut & shave']?.final_price || 45)}
                        className="flex items-center justify-between p-4 h-auto"
                      >
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          <span>Full Service</span>
                        </div>
                        <div className="text-right">
                          {dynamicPricing['haircut & shave'] ? (
                            <>
                              <span className="text-sm font-semibold">
                                ${dynamicPricing['haircut & shave'].final_price}
                              </span>
                              {dynamicPricing['haircut & shave'].six_figure_insights?.is_premium_positioning && (
                                <div className="text-xs text-purple-600">Premium</div>
                              )}
                            </>
                          ) : (
                            <span className="text-sm font-semibold">$45</span>
                          )}
                        </div>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Contact & Social */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {barber.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{barber.location}</span>
                    </div>
                  )}
                  
                  {barber.hourlyRate && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>From ${barber.hourlyRate}/hour</span>
                    </div>
                  )}
                  
                  {barber.responseTime && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MessageCircle className="h-4 w-4" />
                      <span>Responds in {barber.responseTime}</span>
                    </div>
                  )}
                </div>

                {/* Social Media */}
                {barber.socialMedia && (
                  <div className="flex gap-3 mb-6">
                    {barber.socialMedia.instagram && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a 
                          href={barber.socialMedia.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Instagram className="h-4 w-4 mr-2" />
                          Instagram
                        </a>
                      </Button>
                    )}
                    {barber.socialMedia.facebook && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a 
                          href={barber.socialMedia.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Facebook className="h-4 w-4 mr-2" />
                          Facebook
                        </a>
                      </Button>
                    )}
                    {barber.socialMedia.twitter && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a 
                          href={barber.socialMedia.twitter} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability Preview */}
        {barber.isActive && barber.nextAvailableSlot && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Next available slot</p>
                  <p className="font-semibold text-green-600">{barber.nextAvailableSlot}</p>
                </div>
                <Button onClick={handleBookNow}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call-to-Action */}
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-4">
              Ready to book with {barber.first_name}?
            </h3>
            <p className="text-gray-600 mb-6">
              Join {barber.totalReviews}+ satisfied clients who trust {barber.first_name} for their grooming needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <Button 
                size="lg"
                onClick={handleBookNow}
                disabled={!barber.isActive}
                className="flex-1"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {barber.isActive ? 'Book Now' : 'Currently Unavailable'}
              </Button>
              <Button 
                variant="outline"
                size="lg"
                asChild
                className="flex-1"
              >
                <Link href="/barbers">
                  Browse All Barbers
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}