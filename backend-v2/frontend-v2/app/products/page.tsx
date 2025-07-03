'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus, Search, Package, DollarSign, Archive, Edit, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { productsAPI } from '@/lib/api/products'
import { ProductStatus, ProductType, ProductCatalogFilter } from '@/types/product'
import { getProfile } from '@/lib/api'

export default function ProductsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [filters, setFilters] = useState<ProductCatalogFilter>({
    limit: 20,
    offset: 0,
    status: ProductStatus.ACTIVE
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<ProductType | ''>('')
  
  // Check user permissions
  useEffect(() => {
    getProfile().then(profile => {
      if (!['admin', 'super_admin', 'manager'].includes(profile.role || '')) {
        router.push('/dashboard')
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to manage products.',
          variant: 'destructive'
        })
      }
    }).catch(() => {
      router.push('/login')
    })
  }, [router, toast])
  
  // Fetch products
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsAPI.getProducts(filters)
  })
  
  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (productId: number) => productsAPI.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        title: 'Product Deleted',
        description: 'The product has been successfully deleted.'
      })
    },
    onError: () => {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the product. Please try again.',
        variant: 'destructive'
      })
    }
  })
  
  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      product_type: selectedType || undefined,
      offset: 0
    }))
  }
  
  const handleDelete = (productId: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(productId)
    }
  }
  
  const getStatusBadge = (status: ProductStatus) => {
    const variants = {
      [ProductStatus.ACTIVE]: 'default',
      [ProductStatus.INACTIVE]: 'secondary',
      [ProductStatus.DRAFT]: 'outline',
      [ProductStatus.ARCHIVED]: 'destructive'
    } as const
    
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }
  
  const getTypeBadge = (type: ProductType) => {
    const colors = {
      [ProductType.PHYSICAL]: 'bg-blue-100 text-blue-800',
      [ProductType.SERVICE]: 'bg-green-100 text-green-800',
      [ProductType.DIGITAL]: 'bg-purple-100 text-purple-800',
      [ProductType.GIFT_CARD]: 'bg-pink-100 text-pink-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
        {type.replace('_', ' ')}
      </span>
    )
  }
  
  if (error) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center">
          <p className="text-red-500">Failed to load products. Please try again.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-2">
            Manage your product catalog and inventory
          </p>
        </div>
        
        <Button onClick={() => router.push('/products/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.products.filter(p => p.status === ProductStatus.ACTIVE).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {data?.products.filter(p => 
                p.inventory?.some(i => i.quantity_available < (i.reorder_point || 10))
              ).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data?.products.reduce((sum, p) => {
                const inventory = p.inventory?.reduce((total, i) => total + i.quantity_available, 0) || 0
                return sum + (p.cost || p.price) * inventory
              }, 0).toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ProductType | '')}
            >
              <option value="">All Types</option>
              <option value={ProductType.PHYSICAL}>Physical</option>
              <option value={ProductType.SERVICE}>Service</option>
              <option value={ProductType.DIGITAL}>Digital</option>
              <option value={ProductType.GIFT_CARD}>Gift Card</option>
            </Select>
            
            <Select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                status: e.target.value as ProductStatus || undefined
              }))}
            >
              <option value="">All Status</option>
              <option value={ProductStatus.ACTIVE}>Active</option>
              <option value={ProductStatus.INACTIVE}>Inactive</option>
              <option value={ProductStatus.DRAFT}>Draft</option>
              <option value={ProductStatus.ARCHIVED}>Archived</option>
            </Select>
            
            <Button onClick={handleSearch} variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.products.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No products found</p>
              <Button
                onClick={() => router.push('/products/new')}
                className="mt-4"
                variant="outline"
              >
                Add Your First Product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inventory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {data?.products.map((product) => {
                    const totalInventory = product.inventory?.reduce((sum, i) => sum + i.quantity_available, 0) || 0
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {product.name}
                              </div>
                              {product.vendor && (
                                <div className="text-sm text-gray-500">
                                  {product.vendor}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(product.product_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {product.track_inventory ? (
                              <>
                                {totalInventory} in stock
                                {totalInventory < 10 && totalInventory > 0 && (
                                  <span className="ml-2 text-yellow-600 text-xs">Low</span>
                                )}
                                {totalInventory === 0 && (
                                  <span className="ml-2 text-red-600 text-xs">Out of stock</span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500">Not tracked</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(product.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => router.push(`/products/${product.id}`)}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(product.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Pagination */}
      {data && data.total > filters.limit! && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filters.offset! + 1} to {Math.min(filters.offset! + filters.limit!, data.total)} of {data.total} products
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setFilters(prev => ({
                ...prev,
                offset: Math.max(0, prev.offset! - prev.limit!)
              }))}
              disabled={filters.offset === 0}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() => setFilters(prev => ({
                ...prev,
                offset: prev.offset! + prev.limit!
              }))}
              disabled={!data.has_more}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}