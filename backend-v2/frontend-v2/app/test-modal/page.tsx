'use client'

import React, { useState } from 'react'
import ShareBookingModal from '@/components/booking/ShareBookingModal'

export default function TestModalPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const mockServices = [
    { id: 1, name: 'Haircut', slug: 'haircut', duration: 30, price: 30, category: 'hair', isActive: true },
    { id: 2, name: 'Beard Trim', slug: 'beard-trim', duration: 15, price: 15, category: 'beard', isActive: true },
    { id: 3, name: 'Hair Wash', slug: 'hair-wash', duration: 10, price: 10, category: 'hair', isActive: true }
  ]

  const mockBarbers = [
    { id: 1, name: 'John Doe', slug: 'john', email: 'john@test.com', isActive: true, services: [1, 2], timezone: 'America/New_York', locationId: 1 },
    { id: 2, name: 'Jane Smith', slug: 'jane', email: 'jane@test.com', isActive: true, services: [1, 3], timezone: 'America/New_York', locationId: 1 }
  ]

  // Test different URL scenarios
  const testUrls = {
    localhost: 'http://localhost:3000/book/test-business',
    production: 'https://bookedbarber.com/book/test-business',
    custom: 'https://book.testbarbershop.com'
  }

  const [currentTestUrl, setCurrentTestUrl] = useState(testUrls.production)

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          ShareBookingModal Test Page
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Test Scenarios
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test URL:
              </label>
              <select
                value={currentTestUrl}
                onChange={(e) => setCurrentTestUrl(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value={testUrls.localhost}>Localhost URL (should be fixed)</option>
                <option value={testUrls.production}>Production URL</option>
                <option value={testUrls.custom}>Custom Domain URL</option>
              </select>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200"
              >
                Open ShareBookingModal (Enhanced)
              </button>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🎉 Features Added & Fixed:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>Custom Link Names:</strong> Add tracking names to booking URLs</li>
                  <li>• <strong>Link Expiration:</strong> Set expiration dates with visual status indicators</li>
                  <li>• <strong>Smart Validation:</strong> Prevents past dates and invalid characters</li>
                  <li>• <strong>Recent Links History:</strong> Stores custom names and expiration status</li>
                  <li>• <strong>QR Code Customization:</strong> 8 color presets + custom color picker</li>
                  <li>• <strong>Smart Modal Navigation:</strong> Internal pages stay in app, public pages open externally</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Test Checklist
          </h2>
          
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="positioning" />
              <label htmlFor="positioning">Modal appears properly centered (not "too high")</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="click-outside" />
              <label htmlFor="click-outside">Click outside the modal closes it reliably</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="url-domain" />
              <label htmlFor="url-domain">Booking URL shows proper domain (not localhost)</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="animations" />
              <label htmlFor="animations">All modal animations work smoothly</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="icons" />
              <label htmlFor="icons">All icons display correctly (no missing imports)</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="responsive" />
              <label htmlFor="responsive">Modal works on different viewport sizes</label>
            </div>
          </div>
        </div>

        {/* Test different viewport sizes */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Mobile</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resize browser to &lt; 768px</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Tablet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resize browser to 768px - 1024px</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Desktop</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resize browser to &gt; 1024px</p>
          </div>
        </div>
      </div>

      {/* ShareBookingModal Component */}
      <ShareBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookingUrl={currentTestUrl}
        businessName="Test Barbershop"
        services={mockServices}
        barbers={mockBarbers}
      />
    </div>
  )
}