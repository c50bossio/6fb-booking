/**
 * WCAG 2.1 AA Accessibility Audit Utilities
 * Provides runtime accessibility checking and reporting
 */

export interface AccessibilityIssue {
  element: string
  issue: string
  wcagCriteria: string
  severity: 'error' | 'warning' | 'info'
  fix: string
}

export interface AccessibilityReport {
  score: number
  totalIssues: number
  errors: number
  warnings: number
  issues: AccessibilityIssue[]
  timestamp: Date
}

/**
 * Run a comprehensive accessibility audit on the current page
 */
export function runAccessibilityAudit(): AccessibilityReport {
  const issues: AccessibilityIssue[] = []
  let errors = 0
  let warnings = 0

  // Check images for alt text (WCAG 1.1.1)
  const images = document.querySelectorAll('img')
  images.forEach((img) => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        element: `<img src="${img.getAttribute('src') || 'unknown'}">`,
        issue: 'Missing alt text',
        wcagCriteria: '1.1.1 Non-text Content',
        severity: 'error',
        fix: 'Add alt attribute with descriptive text or alt="" for decorative images'
      })
      errors++
    }
  })

  // Check form labels (WCAG 3.3.2)
  const inputs = document.querySelectorAll('input, select, textarea')
  inputs.forEach((input) => {
    const id = input.getAttribute('id')
    const label = id ? document.querySelector(`label[for="${id}"]`) : null
    const ariaLabel = input.getAttribute('aria-label')
    const ariaLabelledby = input.getAttribute('aria-labelledby')
    
    if (!label && !ariaLabel && !ariaLabelledby && input.getAttribute('type') !== 'hidden') {
      issues.push({
        element: `<${input.tagName.toLowerCase()} ${input.hasAttribute('name') ? `name="${input.getAttribute('name')}"` : ''}>`,
        issue: 'Form input without label',
        wcagCriteria: '3.3.2 Labels or Instructions',
        severity: 'error',
        fix: 'Add a <label> element or aria-label attribute'
      })
      errors++
    }
  })

  // Check heading hierarchy (WCAG 1.3.1)
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  let lastLevel = 0
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1])
    if (level - lastLevel > 1) {
      issues.push({
        element: `<${heading.tagName.toLowerCase()}>${heading.textContent}</h${level}>`,
        issue: 'Skipped heading level',
        wcagCriteria: '1.3.1 Info and Relationships',
        severity: 'warning',
        fix: `Use h${lastLevel + 1} instead of h${level}`
      })
      warnings++
    }
    lastLevel = level
  })

  // Check color contrast (WCAG 1.4.3)
  const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, li')
  textElements.forEach((element) => {
    const style = window.getComputedStyle(element)
    const bgColor = style.backgroundColor
    const textColor = style.color
    
    if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)') {
      const contrast = calculateContrast(bgColor, textColor)
      const isLargeText = parseFloat(style.fontSize) >= 18 || 
                         (parseFloat(style.fontSize) >= 14 && style.fontWeight === 'bold')
      
      const requiredContrast = isLargeText ? 3 : 4.5
      
      if (contrast < requiredContrast) {
        issues.push({
          element: element.tagName.toLowerCase(),
          issue: `Insufficient color contrast (${contrast.toFixed(2)}:1)`,
          wcagCriteria: '1.4.3 Contrast (Minimum)',
          severity: 'error',
          fix: `Increase contrast to at least ${requiredContrast}:1`
        })
        errors++
      }
    }
  })

  // Check for keyboard accessibility (WCAG 2.1.1)
  const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [onclick]')
  interactiveElements.forEach((element) => {
    const tabindex = element.getAttribute('tabindex')
    if (tabindex === '-1') {
      issues.push({
        element: element.tagName.toLowerCase(),
        issue: 'Element not keyboard accessible',
        wcagCriteria: '2.1.1 Keyboard',
        severity: 'error',
        fix: 'Remove tabindex="-1" or provide alternative keyboard access'
      })
      errors++
    }
  })

  // Check for focus indicators (WCAG 2.4.7)
  const focusableElements = document.querySelectorAll('a, button, input, select, textarea')
  focusableElements.forEach((element) => {
    const style = window.getComputedStyle(element)
    const focusStyle = window.getComputedStyle(element, ':focus')
    
    if (style.outline === focusStyle.outline && 
        style.border === focusStyle.border &&
        style.boxShadow === focusStyle.boxShadow) {
      issues.push({
        element: element.tagName.toLowerCase(),
        issue: 'No visible focus indicator',
        wcagCriteria: '2.4.7 Focus Visible',
        severity: 'warning',
        fix: 'Add :focus styles with visible outline, border, or box-shadow'
      })
      warnings++
    }
  })

  // Check for page language (WCAG 3.1.1)
  if (!document.documentElement.hasAttribute('lang')) {
    issues.push({
      element: '<html>',
      issue: 'Missing language declaration',
      wcagCriteria: '3.1.1 Language of Page',
      severity: 'error',
      fix: 'Add lang attribute to <html> element'
    })
    errors++
  }

  // Check for skip links (WCAG 2.4.1)
  const skipLink = document.querySelector('a[href^="#"][class*="skip"], a[href^="#main"]')
  if (!skipLink) {
    issues.push({
      element: 'page',
      issue: 'No skip to main content link',
      wcagCriteria: '2.4.1 Bypass Blocks',
      severity: 'warning',
      fix: 'Add a skip link as the first focusable element'
    })
    warnings++
  }

  // Check ARIA usage (WCAG 4.1.2)
  const ariaElements = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby]')
  ariaElements.forEach((element) => {
    const role = element.getAttribute('role')
    if (role && !isValidAriaRole(role)) {
      issues.push({
        element: element.tagName.toLowerCase(),
        issue: `Invalid ARIA role: ${role}`,
        wcagCriteria: '4.1.2 Name, Role, Value',
        severity: 'error',
        fix: 'Use a valid ARIA role'
      })
      errors++
    }
  })

  // Calculate score
  const totalPossibleIssues = 
    images.length + 
    inputs.length + 
    headings.length + 
    textElements.length + 
    interactiveElements.length + 
    focusableElements.length + 
    ariaElements.length + 
    3 // page-level checks

  const score = Math.max(0, 100 - ((errors * 5 + warnings * 2) / totalPossibleIssues * 100))

  return {
    score: Math.round(score),
    totalIssues: issues.length,
    errors,
    warnings,
    issues,
    timestamp: new Date()
  }
}

/**
 * Calculate color contrast ratio
 */
function calculateContrast(color1: string, color2: string): number {
  const rgb1 = getRgbFromString(color1)
  const rgb2 = getRgbFromString(color2)
  
  const l1 = getRelativeLuminance(rgb1)
  const l2 = getRelativeLuminance(rgb2)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Get RGB values from color string
 */
function getRgbFromString(color: string): [number, number, number] {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
  }
  return [0, 0, 0]
}

/**
 * Calculate relative luminance
 */
function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(val => {
    const normalized = val / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Validate ARIA role
 */
function isValidAriaRole(role: string): boolean {
  const validRoles = [
    'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
    'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
    'contentinfo', 'definition', 'dialog', 'directory', 'document',
    'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
    'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
    'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
    'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
    'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
    'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
    'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
    'treeitem'
  ]
  
  return validRoles.includes(role)
}

/**
 * Fix common accessibility issues automatically
 */
export function autoFixAccessibilityIssues(): number {
  let fixedCount = 0

  // Add missing alt text to images
  document.querySelectorAll('img:not([alt])').forEach((img) => {
    img.setAttribute('alt', '')
    fixedCount++
  })

  // Add lang attribute if missing
  if (!document.documentElement.hasAttribute('lang')) {
    document.documentElement.setAttribute('lang', 'en')
    fixedCount++
  }

  // Add focus styles if missing
  const style = document.createElement('style')
  style.textContent = `
    *:focus {
      outline: 2px solid #0066CC !important;
      outline-offset: 2px !important;
    }
    
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `
  document.head.appendChild(style)

  return fixedCount
}

/**
 * React hook for accessibility monitoring
 */
export function useAccessibilityMonitor() {
  const [report, setReport] = React.useState<AccessibilityReport | null>(null)
  const [isMonitoring, setIsMonitoring] = React.useState(false)

  React.useEffect(() => {
    if (!isMonitoring) return

    const runAudit = () => {
      const newReport = runAccessibilityAudit()
      setReport(newReport)
    }

    // Run initial audit
    runAudit()

    // Set up mutation observer for dynamic content
    const observer = new MutationObserver(() => {
      runAudit()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['alt', 'aria-label', 'role', 'tabindex']
    })

    return () => {
      observer.disconnect()
    }
  }, [isMonitoring])

  return {
    report,
    startMonitoring: () => setIsMonitoring(true),
    stopMonitoring: () => setIsMonitoring(false),
    runAudit: () => setReport(runAccessibilityAudit()),
    autoFix: autoFixAccessibilityIssues
  }
}

// Import React for hooks
import React from 'react'