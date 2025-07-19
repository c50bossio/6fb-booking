"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, X } from 'lucide-react'

import { HomepageSectionConfig, SectionType, useHomepageBuilder } from './HomepageBuilderContext'

interface SectionEditorProps {
  section: HomepageSectionConfig
  onSectionChange: (section: HomepageSectionConfig) => void
}

export function SectionEditor({ section, onSectionChange }: SectionEditorProps) {
  const { uploadMedia } = useHomepageBuilder()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const url = await uploadMedia(file, 'image')
      updateSectionConfig(field, url)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const updateSectionConfig = (field: string, value: any) => {
    const sectionKey = section.section_type
    const currentConfig = section[sectionKey as keyof HomepageSectionConfig]
    
    if (currentConfig && typeof currentConfig === 'object') {
      onSectionChange({
        ...section,
        [sectionKey]: {
          ...currentConfig,
          [field]: value
        }
      })
    }
  }

  const renderHeroEditor = () => {
    const heroConfig = section.hero
    if (!heroConfig) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hero-title">Title</Label>
            <Input
              id="hero-title"
              value={heroConfig.title || ''}
              onChange={(e) => updateSectionConfig('title', e.target.value)}
              placeholder="Welcome to our barbershop"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subtitle</Label>
            <Input
              id="hero-subtitle"
              value={heroConfig.subtitle || ''}
              onChange={(e) => updateSectionConfig('subtitle', e.target.value)}
              placeholder="Professional barber services"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hero-description">Description</Label>
          <Textarea
            id="hero-description"
            value={heroConfig.description || ''}
            onChange={(e) => updateSectionConfig('description', e.target.value)}
            placeholder="Describe your barbershop and services"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Background Type</Label>
            <Select
              value={heroConfig.background_type}
              onValueChange={(value) => updateSectionConfig('background_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="color">Solid Color</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Text Alignment</Label>
            <Select
              value={heroConfig.text_alignment}
              onValueChange={(value) => updateSectionConfig('text_alignment', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(heroConfig.background_type === 'image' || heroConfig.background_type === 'video') && (
          <div className="space-y-2">
            <Label>Background Media</Label>
            <div className="flex items-center gap-3">
              <Input
                value={heroConfig.background_media_url || ''}
                onChange={(e) => updateSectionConfig('background_media_url', e.target.value)}
                placeholder="Enter URL or upload file"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('hero-background-upload')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                id="hero-background-upload"
                type="file"
                accept={heroConfig.background_type === 'image' ? 'image/*' : 'video/*'}
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'background_media_url')}
              />
            </div>
          </div>
        )}

        {heroConfig.background_type === 'color' && (
          <div className="space-y-2">
            <Label htmlFor="hero-bg-color">Background Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="hero-bg-color"
                type="color"
                value={heroConfig.background_color || '#000000'}
                onChange={(e) => updateSectionConfig('background_color', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                value={heroConfig.background_color || '#000000'}
                onChange={(e) => updateSectionConfig('background_color', e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Overlay Opacity: {Math.round(heroConfig.overlay_opacity * 100)}%</Label>
          <Slider
            value={[heroConfig.overlay_opacity]}
            onValueChange={([value]) => updateSectionConfig('overlay_opacity', value)}
            max={1}
            min={0}
            step={0.1}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hero-cta">Primary CTA Text</Label>
            <Input
              id="hero-cta"
              value={heroConfig.cta_text}
              onChange={(e) => updateSectionConfig('cta_text', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-cta-secondary">Secondary CTA Text</Label>
            <Input
              id="hero-cta-secondary"
              value={heroConfig.cta_secondary_text || ''}
              onChange={(e) => updateSectionConfig('cta_secondary_text', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="hero-show-rating"
              checked={heroConfig.show_rating}
              onCheckedChange={(checked) => updateSectionConfig('show_rating', checked)}
            />
            <Label htmlFor="hero-show-rating">Show Rating</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="hero-show-stats"
              checked={heroConfig.show_quick_stats}
              onCheckedChange={(checked) => updateSectionConfig('show_quick_stats', checked)}
            />
            <Label htmlFor="hero-show-stats">Show Quick Stats</Label>
          </div>
        </div>
      </div>
    )
  }

  const renderAboutEditor = () => {
    const aboutConfig = section.about
    if (!aboutConfig) return null

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="about-title">Section Title</Label>
          <Input
            id="about-title"
            value={aboutConfig.title}
            onChange={(e) => updateSectionConfig('title', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="about-content">Content</Label>
          <Textarea
            id="about-content"
            value={aboutConfig.content || ''}
            onChange={(e) => updateSectionConfig('content', e.target.value)}
            placeholder="Tell your story..."
            rows={6}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select
              value={aboutConfig.layout}
              onValueChange={(value) => updateSectionConfig('layout', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_column">Single Column</SelectItem>
                <SelectItem value="two_column">Two Column</SelectItem>
                <SelectItem value="three_column">Three Column</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <Switch
              id="about-team-photo"
              checked={aboutConfig.show_team_photo}
              onCheckedChange={(checked) => updateSectionConfig('show_team_photo', checked)}
            />
            <Label htmlFor="about-team-photo">Show Team Photo</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Featured Image</Label>
          <div className="flex items-center gap-3">
            <Input
              value={aboutConfig.image_url || ''}
              onChange={(e) => updateSectionConfig('image_url', e.target.value)}
              placeholder="Enter URL or upload image"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('about-image-upload')?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <input
              id="about-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'image_url')}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Highlight Stats</Label>
          <div className="space-y-2">
            {aboutConfig.highlight_stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  value={stat.label}
                  onChange={(e) => {
                    const newStats = [...aboutConfig.highlight_stats]
                    newStats[index] = { ...stat, label: e.target.value }
                    updateSectionConfig('highlight_stats', newStats)
                  }}
                  placeholder="Label"
                  className="flex-1"
                />
                <Input
                  value={stat.value.toString()}
                  onChange={(e) => {
                    const newStats = [...aboutConfig.highlight_stats]
                    newStats[index] = { ...stat, value: e.target.value }
                    updateSectionConfig('highlight_stats', newStats)
                  }}
                  placeholder="Value"
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newStats = aboutConfig.highlight_stats.filter((_, i) => i !== index)
                    updateSectionConfig('highlight_stats', newStats)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {aboutConfig.highlight_stats.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newStats = [...aboutConfig.highlight_stats, { label: '', value: '' }]
                  updateSectionConfig('highlight_stats', newStats)
                }}
              >
                Add Stat
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderServicesEditor = () => {
    const servicesConfig = section.services
    if (!servicesConfig) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="services-title">Section Title</Label>
            <Input
              id="services-title"
              value={servicesConfig.title}
              onChange={(e) => updateSectionConfig('title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select
              value={servicesConfig.layout}
              onValueChange={(value) => updateSectionConfig('layout', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="single_column">Single Column</SelectItem>
                <SelectItem value="two_column">Two Column</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="services-description">Description</Label>
          <Textarea
            id="services-description"
            value={servicesConfig.description || ''}
            onChange={(e) => updateSectionConfig('description', e.target.value)}
            placeholder="Optional description"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Maximum Services to Display</Label>
          <Slider
            value={[servicesConfig.max_services_display]}
            onValueChange={([value]) => updateSectionConfig('max_services_display', value)}
            max={20}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="text-sm text-muted-foreground">
            Currently: {servicesConfig.max_services_display} services
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Display Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="services-pricing"
                  checked={servicesConfig.show_pricing}
                  onCheckedChange={(checked) => updateSectionConfig('show_pricing', checked)}
                />
                <Label htmlFor="services-pricing">Show Pricing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="services-duration"
                  checked={servicesConfig.show_duration}
                  onCheckedChange={(checked) => updateSectionConfig('show_duration', checked)}
                />
                <Label htmlFor="services-duration">Show Duration</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="services-description-toggle"
                  checked={servicesConfig.show_description}
                  onCheckedChange={(checked) => updateSectionConfig('show_description', checked)}
                />
                <Label htmlFor="services-description-toggle">Show Descriptions</Label>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Label>Booking Options</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="services-booking"
                checked={servicesConfig.enable_service_booking}
                onCheckedChange={(checked) => updateSectionConfig('enable_service_booking', checked)}
              />
              <Label htmlFor="services-booking">Enable Direct Booking</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Featured Services</Label>
          <div className="text-sm text-muted-foreground mb-2">
            Leave empty to auto-select services
          </div>
          {/* TODO: Add service selector based on organization's services */}
          <div className="flex flex-wrap gap-2">
            {servicesConfig.featured_service_ids.map((serviceId, index) => (
              <Badge key={index} variant="secondary">
                Service {serviceId}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto w-auto p-0 ml-2"
                  onClick={() => {
                    const newIds = servicesConfig.featured_service_ids.filter(id => id !== serviceId)
                    updateSectionConfig('featured_service_ids', newIds)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderGalleryEditor = () => {
    const galleryConfig = section.gallery
    if (!galleryConfig) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gallery-title">Section Title</Label>
            <Input
              id="gallery-title"
              value={galleryConfig.title}
              onChange={(e) => updateSectionConfig('title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select
              value={galleryConfig.layout}
              onValueChange={(value) => updateSectionConfig('layout', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="masonry">Masonry</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gallery-description">Description</Label>
          <Textarea
            id="gallery-description"
            value={galleryConfig.description || ''}
            onChange={(e) => updateSectionConfig('description', e.target.value)}
            placeholder="Optional description"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Maximum Images: {galleryConfig.max_images}</Label>
          <Slider
            value={[galleryConfig.max_images]}
            onValueChange={([value]) => updateSectionConfig('max_images', value)}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="gallery-lightbox"
                checked={galleryConfig.enable_lightbox}
                onCheckedChange={(checked) => updateSectionConfig('enable_lightbox', checked)}
              />
              <Label htmlFor="gallery-lightbox">Enable Lightbox</Label>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="gallery-captions"
                checked={galleryConfig.show_captions}
                onCheckedChange={(checked) => updateSectionConfig('show_captions', checked)}
              />
              <Label htmlFor="gallery-captions">Show Captions</Label>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="gallery-auto-populate"
            checked={galleryConfig.auto_populate_from_portfolio}
            onCheckedChange={(checked) => updateSectionConfig('auto_populate_from_portfolio', checked)}
          />
          <Label htmlFor="gallery-auto-populate">Auto-populate from Portfolio</Label>
        </div>

        {/* TODO: Add custom image management */}
        <div className="space-y-2">
          <Label>Custom Images</Label>
          <div className="text-sm text-muted-foreground">
            {galleryConfig.custom_images.length} custom images added
          </div>
        </div>
      </div>
    )
  }

  const renderContactEditor = () => {
    const contactConfig = section.contact
    if (!contactConfig) return null

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contact-title">Section Title</Label>
          <Input
            id="contact-title"
            value={contactConfig.title}
            onChange={(e) => updateSectionConfig('title', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Contact Information</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="contact-address"
                  checked={contactConfig.show_address}
                  onCheckedChange={(checked) => updateSectionConfig('show_address', checked)}
                />
                <Label htmlFor="contact-address">Show Address</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="contact-phone"
                  checked={contactConfig.show_phone}
                  onCheckedChange={(checked) => updateSectionConfig('show_phone', checked)}
                />
                <Label htmlFor="contact-phone">Show Phone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="contact-email"
                  checked={contactConfig.show_email}
                  onCheckedChange={(checked) => updateSectionConfig('show_email', checked)}
                />
                <Label htmlFor="contact-email">Show Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="contact-hours"
                  checked={contactConfig.show_hours}
                  onCheckedChange={(checked) => updateSectionConfig('show_hours', checked)}
                />
                <Label htmlFor="contact-hours">Show Hours</Label>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Label>Interactive Features</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="contact-map"
                  checked={contactConfig.show_map}
                  onCheckedChange={(checked) => updateSectionConfig('show_map', checked)}
                />
                <Label htmlFor="contact-map">Show Map</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="contact-form"
                  checked={contactConfig.show_contact_form}
                  onCheckedChange={(checked) => updateSectionConfig('show_contact_form', checked)}
                />
                <Label htmlFor="contact-form">Show Contact Form</Label>
              </div>
            </div>
          </div>
        </div>

        {contactConfig.show_map && (
          <div className="space-y-2">
            <Label>Map Style</Label>
            <Select
              value={contactConfig.map_style}
              onValueChange={(value) => updateSectionConfig('map_style', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="satellite">Satellite</SelectItem>
                <SelectItem value="terrain">Terrain</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    )
  }

  const renderTestimonialsEditor = () => {
    const testimonialsConfig = section.testimonials
    if (!testimonialsConfig) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="testimonials-title">Section Title</Label>
            <Input
              id="testimonials-title"
              value={testimonialsConfig.title}
              onChange={(e) => updateSectionConfig('title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select
              value={testimonialsConfig.layout}
              onValueChange={(value) => updateSectionConfig('layout', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Maximum Testimonials: {testimonialsConfig.max_testimonials}</Label>
          <Slider
            value={[testimonialsConfig.max_testimonials]}
            onValueChange={([value]) => updateSectionConfig('max_testimonials', value)}
            max={20}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="testimonials-photos"
                checked={testimonialsConfig.show_reviewer_photos}
                onCheckedChange={(checked) => updateSectionConfig('show_reviewer_photos', checked)}
              />
              <Label htmlFor="testimonials-photos">Show Reviewer Photos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="testimonials-ratings"
                checked={testimonialsConfig.show_rating_stars}
                onCheckedChange={(checked) => updateSectionConfig('show_rating_stars', checked)}
              />
              <Label htmlFor="testimonials-ratings">Show Rating Stars</Label>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="testimonials-auto-rotate"
                checked={testimonialsConfig.auto_rotate}
                onCheckedChange={(checked) => updateSectionConfig('auto_rotate', checked)}
              />
              <Label htmlFor="testimonials-auto-rotate">Auto-rotate</Label>
            </div>
            {testimonialsConfig.auto_rotate && (
              <div className="space-y-1">
                <Label className="text-sm">Rotation Interval: {testimonialsConfig.rotation_interval / 1000}s</Label>
                <Slider
                  value={[testimonialsConfig.rotation_interval]}
                  onValueChange={([value]) => updateSectionConfig('rotation_interval', value)}
                  max={30000}
                  min={1000}
                  step={1000}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getSectionName = (type: SectionType) => {
    switch (type) {
      case 'hero': return 'Hero Section'
      case 'about': return 'About Section'
      case 'services': return 'Services Section'
      case 'gallery': return 'Gallery Section'
      case 'testimonials': return 'Testimonials Section'
      case 'contact': return 'Contact Section'
      case 'team': return 'Team Section'
      default: return 'Section'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getSectionName(section.section_type)}</CardTitle>
        <CardDescription>
          Configure the settings for this section
        </CardDescription>
      </CardHeader>
      <CardContent>
        {section.section_type === 'hero' && renderHeroEditor()}
        {section.section_type === 'about' && renderAboutEditor()}
        {section.section_type === 'services' && renderServicesEditor()}
        {section.section_type === 'gallery' && renderGalleryEditor()}
        {section.section_type === 'testimonials' && renderTestimonialsEditor()}
        {section.section_type === 'contact' && renderContactEditor()}
        {section.section_type === 'team' && (
          <div className="text-center py-8 text-muted-foreground">
            Team section editor coming soon
          </div>
        )}
      </CardContent>
    </Card>
  )
}