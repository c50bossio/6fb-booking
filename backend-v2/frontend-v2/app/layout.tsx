import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '6FB Booking',
  description: 'Simple booking platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}