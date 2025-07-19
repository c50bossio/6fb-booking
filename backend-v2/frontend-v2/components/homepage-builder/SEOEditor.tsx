"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, Search, Globe, Share2 } from 'lucide-react'

import { SEOConfig, useHomepageBuilder } from './HomepageBuilderContext'

interface SEOEditorProps {
  seo: SEOConfig
  onSEOChange: (seo: SEOConfig) => void
}

export function SEOEditor({ seo, onSEOChange }: SEOEditorProps) {
  const { uploadMedia } = useHomepageBuilder()

  const updateSEO = (field: keyof SEOConfig, value: any) => {
    onSEOChange({ ...seo, [field]: value })
  }

  const handleOGImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const url = await uploadMedia(file, 'image')
      updateSEO('og_image_url', url)
    } catch (error) {
      console.error('OG image upload failed:', error)
    }
  }

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !seo.meta_keywords.includes(keyword.trim())) {
      updateSEO('meta_keywords', [...seo.meta_keywords, keyword.trim()])
    }
  }

  const removeKeyword = (index: number) => {
    const newKeywords = seo.meta_keywords.filter((_, i) => i !== index)
    updateSEO('meta_keywords', newKeywords)
  }

  const getCharacterCount = (text: string, limit: number) => {
    const count = text.length
    const color = count > limit ? 'text-red-500' : count > limit * 0.9 ? 'text-yellow-500' : 'text-green-500'
    return { count, color, remaining: limit - count }
  }

  return (
    <div className="space-y-6">
      {/* Basic SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Engine Optimization
          </CardTitle>
          <CardDescription>
            Optimize your homepage for search engines to improve visibility and rankings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-title">Meta Title</Label>
            <Input
              id="meta-title"
              value={seo.meta_title || ''}
              onChange={(e) => updateSEO('meta_title', e.target.value)}
              placeholder="Your Business Name - Professional Barber Services"
              maxLength={60}
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                This appears as the clickable headline in search results
              </span>
              <span className={getCharacterCount(seo.meta_title || '', 60).color}>
                {getCharacterCount(seo.meta_title || '', 60).count}/60
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-description">Meta Description</Label>
            <Textarea
              id="meta-description"
              value={seo.meta_description || ''}
              onChange={(e) => updateSEO('meta_description', e.target.value)}
              placeholder="Professional barber services in [City]. Expert cuts, beard trims, and styling. Book your appointment today for the best barbershop experience."
              rows={3}
              maxLength={160}
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                This appears as the description text in search results
              </span>
              <span className={getCharacterCount(seo.meta_description || '', 160).color}>
                {getCharacterCount(seo.meta_description || '', 160).count}/160
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Keywords</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {seo.meta_keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 ml-1"
                    onClick={() => removeKeyword(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addKeyword((e.target as HTMLInputElement).value)
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Add keyword"]') as HTMLInputElement
                  if (input) {
                    addKeyword(input.value)
                    input.value = ''
                  }
                }}
              >
                Add
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Add keywords that describe your services (e.g., "barber", "haircut", "beard trim", "your city")
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="canonical-url">Canonical URL</Label>
              <Input
                id="canonical-url"
                value={seo.canonical_url || ''}
                onChange={(e) => updateSEO('canonical_url', e.target.value)}
                placeholder="https://yourdomain.com"
              />
              <div className="text-xs text-muted-foreground">
                Leave empty to use current URL
              </div>
            </div>

            <div className="space-y-2">
              <Label>Robots Meta</Label>
              <Select
                value={seo.robots_meta}
                onValueChange={(value) => updateSEO('robots_meta', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="index,follow">Index, Follow (Recommended)</SelectItem>
                  <SelectItem value="index,nofollow">Index, No Follow</SelectItem>
                  <SelectItem value="noindex,follow">No Index, Follow</SelectItem>
                  <SelectItem value="noindex,nofollow">No Index, No Follow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="structured-data"
              checked={seo.structured_data_enabled}
              onCheckedChange={(checked) => updateSEO('structured_data_enabled', checked)}
            />
            <Label htmlFor="structured-data">
              Enable structured data (helps search engines understand your business)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Social Media & Open Graph
          </CardTitle>
          <CardDescription>
            Control how your homepage appears when shared on social media platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="og-title">Social Media Title</Label>
            <Input
              id="og-title"
              value={seo.og_title || ''}
              onChange={(e) => updateSEO('og_title', e.target.value)}
              placeholder="Leave empty to use meta title"
              maxLength={60}
            />
            <div className="text-xs text-muted-foreground">
              Optional: Custom title for social media shares
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="og-description">Social Media Description</Label>
            <Textarea
              id="og-description"
              value={seo.og_description || ''}
              onChange={(e) => updateSEO('og_description', e.target.value)}
              placeholder="Leave empty to use meta description"
              rows={2}
              maxLength={160}
            />
            <div className="text-xs text-muted-foreground">
              Optional: Custom description for social media shares
            </div>
          </div>

          <div className="space-y-2">
            <Label>Social Media Image</Label>
            <div className="flex items-center gap-3">
              <Input
                value={seo.og_image_url || ''}
                onChange={(e) => updateSEO('og_image_url', e.target.value)}
                placeholder="Enter image URL or upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('og-image-upload')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                id="og-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleOGImageUpload}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Recommended size: 1200x630px. This image appears when your page is shared on social media.
            </div>
            {seo.og_image_url && (
              <div className="mt-2">
                <img
                  src={seo.og_image_url}
                  alt="Social media preview"
                  className="h-32 w-auto border rounded"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Twitter Card Type</Label>
            <Select
              value={seo.twitter_card_type}
              onValueChange={(value) => updateSEO('twitter_card_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary (Small image)</SelectItem>
                <SelectItem value="summary_large_image">Summary Large Image (Recommended)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SEO Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Search Result Preview
          </CardTitle>
          <CardDescription>
            Preview how your homepage will appear in search results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-blue-600 text-lg hover:underline cursor-pointer">
              {seo.meta_title || 'Your Business Name - Professional Barber Services'}
            </div>
            <div className="text-green-700 text-sm">
              {seo.canonical_url || 'https://yourdomain.com'}
            </div>
            <div className="text-gray-600 text-sm mt-1">
              {seo.meta_description || 'Professional barber services in your city. Expert cuts, beard trims, and styling. Book your appointment today for the best barbershop experience.'}
            </div>
          </div>

          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="text-sm font-medium mb-2">Social Media Preview</div>
            <div className="border rounded bg-white p-3 max-w-md">
              {seo.og_image_url && (
                <img 
                  src={seo.og_image_url} 
                  alt="Social preview" 
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              <div className="font-medium text-sm">
                {seo.og_title || seo.meta_title || 'Your Business Name'}
              </div>
              <div className="text-gray-600 text-xs mt-1">
                {seo.og_description || seo.meta_description || 'Your business description...'}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {seo.canonical_url || 'yourdomain.com'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}