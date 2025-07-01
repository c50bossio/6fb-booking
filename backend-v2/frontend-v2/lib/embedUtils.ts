import { EmbedSettings, EmbedParams, EmbedCodeOptions, SECURITY_SANDBOX_ATTRIBUTES, IFRAME_ALLOW_ATTRIBUTES } from '../types/embed';

/**
 * Generate booking URL with embed parameters
 */
export function generateBookingUrl(params: EmbedParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://6fb-booking.com');
  const urlParams = new URLSearchParams();
  
  // Add embed flag
  urlParams.append('embed', 'true');
  
  // Add optional parameters
  if (params.barberId) urlParams.append('barber', params.barberId);
  if (params.serviceId) urlParams.append('service', params.serviceId);
  if (params.locationId) urlParams.append('location', params.locationId);
  if (params.theme) urlParams.append('theme', params.theme);
  if (params.primaryColor) urlParams.append('color', params.primaryColor);
  if (params.hideHeader) urlParams.append('hideHeader', 'true');
  if (params.hideFooter) urlParams.append('hideFooter', 'true');
  if (params.allowClose) urlParams.append('allowClose', 'true');
  
  return `${baseUrl}/book?${urlParams.toString()}`;
}

/**
 * Generate iframe HTML code
 */
export function generateIframeCode(options: EmbedCodeOptions): string {
  const { url, settings } = options;
  const { width, height, border, borderRadius, title, responsive } = settings;
  
  // Build sandbox attributes
  const sandboxAttrs = SECURITY_SANDBOX_ATTRIBUTES.join(' ');
  
  // Build allow attributes
  const allowAttrs = IFRAME_ALLOW_ATTRIBUTES.join('; ');
  
  // Build iframe attributes
  const iframeAttrs = [
    `src="${url}"`,
    `title="${title}"`,
    `sandbox="${sandboxAttrs}"`,
    `allow="${allowAttrs}"`,
    'loading="lazy"',
    'referrerpolicy="strict-origin-when-cross-origin"'
  ];

  if (responsive) {
    return generateResponsiveIframe(iframeAttrs, settings);
  } else {
    return generateFixedIframe(iframeAttrs, settings);
  }
}

/**
 * Generate responsive iframe code
 */
function generateResponsiveIframe(iframeAttrs: string[], settings: EmbedSettings): string {
  const { width, height, border, borderRadius } = settings;
  const aspectRatio = (parseInt(height) / parseInt(width) * 100).toFixed(2);
  
  const containerStyle = [
    'position: relative',
    `padding-bottom: ${aspectRatio}%`,
    'height: 0',
    'overflow: hidden',
    `max-width: ${width}px`,
    'margin: 0 auto'
  ].join('; ');
  
  const iframeStyle = [
    'position: absolute',
    'top: 0',
    'left: 0',
    'width: 100%',
    'height: 100%',
    `border: ${border ? '1px solid #e5e7eb' : 'none'}`,
    `border-radius: ${borderRadius}px`,
    'box-sizing: border-box'
  ].join('; ');
  
  return `<!-- 6FB Booking Widget - Responsive -->
<div style="${containerStyle}">
  <iframe
    ${iframeAttrs.join('\n    ')}
    style="${iframeStyle}"
    frameborder="0">
    <p>Your browser does not support iframes. Please visit our booking page directly.</p>
  </iframe>
</div>
<!-- End 6FB Booking Widget -->`;
}

/**
 * Generate fixed size iframe code
 */
function generateFixedIframe(iframeAttrs: string[], settings: EmbedSettings): string {
  const { width, height, border, borderRadius } = settings;
  
  const iframeStyle = [
    `width: ${width}px`,
    `height: ${height}px`,
    `border: ${border ? '1px solid #e5e7eb' : 'none'}`,
    `border-radius: ${borderRadius}px`,
    'box-sizing: border-box',
    'display: block'
  ].join('; ');
  
  return `<!-- 6FB Booking Widget -->
<iframe
  ${iframeAttrs.join('\n  ')}
  style="${iframeStyle}"
  frameborder="0">
  <p>Your browser does not support iframes. Please visit our booking page directly.</p>
</iframe>
<!-- End 6FB Booking Widget -->`;
}

/**
 * Generate CSS for embedding
 */
export function generateEmbedCSS(settings: EmbedSettings): string {
  const { responsive, width, height, border, borderRadius } = settings;
  
  if (responsive) {
    return `
/* 6FB Booking Widget - Responsive CSS */
.sixfb-booking-widget {
  position: relative;
  padding-bottom: ${(parseInt(height) / parseInt(width) * 100).toFixed(2)}%;
  height: 0;
  overflow: hidden;
  max-width: ${width}px;
  margin: 0 auto;
}

.sixfb-booking-widget iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: ${border ? '1px solid #e5e7eb' : 'none'};
  border-radius: ${borderRadius}px;
  box-sizing: border-box;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .sixfb-booking-widget {
    max-width: 100%;
    margin: 0;
  }
}
`;
  } else {
    return `
/* 6FB Booking Widget - Fixed CSS */
.sixfb-booking-widget iframe {
  width: ${width}px;
  height: ${height}px;
  border: ${border ? '1px solid #e5e7eb' : 'none'};
  border-radius: ${borderRadius}px;
  box-sizing: border-box;
  display: block;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .sixfb-booking-widget iframe {
    width: 100%;
    max-width: ${width}px;
  }
}
`;
  }
}

/**
 * Generate JavaScript for iframe communication
 */
export function generateEmbedJS(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://6fb-booking.com');
  
  return `
<!-- 6FB Booking Widget - JavaScript -->
<script>
(function() {
  'use strict';
  
  // Handle iframe messages
  function handleIframeMessage(event) {
    // Verify origin for security
    const allowedOrigins = [
      '${appUrl}',
      'https://6fb-booking.com',
      'https://app.6fb-booking.com'
    ];
    
    if (!allowedOrigins.includes(event.origin)) {
      return;
    }
    
    const data = event.data;
    
    // Handle different message types
    if (data.type === 'resize') {
      // Resize iframe based on content
      const iframe = document.querySelector('iframe[src*="6fb-booking"]');
      if (iframe && data.height) {
        iframe.style.height = data.height + 'px';
      }
    } else if (data.type === 'booking_completed') {
      // Handle booking completion
      console.log('Booking completed:', data.booking);
      
      // Fire custom event
      window.dispatchEvent(new CustomEvent('sixfb-booking-completed', {
        detail: data.booking
      }));
    } else if (data.type === 'booking_cancelled') {
      // Handle booking cancellation
      console.log('Booking cancelled');
      
      // Fire custom event
      window.dispatchEvent(new CustomEvent('sixfb-booking-cancelled'));
    }
  }
  
  // Listen for messages
  window.addEventListener('message', handleIframeMessage, false);
  
  // Example: Listen for booking events
  window.addEventListener('sixfb-booking-completed', function(event) {
    console.log('Booking completed on your site:', event.detail);
    // Add your custom logic here
  });
  
  window.addEventListener('sixfb-booking-cancelled', function(event) {
    console.log('Booking cancelled on your site');
    // Add your custom logic here
  });
})();
</script>
<!-- End 6FB Booking Widget JavaScript -->
`;
}

/**
 * Validate embed settings
 */
export function validateEmbedSettings(settings: EmbedSettings): string[] {
  const errors: string[] = [];
  
  // Validate dimensions
  const width = parseInt(settings.width);
  const height = parseInt(settings.height);
  
  if (isNaN(width) || width < 200 || width > 1200) {
    errors.push('Width must be between 200 and 1200 pixels');
  }
  
  if (isNaN(height) || height < 300 || height > 1200) {
    errors.push('Height must be between 300 and 1200 pixels');
  }
  
  // Validate border radius
  const borderRadius = parseInt(settings.borderRadius);
  if (isNaN(borderRadius) || borderRadius < 0 || borderRadius > 50) {
    errors.push('Border radius must be between 0 and 50 pixels');
  }
  
  // Validate title
  if (!settings.title || settings.title.trim().length === 0) {
    errors.push('Title is required for accessibility');
  }
  
  return errors;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

/**
 * Generate complete embed package
 */
export function generateEmbedPackage(params: EmbedParams, settings: EmbedSettings) {
  const url = generateBookingUrl(params);
  const iframeCode = generateIframeCode({ url, settings, sandboxAttributes: SECURITY_SANDBOX_ATTRIBUTES, allowAttributes: IFRAME_ALLOW_ATTRIBUTES });
  const css = generateEmbedCSS(settings);
  const js = generateEmbedJS();
  
  return {
    url,
    iframeCode,
    css,
    js,
    settings,
    params
  };
}