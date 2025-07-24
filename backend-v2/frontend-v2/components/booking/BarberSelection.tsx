'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { 
  User, 
  Star, 
  Award, 
  Calendar,
  Clock,
  Instagram,
  Facebook,
  Globe,
  ChevronRight
} from 'lucide-react';

interface BarberProfile {
  id: number;
  name: string;
  email: string;
  bio?: string;
  years_experience?: number;
  profile_image_url?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  profile_completed: boolean;
  specialties: Array<{
    id: number;
    specialty_name: string;
    category?: string;
    experience_level?: string;
    is_primary: boolean;
  }>;
  portfolio_images: Array<{
    id: number;
    image_url: string;
    title?: string;
    is_featured: boolean;
  }>;
}

interface BarberSelectionProps {
  selectedService: string;
  onBarberSelect: (barberId: number, barberName: string) => void;
  onBack: () => void;
  organizationSlug?: string;
}

export default function BarberSelection({ 
  selectedService, 
  onBarberSelect, 
  onBack,
  organizationSlug 
}: BarberSelectionProps) {
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);

  useEffect(() => {
    fetchAvailableBarbers();
  }, [organizationSlug]);

  const fetchAvailableBarbers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // For now, fetch all barbers. In production, this would be organization-specific
      const response = await fetch(`${apiUrl}/api/v1/users?role=barber&is_active=true&limit=20`);
      
      if (response.ok) {
        const userData = await response.json();
        
        // Fetch detailed profiles for each barber
        const barberProfiles = await Promise.all(
          userData.users.map(async (user: any) => {
            try {
              const profileResponse = await fetch(`${apiUrl}/api/v2/barber-profiles/${user.id}`);
              if (profileResponse.ok) {
                return await profileResponse.json();
              }
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                profile_completed: false,
                specialties: [],
                portfolio_images: []
              };
            } catch {
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                profile_completed: false,
                specialties: [],
                portfolio_images: []
              };
            }
          })
        );
        
        // Filter to only show barbers with completed profiles or at minimum basic info
        const activeBarbers = barberProfiles.filter(barber => 
          barber.name && (barber.profile_completed || barber.bio || barber.specialties.length > 0)
        );
        
        setBarbers(activeBarbers);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching barbers:', error);
      setLoading(false);
    }
  };

  const handleBarberSelect = (barber: BarberProfile) => {
    setSelectedBarberId(barber.id);
    onBarberSelect(barber.id, barber.name);
  };

  const getServiceMatchingSpecialties = (barber: BarberProfile) => {
    if (!barber.specialties.length) return [];
    
    const serviceKeywords = selectedService.toLowerCase();
    return barber.specialties.filter(specialty => 
      serviceKeywords.includes(specialty.specialty_name.toLowerCase()) ||
      specialty.specialty_name.toLowerCase().includes(serviceKeywords) ||
      (serviceKeywords.includes('haircut') && specialty.category === 'cuts') ||
      (serviceKeywords.includes('shave') && specialty.category === 'beard')
    );
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <Button onClick={onBack} variant="ghost" className="flex items-center gap-2">
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">Choose Your Barber</h1>
          <div></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <Button onClick={onBack} variant="ghost" className="flex items-center gap-2">
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">Choose Your Barber</h1>
          <div></div>
        </div>
        
        <div className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Barbers Available</h3>
          <p className="text-gray-600 mb-6">
            We're currently updating our barber profiles. Please try again later or contact us directly.
          </p>
          <Button onClick={onBack} variant="outline">
            ← Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <Button onClick={onBack} variant="ghost" className="flex items-center gap-2">
          ← Back
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Choose Your Barber</h1>
          <p className="text-gray-600 mt-1">for your {selectedService}</p>
        </div>
        <div></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber) => {
          const matchingSpecialties = getServiceMatchingSpecialties(barber);
          const featuredImage = barber.portfolio_images.find(img => img.is_featured);
          
          return (
            <Card 
              key={barber.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedBarberId === barber.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleBarberSelect(barber)}
            >
              <CardContent className="p-6">
                {/* Barber Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    {barber.profile_image_url ? (
                      <img
                        src={barber.profile_image_url}
                        alt={barber.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    {barber.profile_completed && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{barber.name}</h3>
                    {barber.years_experience && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {barber.years_experience} years experience
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {barber.bio && (
                  <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                    {barber.bio}
                  </p>
                )}

                {/* Matching Specialties */}
                {matchingSpecialties.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-green-600 mb-2">
                      Perfect for your {selectedService}:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {matchingSpecialties.slice(0, 2).map((specialty) => (
                        <Badge 
                          key={specialty.id} 
                          variant={specialty.is_primary ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {specialty.is_primary && <Star className="w-2 h-2 mr-1" />}
                          {specialty.specialty_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Specialties */}
                {barber.specialties.length > 0 && matchingSpecialties.length === 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">Specializes in:</p>
                    <div className="flex flex-wrap gap-1">
                      {barber.specialties.slice(0, 3).map((specialty) => (
                        <Badge 
                          key={specialty.id} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {specialty.is_primary && <Star className="w-2 h-2 mr-1" />}
                          {specialty.specialty_name}
                        </Badge>
                      ))}
                      {barber.specialties.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{barber.specialties.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Featured Portfolio Image */}
                {featuredImage && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">Recent work:</p>
                    <img
                      src={featuredImage.image_url}
                      alt={featuredImage.title || 'Portfolio work'}
                      className="w-full h-24 object-cover rounded-md"
                    />
                  </div>
                )}

                {/* Social Links */}
                {barber.social_links && (
                  <div className="flex gap-2 mb-4">
                    {barber.social_links.instagram && (
                      <a 
                        href={barber.social_links.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-pink-500"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {barber.social_links.facebook && (
                      <a 
                        href={barber.social_links.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {barber.social_links.website && (
                      <a 
                        href={barber.social_links.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* Selection Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Available today</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-blue-600">
                    <span className="text-sm font-medium">Select</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick booking option */}
      <div className="mt-8 pt-6 border-t">
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => onBarberSelect(0, 'Any Available Barber')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Next Available Barber</h3>
                  <p className="text-sm text-gray-600">Get the earliest appointment time</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}