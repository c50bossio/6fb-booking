"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Monitor, Smartphone, Tablet, X } from 'lucide-react'

import { HomepageBuilderConfig } from './HomepageBuilderContext'
import { HomepagePreview } from './HomepagePreview'

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  config: HomepageBuilderConfig
}

export function PreviewModal({ isOpen, onClose, config }: PreviewModalProps) {
  const [deviceMode, setDeviceMode] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const getModalWidth = () => {
    switch (deviceMode) {
      case 'mobile': return 'max-w-sm'
      case 'tablet': return 'max-w-2xl'
      case 'desktop': return 'max-w-6xl'
      default: return 'max-w-6xl'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${getModalWidth()} h-[90vh] flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Homepage Preview</DialogTitle>
            <div className="flex items-center gap-2">
              {/* Device Toggle */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={deviceMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDeviceMode('desktop')}
                  className="h-8 w-8 p-0"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={deviceMode === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDeviceMode('tablet')}
                  className="h-8 w-8 p-0"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={deviceMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDeviceMode('mobile')}
                  className="h-8 w-8 p-0"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>

              {/* Status Badge */}
              <Badge variant={config.enabled ? 'default' : 'secondary'}>
                {config.enabled ? 'Published' : 'Draft'}
              </Badge>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          <div className={`h-full transition-all duration-300 ${
            deviceMode === 'mobile' ? 'max-w-sm mx-auto' :
            deviceMode === 'tablet' ? 'max-w-2xl mx-auto' :
            'w-full'
          }`}>
            <div className="h-full border rounded-lg overflow-auto bg-white">
              <HomepagePreview 
                config={config} 
                deviceMode={deviceMode}
                showFrame={true}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Preview mode: {deviceMode} • Template: {config.template_id}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => window.open(`/preview/${config.template_id}`, '_blank')}>
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}