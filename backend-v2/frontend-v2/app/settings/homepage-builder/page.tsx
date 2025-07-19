"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Palette, 
  Layout, 
  Eye, 
  Settings,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Globe,
  GlobeOff,
  Sparkles,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

import { HomepageBuilderProvider, useHomepageBuilder } from '@/components/homepage-builder/HomepageBuilderContext'
import { SectionEditor } from '@/components/homepage-builder/SectionEditor'
import { TemplateSelector } from '@/components/homepage-builder/TemplateSelector'
import { BrandingEditor } from '@/components/homepage-builder/BrandingEditor'
import { SEOEditor } from '@/components/homepage-builder/SEOEditor'
import { PreviewModal } from '@/components/homepage-builder/PreviewModal'
import { HomepagePreview } from '@/components/homepage-builder/HomepagePreview'

function HomepageBuilderContent() {
  const {
    config,
    isLoading,
    isPublished,
    publishedUrl,
    updateConfig,
    publishHomepage,
    unpublishHomepage,
    loadConfig,
    applyTemplate
  } = useHomepageBuilder()

  const [activeTab, setActiveTab] = useState('sections')
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateConfig(config)
      toast.success('Homepage configuration saved successfully')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      await publishHomepage()
      toast.success('Homepage published successfully')
    } catch (error) {
      toast.error('Failed to publish homepage')
      console.error('Publish error:', error)
    }
  }

  const handleUnpublish = async () => {
    try {
      await unpublishHomepage()
      toast.success('Homepage unpublished successfully')
    } catch (error) {
      toast.error('Failed to unpublish homepage')
      console.error('Unpublish error:', error)
    }
  }

  const handleSectionMove = (sectionIndex: number, direction: 'up' | 'down') => {
    const newSections = [...config.sections]
    const currentSection = newSections[sectionIndex]
    const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1

    if (targetIndex >= 0 && targetIndex < newSections.length) {
      // Swap sections
      newSections[sectionIndex] = newSections[targetIndex]
      newSections[targetIndex] = currentSection

      // Update orders
      newSections[sectionIndex].order = sectionIndex
      newSections[targetIndex].order = targetIndex

      updateConfig({ ...config, sections: newSections })
    }
  }

  const handleSectionDelete = (sectionIndex: number) => {
    const newSections = config.sections.filter((_, index) => index !== sectionIndex)
    // Update orders
    newSections.forEach((section, index) => {
      section.order = index
    })
    updateConfig({ ...config, sections: newSections })
    toast.success('Section removed')
  }

  const handleSectionToggle = (sectionIndex: number) => {
    const newSections = [...config.sections]
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      visible: !newSections[sectionIndex].visible
    }
    updateConfig({ ...config, sections: newSections })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading homepage builder...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Homepage Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create a professional homepage that converts visitors into customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          {isPublished ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleUnpublish}
            >
              <GlobeOff className="h-4 w-4 mr-2" />
              Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!config.enabled}
            >
              <Globe className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {isPublished && publishedUrl && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            Your homepage is live at{' '}
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              {publishedUrl}
            </a>
          </AlertDescription>
        </Alert>
      )}

      {!config.enabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your homepage is currently disabled. Enable it in the settings to make it live.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Editor */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sections">
            <Layout className="h-4 w-4 mr-2" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Settings className="h-4 w-4 mr-2" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Live Preview
          </TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Sections</CardTitle>
              <CardDescription>
                Configure and organize the sections of your homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.sections.map((section, index) => (
                <div
                  key={`${section.section_type}-${index}`}
                  className="border rounded-lg p-4 space-y-4"
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium capitalize">
                        {section.section_type.replace('_', ' ')}
                      </h4>
                      <Badge variant={section.visible ? 'default' : 'secondary'}>
                        {section.visible ? 'Visible' : 'Hidden'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSectionMove(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSectionMove(index, 'down')}
                        disabled={index === config.sections.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSectionToggle(index)}
                      >
                        {section.visible ? <Eye className="h-4 w-4" /> : <GlobeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSectionDelete(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Section Editor */}
                  {section.visible && (
                    <SectionEditor
                      section={section}
                      onSectionChange={(updatedSection) => {
                        const newSections = [...config.sections]
                        newSections[index] = updatedSection
                        updateConfig({ ...config, sections: newSections })
                      }}
                    />
                  )}
                </div>
              ))}

              {/* Add Section Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // TODO: Open section type selector
                  toast.info('Section type selector coming soon')
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <TemplateSelector
            currentTemplateId={config.template_id}
            onTemplateSelect={applyTemplate}
          />
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <BrandingEditor
            branding={config.branding}
            onBrandingChange={(branding) => {
              updateConfig({ ...config, branding })
            }}
          />
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo">
          <SEOEditor
            seo={config.seo}
            onSEOChange={(seo) => {
              updateConfig({ ...config, seo })
            }}
          />
        </TabsContent>

        {/* Live Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                See how your homepage will look to visitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HomepagePreview config={config} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        config={config}
      />
    </div>
  )
}

export default function HomepageBuilderPage() {
  return (
    <HomepageBuilderProvider>
      <HomepageBuilderContent />
    </HomepageBuilderProvider>
  )
}