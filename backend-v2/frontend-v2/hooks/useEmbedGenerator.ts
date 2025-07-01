import { useState, useEffect, useCallback } from 'react';
import { EmbedSettings, EmbedParams, EMBED_PRESETS } from '../types/embed';
import {
  generateBookingUrl,
  generateIframeCode,
  generateEmbedCSS,
  generateEmbedJS,
  generateEmbedPackage,
  validateEmbedSettings,
  copyToClipboard
} from '../lib/embedUtils';

interface UseEmbedGeneratorProps {
  barberId?: string;
  serviceId?: string;
  locationId?: string;
  initialSettings?: Partial<EmbedSettings>;
}

export function useEmbedGenerator({
  barberId,
  serviceId,
  locationId,
  initialSettings = {}
}: UseEmbedGeneratorProps) {
  const [settings, setSettings] = useState<EmbedSettings>({
    size: 'medium',
    width: '400',
    height: '600',
    border: true,
    borderRadius: '8',
    title: '6FB Booking Widget',
    responsive: true,
    theme: 'auto',
    ...initialSettings
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState<{[key: string]: boolean}>({});

  // Embed parameters
  const embedParams: EmbedParams = {
    barberId,
    serviceId,
    locationId,
    theme: settings.theme,
    hideHeader: false,
    hideFooter: false,
    allowClose: true
  };

  // Update dimensions when size preset changes
  useEffect(() => {
    if (settings.size !== 'custom') {
      const preset = EMBED_PRESETS[settings.size];
      setSettings(prev => ({
        ...prev,
        width: preset.width,
        height: preset.height
      }));
    }
  }, [settings.size]);

  // Validate settings whenever they change
  useEffect(() => {
    const errors = validateEmbedSettings(settings);
    setValidationErrors(errors);
  }, [settings]);

  // Generate embed package
  const embedPackage = generateEmbedPackage(embedParams, settings);

  // Update a specific setting
  const updateSetting = useCallback(<K extends keyof EmbedSettings>(
    key: K,
    value: EmbedSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple settings at once
  const updateSettings = useCallback((newSettings: Partial<EmbedSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Copy text to clipboard with state management
  const handleCopy = useCallback(async (text: string, type: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [type]: false }));
      }, 2000);
    }
    return success;
  }, []);

  // Get code by type
  const getCode = useCallback((type: 'iframe' | 'css' | 'js' | 'complete') => {
    switch (type) {
      case 'iframe':
        return embedPackage.iframeCode;
      case 'css':
        return embedPackage.css;
      case 'js':
        return embedPackage.js;
      case 'complete':
        return `${embedPackage.iframeCode}\n\n<style>\n${embedPackage.css}\n</style>\n\n${embedPackage.js}`;
      default:
        return embedPackage.iframeCode;
    }
  }, [embedPackage]);

  // Reset to default settings
  const resetSettings = useCallback(() => {
    setSettings({
      size: 'medium',
      width: '400',
      height: '600',
      border: true,
      borderRadius: '8',
      title: '6FB Booking Widget',
      responsive: true,
      theme: 'auto',
      ...initialSettings
    });
  }, [initialSettings]);

  // Check if settings are valid
  const isValid = validationErrors.length === 0;

  // Get current URL
  const currentUrl = embedPackage.url;

  return {
    // Settings
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    
    // Validation
    validationErrors,
    isValid,
    
    // Generated content
    embedPackage,
    currentUrl,
    getCode,
    
    // Copy functionality
    copied,
    handleCopy,
    
    // Derived state
    isCustomSize: settings.size === 'custom',
    presetName: settings.size !== 'custom' ? EMBED_PRESETS[settings.size].name : 'Custom',
    
    // Utils
    generateBookingUrl: () => generateBookingUrl(embedParams),
    generateIframeCode: () => generateIframeCode({
      url: currentUrl,
      settings,
      sandboxAttributes: [],
      allowAttributes: []
    }),
    generateEmbedCSS: () => generateEmbedCSS(settings),
    generateEmbedJS: () => generateEmbedJS()
  };
}

export type EmbedGeneratorState = ReturnType<typeof useEmbedGenerator>;