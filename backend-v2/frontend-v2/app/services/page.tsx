'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { 
  ScissorsIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface Service {
  id: number
  name: string
  description: string
  duration: number // in minutes
  price: number
  category: string
  is_active: boolean
  is_featured: boolean
  booking_count: number
  revenue_generated: number
  created_date: string
  last_updated: string
}

interface ServiceCategory {
  name: string
  count: number
  total_revenue: number
  average_price: number
  color: string
}

const SERVICE_CATEGORIES = [
  { name: 'All Services', color: 'bg-gray-100 text-gray-600' },
  { name: 'Haircuts', color: 'bg-blue-100 text-blue-600' },
  { name: 'Beard Care', color: 'bg-green-100 text-green-600' },
  { name: 'Premium Services', color: 'bg-purple-100 text-purple-600' },
  { name: 'Styling', color: 'bg-orange-100 text-orange-600' },
  { name: 'Treatments', color: 'bg-pink-100 text-pink-600' }
]

export default function ServicesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [activeTab, setActiveTab] = useState('services')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Services')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }

        setUser(userData)

        // Mock services data
        const mockServices: Service[] = [
          {
            id: 1,
            name: 'Premium Cut & Style',
            description: 'Professional haircut with wash, style, and hot towel finish',
            duration: 60,
            price: 85.00,
            category: 'Premium Services',
            is_active: true,
            is_featured: true,
            booking_count: 128,
            revenue_generated: 10880,
            created_date: '2024-01-15',
            last_updated: '2025-01-10'
          },
          {
            id: 2,
            name: 'Classic Haircut',
            description: 'Traditional barbershop haircut with precision and attention to detail',
            duration: 30,
            price: 45.00,
            category: 'Haircuts',
            is_active: true,
            is_featured: false,
            booking_count: 245,
            revenue_generated: 11025,
            created_date: '2024-01-15',
            last_updated: '2024-12-20'
          },
          {
            id: 3,
            name: 'Luxury Shave Experience',
            description: 'Traditional straight razor shave with hot towels and premium products',
            duration: 45,
            price: 65.00,
            category: 'Premium Services',
            is_active: true,
            is_featured: true,
            booking_count: 89,
            revenue_generated: 5785,
            created_date: '2024-02-01',
            last_updated: '2025-01-05'
          },
          {
            id: 4,
            name: 'Beard Trim & Shape',
            description: 'Professional beard trimming and shaping with hot towel treatment',
            duration: 25,
            price: 35.00,
            category: 'Beard Care',
            is_active: true,
            is_featured: false,
            booking_count: 156,
            revenue_generated: 5460,
            created_date: '2024-01-15',
            last_updated: '2024-11-30'
          },
          {
            id: 5,
            name: 'Hot Towel Treatment',
            description: 'Relaxing hot towel facial treatment with essential oils',
            duration: 20,
            price: 25.00,
            category: 'Treatments',
            is_active: true,
            is_featured: false,
            booking_count: 67,
            revenue_generated: 1675,
            created_date: '2024-03-10',
            last_updated: '2024-12-15'
          },
          {
            id: 6,
            name: 'Hair Styling & Product',
            description: 'Professional styling with premium products and finishing',
            duration: 15,
            price: 20.00,
            category: 'Styling',
            is_active: false,
            is_featured: false,
            booking_count: 23,
            revenue_generated: 460,
            created_date: '2024-04-01',
            last_updated: '2024-10-10'
          }
        ]

        setServices(mockServices)
        setFilteredServices(mockServices)

      } catch (err) {
        console.error('Failed to load services data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  useEffect(() => {
    let filtered = services

    // Filter by category
    if (categoryFilter !== 'All Services') {
      filtered = filtered.filter(service => service.category === categoryFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(search) ||
        service.description.toLowerCase().includes(search) ||
        service.category.toLowerCase().includes(search)
      )
    }

    // Sort services
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'duration':
          aValue = a.duration
          bValue = b.duration
          break
        case 'bookings':
          aValue = a.booking_count
          bValue = b.booking_count
          break
        case 'revenue':
          aValue = a.revenue_generated
          bValue = b.revenue_generated
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    setFilteredServices(filtered)
  }, [services, categoryFilter, searchTerm, sortBy, sortOrder])

  if (loading) {
    return <PageLoading message="Loading services..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleSort = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  const handleToggleActive = (serviceId: number) => {
    setServices(prev => 
      prev.map(service => 
        service.id === serviceId ? { ...service, is_active: !service.is_active } : service
      )
    )
  }

  const handleToggleFeatured = (serviceId: number) => {
    setServices(prev => 
      prev.map(service => 
        service.id === serviceId ? { ...service, is_featured: !service.is_featured } : service
      )
    )
  }

  const totalServices = services.length
  const activeServices = services.filter(s => s.is_active).length
  const totalRevenue = services.reduce((sum, s) => sum + s.revenue_generated, 0)
  const averagePrice = services.reduce((sum, s) => sum + s.price, 0) / services.length

  const getCategoryData = () => {
    const categories = SERVICE_CATEGORIES.slice(1) // Exclude "All Services"
    return categories.map(cat => {
      const categoryServices = services.filter(s => s.category === cat.name)
      return {
        name: cat.name,
        count: categoryServices.length,
        total_revenue: categoryServices.reduce((sum, s) => sum + s.revenue_generated, 0),
        average_price: categoryServices.length > 0 ? 
          categoryServices.reduce((sum, s) => sum + s.price, 0) / categoryServices.length : 0,
        color: cat.color
      }
    })
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? 
      <ArrowUpIcon className="w-4 h-4" /> : 
      <ArrowDownIcon className="w-4 h-4" />
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
              >
                ← Dashboard
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ScissorsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Services Management
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage your service menu and pricing
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                leftIcon={<FunnelIcon className="w-5 h-5" />}
              >
                Bulk Actions
              </Button>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-5 h-5" />}
              >
                Add Service
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ScissorsIcon className="w-5 h-5 text-blue-600" />
                <Badge variant="secondary">{activeServices} active</Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalServices}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Services
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Revenue
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <TagIcon className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(averagePrice)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Average Price
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ClockIcon className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length)}m
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Avg Duration
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="services">Services List</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="analytics">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    {SERVICE_CATEGORIES.map((category) => (
                      <option key={category.name} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Services Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Service</span>
                            {getSortIcon('name')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('price')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Price</span>
                            {getSortIcon('price')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('duration')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Duration</span>
                            {getSortIcon('duration')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('bookings')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Bookings</span>
                            {getSortIcon('bookings')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredServices.map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4">
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {service.name}
                                </h3>
                                {service.is_featured && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-600">
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {service.description}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={SERVICE_CATEGORIES.find(c => c.name === service.category)?.color}>
                              {service.category}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(service.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDuration(service.duration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {service.booking_count}
                              </div>
                              <div className="text-green-600">
                                {formatCurrency(service.revenue_generated)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {service.is_active ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircleIcon className="w-5 h-5 text-red-600" />
                              )}
                              <span className={`text-sm font-medium ${
                                service.is_active ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {service.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<PencilIcon className="w-4 h-4" />}
                              >
                                Edit
                              </Button>
                              <Switch
                                checked={service.is_active}
                                onCheckedChange={() => handleToggleActive(service.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCategoryData().map((category) => (
                <Card key={category.name} variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <Badge className={category.color}>
                        {category.count} services
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(category.total_revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Average Price</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(category.average_price)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Service Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed insights into service booking and revenue performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ScissorsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Service performance analytics coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}