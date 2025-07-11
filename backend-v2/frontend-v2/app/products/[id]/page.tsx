'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Package, Plus, Edit2, Trash2, Upload, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { productsAPI } from '@/lib/api/products'
import { integrationsAPI } from '@/lib/api/integrations'
import { ProductUpdate, ProductType, ProductStatus } from '@/types/product'
import { IntegrationType } from '@/types/integration'
import { getProfile } from '@/lib/api'

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const productId = parseInt(params.id as string)
  
  const [formData, setFormData] = useState<ProductUpdate>({})
  const [tags, setTags] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
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
  
  // Fetch product details
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsAPI.getProduct(productId)
  })
  
  // Fetch Shopify integration status
  const { data: integrations } = useQuery({
    queryKey: ['integrations', 'shopify'],
    queryFn: () => integrationsAPI.getIntegrations({ integration_type: IntegrationType.SHOPIFY })
  })
  
  const shopifyIntegration = integrations?.find(i => i.integration_type === IntegrationType.SHOPIFY && i.is_active)
  
  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: (updates: ProductUpdate) => productsAPI.updateProduct(productId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      toast({
        title: 'Product Updated',
        description: 'The product has been successfully updated.'
      })
      setIsEditing(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update product. Please try again.',
        variant: 'destructive'
      })
    }
  })
  
  // Shopify sync mutation
  const syncMutation = useMutation({
    mutationFn: () => productsAPI.syncShopifyProducts({
      integration_id: shopifyIntegration!.id,
      sync_type: 'incremental',
      options: { update_existing: true }
    }),
    onSuccess: (result) => {
      toast({
        title: 'Sync Complete',
        description: `Synced ${result.products_synced} products successfully.`
      })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync with Shopify.',
        variant: 'destructive'
      })
    }
  })
  
  // Initialize form data when product loads
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description,
        product_type: product.product_type,
        status: product.status,
        price: product.price,
        compare_at_price: product.compare_at_price,
        cost: product.cost,
        barcode: product.barcode,
        track_inventory: product.track_inventory,
        weight: product.weight,
        weight_unit: product.weight_unit,
        vendor: product.vendor,
        published: product.published
      })
      setTags(product.tags.join(', '))
    }
  }, [product])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Process tags
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    
    updateMutation.mutate({
      ...formData,
      tags: tagArray
    })
  }
  
  const handleInputChange = (field: keyof ProductUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    )
  }
  
  if (error || !product) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">
          <p className="text-red-500">Failed to load product. Please try again.</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }
  
  const totalInventory = product.inventory?.reduce((sum, i) => sum + i.quantity_available, 0) || 0
  
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{product.status}</Badge>
              {product.shopify_product_id && (
                <Badge variant="outline">
                  Synced with Shopify
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {shopifyIntegration && product.shopify_product_id && (
            <Button
              onClick={() => syncMutation.mutate()}
              variant="outline"
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync with Shopify
            </Button>
          )}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Product
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setIsEditing(false)
                  // Reset form data
                  setFormData({
                    name: product.name,
                    sku: product.sku,
                    description: product.description,
                    product_type: product.product_type,
                    status: product.status,
                    price: product.price,
                    compare_at_price: product.compare_at_price,
                    cost: product.cost,
                    barcode: product.barcode,
                    track_inventory: product.track_inventory,
                    weight: product.weight,
                    weight_unit: product.weight_unit,
                    vendor: product.vendor,
                    published: product.published
                  })
                  setTags(product.tags.join(', '))
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku || ''}
                        onChange={(e) => handleInputChange('sku', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="barcode">Barcode</Label>
                      <Input
                        id="barcode"
                        value={formData.barcode || ''}
                        onChange={(e) => handleInputChange('barcode', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                      rows={4}
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product_type">Product Type</Label>
                      <Select
                        id="product_type"
                        value={formData.product_type || ''}
                        onChange={(e) => handleInputChange('product_type', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value={ProductType.PHYSICAL}>Physical Product</option>
                        <option value={ProductType.SERVICE}>Service</option>
                        <option value={ProductType.DIGITAL}>Digital Product</option>
                        <option value={ProductType.GIFT_CARD}>Gift Card</option>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="vendor">Vendor/Brand</Label>
                      <Input
                        id="vendor"
                        value={formData.vendor || ''}
                        onChange={(e) => handleInputChange('vendor', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price || ''}
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="compare_at_price">Compare at Price</Label>
                      <Input
                        id="compare_at_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.compare_at_price || ''}
                        onChange={(e) => handleInputChange('compare_at_price', parseFloat(e.target.value) || undefined)}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cost">Cost</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost || ''}
                        onChange={(e) => handleInputChange('cost', parseFloat(e.target.value) || undefined)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  {formData.cost && formData.price && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Profit Margin: ${(formData.price - formData.cost).toFixed(2)} ({((formData.price - formData.cost) / formData.price * 100).toFixed(1)}%)
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="inventory" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="track_inventory">Track Inventory</Label>
                      <p className="text-sm text-gray-500">
                        Enable to track product quantities
                      </p>
                    </div>
                    <Switch
                      id="track_inventory"
                      checked={formData.track_inventory || false}
                      onCheckedChange={(checked) => handleInputChange('track_inventory', checked)}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  {product.inventory && product.inventory.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-4">Current Inventory</h4>
                      <div className="space-y-2">
                        {product.inventory.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                              <p className="font-medium">Location {inv.location_id}</p>
                              <p className="text-sm text-gray-600">
                                Available: {inv.quantity_available} | Reserved: {inv.quantity_reserved}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              Adjust
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="variants" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Variants</CardTitle>
                  <CardDescription>
                    Manage different versions of this product
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {product.variants && product.variants.length > 0 ? (
                    <div className="space-y-4">
                      {product.variants.map((variant) => (
                        <div key={variant.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{variant.title}</p>
                            <p className="text-sm text-gray-600">
                              SKU: {variant.sku} | Price: ${variant.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No variants for this product</p>
                      <Button variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variant
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Product Status</Label>
                <Select
                  id="status"
                  value={formData.status || ''}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={!isEditing}
                >
                  <option value={ProductStatus.ACTIVE}>Active</option>
                  <option value={ProductStatus.INACTIVE}>Inactive</option>
                  <option value={ProductStatus.DRAFT}>Draft</option>
                  <option value={ProductStatus.ARCHIVED}>Archived</option>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="published">Published</Label>
                <Switch
                  id="published"
                  checked={formData.published || false}
                  onCheckedChange={(checked) => handleInputChange('published', checked)}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma separated"
                  disabled={!isEditing}
                />
              </div>
              
              {product.created_at && (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Created: {new Date(product.created_at).toLocaleDateString()}</p>
                  <p>Updated: {new Date(product.updated_at).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Inventory</span>
                <span className="font-medium">{totalInventory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inventory Value</span>
                <span className="font-medium">
                  ${((product.cost || product.price) * totalInventory).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}