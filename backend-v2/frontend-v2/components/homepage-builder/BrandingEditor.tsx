"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload } from 'lucide-react'

import { BrandingConfig, useHomepageBuilder } from './HomepageBuilderContext'

interface BrandingEditorProps {
  branding: BrandingConfig
  onBrandingChange: (branding: BrandingConfig) => void
}

export function BrandingEditor({ branding, onBrandingChange }: BrandingEditorProps) {
  const { uploadMedia } = useHomepageBuilder()

  const updateBranding = (field: keyof BrandingConfig, value: any) => {
    onBrandingChange({ ...branding, [field]: value })
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const url = await uploadMedia(file, 'image')
      updateBranding('logo_url', url)
    } catch (error) {
      console.error('Logo upload failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo & Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Logo & Brand Assets</CardTitle>
          <CardDescription>
            Upload your logo and set brand colors to match your business identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <Input
                value={branding.logo_url || ''}
                onChange={(e) => updateBranding('logo_url', e.target.value)}
                placeholder="Enter logo URL or upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('logo-upload')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
            {branding.logo_url && (
              <div className="mt-2">
                <img
                  src={branding.logo_url}
                  alt="Logo preview"
                  className="h-16 w-auto border rounded"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Favicon</Label>
            <Input
              value={branding.favicon_url || ''}
              onChange={(e) => updateBranding('favicon_url', e.target.value)}
              placeholder="Enter favicon URL"
            />
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>
            Set your brand colors to create a cohesive visual identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="primary-color"
                  type="color"
                  value={branding.primary_color}
                  onChange={(e) => updateBranding('primary_color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={branding.primary_color}
                  onChange={(e) => updateBranding('primary_color', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="secondary-color"
                  type="color"
                  value={branding.secondary_color}
                  onChange={(e) => updateBranding('secondary_color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={branding.secondary_color}
                  onChange={(e) => updateBranding('secondary_color', e.target.value)}
                  placeholder="#333333"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="accent-color"
                  type="color"
                  value={branding.accent_color}
                  onChange={(e) => updateBranding('accent_color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={branding.accent_color}
                  onChange={(e) => updateBranding('accent_color', e.target.value)}
                  placeholder="#FFD700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="text-color"
                  type="color"
                  value={branding.text_color}
                  onChange={(e) => updateBranding('text_color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={branding.text_color}
                  onChange={(e) => updateBranding('text_color', e.target.value)}
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background-color">Background Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="background-color"
                  type="color"
                  value={branding.background_color}
                  onChange={(e) => updateBranding('background_color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={branding.background_color}
                  onChange={(e) => updateBranding('background_color', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6">
            <Label>Color Preview</Label>
            <div className="flex gap-2 mt-2">
              <div
                className="w-12 h-12 rounded border-2 border-gray-300"
                style={{ backgroundColor: branding.primary_color }}
                title="Primary"
              />
              <div
                className="w-12 h-12 rounded border-2 border-gray-300"
                style={{ backgroundColor: branding.secondary_color }}
                title="Secondary"
              />
              <div
                className="w-12 h-12 rounded border-2 border-gray-300"
                style={{ backgroundColor: branding.accent_color }}
                title="Accent"
              />
              <div
                className="w-12 h-12 rounded border-2 border-gray-300"
                style={{ backgroundColor: branding.text_color }}
                title="Text"
              />
              <div
                className="w-12 h-12 rounded border-2 border-gray-300"
                style={{ backgroundColor: branding.background_color }}
                title="Background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>
            Choose fonts that reflect your brand personality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Body Font</Label>
              <Select
                value={branding.font_family}
                onValueChange={(value) => updateBranding('font_family', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter (Modern)</SelectItem>
                  <SelectItem value="Roboto">Roboto (Clean)</SelectItem>
                  <SelectItem value="Open Sans">Open Sans (Friendly)</SelectItem>
                  <SelectItem value="Lato">Lato (Humanist)</SelectItem>
                  <SelectItem value="Montserrat">Montserrat (Geometric)</SelectItem>
                  <SelectItem value="Poppins">Poppins (Round)</SelectItem>
                  <SelectItem value="Source Sans Pro">Source Sans Pro (Technical)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Heading Font</Label>
              <Select
                value={branding.heading_font || branding.font_family}
                onValueChange={(value) => updateBranding('heading_font', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Same as body</SelectItem>
                  <SelectItem value="Playfair Display">Playfair Display (Elegant)</SelectItem>
                  <SelectItem value="Merriweather">Merriweather (Traditional)</SelectItem>
                  <SelectItem value="Oswald">Oswald (Bold)</SelectItem>
                  <SelectItem value="Raleway">Raleway (Sophisticated)</SelectItem>
                  <SelectItem value="Bebas Neue">Bebas Neue (Impact)</SelectItem>
                  <SelectItem value="Cormorant Garamond">Cormorant Garamond (Luxury)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Font Preview */}
          <div className="mt-4 p-4 border rounded-lg">
            <div
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: branding.heading_font || branding.font_family }}
            >
              Your Heading Font
            </div>
            <div
              className="text-base"
              style={{ fontFamily: branding.font_family }}
            >
              This is how your body text will look on your homepage. It should be easy to read and reflect your brand personality.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Style Options */}
      <Card>
        <CardHeader>
          <CardTitle>Style Options</CardTitle>
          <CardDescription>
            Customize the visual style elements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Border Radius</Label>
              <Select
                value={branding.border_radius}
                onValueChange={(value) => updateBranding('border_radius', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Sharp)</SelectItem>
                  <SelectItem value="small">Small (2px)</SelectItem>
                  <SelectItem value="medium">Medium (6px)</SelectItem>
                  <SelectItem value="large">Large (12px)</SelectItem>
                  <SelectItem value="full">Full (Rounded)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Button Style</Label>
              <Select
                value={branding.button_style}
                onValueChange={(value) => updateBranding('button_style', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Style Preview */}
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex gap-3">
              <Button
                variant={branding.button_style === 'solid' ? 'default' : branding.button_style === 'outline' ? 'outline' : 'ghost'}
                style={{
                  backgroundColor: branding.button_style === 'solid' ? branding.primary_color : 'transparent',
                  borderColor: branding.button_style === 'outline' ? branding.primary_color : 'transparent',
                  color: branding.button_style === 'solid' ? branding.text_color : branding.primary_color,
                  borderRadius: 
                    branding.border_radius === 'none' ? '0px' :
                    branding.border_radius === 'small' ? '2px' :
                    branding.border_radius === 'medium' ? '6px' :
                    branding.border_radius === 'large' ? '12px' :
                    branding.border_radius === 'full' ? '9999px' : '6px'
                }}
              >
                Button Preview
              </Button>
              <div
                className="px-4 py-2 border inline-block"
                style={{
                  borderRadius: 
                    branding.border_radius === 'none' ? '0px' :
                    branding.border_radius === 'small' ? '2px' :
                    branding.border_radius === 'medium' ? '6px' :
                    branding.border_radius === 'large' ? '12px' :
                    branding.border_radius === 'full' ? '9999px' : '6px'
                }}
              >
                Card Preview
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}