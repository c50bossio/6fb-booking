'use client'

import type { CookieCategories } from '@/hooks/useCookieConsent'

// Script loading utilities for GDPR-compliant analytics and marketing

// Google Analytics 4 Configuration
export interface GAConfig {
  measurementId: string
  enableAnalytics: boolean
  enableMarketing: boolean
}

// Meta Pixel Configuration
export interface MetaPixelConfig {
  pixelId: string
  enabled: boolean
}

// Global script loader state
let scriptsLoaded = {
  googleAnalytics: false,
  metaPixel: false,
  googleConsentMode: false,
}

// Initialize Google Consent Mode (must be called before GA)
export const initializeGoogleConsentMode = () => {
  if (scriptsLoaded.googleConsentMode || typeof window === 'undefined') {
    return
  }

  // Load Google tag manager
  const gtmScript = document.createElement('script')
  gtmScript.async = true
  gtmScript.src = 'https://www.googletagmanager.com/gtag/js'
  document.head.appendChild(gtmScript)

  // Initialize gtag function
  window.dataLayer = window.dataLayer || []
  function gtag(...args: any[]) {
    window.dataLayer.push(args)
  }
  window.gtag = gtag

  // Configure default consent state (denied)
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted', // Always granted for security
  })

  scriptsLoaded.googleConsentMode = true
}

// Update Google Consent Mode based on user preferences
export const updateGoogleConsent = (categories: CookieCategories) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return
  }

  window.gtag('consent', 'update', {
    'analytics_storage': categories.analytics ? 'granted' : 'denied',
    'ad_storage': categories.marketing ? 'granted' : 'denied',
    'ad_user_data': categories.marketing ? 'granted' : 'denied',
    'ad_personalization': categories.marketing ? 'granted' : 'denied',
    'functionality_storage': categories.functional ? 'granted' : 'denied',
    'personalization_storage': categories.functional ? 'granted' : 'denied',
  })
}

// Load Google Analytics 4
export const loadGoogleAnalytics = (config: GAConfig) => {
  if (scriptsLoaded.googleAnalytics || typeof window === 'undefined') {
    return
  }

  // Ensure consent mode is initialized first
  initializeGoogleConsentMode()

  // Configure GA4
  window.gtag('config', config.measurementId, {
    // Privacy-friendly settings
    anonymize_ip: true,
    allow_google_signals: config.enableMarketing,
    allow_ad_personalization_signals: config.enableMarketing,
    cookie_flags: 'SameSite=Strict;Secure',
    
    // Custom settings
    send_page_view: true,
    debug_mode: process.env.NODE_ENV === 'development',
  })

  scriptsLoaded.googleAnalytics = true
}

// Remove Google Analytics
export const removeGoogleAnalytics = () => {
  if (typeof window === 'undefined') return

  // Clear GA cookies
  const gaCookies = [
    '_ga',
    '_ga_' + (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '').replace('G-', ''),
    '_gid',
    '_gat',
    '__utma',
    '__utmb',
    '__utmc',
    '__utmt',
    '__utmz',
  ]

  gaCookies.forEach(cookie => {
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })

  scriptsLoaded.googleAnalytics = false
}

// Load Meta Pixel
export const loadMetaPixel = (config: MetaPixelConfig) => {
  if (scriptsLoaded.metaPixel || typeof window === 'undefined' || !config.enabled) {
    return
  }

  // Facebook Pixel code
  const fbPixelScript = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', '${config.pixelId}');
    fbq('track', 'PageView');
  `

  const script = document.createElement('script')
  script.innerHTML = fbPixelScript
  document.head.appendChild(script)

  // Add noscript fallback
  const noscript = document.createElement('noscript')
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${config.pixelId}&ev=PageView&noscript=1"/>`
  document.head.appendChild(noscript)

  scriptsLoaded.metaPixel = true
}

// Remove Meta Pixel
export const removeMetaPixel = () => {
  if (typeof window === 'undefined') return

  // Clear Facebook cookies
  const fbCookies = ['_fbp', '_fbc', 'fr']
  
  fbCookies.forEach(cookie => {
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })

  // Remove fbq function
  if (window.fbq) {
    delete (window as any).fbq
  }

  scriptsLoaded.metaPixel = false
}

// Initialize all scripts based on consent
export const initializeScripts = (categories: CookieCategories) => {
  // Always initialize consent mode first
  initializeGoogleConsentMode()
  
  // Update consent settings
  updateGoogleConsent(categories)

  // Load analytics if consented
  if (categories.analytics && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    loadGoogleAnalytics({
      measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      enableAnalytics: true,
      enableMarketing: categories.marketing,
    })
  } else {
    removeGoogleAnalytics()
  }

  // Load marketing scripts if consented
  if (categories.marketing && process.env.NEXT_PUBLIC_META_PIXEL_ID) {
    loadMetaPixel({
      pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
      enabled: true,
    })
  } else {
    removeMetaPixel()
  }
}

// Track custom events (only if consent given)
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window === 'undefined') return

  // Google Analytics event
  if (window.gtag && scriptsLoaded.googleAnalytics) {
    window.gtag('event', eventName, parameters)
  }

  // Meta Pixel event
  if (window.fbq && scriptsLoaded.metaPixel) {
    window.fbq('track', eventName, parameters)
  }
}

// Track page view
export const trackPageView = (url?: string) => {
  if (typeof window === 'undefined') return

  // Google Analytics page view
  if (window.gtag && scriptsLoaded.googleAnalytics) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', {
      page_path: url || window.location.pathname,
    })
  }

  // Meta Pixel page view
  if (window.fbq && scriptsLoaded.metaPixel) {
    window.fbq('track', 'PageView')
  }
}

// Get current script loading status
export const getScriptStatus = () => ({
  ...scriptsLoaded,
})

// Type declarations for global objects
declare global {
  interface Window {
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
    fbq?: (...args: any[]) => void
    _fbq?: any
  }
}

export default {
  initializeGoogleConsentMode,
  updateGoogleConsent,
  loadGoogleAnalytics,
  removeGoogleAnalytics,
  loadMetaPixel,
  removeMetaPixel,
  initializeScripts,
  trackEvent,
  trackPageView,
  getScriptStatus,
}