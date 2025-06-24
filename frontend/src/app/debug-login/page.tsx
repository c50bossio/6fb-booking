'use client'

import { useEffect } from 'react'

export default function DebugLoginPage() {
  useEffect(() => {
    // Log when component mounts
    console.log('Debug login page mounted')
    
    // Check for any global errors
    window.addEventListener('error', (e) => {
      console.error('Global error:', e)
      console.error('Error details:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
      })
    })
    
    // Check for unhandled rejections
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled rejection:', e.reason)
    })
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-8">Debug Login Page</h1>
        
        <div className="bg-gray-900 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Page Status</h2>
            <p className="text-green-400">✓ Page loaded successfully</p>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Test Links</h2>
            <div className="space-y-2">
              <a href="/login" className="block text-blue-400 hover:text-blue-300">
                → Original Login Page
              </a>
              <a href="/login-simple" className="block text-blue-400 hover:text-blue-300">
                → Simple Login Page (no auth)
              </a>
              <a href="/test-login" className="block text-blue-400 hover:text-blue-300">
                → Test Login Page (minimal)
              </a>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Console Output</h2>
            <p className="text-gray-400">Check browser console for error details</p>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <p className="text-yellow-300 text-sm">
            If you see a white screen on the login page, check the browser console (F12) for:
          </p>
          <ul className="list-disc list-inside text-yellow-300 text-sm mt-2">
            <li>Syntax errors in vendors.js</li>
            <li>Module loading errors</li>
            <li>Uncaught exceptions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}