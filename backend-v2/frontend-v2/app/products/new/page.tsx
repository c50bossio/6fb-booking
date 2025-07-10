'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { productsAPI } from '@/lib/api/products'
import { ProductCreate, ProductType, ProductStatus } from '@/types/product'

export default function NewProductPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState<ProductCreate>({
    name: '',
    sku: '',
    description: '',
    product_type: ProductType.PHYSICAL,
    status: ProductStatus.ACTIVE,
    price: 0,
    track_inventory: true,
    published: false
  })
  
  const [tags, setTags] = useState('')
  
  const createMutation = useMutation({
    mutationFn: (data: ProductCreate) => productsAPI.createProduct(data),
    onSuccess: (product) => {
      toast({
        title: 'Product Created',
        description: 'The product has been successfully created.'
      })
      router.push(`/products/${product.id}`)
    },
    onError: (error: any) => {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create product. Please try again.',
        variant: 'destructive'
      })
    }
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name || !formData.sku || formData.price < 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      })
      return
    }
    
    // Process tags
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    
    createMutation.mutate({
      ...formData,
      tags: tagArray
    })
  }
  
  const handleInputChange = (field: keyof ProductCreate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Create New Product</h1>
          <p className="text-muted-foreground mt-2">
            Add a new product to your catalog
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the basic details of your product
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Premium Hair Pomade"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="e.g., POMADE-001"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode || ''}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="e.g., 123456789012"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={4}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your product..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product_type">Product Type *</Label>
                <Select
                  id="product_type"
                  value={formData.product_type}
                  onChange={(e) => handleInputChange('product_type', e.target.value)}
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
                  placeholder="e.g., Six Figure Barber"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>
              Set your product pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  required
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
                  placeholder="Original price"
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
                  placeholder="Your cost"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>
              Manage inventory tracking
            </CardDescription>
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
                checked={formData.track_inventory}
                onCheckedChange={(checked) => handleInputChange('track_inventory', checked)}
              />
            </div>
            
            {formData.product_type === ProductType.PHYSICAL && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight || ''}
                    onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || undefined)}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight_unit">Weight Unit</Label>
                  <Select
                    id="weight_unit"
                    value={formData.weight_unit || 'lb'}
                    onChange={(e) => handleInputChange('weight_unit', e.target.value)}
                  >
                    <option value="lb">Pounds (lb)</option>
                    <option value="oz">Ounces (oz)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              Organize and categorize your product
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., hair-care, styling, premium (comma separated)"
              />
              <p className="text-sm text-gray-500 mt-1">
                Separate tags with commas
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <option value={ProductStatus.ACTIVE}>Active</option>
                  <option value={ProductStatus.DRAFT}>Draft</option>
                  <option value={ProductStatus.INACTIVE}>Inactive</option>
                </Select>
              </div>
              
              <div className="flex items-center gap-4 pt-6">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => handleInputChange('published', checked)}
                />
                <Label htmlFor="published">Published</Label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}