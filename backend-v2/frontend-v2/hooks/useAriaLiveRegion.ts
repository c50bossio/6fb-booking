import { useEffect, useRef } from 'react';

interface UseAriaLiveRegionOptions {
  ariaLive?: 'polite' | 'assertive' | 'off';
  ariaAtomic?: boolean;
  ariaRelevant?: 'additions' | 'removals' | 'text' | 'all';
  delay?: number;
}

export function useAriaLiveRegion(options: UseAriaLiveRegionOptions = {}) {
  const {
    ariaLive = 'polite',
    ariaAtomic = true,
    ariaRelevant = 'additions text',
    delay = 100,
  } = options;

  const regionRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create the live region element
    const region = document.createElement('div');
    region.setAttribute('aria-live', ariaLive);
    region.setAttribute('aria-atomic', String(ariaAtomic));
    region.setAttribute('aria-relevant', ariaRelevant);
    region.className = 'sr-only'; // Screen reader only
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    
    document.body.appendChild(region);
    regionRef.current = region;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (regionRef.current && document.body.contains(regionRef.current)) {
        document.body.removeChild(regionRef.current);
      }
    };
  }, [ariaLive, ariaAtomic, ariaRelevant]);

  const announce = (message: string) => {
    if (!regionRef.current) return;

    // Clear any pending announcements
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear current content
    regionRef.current.textContent = '';

    // Set new content after a small delay to ensure screen readers pick it up
    timeoutRef.current = setTimeout(() => {
      if (regionRef.current) {
        regionRef.current.textContent = message;
        
        // Clear after announcement to prevent duplicate readings
        setTimeout(() => {
          if (regionRef.current) {
            regionRef.current.textContent = '';
          }
        }, 1000);
      }
    }, delay);
  };

  return { announce };
}