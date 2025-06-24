/**
 * Custom image loader for CDN support
 * Used when CDN_URL environment variable is set in production
 */

export default function customImageLoader({ src, width, quality }) {
  const CDN_URL = process.env.CDN_URL || process.env.NEXT_PUBLIC_CDN_URL;
  
  // If no CDN URL is configured, use default behavior
  if (!CDN_URL) {
    return src;
  }
  
  // If src is already a full URL (external image), return as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  
  // Handle internal images through CDN
  const params = new URLSearchParams();
  params.set('w', width.toString());
  
  if (quality) {
    params.set('q', quality.toString());
  }
  
  // Format the CDN URL
  const cdnPath = src.startsWith('/') ? src.slice(1) : src;
  return `${CDN_URL}/image/${cdnPath}?${params.toString()}`;
}