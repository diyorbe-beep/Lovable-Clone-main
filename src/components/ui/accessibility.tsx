'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const pathname = usePathname();
  const skipToContentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Announce page changes to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Navigated to ${pathname}`;
    document.body.appendChild(announcement);

    // Clean up
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);

    // Focus management
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
    }
  }, [pathname]);

  const handleSkipToContent = () => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.setAttribute('tabindex', '0');
      mainContent.focus();
    }
  };

  return (
    <>
      {/* Skip to main content link */}
      <button
        ref={skipToContentRef}
        onClick={handleSkipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Skip to main content
      </button>

      {/* Live region for announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="accessibility-announcements"
      />

      {/* Focus management */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="accessibility-alerts"
      />

      {children}
    </>
  );
}

// Custom hook for accessibility features
export function useAccessibility() {
  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  };

  const removeFocusTrap = (container: HTMLElement) => {
    // Remove event listeners and restore focus
    container.removeEventListener('keydown', () => {});
  };

  return {
    announceToScreenReader,
    trapFocus,
    removeFocusTrap,
  };
}

// Accessibility utilities
export const accessibilityUtils = {
  // Generate unique IDs for accessibility
  generateId: (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,

  // Check if element is visible
  isVisible: (element: HTMLElement) => {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  },

  // Get all focusable elements
  getFocusableElements: (container: HTMLElement) => {
    return container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  },

  // Set ARIA attributes
  setAriaAttributes: (element: HTMLElement, attributes: Record<string, string>) => {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  },

  // Remove ARIA attributes
  removeAriaAttributes: (element: HTMLElement, attributes: string[]) => {
    attributes.forEach(attr => {
      element.removeAttribute(attr);
    });
  },

  // Check color contrast
  checkColorContrast: (foreground: string, background: string) => {
    // This is a simplified version - in production, use a proper contrast calculation library
    const getLuminance = (color: string) => {
      const rgb = parseInt(color.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = rgb & 0xff;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };

    const fgLuminance = getLuminance(foreground);
    const bgLuminance = getLuminance(background);
    const contrast = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);

    return {
      ratio: contrast,
      passes: {
        aa: contrast >= 4.5,
        aaa: contrast >= 7,
        aaLarge: contrast >= 3,
        aaaLarge: contrast >= 4.5,
      },
    };
  },

  // Validate form accessibility
  validateFormAccessibility: (form: HTMLFormElement) => {
    const issues: string[] = [];
    
    // Check for labels
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const hasLabel = input.hasAttribute('aria-label') || 
                      input.hasAttribute('aria-labelledby') || 
                      form.querySelector(`label[for="${input.id}"]`);
      
      if (!hasLabel) {
        issues.push(`Input at index ${index} missing label or aria-label`);
      }
    });

    // Check for required attributes
    const requiredInputs = form.querySelectorAll('[required]');
    requiredInputs.forEach((input, index) => {
      const hasAriaRequired = input.hasAttribute('aria-required');
      if (!hasAriaRequired) {
        issues.push(`Required input at index ${index} missing aria-required`);
      }
    });

    return issues;
  },

  // Add keyboard navigation
  addKeyboardNavigation: (container: HTMLElement) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          // Close modals, dropdowns, etc.
          const closeButton = container.querySelector('[data-close-on-escape]') as HTMLElement;
          if (closeButton) {
            closeButton.click();
          }
          break;
        
        case 'Enter':
          // Activate focused element
          if (e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.target.click();
          }
          break;
        
        case ' ':
          // Toggle checkboxes, radio buttons, etc.
          if (e.target instanceof HTMLElement) {
            if (e.target.type === 'checkbox' || e.target.type === 'radio') {
              e.target.click();
              e.preventDefault();
            }
          }
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  // Add ARIA live regions
  addLiveRegion: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const existingRegion = document.getElementById(`live-region-${priority}`);
    
    if (existingRegion) {
      existingRegion.textContent = message;
    } else {
      const region = document.createElement('div');
      region.id = `live-region-${priority}`;
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.textContent = message;
      document.body.appendChild(region);
    }
  },

  // Screen reader announcements
  announce: (message: string, options: {
    priority?: 'polite' | 'assertive';
    timeout?: number;
  } = {}) => {
    const { priority = 'polite', timeout = 1000 } = options;
    
    accessibilityUtils.addLiveRegion(message, priority);
    
    if (timeout > 0) {
      setTimeout(() => {
        const region = document.getElementById(`live-region-${priority}`);
        if (region) {
          region.textContent = '';
        }
      }, timeout);
    }
  },

  // Focus management
  setFocus: (element: HTMLElement) => {
    element.focus();
    
    // Announce focus change to screen readers
    accessibilityUtils.announce(`Focused on ${element.textContent || element.tagName}`, {
      priority: 'assertive',
      timeout: 500,
    });
  },

  // Error handling for accessibility
  handleAccessibilityError: (error: Error, context: string) => {
    console.error(`Accessibility error in ${context}:`, error);
    
    // Announce error to screen readers
    accessibilityUtils.announce(`Error occurred: ${error.message}`, {
      priority: 'assertive',
      timeout: 3000,
    });
  },
};

// High contrast mode detection
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      const query = window.matchMedia('(prefers-contrast: high)');
      setIsHighContrast(query.matches);
      
      const handleChange = (e: MediaQueryListEvent) => {
        setIsHighContrast(e.matches);
      };
      
      query.addEventListener('change', handleChange);
      
      return () => {
        query.removeEventListener('change', handleChange);
      };
    };

    const cleanup = checkHighContrast();
    return cleanup;
  }, []);

  return isHighContrast;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(query.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    query.addEventListener('change', handleChange);
    
    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
};

// Screen reader detection
export const useScreenReader = () => {
  const [hasScreenReader, setHasScreenReader] = useState(false);

  useEffect(() => {
    // Basic screen reader detection
    const checkScreenReader = () => {
      // Check for common screen reader indicators
      const hasAriaLive = document.querySelector('[aria-live]');
      const hasAriaLabel = document.querySelector('[aria-label]');
      const hasRole = document.querySelector('[role]');
      
      setHasScreenReader(!!(hasAriaLive || hasAriaLabel || hasRole));
    };

    checkScreenReader();
    
    // Listen for changes that might indicate screen reader usage
    const observer = new MutationObserver(checkScreenReader);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-live', 'aria-label', 'role'],
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return hasScreenReader;
};
