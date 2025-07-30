'use client'

import { useEffect, useState } from 'react'
import { Search, Home, Calendar, User, ArrowRight, Clock } from 'lucide-react'

export default function NotFoundPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [recentPages, setRecentPages] = useState<string[]>([])

  useEffect(() => {
    // Get recent pages from localStorage
    const recent = localStorage.getItem('recentPages')
    if (recent) {
      setRecentPages(JSON.parse(recent).slice(0, 3))
    }

    // Log 404 for analytics
    if (typeof window !== 'undefined') {
      console.log('404 Error:', window.location.pathname)
      
      // Track 404 in analytics if available
      if (window.gtag) {
        window.gtag('event', 'page_not_found', {
          page_location: window.location.href,
          page_path: window.location.pathname
        })
      }
    }
  }, [])

  const popularPages = [
    { path: '/', title: 'Home', icon: Home, description: 'Return to the main page' },
    { path: '/dashboard', title: 'Dashboard', icon: User, description: 'View your barbershop dashboard' },
    { path: '/calendar', title: 'Calendar', icon: Calendar, description: 'Manage your appointments' },
    { path: '/my-schedule', title: 'My Schedule', icon: Clock, description: 'Set your availability' }
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Redirect to search or dashboard with query
      window.location.href = `/dashboard?search=${encodeURIComponent(searchQuery)}`
    }
  }

  const handleSuggestionClick = (path: string) => {
    // Save to recent pages
    const recent = JSON.parse(localStorage.getItem('recentPages') || '[]')
    const updated = [path, ...recent.filter((p: string) => p !== path)].slice(0, 5)
    localStorage.setItem('recentPages', JSON.stringify(updated))
    
    window.location.href = path
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">BOOKEDBARBER</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          {/* 404 Animation */}
          <div className="mb-8">
            <div className="text-8xl font-bold text-teal-600 mb-4 animate-bounce">
              404
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              Page Not Found
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Sorry, we couldn't find the page you're looking for. 
              It might have been moved, deleted, or you entered the wrong URL.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-md mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for what you need..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-teal-600 text-white px-4 py-1.5 rounded-md hover:bg-teal-700 transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Popular Pages */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Popular Pages
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {popularPages.map((page) => (
              <button
                key={page.path}
                onClick={() => handleSuggestionClick(page.path)}
                className="flex items-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-teal-300 text-left group"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <page.icon className="w-6 h-6 text-teal-600" />
                </div>
                <div className="ml-4 flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                    {page.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {page.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Pages */}
        {recentPages.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Recent Pages
            </h2>
            <div className="flex justify-center gap-3 flex-wrap">
              {recentPages.map((path) => (
                <button
                  key={path}
                  onClick={() => handleSuggestionClick(path)}
                  className="px-4 py-2 bg-gray-100 hover:bg-teal-100 text-gray-700 hover:text-teal-700 rounded-lg transition-colors text-sm font-medium"
                >
                  {path === '/' ? 'Home' : path.replace('/', '').replace('-', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Need Help?
            </h2>
            <p className="text-gray-600 mb-6">
              If you're still having trouble finding what you need, we're here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@bookedbarber.com"
                className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                Contact Support
              </a>
              <a
                href="/help"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Help Center
              </a>
            </div>
          </div>
        </div>

        {/* Auto-redirect suggestion */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            You'll be redirected to the homepage in{' '}
            <span className="font-semibold">30 seconds</span> if you don't take any action.
          </p>
        </div>
      </div>
    </div>
  )
}

// Auto-redirect after 30 seconds
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (window.location.pathname.includes('not-found') || document.title.includes('404')) {
      window.location.href = '/'
    }
  }, 30000)
}