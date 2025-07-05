import { useEffect, useState } from 'react'

interface CustomerPixels {
  gtm_container_id?: string
  ga4_measurement_id?: string
  meta_pixel_id?: string
  google_ads_conversion_id?: string
  google_ads_conversion_label?: string
  custom_tracking_code?: string
  tracking_enabled: boolean
}

declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
    fbq: (...args: any[]) => void
    _fbq: any
  }
}

/**
 * Hook to load customer-specific tracking pixels on booking pages
 * @param organizationSlug - The organization slug from the URL
 */
export function useCustomerPixels(organizationSlug: string | undefined) {
  const [pixelsLoaded, setPixelsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationSlug) return

    const loadPixels = async () => {
      try {
        // Fetch customer's tracking pixels
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/customer-pixels/public/${organizationSlug}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch pixels: ${response.status}`)
        }
        const pixels: CustomerPixels = await response.json()

        if (!pixels.tracking_enabled) {
          console.log('Tracking disabled for this organization')
          return
        }

        // Load Google Tag Manager
        if (pixels.gtm_container_id) {
          loadGTM(pixels.gtm_container_id)
        }

        // Load Google Analytics 4
        if (pixels.ga4_measurement_id) {
          loadGA4(pixels.ga4_measurement_id)
        }

        // Load Meta Pixel
        if (pixels.meta_pixel_id) {
          loadMetaPixel(pixels.meta_pixel_id)
        }

        // Load Google Ads conversion tracking
        if (pixels.google_ads_conversion_id) {
          loadGoogleAdsConversion(pixels.google_ads_conversion_id, pixels.google_ads_conversion_label)
        }

        // Load custom tracking code
        if (pixels.custom_tracking_code) {
          loadCustomCode(pixels.custom_tracking_code)
        }

        setPixelsLoaded(true)
      } catch (err) {
        console.error('Failed to load customer pixels:', err)
        setError('Failed to load tracking pixels')
      }
    }

    loadPixels()
  }, [organizationSlug])

  return { pixelsLoaded, error }
}

/**
 * Load Google Tag Manager
 */
function loadGTM(containerId: string) {
  if (typeof window === 'undefined') return

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || []
  
  // GTM script
  const script = document.createElement('script')
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `
  document.head.appendChild(script)

  // GTM noscript (for users with JS disabled)
  const noscript = document.createElement('noscript')
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>`
  document.body.insertBefore(noscript, document.body.firstChild)
}

/**
 * Load Google Analytics 4
 */
function loadGA4(measurementId: string) {
  if (typeof window === 'undefined') return

  // Load gtag.js
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  // Initialize gtag
  window.dataLayer = window.dataLayer || []
  window.gtag = function() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    page_path: window.location.pathname,
    cookie_flags: 'SameSite=None;Secure'
  })
}

/**
 * Load Meta (Facebook) Pixel
 */
function loadMetaPixel(pixelId: string) {
  if (typeof window === 'undefined') return

  // Meta Pixel script
  const script = document.createElement('script')
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `
  document.head.appendChild(script)

  // Meta Pixel noscript
  const noscript = document.createElement('noscript')
  noscript.innerHTML = `<img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`
  document.body.appendChild(noscript)
}

/**
 * Load Google Ads conversion tracking
 */
function loadGoogleAdsConversion(conversionId: string, conversionLabel?: string) {
  if (typeof window === 'undefined') return

  // Load gtag.js if not already loaded
  if (!window.gtag) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    window.gtag = function() {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
  }

  // Configure Google Ads
  window.gtag('config', conversionId)
}

/**
 * Load custom tracking code
 */
function loadCustomCode(code: string) {
  if (typeof window === 'undefined') return

  try {
    // Create a container div for the custom code
    const container = document.createElement('div')
    container.style.display = 'none'
    container.innerHTML = code
    
    // Extract and execute scripts
    const scripts = container.querySelectorAll('script')
    scripts.forEach((script) => {
      const newScript = document.createElement('script')
      
      // Copy attributes
      Array.from(script.attributes).forEach((attr) => {
        // Skip src attribute for security
        if (attr.name !== 'src') {
          newScript.setAttribute(attr.name, attr.value)
        }
      })
      
      // Copy inline code
      if (script.innerHTML) {
        newScript.innerHTML = script.innerHTML
      }
      
      document.head.appendChild(newScript)
    })
    
    // Append non-script elements (like img pixels)
    const nonScripts = container.querySelectorAll(':not(script)')
    nonScripts.forEach((element) => {
      document.body.appendChild(element)
    })
  } catch (err) {
    console.error('Failed to load custom tracking code:', err)
  }
}

/**
 * Fire a conversion event for all loaded pixels
 */
export function fireConversionEvent(eventName: string, value?: number, currency?: string) {
  // GTM event
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      value: value,
      currency: currency
    })
  }

  // GA4 event
  if (window.gtag) {
    window.gtag('event', eventName, {
      value: value,
      currency: currency
    })
  }

  // Meta Pixel event
  if (window.fbq) {
    if (eventName === 'booking_completed') {
      window.fbq('track', 'Purchase', {
        value: value,
        currency: currency || 'USD'
      })
    } else {
      window.fbq('trackCustom', eventName, {
        value: value,
        currency: currency
      })
    }
  }

  // Google Ads conversion
  if (window.gtag && eventName === 'booking_completed') {
    window.gtag('event', 'conversion', {
      send_to: window.dataLayer?.find((item: any) => item[0] === 'config')?.[1],
      value: value,
      currency: currency || 'USD'
    })
  }
}