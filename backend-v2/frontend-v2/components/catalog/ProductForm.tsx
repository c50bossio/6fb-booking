'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Package, 
  Save, 
  X, 
  DollarSign,
  Tag,
  Image,
  Truck,
  Receipt,
  AlertTriangle,
  Info,
  Plus,
  Minus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Product, ProductCreateData } from '@/lib/api/catalog'

interface ProductFormProps {
  product?: Product | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProductCreateData) => Promise<void>
  mode: 'create' | 'edit'
}

const PRODUCT_TYPES = [
  { value: 'hair_care', label: 'Hair Care', description: 'Shampoos, conditioners, styling products' },
  { value: 'tools', label: 'Tools', description: 'Clippers, scissors, combs, equipment' },
  { value: 'accessories', label: 'Accessories', description: 'Capes, brushes, styling accessories' },
  { value: 'merchandise', label: 'Merchandise', description: 'Branded items, apparel, gift cards' },
  { value: 'services', label: 'Services', description: 'Service packages, gift certificates' }
]

const PRODUCT_STATUSES = [
  { value: 'active', label: 'Active', description: 'Available for sale' },
  { value: 'inactive', label: 'Inactive', description: 'Not available for sale' },
  { value: 'draft', label: 'Draft', description: 'Work in progress' },
  { value: 'archived', label: 'Archived', description: 'No longer sold' }
]

export default function ProductForm({ 
  product, 
  isOpen, 
  onClose, 
  onSave, 
  mode 
}: ProductFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<ProductCreateData>({
    name: product?.name || '',
    description: product?.description || '',
    product_type: product?.product_type || 'hair_care',
    vendor: product?.vendor || '',
    tags: product?.tags || [],
    price: product?.price || 0,
    compare_at_price: product?.compare_at_price || undefined,
    cost_per_item: product?.cost_per_item || undefined,
    status: product?.status || 'active',
    published: product?.published ?? true,
    seo_title: product?.seo_title || '',
    seo_description: product?.seo_description || '',
    handle: product?.handle || '',
    location_id: product?.location_id || undefined,
    commission_rate: product?.commission_rate || 0.15,
    requires_shipping: product?.requires_shipping ?? true,
    taxable: product?.taxable ?? true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newTag, setNewTag] = useState('')

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.product_type) {
      newErrors.product_type = 'Product type is required'
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }

    if (formData.compare_at_price && formData.compare_at_price <= formData.price) {
      newErrors.compare_at_price = 'Compare price must be higher than selling price'
    }

    if (formData.cost_per_item && formData.cost_per_item >= formData.price) {
      newErrors.cost_per_item = 'Cost should be less than selling price'
    }

    if (formData.commission_rate < 0 || formData.commission_rate > 1) {
      newErrors.commission_rate = 'Commission rate must be between 0 and 100%'
    }

    if (formData.handle && !/^[a-z0-9-]+$/.test(formData.handle)) {
      newErrors.handle = 'Handle must contain only lowercase letters, numbers, and hyphens'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please correct the errors below',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Generate handle from name if not provided
      const submitData = { ...formData }
      if (!submitData.handle) {
        submitData.handle = formData.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
      }
      
      await onSave(submitData)
      toast({
        title: 'Success',
        description: `Product ${mode === 'create' ? 'created' : 'updated'} successfully`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to save product:', error)
      toast({
        title: 'Error',
        description: `Failed to ${mode} product`,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProductCreateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const calculateMargin = () => {
    if (formData.cost_per_item && formData.price > 0) {
      const margin = ((formData.price - formData.cost_per_item) / formData.price) * 100
      return margin.toFixed(1)
    }
    return null
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              {mode === 'create' ? 'Add Product' : 'Edit Product'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {mode === 'create' 
                ? 'Create a new retail product for your store'
                : 'Update product details and pricing'
              }
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>
                  Essential product details and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Premium Hair Pomade"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="High-quality styling pomade for professional results..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="product_type">Product Type *</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value) => handleInputChange('product_type', value)}
                  >
                    <SelectTrigger className={errors.product_type ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.product_type && (
                    <p className="text-sm text-red-500 mt-1">{errors.product_type}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vendor">Vendor/Brand</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => handleInputChange('vendor', e.target.value)}
                    placeholder="Elite Grooming Co."
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div>
                            <div className="font-medium">{status.label}</div>
                            <div className="text-xs text-muted-foreground">{status.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing & Economics
                </CardTitle>
                <CardDescription>
                  Product pricing and commission structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="price">Selling Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    className={errors.price ? 'border-red-500' : ''}
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500 mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="compare_at_price">Compare At Price (Optional)</Label>
                  <Input
                    id="compare_at_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.compare_at_price || ''}
                    onChange={(e) => handleInputChange('compare_at_price', parseFloat(e.target.value) || undefined)}
                    className={errors.compare_at_price ? 'border-red-500' : ''}
                  />
                  {errors.compare_at_price && (
                    <p className="text-sm text-red-500 mt-1">{errors.compare_at_price}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Original price before discount (for sale display)
                  </p>
                </div>

                <div>
                  <Label htmlFor="cost_per_item">Cost Per Item (Optional)</Label>
                  <Input
                    id="cost_per_item"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost_per_item || ''}
                    onChange={(e) => handleInputChange('cost_per_item', parseFloat(e.target.value) || undefined)}
                    className={errors.cost_per_item ? 'border-red-500' : ''}
                  />
                  {errors.cost_per_item && (
                    <p className="text-sm text-red-500 mt-1">{errors.cost_per_item}</p>
                  )}
                  {calculateMargin() && (
                    <p className="text-sm text-green-600 mt-1">
                      Margin: {calculateMargin()}%
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="commission_rate">Commission Rate</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="commission_rate"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={formData.commission_rate}
                      onChange={(e) => handleInputChange('commission_rate', parseFloat(e.target.value) || 0)}
                      className={errors.commission_rate ? 'border-red-500' : ''}
                    />
                    <span className="text-sm text-muted-foreground min-w-0">
                      ({(formData.commission_rate * 100).toFixed(1)}%)
                    </span>
                  </div>
                  {errors.commission_rate && (
                    <p className="text-sm text-red-500 mt-1">{errors.commission_rate}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Commission rate for barber sales (0.00 to 1.00)
                  </p>
                </div>

                {/* Pricing Summary */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Pricing Summary</h5>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Selling Price:</span>
                      <span className="font-medium">{formatCurrency(formData.price)}</span>
                    </div>
                    {formData.compare_at_price && (
                      <div className="flex justify-between">
                        <span>Original Price:</span>
                        <span className="line-through text-muted-foreground">{formatCurrency(formData.compare_at_price)}</span>
                      </div>
                    )}
                    {formData.cost_per_item && (
                      <div className="flex justify-between">
                        <span>Cost:</span>
                        <span>{formatCurrency(formData.cost_per_item)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1">
                      <span>Commission:</span>
                      <span className="font-medium">{formatCurrency(formData.price * formData.commission_rate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Product Tags
              </CardTitle>
              <CardDescription>
                Tags help with product organization and search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEO and Technical */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SEO & Online Store</CardTitle>
                <CardDescription>
                  Search engine optimization and online visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="handle">URL Handle</Label>
                  <Input
                    id="handle"
                    value={formData.handle}
                    onChange={(e) => handleInputChange('handle', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="premium-hair-pomade"
                    className={errors.handle ? 'border-red-500' : ''}
                  />
                  {errors.handle && (
                    <p className="text-sm text-red-500 mt-1">{errors.handle}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    URL-friendly version of product name
                  </p>
                </div>

                <div>
                  <Label htmlFor="seo_title">SEO Title</Label>
                  <Input
                    id="seo_title"
                    value={formData.seo_title}
                    onChange={(e) => handleInputChange('seo_title', e.target.value)}
                    placeholder="Premium Hair Pomade - Professional Styling"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Title tag for search engines (50-60 characters)
                  </p>
                </div>

                <div>
                  <Label htmlFor="seo_description">SEO Description</Label>
                  <Textarea
                    id="seo_description"
                    value={formData.seo_description}
                    onChange={(e) => handleInputChange('seo_description', e.target.value)}
                    placeholder="High-quality hair pomade for professional styling..."
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Meta description for search results (150-160 characters)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) => handleInputChange('published', checked)}
                  />
                  <Label htmlFor="published" className="text-sm">
                    Published on online store
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Settings</CardTitle>
                <CardDescription>
                  Shipping, tax, and inventory settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requires_shipping"
                      checked={formData.requires_shipping}
                      onCheckedChange={(checked) => handleInputChange('requires_shipping', checked)}
                    />
                    <Label htmlFor="requires_shipping" className="text-sm flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      Requires shipping
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="taxable"
                      checked={formData.taxable}
                      onCheckedChange={(checked) => handleInputChange('taxable', checked)}
                    />
                    <Label htmlFor="taxable" className="text-sm flex items-center gap-1">
                      <Receipt className="h-4 w-4" />
                      Charge tax on this product
                    </Label>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Inventory tracking and variants can be configured after creating the product
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div>
              {mode === 'create' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Product will be created with default inventory settings
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {mode === 'create' ? 'Create Product' : 'Save Changes'}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}