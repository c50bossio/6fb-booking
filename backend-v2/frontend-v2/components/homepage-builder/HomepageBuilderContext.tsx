"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'

// Homepage Builder Types
export interface HeroSectionConfig {
  enabled: boolean
  title?: string
  subtitle?: string
  description?: string
  background_type: 'image' | 'video' | 'gradient' | 'color'
  background_media_url?: string
  background_color?: string
  overlay_opacity: number
  cta_text: string
  cta_secondary_text?: string
  text_alignment: 'left' | 'center' | 'right'
  show_rating: boolean
  show_quick_stats: boolean
}

export interface AboutSectionConfig {
  enabled: boolean
  title: string
  content?: string
  layout: 'single_column' | 'two_column' | 'three_column' | 'grid'
  image_url?: string
  show_team_photo: boolean
  highlight_stats: Array<{ label: string; value: string | number }>
}

export interface ServicesSectionConfig {
  enabled: boolean
  title: string
  description?: string
  layout: 'single_column' | 'two_column' | 'three_column' | 'grid' | 'carousel'
  show_pricing: boolean
  show_duration: boolean
  show_description: boolean
  max_services_display: number
  featured_service_ids: number[]
  enable_service_booking: boolean
}

export interface GallerySectionConfig {
  enabled: boolean
  title: string
  description?: string
  layout: 'grid' | 'masonry' | 'carousel'
  max_images: number
  enable_lightbox: boolean
  show_captions: boolean
  auto_populate_from_portfolio: boolean
  custom_images: Array<{ url: string; alt: string }>
}

export interface TestimonialsSectionConfig {
  enabled: boolean
  title: string
  layout: 'carousel' | 'grid'
  max_testimonials: number
  show_reviewer_photos: boolean
  show_rating_stars: boolean
  auto_rotate: boolean
  rotation_interval: number
  source_priority: string[]
}

export interface ContactSectionConfig {
  enabled: boolean
  title: string
  show_address: boolean
  show_phone: boolean
  show_email: boolean
  show_hours: boolean
  show_map: boolean
  show_contact_form: boolean
  map_style: 'standard' | 'satellite' | 'terrain'
  contact_form_fields: string[]
}

export interface TeamSectionConfig {
  enabled: boolean
  title: string
  description?: string
  layout: 'grid' | 'carousel'
  show_bio: boolean
  show_specialties: boolean
  show_social_links: boolean
  auto_populate_from_barbers: boolean
  team_members: Array<any>
}

export type SectionType = 'hero' | 'about' | 'services' | 'gallery' | 'testimonials' | 'contact' | 'team'

export interface HomepageSectionConfig {
  section_type: SectionType
  order: number
  visible: boolean
  hero?: HeroSectionConfig
  about?: AboutSectionConfig
  services?: ServicesSectionConfig
  gallery?: GallerySectionConfig
  testimonials?: TestimonialsSectionConfig
  contact?: ContactSectionConfig
  team?: TeamSectionConfig
}

export interface BrandingConfig {
  logo_url?: string
  favicon_url?: string
  primary_color: string
  secondary_color: string
  accent_color: string
  text_color: string
  background_color: string
  font_family: string
  heading_font?: string
  border_radius: 'none' | 'small' | 'medium' | 'large' | 'full'
  button_style: 'solid' | 'outline' | 'ghost'
}

export interface SEOConfig {
  meta_title?: string
  meta_description?: string
  meta_keywords: string[]
  og_title?: string
  og_description?: string
  og_image_url?: string
  twitter_card_type: 'summary' | 'summary_large_image'
  canonical_url?: string
  robots_meta: string
  structured_data_enabled: boolean
}

export interface AdvancedConfig {
  custom_css?: string
  custom_js?: string
  google_analytics_id?: string
  facebook_pixel_id?: string
  custom_domain?: string
  password_protected: boolean
  password?: string
  maintenance_mode: boolean
  coming_soon_mode: boolean
}

export interface HomepageBuilderConfig {
  enabled: boolean
  template_id: string
  version: string
  sections: HomepageSectionConfig[]
  branding: BrandingConfig
  seo: SEOConfig
  advanced: AdvancedConfig
  mobile_optimized: boolean
  tablet_layout: 'desktop' | 'mobile' | 'adaptive'
  lazy_loading: boolean
  image_optimization: boolean
  cache_enabled: boolean
}

export interface HomepageTemplate {
  id: string
  name: string
  description: string
  category: string
  preview_image_url: string
  config: HomepageBuilderConfig
  is_premium: boolean
  is_popular: boolean
  industry_tags: string[]
}

// Default configurations
const defaultBrandingConfig: BrandingConfig = {
  primary_color: '#000000',
  secondary_color: '#333333',
  accent_color: '#FFD700',
  text_color: '#FFFFFF',
  background_color: '#000000',
  font_family: 'Inter',
  border_radius: 'medium',
  button_style: 'solid'
}

const defaultSEOConfig: SEOConfig = {
  meta_keywords: [],
  twitter_card_type: 'summary_large_image',
  robots_meta: 'index,follow',
  structured_data_enabled: true
}

const defaultAdvancedConfig: AdvancedConfig = {
  password_protected: false,
  maintenance_mode: false,
  coming_soon_mode: false
}

const defaultHeroSection: HomepageSectionConfig = {
  section_type: 'hero',
  order: 0,
  visible: true,
  hero: {
    enabled: true,
    background_type: 'color',
    overlay_opacity: 0.4,
    cta_text: 'Book Now',
    text_alignment: 'center',
    show_rating: true,
    show_quick_stats: true
  }
}

const defaultConfig: HomepageBuilderConfig = {
  enabled: true,
  template_id: 'modern_barbershop',
  version: '1.0',
  sections: [defaultHeroSection],
  branding: defaultBrandingConfig,
  seo: defaultSEOConfig,
  advanced: defaultAdvancedConfig,
  mobile_optimized: true,
  tablet_layout: 'adaptive',
  lazy_loading: true,
  image_optimization: true,
  cache_enabled: true
}

// Context
interface HomepageBuilderContextType {
  config: HomepageBuilderConfig
  isLoading: boolean
  isPublished: boolean
  publishedUrl?: string
  templates: HomepageTemplate[]
  updateConfig: (updates: Partial<HomepageBuilderConfig>) => void
  loadConfig: () => Promise<void>
  saveConfig: () => Promise<void>
  publishHomepage: () => Promise<void>
  unpublishHomepage: () => Promise<void>
  applyTemplate: (templateId: string, preserveContent?: boolean) => Promise<void>
  uploadMedia: (file: File, mediaType: 'image' | 'video') => Promise<string>
}

const HomepageBuilderContext = createContext<HomepageBuilderContextType | undefined>(undefined)

// Provider
interface HomepageBuilderProviderProps {
  children: ReactNode
}

export function HomepageBuilderProvider({ children }: HomepageBuilderProviderProps) {
  const [config, setConfig] = useState<HomepageBuilderConfig>(defaultConfig)
  const [isLoading, setIsLoading] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string>()
  const [templates, setTemplates] = useState<HomepageTemplate[]>([])

  const updateConfig = useCallback((updates: Partial<HomepageBuilderConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/v2/organizations/current/homepage-builder/config')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        setIsPublished(data.enabled)
        if (data.enabled) {
          // TODO: Get actual published URL
          setPublishedUrl(`/${data.organization_slug || 'your-barbershop'}`)
        }
      }
    } catch (error) {
      console.error('Failed to load homepage config:', error)
      toast.error('Failed to load homepage configuration')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/v2/organizations/current/homepage-builder/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save configuration')
      }
      
      const updatedConfig = await response.json()
      setConfig(updatedConfig)
      toast.success('Configuration saved successfully')
    } catch (error) {
      console.error('Failed to save homepage config:', error)
      toast.error('Failed to save configuration')
      throw error
    }
  }, [config])

  const publishHomepage = useCallback(async () => {
    try {
      const response = await fetch('/api/v2/organizations/current/homepage-builder/publish', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to publish homepage')
      }
      
      const result = await response.json()
      setIsPublished(true)
      setPublishedUrl(result.url)
      toast.success('Homepage published successfully')
    } catch (error) {
      console.error('Failed to publish homepage:', error)
      toast.error('Failed to publish homepage')
      throw error
    }
  }, [])

  const unpublishHomepage = useCallback(async () => {
    try {
      const response = await fetch('/api/v2/organizations/current/homepage-builder/unpublish', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to unpublish homepage')
      }
      
      setIsPublished(false)
      setPublishedUrl(undefined)
      toast.success('Homepage unpublished successfully')
    } catch (error) {
      console.error('Failed to unpublish homepage:', error)
      toast.error('Failed to unpublish homepage')
      throw error
    }
  }, [])

  const applyTemplate = useCallback(async (templateId: string, preserveContent = true) => {
    try {
      const response = await fetch(`/api/v2/organizations/current/homepage-builder/apply-template/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preserve_content: preserveContent }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to apply template')
      }
      
      const updatedConfig = await response.json()
      setConfig(updatedConfig)
      toast.success('Template applied successfully')
    } catch (error) {
      console.error('Failed to apply template:', error)
      toast.error('Failed to apply template')
      throw error
    }
  }, [])

  const uploadMedia = useCallback(async (file: File, mediaType: 'image' | 'video'): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('media_type', mediaType)

      const response = await fetch('/api/v2/organizations/current/homepage-builder/upload-media', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload media')
      }
      
      const result = await response.json()
      return result.url
    } catch (error) {
      console.error('Failed to upload media:', error)
      toast.error('Failed to upload media')
      throw error
    }
  }, [])

  const value: HomepageBuilderContextType = {
    config,
    isLoading,
    isPublished,
    publishedUrl,
    templates,
    updateConfig,
    loadConfig,
    saveConfig,
    publishHomepage,
    unpublishHomepage,
    applyTemplate,
    uploadMedia
  }

  return (
    <HomepageBuilderContext.Provider value={value}>
      {children}
    </HomepageBuilderContext.Provider>
  )
}

// Hook
export function useHomepageBuilder() {
  const context = useContext(HomepageBuilderContext)
  if (context === undefined) {
    throw new Error('useHomepageBuilder must be used within a HomepageBuilderProvider')
  }
  return context
}