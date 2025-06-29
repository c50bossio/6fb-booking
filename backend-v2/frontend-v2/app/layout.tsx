import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Enhanced Inter configuration for iOS-style typography
const interDisplay = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-display',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    template: '%s | Booked Barber',
    default: 'Booked Barber - Own The Chair. Own The Brand.',
  },
  description: 'Professional booking and business management platform for barbershops. Built on the Six Figure Barber methodology. Own The Chair. Own The Brand.',
  keywords: ['barbershop', 'booking', 'appointment', 'management', 'six figure barber', 'booked barber'],
  authors: [{ name: 'Booked Barber Team' }],
  creator: 'Booked Barber',
  publisher: 'Booked Barber',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://6fb-booking.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Booked Barber - Own The Chair. Own The Brand.',
    description: 'Professional booking and business management platform for barbershops',
    type: 'website',
    locale: 'en_US',
    siteName: 'Booked Barber',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Booked Barber - Own The Chair. Own The Brand.',
    description: 'Professional booking and business management platform for barbershops',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${interDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Theme hydration script - prevents flash of incorrect theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('6fb-theme') || 'system';
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const resolvedTheme = theme === 'system' ? systemTheme : theme;
                document.documentElement.classList.add(resolvedTheme);
                document.documentElement.setAttribute('data-theme', resolvedTheme);
                
                // Set initial theme-color meta tag
                const metaThemeColor = document.createElement('meta');
                metaThemeColor.name = 'theme-color';
                metaThemeColor.content = resolvedTheme === 'dark' ? '#000000' : '#ffffff';
                document.head.appendChild(metaThemeColor);
              } catch (e) {
                // Fallback to light theme
                document.documentElement.classList.add('light');
                document.documentElement.setAttribute('data-theme', 'light');
              }
            `,
          }}
        />
        
        {/* iOS Web App Capabilities */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Booked Barber" />
        
        {/* Font preloading is handled automatically by Next.js Google Fonts */}
        
        {/* DNS prefetch for better performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="//fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Favicons and app icons */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body 
        className={`
          ${inter.className} 
          font-sans 
          min-h-screen 
          bg-gray-50 
          dark:bg-dark-surface-100 
          text-gray-900 
          dark:text-white
          antialiased
          selection:bg-primary-100 
          selection:text-primary-900
          dark:selection:bg-primary-900 
          dark:selection:text-primary-100
        `}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <AppLayout>
            {children}
          </AppLayout>
        </ErrorBoundary>
        
        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Web Vitals monitoring
              if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                      console.log('LCP:', entry.startTime);
                    }
                    if (entry.entryType === 'first-input') {
                      console.log('FID:', entry.processingStart - entry.startTime);
                    }
                    if (entry.entryType === 'layout-shift') {
                      if (!entry.hadRecentInput) {
                        console.log('CLS:', entry.value);
                      }
                    }
                  }
                });
                
                try {
                  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
                } catch (e) {
                  // Ignore if not supported
                }
              }
            `,
          }}
        />
      </body>
    </html>
  )
}