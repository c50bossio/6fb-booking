'use client';

import { useState } from 'react';
import QRCodeGenerator, { QRCodeGeneratorCompact } from '../../components/booking/QRCodeGenerator';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

export default function QRCodeDemoPage() {
  const [showFullGenerator, setShowFullGenerator] = useState(true);
  
  // Example booking URLs for demonstration
  const bookingUrls = [
    'https://your-barbershop.com/book?service=haircut',
    'https://your-barbershop.com/book?service=shave',
    'https://your-barbershop.com/book?service=haircut-shave',
  ];

  const [selectedUrl, setSelectedUrl] = useState(bookingUrls[0]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            QR Code Generator Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Demonstrate QR code generation functionality for booking link sharing. 
            Generate QR codes for your booking links that customers can scan to book appointments.
          </p>
        </div>

        {/* URL Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Booking URL</h2>
          <div className="grid gap-2 max-w-2xl mx-auto">
            {bookingUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => setSelectedUrl(url)}
                className={`p-3 text-left rounded-lg border transition-colors ${
                  selectedUrl === url
                    ? 'bg-teal-50 border-teal-300 text-teal-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-mono text-sm">{url}</span>
              </button>
            ))}
          </div>
        </div>

        {/* View Toggle */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowFullGenerator(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showFullGenerator
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Full Generator
            </button>
            <button
              onClick={() => setShowFullGenerator(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !showFullGenerator
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Compact View
            </button>
          </div>
        </div>

        {/* QR Code Generator */}
        <div className="max-w-2xl mx-auto">
          {showFullGenerator ? (
            <QRCodeGenerator
              bookingUrl={selectedUrl}
              title="Booking QR Code"
              description="Share this QR code with your customers to make booking easy"
              defaultSize="medium"
              showSizeSelector={true}
              showDownloadButton={true}
              showShareButton={true}
              showCopyButton={true}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="text-center p-6">
                  <h3 className="text-lg font-semibold mb-4">Small</h3>
                  <QRCodeGeneratorCompact
                    bookingUrl={selectedUrl}
                    size="small"
                    className="mx-auto"
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="text-center p-6">
                  <h3 className="text-lg font-semibold mb-4">Medium</h3>
                  <QRCodeGeneratorCompact
                    bookingUrl={selectedUrl}
                    size="medium"
                    className="mx-auto"
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="text-center p-6">
                  <h3 className="text-lg font-semibold mb-4">Large</h3>
                  <QRCodeGeneratorCompact
                    bookingUrl={selectedUrl}
                    size="large"
                    className="mx-auto"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Usage Examples */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Usage Examples
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Full Component Example
                </h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`<QRCodeGenerator
  bookingUrl="https://barbershop.com/book"
  title="Book an Appointment"
  description="Scan to book with us"
  defaultSize="medium"
  showSizeSelector={true}
  showDownloadButton={true}
  showShareButton={true}
  showCopyButton={true}
/>`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Compact Component Example
                </h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`<QRCodeGeneratorCompact
  bookingUrl="https://barbershop.com/book"
  size="small"
  className="mx-auto"
/>`}
                </pre>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Service Functions
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Generate QR Code for Booking</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm">
{`import { generateBookingQRCode } from '@/lib/qr-code-service';

const result = await generateBookingQRCode(
  'https://barbershop.com/book',
  'medium'
);`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Download QR Code</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm">
{`import { downloadQRCode } from '@/lib/qr-code-service';

downloadQRCode(dataUrl, 'booking-qr-code.png');`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Validate URL</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm">
{`import { validateBookingUrl } from '@/lib/qr-code-service';

const isValid = validateBookingUrl('https://barbershop.com/book');`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Features
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Configurable Sizes</h3>
              <p className="text-gray-600 text-sm">Small (128px), Medium (256px), Large (512px) options</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Download as PNG</h3>
              <p className="text-gray-600 text-sm">High-quality PNG downloads with custom filenames</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Share & Copy</h3>
              <p className="text-gray-600 text-sm">Native sharing API with clipboard fallback</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Error Correction</h3>
              <p className="text-gray-600 text-sm">Built-in error correction for reliable scanning</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mobile Optimized</h3>
              <p className="text-gray-600 text-sm">Responsive design works perfectly on all devices</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Loading States</h3>
              <p className="text-gray-600 text-sm">Smooth loading animations and error handling</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}