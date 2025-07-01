'use client'

import { DemoModeProvider } from '@/components/demo/DemoModeProvider'
import { DemoBanner } from '@/components/demo/DemoBanner'

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DemoModeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DemoBanner />
        <div className="pt-12"> {/* Space for fixed banner */}
          {children}
        </div>
      </div>
    </DemoModeProvider>
  )
}