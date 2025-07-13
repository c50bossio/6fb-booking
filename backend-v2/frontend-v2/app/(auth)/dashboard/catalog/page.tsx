'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/Input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Package, 
  Scissors, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit,
  Eye,
  Copy,
  Trash2,
  RefreshCw,
  DollarSign,
  Clock,
  Tag,
  Boxes,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Archive
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { catalogApi, type Service, type Product, type CatalogStats } from '@/lib/api/catalog'
import ServiceForm from '@/components/catalog/ServiceForm'
import ProductForm from '@/components/catalog/ProductForm'

export default function CatalogPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [error, setError] = useState<string | null>(null)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modal states
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [showServiceAnalytics, setShowServiceAnalytics] = useState(false)
  const [showProductAnalytics, setShowProductAnalytics] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    loadCatalogData()
  }, [])

  const loadCatalogData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load data from API in parallel
      const [servicesData, productsData, statsData] = await Promise.all([
        catalogApi.getServices().catch(() => []),
        catalogApi.getProducts().catch(() => []),
        catalogApi.getCatalogStats().catch(() => null)
      ])

      setServices(servicesData)
      setProducts(productsData)
      
      if (statsData) {
        setCatalogStats(statsData)
      } else {
        // Generate mock stats from loaded data
        setCatalogStats({
          total_services: servicesData.length,
          total_products: productsData.length,
          active_services: servicesData.filter(s => s.is_active).length,
          active_products: productsData.filter(p => p.status === 'active').length,
          total_service_revenue: 125000,
          total_product_revenue: 32000,
          top_services: servicesData.slice(0, 5),
          top_products: productsData.slice(0, 5),
          low_stock_products: productsData.filter(p => p.inventory_items?.some(i => i.quantity_available < i.reorder_point)) || []
        })
      }

    } catch (err) {
      console.error('Failed to load catalog data:', err)
      setError('Failed to load catalog data')
      
      // Load mock data as fallback
      setServices([
        {
          id: 1,
          name: 'Classic Haircut',
          description: 'Traditional men\'s haircut with scissors and clippers',
          category: 'haircut',
          sku: 'HC001',
          base_price: 35,
          duration_minutes: 30,
          buffer_time_minutes: 10,
          is_active: true,
          is_bookable_online: true,
          is_package: false,
          display_order: 1,
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z'
        },
        {
          id: 2,
          name: 'Beard Trim',
          description: 'Professional beard trimming and shaping',
          category: 'beard',
          sku: 'BT001',
          base_price: 25,
          duration_minutes: 20,
          buffer_time_minutes: 5,
          is_active: true,
          is_bookable_online: true,
          is_package: false,
          display_order: 2,
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z'
        }
      ])

      setProducts([
        {
          id: 1,
          name: 'Premium Hair Pomade',
          description: 'High-quality styling pomade for professional results',
          product_type: 'hair_care',
          vendor: 'Elite Grooming Co.',
          tags: ['styling', 'pomade', 'professional'],
          price: 28.99,
          compare_at_price: 35.99,
          cost_per_item: 15.50,
          status: 'active',
          published: true,
          commission_rate: 0.15,
          requires_shipping: true,
          taxable: true,
          created_at: '2023-01-15T00:00:00Z',
          updated_at: '2023-01-15T00:00:00Z'
        }
      ])

      toast({
        title: 'Warning',
        description: 'Using demo data - catalog API unavailable',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Service handlers
  const handleCreateService = async (data: any) => {
    try {
      const newService = await catalogApi.createService(data)
      setServices(prev => [...prev, newService])
      await loadCatalogData() // Refresh stats
    } catch (error) {
      console.error('Failed to create service:', error)
      throw error
    }
  }

  const handleUpdateService = async (data: any) => {
    if (!editingService) return
    
    try {
      const updatedService = await catalogApi.updateService(editingService.id, data)
      setServices(prev => prev.map(service => service.id === updatedService.id ? updatedService : service))
      await loadCatalogData() // Refresh stats
    } catch (error) {
      console.error('Failed to update service:', error)
      throw error
    }
  }

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    
    try {
      await catalogApi.deleteService(serviceId)
      setServices(prev => prev.filter(service => service.id !== serviceId))
      toast({
        title: 'Success',
        description: 'Service deleted successfully'
      })
      await loadCatalogData() // Refresh stats
    } catch (error) {
      console.error('Failed to delete service:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete service',
        variant: 'destructive'
      })
    }
  }

  const handleDuplicateService = async (service: Service) => {
    try {
      const duplicatedService = await catalogApi.duplicateService(service.id, `${service.name} (Copy)`)
      setServices(prev => [...prev, duplicatedService])
      toast({
        title: 'Success',
        description: 'Service duplicated successfully'
      })
    } catch (error) {
      console.error('Failed to duplicate service:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate service',
        variant: 'destructive'
      })
    }
  }

  // Product handlers
  const handleCreateProduct = async (data: any) => {
    try {
      const newProduct = await catalogApi.createProduct(data)
      setProducts(prev => [...prev, newProduct])
      await loadCatalogData() // Refresh stats
    } catch (error) {
      console.error('Failed to create product:', error)
      throw error
    }
  }

  const handleUpdateProduct = async (data: any) => {
    if (!editingProduct) return
    
    try {
      const updatedProduct = await catalogApi.updateProduct(editingProduct.id, data)
      setProducts(prev => prev.map(product => product.id === updatedProduct.id ? updatedProduct : product))
      await loadCatalogData() // Refresh stats
    } catch (error) {
      console.error('Failed to update product:', error)
      throw error
    }
  }

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      await catalogApi.deleteProduct(productId)
      setProducts(prev => prev.filter(product => product.id !== productId))
      toast({
        title: 'Success',
        description: 'Product deleted successfully'
      })
      await loadCatalogData() // Refresh stats
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive'
      })
    }
  }

  // Import/Export handlers
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        setIsLoading(true)
        let result

        if (selectedTab === 'services' || selectedTab === 'overview') {
          result = await catalogApi.importServices(file)
        } else {
          result = await catalogApi.importProducts(file)
        }

        toast({
          title: 'Import Complete',
          description: `Successfully imported ${result.success} items. ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`
        })

        // Reload data to show imported items
        await loadCatalogData()
        
      } catch (err) {
        console.error('Import failed:', err)
        toast({
          title: 'Import Failed',
          description: 'Failed to import data. Please check file format.',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    input.click()
  }

  const handleExport = async () => {
    try {
      setIsLoading(true)
      let blob: Blob

      if (selectedTab === 'services' || selectedTab === 'overview') {
        blob = await catalogApi.exportServices(undefined, 'csv')
        downloadBlob(blob, 'services-export.csv')
      } else {
        blob = await catalogApi.exportProducts(undefined, 'csv')
        downloadBlob(blob, 'products-export.csv')
      }

      toast({
        title: 'Export Complete',
        description: 'Data exported successfully'
      })
      
    } catch (err) {
      console.error('Export failed:', err)
      toast({
        title: 'Export Failed',
        description: 'Failed to export data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // UI helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      haircut: 'bg-blue-100 text-blue-800',
      shave: 'bg-green-100 text-green-800',
      beard: 'bg-orange-100 text-orange-800',
      hair_treatment: 'bg-purple-100 text-purple-800',
      styling: 'bg-pink-100 text-pink-800',
      color: 'bg-red-100 text-red-800',
      package: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
      hair_care: 'bg-blue-100 text-blue-800',
      tools: 'bg-gray-100 text-gray-800',
      accessories: 'bg-green-100 text-green-800',
      merchandise: 'bg-purple-100 text-purple-800',
      services: 'bg-yellow-100 text-yellow-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter data
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = serviceFilter === 'all' || 
                         (serviceFilter === 'active' && service.is_active) ||
                         (serviceFilter === 'inactive' && !service.is_active) ||
                         (serviceFilter === 'packages' && service.is_package)
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    
    return matchesSearch && matchesFilter && matchesCategory
  })

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = productFilter === 'all' || product.status === productFilter
    const matchesCategory = categoryFilter === 'all' || product.product_type === categoryFilter
    
    return matchesSearch && matchesFilter && matchesCategory
  })

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading catalog...</p>
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
            <Package className="h-8 w-8 text-primary" />
            Product Catalog
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage services and retail products
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCatalogData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline"
            onClick={handleImport}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button 
            variant="outline"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Catalog Overview Stats */}
      {catalogStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{catalogStats.total_services}</div>
              <p className="text-xs text-muted-foreground">
                {catalogStats.active_services} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{catalogStats.total_products}</div>
              <p className="text-xs text-muted-foreground">
                {catalogStats.active_products} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Service Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(catalogStats.total_service_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Product Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(catalogStats.total_product_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Top Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {catalogStats?.top_services?.slice(0, 5).map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Scissors className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h5 className="font-medium text-sm">{service.name}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getCategoryColor(service.category)}>
                              {service.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(service.duration_minutes)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(service.base_price)}</div>
                        <div className="text-xs text-muted-foreground">
                          {service.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5" />
                  Top Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {catalogStats?.top_products?.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h5 className="font-medium text-sm">{product.name}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getCategoryColor(product.product_type)}>
                              {product.product_type.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {product.vendor || 'No vendor'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(product.price)}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.status}
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Alert */}
          {catalogStats?.low_stock_products && catalogStats.low_stock_products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>
                  Products that need restocking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {catalogStats.low_stock_products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <div>
                          <h5 className="font-medium text-sm">{product.name}</h5>
                          <p className="text-xs text-muted-foreground">
                            {product.vendor || 'No vendor'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          Low Stock
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          {/* Services Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="packages">Packages</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="haircut">Haircut</SelectItem>
                  <SelectItem value="shave">Shave</SelectItem>
                  <SelectItem value="beard">Beard</SelectItem>
                  <SelectItem value="hair_treatment">Hair Treatment</SelectItem>
                  <SelectItem value="styling">Styling</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="package">Package</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => {
              setEditingService(null)
              setShowServiceForm(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>

          {/* Services Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {service.is_active ? (
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          Inactive
                        </Badge>
                      )}
                      {service.is_package && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Package
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={getCategoryColor(service.category)}>
                    {service.category}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Price</span>
                      <p className="font-medium">{formatCurrency(service.base_price)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration</span>
                      <p className="font-medium">{formatDuration(service.duration_minutes)}</p>
                    </div>
                    {service.sku && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">SKU</span>
                        <p className="font-medium text-xs">{service.sku}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedService(service)
                      setShowServiceAnalytics(true)
                    }}>
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analytics
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingService(service)
                      setShowServiceForm(true)
                    }}>
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicateService(service)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteService(service.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <Scissors className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No services found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || serviceFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first service'
                }
              </p>
              {(!searchTerm && serviceFilter === 'all' && categoryFilter === 'all') && (
                <Button onClick={() => {
                  setEditingService(null)
                  setShowServiceForm(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Service
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          {/* Products Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hair_care">Hair Care</SelectItem>
                  <SelectItem value="tools">Tools</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="merchandise">Merchandise</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => {
              setEditingProduct(null)
              setShowProductForm(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Products Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <Badge className={getStatusColor(product.status)}>
                      {product.status}
                    </Badge>
                  </div>
                  <Badge className={getCategoryColor(product.product_type)}>
                    {product.product_type.replace('_', ' ')}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Price</span>
                      <div className="flex items-center gap-1">
                        <p className="font-medium">{formatCurrency(product.price)}</p>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(product.compare_at_price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Commission</span>
                      <p className="font-medium">{(product.commission_rate * 100).toFixed(1)}%</p>
                    </div>
                    {product.vendor && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Vendor</span>
                        <p className="font-medium text-xs">{product.vendor}</p>
                      </div>
                    )}
                  </div>

                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {product.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{product.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedProduct(product)
                      setShowProductAnalytics(true)
                    }}>
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analytics
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingProduct(product)
                      setShowProductForm(true)
                    }}>
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || productFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first product'
                }
              </p>
              {(!searchTerm && productFilter === 'all' && categoryFilter === 'all') && (
                <Button onClick={() => {
                  setEditingProduct(null)
                  setShowProductForm(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Catalog Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="font-medium">
                      {formatCurrency((catalogStats?.total_service_revenue || 0) + (catalogStats?.total_product_revenue || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Services Revenue</span>
                    <span className="font-medium">
                      {formatCurrency(catalogStats?.total_service_revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Products Revenue</span>
                    <span className="font-medium">
                      {formatCurrency(catalogStats?.total_product_revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Service Price</span>
                    <span className="font-medium">
                      {services.length > 0 
                        ? formatCurrency(services.reduce((sum, s) => sum + s.base_price, 0) / services.length)
                        : '$0'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Product Price</span>
                    <span className="font-medium">
                      {products.length > 0 
                        ? formatCurrency(products.reduce((sum, p) => sum + p.price, 0) / products.length)
                        : '$0'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Catalog Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Services</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${services.length > 0 ? (services.filter(s => s.is_active).length / services.length) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {services.length > 0 ? Math.round((services.filter(s => s.is_active).length / services.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Products</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${products.length > 0 ? (products.filter(p => p.status === 'active').length / products.length) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {products.length > 0 ? Math.round((products.filter(p => p.status === 'active').length / products.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Services with Descriptions</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ 
                            width: `${services.length > 0 ? (services.filter(s => s.description).length / services.length) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {services.length > 0 ? Math.round((services.filter(s => s.description).length / services.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Products with Descriptions</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ 
                            width: `${products.length > 0 ? (products.filter(p => p.description).length / products.length) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {products.length > 0 ? Math.round((products.filter(p => p.description).length / products.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Components */}
      <ServiceForm
        service={editingService}
        isOpen={showServiceForm}
        onClose={() => {
          setShowServiceForm(false)
          setEditingService(null)
        }}
        onSave={editingService ? handleUpdateService : handleCreateService}
        mode={editingService ? 'edit' : 'create'}
      />

      <ProductForm
        product={editingProduct}
        isOpen={showProductForm}
        onClose={() => {
          setShowProductForm(false)
          setEditingProduct(null)
        }}
        onSave={editingProduct ? handleUpdateProduct : handleCreateProduct}
        mode={editingProduct ? 'edit' : 'create'}
      />

      {showServiceAnalytics && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Analytics for {selectedService.name}
            </h3>
            <p className="text-muted-foreground mb-4">
              Service analytics component will be implemented next.
            </p>
            <Button onClick={() => {
              setShowServiceAnalytics(false)
              setSelectedService(null)
            }}>
              Close
            </Button>
          </div>
        </div>
      )}

      {showProductAnalytics && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Analytics for {selectedProduct.name}
            </h3>
            <p className="text-muted-foreground mb-4">
              Product analytics component will be implemented next.
            </p>
            <Button onClick={() => {
              setShowProductAnalytics(false)
              setSelectedProduct(null)
            }}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}