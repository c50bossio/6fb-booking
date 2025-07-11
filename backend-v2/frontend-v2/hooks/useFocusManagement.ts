import { useEffect, useRef, useCallback } from 'react';

interface FocusableElement extends HTMLElement {
  tabIndex: number;
}

export function useFocusManagement(containerRef: React.RefObject<HTMLElement>) {
  const focusableElementsRef = useRef<FocusableElement[]>([]);
  const currentFocusIndexRef = useRef<number>(-1);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): FocusableElement[] => {
    if (!containerRef.current) return [];

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '.unified-calendar-appointment',
      '.calendar-time-slot[tabindex="0"]',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<FocusableElement>(selector)
    ).filter((el) => {
      // Ensure element is visible and not hidden
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        el.offsetParent !== null
      );
    });
  }, [containerRef]);

  // Update focusable elements list
  const updateFocusableElements = useCallback(() => {
    focusableElementsRef.current = getFocusableElements();
  }, [getFocusableElements]);

  // Focus on element by index
  const focusByIndex = useCallback((index: number) => {
    const elements = focusableElementsRef.current;
    if (index >= 0 && index < elements.length) {
      elements[index].focus();
      currentFocusIndexRef.current = index;
    }
  }, []);

  // Focus on next element
  const focusNext = useCallback(() => {
    updateFocusableElements();
    const elements = focusableElementsRef.current;
    if (elements.length === 0) return;

    let nextIndex = currentFocusIndexRef.current + 1;
    if (nextIndex >= elements.length) {
      nextIndex = 0; // Wrap around
    }
    focusByIndex(nextIndex);
  }, [focusByIndex, updateFocusableElements]);

  // Focus on previous element
  const focusPrevious = useCallback(() => {
    updateFocusableElements();
    const elements = focusableElementsRef.current;
    if (elements.length === 0) return;

    let prevIndex = currentFocusIndexRef.current - 1;
    if (prevIndex < 0) {
      prevIndex = elements.length - 1; // Wrap around
    }
    focusByIndex(prevIndex);
  }, [focusByIndex, updateFocusableElements]);

  // Focus on first element
  const focusFirst = useCallback(() => {
    updateFocusableElements();
    focusByIndex(0);
  }, [focusByIndex, updateFocusableElements]);

  // Focus on last element
  const focusLast = useCallback(() => {
    updateFocusableElements();
    const elements = focusableElementsRef.current;
    if (elements.length > 0) {
      focusByIndex(elements.length - 1);
    }
  }, [focusByIndex, updateFocusableElements]);

  // Focus on element by ID
  const focusById = useCallback((id: string) => {
    updateFocusableElements();
    const elements = focusableElementsRef.current;
    const index = elements.findIndex((el) => el.id === id || el.getAttribute('data-appointment-id') === id);
    if (index !== -1) {
      focusByIndex(index);
    }
  }, [focusByIndex, updateFocusableElements]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in a form input
      const target = event.target as HTMLElement;
      const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      
      if (isFormElement && event.key !== 'Escape' && event.key !== 'Tab') {
        return; // Let form elements handle their own keyboard input
      }

      switch (event.key) {
        case 'Tab':
          if (event.shiftKey) {
            event.preventDefault();
            focusPrevious();
          } else {
            event.preventDefault();
            focusNext();
          }
          break;
      }
    };

    // Track current focus
    const handleFocus = (event: FocusEvent) => {
      updateFocusableElements();
      const target = event.target as FocusableElement;
      const index = focusableElementsRef.current.indexOf(target);
      if (index !== -1) {
        currentFocusIndexRef.current = index;
      }
    };

    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focusin', handleFocus);

    // Initial update
    updateFocusableElements();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focusin', handleFocus);
    };
  }, [containerRef, focusNext, focusPrevious, updateFocusableElements]);

  return {
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusById,
    updateFocusableElements,
  };
}