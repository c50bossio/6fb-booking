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
  showDownloadButton?: boolean;
  showShareButton?: boolean;
  showCopyButton?: boolean;
  className?: string;
}

export default function QRCodeGenerator({
  bookingUrl,
  title = 'Booking QR Code',
  description = 'Scan this QR code to book an appointment',
  defaultSize = 'medium',
  showSizeSelector = true,
  showDownloadButton = true,
  showShareButton = true,
  showCopyButton = true,
  className = '',
}: QRCodeGeneratorProps) {
  const [qrCodeData, setQrCodeData] = useState<QRCodeGenerationResult | null>(null);
  const [selectedSize, setSelectedSize] = useState<QRCodeSize>(defaultSize);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate QR code when URL or size changes
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
  }, [bookingUrl, selectedSize]);

  const generateQRCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateBookingQRCode(bookingUrl, selectedSize);
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