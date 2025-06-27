'use client'

import React, { useState } from 'react'

/**
 * Test component to verify input contrast fixes
 * This component can be temporarily added to any page to test input visibility
 */
export default function InputContrastTest() {
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    password: 'mypassword',  // pragma: allowlist secret
    name: 'John Doe',
    phone: '555-123-4567',
    notes: 'Sample notes text'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Input Contrast Test</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email (should have dark text on white background)
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="555-123-4567"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes"
            rows={3}
            className="w-full"
          />
        </div>

        <div className="pt-2">
          <p className="text-xs text-gray-600">
            ✅ All inputs should have dark text on white backgrounds<br/>
            ✅ Placeholders should be clearly visible<br/>
            ✅ Focus should show blue outline
          </p>
        </div>
      </div>

      <style jsx>{`
        input, textarea {
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}

// Alternative version that tests problematic styling scenarios
export function InputContrastStressTest() {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="text-lg font-bold mb-4 text-red-900">Stress Test</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-red-700 mb-1">
            Input with problematic styling
          </label>
          <input
            type="text"
            defaultValue="Should still be readable"
            placeholder="Placeholder should be visible"
            style={{ color: 'white', backgroundColor: 'white' }}
            className="w-full problematic-input"
          />
        </div>

        <div className="bg-gray-900 p-2 rounded">
          <label className="block text-sm font-medium text-white mb-1">
            Input on dark background
          </label>
          <input
            type="text"
            defaultValue="Dark theme test"
            placeholder="Should be readable"
            className="w-full"
          />
        </div>

        <div className="bg-black p-2 rounded">
          <label className="block text-sm font-medium text-white mb-1">
            Login page simulation
          </label>
          <input
            type="email"
            defaultValue="login@test.com"
            placeholder="Should have white text"
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}
