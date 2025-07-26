'use client';

import { useState, useEffect } from 'react';
import { Download, Share2, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { 
  generateBookingQRCode, 
  downloadQRCode, 
  validateBookingUrl,
  generateQRCodeFilename,
  type QRCodeSize,
  type QRCodeGenerationResult
} from '../../lib/qr-code-service';

interface QRCodeGeneratorProps {
  bookingUrl: string;
  title?: string;
  description?: string;
  defaultSize?: QRCodeSize;
  showSizeSelector?: boolean;
  showColorSelector?: boolean;
  showDownloadButton?: boolean;
  showShareButton?: boolean;
  showCopyButton?: boolean;
  className?: string;
  customColors?: {
    dark: string;
    light: string;
  };
}

export default function QRCodeGenerator({
  bookingUrl,
  title = 'Booking QR Code',
  description = 'Scan this QR code to book an appointment',
  defaultSize = 'medium',
  showSizeSelector = true,
  showColorSelector = false,
  showDownloadButton = true,
  showShareButton = true,
  showCopyButton = true,
  className = '',
  customColors,
}: QRCodeGeneratorProps) {
  const [qrCodeData, setQrCodeData] = useState<QRCodeGenerationResult | null>(null);
  const [selectedSize, setSelectedSize] = useState<QRCodeSize>(defaultSize);
  const [selectedColors, setSelectedColors] = useState({
    dark: customColors?.dark || '#059669', // Teal-600
    light: customColors?.light || '#FFFFFF'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate QR code when URL, size, or colors change
  useEffect(() => {
    if (!bookingUrl) {
      setError('Booking URL is required');
      return;
    }

    if (!validateBookingUrl(bookingUrl)) {
      setError('Invalid booking URL');
      return;
    }

    generateQRCode();
  }, [bookingUrl, selectedSize, selectedColors]);

  const generateQRCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Import the generateQRCodeForDownload function for custom colors
      const { generateQRCodeForDownload } = await import('../../lib/qr-code-service');
      
      const options = {
        size: selectedSize,
        format: 'png' as const,
        errorCorrectionLevel: 'M' as const,
        margin: 4,
        color: selectedColors,
      };

      const result = await generateQRCodeForDownload(bookingUrl, options);
      setQrCodeData(result);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      setError('Failed to generate QR code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeData) return;

    try {
      const filename = generateQRCodeFilename('booking-qr-code', selectedSize);
      downloadQRCode(qrCodeData.downloadUrl, filename);
    } catch (err) {
      console.error('Failed to download QR code:', err);
      setError('Failed to download QR code. Please try again.');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setError('Failed to copy URL to clipboard');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: bookingUrl,
        });
      } catch (err) {
        console.error('Failed to share:', err);
        // Fallback to copy URL
        handleCopyUrl();
      }
    } else {
      // Fallback to copy URL
      handleCopyUrl();
    }
  };

  const sizeOptions: { value: QRCodeSize; label: string; pixels: number }[] = [
    { value: 'small', label: 'Small', pixels: 128 },
    { value: 'medium', label: 'Medium', pixels: 256 },
    { value: 'large', label: 'Large', pixels: 512 },
  ];

  const colorPresets = [
    { name: 'Teal', dark: '#059669', light: '#FFFFFF' },
    { name: 'Blue', dark: '#2563EB', light: '#FFFFFF' },
    { name: 'Purple', dark: '#7C3AED', light: '#FFFFFF' },
    { name: 'Pink', dark: '#DB2777', light: '#FFFFFF' },
    { name: 'Black', dark: '#000000', light: '#FFFFFF' },
    { name: 'Dark Blue', dark: '#1E3A8A', light: '#F0F9FF' },
    { name: 'Dark Green', dark: '#166534', light: '#F0FDF4' },
    { name: 'Maroon', dark: '#7F1D1D', light: '#FEF2F2' },
  ];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Size Selector */}
      {showSizeSelector && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            QR Code Size
          </label>
          <div className="flex gap-2">
            {sizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedSize(option.value)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  selectedSize === option.value
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
                <span className="block text-xs text-gray-500">
                  {option.pixels}px
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Selector */}
      {showColorSelector && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            QR Code Colors
          </label>
          <div className="space-y-4">
            {/* Color Presets */}
            <div>
              <span className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">Presets</span>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setSelectedColors({ dark: preset.dark, light: preset.light })}
                    className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors ${
                      selectedColors.dark === preset.dark && selectedColors.light === preset.light
                        ? 'bg-teal-50 border-teal-300 text-teal-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex">
                      <div 
                        className="w-3 h-3 rounded-l" 
                        style={{ backgroundColor: preset.dark }}
                      />
                      <div 
                        className="w-3 h-3 rounded-r border-l border-gray-300" 
                        style={{ backgroundColor: preset.light }}
                      />
                    </div>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <span className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">Custom</span>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Foreground
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedColors.dark}
                      onChange={(e) => setSelectedColors(prev => ({ ...prev, dark: e.target.value }))}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedColors.dark}
                      onChange={(e) => setSelectedColors(prev => ({ ...prev, dark: e.target.value }))}
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedColors.light}
                      onChange={(e) => setSelectedColors(prev => ({ ...prev, light: e.target.value }))}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedColors.light}
                      onChange={(e) => setSelectedColors(prev => ({ ...prev, light: e.target.value }))}
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Display */}
      <div className="mb-6">
        <div className="flex justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
              <p className="text-sm text-gray-600">Generating QR code...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button
                onClick={generateQRCode}
                className="text-sm text-teal-600 hover:text-teal-700 underline"
              >
                Try again
              </button>
            </div>
          ) : qrCodeData ? (
            <div className="flex flex-col items-center">
              <img
                src={qrCodeData.dataUrl}
                alt="QR Code for booking"
                className="border border-gray-200 rounded-lg shadow-sm"
                style={{ width: qrCodeData.size, height: qrCodeData.size }}
              />
              <p className="text-xs text-gray-500 mt-2">
                {qrCodeData.size}×{qrCodeData.size} pixels
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {showDownloadButton && (
          <button
            onClick={handleDownload}
            disabled={!qrCodeData || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>
        )}

        {showShareButton && (
          <button
            onClick={handleShare}
            disabled={!bookingUrl || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        )}

        {showCopyButton && (
          <button
            onClick={handleCopyUrl}
            disabled={!bookingUrl || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Copy className="h-4 w-4" />
            {copySuccess ? 'Copied!' : 'Copy URL'}
          </button>
        )}
      </div>

      {/* URL Display */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">Booking URL:</p>
        <p className="text-sm text-gray-800 break-all font-mono">
          {bookingUrl}
        </p>
      </div>
    </div>
  );
}

// Compact version for use in modals or smaller spaces
export function QRCodeGeneratorCompact({
  bookingUrl,
  size = 'small',
  className = '',
}: {
  bookingUrl: string;
  size?: QRCodeSize;
  className?: string;
}) {
  const [qrCodeData, setQrCodeData] = useState<QRCodeGenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingUrl || !validateBookingUrl(bookingUrl)) {
      setError('Invalid URL');
      return;
    }

    const generateQRCode = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await generateBookingQRCode(bookingUrl, size);
        setQrCodeData(result);
      } catch (err) {
        setError('Failed to generate QR code');
      } finally {
        setIsLoading(false);
      }
    };

    generateQRCode();
  }, [bookingUrl, size]);

  const handleDownload = () => {
    if (!qrCodeData) return;
    const filename = generateQRCodeFilename('booking-qr-code', size);
    downloadQRCode(qrCodeData.downloadUrl, filename);
  };

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      {isLoading ? (
        <div className="flex items-center justify-center w-32 h-32 bg-gray-100 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center w-32 h-32 bg-red-50 rounded-lg">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
      ) : qrCodeData ? (
        <>
          <img
            src={qrCodeData.dataUrl}
            alt="QR Code"
            className="border border-gray-200 rounded-lg shadow-sm"
            style={{ width: qrCodeData.size, height: qrCodeData.size }}
          />
          <button
            onClick={handleDownload}
            className="mt-2 text-xs text-teal-600 hover:text-teal-700 underline"
          >
            Download
          </button>
        </>
      ) : null}
    </div>
  );
}