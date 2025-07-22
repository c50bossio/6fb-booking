'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import BarberCard, { type BarberProfile } from '@/components/barber/BarberCard'
import { cn } from '@/lib/utils'
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  Clock,
  Scissors,
  Users,
  SlidersHorizontal,
  Grid3X3,
  List
} from 'lucide-react'

// Mock data - replace with actual API calls
const mockBarbers: BarberProfile[] = [
  {
    id: 1,
    first_name: "Marcus",
    last_name: "Johnson",
    email: "marcus@example.com",
    bio: "Master barber with over 10 years of experience specializing in classic cuts, fades, and beard styling.",
    profileImageUrl: "/api/placeholder/300/300",
    specialties: ["Classic Haircuts", "Fade Cuts", "Beard Trimming", "Razor Shaves"],
    experienceLevel: "expert",
    hourlyRate: 85,
    location: "Downtown Barbershop",
    rating: 4.8,
    totalReviews: 127,
    isActive: true,
    nextAvailableSlot: "Today, 2:30 PM",
    responseTime: "1 hour"
  },
  {
    id: 2,
    first_name: "Sofia",
    last_name: "Martinez",
    email: "sofia@example.com",
    bio: "Creative stylist specializing in modern cuts and color treatments. Passionate about helping clients express their personality through their hair.",
    specialties: ["Modern Cuts", "Color & Highlights", "Styling & Grooming", "Women's Cuts"],
    experienceLevel: "senior",
    hourlyRate: 75,
    location: "Uptown Salon",
    rating: 4.9,
    totalReviews: 89,
    isActive: true,
    nextAvailableSlot: "Tomorrow, 10:00 AM",
    responseTime: "30 minutes"
  },
  {
    id: 3,
    first_name: "David",
    last_name: "Kim",
    email: "david@example.com",
    bio: "Specialist in Asian hair types and modern fusion styles. Bringing precision and artistry to every cut.",
    specialties: ["Asian Hair Specialist", "Modern Cuts", "Precision Cuts"],
    experienceLevel: "mid",
    hourlyRate: 65,
    location: "Midtown Studio",
    rating: 4.7,
    totalReviews: 54,
    isActive: false,
    nextAvailableSlot: "Monday, 9:00 AM",
    responseTime: "2 hours"
  },
  {
    id: 4,
    first_name: "Emma",
    last_name: "Thompson",
    email: "emma@example.com",
    bio: "Young talented barber with fresh ideas and classic training. Specializing in trendy cuts and beard care.",
    specialties: ["Trendy Cuts", "Beard Care", "Kids Haircuts"],
    experienceLevel: "junior",
    hourlyRate: 50,
    location: "West Side Barbershop",
    rating: 4.5,
    totalReviews: 23,
    isActive: true,
    nextAvailableSlot: "Today, 4:00 PM",
    responseTime: "15 minutes"
  }
]

const specialtyOptions = [
  "All Specialties",
  "Classic Haircuts",
  "Modern Cuts", 
  "Fade Cuts",
  "Beard Trimming",
  "Beard Care",
  "Razor Shaves",
  "Color & Highlights",
  "Styling & Grooming",
  "Kids Haircuts",
  "Women's Cuts",
  "Asian Hair Specialist",
  "Trendy Cuts",
  "Precision Cuts"
]

const experienceOptions = [
  { value: "all", label: "All Experience Levels" },
  { value: "junior", label: "Junior (0-2 years)" },
  { value: "mid", label: "Mid-level (3-5 years)" },
  { value: "senior", label: "Senior (6-10 years)" },
  { value: "expert", label: "Expert (10+ years)" }
]

const sortOptions = [
  { value: "rating", label: "Highest Rated" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "experience", label: "Most Experienced" },
  { value: "availability", label: "Available Now" }
]

export default function BarbersDirectoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // State
  const [barbers, setBarbers] = useState<BarberProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get('specialty') || 'All Specialties')
  const [selectedExperience, setSelectedExperience] = useState(searchParams.get('experience') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200])

  // Fetch barbers data
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        setLoading(true)
        // TODO: Replace with actual API call
        // const response = await fetch('/api/v1/barbers/profiles')
        // const data = await response.json()
        
        // Simulate API call
        setTimeout(() => {
          setBarbers(mockBarbers)
          setLoading(false)
        }, 1000)
        
      } catch (error) {
        console.error('Failed to fetch barbers:', error)
        setLoading(false)
        toast({
          title: "Error",
          description: "Failed to load barber profiles. Please try again.",
          variant: "destructive"
        })
      }
    }

    fetchBarbers()
  }, [toast])

  // Filter and sort barbers
  const filteredAndSortedBarbers = useMemo(() => {
    const filtered = barbers.filter(barber => {
      // Text search
      const searchMatch = !searchTerm || 
        `${barber.first_name} ${barber.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))

      // Specialty filter
      const specialtyMatch = selectedSpecialty === 'All Specialties' || 
        barber.specialties.includes(selectedSpecialty)

      // Experience filter
      const experienceMatch = selectedExperience === 'all' || 
        barber.experienceLevel === selectedExperience

      // Price range filter
      const priceMatch = !barber.hourlyRate || 
        (barber.hourlyRate >= priceRange[0] && barber.hourlyRate <= priceRange[1])

      return searchMatch && specialtyMatch && experienceMatch && priceMatch
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'price-low':
          return (a.hourlyRate || 0) - (b.hourlyRate || 0)
        case 'price-high':
          return (b.hourlyRate || 0) - (a.hourlyRate || 0)
        case 'experience':
          const expOrder = { expert: 4, senior: 3, mid: 2, junior: 1 }
          return (expOrder[b.experienceLevel || 'junior'] || 0) - (expOrder[a.experienceLevel || 'junior'] || 0)
        case 'availability':
          return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0)
        default:
          return 0
      }
    })

    return filtered
  }, [barbers, searchTerm, selectedSpecialty, selectedExperience, sortBy, priceRange])

  const handleBarberClick = (barberId: number) => {
    router.push(`/barbers/${barberId}`)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedSpecialty('All Specialties')
    setSelectedExperience('all')
    setSortBy('rating')
    setPriceRange([0, 200])
  }

  const activeFiltersCount = [
    searchTerm,
    selectedSpecialty !== 'All Specialties' ? selectedSpecialty : null,
    selectedExperience !== 'all' ? selectedExperience : null,
    priceRange[0] > 0 || priceRange[1] < 200 ? 'price' : null
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Barber</h1>
          <p className="text-gray-600">
            Browse our talented barbers and find the perfect match for your style
          </p>
        </div>

        {/* Search and Filters Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {/* Search and View Toggle */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search barbers by name, specialty, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex-shrink-0"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-2 bg-blue-600 text-white">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <div className="border-t pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Specialty Filter */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Specialty</Label>
                      <select 
                        value={selectedSpecialty}
                        onChange={(e) => setSelectedSpecialty(e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {specialtyOptions.map(specialty => (
                          <option key={specialty} value={specialty}>
                            {specialty}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Experience Filter */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Experience</Label>
                      <select 
                        value={selectedExperience}
                        onChange={(e) => setSelectedExperience(e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {experienceOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Filter */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Sort by</Label>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {sortOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearFilters}
                        className="w-full"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${filteredAndSortedBarbers.length} barber${filteredAndSortedBarbers.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-12 w-full mb-2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && filteredAndSortedBarbers.length > 0 && (
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1 max-w-4xl mx-auto"
          )}>
            {filteredAndSortedBarbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                variant={viewMode === 'list' ? 'default' : 'compact'}
                showBookButton={true}
                showAvailability={true}
                onClick={() => handleBarberClick(barber.id)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAndSortedBarbers.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No barbers found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria or filters to find more results.
              </p>
              <Button onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        {!loading && filteredAndSortedBarbers.length > 0 && (
          <Card className="mt-12">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">
                Don't see what you're looking for?
              </h3>
              <p className="text-gray-600 mb-6">
                Our barbers are constantly updating their profiles and availability. 
                Check back soon or contact us for special requests.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Button variant="outline">
                  Contact Support
                </Button>
                <Button onClick={clearFilters}>
                  Browse All Barbers
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}