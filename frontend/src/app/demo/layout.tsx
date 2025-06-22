'use client'

import { useState } from 'react'
import DemoSidebar from '@/components/DemoSidebar'

// Demo layout with comprehensive sidebar navigation
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentPage, setCurrentPage] = useState('')

  const handleNavigation = (href: string) => {
    setCurrentPage(href)
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <DemoSidebar onNavigate={handleNavigation} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
          {children}
        </main>
      </div>
    </div>
  )
}
