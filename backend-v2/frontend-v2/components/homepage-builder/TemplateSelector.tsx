"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Crown, Star, Eye } from 'lucide-react'
import { toast } from 'sonner'

import { HomepageTemplate } from './HomepageBuilderContext'

interface TemplateSelectorProps {
  currentTemplateId: string
  onTemplateSelect: (templateId: string, preserveContent?: boolean) => Promise<void>
}

// Mock templates data
const mockTemplates: HomepageTemplate[] = [
  {
    id: 'modern_barbershop',
    name: 'Modern Barbershop',
    description: 'Clean, professional design perfect for contemporary barbershops',
    category: 'modern',
    preview_image_url: '/templates/modern-barbershop.jpg',
    config: {} as any, // We don't need full config here
    is_premium: false,
    is_popular: true,
    industry_tags: ['barbershop', 'modern', 'professional']
  },
  {
    id: 'classic_barber',
    name: 'Classic Barber',
    description: 'Traditional barbershop aesthetic with vintage charm',
    category: 'classic',
    preview_image_url: '/templates/classic-barber.jpg',
    config: {} as any,
    is_premium: false,
    is_popular: false,
    industry_tags: ['barbershop', 'classic', 'vintage']
  },
  {
    id: 'luxury_salon',
    name: 'Luxury Salon',
    description: 'Premium design for high-end barbershops and salons',
    category: 'luxury',
    preview_image_url: '/templates/luxury-salon.jpg',
    config: {} as any,
    is_premium: true,
    is_popular: false,
    industry_tags: ['salon', 'luxury', 'premium']
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, simple design focusing on services and booking',
    category: 'minimalist',
    preview_image_url: '/templates/minimalist.jpg',
    config: {} as any,
    is_premium: false,
    is_popular: true,
    industry_tags: ['minimal', 'clean', 'simple']
  }
]

export function TemplateSelector({ currentTemplateId, onTemplateSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<HomepageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<HomepageTemplate | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [preserveContent, setPreserveContent] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // TODO: Replace with actual API call
    setTemplates(mockTemplates)
  }, [])

  const handleTemplateClick = (template: HomepageTemplate) => {
    if (template.id === currentTemplateId) {
      toast.info('This template is already active')
      return
    }
    
    setSelectedTemplate(template)
    setShowConfirmDialog(true)
  }

  const handleConfirmApply = async () => {
    if (!selectedTemplate) return

    setIsLoading(true)
    try {
      await onTemplateSelect(selectedTemplate.id, preserveContent)
      setShowConfirmDialog(false)
      setSelectedTemplate(null)
      toast.success(`${selectedTemplate.name} template applied successfully`)
    } catch (error) {
      toast.error('Failed to apply template')
      console.error('Template application error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'modern': return 'bg-blue-100 text-blue-800'
      case 'classic': return 'bg-amber-100 text-amber-800'
      case 'luxury': return 'bg-purple-100 text-purple-800'
      case 'minimalist': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Choose a Template</CardTitle>
          <CardDescription>
            Select a pre-designed template to get started quickly. You can customize everything later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                  template.id === currentTemplateId 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'border-border'
                }`}
                onClick={() => handleTemplateClick(template)}
              >
                {/* Template Preview Image */}
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Preview</span>
                </div>

                {/* Template Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <div className="flex items-center gap-1">
                      {template.is_popular && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      {template.is_premium && (
                        <Badge variant="default" className="text-xs bg-yellow-500 hover:bg-yellow-600">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={`text-xs capitalize ${getCategoryColor(template.category)}`}
                    >
                      {template.category}
                    </Badge>
                    
                    {template.id === currentTemplateId && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>

                  {/* Industry Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.industry_tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Overlay for current template */}
                {template.id === currentTemplateId && (
                  <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-lg pointer-events-none" />
                )}
              </div>
            ))}
          </div>

          {/* Coming Soon */}
          <div className="mt-8 text-center">
            <div className="text-sm text-muted-foreground">
              More templates coming soon! Want a custom template?{' '}
              <a href="#" className="underline hover:no-underline">
                Contact us
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Template: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              This will change your homepage design to match the selected template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedTemplate?.description}
            </p>

            <div className="flex items-center space-x-2">
              <Switch
                id="preserve-content"
                checked={preserveContent}
                onCheckedChange={setPreserveContent}
              />
              <Label htmlFor="preserve-content" className="text-sm">
                Preserve existing content (recommended)
              </Label>
            </div>

            <div className="text-xs text-muted-foreground">
              {preserveContent 
                ? 'Your existing text and images will be kept, only the design will change.'
                : 'All content will be reset to template defaults. You will lose your current content.'
              }
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApply}
              disabled={isLoading}
            >
              {isLoading ? 'Applying...' : 'Apply Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}