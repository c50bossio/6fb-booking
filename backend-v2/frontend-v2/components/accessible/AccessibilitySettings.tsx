'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  Eye, 
  Type, 
  Volume2, 
  MousePointer, 
  Palette,
  RotateCcw,
  Settings
} from 'lucide-react'
import { useReducedMotion, useHighContrast } from '@/hooks/useAccessibility'
import { cn } from '@/lib/utils'

interface AccessibilityOptions {
  fontSize: number
  lineHeight: number
  letterSpacing: number
  highContrast: boolean
  reducedMotion: boolean
  focusIndicator: 'default' | 'thick' | 'high-contrast'
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  screenReaderOptimized: boolean
}

const defaultOptions: AccessibilityOptions = {
  fontSize: 100,
  lineHeight: 150,
  letterSpacing: 0,
  highContrast: false,
  reducedMotion: false,
  focusIndicator: 'default',
  colorBlindMode: 'none',
  screenReaderOptimized: false,
}

export function AccessibilitySettings() {
  const systemReducedMotion = useReducedMotion()
  const systemHighContrast = useHighContrast()
  
  const [options, setOptions] = useState<AccessibilityOptions>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-options')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return {
      ...defaultOptions,
      reducedMotion: systemReducedMotion,
      highContrast: systemHighContrast,
    }
  })
  
  const [isOpen, setIsOpen] = useState(false)
  
  // Save to localStorage whenever options change
  useEffect(() => {
    localStorage.setItem('accessibility-options', JSON.stringify(options))
    applyAccessibilityOptions(options)
  }, [options])
  
  const applyAccessibilityOptions = (opts: AccessibilityOptions) => {
    const root = document.documentElement
    
    // Font size
    root.style.setProperty('--base-font-size', `${opts.fontSize}%`)
    
    // Line height
    root.style.setProperty('--base-line-height', `${opts.lineHeight}%`)
    
    // Letter spacing
    root.style.setProperty('--base-letter-spacing', `${opts.letterSpacing}px`)
    
    // High contrast
    root.classList.toggle('high-contrast', opts.highContrast)
    
    // Reduced motion
    root.classList.toggle('reduced-motion', opts.reducedMotion)
    
    // Focus indicator
    root.setAttribute('data-focus-indicator', opts.focusIndicator)
    
    // Color blind mode
    root.setAttribute('data-color-blind-mode', opts.colorBlindMode)
    
    // Screen reader optimized
    root.classList.toggle('screen-reader-optimized', opts.screenReaderOptimized)
  }
  
  const updateOption = <K extends keyof AccessibilityOptions>(
    key: K,
    value: AccessibilityOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }
  
  const resetOptions = () => {
    setOptions(defaultOptions)
  }
  
  return (
    <>
      {/* Accessibility quick toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Accessibility settings"
        className="fixed bottom-4 left-4 z-50 shadow-lg"
      >
        <Settings className="h-5 w-5" />
      </Button>
      
      {/* Accessibility settings panel */}
      {isOpen && (
        <Card className="fixed bottom-16 left-4 z-50 w-96 max-h-[80vh] overflow-y-auto shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Accessibility Settings
              <Button
                variant="ghost"
                size="sm"
                onClick={resetOptions}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </CardTitle>
            <CardDescription>
              Customize your viewing experience
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Text adjustments */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Type className="h-4 w-4" />
                Text Adjustments
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="font-size">
                  Font Size: {options.fontSize}%
                </Label>
                <Slider
                  id="font-size"
                  min={80}
                  max={150}
                  step={10}
                  value={[options.fontSize]}
                  onValueChange={([value]) => updateOption('fontSize', value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="line-height">
                  Line Height: {options.lineHeight}%
                </Label>
                <Slider
                  id="line-height"
                  min={100}
                  max={200}
                  step={10}
                  value={[options.lineHeight]}
                  onValueChange={([value]) => updateOption('lineHeight', value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="letter-spacing">
                  Letter Spacing: {options.letterSpacing}px
                </Label>
                <Slider
                  id="letter-spacing"
                  min={0}
                  max={5}
                  step={0.5}
                  value={[options.letterSpacing]}
                  onValueChange={([value]) => updateOption('letterSpacing', value)}
                />
              </div>
            </div>
            
            {/* Visual adjustments */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visual Adjustments
              </h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="high-contrast" className="cursor-pointer">
                  High Contrast Mode
                </Label>
                <Switch
                  id="high-contrast"
                  checked={options.highContrast}
                  onCheckedChange={(checked) => updateOption('highContrast', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="reduced-motion" className="cursor-pointer">
                  Reduce Motion
                </Label>
                <Switch
                  id="reduced-motion"
                  checked={options.reducedMotion}
                  onCheckedChange={(checked) => updateOption('reducedMotion', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Focus Indicator Style</Label>
                <RadioGroup
                  value={options.focusIndicator}
                  onValueChange={(value) => updateOption('focusIndicator', value as any)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="default" id="focus-default" />
                    <Label htmlFor="focus-default" className="font-normal">
                      Default
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="thick" id="focus-thick" />
                    <Label htmlFor="focus-thick" className="font-normal">
                      Thick Border
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high-contrast" id="focus-high-contrast" />
                    <Label htmlFor="focus-high-contrast" className="font-normal">
                      High Contrast
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            {/* Color adjustments */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color Adjustments
              </h3>
              
              <div className="space-y-2">
                <Label>Color Blind Mode</Label>
                <RadioGroup
                  value={options.colorBlindMode}
                  onValueChange={(value) => updateOption('colorBlindMode', value as any)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="cb-none" />
                    <Label htmlFor="cb-none" className="font-normal">
                      None
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="protanopia" id="cb-protanopia" />
                    <Label htmlFor="cb-protanopia" className="font-normal">
                      Protanopia (Red-Green)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="deuteranopia" id="cb-deuteranopia" />
                    <Label htmlFor="cb-deuteranopia" className="font-normal">
                      Deuteranopia (Red-Green)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tritanopia" id="cb-tritanopia" />
                    <Label htmlFor="cb-tritanopia" className="font-normal">
                      Tritanopia (Blue-Yellow)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            {/* Screen reader */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Screen Reader
              </h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="screen-reader" className="cursor-pointer">
                  Optimize for Screen Readers
                </Label>
                <Switch
                  id="screen-reader"
                  checked={options.screenReaderOptimized}
                  onCheckedChange={(checked) => updateOption('screenReaderOptimized', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// CSS styles to be added to global styles
export const accessibilityStyles = `
  /* Base font size */
  :root {
    --base-font-size: 100%;
    --base-line-height: 150%;
    --base-letter-spacing: 0px;
  }
  
  html {
    font-size: var(--base-font-size);
    line-height: var(--base-line-height);
    letter-spacing: var(--base-letter-spacing);
  }
  
  /* High contrast mode */
  .high-contrast {
    filter: contrast(1.5);
  }
  
  .high-contrast * {
    border-color: currentColor !important;
  }
  
  /* Reduced motion */
  .reduced-motion *,
  .reduced-motion *::before,
  .reduced-motion *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Focus indicators */
  [data-focus-indicator="thick"] *:focus {
    outline: 3px solid var(--ring);
    outline-offset: 2px;
  }
  
  [data-focus-indicator="high-contrast"] *:focus {
    outline: 3px solid currentColor;
    outline-offset: 3px;
    box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.1);
  }
  
  /* Color blind filters */
  [data-color-blind-mode="protanopia"] {
    filter: url('#protanopia-filter');
  }
  
  [data-color-blind-mode="deuteranopia"] {
    filter: url('#deuteranopia-filter');
  }
  
  [data-color-blind-mode="tritanopia"] {
    filter: url('#tritanopia-filter');
  }
  
  /* Screen reader optimizations */
  .screen-reader-optimized .decorative {
    display: none;
  }
  
  .screen-reader-optimized [aria-hidden="true"] {
    display: none;
  }
`