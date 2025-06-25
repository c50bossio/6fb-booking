'use client';

import { useEffect } from 'react';

export default function HighContrastEnforcer() {
  useEffect(() => {
    // Define low-contrast classes that need to be fixed
    const lowContrastClasses = [
      'text-gray-300', 'text-gray-400', 'text-gray-500',
      'text-slate-300', 'text-slate-400', 'text-slate-500',
      'text-zinc-300', 'text-zinc-400', 'text-zinc-500',
      'text-neutral-300', 'text-neutral-400', 'text-neutral-500',
      'text-stone-300', 'text-stone-400', 'text-stone-500',
      'text-muted', 'text-muted-foreground',
      'opacity-50', 'opacity-60', 'opacity-70'
    ];

    // High contrast replacement styles
    const highContrastStyles = {
      color: '#1a1a1a !important',
      opacity: '1 !important',
    };

    // Function to check if an element has low contrast
    const hasLowContrastClass = (element: Element): boolean => {
      const classList = element.className?.toString() || '';
      return lowContrastClasses.some(cls => classList.includes(cls));
    };

    // Function to check if element contains actual text
    const hasTextContent = (element: Element): boolean => {
      const text = element.textContent?.trim() || '';
      return text.length > 0 && !element.querySelector('*');
    };

    // Function to fix a single element
    const fixElement = (element: Element) => {
      if (element instanceof HTMLElement) {
        // Skip if already fixed
        if (element.dataset.contrastFixed === 'true') return;

        // Skip premium buttons and other dark background elements
        if (element.classList.contains('premium-button') || 
            element.classList.contains('premium-button-sm') ||
            element.closest('.premium-button') ||
            element.closest('.premium-button-sm')) {
          return;
        }

        // Check computed styles for low contrast
        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.color;

        // Parse RGB values
        const rgbMatch = color?.match(/\d+/g);
        if (rgbMatch && rgbMatch.length >= 3) {
          const [r, g, b] = rgbMatch.map(Number);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // If color is too light (high luminance) or has low contrast class
          if (luminance > 0.5 || hasLowContrastClass(element)) {
            // Apply high contrast styles
            Object.entries(highContrastStyles).forEach(([prop, value]) => {
              element.style.setProperty(prop, value.replace(' !important', ''), 'important');
            });

            // Mark as fixed
            element.dataset.contrastFixed = 'true';

            // Remove low contrast classes
            lowContrastClasses.forEach(cls => {
              element.classList.remove(cls);
            });
          }
        }

        // Check opacity
        const opacity = parseFloat(computedStyle.opacity);
        if (opacity < 0.8) {
          element.style.setProperty('opacity', '1', 'important');
          element.dataset.contrastFixed = 'true';
        }
      }
    };

    // Function to scan and fix all elements
    const scanAndFix = () => {
      // Target all text-containing elements
      const textSelectors = [
        'p', 'span', 'div', 'a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'label', 'td', 'th', 'li', 'dt', 'dd', 'figcaption', 'caption',
        '[class*="text-"]', '[class*="opacity-"]'
      ];

      const elements = document.querySelectorAll(textSelectors.join(', '));
      elements.forEach(element => {
        if (hasTextContent(element) || hasLowContrastClass(element)) {
          fixElement(element);
        }
      });

      // Also check for inline styles with low contrast
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        if (element instanceof HTMLElement && element.style.color) {
          fixElement(element);
        }
      });
    };

    // Create mutation observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        // Check added nodes
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            fixElement(element);

            // Check all descendants
            const descendants = element.querySelectorAll('*');
            descendants.forEach(desc => fixElement(desc));
          }
        });

        // Check for attribute changes (class, style)
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          fixElement(mutation.target);
        }
      });
    });

    // Initial scan after a short delay to ensure React hydration is complete
    const initialTimer = setTimeout(() => {
      scanAndFix();

      // Start observing
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }, 100);

    // Periodic rescans to catch any missed elements
    const rescanInterval = setInterval(scanAndFix, 2000);

    // Add global CSS to enforce contrast
    const style = document.createElement('style');
    style.id = 'high-contrast-enforcer';
    style.textContent = `
      /* Nuclear option: Override all low contrast text */
      ${lowContrastClasses.map(cls => `.${cls}:not(.premium-button):not(.premium-button-sm)`).join(', ')} {
        color: #1a1a1a !important;
        opacity: 1 !important;
      }

      /* Explicitly preserve premium button styles */
      .premium-button,
      .premium-button *,
      .premium-button-sm,
      .premium-button-sm * {
        color: #ffffff !important;
      }

      /* Target common low contrast patterns - but exclude premium buttons */
      [class*="text-gray-3"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-gray-4"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-gray-5"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-slate-3"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-slate-4"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-slate-5"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-zinc-3"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-zinc-4"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-zinc-5"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-neutral-3"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-neutral-4"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-neutral-5"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-stone-3"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-stone-4"]:not(.premium-button):not(.premium-button-sm),
      [class*="text-stone-5"]:not(.premium-button):not(.premium-button-sm),
      [class*="opacity-5"]:not(.premium-button):not(.premium-button-sm),
      [class*="opacity-6"]:not(.premium-button):not(.premium-button-sm),
      [class*="opacity-7"]:not(.premium-button):not(.premium-button-sm) {
        color: #1a1a1a !important;
        opacity: 1 !important;
      }

      /* Ensure all text elements have good contrast - but exclude premium buttons */
      p:not(.premium-button):not(.premium-button-sm), 
      span:not(.premium-button):not(.premium-button-sm), 
      div:not(.premium-button):not(.premium-button-sm), 
      a:not(.premium-button):not(.premium-button-sm), 
      button:not(.premium-button):not(.premium-button-sm), 
      h1:not(.premium-button):not(.premium-button-sm), h2:not(.premium-button):not(.premium-button-sm), 
      h3:not(.premium-button):not(.premium-button-sm), h4:not(.premium-button):not(.premium-button-sm), 
      h5:not(.premium-button):not(.premium-button-sm), h6:not(.premium-button):not(.premium-button-sm),
      label:not(.premium-button):not(.premium-button-sm), 
      td:not(.premium-button):not(.premium-button-sm), th:not(.premium-button):not(.premium-button-sm), 
      li:not(.premium-button):not(.premium-button-sm), dt:not(.premium-button):not(.premium-button-sm), 
      dd:not(.premium-button):not(.premium-button-sm), figcaption:not(.premium-button):not(.premium-button-sm), 
      caption:not(.premium-button):not(.premium-button-sm) {
        min-opacity: 1 !important;
      }

      /* Fix placeholder text */
      ::placeholder {
        color: #4a4a4a !important;
        opacity: 1 !important;
      }

      /* Fix disabled elements to still be readable - but not premium buttons */
      :disabled:not(.premium-button):not(.premium-button-sm) {
        opacity: 0.8 !important;
        color: #2a2a2a !important;
      }

      /* Ensure links are visible - but not premium button links */
      a:not(.premium-button):not(.premium-button-sm) {
        opacity: 1 !important;
      }

      /* Fix any element with explicit low contrast colors */
      [style*="color: #e5e7eb"],
      [style*="color: #d1d5db"],
      [style*="color: #9ca3af"],
      [style*="color: #6b7280"],
      [style*="color: #f3f4f6"],
      [style*="color: #e5e5e5"],
      [style*="color: #d4d4d4"],
      [style*="color: #a3a3a3"],
      [style*="color: #737373"],
      [style*="color: rgb(229, 231, 235)"],
      [style*="color: rgb(209, 213, 219)"],
      [style*="color: rgb(156, 163, 175)"],
      [style*="color: rgb(107, 114, 128)"] {
        color: #1a1a1a !important;
      }
    `;
    document.head.appendChild(style);

    // Cleanup function
    return () => {
      clearTimeout(initialTimer);
      clearInterval(rescanInterval);
      observer.disconnect();
      const existingStyle = document.getElementById('high-contrast-enforcer');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
}
