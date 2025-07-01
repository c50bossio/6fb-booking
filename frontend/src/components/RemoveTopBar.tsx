'use client'

import { useEffect } from 'react'

export default function RemoveTopBar() {
  useEffect(() => {
    const removeBar = () => {
      // Get all elements in the page
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(element => {
        const el = element as HTMLElement;
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        
        // Check if element is at the top of the page
        if (rect.top >= 0 && rect.top < 5 && rect.height > 20 && rect.height < 80) {
          const text = el.textContent || '';
          
          // Check if it contains BookBarber text and has dark styling
          if (text.includes('BookBarber') && !text.includes('BookedBarber')) {
            const bgColor = styles.backgroundColor;
            const isDark = 
              bgColor.includes('rgb(51') || // dark colors
              bgColor.includes('rgb(30') ||
              bgColor.includes('rgb(15') ||
              bgColor.includes('#1') ||
              bgColor.includes('#2') ||
              bgColor.includes('#3') ||
              bgColor.includes('#4') ||
              bgColor.includes('#5');
            
            if (isDark) {
              console.log('Found and removing dark BookBarber bar:', el);
              el.style.display = 'none';
              el.remove();
            }
          }
        }
      });
    };
    
    // Run multiple times to catch dynamically added elements
    removeBar();
    const intervals = [50, 100, 200, 500, 1000];
    intervals.forEach(delay => {
      setTimeout(removeBar, delay);
    });
    
    // Also observe for new elements
    const observer = new MutationObserver(() => {
      removeBar();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return null;
}