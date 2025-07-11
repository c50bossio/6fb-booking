'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { useTheme } from '../../hooks/useTheme';
import { 
  EmbedSettings, 
  EmbedParams, 
  EMBED_PRESETS, 
  PLATFORM_INSTRUCTIONS 
} from '../../types/embed';
import {
  generateBookingUrl,
  generateIframeCode,
  generateEmbedCSS,
  generateEmbedJS,
  generateEmbedPackage,
  validateEmbedSettings,
  copyToClipboard as utilCopyToClipboard
} from '../../lib/embedUtils';

interface EmbedCodeGeneratorProps {
  barberId?: string;
  serviceId?: string;
  locationId?: string;
  className?: string;
}

type CodeType = 'iframe' | 'css' | 'js' | 'complete';

export function EmbedCodeGenerator({
  barberId,
  serviceId,
  locationId,
  className = ''
}: EmbedCodeGeneratorProps) {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<EmbedSettings>({
    size: 'medium',
    width: '400',
    height: '600',
    border: true,
    borderRadius: '8',
    title: '6FB Booking Widget',
    responsive: true,
    theme: 'auto'
  });
  const [copied, setCopied] = useState<{[key: string]: boolean}>({});
  const [showPreview, setShowPreview] = useState(true);
  const [activeCodeType, setActiveCodeType] = useState<CodeType>('iframe');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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

  // Update dimensions when size changes
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

  // Validate settings on change
  useEffect(() => {
    const errors = validateEmbedSettings(settings);
    setValidationErrors(errors);
  }, [settings]);

  // Generate embed package
  const embedPackage = generateEmbedPackage(embedParams, settings);

  // Copy to clipboard handler
  const handleCopy = async (text: string, type: string) => {
    const success = await utilCopyToClipboard(text);
    if (success) {
      setCopied(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [type]: false }));
      }, 2000);
    }
  };

  // Get current code based on active type
  const getCurrentCode = () => {
    switch (activeCodeType) {
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
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-900/20">
          <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
            Configuration Issues
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-200">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Settings Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Embed Settings</h3>
        
        <div className="space-y-4">
          {/* Size Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Widget Size
            </label>
            <Select
              value={settings.size}
              onChange={(value) => setSettings(prev => ({ ...prev, size: value as EmbedSettings['size'] }))}
              options={Object.entries(EMBED_PRESETS).map(([key, preset]) => ({
                value: key,
                label: `${preset.name} (${preset.width}x${preset.height}) - ${preset.description}`
              }))}
            />
          </div>

          {/* Custom Dimensions */}
          {settings.size === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Width (px)
                </label>
                <Input
                  type="number"
                  value={settings.width}
                  onChange={(e) => setSettings(prev => ({ ...prev, width: e.target.value }))}
                  min="200"
                  max="1200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Height (px)
                </label>
                <Input
                  type="number"
                  value={settings.height}
                  onChange={(e) => setSettings(prev => ({ ...prev, height: e.target.value }))}
                  min="300"
                  max="1200"
                />
              </div>
            </div>
          )}

          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Theme
            </label>
            <Select
              value={settings.theme || 'auto'}
              onChange={(value) => setSettings(prev => ({ ...prev, theme: value as 'light' | 'dark' | 'auto' }))}
              options={[
                { value: 'auto', label: 'Auto (matches user preference)' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' }
              ]}
            />
          </div>

          {/* Layout Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.responsive}
                onChange={(e) => setSettings(prev => ({ ...prev, responsive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Responsive (adapts to container width)</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.border}
                onChange={(e) => setSettings(prev => ({ ...prev, border: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show border</span>
            </label>
          </div>

          {/* Border Radius */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Border Radius (px)
            </label>
            <Input
              type="number"
              value={settings.borderRadius}
              onChange={(e) => setSettings(prev => ({ ...prev, borderRadius: e.target.value }))}
              min="0"
              max="50"
            />
          </div>

          {/* Widget Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Widget Title (for accessibility)
            </label>
            <Input
              type="text"
              value={settings.title}
              onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
              placeholder="6FB Booking Widget"
            />
          </div>
        </div>
      </Card>

      {/* Generated Code */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Generated Code</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => handleCopy(getCurrentCode(), activeCodeType)}
              variant="secondary"
              size="sm"
              disabled={validationErrors.length > 0}
            >
              {copied[activeCodeType] ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>
        </div>

        {/* Code Type Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          {[
            { key: 'iframe', label: 'HTML Only' },
            { key: 'css', label: 'CSS' },
            { key: 'js', label: 'JavaScript' },
            { key: 'complete', label: 'Complete Package' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCodeType(key as CodeType)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeCodeType === key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto">
            <code className="text-gray-800 dark:text-gray-200">{getCurrentCode()}</code>
          </pre>
        </div>

        {/* Code Type Descriptions */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {activeCodeType === 'iframe' && (
            <p>Basic HTML iframe code. Copy and paste this directly into your website's HTML.</p>
          )}
          {activeCodeType === 'css' && (
            <p>Optional CSS for better integration and responsive behavior. Add this to your site's CSS file.</p>
          )}
          {activeCodeType === 'js' && (
            <p>JavaScript for advanced features like booking event handling and iframe communication.</p>
          )}
          {activeCodeType === 'complete' && (
            <p>Complete package with HTML, CSS, and JavaScript. Everything you need for full integration.</p>
          )}
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Live Preview</h3>
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="secondary"
            size="sm"
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
        </div>
        
        {showPreview && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This is how the widget will appear on your website:
            </p>
            
            {/* Preview Container */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="bg-white dark:bg-gray-900 p-4 rounded shadow-sm">
                <div className="text-xs text-gray-500 mb-2">Your Website Content</div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                
                {/* Widget Preview */}
                <div 
                  className="mx-auto"
                  style={{ 
                    maxWidth: settings.responsive ? `${settings.width}px` : 'none',
                    width: settings.responsive ? '100%' : `${settings.width}px`
                  }}
                >
                  <div
                    className="bg-gradient-to-br from-teal-50 to-turquoise-50 dark:from-teal-900/20 dark:to-turquoise-900/20 rounded flex items-center justify-center text-center p-8"
                    style={{
                      height: `${parseInt(settings.height) * 0.6}px`,
                      border: settings.border ? '1px solid #e5e7eb' : 'none',
                      borderRadius: `${settings.borderRadius}px`,
                      minHeight: '200px'
                    }}
                  >
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-teal-100 dark:bg-teal-800 rounded-full mx-auto flex items-center justify-center">
                        <span className="text-teal-600 dark:text-teal-300 text-2xl">📅</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          6FB Booking Widget
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {settings.width}×{settings.height} • {settings.responsive ? 'Responsive' : 'Fixed'}
                        </p>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <div className="h-2 w-16 bg-teal-200 dark:bg-teal-700 rounded"></div>
                        <div className="h-2 w-12 bg-teal-100 dark:bg-teal-800 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
              </div>
            </div>

            {/* Preview URL */}
            <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded">
              <strong>Widget URL:</strong> {embedPackage.url}
            </div>
          </div>
        )}
      </Card>

      {/* Integration Instructions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Start Guide</h3>
        
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-semibold">
              1
            </div>
            <div>
              <h4 className="font-medium mb-1">Copy the Embed Code</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Click the "Copy Code" button above to copy the embed code to your clipboard. 
                Choose "HTML Only" for basic integration or "Complete Package" for full features.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-semibold">
              2
            </div>
            <div>
              <h4 className="font-medium mb-1">Add to Your Website</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Paste the code into your website's HTML where you want the booking widget to appear.
                See platform-specific instructions below for detailed steps.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-semibold">
              3
            </div>
            <div>
              <h4 className="font-medium mb-1">Test & Publish</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Save your changes and test the booking widget to ensure it's working correctly.
                The widget will be fully functional once published.
              </p>
            </div>
          </div>

          {/* Security & Features */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-green-900 dark:text-green-100 flex items-center gap-2">
                <span className="text-green-600">🔒</span>
                Security Features
              </h4>
              <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-200 text-xs">
                <li>Sandboxed iframe environment</li>
                <li>Secure payment processing via Stripe</li>
                <li>HTTPS encryption for all data</li>
                <li>No data stored on your server</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <span className="text-blue-600">⚡</span>
                Built-in Features
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-xs">
                <li>Mobile-responsive design</li>
                <li>Real-time availability checking</li>
                <li>Automated booking confirmations</li>
                <li>Payment processing included</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Platform-Specific Instructions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Platform-Specific Instructions</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          {PLATFORM_INSTRUCTIONS.map((platform) => (
            <details key={platform.platform} className="group border rounded-lg">
              <summary className="cursor-pointer p-4 font-medium text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                <span>{platform.title}</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">
                <ol className="list-decimal list-inside space-y-2 mb-3">
                  {platform.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
                {platform.notes && platform.notes.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Notes:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {platform.notes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </Card>

      {/* Troubleshooting */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Troubleshooting</h3>
        
        <div className="space-y-4 text-sm">
          <details className="group">
            <summary className="cursor-pointer font-medium flex items-center justify-between py-2">
              Widget not showing up
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2 pl-4 text-gray-600 dark:text-gray-400">
              <ul className="list-disc list-inside space-y-1">
                <li>Check that the embed code was pasted correctly</li>
                <li>Ensure your website supports iframe embedding</li>
                <li>Verify that HTTPS is enabled on your site</li>
                <li>Check browser console for any error messages</li>
              </ul>
            </div>
          </details>

          <details className="group">
            <summary className="cursor-pointer font-medium flex items-center justify-between py-2">
              Widget appears but won't load content
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2 pl-4 text-gray-600 dark:text-gray-400">
              <ul className="list-disc list-inside space-y-1">
                <li>Check your website's Content Security Policy (CSP)</li>
                <li>Ensure your server allows iframe embedding</li>
                <li>Verify the widget URL is accessible</li>
                <li>Try opening the widget URL directly in a new tab</li>
              </ul>
            </div>
          </details>

          <details className="group">
            <summary className="cursor-pointer font-medium flex items-center justify-between py-2">
              Booking process doesn't complete
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2 pl-4 text-gray-600 dark:text-gray-400">
              <ul className="list-disc list-inside space-y-1">
                <li>Ensure your 6FB account is properly configured</li>
                <li>Check that Stripe Connect is set up correctly</li>
                <li>Verify your business details are complete</li>
                <li>Test the booking flow on the main site first</li>
              </ul>
            </div>
          </details>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Need help?</strong> Contact our support team with your embed code and website URL for personalized assistance.
          </p>
        </div>
      </Card>
    </div>
  );
}